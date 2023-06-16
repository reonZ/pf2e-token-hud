import { getSetting, MODULE_ID } from '../module.js'
import { showItemSummary } from '../popup.js'
import { addNameTooltipListeners, filterIn, getItemFromEvent } from '../shared.js'

export async function getSpellsData(actor, token, filter) {
    const focusPool = actor.system.resources.focus ?? { value: 0, max: 0 }
    const entries = actor.spellcasting.regular
    const showTradition = getSetting('tradition')
    const spells = []
    const focuses = []
    let hasFocusCantrips = false

    for (const entry of entries) {
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
    }

    if (spells.length) {
        const sort = getSetting('spells')
            ? (a, b) => (a.order === b.order ? a.name.localeCompare(b.name) : a.order - b.order)
            : (a, b) => a.name.localeCompare(b.name)
        spells.forEach(entry => entry.sort(sort))
    }

    if (focuses.length) {
        focuses.sort((a, b) => a.name.localeCompare(b.name))
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

    if (spells.length || rituals?.length)
        return {
            contentData: {
                spells,
                rituals,
                focusPool,
                hasFocusCantrips,
            },
            doubled: getSetting('spells-columns'),
        }
}

export function addSpellsListeners(el, actor) {
    addNameTooltipListeners(el.find('.spell'))

    el.find('[data-action=spell-description]').on('click', async event => {
        event.preventDefault()
        const spell = $(event.currentTarget).closest('.spell')
        showItemSummary(spell, actor)
    })

    // IS OWNER
    if (!actor.isOwner) return

    el.find('[data-action=spell-chat]').on('click', async event => {
        const item = getItemFromEvent(event, actor)
        item?.toMessage(event, { create: true })
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
    })

    el.find('[data-input-path]').on('change', async event => {
        const { inputPath, entryId } = $(event.currentTarget).data()
        const value = event.currentTarget.valueAsNumber
        await actor.updateEmbeddedDocuments('Item', [{ _id: entryId, [inputPath]: value }])
    })
}
