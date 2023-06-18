import { enrichHTML, getSetting, templatePath } from '../module.js'
import { getActionIcon } from '../pf2e/misc.js'
import { toggleWeaponTrait } from '../pf2e/weapon.js'
import { popup, showItemSummary } from '../popup.js'
import { addNameTooltipListeners, filterIn, getItemFromEvent } from '../shared.js'
import { actionsUUIDS } from './skills.js'

const SECTIONS_TYPES = {
    action: { order: 0, label: 'PF2E.ActionsActionsHeader', actionLabel: 'PF2E.ActionTypeAction' },
    reaction: { order: 1, label: 'PF2E.ActionTypeReaction', actionLabel: 'PF2E.ActionTypeReaction' },
    free: { order: 2, label: 'PF2E.ActionTypeFree', actionLabel: 'PF2E.ActionTypeFree' },
    passive: { order: 3, label: 'PF2E.ActionTypePassive', actionLabel: 'PF2E.ActionTypePassive' },
}

const TOOLTIPS = {
    delay: [500, 0],
    position: 'top',
    theme: 'crb-hover',
    arrow: false,
}

export async function getActionsData(actor, token, filter) {
    const isCharacter = actor.isOfType('character')
    const toggles = actor.synthetics.toggles.slice()
    const sorting = getSetting('actions')
    const actions = isCharacter ? getCharacterActions(actor) : getNpcActions(actor)

    let heroActions
    const heroActionsModule = game.modules.get('pf2e-hero-actions')
    if (heroActionsModule?.active && isCharacter) {
        const actions = heroActionsModule.api.getHeroActions(actor)
        const diff = actor.heroPoints.value - actions.length

        heroActions = {
            actions,
            draw: Math.max(diff, 0),
            discard: Math.abs(Math.min(diff, 0)),
            canTrade: actions.length && game.settings.get('pf2e-hero-actions', 'trade'),
        }
    }

    const strikes =
        actor.system.actions &&
        (await Promise.all(
            actor.system.actions
                .filter(strike => strike.visible !== false)
                .map(async (strike, index) => ({
                    ...strike,
                    index,
                    damageFormula: await strike.damage?.({ getFormula: true }),
                    criticalFormula: await strike.critical?.({ getFormula: true }),
                    description: strike.description ? await enrichHTML(strike.description, actor) : undefined,
                }))
        ))

    let sections = {}

    for (const action of actions) {
        if (!filterIn(action.name, filter)) continue
        if (sorting !== 'split') {
            sections.action ??= []
            sections.action.push(action)
        } else {
            sections[action.type] ??= []
            sections[action.type].push(action)
        }
    }

    sections = Object.entries(sections).map(([type, actions]) => {
        actions.forEach(action => {
            action.img = getActionIcon(action.cost)
            action.typeLabel = SECTIONS_TYPES[action.type].actionLabel
        })

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

    if (toggles.length || strikes?.length || sections.length || heroActions?.length)
        return {
            contentData: {
                toggles,
                strikes,
                sections,
                heroActions,
                damageTypes: CONFIG.PF2E.damageTypes,
            },
            doubled: getSetting('actions-columns'),
            classes: [getSetting('actions-colors') ? 'attack-damage-system-colors' : ''],
        }
}

export function addActionsListeners(el, actor) {
    addNameTooltipListeners(el.find('.toggle'))
    addNameTooltipListeners(el.find('.strike'))
    addNameTooltipListeners(el.find('.action'))

    function action(action, callback, type = 'click') {
        action = typeof action === 'string' ? [action] : action
        action = action.map(x => `[data-action=${x}]`).join(', ')
        return el.find(action).on(type, event => {
            event.preventDefault()
            callback(event)
        })
    }

    function getStrike(event) {
        const { index } = event.currentTarget.closest('.strike').dataset
        return actor.system.actions[index]
    }

    function getUuid(event) {
        return $(event.currentTarget).closest('.action').data().uuid
    }

    action('action-description', async event => {
        const action = $(event.currentTarget).closest('.action')
        showItemSummary(action, actor)
    })

    action('hero-action-description', async event => {
        const { description, name } = (await getHeroActionDescription(getUuid(event))) ?? {}
        if (description) popup(name, description, actor)
    })

    action('strike-description', async event => {
        const strike = getStrike(event)
        if (!strike) return

        const description = document.createElement('div')
        description.classList.add('description')
        // this one is a copy of the system template, there is nothing to generate it
        description.innerHTML = await renderTemplate(templatePath('strike-description'), strike)

        popup(strike.label, description, actor)
    })

    action('trait-description', event => {
        const strike = getStrike(event)
        if (!strike) return

        const { index } = event.currentTarget.dataset
        const trait = strike.traits[index]
        if (!trait) return

        const description = game.i18n.localize(trait.description)
        if (description) popup(game.i18n.localize(trait.label), description, actor)
    })

    // IS OWNER
    if (!actor.isOwner) return

    action('action-chat', event => {
        const item = getItemFromEvent(event, actor)
        item?.toMessage(event, { create: true })
    })

    action('hero-action-chat', async event => {
        await game.modules.get('pf2e-hero-actions')?.api.sendActionToChat(actor, getUuid(event))
    })

    action('draw-hero-action', async event => {
        await game.modules.get('pf2e-hero-actions')?.api.drawHeroActions(actor)
    })

    action('use-hero-action', async event => {
        await game.modules.get('pf2e-hero-actions')?.api.useHeroAction(actor, getUuid(event))
    })

    action('discard-hero-action', async event => {
        await game.modules.get('pf2e-hero-actions')?.api.discardHeroActions(actor, getUuid(event))
    })

    action('trade-hero-action', async event => {
        game.modules.get('pf2e-hero-actions')?.api.tradeHeroAction(actor)
    })

    action('strike-attack', event => {
        const { index } = event.currentTarget.dataset
        const strike = getStrike(event)
        strike?.variants[index].roll({ event })
    })

    action(['toggle-roll-option', 'set-suboption'], event => {
        const toggle = event.currentTarget.closest('.toggle')
        const { domain, option, itemId } = toggle.dataset
        const suboption = toggle.querySelector('select')?.value ?? null
        actor.toggleRollOption(domain, option, itemId ?? null, toggle.querySelector('input').checked, suboption)
    })

    action(['strike-damage', 'strike-critical'], event => {
        const { action } = event.currentTarget.dataset
        const strike = getStrike(event)
        strike?.[action === 'strike-damage' ? 'damage' : 'critical']({ event })
    }).tooltipster(TOOLTIPS)

    action('strike-auxiliary', event => {
        if (event.currentTarget !== event.target) return

        const strike = getStrike(event)
        if (!strike) return

        const { index } = event.currentTarget.dataset
        const modular = event.currentTarget.querySelector('select')?.value ?? null

        strike.auxiliaryActions?.[index]?.execute({ selection: modular })
    })

    action('toggle-versatile', event => {
        const weapon = getStrike(event)?.item
        if (!weapon) return

        const target = event.currentTarget
        const { value } = target.dataset
        const baseType = weapon?.system.damage.damageType ?? null
        const selection = target.classList.contains('selected') || value === baseType ? null : value

        toggleWeaponTrait({ trait: 'versatile', weapon, selection })
    }).tooltipster(TOOLTIPS)

    action(
        'strike-ammo',
        async event => {
            const weapon = getStrike(event)?.item
            if (!weapon) return

            const ammo = actor.items.get(event.currentTarget.value)
            await weapon.update({ system: { selectedAmmoId: ammo?.id ?? null } })
        },
        'change'
    )
}

function getHeroActionDescription(uuid) {
    return game.modules.get('pf2e-hero-actions')?.api.getHeroActionDetails(uuid)
}

function getCharacterActions(actor) {
    const actions = actor.itemTypes.action.filter(item => !actionsUUIDS.has(item.sourceId))
    const feats = actor.itemTypes.feat.filter(item => item.actionCost)

    return (
        [...actions, ...feats]
            // TODO maybe some day i will get back to this and give them their own place
            .filter(actions => {
                const traits = actions.system.traits.value
                return !traits.includes('downtime') && !traits.includes('exploration')
            })
            .map(action => {
                const actionCost = action.actionCost

                return {
                    id: action.id,
                    type: actionCost?.type ?? 'free',
                    cost: actionCost,
                    name: action.name,
                }
            })
    )
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
            hasDeathNote: item.system.deathNote,
            hasAura,
        }
    })
}
