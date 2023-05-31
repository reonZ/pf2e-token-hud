import { getSetting } from './module.js'
import { popup } from './popup.js'
import { addNameTooltipListeners, getItemFromEvent, getItemSummary } from './shared.js'
import { actionsUUIDS } from './skills.js'

const SECTIONS_TYPES = {
    action: { order: 0, label: 'PF2E.ActionsActionsHeader', actionLabel: 'PF2E.ActionTypeAction' },
    reaction: { order: 1, label: 'PF2E.ActionTypeReaction', actionLabel: 'PF2E.ActionTypeReaction' },
    free: { order: 2, label: 'PF2E.ActionTypeFree', actionLabel: 'PF2E.ActionTypeFree' },
    passive: { order: 3, label: 'PF2E.ActionTypePassive', actionLabel: 'PF2E.ActionTypePassive' },
}

export async function getActionsData(actor) {
    const isCharacter = actor.isOfType('character')
    const toggles = actor.synthetics.toggles.slice()
    const heroActions = isCharacter ? getHeroActions(actor) : null
    const sorting = getSetting('actions')
    const actions = isCharacter ? getCharacterActions(actor) : getNpcActions(actor)

    const strikes = await Promise.all(
        actor.system.actions.map(async strike => ({
            ...strike,
            damageFormula: await strike.damage?.({ getFormula: true }),
            criticalFormula: await strike.critical?.({ getFormula: true }),
        }))
    )

    let sections = {}

    for (const action of actions) {
        if (sorting !== 'split') {
            sections.action ??= []
            sections.action.push(action)
        } else {
            sections[action.type] ??= []
            sections[action.type].push(action)
        }
    }

    sections = Object.entries(sections).map(([type, actions]) => {
        if (sorting !== 'type') {
            actions.sort((a, b) => a.name.localeCompare(b.name))
        } else {
            actions.sort((a, b) => {
                const orderA = SECTIONS_TYPES[a.type].order
                const orderB = SECTIONS_TYPES[b.type].order
                return orderA === orderB ? a.name.localeCompare(b.name) : orderA - orderB
            })
        }
        return { type, actions, label: SECTIONS_TYPES[type].label }
    })

    if (sorting === 'split') sections.sort((a, b) => SECTIONS_TYPES[a.type].order - SECTIONS_TYPES[b.type].order)

    if (toggles.length || strikes.length || sections.length || heroActions?.length)
        return { toggles, strikes, sections, heroActions }
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

    const damage = el.find('[data-action=strike-damage')
    const critical = el.find('[data-action=strike-critical')

    damage.tooltipster({ position: 'top', theme: 'crb-hover' })
    critical.tooltipster({ position: 'top', theme: 'crb-hover' })
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
        const actionType = actionCost.type

        return {
            id: item.id,
            type: actionCost.type,
            cost: actionCost,
            name: item.name,
            typeLabel: SECTIONS_TYPES[actionType].actionLabel,
        }
    })
}

function getNpcActions(actor) {
    return actor.itemTypes.action.map(item => {
        const actionCost = item.actionCost
        const actionType = actionCost?.type ?? 'passive'
        const hasAura =
            actionType === 'passive' &&
            (item.system.traits.value.includes('aura') || !!item.system.rules.find(r => r.key === 'Aura'))

        return {
            id: item.id,
            type: actionType,
            cost: actionCost,
            name: item.name,
            typeLabel: SECTIONS_TYPES[actionType].actionLabel,
            hasDeathNote: item.system.deathNote,
            hasAura,
        }
    })
}
