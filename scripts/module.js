export const MODULE_ID = 'pf2e-token-hud'

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
