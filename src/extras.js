import { createVariantDialog, getSkillLabel, SKILLS_SLUGS } from './skills.js'

export async function getExtrasData(actor) {
    const { attributes } = actor
    const { initiative } = attributes

    return {
        initiative: {
            selected: initiative.statistic,
            skills: SKILLS_SLUGS.map(slug => ({ slug, label: getSkillLabel(slug) })),
        },
        hasDailies: game.modules.get('pf2e-dailies').active,
    }
}

export function addExtrasListeners(el, actor) {
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
        if (dailies.active) dailies.api.openDailiesInterface(actor)
    })

    action('rest-for-the-night', event => {
        game.pf2e.actions.restForTheNight({ actors: [actor] })
    })

    action(
        'roll-aid',
        async event => {
            const statistic = await createVariantDialog()
            const note = { text: '@UUID[Compendium.pf2e.other-effects.AHMUpMbaVkZ5A1KX]' }
            if (statistic !== null) game.pf2e.actions.get('aid').use({ event, actors: [actor], statistic, notes: [note] })
        },
        'click contextmenu'
    )

    action(
        'roll-escape',
        async event => {
            const statistic = event.type === 'contextmenu' ? await createVariantDialog() : undefined
            if (statistic !== null) game.pf2e.actions.get('escape').use({ event, actors: [actor], statistic })
        },
        'click contextmenu'
    )
}
