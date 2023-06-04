import { HUD } from './hud.js'

export const MODULE_ID = 'pf2e-token-hud'

let hud = null
export function getHud() {
    return hud
}

export function enableModule(enabled) {
    if (enabled && !hud) {
        hud = new HUD()

        Hooks.on('hoverToken', hud.hoverToken)
        Hooks.on('deleteToken', hud.deleteToken)
        Hooks.on('canvasPan', hud.forceClose)
    } else if (!enabled && hud) {
        Hooks.off('hoverToken', hud.hoverToken)
        Hooks.off('deleteToken', hud.deleteToken)
        Hooks.off('canvasPan', hud.forceClose)

        hud.delete()
        hud = null
    }
}

export function getSetting(setting) {
    return game.settings.get(MODULE_ID, setting)
}

export function localize(...args) {
    const data = args.at(-1)
    const useFormat = typeof data === 'object'

    const keys = useFormat ? args.slice(0, -1) : args
    keys.unshift(MODULE_ID)

    return game.i18n[useFormat ? 'format' : 'localize'](keys.join('.'), data)
}

export function templatePath(template) {
    return `modules/${MODULE_ID}/templates/${template}.hbs`
}

export function modifier(mod) {
    return mod >= 0 ? `+${mod}` : mod
}

export function getFlag(doc, flag) {
    return doc.getFlag(MODULE_ID, flag)
}

export function setFlag(doc, flag, value) {
    return doc.setFlag(MODULE_ID, flag, value)
}
