import { registerKeybindings } from './keybindings.js'
import { enableModule, getSetting } from './module.js'
import { registerSettings, renderSettingsConfig } from './settings.js'

Hooks.once('setup', () => {
    registerSettings()
    registerKeybindings()

    if (getSetting('enabled')) enableModule(true)
})

Hooks.on('renderSettingsConfig', renderSettingsConfig)
