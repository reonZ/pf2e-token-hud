import { getSetting } from '../module.js'
import { IdentifyItemPopup } from '../pf2e/identify.js'
import { showItemSummary } from '../popup.js'
import { addNameTooltipListeners, deleteItem, editItem, getItemFromEvent } from '../shared.js'

const ITEMS_TYPES = {
    weapon: { order: 0, label: 'PF2E.InventoryWeaponsHeader' },
    armor: { order: 1, label: 'PF2E.InventoryArmorHeader' },
    consumable: { order: 2, label: 'PF2E.InventoryConsumablesHeader' },
    equipment: { order: 3, label: 'PF2E.InventoryEquipmentHeader' },
    treasure: { order: 4, label: 'PF2E.InventoryTreasureHeader' },
    backpack: { order: 5, label: 'PF2E.InventoryBackpackHeader' },
}

export async function getItemsData(actor) {
    const categories = {}

    for (const item of actor.inventory.contents) {
        categories[item.type] ??= []
        categories[item.type].push(item)
    }

    return {
        doubled: getSetting('items-columns'),
        categories: Object.entries(categories)
            .map(([type, items]) => {
                items.sort((a, b) => a.name.localeCompare(b.name))
                return { type, items, label: ITEMS_TYPES[type].label }
            })
            .sort((a, b) => ITEMS_TYPES[a.type].order - ITEMS_TYPES[b.type].order),
    }
}

export function addItemsListeners(el, actor) {
    const item = el.find('.item')

    addNameTooltipListeners(item)

    item.find('[data-action=item-description]').on('click', async event => {
        event.preventDefault()
        const item = $(event.currentTarget).closest('.item')
        showItemSummary(item, actor)
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
            $(content)
                .find('[data-carry-type]')
                .on('click', event => {
                    const { carryType, handsHeld = 0, inSlot } = $(event.currentTarget).data()
                    actor.adjustCarryType(item, carryType, handsHeld, inSlot)
                    tooltipster.close()
                })

            tooltipster.content(content)
        },
    })
}
