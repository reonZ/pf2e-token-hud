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

    popup.addEventListener('dragstart', event => {
        hud.css('opacity', 0.1)

        event.currentTarget.addEventListener(
            'dragend',
            () => {
                hud.css('opacity', 1)
                hud.css('pointerEvents', '')
            },
            { once: true }
        )
    })

    hud.append(popup)
}
