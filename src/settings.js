import { enableModule, localize, MODULE_ID } from './module.js'

export function registerSettings() {
    /**
     * GM
     */
    const statuses = ['first', 'second', 'third', 'fourth'].map(x => localize(`settings.status.statuses.${x}`)).join(', ')
    registerSetting('status', String, statuses, { scope: 'world' })

    /**
     * CLIENT
     */
    registerSetting('enabled', Boolean, true, { onChange: enableModule })

    registerSetting('position', String, 'right', {
        choices: {
            left: settingPath('position', 'choices.left'),
            right: settingPath('position', 'choices.right'),
            top: settingPath('position', 'choices.top'),
            bottom: settingPath('position', 'choices.bottom'),
        },
    })

    registerSetting('delay', Number, 250, {
        range: {
            min: 0,
            max: 2000,
            step: 50,
        },
    })

    registerSetting('no-death', Boolean, false)
    // registerSetting('info-click', Boolean, true)

    // distance

    registerSetting('distance', String, 'all', {
        choices: {
            none: settingPath('distance', 'choices.none'),
            self: settingPath('distance', 'choices.self'),
            all: settingPath('distance', 'choices.all'),
        },
    })

    registerSetting('unit', String, '')

    // sidebar

    registerSetting('height', String, '')

    registerSetting('scrollbar', Boolean, true)

    registerSetting('spells-columns', Boolean, false)

    registerSetting('skills-columns', Boolean, false)

    // actions

    registerSetting('actions', String, 'split', {
        choices: {
            name: settingPath('actions', 'choices.name'),
            type: settingPath('actions', 'choices.type'),
            split: settingPath('actions', 'choices.split'),
        },
    })

    registerSetting('actions-colors', Boolean, true)

    // spells

    registerSetting('spells', Boolean, false)

    registerSetting('tradition', Boolean, false)

    // skills

    registerSetting('untrained', Boolean, true)
}

export function renderSettingsConfig(_, html) {
    const tab = html.find(`.tab[data-tab=${MODULE_ID}]`)

    function beforeGroup(name, key, dom = 'h3') {
        const localized = localize(`menu.${key}`)
        tab.find(`[name="${MODULE_ID}.${name}"]`).closest('.form-group').before(`<${dom}>${localized}</${dom}>`)
    }

    if (game.user.isGM) {
        beforeGroup('enabled', 'client.header', 'h2')
    }

    beforeGroup('distance', 'client.distance')
    beforeGroup('height', 'client.sidebar')
    beforeGroup('actions', 'client.actions')
    beforeGroup('spells', 'client.spells')
    beforeGroup('untrained', 'client.skills')
}

function settingPath(setting, key) {
    return `${MODULE_ID}.settings.${setting}.${key}`
}

function registerSetting(name, type, defValue, extra = {}) {
    game.settings.register(MODULE_ID, name, {
        name: settingPath(name, 'name'),
        hint: settingPath(name, 'hint'),
        scope: 'client',
        config: true,
        type,
        default: defValue,
        ...extra,
    })
}
