import { enrichHTML, getSetting, modifier } from "../module.js";
import { InlineRollLinks } from "../pf2e/inline-roll.js";
import { showItemSummary } from "../popup.js";

export async function getHazardData({ actor }) {
	const { system } = actor;
	const { details, traits, attributes } = system;
	const { stealth } = attributes;
	const { description, disable, routine, reset, isComplex } = details;
	const rollData = actor.getRollData();
	const isOwner = actor.isOwner;

	const enrich = async (str) => {
		return enrichHTML(str, actor, { isOwner, rollData });
	};

	return {
		contentData: {
			description: await enrich(description),
			disable: await enrich(disable),
			routine: await enrich(routine),
			reset: await enrich(reset),
			isComplex,
			rarity: {
				value: traits.rarity,
				label: CONFIG.PF2E.rarityTraits[traits.rarity],
			},
			traits: traits.value.map((trait) => CONFIG.PF2E.hazardTraits[trait]),
			stealth: modifier(stealth.value),
		},
		style: { "--max-width": `${getSetting("hazard-width")}em` },
	};
}

export function addHazardListeners({ el, actor }) {
	el.find("[data-action=action-description]").on("click", (event) => {
		event.preventDefault();
		const action = $(event.currentTarget).closest(".action");
		showItemSummary(action, actor);
	});

	InlineRollLinks.listen(el[0], actor);

	// IS OWNER
	if (!actor.isOwner) return;

	el.find("[data-action=roll-initiative").on("click", (event) => {
		event.preventDefault();
		actor.initiative.roll({ event });
	});
}
