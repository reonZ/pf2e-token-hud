import { calculateDC } from './dc.js'
import { htmlClosest, htmlQueryAll } from './dom.js'
import { sluggify } from './misc.js'
import { eventToRollParams } from './scripts.js'
import { calculateDegreeOfSuccess } from './success.js'

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
        newButton.classList.add('fas', icon)
        newButton.setAttribute('data-pf2-repost', '')
        newButton.setAttribute('title', game.i18n.localize('PF2E.Repost'))
        link.appendChild(newButton)
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

    const defaultVisibility = actor?.hasPlayerOwner ? 'all' : 'gm'
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
    const speaker =
        actor instanceof Actor
            ? ChatMessagePF2e.getSpeaker({
                  actor: actor,
                  token: actor.token ?? actor.getActiveTokens(false, true).shift(),
              })
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
 * flat check has been completely redone
 * actions & checks use the actor directly instead of selections
 */
export function listenInlineRoll($html, actor) {
    const html = $html instanceof HTMLElement ? $html : $html[0]

    const links = htmlQueryAll(html, inlineSelector).filter(l => l.nodeName === 'SPAN')
    injectRepostElement(links, actor)

    flavorDamageRolls(html, actor)

    htmlQueryAll(html, 'i[data-pf2-repost]').forEach(btn =>
        btn.addEventListener('click', event => {
            const target = event.target
            if (!(target instanceof HTMLElement)) return
            const parent = target?.parentElement
            if (parent) repostAction(parent, actor)
            event.stopPropagation()
        })
    )

    const $links = $(links)
    $links.filter('[data-pf2-action]').on('click', event => {
        const $target = $(event.currentTarget)
        const { pf2Action, pf2Glyph, pf2Variant, pf2Dc, pf2ShowDc, pf2Skill } = $target[0]?.dataset ?? {}
        const action = game.pf2e.actions[pf2Action ? sluggify(pf2Action, { camel: 'dromedary' }) : '']
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

    $links.filter('[data-pf2-check]').on('click', async event => {
        const { pf2Check, pf2Dc, pf2Traits, pf2Label, pf2Adjustment } = event.currentTarget.dataset
        const parsedTraits = pf2Traits
            ?.split(',')
            .map(trait => trait.trim())
            .filter(trait => !!trait)
        const eventRollParams = eventToRollParams(event)

        switch (pf2Check) {
            case 'flat': {
                const dc = Number.isInteger(Number(pf2Dc)) ? { label: pf2Label, value: Number(pf2Dc) } : null
                const roll = await new Roll('1d20').evaluate({ async: true })
                const rollTotal = roll.total
                const dieResult = roll.dice[0].total
                const success = calculateDegreeOfSuccess(rollTotal, dieResult, dc.value)
                const degree = {
                    value: success,
                    unadjusted: success,
                    adjustment: null,
                    dieResult,
                    rollTotal,
                    dc,
                }
                const flavor = (await game.pf2e.Check.createResultFlavor({ degree })).outerHTML
                roll.toMessage({ flavor })
                break
            }
            default: {
                const statistic = actor.getStatistic(pf2Check ?? '')
                if (statistic) {
                    const dcValue = (() => {
                        const adjustment = Number(pf2Adjustment) || 0
                        if (pf2Dc === '@self.level') {
                            return calculateDC(actor.level) + adjustment
                        }
                        return Number(pf2Dc) + adjustment
                    })()

                    const dc = Number.isInteger(dcValue) ? { label: pf2Label, value: dcValue } : null

                    statistic.check.roll({
                        ...eventRollParams,
                        extraRollOptions: parsedTraits,
                        origin: actor,
                        dc,
                    })
                } else {
                    console.warn(`PF2e System | Skip rolling unknown statistic ${pf2Check}`)
                }
            }
        }
    })

    $links.filter('[data-pf2-effect-area]').on('click', async event => {
        const { pf2EffectArea, pf2Distance, pf2TemplateData, pf2Traits, pf2Width } = event.currentTarget.dataset
        const templateConversion = {
            burst: 'circle',
            emanation: 'circle',
            line: 'ray',
            cone: 'cone',
            rect: 'rect',
        }

        if (typeof pf2EffectArea === 'string') {
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
            await new CONFIG.MeasuredTemplate.objectClass(templateDoc).drawPreview()
        } else {
            console.warn(`PF2e System | Could not create template'`)
        }
    })
}
