/**
 * Those are directly copied from the PF2e system because they are not accesible to us in the global
 */

const actionImgMap = {
    0: 'systems/pf2e/icons/actions/FreeAction.webp',
    free: 'systems/pf2e/icons/actions/FreeAction.webp',
    1: 'systems/pf2e/icons/actions/OneAction.webp',
    2: 'systems/pf2e/icons/actions/TwoActions.webp',
    3: 'systems/pf2e/icons/actions/ThreeActions.webp',
    '1 or 2': 'systems/pf2e/icons/actions/OneTwoActions.webp',
    '1 to 3': 'systems/pf2e/icons/actions/OneThreeActions.webp',
    '2 or 3': 'systems/pf2e/icons/actions/TwoThreeActions.webp',
    reaction: 'systems/pf2e/icons/actions/Reaction.webp',
    passive: 'systems/pf2e/icons/actions/Passive.webp',
}

const actionGlyphMap = {
    0: 'F',
    free: 'F',
    1: 'A',
    2: 'D',
    3: 'T',
    '1 or 2': 'A/D',
    '1 to 3': 'A - T',
    '2 or 3': 'D/T',
    reaction: 'R',
}

export function getActionIcon(action, fallback = 'systems/pf2e/icons/actions/Empty.webp') {
    if (action === null) return actionImgMap['passive']
    const value = typeof action !== 'object' ? action : action.type === 'action' ? action.value : action.type
    const sanitized = String(value ?? '')
        .toLowerCase()
        .trim()
    return actionImgMap[sanitized] ?? fallback
}

export function getActionGlyph(action) {
    if (!action && action !== 0) return ''

    const value = typeof action !== 'object' ? action : action.type === 'action' ? action.value : action.type
    const sanitized = String(value ?? '')
        .toLowerCase()
        .trim()

    return actionGlyphMap[sanitized] ?? ''
}

export function ErrorPF2e(message) {
    return Error(`PF2e System | ${message}`)
}

export function getSelectedOrOwnActors(types, useOwnCharacter = true) {
    const actors = canvas.tokens.controlled
        .flatMap(token => (token.actor ? token.actor : []))
        .filter(actor => actor.isOwner)
        .filter(actor => !types || actor.isOfType(...types))

    if (actors.length === 0 && game.user.character && useOwnCharacter) actors.push(game.user.character)

    return actors
}

export function tupleHasValue(array, value) {
    return array.includes(value)
}
