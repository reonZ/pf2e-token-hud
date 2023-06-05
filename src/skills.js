import { getSetting, localize, modifier } from './module.js'
import { unownedItemToMessage } from './pf2e.js'
import { popup } from './popup.js'
import { getItemSummary } from './shared.js'

const MODULE_ID = 'pf2e-token-hud'

const CROWBAR_UUIDS = new Set([
    'Compendium.pf2e.equipment-srd.44F1mfJei4GY8f2X',
    'Compendium.pf2e.equipment-srd.4kz3vhkKPUuXBpxk',
])
const BON_MOT_UUID = 'Compendium.pf2e.feats-srd.0GF2j54roPFIDmXf'

const LABELS = {
    initiative: 'PF2E.InitiativeLabel',
    'recall-knowledge': 'PF2E.RecallKnowledge.Label',
    'cover-tracks': 'PF2E.TravelSpeed.ExplorationActivities.CoverTracks',
    earnIncome: `${MODULE_ID}.skills.actions.earnIncome`,
    treatWounds: `${MODULE_ID}.skills.actions.treatWounds`,
    'borrow-arcane-spell': `${MODULE_ID}.skills.actions.borrow-arcane-spell`,
    'identify-magic': `${MODULE_ID}.skills.actions.identify-magic`,
    'identify-alchemy': `${MODULE_ID}.skills.actions.identify-alchemy`,
    'learn-spell': `${MODULE_ID}.skills.actions.learn-spell`,
    'crafting-goods': `${MODULE_ID}.skills.actions.crafting-goods`,
    'staging-performance': `${MODULE_ID}.skills.actions.staging-performance`,
}

const ACTIONS_UUIDS = {
    'sense-motive': 'Compendium.pf2e.actionspf2e.1xRFPTFtWtGJ9ELw',
    seek: 'Compendium.pf2e.actionspf2e.BlAOM2X92SI6HMtJ',
    balance: 'Compendium.pf2e.actionspf2e.M76ycLAqHoAgbcej',
    escape: 'Compendium.pf2e.actionspf2e.SkZAQRkLLkmBQNB9',
    'tumble-through': 'Compendium.pf2e.actionspf2e.21WIfSu7Xd7uKqV8',
    'maneuver-in-flight': 'Compendium.pf2e.actionspf2e.Qf1ylAbdVi1rkc8M',
    squeeze: 'Compendium.pf2e.actionspf2e.kMcV8e5EZUxa6evt',
    'recall-knowledge': 'Compendium.pf2e.actionspf2e.1OagaWtBpVXExToo',
    'borrow-arcane-spell': 'Compendium.pf2e.actionspf2e.OizxuPb44g3eHPFh',
    'decipher-writing': 'Compendium.pf2e.actionspf2e.d9gbpiQjChYDYA2L',
    'identify-magic': 'Compendium.pf2e.actionspf2e.eReSHVEPCsdkSL4G',
    'learn-spell': 'Compendium.pf2e.actionspf2e.Q5iIYCFdqJFM31GW',
    climb: 'Compendium.pf2e.actionspf2e.pprgrYQ1QnIDGZiy',
    forceOpen: 'Compendium.pf2e.actionspf2e.SjmKHgI7a5Z9JzBx',
    grapple: 'Compendium.pf2e.actionspf2e.PMbdMWc2QroouFGD',
    highJump: 'Compendium.pf2e.actionspf2e.2HJ4yuEFY1Cast4h',
    longJump: 'Compendium.pf2e.actionspf2e.JUvAvruz7yRQXfz2',
    shove: 'Compendium.pf2e.actionspf2e.7blmbDrQFNfdT731',
    swim: 'Compendium.pf2e.actionspf2e.c8TGiZ48ygoSPofx',
    trip: 'Compendium.pf2e.actionspf2e.ge56Lu1xXVFYUnLP',
    disarm: 'Compendium.pf2e.actionspf2e.Dt6B1slsBy8ipJu9',
    repair: 'Compendium.pf2e.actionspf2e.bT3skovyLUtP22ME',
    craft: 'Compendium.pf2e.actionspf2e.rmwa3OyhTZ2i2AHl',
    'crafting-goods': '',
    earnIncome: 'Compendium.pf2e.actionspf2e.QyzlsLrqM0EEwd7j',
    'identify-alchemy': 'Compendium.pf2e.actionspf2e.Q4kdWVOf2ztIBFg1',
    createADiversion: 'Compendium.pf2e.actionspf2e.GkmbTGfg8KcgynOA',
    impersonate: 'Compendium.pf2e.actionspf2e.AJstokjdG6iDjVjE',
    lie: 'Compendium.pf2e.actionspf2e.ewwCglB7XOPLUz72',
    feint: 'Compendium.pf2e.actionspf2e.QNAVeNKtHA0EUw4X',
    bonMot: BON_MOT_UUID,
    gatherInformation: 'Compendium.pf2e.actionspf2e.plBGdZhqq5JBl1D8',
    makeAnImpression: 'Compendium.pf2e.actionspf2e.OX4fy22hQgUHDr0q',
    request: 'Compendium.pf2e.actionspf2e.DCb62iCBrJXy0Ik6',
    coerce: 'Compendium.pf2e.actionspf2e.tHCqgwjtQtzNqVvd',
    demoralize: 'Compendium.pf2e.actionspf2e.2u915NdUyQan6uKF',
    'administer-first-aid': 'Compendium.pf2e.actionspf2e.MHLuKy4nQO2Z4Am1',
    'treat-disease': 'Compendium.pf2e.actionspf2e.TC7OcDa7JlWbqMaN',
    'treat-poison': 'Compendium.pf2e.actionspf2e.KjoCEEmPGTeFE4hh',
    treatWounds: 'Compendium.pf2e.actionspf2e.1kGNdIIhuglAjIp9',
    'command-an-animal': 'Compendium.pf2e.actionspf2e.q9nbyIF0PEBqMtYe',
    perform: 'Compendium.pf2e.actionspf2e.EEDElIyin4z60PXx',
    'staging-performance': '',
    subsist: 'Compendium.pf2e.actionspf2e.49y9Ec4bDii8pcD3',
    'create-forgery': 'Compendium.pf2e.actionspf2e.ftG89SjTSa9DYDOD',
    'conceal-an-object': 'Compendium.pf2e.actionspf2e.qVNVSmsgpKFGk9hV',
    hide: 'Compendium.pf2e.actionspf2e.XMcnh4cSI32tljXa',
    sneak: 'Compendium.pf2e.actionspf2e.VMozDqMMuK5kpoX4',
    senseDirection: 'Compendium.pf2e.actionspf2e.fJImDBQfqfjKJOhk',
    'cover-tracks': 'Compendium.pf2e.actionspf2e.SB7cMECVtE06kByk',
    track: 'Compendium.pf2e.actionspf2e.EA5vuSgJfiHH7plD',
    'palm-an-object': 'Compendium.pf2e.actionspf2e.ijZ0DDFpMkWqaShd',
    steal: 'Compendium.pf2e.actionspf2e.RDXXE7wMrSPCLv5k',
    'disable-device': 'Compendium.pf2e.actionspf2e.cYdz2grcOcRt4jk6',
    'pick-a-lock': 'Compendium.pf2e.actionspf2e.2EE4aF4SZpYf0R6H',
}

const DUPLICATE_SKILLS = {
    escape: { slug: 'escape', cost: '1', type: 2, noSkill: true },
    'recall-knowledge': { slug: 'recall-knowledge', cost: '1', secret: true },
    'decipher-writing': { slug: 'decipher-writing', type: 2, trained: true },
    'identify-magic': { slug: 'identify-magic', trained: true },
    'learn-spell': { slug: 'learn-spell', trained: true },
}

const SKILLS = [
    {
        slug: 'perception',
        actions: [
            { slug: 'sense-motive', cost: '1', type: 2 },
            { slug: 'seek', cost: '1', type: 2 },
        ],
    },
    {
        slug: 'acrobatics',
        actions: [
            { slug: 'balance', cost: '1', type: 2 },
            // 'escape',
            { slug: 'tumble-through', cost: '1', type: 2 },
            { slug: 'maneuver-in-flight', cost: '1', type: 2, trained: true },
            { slug: 'squeeze', type: 2, trained: true },
        ],
    },
    {
        slug: 'arcana',
        actions: [
            'recall-knowledge',
            { slug: 'borrow-arcane-spell', trained: true },
            'decipher-writing',
            'identify-magic',
            'learn-spell',
        ],
    },
    {
        slug: 'athletics',
        actions: [
            { slug: 'climb', cost: '1', type: 1 },
            // 'escape',
            {
                slug: 'forceOpen',
                cost: '1',
                type: 1,
                map: true,
                modifiers: [
                    {
                        condition: actor =>
                            !actor.itemTypes.equipment.some(item => item.isHeld && CROWBAR_UUIDS.has(item.sourceId)),
                        modifiers: [
                            {
                                slug: 'crowbar-missing',
                                modifier: -2,
                                type: 'circumstance',
                            },
                        ],
                    },
                ],
            },
            { slug: 'grapple', cost: '1', type: 1, map: true },
            { slug: 'highJump', cost: '1', type: 1 },
            { slug: 'longJump', cost: '1', type: 1 },
            { slug: 'shove', cost: '1', type: 1, map: true },
            { slug: 'swim', cost: '1', type: 1 },
            { slug: 'trip', cost: '1', type: 2, map: true },
            { slug: 'disarm', cost: '1', type: 1, map: true, trained: true },
        ],
    },
    {
        slug: 'crafting',
        actions: [
            'recall-knowledge',
            { slug: 'repair', type: 1 },
            { slug: 'craft', type: 1, trained: true },
            { slug: 'crafting-goods', trained: true },
            { slug: 'earnIncome', type: 3, trained: true },
            { slug: 'identify-alchemy', trained: true },
        ],
    },
    {
        slug: 'deception',
        actions: [
            { slug: 'createADiversion', cost: '1', type: 1, variants: ['distracting-words', 'gesture', 'trick'] },
            { slug: 'impersonate', type: 1 },
            { slug: 'lie', type: 1 },
            { slug: 'feint', cost: '1', type: 1, trained: true },
        ],
    },
    {
        slug: 'diplomacy',
        actions: [
            {
                slug: 'bonMot',
                cost: '1',
                type: 1,
                condition: actor => actor.itemTypes.feat.some(feat => feat.getFlag('core', 'sourceId') === BON_MOT_UUID),
            },
            { slug: 'gatherInformation', type: 1 },
            { slug: 'makeAnImpression', type: 1 },
            { slug: 'request', cost: '1', type: 1 },
        ],
    },
    {
        slug: 'intimidation',
        actions: [
            { slug: 'coerce', type: 2 },
            { slug: 'demoralize', cost: '1', type: 2 },
        ],
    },
    {
        slug: 'medicine',
        actions: [
            { slug: 'administer-first-aid', cost: '2', type: 2, variants: ['stabilize', 'stop-bleeding'] },
            { slug: 'treat-disease', type: 2, trained: true },
            { slug: 'treat-poison', cost: '1', type: 2, trained: true },
            { slug: 'treatWounds', type: 1, trained: true },
        ],
    },
    {
        slug: 'nature',
        actions: [
            { slug: 'command-an-animal', cost: '1', type: 2 }, //
            'recall-knowledge',
            'identify-magic',
            'learn-spell',
        ],
    },
    {
        slug: 'occultism',
        actions: [
            'recall-knowledge', //
            'decipher-writing',
            'identify-magic',
            'learn-spell',
        ],
    },
    {
        slug: 'performance',
        actions: [
            {
                slug: 'perform',
                cost: '1',
                type: 1,
                variants: ['acting', 'comedy', 'dance', 'keyboards', 'oratory', 'percussion', 'singing', 'strings', 'winds'],
            },
            { slug: 'staging-performance', trained: true },
        ],
    },
    {
        slug: 'religion',
        actions: [
            'recall-knowledge', //
            'decipher-writing',
            'identify-magic',
            'learn-spell',
        ],
    },
    {
        slug: 'society',
        actions: [
            'recall-knowledge', //
            { slug: 'subsist', type: 2 },
            { slug: 'create-forgery', type: 2, trained: true },
            'decipher-writing',
        ],
    },
    {
        slug: 'stealth',
        actions: [
            { slug: 'conceal-an-object', cost: '1', type: 2 },
            { slug: 'hide', cost: '1', type: 2 },
            { slug: 'sneak', cost: '1', type: 2 },
        ],
    },
    {
        slug: 'survival',
        actions: [
            { slug: 'senseDirection', type: 1 },
            { slug: 'subsist', type: 2 },
            { slug: 'cover-tracks', trained: true },
            { slug: 'track', type: 1, trained: true },
        ],
    },
    {
        slug: 'thievery',
        actions: [
            { slug: 'palm-an-object', cost: '1', type: 2 },
            { slug: 'steal', cost: '1', type: 2 },
            { slug: 'disable-device', cost: '2', type: 2, trained: true },
            { slug: 'pick-a-lock', cost: '2', type: 2, trained: true },
        ],
    },
]

SKILLS.forEach(skill => {
    skill.actions = skill.actions.map(action => (typeof action === 'string' ? DUPLICATE_SKILLS[action] : action))

    const { slug, actions } = skill
    for (let action of actions) {
        const unslugged = action.slug.replace(/-(.)/g, (_, c) => c.toUpperCase()).capitalize()

        action.skillSlug = slug
        action.uuid = ACTIONS_UUIDS[action.slug]
        action.label = LABELS[action.slug] ?? `PF2E.Actions.${unslugged}.Title`

        if (action.variants) {
            action.variants = action.variants.map(variant => ({
                slug: variant,
                label: `${MODULE_ID}.skills.actions.${variant}`,
            }))
        } else if (action.map) {
            action.variants = [
                { label: 'PF2E.Roll.Normal' },
                { label: 'PF2E.MAPAbbreviationLabel', map: -5 },
                { label: 'PF2E.MAPAbbreviationLabel', map: -10 },
            ]
        }

        action.modifiers?.forEach(({ modifiers }) => {
            modifiers.forEach(modifier => {
                modifier.label = `${MODULE_ID}.skills.modifiers.${modifier.slug}`
            })
        })
    }
})

export const SKILLS_SLUGS = SKILLS.map(skill => skill.slug)

const SKILLS_MAP = SKILLS.reduce((skills, { slug, actions }) => {
    skills[slug] = {
        slug,
        actions: actions.reduce((actions, action) => {
            actions[action.slug] = action
            return actions
        }, {}),
    }
    return skills
}, {})

export const actionsUUIDS = new Set(Object.values(ACTIONS_UUIDS).filter(Boolean))

export function getSkillLabel(slug) {
    return game.i18n.localize(slug === 'perception' ? 'PF2E.PerceptionLabel' : CONFIG.PF2E.skillList[slug])
}

export async function getSkillsData(actor) {
    const skills = []
    const noUntrained = !getSetting('untrained')
    const notCharacter = !actor.isOfType('character')

    for (let i = 0; i < SKILLS.length; i++) {
        const { slug, actions } = SKILLS[i]
        const { label, rank, mod } = getSkill(slug, actor)

        skills[i] = {
            slug,
            label,
            rank,
            modifier: modifier(mod),
            actions: actions.filter(
                action =>
                    (noUntrained || notCharacter || !action.trained || actor.skills[slug].rank >= 1) &&
                    (!action.condition || action.condition(actor))
            ),
        }
    }

    const lores = Object.values(actor.skills)
        .filter(skill => skill.lore)
        .map(({ label, rank, mod, slug }) => ({
            slug,
            label,
            rank,
            modifier: modifier(mod),
        }))

    return { skills, lores, doubled: getSetting('skills-columns') }
}

function getSkill(slug, actor) {
    return slug === 'perception' ? actor.perception : actor.skills[slug]
}

export function addSkillsListeners(el, actor) {
    el.find('[data-action=action-description]').on('click', async event => {
        event.preventDefault()
        const action = $(event.currentTarget).closest('.action')
        const description = await getItemSummary(action, actor)
        if (description) popup(action.find('.name').children().html().trim(), description)
    })

    // IS OWNER
    if (!actor.isOwner) return

    el.find('[data-action=roll-skill]').on('click', event => {
        event.preventDefault()
        const { slug } = event.currentTarget.dataset
        getSkill(slug, actor).roll({ event })
    })

    el.find('[data-action=roll-action]').on('click contextmenu', async event => {
        event.preventDefault()
        const target = $(event.currentTarget)
        const { skillSlug, slug } = target.closest('.action').data()
        const variant = event.type === 'contextmenu' ? await createVariantDialog(skillSlug) : undefined
        if (variant !== null) rollAction(event, actor, skillSlug, slug, target.data(), variant)
    })

    el.find('[data-action=action-chat]').on('click', async event => {
        event.preventDefault()
        const { uuid } = event.currentTarget.closest('.action').dataset
        const item = await fromUuid(uuid)
        if (item) unownedItemToMessage(event, item, actor, { create: true })
    })
}

export async function createVariantDialog(base) {
    let content = '<p style="text-align: center; margin-block: 0 8px;">'
    content += `<strong>${localize('skills.variant.label')}</strong> <select>`

    for (const slug of SKILLS_SLUGS) {
        const selected = slug === base ? 'selected' : ''
        const label = getSkillLabel(slug)
        content += `<option value="${slug}" ${selected}>${label}</option>`
    }

    content += '</select></p>'

    return Dialog.prompt({
        title: localize('skills.variant.title'),
        label: localize('skills.variant.button'),
        callback: html => html.find('select').val(),
        rejectClose: false,
        content,
        options: { width: 280 },
    })
}

function rollAction(event, actor, skillSlug, slug, { variant, map }, skill) {
    const action = SKILLS_MAP[skillSlug].actions[slug]
    const type = action.type

    skill ??= action.noSkill ? undefined : skillSlug

    const options = {
        event,
        actors: [actor],
        variant,
        rollMode: action.secret ? 'blindroll' : 'roll',
    }

    options.modifiers = []

    if (action.modifiers) {
        for (const { condition, modifiers } of action.modifiers) {
            if (condition && !condition(actor)) continue
            for (const modifier of modifiers) {
                options.modifiers.push(new game.pf2e.Modifier(modifier))
            }
        }
    }

    if (action.custom) {
        action.custom(actor, options)
        return
    } else if (!type) {
        getSkill(skill, actor).roll(options)
        return
    }

    // old actions
    if (type === 1) {
        options.skill = skill
        if (map) options.modifiers.push(new game.pf2e.Modifier({ label: 'PF2E.MultipleAttackPenalty', modifier: map }))
        game.pf2e.actions[slug](options)
    }
    // new actions
    else if (type === 2) {
        options.statistic = skill
        if (map) options.multipleAttackPenalty = map / -5
        game.pf2e.actions.get(slug).use(options)
    }
    // exception for old actions that only accept one actor argument
    else if (type === 3) {
        game.pf2e.actions[slug](actor)
    }
}
