import { getSetting, localize, modifier, MODULE_ID, templatePath } from '../module.js'
import { ordinalString } from '../pf2e/misc.js'
import { eventToRollParams } from '../pf2e/scripts.js'
import { showItemSummary } from '../popup.js'
import { addNameTooltipListeners, filterIn, getItemFromEvent, localeCompare } from '../shared.js'

export async function getSpellsData({ actor, filter }) {
    const focusPool = actor.system.resources.focus ?? { value: 0, max: 0 }
    const entries = actor.spellcasting.regular
    const showTradition = getSetting('tradition')
    const stavesActive = game.modules.get('pf2e-staves')?.active
    const spells = []
    const focuses = []
    let hasFocusCantrips = false

    await Promise.all(
        entries.map(async entry => {
            const entryId = entry.id
            const tradition = showTradition && entry.statistic.label[0]
            const data = await entry.getSheetData()
            const isFocus = data.isFocusPool
            const isCharge = entry.system?.prepared?.value === 'charge'
            const isStaff = getProperty(entry, 'flags.pf2e-staves.staveID') !== undefined
            const charges = { value: getProperty(entry, 'flags.pf2e-staves.charges') ?? 0 }

            for (const slot of data.levels) {
                if (!slot.active.length || slot.uses?.max === 0) continue

                const slotSpells = []
                const isCantrip = slot.isCantrip
                const actives = slot.active.filter(x => x && x.uses?.max !== 0)

                for (let slotId = 0; slotId < actives.length; slotId++) {
                    const { spell, expended, virtual, uses, castLevel } = actives[slotId]
                    if (!filterIn(spell.name, filter)) continue

                    slotSpells.push({
                        name: spell.name,
                        img: spell.img,
                        tradition,
                        castLevel: castLevel ?? spell.level,
                        slotId,
                        entryId,
                        itemId: spell.id,
                        inputId: data.isInnate ? spell.id : data.id,
                        inputPath: isCharge
                            ? 'flags.pf2e-staves.charges'
                            : data.isInnate
                            ? 'system.location.uses.value'
                            : `system.slots.slot${slot.level}.value`,
                        isCharge,
                        isActiveCharge: isCharge && stavesActive,
                        isVirtual: virtual,
                        isInnate: data.isInnate,
                        isCantrip: isCantrip,
                        isFocus,
                        isPrepared: data.isPrepared,
                        isSpontaneous: data.isSpontaneous || data.isFlexible,
                        slotLevel: slot.level,
                        uses: uses ?? (isCharge ? charges : slot.uses),
                        expended: expended ?? (isFocus && !isCantrip ? focusPool.value <= 0 : false),
                        action: spell.system.time.value,
                        type: isCharge
                            ? isStaff
                                ? `${MODULE_ID}.spells.staff`
                                : `${MODULE_ID}.spells.charges`
                            : data.isInnate
                            ? 'PF2E.PreparationTypeInnate'
                            : data.isSpontaneous
                            ? 'PF2E.PreparationTypeSpontaneous'
                            : data.isFlexible
                            ? 'PF2E.SpellFlexibleLabel'
                            : isFocus
                            ? 'PF2E.SpellFocusLabel'
                            : 'PF2E.SpellPreparedLabel',
                        order: isCharge ? 0 : data.isPrepared ? 1 : isFocus ? 2 : data.isInnate ? 3 : data.isSpontaneous ? 4 : 5,
                    })
                }

                if (slotSpells.length) {
                    if (isFocus) {
                        if (isCantrip) hasFocusCantrips = true
                        else {
                            focuses.push(...slotSpells)
                            continue
                        }
                    }

                    spells[slot.level] ??= []
                    spells[slot.level].push(...slotSpells)
                }
            }
        })
    )

    if (spells.length) {
        const sortingSetting = getSetting('spells-sort')
        const sort =
            sortingSetting === 'type'
                ? (a, b) => (a.order === b.order ? localeCompare(a.name, b.name) : a.order - b.order)
                : sortingSetting === 'entry'
                ? (a, b) => {
                      const compareEntries = localeCompare(a.entryId, b.entryId)
                      if (compareEntries !== 0) return compareEntries
                      return localeCompare(a.name, b.name)
                  }
                : (a, b) => localeCompare(a.name, b.name)
        spells.forEach(entry => entry.sort(sort))
    }

    if (focuses.length) {
        focuses.sort((a, b) => localeCompare(a.name, b.name))
        spells[12] = focuses
        hasFocusCantrips = false
    }

    const ritualData = await actor.spellcasting.ritual?.getSheetData()
    const rituals = ritualData?.levels.flatMap((slot, slotId) =>
        slot.active
            .map(({ spell }) => {
                if (!filterIn(spell.name, filter)) return
                return {
                    name: spell.name,
                    img: spell.img,
                    slotId,
                    itemId: spell.id,
                    level: spell.level,
                    time: spell.system.time.value,
                }
            })
            .filter(Boolean)
    )

    if (spells.length || rituals?.length) {
        const attacks = getSpellAttacks(actor)

        const nb = spells.length + Number((rituals?.length ?? 0) > 0)
        return {
            contentData: {
                spells,
                rituals,
                focusPool,
                stavesActive,
                hasFocusCantrips,
                attackMod: hasSingleSpellAttack(attacks) ? attacks[0].mod : null,
                entryRank: rank => game.i18n.format('PF2E.Item.Spell.Rank.Ordinal', { rank: ordinalString(rank) }),
            },
            doubled: nb > 1 && getSetting('spells-columns'),
        }
    }
}

function getSpellAttacks(actor) {
    return actor.spellcasting
        .filter(entry => entry.statistic)
        .map(({ statistic, name, id }) => ({ name, id, mod: modifier(statistic.mod), statistic }))
}

function hasSingleSpellAttack(attacks) {
    return new Set(attacks.map(({ mod }) => mod)).size === 1
}

export function addSpellsListeners({ el, actor, hud }) {
    addNameTooltipListeners(el.find('.spell'))

    el.find('[data-action=spell-description]').on('click', async event => {
        event.preventDefault()
        const spell = $(event.currentTarget).closest('.spell')
        showItemSummary(spell, actor)
    })

    // IS OWNER
    if (!actor.isOwner) return

    el.find('[data-action=spell-attack]').on('click', async event => {
        event.preventDefault()

        const attacks = getSpellAttacks(actor)
        if (!attacks.length) return

        let statistic
        if (!hasSingleSpellAttack(attacks)) {
            const id = await Dialog.wait({
                buttons: {
                    ok: {
                        icon: '<i class="fa-solid fa-dice-d20"></i>',
                        label: localize('spells.attacks.ok'),
                        callback: html => html.find('input:checked').val(),
                    },
                },
                title: localize('spells.attacks.title'),
                content: await renderTemplate(templatePath('dialogs/spell-attacks'), { attacks }),
                close: () => null,
            })

            if (id) statistic = actor.items.get(id)?.statistic
        } else {
            statistic = attacks[0].statistic
        }

        const rollParams = eventToRollParams(event)
        const { map } = event.currentTarget.dataset
        if (map) {
            rollParams.modifiers = [new game.pf2e.Modifier({ label: 'PF2E.MultipleAttackPenalty', modifier: Number(map) })]
        }

        statistic?.check.roll(rollParams)
    })

    el.find('[data-action=spell-chat]').on('click', async event => {
        event.preventDefault()

        const item = getItemFromEvent(event, actor)
        if (!item) return

        item.toMessage(event, { create: true })
        if (getSetting('chat-close')) hud.close()
    })

    el.find('[data-action=toggle-pips]').on('click contextmenu', async event => {
        event.preventDefault()
        const change = event.type === 'click' ? 1 : -1
        const points = (actor.system.resources.focus?.value ?? 0) + change
        await actor.update({ 'system.resources.focus.value': points })
    })

    el.find('[data-action=toggle-prepared]').on('click', event => {
        event.preventDefault()
        const { slotLevel, slotId, entryId, expended } = $(event.currentTarget).closest('.spell').data()
        const collection = actor.spellcasting.collections.get(entryId)
        collection?.setSlotExpendedState(slotLevel ?? 0, slotId ?? 0, expended !== true)
    })

    el.find('[data-action=cast-spell]').on('click', event => {
        event.preventDefault()

        const { slotLevel, slotId, entryId, itemId } = $(event.currentTarget).closest('.spell').data()
        const collection = actor.spellcasting.collections.get(entryId, { strict: true })
        if (!collection) return

        const spell = collection.get(itemId, { strict: true })
        if (!spell) return

        collection.entry.cast(spell, { slot: slotId, level: slotLevel })
        if (getSetting('cast-close')) hud.close()
    })

    el.find('[data-input-path]').on('change', async event => {
        const { inputPath, entryId } = $(event.currentTarget).data()
        const value = event.currentTarget.valueAsNumber
        await actor.updateEmbeddedDocuments('Item', [{ _id: entryId, [inputPath]: value }])
    })
}
