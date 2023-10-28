export function getDamageRollClass() {
    return CONFIG.Dice.rolls.find(Roll => Roll.name === 'DamageRoll')
}

export function getDamageInstanceClass() {
    return CONFIG.Dice.rolls.find(Roll => Roll.name === 'DamageInstance')
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
