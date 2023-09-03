import { isInstanceOf } from '../module'
import { getChatMessageClass, getDamageInstanceClass, getDamageRollClass } from './classes'
import { ErrorPF2e, groupBy, setHasElement, sluggify, sortBy, sum } from './misc'
import { R } from './remeda'
import { DEGREE_OF_SUCCESS } from './success'

const FACES = [4, 6, 8, 10, 12]

const DEGREE_OF_SUCCESS_STRINGS = ['criticalFailure', 'failure', 'success', 'criticalSuccess']

const DAMAGE_CATEGORIES_UNIQUE = new Set(['persistent', 'precision', 'splash'])

const CRITICAL_INCLUSION = {
    DOUBLE_ON_CRIT: null,
    CRITICAL_ONLY: true,
    DONT_DOUBLE_ON_CRIT: false,
}

/**
 * copy of the system damagePF2e to be used for @Damage
 */
export class DamagePF2e {
    static async roll(data, context, callback) {
        const DamageRoll = getDamageRollClass()
        const outcome = context.outcome ?? null

        context.rollMode ??= (context.secret ? 'blindroll' : undefined) ?? game.settings.get('core', 'rollMode')
        context.createMessage ??= true

        // Change default roll mode to blind GM roll if the "secret" option is specified
        if (context.options.has('secret')) {
            context.secret = true
        }

        const subtitle = outcome
            ? context.sourceType === 'attack'
                ? game.i18n.localize(`PF2E.Check.Result.Degree.Attack.${outcome}`)
                : game.i18n.localize(`PF2E.Check.Result.Degree.Check.${outcome}`)
            : null
        let flavor = await renderTemplate('systems/pf2e/templates/chat/action/header.hbs', {
            title: data.name,
            subtitle,
        })

        if (data.traits) {
            const toTags = (slugs, { labels = {}, descriptions = {}, cssClass, dataAttr }) =>
                slugs
                    .map(s => ({ value: s, label: game.i18n.localize(labels[s] ?? '') }))
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map(tag => {
                        const description = descriptions[tag.value] ?? ''

                        const span = document.createElement('span')
                        span.className = 'tag'
                        if (cssClass) span.classList.add(cssClass)
                        span.dataset[dataAttr] = tag.value
                        span.dataset.description = description
                        span.innerText = tag.label

                        return span.outerHTML
                    })
                    .join('')

            const traits = toTags(data.traits, {
                labels: CONFIG.PF2E.actionTraits,
                descriptions: CONFIG.PF2E.traitsDescriptions,
                cssClass: null,
                dataAttr: 'trait',
            })

            const item = context.self?.item
            const itemTraits = item?.isOfType('weapon', 'melee', 'spell')
                ? toTags(
                      // Materials are listed in a separate group of tags
                      Array.from(item.traits).filter(t => !(t in CONFIG.PF2E.materialDamageEffects)),
                      {
                          labels: item.isOfType('spell') ? CONFIG.PF2E.spellTraits : CONFIG.PF2E.npcAttackTraits,
                          descriptions: CONFIG.PF2E.traitsDescriptions,
                          cssClass: 'tag_alt',
                          dataAttr: 'trait',
                      }
                  )
                : ''

            const properties = (() => {
                const range = item?.isOfType('action', 'melee', 'weapon') ? item.range : null
                const label = createActionRangeLabel(range)
                if (label && (range?.increment || range?.max)) {
                    // Show the range increment or max range as a tag
                    const slug = range.increment ? `range-increment-${range.increment}` : `range-${range.max}`
                    return toTags([slug], {
                        labels: { [slug]: label },
                        descriptions: { [slug]: 'PF2E.Item.Weapon.RangeIncrementN.Hint' },
                        cssClass: 'tag_secondary',
                        dataAttr: 'slug',
                    })
                } else {
                    return ''
                }
            })()

            const materialEffects = toTags(data.materials, {
                labels: CONFIG.PF2E.preciousMaterials,
                descriptions: CONFIG.PF2E.traitsDescriptions,
                cssClass: 'tag_material',
                dataAttr: 'material',
            })

            const otherTags = [itemTraits, properties, materialEffects].join('')

            flavor +=
                otherTags.length > 0
                    ? `<div class="tags">${traits}<hr class="vr" />${otherTags}</div><hr>`
                    : `<div class="tags">${traits}</div><hr>`
        }

        // Add breakdown to flavor
        const breakdown = Array.isArray(data.damage.breakdown)
            ? data.damage.breakdown
            : data.damage.breakdown[outcome ?? 'success']
        const breakdownTags = breakdown.map(b => `<span class="tag tag_transparent">${b}</span>`)
        flavor += `<div class="tags">${breakdownTags.join('')}</div>`

        // Create the damage roll and evaluate. If already created, evalute the one we've been given instead
        const roll = await (() => {
            const damage = data.damage
            if ('roll' in damage) {
                return damage.roll.evaluate({ async: true })
            }

            const formula = deepClone(damage.formula[outcome ?? 'success'])
            if (!formula) {
                ui.notifications.error(game.i18n.format('PF2E.UI.noDamageInfoForOutcome', { outcome }))
                return null
            }

            const rollerId = game.userId
            const degreeOfSuccess = outcome ? DEGREE_OF_SUCCESS_STRINGS.indexOf(outcome) : null
            const critRule = game.settings.get('pf2e', 'critRule') === 'doubledamage' ? 'double-damage' : 'double-dice'

            const options = {
                rollerId,
                damage: data,
                degreeOfSuccess,
                ignoredResistances: damage.ignoredResistances,
                critRule,
            }
            return new DamageRoll(formula, {}, options).evaluate({ async: true })
        })()

        if (roll === null) return null

        const syntheticNotes = context.self?.actor
            ? extractNotes(context.self?.actor.synthetics.rollNotes, context.domains ?? [])
            : []
        const allNotes = [...syntheticNotes, ...data.notes]
        const filteredNotes = allNotes.filter(
            n => (n.outcome.length === 0 || (outcome && n.outcome.includes(outcome))) && n.predicate.test(context.options)
        )
        const noteRollData = (context.self?.item ?? context.self?.actor)?.getRollData() ?? {}
        const notesFlavor = (
            await Promise.all(
                filteredNotes.map(async n => await TextEditor.enrichHTML(n.text, { rollData: noteRollData, async: true }))
            )
        ).join('\n')
        flavor += notesFlavor

        const { self, target } = context
        const item = self?.item ?? null
        const targetFlag = target ? { actor: target.actor.uuid, token: target.token.uuid } : null

        // Retrieve strike flags. Strikes need refactoring to use ids before we can do better
        const strike = (() => {
            const isStrike = item?.isOfType('melee', 'weapon')
            if (isStrike && item && self?.actor?.isOfType('character', 'npc')) {
                const strikes = self.actor.system.actions
                const strike = strikes.find(a => a.item?.id === item.id && a.item.slug === item.slug)

                if (strike) {
                    return {
                        actor: self.actor.uuid,
                        index: strikes.indexOf(strike),
                        damaging: true,
                        name: strike.item.name,
                        altUsage: item.isOfType('weapon') ? item.altUsageType : null,
                    }
                }
            }

            return null
        })()

        const rollMode = context.rollMode ?? 'roll'
        const contextFlag = {
            type: context.type,
            sourceType: context.sourceType,
            actor: context.self?.actor.id ?? null,
            token: context.self?.token?.id ?? null,
            target: targetFlag,
            domains: context.domains ?? [],
            options: Array.from(context.options).sort(),
            mapIncreases: context.mapIncreases,
            notes: allNotes.map(n => n.toObject()),
            secret: context.secret ?? false,
            rollMode,
            traits: context.traits ?? [],
            skipDialog: context.skipDialog ?? !game.user.settings.showRollDialogs,
            outcome,
            unadjustedOutcome: context.unadjustedOutcome ?? null,
        }

        const ChatMessagePF2e = getChatMessageClass()

        const messageData = await roll.toMessage(
            {
                speaker: ChatMessagePF2e.getSpeaker({ actor: self?.actor, token: self?.token }),
                flavor,
                flags: {
                    pf2e: {
                        context: contextFlag,
                        target: targetFlag,
                        modifiers: data.modifiers?.map(m => m.toObject()) ?? [],
                        origin: item?.getOriginData(),
                        strike,
                        preformatted: 'both',
                    },
                },
            },
            { create: false }
        )

        // If there is splash damage, include it as an additional roll for separate application
        const splashRolls = await (async () => {
            const splashInstances = roll.instances
                .map(i => ({ damageType: i.type, total: i.componentTotal('splash') }))
                .filter(s => s.total > 0)
            const rolls = []
            for (const splash of splashInstances) {
                const formula = `(${splash.total}[splash])[${splash.damageType}]`
                const roll = await new DamageRoll(formula).evaluate({ async: true })
                roll.options.splashOnly = true
                rolls.push(roll.toJSON())
            }

            return rolls
        })()

        if (context.createMessage) {
            messageData.rolls.push(...splashRolls)
            await ChatMessagePF2e.create(messageData, { rollMode })
        }

        Hooks.callAll(`pf2e.damageRoll`, roll)
        if (callback) callback(roll)

        return roll
    }
}

export async function augmentInlineDamageRoll(baseFormula, args) {
    const DamageRoll = getDamageRollClass()
    const { name, actor, item, traits, extraRollOptions } = args

    try {
        // Retrieve roll data. If there is no actor, determine a reasonable "min level" for formula display
        const rollData = item?.getRollData() ?? actor?.getRollData() ?? {}
        rollData.actor ??= { level: (item && 'level' in item ? item.level : null) ?? 1 }

        // Extract terms from formula
        const base = extractBaseDamage(new DamageRoll(baseFormula, rollData))

        const domains = R.compact([
            'damage',
            'inline-damage',
            item ? `${item.id}-inline-damage` : null,
            item ? `${sluggify(item.slug ?? item.name)}-inline-damage` : null,
            args.domains,
        ]).flat()

        const options = new Set([
            ...(actor?.getRollOptions(domains) ?? []),
            ...(item?.getRollOptions('item') ?? []),
            ...(traits ?? []),
            ...(extraRollOptions ?? []),
        ])

        // Increase or decrease the first instance of damage by 2 or 4 if elite or weak
        const firstBase = base.at(0)
        if (firstBase && actor?.isOfType('npc') && (actor.isElite || actor.isWeak)) {
            const value = options.has('item:frequency:limited') ? 4 : 2
            firstBase.terms?.push({ dice: null, modifier: actor.isElite ? value : -value })
        }

        const { modifiers, dice } = (() => {
            if (!(actor instanceof Actor)) return { modifiers: [], dice: [] }
            return extractDamageSynthetics(actor, domains, {
                resolvables: rollData ?? {},
                test: options,
            })
        })()

        const damage = {
            base,
            modifiers,
            dice,
            ignoredResistances: [],
        }

        const isAttack = !!traits?.includes('attack')
        const context = {
            type: 'damage-roll',
            sourceType: isAttack ? 'attack' : 'save',
            outcome: isAttack ? 'success' : null, // we'll need to support other outcomes later
            domains,
            options,
            self: (() => {
                if (!actor) return null
                return {
                    actor,
                    token: actor.token,
                    item: item ? item : null,
                    statistic: null,
                    modifiers,
                }
            })(),
        }

        applyDamageDiceOverrides(base, dice)
        const { formula, breakdown } = createDamageFormula(damage)

        const roll = new DamageRoll(formula)
        const template = {
            name: name ?? item?.name ?? actor?.name ?? '',
            damage: { roll, breakdown },
            modifiers: [...modifiers, ...dice],
            traits: traits?.filter(t => t in CONFIG.PF2E.actionTraits) ?? [],
            notes: [],
            materials: [],
        }

        return { template, context }
    } catch (ex) {
        console.error(`Failed to parse inline @Damage ${baseFormula}:`, ex)
        return null
    }
}

function createDamageFormula(damage, degree = DEGREE_OF_SUCCESS.SUCCESS) {
    damage = deepClone(damage)

    // Handle critical failure not dealing damage, and splash still applying on a failure
    // These are still couched on weapon/melee assumptions. They'll need to be adjusted later
    if (degree === DEGREE_OF_SUCCESS.CRITICAL_FAILURE) {
        return null
    } else if (degree === DEGREE_OF_SUCCESS.FAILURE) {
        damage.dice = damage.dice.filter(d => d.category === 'splash')
        damage.modifiers = damage.modifiers.filter(m => m.damageCategory === 'splash')
    }

    const critical = degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS
    if (!damage.base.length) {
        return null
    }

    // Group dice by damage type
    const typeMap = new Map()
    for (const baseEntry of damage.base) {
        const list = typeMap.get(baseEntry.damageType) ?? []
        typeMap.set(baseEntry.damageType, list)

        if (baseEntry.terms) {
            list.push(...baseEntry.terms.map(t => ({ ...baseEntry, ...t, label: null, critical: null })))
        } else if ((baseEntry.diceNumber && baseEntry.dieSize) || baseEntry.modifier) {
            const { diceNumber, dieSize, damageType } = baseEntry
            const modifier = baseEntry.modifier ?? 0
            const label = (() => {
                const diceSection = diceNumber ? `${diceNumber}${dieSize}` : null
                if (!diceSection) return String(modifier)

                const displayedModifier = modifier ? Math.abs(modifier) : null
                const operator = modifier < 0 ? ' - ' : ' + '
                return [diceSection, displayedModifier].filter(p => p !== null).join(operator)
            })()

            list.push({
                label,
                dice: diceNumber && dieSize ? { number: diceNumber, faces: Number(dieSize.replace('d', '')) } : null,
                modifier,
                critical: null,
                damageType,
                category: baseEntry.category,
                materials: baseEntry.materials ?? [],
            })
        }
    }

    // Sometimes a weapon may add base damage as bonus modifiers or dice. We need to auto-generate these
    const BONUS_BASE_LABELS = ['PF2E.ConditionTypePersistent'].map(l => game.i18n.localize(l))

    // Test that a damage modifier or dice partial is compatible with the prior check result
    const outcomeMatches = m => critical || m.critical !== true

    // Add damage dice. Dice always stack
    for (const dice of damage.dice.filter(d => d.enabled && outcomeMatches(d))) {
        const matchingBase = damage.base.find(b => b.damageType === dice.damageType) ?? damage.base[0]
        const baseDieSize = Number(matchingBase.dieSize?.replace('d', '')) || matchingBase.terms?.[0].dice?.faces
        const faces = Number(dice.dieSize?.replace('d', '')) || baseDieSize || null
        const damageType = dice.damageType ?? matchingBase.damageType
        if (dice.diceNumber > 0 && faces) {
            const list = typeMap.get(damageType) ?? []
            list.push({
                label: BONUS_BASE_LABELS.includes(dice.label) ? null : `${dice.label} +${dice.diceNumber}d${faces}`,
                dice: { number: dice.diceNumber, faces },
                modifier: 0,
                damageType,
                category: dice.category,
                critical: dice.critical,
            })
            typeMap.set(damageType, list)
        }
    }

    // Add modifiers
    for (const modifier of damage.modifiers.filter(m => m.enabled && outcomeMatches(m))) {
        const matchingBase = damage.base.find(b => b.damageType === modifier.damageType) ?? damage.base[0]
        const damageType = modifier.damageType ?? matchingBase.damageType

        const list = typeMap.get(damageType) ?? []
        list.push({
            label: BONUS_BASE_LABELS.includes(modifier.label) ? null : `${modifier.label} ${addSign(modifier.value)}`,
            dice: null,
            modifier: modifier.value,
            damageType,
            category: modifier.damageCategory,
            critical: modifier.critical,
        })
        typeMap.set(damageType, list)
    }

    const instances = [
        instancesFromTypeMap(typeMap, { degree }),
        instancesFromTypeMap(typeMap, { degree, persistent: true }),
    ].flat()

    const commaSeparated = instances.map(i => i.formula).join(',')
    const breakdown = instances.flatMap(i => i.breakdown)
    return { formula: `{${commaSeparated}}`, breakdown }
}

function instancesFromTypeMap(typeMap, { degree, persistent = false }) {
    return Array.from(typeMap.entries()).flatMap(([damageType, typePartials]) => {
        // Filter persistent (or filter out) based on persistent option
        const partials = typePartials.filter(p => (p.category === 'persistent') === persistent)
        if (partials.length === 0) return []

        // Split into categories, which must be processed in a specific order
        const groups = groupBy(partials, partial => partial.category)

        const nonCriticalDamage = (() => {
            const criticalInclusion =
                degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS
                    ? [CRITICAL_INCLUSION.DOUBLE_ON_CRIT]
                    : [CRITICAL_INCLUSION.DOUBLE_ON_CRIT, CRITICAL_INCLUSION.DONT_DOUBLE_ON_CRIT]

            // Whether to double the dice of these partials
            const doubleDice =
                degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS &&
                criticalInclusion.includes(null) &&
                game.settings.get('pf2e', 'critRule') === 'doubledice'

            // If dice doubling is enabled, any doubling of dice or constants is handled by `createPartialFormulas`
            const double = degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS && !doubleDice
            return sumExpression(createPartialFormulas(groups, { criticalInclusion, doubleDice }), { double })
        })()

        const criticalDamage = (() => {
            if (degree !== DEGREE_OF_SUCCESS.CRITICAL_SUCCESS) return null
            const criticalInclusion = [CRITICAL_INCLUSION.CRITICAL_ONLY, CRITICAL_INCLUSION.DONT_DOUBLE_ON_CRIT]
            return sumExpression(createPartialFormulas(groups, { criticalInclusion }))
        })()

        // Build final damage, and exit early if its 0 persistent dammage
        const summedDamage = sumExpression(degree ? [nonCriticalDamage, criticalDamage] : [nonCriticalDamage])
        const enclosed = ensureValidFormulaHead(summedDamage) || '0'
        if (enclosed === '0' && persistent) return []

        const flavor = (() => {
            const typeFlavor = damageType === 'untyped' && !persistent ? [] : [damageType]
            const persistentFlavor = persistent ? ['persistent'] : []
            const materialFlavor = typePartials.flatMap(p => p.materials ?? [])
            const allFlavor = [typeFlavor, persistentFlavor, materialFlavor].flat().join(',')
            return allFlavor.length > 0 ? `[${allFlavor}]` : ''
        })()

        const breakdown = (() => {
            const categories = [null, 'persistent', 'precision', 'splash']
            const flattenedDamage = categories.flatMap(c => {
                const partials = groups.get(c) ?? []
                const breakdownDamage = partials.filter(e => e.label !== null)

                // Null labels are assumed to be base damage. Combine them and create a single breakdown component
                const leadingTerms = partials.filter(
                    p => p.label === null && (p.modifier || p.dice?.number || partials.every(pp => pp.label === null))
                )
                if (leadingTerms.length) {
                    const append = c === 'splash' ? ` ${game.i18n.localize('PF2E.Damage.RollFlavor.splash')}` : ''
                    const label = createSimpleFormula(leadingTerms) + append
                    breakdownDamage.unshift({ ...leadingTerms[0], label })
                }

                return breakdownDamage
            })
            const breakdownDamage = flattenedDamage.filter(d => d.critical !== true)
            if (degree === DEGREE_OF_SUCCESS.CRITICAL_SUCCESS) {
                breakdownDamage.push(...flattenedDamage.filter(d => d.critical === true))
            }

            if (!breakdownDamage.length) return []

            // Gather label values and assign a damage type string to the first label in the list
            const damageTypeLabel =
                breakdownDamage[0].category === 'persistent'
                    ? game.i18n.format('PF2E.Damage.PersistentTooltip', {
                          damageType: game.i18n.localize(CONFIG.PF2E.damageTypes[damageType] ?? damageType),
                      })
                    : game.i18n.localize(CONFIG.PF2E.damageTypes[damageType] ?? damageType)
            const labelParts = breakdownDamage.map(d => d.label)
            labelParts[0] = `${labelParts[0].replace(/^\s+\+/, '')} ${damageTypeLabel}`

            return labelParts
        })()

        const formula = enclosed && flavor ? `${enclosed}${flavor}` : enclosed
        return formula ? { formula, breakdown } : []
    })
}

function createSimpleFormula(terms, { doubleDice } = {}) {
    terms = combinePartialTerms(terms)
    const constant = terms.find(t => !!t.modifier)?.modifier ?? 0
    const positiveDice = terms.filter(t => !!t.dice && t.dice.number > 0)

    const diceTerms = positiveDice.map(term => {
        const number = doubleDice ? term.dice.number * 2 : term.dice.number
        const faces = term.dice.faces
        return doubleDice ? `(${number}d${faces}[doubled])` : `${number}d${faces}`
    })

    // Create the final term. Double the modifier here if dice doubling is enabled
    const result = [diceTerms.join(' + '), Math.abs(constant)]
        .filter(e => !!e)
        .map(e => (typeof e === 'number' && doubleDice ? `2 * ${e}` : e))
        .join(constant > 0 ? ' + ' : ' - ')
    return result || '0' // Empty string is an invalid formula
}

function combinePartialTerms(terms) {
    const modifier = terms.reduce((total, p) => total + p.modifier, 0)
    const constantTerm = modifier ? { dice: null, modifier } : null

    // Group dice by number of faces
    const dice = terms.filter(p => !!p.dice && p.dice.number > 0).sort(sortBy(t => -t.dice.faces))

    const byFace = [...groupBy(dice, t => t.dice.faces).values()]
    const combinedDice = byFace.map(terms => ({
        modifier: 0,
        dice: { ...terms[0].dice, number: sum(terms.map(d => d.dice.number)) },
    }))

    const combined = R.compact([...combinedDice, constantTerm])
    return combined.length ? combined : [{ dice: null, modifier: 0 }]
}

function ensureValidFormulaHead(formula) {
    if (!formula) return null
    const isWrapped = /^\(.*\)$/.test(formula)
    const isSimple = /^\d+(d\d+)?$/.test(formula)
    return isWrapped || isSimple ? formula : `(${formula})`
}

function createPartialFormulas(partials, { criticalInclusion, doubleDice = false }) {
    const categories = [null, 'persistent', 'precision', 'splash']
    return categories.flatMap(category => {
        const requestedPartials = (partials.get(category) ?? []).filter(p => criticalInclusion.includes(p.critical))
        const term = (() => {
            const expression = createSimpleFormula(requestedPartials, { doubleDice })
            if (expression === '0') {
                return ''
            }
            return ['precision', 'splash'].includes(category ?? '') && hasOperators(expression) ? `(${expression})` : expression
        })()
        const flavored = term && category && category !== 'persistent' ? `${term}[${category}]` : term
        return flavored || []
    })
}

function sumExpression(terms, { double = false } = {}) {
    if (terms.every(t => !t)) return null

    const summed = terms.filter(p => !!p).join(' + ') || null
    const enclosed = double && hasOperators(summed) ? `(${summed})` : summed

    return double ? `2 * ${enclosed}` : enclosed
}

function hasOperators(formula) {
    return /[-+*/]/.test(formula ?? '')
}

function extractBaseDamage(roll) {
    /** Internal function to recursively extract terms from a parsed DamageInstance's head term */
    function recursiveExtractTerms(expression, { category = null } = {}) {
        // If this expression introduces a category, override it when recursing
        category = setHasElement(DAMAGE_CATEGORIES_UNIQUE, expression.options.flavor) ? expression.options.flavor : category

        // Recurse trivially for groupings
        if (isInstanceOf(expression, 'Grouping')) {
            return recursiveExtractTerms(expression.term, { category })
        }

        // Handle Die and Intermediate Die terms
        if (isInstanceOf(expression, 'Die')) {
            return [{ dice: R.pick(expression, ['number', 'faces']), modifier: 0, category }]
        } else if (isInstanceOf(expression, 'IntermediateDie')) {
            if (typeof expression.number !== 'number' || typeof expression.faces !== 'number') {
                throw ErrorPF2e('Unable to parse DamageRoll with non-deterministic intermediate expressions.')
            }
            return [{ dice: { number: expression.number, faces: expression.faces }, modifier: 0, category }]
        }

        // Resolve deterministic expressions and terms normally, everything is allowed
        // This handles NumericTerm, and ArithmeticTerm and MathTerm that don't have dice
        if (expression.isDeterministic) {
            return [{ dice: null, modifier: getDamageInstanceClass().getValue(expression, 'expected'), category }]
        }

        // Non-deterministic ArithmeticExpression
        if (isInstanceOf(expression, 'ArithmeticExpression')) {
            const operator = expression.operator
            if (operator === '*' || operator === '/') {
                throw ErrorPF2e(`Cannot use ${operator} on non-deterministic artithmetic terms`)
            }

            const leftTerms = recursiveExtractTerms(expression.operands[0], { category })
            const rightTerms = recursiveExtractTerms(expression.operands[1], { category })

            // Flip right side terms if subtraction
            if (operator === '-') {
                for (const term of rightTerms) {
                    if (term.dice) term.dice.number *= -1
                    term.modifier *= -1
                }
            }

            const groups = R.groupBy([...leftTerms, ...rightTerms], t => t.category ?? '')
            return Object.values(groups).flatMap(terms => {
                const category = terms[0].category
                return combinePartialTerms(terms).map(t => ({ ...t, category }))
            })
        }

        // At this point its an error, but we need to report what type it is
        if (!expression.isDeterministic) {
            throw ErrorPF2e(`Unable to parse DamageRoll with non-deterministic ${expression.constructor.name}.`)
        }
        throw ErrorPF2e('Unrecognized roll term type ' + expression.constructor.name)
    }

    return roll.instances.flatMap(instance => {
        const category = setHasElement(DAMAGE_CATEGORIES_UNIQUE, instance.category) ? instance.category : null
        const terms = recursiveExtractTerms(instance.head, { category })
        return Object.values(R.groupBy(terms, t => t.category ?? '')).map(terms => {
            const category = instance.persistent ? 'persistent' : terms[0].category
            return { damageType: instance.type, category, terms: terms.map(t => R.omit(t, ['category'])) }
        })
    })
}

function applyDamageDiceOverrides(base, dice) {
    const overrideDice = dice.filter(d => !d.ignored && !!d.override)

    if (!overrideDice.length) return

    for (const data of base) {
        for (const adjustment of overrideDice) {
            const die = data.terms?.find(t => !!t.dice)
            if (!die || (adjustment.damageType && adjustment.damageType !== data.damageType)) {
                continue
            }

            die.dice.number = adjustment.override.diceNumber ?? die.dice.number
            if (adjustment.override.dieSize) {
                const faces = Number(/\d{1,2}/.exec(adjustment.override.dieSize)?.shift())
                if (Number.isInteger(faces)) die.dice.faces = faces
            } else if (adjustment.override.upgrade || adjustment.override.downgrade) {
                // die size increases are once-only for weapons, but has no such limit for non-weapons
                const direction = adjustment.override.upgrade ? 1 : -1
                die.dice.faces = FACES[FACES.indexOf(die.dice.faces) + direction] ?? die.dice.faces
            }
        }
    }
}

function extractDamageSynthetics(actor, selectors, options) {
    const extractedModifiers = extractModifiers(actor.synthetics, selectors, options)
    const dice = extractDamageDice(actor.synthetics.damageDice, selectors, options)

    const groupedModifiers = R.groupBy([options.extraModifiers ?? [], extractedModifiers].flat(), m =>
        m.category === 'persistent' ? 'persistent' : 'main'
    )

    const modifiers = [
        ...new game.pf2e.StatisticModifier('damage', groupedModifiers.main ?? [], options.test).modifiers,
        ...new game.pf2e.StatisticModifier('persistent', groupedModifiers.persistent ?? [], options.test).modifiers,
    ]

    return { modifiers, dice }
}

function extractDamageDice(deferredDice, selectors, options) {
    return selectors.flatMap(s => deferredDice[s] ?? []).flatMap(d => d(options) ?? [])
}

function extractModifiers(synthetics, selectors, options = {}) {
    const { modifierAdjustments, modifiers: syntheticModifiers } = synthetics
    const modifiers = Array.from(new Set(selectors))
        .flatMap(s => syntheticModifiers[s] ?? [])
        .flatMap(d => d(options) ?? [])
    for (const modifier of modifiers) {
        modifier.adjustments = extractModifierAdjustments(modifierAdjustments, selectors, modifier.slug)
    }

    return modifiers
}

function extractModifierAdjustments(adjustmentsRecord, selectors, slug) {
    const adjustments = Array.from(new Set(selectors.flatMap(s => adjustmentsRecord[s] ?? [])))
    return adjustments.filter(a => [slug, null].includes(a.slug))
}

function createActionRangeLabel(range) {
    if (!range?.max) return null
    const [key, value] = range.increment
        ? ['PF2E.Action.Range.IncrementN', range.increment]
        : ['PF2E.Action.Range.MaxN', range.max]

    return game.i18n.format(key, { n: value })
}

function extractNotes(rollNotes, selectors) {
    return selectors.flatMap(s => (rollNotes[s] ?? []).map(n => n.clone()))
}
