export function getDamageRollClass() {
    return CONFIG.Dice.rolls.find(R => R.name === 'DamageRoll')
}

export function getChatMessageClass() {
    return CONFIG.ChatMessage.documentClass
}

export function getMeasuredTemplateDocumentClass() {
    return CONFIG.MeasuredTemplate.documentClass
}

export function getMeasuredTemplateObjectClass() {
    return CONFIG.MeasuredTemplate.objectClass
}
