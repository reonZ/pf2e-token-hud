export function getDamageRollClass() {
	return CONFIG.Dice.rolls.find((Roll) => Roll.name === "DamageRoll");
}

export function getDamageInstanceClass() {
	return CONFIG.Dice.rolls.find((Roll) => Roll.name === "DamageInstance");
}
