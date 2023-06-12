function isRelevantEvent(event) {
    return !!event && 'ctrlKey' in event && 'metaKey' in event && 'shiftKey' in event
}

export function eventToRollParams(event) {
    const skipDefault = !game.user.settings.showRollDialogs
    if (!isRelevantEvent(event)) return { skipDialog: skipDefault }

    const params = { skipDialog: event.shiftKey ? !skipDefault : skipDefault }
    if (event.ctrlKey || event.metaKey) {
        params.rollMode = game.user.isGM ? 'gmroll' : 'blindroll'
    }

    return params
}
