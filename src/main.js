import { registerKeybindings } from './keybindings.js'
import { enableModule, getSetting, localize, MODULE_ID, setFlag } from './module.js'
import { registerSettings, renderSettingsConfig } from './settings.js'
import { deleteMacro, getMacros, onDroppedMacro } from './shared.js'

Hooks.once('setup', () => {
    registerSettings()
    registerKeybindings()
})

Hooks.once('ready', () => {
    if (getSetting('enabled')) enableModule(true)
})

Hooks.on('renderSettingsConfig', renderSettingsConfig)

Hooks.on('getActorDirectoryEntryContext', (_, data) => {
    data.unshift({
        icon: '<i class="fa-solid fa-code"></i>',
        name: `${MODULE_ID}.actor.macros.contextmenu`,
        condition: html => {
            const { documentId } = html.data()
            return getSetting('enabled') && game.actors.get(documentId)?.isOwner
        },
        callback: html => {
            const { documentId } = html.data()
            openMacrosDialog(documentId)
        },
    })
})

class DataDialog extends Dialog {
    getData(options = {}) {
        const data = super.getData(options)
        if (typeof data.content === 'function') data.content = data.content()
        return data
    }
}

function openMacrosDialog(actorId) {
    const actor = game.actors.get(actorId)
    if (!actor) return

    const dialog = new DataDialog(
        {
            title: `${actor.name} - ${localize('actor.macros.title')}`,
            content: () => {
                const macros = getMacros(actor) ?? []
                let content = '<div style="min-height: 250px; display: flex; flex-direction: column; gap: 4px;">'
                if (macros.length) {
                    for (const macro of macros) {
                        content += `<div class="macro" style="display: flex; align-items: center; height: 2em; gap: 4px;" data-uuid="${macro.uuid}">`
                        content += `<img src="${macro.img}" style="height: 100%;"><span style="flex: 1;">${macro.name}</span>`
                        content += `<a data-action="delete-macro"><i class="fa-solid fa-trash"></i></a></div>`
                    }
                } else {
                    content += '<div style="text-align: center; padding-block: 4px; '
                    content += 'color: var(--color-text-dark-4); border: 1px dashed var(--color-text-dark-6);">'
                    content += `${localize('extras.no-macro')}</div>`
                }
                content += '</div>'
                return content
            },
            buttons: {},
            render: html => {
                actor.apps[dialog.appId] = dialog
                html.on('drop', event => onDroppedMacro(event, actor))
                html.find('[data-action=delete-macro]').on('click', event => deleteMacro(event, actor))
            },
            close: () => {
                delete actor.apps[dialog.appId]
            },
        },
        { height: 'auto' }
    ).render(true)
}
