import { localize, modifier, MODULE_ID } from '../module.js'

const SKILLS = ['arcana', 'crafting', 'medicine', 'nature', 'occultism', 'religion', 'society']

export async function rollRecallKnowledges(actor) {
    const skills = SKILLS.map(slug => actor.skills[slug])
    const lores = Object.values(actor.skills).filter(skill => skill.lore)
    const roll = await new Roll('1d20').evaluate({ async: true })
    const result = roll.total
    const die = roll.dice[0].total

    let flavor = `<div class="${MODULE_ID} chat">`

    flavor += chatHeader(result, die)

    flavor += `<div class="rk">`
    flavor += `<strong>${game.i18n.localize('PF2E.RecallKnowledge.Skill')}</strong>`
    flavor += `<strong>${game.i18n.localize('PF2E.ProficiencyLabel')}</strong>`
    flavor += `<strong>${game.i18n.localize('PF2E.ModifierTitle')}</strong>`
    flavor += `<strong>${localize('actions.recall-knowledge.result')}</strong>`
    for (const { label, rank, mod } of [...skills, ...lores]) {
        flavor += `<span>${label}</span>`
        flavor += `<span class="rank ${rank}">${game.i18n.localize(`PF2E.ProficiencyLevel${rank}`)}</span>`
        flavor += `<span>${modifier(mod)}</span>`
        flavor += `<span class="result ${die}">${result + mod}</span>`
    }
    flavor += '</div>'

    flavor += '</div>'

    ChatMessage.create({
        flavor,
        speaker: ChatMessage.getSpeaker({ actor }),
        rollMode: CONST.DICE_ROLL_MODES.BLIND,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    })
}

function chatHeader(result, die) {
    let content = `<h4 class="action">
    <span class="pf2-icon larger">A</span>
    <strong>${game.i18n.localize('PF2E.RecallKnowledge.Label')}</strong>
    <p class="compact-text">(${game.i18n.localize('PF2E.Roll.Roll')}: <span class="result ${die}">${result}</span>)</p>
</h4>`

    content += `<div class="tags">
    <span class="tag" data-slug="concentrate" data-description="PF2E.TraitDescriptionConcentrate">
        ${game.i18n.localize('PF2E.TraitConcentrate')}
    </span>
    <span class="tag" data-slug="secret" data-description="PF2E.TraitDescriptionSecret">
        ${game.i18n.localize('PF2E.TraitSecret')}
    </span>
</div>`

    content += '<hr>'

    return content
}
