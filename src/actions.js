import { popup } from './popup.js'
import { addNameTooltipListeners, getItemFromEvent, getItemSummary } from './shared.js'
import { actionsUUIDS } from './skills.js'

const ACTIONS_TYPES = {
    action: { order: 0, label: 'PF2E.ActionTypeAction' },
    reaction: { order: 1, label: 'PF2E.ActionTypeReaction' },
    free: { order: 2, label: 'PF2E.ActionTypeFree' },
    passive: { order: 3, label: 'PF2E.ActionTypePassive' },
}

export async function getActionsData(actor) {
    const isCharacter = actor.isOfType('character')
    const strikes = actor.system.actions.slice()
    const toggles = actor.synthetics.toggles.slice()
    const heroActions = isCharacter ? getHeroActions(actor) : null
    const actions = isCharacter ? getCharacterActions(actor) : getNpcActions(actor)

    // const sections = {}
    // for (const action of actions) {
    //     sections[action.type] ??= []
    //     sections[action.type].push(action)
    // }

    // sections = Object.entries(sections)
    //     .map(([type, actions]) => {
    //         actions.sort((a, b) => a.name.localeCompare(b.name))
    //         return { type, actions, label: ACTIONS_TYPES[type].label }
    //     })
    //     .sort((a, b) => ACTIONS_TYPES[a.type].order - ACTIONS_TYPES[b.type].order)

    // if (strikes.length || sections.length || heroActions?.length) return { strikes, sections, heroActions }

    actions.forEach(action => (action.typeLabel = ACTIONS_TYPES[action.type].label))
    actions.sort((a, b) => a.name.localeCompare(b.name))

    if (toggles.length || strikes.length || actions.length || heroActions?.length)
        return { toggles, strikes, actions, heroActions }
}

export function addActionsListeners(el, actor) {
    addNameTooltipListeners(el.find('.toggle'))
    addNameTooltipListeners(el.find('.strike'))
    addNameTooltipListeners(el.find('.action'))

    el.find('[data-action=action-chat]').on('click', event => {
        event.preventDefault()
        const item = getItemFromEvent(event, actor)
        item.toMessage(event, { create: true })
    })

    el.find('[data-action=action-description]').on('click', async event => {
        event.preventDefault()
        const action = $(event.currentTarget).closest('.action')
        const description = await getItemSummary(action, actor)
        if (description) popup(action.find('.name').html().trim(), description)
    })

    el.find('[data-action=toggle-roll-option], [data-action=set-suboption]').on('click', event => {
        event.preventDefault()
        const toggle = event.currentTarget.closest('.toggle')
        const { domain, option, itemId } = toggle.dataset
        const suboption = toggle.querySelector('select')?.value ?? null
        actor.toggleRollOption(domain, option, itemId ?? null, toggle.querySelector('input').checked, suboption)
    })
}

function getHeroActions(actor) {
    const heroActionsModule = game.modules.get('pf2e-hero-actions')
    return heroActionsModule?.active ? heroActionsModule.api.getHeroActions(actor) : null
}

function getCharacterActions(actor) {
    const actions = actor.itemTypes.action.filter(item => !actionsUUIDS.has(item.sourceId))
    const feats = actor.itemTypes.feat.filter(item => item.actionCost)

    return [...actions, ...feats].map(item => {
        const actionCost = item.actionCost
        return {
            id: item.id,
            type: actionCost.type,
            cost: actionCost,
            name: item.name,
        }
    })
}

function getNpcActions(actor) {
    return actor.itemTypes.action.map(item => {
        const actionCost = item.actionCost
        const actionType = item.actionCost?.type ?? 'passive'
        const hasAura =
            actionType === 'passive' &&
            (item.system.traits.value.includes('aura') || !!item.system.rules.find(r => r.key === 'Aura'))

        return {
            id: item.id,
            type: actionType,
            cost: actionCost,
            name: item.name,
            hasDeathNote: item.system.deathNote,
            hasAura,
        }
    })
}
