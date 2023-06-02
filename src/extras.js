import { getSkillLabel, SKILLS_SLUGS } from './skills.js'

export async function getExtrasData(actor) {
    const { attributes } = actor
    const { initiative } = attributes

    return {
        initiative: {
            selected: initiative.statistic,
            skills: SKILLS_SLUGS.map(slug => ({ slug, label: getSkillLabel(slug) })),
        },
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
}
