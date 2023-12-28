import { getFlag, getSetting, localize, setFlag } from '../module.js'
import { IdentifyItemPopup } from '../pf2e/identify.js'
import { showItemSummary } from '../popup.js'
import { addNameTooltipListeners, deleteItem, editItem, filterIn, getItemFromEvent, localeCompare } from '../shared.js'
import { createTooltip, dismissTooltip } from '../tooltip.js'

const ITEMS_TYPES = {
    weaponAndShield: { order: 0, label: 'PF2E.Actor.Inventory.Section.WeaponsAndShields' },
    armor: { order: 1, label: 'TYPES.Item.armor' },
    consumable: { order: 2, label: 'PF2E.Item.Consumable.Plural' },
    equipment: { order: 3, label: 'TYPES.Item.equipment' },
    treasure: { order: 4, label: 'TYPES.Item.treasure' },
    backpack: { order: 5, label: 'PF2E.Item.Container.Plural' },
}

export async function getItemsData({ actor, filter }) {
    const { contents, coins, totalWealth, bulk, invested } = actor.inventory
    const isCreature = actor.isOfType('creature')
    const openedContainers = getSetting('containers') || (getFlag(actor, `containers.${game.user.id}`) ?? [])
    const containers = {}
    let categories = {}

    for (const item of contents) {
        const type = item.type === 'shield' || item.type === 'weapon' ? 'weaponAndShield' : item.type
        if (!ITEMS_TYPES[type]) continue

        const containerId = item.system.containerId
        if (type !== 'backpack' && containerId && (openedContainers === true || openedContainers.includes(containerId))) {
            containers[containerId] ??= []
            containers[containerId].push(item)
        } else {
            categories[type] ??= []
            categories[type].push(item)
        }
    }

    categories = Object.entries(categories)
        .map(([type, items]) => {
            items.sort((a, b) => localeCompare(a.name, b.name))
            if (type === 'backpack') {
                for (let i = items.length - 1; i >= 0; i--) {
                    const container = items[i]
                    const contained = containers[container.id]?.filter(item => filterIn(item.name, filter))
                    if (!contained?.length) {
                        if (!filterIn(container.name, filter)) items.splice(i, 1)
                        continue
                    }
                    contained.sort((a, b) => localeCompare(a.name, b.name))
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
                canUseItem: item =>
                    isCreature && item.type === 'consumable' && item.isIdentified && item.uses.max && !item.isAmmunition,
                itemDisabled: item => !item.quantity || !item.uses.value || item.system.equipped.carryType === 'dropped',
            },
        }
    }
}

export function addItemsListeners({ el, actor, token, hud }) {
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

    item.find('[data-action=use-item]').on('click', event => {
        const item = getItemFromEvent(event, actor)
        if (!item) return

        item.consume()
        if (getSetting('use-close')) hud.close()
    })

    item.find('[data-action=item-chat]').on('click', async event => {
        const item = getItemFromEvent(event, actor)
        if (!item) return

        item.toMessage(event, { create: true })
        if (getSetting('chat-close')) hud.close()
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
        if (item) game.pf2e.actions.repair({ item, actors: [actor], tokens: [token] })
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

    el.find('[data-action=toggle-item-worn').on('click', async event => {
        const item = getItemFromEvent(event, actor)
        if (!item) return

        const tmp = document.createElement('div')
        tmp.innerHTML = await renderTemplate('systems/pf2e/templates/actors/partials/carry-type.hbs', { item })

        const content = tmp.children[1].firstElementChild

        content.querySelectorAll('[data-carry-type]').forEach(el => {
            el.addEventListener('click', async event => {
                const menu = event.currentTarget
                const current = item.system.equipped
                const inSlot = menu.dataset.inSlot === 'true'
                const handsHeld = Number(menu.dataset.handsHeld) || 0
                const carryType = menu.dataset.carryType

                dismissTooltip(menu)

                if (
                    carryType !== current.carryType ||
                    inSlot !== current.inSlot ||
                    (carryType === 'held' && handsHeld !== current.handsHeld)
                ) {
                    actor.adjustCarryType(item, { carryType, handsHeld, inSlot })
                }
            })
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

                content.insertAdjacentHTML('beforeend', rows)
                content.querySelectorAll('[data-action=send-to-container]').forEach(el => {
                    el.addEventListener('click', event => {
                        const menu = event.currentTarget
                        const containerId = menu.dataset.containerId
                        const container = actor.items.get(containerId)
                        if (!container) return

                        dismissTooltip(menu)
                        actor.stowOrUnstow(item, container)
                    })
                })
            }
        }

        createTooltip({
            target: event.currentTarget,
            content,
            locked: true,
            direction: 'UP',
            selected: true,
        })
    })
}
