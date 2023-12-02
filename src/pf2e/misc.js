/**
 * Those are directly copied from the PF2e system because they are not accesible to us in the global
 */

import { R } from './remeda'

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
    return R.uniq(
        game.user
            .getActiveTokens()
            .filter(t => types.length === 0 || t.actor?.isOfType(...types))
            .flatMap(t => t.actor ?? [])
    )
}

export function tupleHasValue(array, value) {
    return array.includes(value)
}

export function objectHasKey(obj, key) {
    return (typeof key === 'string' || typeof key === 'number') && key in obj
}

const wordCharacter = String.raw`[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`
const nonWordCharacter = String.raw`[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`
const nonWordCharacterRE = new RegExp(nonWordCharacter, 'gu')

const wordBoundary = String.raw`(?:${wordCharacter})(?=${nonWordCharacter})|(?:${nonWordCharacter})(?=${wordCharacter})`
const nonWordBoundary = String.raw`(?:${wordCharacter})(?=${wordCharacter})`
const lowerCaseLetter = String.raw`\p{Lowercase_Letter}`
const upperCaseLetter = String.raw`\p{Uppercase_Letter}`
const lowerCaseThenUpperCaseRE = new RegExp(`(${lowerCaseLetter})(${upperCaseLetter}${nonWordBoundary})`, 'gu')

const nonWordCharacterHyphenOrSpaceRE = /[^-\p{White_Space}\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/gu
const upperOrWordBoundariedLowerRE = new RegExp(`${upperCaseLetter}|(?:${wordBoundary})${lowerCaseLetter}`, 'gu')

/**
 * The system's sluggification algorithm for labels and other terms.
 * @param text The text to sluggify
 * @param [options.camel=null] The sluggification style to use
 */
export function sluggify(text, { camel = null } = {}) {
    // Sanity check
    if (typeof text !== 'string') {
        console.warn('Non-string argument passed to `sluggify`')
        return ''
    }

    // A hyphen by its lonesome would be wiped: return it as-is
    if (text === '-') return text

    switch (camel) {
        case null:
            return text
                .replace(lowerCaseThenUpperCaseRE, '$1-$2')
                .toLowerCase()
                .replace(/['’]/g, '')
                .replace(nonWordCharacterRE, ' ')
                .trim()
                .replace(/[-\s]+/g, '-')
        case 'bactrian': {
            const dromedary = sluggify(text, { camel: 'dromedary' })
            return dromedary.charAt(0).toUpperCase() + dromedary.slice(1)
        }
        case 'dromedary':
            return text
                .replace(nonWordCharacterHyphenOrSpaceRE, '')
                .replace(/[-_]+/g, ' ')
                .replace(upperOrWordBoundariedLowerRE, (part, index) => (index === 0 ? part.toLowerCase() : part.toUpperCase()))
                .replace(/\s+/g, '')
        default:
            throw ErrorPF2e("I don't think that's a real camel.")
    }
}

/**
 * Given an array and a key function, create a map where the key is the value that
 * gets returned when each item is pushed into the function. Accumulate
 * items in an array that have the same key
 * @param array
 * @param criterion
 * @return
 */
export function groupBy(array, criterion) {
    const result = new Map()
    for (const elem of array) {
        const key = criterion(elem)
        const group = result.get(key)
        if (group) {
            group.push(elem)
        } else {
            result.set(key, [elem])
        }
    }
    return result
}

export function sortBy(mapping) {
    return (a, b) => {
        const value1 = mapping(a)
        const value2 = mapping(b)
        return value1 < value2 ? -1 : value1 === value2 ? 0 : 1
    }
}

export function sum(values) {
    return values.reduce((a, b) => a + b, 0)
}

export function setHasElement(set, value) {
    return set.has(value)
}

export function traitSlugToObject(trait, dictionary) {
    // Look up trait labels from `npcAttackTraits` instead of `weaponTraits` in case a battle form attack is
    // in use, which can include what are normally NPC-only traits
    const traitObject = {
        name: trait,
        label: game.i18n.localize(dictionary[trait] ?? trait),
    }
    if (objectHasKey(CONFIG.PF2E.traitsDescriptions, trait)) {
        traitObject.description = CONFIG.PF2E.traitsDescriptions[trait]
    }

    return traitObject
}

export function ordinalString(value) {
    const pluralRules = new Intl.PluralRules(game.i18n.lang, { type: 'ordinal' })
    const suffix = game.i18n.localize(`PF2E.OrdinalSuffixes.${pluralRules.select(value)}`)
    return game.i18n.format('PF2E.OrdinalNumber', { value, suffix })
}
