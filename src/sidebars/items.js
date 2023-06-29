import { getFlag, getSetting, localize, setFlag } from '../module.js'
import { IdentifyItemPopup } from '../pf2e/identify.js'
import { showItemSummary } from '../popup.js'
import { addNameTooltipListeners, deleteItem, editItem, filterIn, getItemFromEvent } from '../shared.js'

const ITEMS_TYPES = {
    weapon: { order: 0, label: 'PF2E.InventoryWeaponsHeader' },
    armor: { order: 1, label: 'PF2E.InventoryArmorHeader' },
    consumable: { order: 2, label: 'PF2E.InventoryConsumablesHeader' },
    equipment: { order: 3, label: 'PF2E.InventoryEquipmentHeader' },
    treasure: { order: 4, label: 'PF2E.InventoryTreasureHeader' },
    backpack: { order: 5, label: 'PF2E.InventoryBackpackHeader' },
}

export async function getItemsData(actor, token, filter) {
    const { contents, coins, totalWealth, bulk, invested } = actor.inventory
    const openedContainers = getSetting('containers') || (getFlag(actor, `containers.${game.user.id}`) ?? [])
    const containers = {}
    let categories = {}

    for (const item of contents) {
        if (!ITEMS_TYPES[item.type]) continue

        const containerId = item.system.containerId
        if (item.type !== 'backpack' && containerId && (openedContainers === true || openedContainers.includes(containerId))) {
            containers[containerId] ??= []
            containers[containerId].push(item)
        } else {
            categories[item.type] ??= []
            categories[item.type].push(item)
        }
    }

    categories = Object.entries(categories)
        .map(([type, items]) => {
            items.sort((a, b) => a.name.localeCompare(b.name))
            if (type === 'backpack') {
                for (let i = items.length - 1; i >= 0; i--) {
                    const container = items[i]
                    const contained = containers[container.id].filter(item => filterIn(item.name, filter))
                    if (!contained?.length) {
                        if (!filterIn(container.name, filter)) items.splice(i, 1)
                        continue
                    }
                    contained.sort((a, b) => a.name.localeCompare(b.name))
                    items.splice(i + 1, 0, ...contained)
                }
            } else items = items.filter(item => filterIn(item.name, filter))
            return {
                type,
                items,
                label: ITEMS_TYPES[type].label,
            }
        })
        .filter(category => category.items.length)
        .sort((a, b) => ITEMS_TYPES[a.type].order - ITEMS_TYPES[b.type].order)

    if (categories.length) {
        return {
            doubled: categories.length > 1 && getSetting('items-columns'),
            contentData: {
                canCarry: !!actor.adjustCarryType,
                categories,
                bulk,
                containers: openedContainers,
                i18n: str => localize(`items.${str}`),
                invested: invested ? `${game.i18n.localize('PF2E.InvestedLabel')}: ${invested.value} / ${invested.max}` : '',
                wealth: { coins: coins.goldValue, total: totalWealth.goldValue },
            },
        }
    }
}

export function addItemsListeners(el, actor) {
    const item = el.find('.item')

    addNameTooltipListeners(item)

    item.find('[data-action=item-description]').on('click', async event => {
        event.preventDefault()
        const item = $(event.currentTarget).closest('.item')
        await showItemSummary(item, actor)
    })

    item.find('[data-action=toggle-contains-items]').on('click', async event => {
        event.preventDefault()
        const flag = `containers.${game.user.id}`
        const containerId = event.currentTarget.closest('.item').dataset.itemId
        const containers = getFlag(actor, flag)?.slice() ?? []
        const index = containers.indexOf(containerId)
        if (index === -1) containers.push(containerId)
        else containers.splice(index, 1)
        await setFlag(actor, flag, containers)
    })

    // IS OWNER
    if (!actor.isOwner) return

    item.find('[data-action=item-chat]').on('click', async event => {
        const item = getItemFromEvent(event, actor)
        item?.toMessage(event, { create: true })
    })

    item.on('dragstart', event => {
        const target = event.target.closest('.item')
        const { itemType, uuid } = target.dataset

        const img = new Image()
        img.src = target.querySelector('.item-img img').src
        img.style.width = '32px'
        img.style.height = '32px'
        img.style.borderRadius = '4px'
        img.style.position = 'absolute'
        img.style.left = '-1000px'
        document.body.append(img)

        event.originalEvent.dataTransfer.setDragImage(img, 16, 16)
        event.originalEvent.dataTransfer.setData(
            'text/plain',
            JSON.stringify({ type: 'Item', fromInventory: true, itemType, uuid })
        )

        target.addEventListener('dragend', () => img.remove(), { once: true })
    })

    el.find('.quantity input').on('change', async event => {
        await getItemFromEvent(event, actor)?.update({ 'system.quantity': event.currentTarget.valueAsNumber })
    })

    el.find('[data-action=toggle-item-invest]').on('click', event => {
        event.preventDefault()
        const { itemId } = event.currentTarget.closest('.item').dataset
        actor.toggleInvested(itemId)
    })

    el.find('[data-action=repair-item]').on('click', event => {
        event.preventDefault()
        const item = getItemFromEvent(event, actor)
        if (item) game.pf2e.actions.repair({ item, actors: [actor] })
    })

    el.find('[data-action=toggle-identified]').on('click', event => {
        event.preventDefault()
        const item = getItemFromEvent(event, actor)
        if (!item) return
        if (item.isIdentified) item.setIdentificationStatus('unidentified')
        else new IdentifyItemPopup(item).render(true)
    })

    el.find('[data-action=edit-item]').on('click', event => {
        event.preventDefault()
        editItem(event, actor)
    })

    el.find('[data-action=delete-item]').on('click', event => {
        event.preventDefault()
        deleteItem(event, actor)
    })

    el.find('[data-action=toggle-item-worn').tooltipster({
        animation: null,
        updateAnimation: null,
        animationDuration: 0,
        delay: [0, 0],
        trigger: 'click',
        contentAsHTML: true,
        interactive: true,
        arrow: false,
        side: ['bottom', 'top'],
        theme: 'crb-hover',
        minWidth: 120,
        content: '',
        functionBefore: async function (tooltipster, { event, origin }) {
            const item = getItemFromEvent(event, actor)
            if (!item) return

            const tmp = document.createElement('div')
            tmp.innerHTML = await renderTemplate('systems/pf2e/templates/actors/partials/carry-type.hbs', { item })

            const content = tmp.children[1]
            const $content = $(content)

            $content.find('[data-carry-type]').on('click', async event => {
                const { carryType, handsHeld = 0, inSlot } = $(event.currentTarget).data()
                tooltipster.close()
                await actor.adjustCarryType?.(item, carryType, handsHeld, inSlot)
            })

            if (item.type !== 'backpack') {
                const containers = actor.itemTypes.backpack.filter(container => container.isIdentified)

                if (containers.length) {
                    let rows = ''
                    for (const container of containers) {
                        rows += '<li><a class="item-control item-location-option'
                        if (container === item.container) rows += ' selected'
                        rows += `" data-action="send-to-container" data-container-id="${container.id}">`
                        rows += `<i class="fas fa-box"></i>${container.name}</a></li>`
                    }

                    $content.find('ul').append(rows)
                    $content.find('[data-action=send-to-container]').on('click', async event => {
                        const { containerId } = event.currentTarget.dataset
                        if (!actor.items.has(containerId)) return
                        tooltipster.close()
                        await item.update({ 'system.containerId': containerId })
                    })
                }
            }

            tooltipster.content(content)
        },
    })
}
