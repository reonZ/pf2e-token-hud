import { localize, MODULE_ID, templatePath } from './module.js'

export async function popup(title, content) {
    const hud = $(`#${MODULE_ID}`)
    if (!hud.length) return

    hud.find('.popup').remove()

    const tmp = document.createElement('div')
    tmp.innerHTML = await renderTemplate(templatePath('popup'), { title, close: localize('popup.close') })

    const popup = tmp.firstElementChild
    if (typeof content === 'string') {
        content = await TextEditor.enrichHTML(content, { async: true })
        popup.insertAdjacentHTML('beforeend', content)
    } else {
        popup.append(content)
    }

    popup.querySelector('[data-action=close-popup]').addEventListener('click', () => popup.remove())

    hud.append(popup)
}
