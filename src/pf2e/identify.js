/**
 * Those are directly copied from the PF2e system because they are not accesible to us in the global
 */

import { getChatMessageClass } from './classes.js'
import { adjustDCByRarity, calculateDC } from './dc.js'

const MAGIC_TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal'])

function setHasElement(set, value) {
    return set.has(value)
}

function getDcRarity(item) {
    return item.traits.has('cursed') ? 'unique' : item.rarity
}

function getMagicTraditions(item) {
    const traits = item.system.traits.value
    return new Set(traits.filter(t => setHasElement(MAGIC_TRADITIONS, t)))
}

function getIdentifyMagicDCs(item, baseDC, notMatchingTraditionModifier) {
    const result = {
        occult: baseDC,
        primal: baseDC,
        divine: baseDC,
        arcane: baseDC,
    }
    const traditions = getMagicTraditions(item)
    for (const key of MAGIC_TRADITIONS) {
        if (traditions.size > 0 && !traditions.has(key)) {
            result[key] = baseDC + notMatchingTraditionModifier
        }
    }
    return { arcana: result.arcane, nature: result.primal, religion: result.divine, occultism: result.occult }
}

function getItemIdentificationDCs(item, { proficiencyWithoutLevel = false, notMatchingTraditionModifier }) {
    const baseDC = calculateDC(item.level, { proficiencyWithoutLevel })
    const rarity = getDcRarity(item)
    const dc = adjustDCByRarity(baseDC, rarity)
    if (item.isMagical) {
        return getIdentifyMagicDCs(item, dc, notMatchingTraditionModifier)
    } else if (item.isAlchemical) {
        return { crafting: dc }
    } else {
        return { dc: dc }
    }
}

function objectHasKey(obj, key) {
    return (typeof key === 'string' || typeof key === 'number') && key in obj
}

export class IdentifyItemPopup extends FormApplication {
    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: 'identify-item',
            title: game.i18n.localize('PF2E.identification.Identify'),
            template: 'systems/pf2e/templates/actors/identify-item.hbs',
            width: 'auto',
            classes: ['identify-popup'],
        }
    }

    get item() {
        return this.object
    }

    async getData() {
        const item = this.object
        const notMatchingTraditionModifier = game.settings.get('pf2e', 'identifyMagicNotMatchingTraditionModifier')
        const proficiencyWithoutLevel = game.settings.get('pf2e', 'proficiencyVariant') === 'ProficiencyWithoutLevel'
        const dcs = getItemIdentificationDCs(item, { proficiencyWithoutLevel, notMatchingTraditionModifier })

        return {
            ...(await super.getData()),
            isMagic: item.isMagical,
            isAlchemical: item.isAlchemical,
            dcs,
        }
    }

    activateListeners($form) {
        $form.find('button.update-identification').on('click', event => {
            const $button = $(event.delegateTarget)
            this.submit({ updateData: { status: $button.val() } })
        })
        $form.find('button.post-skill-checks').on('click', async () => {
            const item = this.item
            const itemImg = item.system.identification.unidentified.img
            const itemName = item.system.identification.unidentified.name
            const identifiedName = item.system.identification.identified.name
            const skills = $('div#identify-item')
                .find('tr')
                .toArray()
                .flatMap(row => {
                    const slug = row.dataset.skill
                    const dc = Number(row.dataset.dc)
                    if (!(Number.isInteger(dc) && objectHasKey(CONFIG.PF2E.skillList, slug))) {
                        return []
                    }
                    const name = game.i18n.localize(CONFIG.PF2E.skillList[slug])

                    return { slug, name, dc }
                })

            const actionOption = item.isMagical ? 'action:identify-magic' : item.isAlchemical ? 'action:identify-alchemy' : null

            const content = await renderTemplate('systems/pf2e/templates/actors/identify-item-chat-skill-checks.hbs', {
                itemImg,
                itemName,
                identifiedName,
                // We don't want to install remeda just for that so we do our own thing
                // rollOptions: R.compact(['concentrate', 'exploration', 'secret', actionOption]),
                rollOptions: ['concentrate', 'exploration', 'secret', actionOption].filter(Boolean),
                skills,
            })

            await getChatMessageClass().create({ user: game.user.id, content })
        })
    }

    async _updateObject(_event, formData) {
        const status = formData['status']
        if (status === 'identified') {
            await this.item.setIdentificationStatus(status)
        }
    }
}
