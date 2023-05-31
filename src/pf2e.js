/**
 * Those are directly copied from the PF2e system
 * because they are not accesible to us in the global
 */

const dcAdjustments = new Map([
    ['incredibly-easy', -10],
    ['very-easy', -5],
    ['easy', -2],
    ['normal', 0],
    ['hard', 2],
    ['very-hard', 5],
    ['incredibly-hard', 10],
])

const dcByLevel = new Map([
    [-1, 13],
    [0, 14],
    [1, 15],
    [2, 16],
    [3, 18],
    [4, 19],
    [5, 20],
    [6, 22],
    [7, 23],
    [8, 24],
    [9, 26],
    [10, 27],
    [11, 28],
    [12, 30],
    [13, 31],
    [14, 32],
    [15, 34],
    [16, 35],
    [17, 36],
    [18, 38],
    [19, 39],
    [20, 40],
    [21, 42],
    [22, 44],
    [23, 46],
    [24, 48],
    [25, 50],
])

const MAGIC_TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal'])

const actionImgMap = {
    0: 'systems/pf2e/icons/actions/FreeAction.webp',
    free: 'systems/pf2e/icons/actions/FreeAction.webp',
    1: 'systems/pf2e/icons/actions/OneAction.webp',
    2: 'systems/pf2e/icons/actions/TwoActions.webp',
    3: 'systems/pf2e/icons/actions/ThreeActions.webp',
    '1 or 2': 'systems/pf2e/icons/actions/OneTwoActions.webp',
    '1 to 3': 'systems/pf2e/icons/actions/OneThreeActions.webp',
    '2 or 3': 'systems/pf2e/icons/actions/TwoThreeActions.webp',
    reaction: 'systems/pf2e/icons/actions/Reaction.webp',
    passive: 'systems/pf2e/icons/actions/Passive.webp',
}

const actionGlyphMap = {
    0: 'F',
    free: 'F',
    1: 'A',
    2: 'D',
    3: 'T',
    '1 or 2': 'A/D',
    '1 to 3': 'A - T',
    '2 or 3': 'D/T',
    reaction: 'R',
}

export function getActionIcon(action, fallback = 'systems/pf2e/icons/actions/Empty.webp') {
    if (action === null) return actionImgMap['passive']
    const value = typeof action !== 'object' ? action : action.type === 'action' ? action.value : action.type
    const sanitized = String(value ?? '')
        .toLowerCase()
        .trim()
    return actionImgMap[sanitized] ?? fallback
}

export function getActionGlyph(action) {
    if (!action && action !== 0) return ''

    const value = typeof action !== 'object' ? action : action.type === 'action' ? action.value : action.type
    const sanitized = String(value ?? '')
        .toLowerCase()
        .trim()

    return actionGlyphMap[sanitized] ?? ''
}

export async function toggleWeaponTrait({ weapon, trait, selection }) {
    const current = weapon.system.traits.toggles[trait].selection
    if (current === selection) return false

    const item = weapon.actor?.items.get(weapon.id)
    if (item?.isOfType('weapon') && item === weapon) {
        await item.update({ [`system.traits.toggles.${trait}.selection`]: selection })
    } else if (item?.isOfType('weapon') && weapon.altUsageType === 'melee') {
        item.update({ [`system.meleeUsage.traitToggles.${trait}`]: selection })
    } else {
        const rule = item?.rules.find(r => r.key === 'Strike' && !r.ignored && r.slug === weapon.slug)
        await rule?.toggleTrait({ trait, selection })
    }

    return true
}

function adjustDC(dc, adjustment = 'normal') {
    return dc + (dcAdjustments.get(adjustment) ?? 0)
}

function rarityToDCAdjustment(rarity = 'common') {
    switch (rarity) {
        case 'uncommon':
            return 'hard'
        case 'rare':
            return 'very-hard'
        case 'unique':
            return 'incredibly-hard'
        default:
            return 'normal'
    }
}

function adjustDCByRarity(dc, rarity = 'common') {
    return adjustDC(dc, rarityToDCAdjustment(rarity))
}

function calculateDC(level, { proficiencyWithoutLevel, rarity = 'common' } = {}) {
    const pwlSetting = game.settings.get('pf2e', 'proficiencyVariant')
    proficiencyWithoutLevel ??= pwlSetting === 'ProficiencyWithoutLevel'

    const dc = dcByLevel.get(level) ?? 14
    if (proficiencyWithoutLevel) {
        return adjustDCByRarity(dc - Math.max(level, 0), rarity)
    } else {
        return adjustDCByRarity(dc, rarity)
    }
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

function setHasElement(set, value) {
    return set.has(value)
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

            await CONFIG.ChatMessage.documentClass.create({ user: game.user.id, content })
        })
    }

    async _updateObject(_event, formData) {
        const status = formData['status']
        if (status === 'identified') {
            await this.item.setIdentificationStatus(status)
        }
    }
}
