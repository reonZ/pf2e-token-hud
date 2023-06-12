/**
 * This one is used to create chat message for items directly picked from compendiums
 * So it is not technically a direct copy/paste of the system code but a slightly rearanged version
 */

export async function unownedItemToMessage(event, item, actor, { rollMode = undefined, create = true, data = {} }) {
    const template = `systems/pf2e/templates/chat/${item.type}-card.hbs`
    const token = actor.token
    const nearestItem = event?.currentTarget.closest('.item') ?? {}
    const ChatMessagePF2e = CONFIG.ChatMessage.documentClass

    const contextualData = Object.keys(data).length > 0 ? data : nearestItem.dataset || {}
    const templateData = {
        actor: actor,
        tokenId: token ? `${token.parent?.id}.${token.id}` : null,
        item,
        data: await item.getChatData(undefined, contextualData),
    }

    const chatData = {
        speaker: ChatMessagePF2e.getSpeaker({
            actor: actor,
            token: actor.getActiveTokens(false, true)[0] ?? null,
        }),
        flags: {
            core: {
                canPopout: true,
            },
            pf2e: {
                origin: { uuid: item.uuid, type: item.type },
            },
        },
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    }

    rollMode ??= event?.ctrlKey || event?.metaKey ? 'blindroll' : game.settings.get('core', 'rollMode')
    if (['gmroll', 'blindroll'].includes(rollMode)) chatData.whisper = ChatMessagePF2e.getWhisperRecipients('GM').map(u => u.id)
    if (rollMode === 'blindroll') chatData.blind = true

    chatData.content = await renderTemplate(template, templateData)
    return create ? ChatMessagePF2e.create(chatData, { renderSheet: false }) : new ChatMessagePF2e(chatData)
}
