import { getSkillLabel, SKILLS_SLUGS } from './skills.js'

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

    el.find('[data-action=roll-initiative]').on('click', async event => {
        event.preventDefault()
        await actor.initiative.roll({ event })
    })

    el.find('[data-action=prepare-dailies]').on('click', async event => {
        event.preventDefault()
        const dailies = game.modules.get('pf2e-dailies')
        if (dailies.active) dailies.api.openDailiesInterface(actor)
    })
}
