/**
 * This one is used to create chat message for items directly picked from compendiums
 * So it is not technically a direct copy/paste of the system code but a slightly rearanged version
 */

import { getChatMessageClass } from './classes'
import { ErrorPF2e, getActionGlyph, traitSlugToObject } from './misc'

export async function unownedItemToMessage(event, item, actor, { rollMode = undefined, create = true, data = {} }) {
    const ChatMessagePF2e = getChatMessageClass()
    const template = `systems/pf2e/templates/chat/${sluggify(item.type)}-card.hbs`
    const token = actor.token
    const nearestItem = event?.currentTarget.closest('.item') ?? {}
    const contextualData = Object.keys(data).length > 0 ? data : nearestItem.dataset || {}
    const templateData = {
        actor: actor,
        tokenId: token ? `${token.parent?.id}.${token.id}` : null,
        item: item,
        data: await item.getChatData(undefined, contextualData),
    }

    const chatData = {
        speaker: ChatMessagePF2e.getSpeaker({
            actor: actor,
            token: actor.getActiveTokens(false, true)[0] ?? null,
        }),
        flags: {
            pf2e: { origin: item.getOriginData() },
        },
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    }

    rollMode ??= event?.ctrlKey || event?.metaKey ? 'blindroll' : game.settings.get('core', 'rollMode')
    if (['gmroll', 'blindroll'].includes(rollMode)) chatData.whisper = ChatMessagePF2e.getWhisperRecipients('GM').map(u => u.id)
    if (rollMode === 'blindroll') chatData.blind = true

    chatData.content = await renderTemplate(template, templateData)
    return create ? ChatMessagePF2e.create(chatData, { renderSheet: false }) : new ChatMessagePF2e(chatData)
}

export async function createSelfEffectMessage(item) {
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
        action: {
            glyph: getActionGlyph(actionCost),
            title: item.name,
        },
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

    return ChatMessagePF2e.create({ speaker, flavor, content, flags })
}
