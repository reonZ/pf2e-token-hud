import { localize } from './module.js'

export async function getItemSummary(el, actor) {
    const dataset = el.data()
    const item = dataset.itemId ? actor.items.get(dataset.itemId) : await fromUuid(dataset.uuid)
    const data = await item?.getChatData({}, dataset)
    if (!data) return

    const description = document.createElement('div')
    description.classList.add('description')

    await actor.sheet.itemRenderer.renderItemSummary(description, item, data)

    return description
}

export function addNameTooltipListeners(el) {
    el.on('mouseenter', event => {
        event.preventDefault()

        const target = event.currentTarget.querySelector('.name')
        if (target.scrollWidth <= target.clientWidth) return

        const name = target.innerHTML.trim()
        game.tooltip.activate(event.currentTarget, { text: name })
    })

    el.on('mouseleave', event => {
        event.preventDefault()
        game.tooltip.deactivate()
    })

    el.on('mousedown', event => {
        game.tooltip.deactivate()
    })
}

export function editItem(event, actor) {
    event.preventDefault()
    const item = getItemFromEvent(event, actor)
    item?.sheet.render(true, { focus: true })
}

export async function deleteItem(event, actor) {
    event.preventDefault()

    const item = getItemFromEvent(event, actor)
    if (!item) return

    if (event.ctrlKey) return item.delete()

    new Dialog({
        title: localize('deleteItem.title'),
        content: await renderTemplate('systems/pf2e/templates/actors/delete-item-dialog.hbs', { name: item.name }),
        buttons: {
            ok: {
                icon: '<i class="fa-solid fa-trash"></i>',
                label: localize('deleteItem.ok'),
                callback: () => item.delete(),
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: localize('deleteItem.cancel'),
            },
        },
    }).render(true)
}

export function getItemFromEvent(event, actor) {
    const { itemId } = event.currentTarget.closest('[data-item-id]').dataset
    return actor.items.get(itemId)
}
