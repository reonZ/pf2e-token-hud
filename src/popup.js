import { enrichHTML, localize, MODULE_ID } from './module.js'
import { getItemSummary } from './shared.js'

export async function popup(title, content, actor) {
    const hud = $(`#${MODULE_ID}`)
    if (!hud.length) return

    hud.find('> .popup').remove()

    const tmp = document.createElement('div')
    tmp.innerHTML = `<div class="popup">
    <div class="header">
        <div class="title">${title}</div>
        <a class="observable" data-action="close-popup"><i class="fas fa-times"></i> ${localize('popup.close')}</a>
    </div>
</div>`

    const popup = tmp.firstElementChild
    if (typeof content === 'string') {
        content = await enrichHTML(content, actor)
        popup.insertAdjacentHTML('beforeend', content)
    } else {
        popup.append(content)
    }

    popup.querySelector('[data-action=close-popup]').addEventListener('click', () => popup.remove())

    hud.append(popup)
}

export async function showItemSummary(el, actor, title) {
    title ??= el.find('.name').html()
    const description = await getItemSummary(el, actor)
    if (description) popup(title.trim(), description, actor)
}
