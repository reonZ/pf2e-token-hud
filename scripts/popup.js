import { localize, MODULE_ID, templatePath } from './module.js'

export async function popup(title, content) {
    const hud = $(`#${MODULE_ID}`)
    if (!hud.length) return

    hud.find('.popup').remove()

    const tmp = document.createElement('div')
    tmp.innerHTML = await renderTemplate(templatePath('popup'), { title, close: localize('popup.close') })

    const popup = tmp.firstElementChild
    popup.append(content)

    popup.querySelector('[data-action=close-popup]').addEventListener('click', () => popup.remove())

    hud.append(popup)
}

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
