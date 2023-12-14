/**
 * This one is used to create chat message for items directly picked from compendiums
 * So it is not technically a direct copy/paste of the system code but a slightly rearanged version
 */

import { getChatMessageClass } from './classes'
import { htmlClosest } from './dom'
import { ErrorPF2e, getActionGlyph, sluggify, traitSlugToObject } from './misc'
import { eventToRollMode } from './scripts'

export async function unownedItemToMessage(event, item, actor, options) {
    const ChatMessagePF2e = getChatMessageClass()

    // Basic template rendering data
    const template = `systems/pf2e/templates/chat/${sluggify(item.type)}-card.hbs`
    const token = actor.token
    const nearestItem = htmlClosest(event?.target, '.item')
    const rollOptions = options.data ?? { ...(nearestItem?.dataset ?? {}) }
    const templateData = {
        actor,
        tokenId: token ? `${token.parent?.id}.${token.id}` : null,
        item,
        data: await item.getChatData(undefined, rollOptions),
    }

    // Basic chat message data
    const originalEvent = event instanceof MouseEvent ? event : event?.originalEvent
    const rollMode = options.rollMode ?? eventToRollMode(originalEvent)
    const chatData = ChatMessagePF2e.applyRollMode(
        {
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            speaker: ChatMessagePF2e.getSpeaker({
                actor: actor,
                token: actor.getActiveTokens(false, true).at(0),
            }),
            content: await renderTemplate(template, templateData),
            flags: { pf2e: { origin: item.getOriginData() } },
        },
        rollMode
    )

    // Create the chat message
    return options.create ?? true
        ? ChatMessagePF2e.create(chatData, { rollMode, renderSheet: false })
        : new ChatMessagePF2e(chatData, { rollMode })
}

export async function createSelfEffectMessage(item, rollMode = 'roll') {
    if (!item.system.selfEffect) {
        throw ErrorPF2e(
            [
                'Only actions with self-applied effects can be passed to `ActorPF2e#useAction`.',
                'Support will be expanded at a later time.',
            ].join(' ')
        )
    }

    const { actor, actionCost } = item
    const token = actor.getActiveTokens(true, true).shift() ?? null

    const ChatMessagePF2e = getChatMessageClass()
    const speaker = ChatMessagePF2e.getSpeaker({ actor, token })
    const flavor = await renderTemplate('systems/pf2e/templates/chat/action/flavor.hbs', {
        action: { title: item.name, glyph: getActionGlyph(actionCost) },
        item,
        traits: item.system.traits.value.map(t => traitSlugToObject(t, CONFIG.PF2E.actionTraits)),
    })

    // Get a preview slice of the message
    const previewLength = 100
    const descriptionPreview = (() => {
        if (item.actor.pack) return null
        const tempDiv = document.createElement('div')
        const documentTypes = [...CONST.DOCUMENT_LINK_TYPES, 'Compendium', 'UUID']
        const linkPattern = new RegExp(`@(${documentTypes.join('|')})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, 'g')
        tempDiv.innerHTML = item.description.replace(linkPattern, (_match, ...args) => args[3])

        return tempDiv.innerText.slice(0, previewLength)
    })()
    const description = {
        full: descriptionPreview && descriptionPreview.length < previewLength ? item.description : null,
        preview: descriptionPreview,
    }
    const content = await renderTemplate('systems/pf2e/templates/chat/action/self-effect.hbs', {
        actor: item.actor,
        description,
    })
    const flags = { pf2e: { context: { type: 'self-effect', item: item.id } } }
    const messageData = ChatMessagePF2e.applyRollMode({ speaker, flavor, content, flags }, rollMode)

    return ChatMessagePF2e.create(messageData)
}
