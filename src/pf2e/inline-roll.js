import { htmlClosest, htmlQueryAll } from './dom.js'
import { tupleHasValue } from './misc.js'
import { eventToRollParams } from './scripts.js'

const inlineSelector = ['action', 'check', 'effect-area'].map(keyword => `[data-pf2-${keyword}]`).join(',')

function injectRepostElement(links, actor) {
    for (const link of links) {
        if (!actor || actor.isOwner) link.classList.add('with-repost')

        const repostButtons = htmlQueryAll(link, 'i[data-pf2-repost]')
        if (repostButtons.length > 0) {
            if (actor && !actor.isOwner) {
                for (const button of repostButtons) {
                    button.remove()
                }
                link.classList.remove('with-repost')
            }
            continue
        }

        if (actor && !actor.isOwner) continue

        const newButton = document.createElement('i')
        const icon = link.parentElement?.dataset?.pf2Checkgroup !== undefined ? 'fa-comment-alt-dots' : 'fa-comment-alt'
        newButton.classList.add('fa-solid', icon)
        newButton.dataset.pf2Repost = ''
        newButton.title = game.i18n.localize('PF2E.Repost')
        link.appendChild(newButton)

        newButton.addEventListener('click', event => {
            event.stopPropagation()

            const target = event.target
            if (!(target instanceof HTMLElement)) return

            const parent = target?.parentElement
            if (parent) repostAction(parent, actor)
        })
    }
}

function flavorDamageRolls(html, actor = null) {
    for (const rollLink of htmlQueryAll(html, 'a.inline-roll[data-damage-roll]')) {
        const itemId = htmlClosest(rollLink, '[data-item-id]')?.dataset.itemId
        const item = actor?.items.get(itemId ?? '')
        if (item) rollLink.dataset.flavor ||= item.name
    }
}

function makeRepostHtml(target, defaultVisibility) {
    const flavor = target.attributes.getNamedItem('data-pf2-repost-flavor')?.value ?? ''
    const showDC = target.attributes.getNamedItem('data-pf2-show-dc')?.value ?? defaultVisibility
    return `<span data-visibility="${showDC}">${flavor}</span> ${target.outerHTML}`.trim()
}

function repostAction(target, actor = null) {
    if (!['pf2Action', 'pf2Check', 'pf2EffectArea'].some(d => d in target.dataset)) {
        return
    }

    const defaultVisibility = (actor ?? actor)?.hasPlayerOwner ? 'all' : 'gm'
    const content = (() => {
        if (target.parentElement?.dataset?.pf2Checkgroup !== undefined) {
            const content = htmlQueryAll(target.parentElement, inlineSelector)
                .map(target => makeRepostHtml(target, defaultVisibility))
                .join('<br>')

            return `<div data-pf2-checkgroup>${content}</div>`
        } else {
            return makeRepostHtml(target, defaultVisibility)
        }
    })()

    const ChatMessagePF2e = CONFIG.ChatMessage.documentClass
    const speaker = actor
        ? ChatMessagePF2e.getSpeaker({ actor, token: actor.getActiveTokens(false, true).shift() })
        : ChatMessagePF2e.getSpeaker()

    const message = game.messages.get(htmlClosest(target, '[data-message-id]')?.dataset.messageId ?? '')
    const flags = message?.flags.pf2e.origin ? { pf2e: { origin: deepClone(message.flags.pf2e.origin) } } : {}

    ChatMessagePF2e.create({
        speaker,
        content,
        flags,
    })
}

/**
 * Significant rework has been done here
 * actions & checks use the actor directly instead of selections
 */
export function listenInlineRoll($html, actor) {
    const html = $html instanceof HTMLElement ? $html : $html[0]

    const links = htmlQueryAll(html, inlineSelector).filter(l => ['A', 'SPAN'].includes(l.nodeName))

    injectRepostElement(links, actor)
    flavorDamageRolls(html, actor)

    for (const link of links.filter(l => l.dataset.pf2Action)) {
        const { pf2Action, pf2Glyph, pf2Variant, pf2Dc, pf2ShowDc, pf2Skill } = link.dataset
        link.addEventListener('click', event => {
            const action = game.pf2e.actions[pf2Action ? game.pf2e.system.sluggify(pf2Action, { camel: 'dromedary' }) : '']
            const visibility = pf2ShowDc ?? 'all'
            if (pf2Action && action) {
                action({
                    event,
                    glyph: pf2Glyph,
                    variant: pf2Variant,
                    difficultyClass: pf2Dc ? { scope: 'check', value: Number(pf2Dc) || 0, visibility } : undefined,
                    skill: pf2Skill,
                    actors: [actor],
                })
            } else {
                console.warn(`PF2e System | Skip executing unknown action '${pf2Action}'`)
            }
        })
    }

    for (const link of links.filter(l => l.dataset.pf2Check && !l.dataset.invalid)) {
        const { pf2Check, pf2Dc, pf2Traits, pf2Label, pf2Defense, pf2Adjustment, pf2Roller } = link.dataset
        if (!pf2Check) return

        link.addEventListener('click', event => {
            const parsedTraits = pf2Traits
                ?.split(',')
                .map(trait => trait.trim())
                .filter(trait => !!trait)
            const eventRollParams = eventToRollParams(event)

            switch (pf2Check) {
                case 'flat': {
                    const flatCheck = new actor.perception.constructor(actor, {
                        label: '',
                        slug: 'flat',
                        modifiers: [],
                        check: { type: 'flat-check' },
                    })
                    const dc = Number.isInteger(Number(pf2Dc)) ? { label: pf2Label, value: Number(pf2Dc) } : null
                    flatCheck.roll({ ...eventRollParams, extraRollOptions: parsedTraits, dc })
                    break
                }
                default: {
                    const statistic = (() => {
                        if (pf2Check in CONFIG.PF2E.magicTraditions) {
                            const bestSpellcasting =
                                actor.spellcasting
                                    .filter(c => c.tradition === pf2Check)
                                    .flatMap(s => s.statistic ?? [])
                                    .sort((a, b) => b.check.mod - a.check.mod)
                                    .shift() ?? null
                            if (bestSpellcasting) return bestSpellcasting
                        }
                        return actor.getStatistic(pf2Check)
                    })()
                    if (!statistic) {
                        console.warn(ErrorPF2e(`Skip rolling unknown statistic ${pf2Check}`).message)
                        break
                    }

                    const targetActor = pf2Defense ? game.user.targets.first()?.actor : null
                    const dcValue = (() => {
                        const adjustment = Number(pf2Adjustment) || 0
                        if (pf2Dc === '@self.level') {
                            return calculateDC(actor.level) + adjustment
                        }
                        return Number(pf2Dc ?? 'NaN') + adjustment
                    })()
                    const dc = (() => {
                        if (Number.isInteger(dcValue)) {
                            return { label: pf2Label, value: dcValue }
                        } else if (pf2Defense) {
                            const defenseStat = targetActor?.getStatistic(pf2Defense)
                            return defenseStat
                                ? {
                                      statistic: defenseStat.dc,
                                      scope: 'check',
                                      value: defenseStat.dc.value,
                                  }
                                : null
                        }
                        return null
                    })()

                    const isSavingThrow = tupleHasValue(['fortitude', 'reflex', 'will'], pf2Check)

                    // Get actual traits and include as such
                    const traits = isSavingThrow ? [] : parsedTraits?.filter(t => t in CONFIG.PF2E.actionTraits) ?? []
                    statistic.roll({
                        ...eventRollParams,
                        extraRollOptions: parsedTraits,
                        origin: isSavingThrow ? actor : null,
                        dc,
                        target: !isSavingThrow && dc?.statistic ? targetActor : null,
                        traits,
                    })
                }
            }
        })
    }

    const templateConversion = {
        burst: 'circle',
        emanation: 'circle',
        line: 'ray',
        cone: 'cone',
        rect: 'rect',
    }

    for (const link of links.filter(l => l.hasAttribute('data-pf2-effect-area'))) {
        const { pf2EffectArea, pf2Distance, pf2TemplateData, pf2Traits, pf2Width } = link.dataset
        link.addEventListener('click', () => {
            if (typeof pf2EffectArea !== 'string') {
                console.warn(`PF2e System | Could not create template'`)
                return
            }

            const templateData = JSON.parse(pf2TemplateData ?? '{}')
            templateData.distance ||= Number(pf2Distance)
            templateData.fillColor ||= game.user.color
            templateData.t = templateConversion[pf2EffectArea]

            if (templateData.t === 'ray') {
                templateData.width =
                    Number(pf2Width) || CONFIG.MeasuredTemplate.defaults.width * (canvas.dimensions?.distance ?? 1)
            } else if (templateData.t === 'cone') {
                templateData.angle = CONFIG.MeasuredTemplate.defaults.angle
            }

            if (pf2Traits) {
                templateData.flags = {
                    pf2e: {
                        origin: {
                            traits: pf2Traits.split(','),
                        },
                    },
                }
            }

            const templateDoc = new CONFIG.MeasuredTemplate.documentClass(templateData, { parent: canvas.scene })
            new CONFIG.MeasuredTemplate.objectClass(templateDoc).drawPreview()
        })
    }
}
