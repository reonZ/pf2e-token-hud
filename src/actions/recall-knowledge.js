import { localize, modifier, templatePath } from '../module.js'
import { calculateDegreeOfSuccess } from '../pf2e/success.js'
import { getUniqueTarget, RANKS } from '../shared.js'

const SKILLS = ['arcana', 'crafting', 'medicine', 'nature', 'occultism', 'religion', 'society']

const SUCCESS = {
    // 0: { icon: '<i class="fa-solid fa-circle-xmark"></i>', name: 'criticalFailure' },
    0: { icon: '<i class="fa-solid fa-xmark-large"></i><i class="fa-solid fa-xmark-large"></i>', name: 'criticalFailure' },
    1: { icon: '<i class="fa-solid fa-xmark-large"></i>', name: 'failure' },
    2: { icon: '<i class="fa-solid fa-check"></i>', name: 'success' },
    3: { icon: '<i class="fa-solid fa-check"></i><i class="fa-solid fa-check"></i>', name: 'criticalSuccess' },
    // 3: { icon: '<i class="fa-solid fa-circle-check"></i>', name: 'criticalSuccess' },
}

export async function rollRecallKnowledges(actor) {
    const roll = await new Roll('1d20').evaluate({ async: true })
    const result = roll.total
    const dieResult = roll.dice[0].total
    const dieSuccess = dieResult === 1 ? '0' : dieResult === 20 ? '3' : ''
    const lores = Object.values(actor.skills).filter(skill => skill.lore)
    const target = getUniqueTarget(target => target.actor?.identificationDCs)

    let data = {
        dieSuccess,
        dieResult,
        target,
        i18n: str => localize(`actions.recall-knowledge.${str}`),
    }

    if (target) {
        const { standard, skills, lore } = target.actor.identificationDCs

        let skillsDCs = standard.progression.slice()
        skillsDCs.length = 4
        skillsDCs = [...skillsDCs]

        const loresDCs = lore.map(({ progression }) => {
            let dcs = progression
            dcs.length = 6
            return [...dcs]
        })

        data.skillsDCs = skillsDCs
        data.skills = skills.map(slug => {
            const { mod, label, rank } = actor.skills[slug]
            const total = result + mod

            return {
                label,
                mod,
                rank,
                rankLabel: RANKS[rank],
                total,
                checks: skillsDCs.map(dc => {
                    if (!dc) return `-`
                    const success = calculateDegreeOfSuccess(total, dieResult, dc)
                    return {
                        success,
                        icon: SUCCESS[success].icon,
                        title: SUCCESS[success].name,
                    }
                }),
            }
        })
        data.loresDCs = loresDCs
        data.lores = lores.map(({ label, rank, mod }) => ({
            label,
            rank,
            mod,
            modifier: modifier(mod),
        }))
    } else {
        data.skills = [...SKILLS.map(slug => actor.skills[slug]), ...lores].map(({ label, rank, mod }) => ({
            label,
            rank,
            mod,
            modifier: modifier(mod),
        }))
    }

    const flavor = await renderTemplate(templatePath('chat/recall-knowledge'), data)

    ChatMessage.create({
        flavor,
        speaker: ChatMessage.getSpeaker({ actor }),
        rollMode: CONST.DICE_ROLL_MODES.BLIND,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    })
}
