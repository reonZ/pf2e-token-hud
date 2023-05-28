import { getSetting, MODULE_ID } from './module.js'
import { popup, getItemSummary } from './popup.js'

export async function getSpellsData(actor) {
    const focusPool = actor.system.resources.focus?.value ?? 0
    const entries = actor.spellcasting.regular
    const spells = []

    for (const entry of entries) {
        const entryId = entry.id
        const data = await entry.getSheetData()
        const isCharge = entry.system?.prepared?.value === 'charge'
        const isStaff = getProperty(entry, 'flags.pf2e-staves.staveID') !== undefined
        const charges = { value: getProperty(entry, 'flags.pf2e-staves.charges') ?? 0 }

        for (const slot of data.levels) {
            if (!slot.active.length || slot.uses?.max === 0) continue

            const slotSpells = []
            const actives = slot.active.filter(x => x && x.uses?.max !== 0)

            for (let slotId = 0; slotId < actives.length; slotId++) {
                const { spell, expended, virtual, uses, castLevel } = actives[slotId]

                slotSpells.push({
                    name: spell.name,
                    img: spell.img,
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
                    isVirtual: virtual,
                    isInnate: data.isInnate,
                    isCantrip: slot.isCantrip,
                    isFocus: data.isFocusPool,
                    isPrepared: data.isPrepared,
                    isSpontaneous: data.isSpontaneous || data.isFlexible,
                    slotLevel: slot.level,
                    uses: uses ?? (isCharge ? charges : slot.uses),
                    expended: expended ?? (data.isFocusPool ? focusPool <= 0 : false),
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
                        : data.isFocusPool
                        ? 'PF2E.SpellFocusLabel'
                        : 'PF2E.SpellPreparedLabel',
                    order: isCharge
                        ? 0
                        : data.isPrepared
                        ? 1
                        : data.isFocusPool
                        ? 2
                        : data.isInnate
                        ? 3
                        : data.isSpontaneous
                        ? 4
                        : 5,
                })
            }

            if (slotSpells.length) {
                spells[slot.level] ??= []
                spells[slot.level].push(...slotSpells)
            }
        }
    }

    if (spells.length) {
        const sort = getSetting('order')
            ? (a, b) => (a.order === b.order ? a.name.localeCompare(b.name) : a.order - b.order)
            : (a, b) => a.name.localeCompare(b.name)
        spells.forEach(entry => entry.sort(sort))
    }

    const ritualData = await actor.spellcasting.ritual?.getSheetData()
    const rituals = ritualData?.levels.flatMap((slot, slotId) =>
        slot.active.map(({ spell }) => ({
            name: spell.name,
            img: spell.img,
            slotId,
            itemId: spell.id,
            level: spell.level,
            time: spell.system.time.value,
        }))
    )

    if (spells.length || rituals?.length) return { spells, rituals }
}

export function addSpellsListeners(el, actor) {
    el.find('[data-action=toggle-pips]').on('click contextmenu', event => {
        event.preventDefault()
        const change = event.type === 'click' ? 1 : -1
        const points = (actor.system.resources.focus?.value ?? 0) + change
        actor.update({ 'system.resources.focus.value': points })
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
    })

    el.find('[data-action=show-description]').on('click', async event => {
        event.preventDefault()
        const spell = $(event.currentTarget).closest('.spell')
        const description = await getItemSummary(spell, actor)
        if (description) popup(spell.find('.name').html().trim(), description)
    })

    el.find('[data-input-path]').on('change', async event => {
        const { inputPath, entryId } = $(event.currentTarget).data()
        const value = event.currentTarget.valueAsNumber
        await actor.updateEmbeddedDocuments('Item', [{ _id: entryId, [inputPath]: value }])
    })
}
