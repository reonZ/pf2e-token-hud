const actionImgMap = {
	0: "systems/pf2e/icons/actions/FreeAction.webp",
	free: "systems/pf2e/icons/actions/FreeAction.webp",
	1: "systems/pf2e/icons/actions/OneAction.webp",
	2: "systems/pf2e/icons/actions/TwoActions.webp",
	3: "systems/pf2e/icons/actions/ThreeActions.webp",
	"1 or 2": "systems/pf2e/icons/actions/OneTwoActions.webp",
	"1 to 3": "systems/pf2e/icons/actions/OneThreeActions.webp",
	"2 or 3": "systems/pf2e/icons/actions/TwoThreeActions.webp",
	reaction: "systems/pf2e/icons/actions/Reaction.webp",
	passive: "systems/pf2e/icons/actions/Passive.webp",
};

const actionGlyphMap = {
	0: "F",
	free: "F",
	1: "A",
	2: "D",
	3: "T",
	"1 or 2": "A/D",
	"1 to 3": "A - T",
	"2 or 3": "D/T",
	reaction: "R",
};

export function getActionIcon(
	action,
	fallback = "systems/pf2e/icons/actions/Empty.webp",
) {
	if (action === null) return actionImgMap.passive;
	const value =
		typeof action !== "object"
			? action
			: action.type === "action"
			  ? action.value
			  : action.type;
	const sanitized = String(value ?? "")
		.toLowerCase()
		.trim();
	return actionImgMap[sanitized] ?? fallback;
}

export function getActionGlyph(action) {
	if (!action && action !== 0) return "";

	const value =
		typeof action !== "object"
			? action
			: action.type === "action"
			  ? action.value
			  : action.type;
	const sanitized = String(value ?? "")
		.toLowerCase()
		.trim();

	return actionGlyphMap[sanitized] ?? "";
}

export function ErrorPF2e(message) {
	return Error(`PF2e System | ${message}`);
}

export function tupleHasValue(array, value) {
	return array.includes(value);
}

export function objectHasKey(obj, key) {
	return (typeof key === "string" || typeof key === "number") && key in obj;
}

export function sluggify(text, options) {
	return game.pf2e.system.sluggify(text, options);
}

export function setHasElement(set, value) {
	return set.has(value);
}

export function traitSlugToObject(trait, dictionary) {
	// Look up trait labels from `npcAttackTraits` instead of `weaponTraits` in case a battle form attack is
	// in use, which can include what are normally NPC-only traits
	const traitObject = {
		name: trait,
		label: game.i18n.localize(dictionary[trait] ?? trait),
	};
	if (objectHasKey(CONFIG.PF2E.traitsDescriptions, trait)) {
		traitObject.description = CONFIG.PF2E.traitsDescriptions[trait];
	}

	return traitObject;
}

export function ordinalString(value) {
	const pluralRules = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
	const suffix = game.i18n.localize(
		`PF2E.OrdinalSuffixes.${pluralRules.select(value)}`,
	);
	return game.i18n.format("PF2E.OrdinalNumber", { value, suffix });
}

export function spellSlotGroupIdToNumber(groupId) {
	if (groupId === "cantrips") return 0;
	const numericValue = Number(groupId ?? NaN);
	return numericValue.between(0, 10) ? numericValue : null;
}

export function coerceToSpellGroupId(value) {
	if (value === "cantrips") return value;
	const numericValue = Number(value) || NaN;
	return numericValue.between(1, 10) ? numericValue : null;
}

export function localizer(prefix) {
	return (...[suffix, formatArgs]) =>
		formatArgs
			? game.i18n.format(`${prefix}.${suffix}`, formatArgs)
			: game.i18n.localize(`${prefix}.${suffix}`);
}
