import { rollRecallKnowledges } from '../actions/recall-knowledge.js'
import { localize } from '../module.js'
import { unownedItemToMessage } from '../pf2e/item.js'
import { showItemSummary } from '../popup.js'
import { addNameTooltipListeners, deleteMacro, filterIn, getMacros, onDroppedMacro } from '../shared.js'
import { createVariantDialog, getSkillLabel, SKILLS_SLUGS } from './skills.js'

export const extrasUUIDS = {
    aid: 'Compendium.pf2e.actionspf2e.Item.HCl3pzVefiv9ZKQW',
    escape: 'Compendium.pf2e.actionspf2e.Item.SkZAQRkLLkmBQNB9',
    'recall-knowledge': 'Compendium.pf2e.actionspf2e.Item.1OagaWtBpVXExToo',
}

export async function getExtrasData(actor, token, filter) {
    const { attributes } = actor
    const { initiative } = attributes

    return {
        contentData: {
            noMacro: localize('extras.no-macro'),
            macros: getMacros(actor)?.filter(macro => filterIn(macro.name, filter)),
            initiative: initiative && {
                selected: initiative.statistic,
                skills: SKILLS_SLUGS.map(slug => ({ slug, label: getSkillLabel(slug) })),
            },
            hasDailies: game.modules.get('pf2e-dailies')?.active,
            uuids: extrasUUIDS,
        },
    }
}

export function addExtrasListeners(el, actor, token) {
    function action(action, callback, type = 'click') {
        el.find(`[data-action=${action}]`).on(type, event => {
            event.preventDefault()
            callback(event)
        })
    }

    action('action-description', event => {
        const action = $(event.currentTarget).closest('.row')
        showItemSummary(action, actor)
    })

    // IS OWNER
    if (!actor.isOwner) return

    addNameTooltipListeners(el.find('.macro'))

    async function getMacro(event) {
        const { uuid } = event.currentTarget.closest('.macro').dataset
        return fromUuid(uuid)
    }

    action('delete-macro', event => deleteMacro(event, actor))

    action('edit-macro', async event => {
        const macro = await getMacro(event)
        macro?.sheet.render(true)
    })

    action('use-macro', async event => {
        const macro = await getMacro(event)
        macro?.execute({ actor, token })
    })

    el.on('drop', event => onDroppedMacro(event, actor))

    action('action-chat', async event => {
        const { uuid } = event.currentTarget.closest('.row').dataset
        const item = await fromUuid(uuid)
        if (item) unownedItemToMessage(event, item, actor, { create: true })
    })

    el.find('input[name], select[name]').on('change', async event => {
        const target = event.currentTarget
        const value = target.type === 'number' ? target.valueAsNumber : target.value
        await actor.update({ [target.name]: value })
    })

    action('roll-initiative', async event => {
        await actor.initiative.roll({ event })
    })

    action('prepare-dailies', event => {
        const dailies = game.modules.get('pf2e-dailies')
        if (dailies?.active) dailies.api.openDailiesInterface(actor)
    })

    action('rest-for-the-night', event => {
        game.pf2e.actions.restForTheNight({ actors: [actor] })
    })

    action('roll-recall-knowledge', event => {
        rollRecallKnowledges(actor)
    })

    action(
        'roll-aid',
        async event => {
            const variant = await createVariantDialog(null, 20)
            const note = { text: '@UUID[Compendium.pf2e.other-effects.Item.AHMUpMbaVkZ5A1KX]' }
            if (variant !== null)
                game.pf2e.actions.get('aid').use({
                    event,
                    actors: [actor],
                    statistic: variant?.selected,
                    difficultyClass: { value: variant?.dc },
                    notes: [note],
                })
        },
        'click contextmenu'
    )

    action(
        'roll-escape',
        async event => {
            const variant = event.type === 'contextmenu' ? await createVariantDialog() : undefined
            const multipleAttackPenalty = $(event.currentTarget).data().map
            if (variant === null) return
            game.pf2e.actions.get('escape').use({ event, actors: [actor], statistic: variant?.selected, multipleAttackPenalty })
        },
        'click contextmenu'
    )
}
