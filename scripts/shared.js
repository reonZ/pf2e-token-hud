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
