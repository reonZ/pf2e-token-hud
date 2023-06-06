import { unownedItemToMessage } from './pf2e.js'
import { showItemSummary } from './popup.js'
import { createVariantDialog, getSkillLabel, SKILLS_SLUGS } from './skills.js'

export async function getExtrasData(actor) {
    const { attributes } = actor
    const { initiative } = attributes

    return {
        initiative: {
            selected: initiative.statistic,
            skills: SKILLS_SLUGS.map(slug => ({ slug, label: getSkillLabel(slug) })),
        },
        hasDailies: game.modules.get('pf2e-dailies')?.active,
    }
}

export function addExtrasListeners(el, actor) {
    el.find('[data-action=action-description]').on('click', event => {
        event.preventDefault()
        const action = $(event.currentTarget).closest('.row')
        showItemSummary(action, actor)
    })

    // IS OWNER
    if (!actor.isOwner) return

    el.find('[data-action=action-chat]').on('click', async event => {
        event.preventDefault()
        const { uuid } = event.currentTarget.closest('.row').dataset
        const item = await fromUuid(uuid)
        if (item) unownedItemToMessage(event, item, actor, { create: true })
    })

    el.find('input[name], select[name]').on('change', async event => {
        const target = event.currentTarget
        const value = target.type === 'number' ? target.valueAsNumber : target.value
        await actor.update({ [target.name]: value })
    })

    function action(action, callback, type = 'click') {
        el.find(`[data-action=${action}]`).on(type, event => {
            event.preventDefault()
            callback(event)
        })
    }

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

    action(
        'roll-aid',
        async event => {
            const variant = await createVariantDialog(null, 20)
            const note = { text: '@UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX]' }
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
            if (variant !== null) game.pf2e.actions.get('escape').use({ event, actors: [actor], statistic: variant?.selected })
        },
        'click contextmenu'
    )
}
