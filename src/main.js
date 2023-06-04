import { enableModule, getSetting, localize, MODULE_ID } from './module.js'
import { registerSettings, renderSettingsConfig } from './settings.js'

Hooks.once('setup', () => {
    registerSettings()

    if (getSetting('enabled')) enableModule(true)
})

Hooks.on('renderSettingsConfig', renderSettingsConfig)
