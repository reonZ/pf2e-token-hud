import { rollRecallKnowledges } from "../actions/recall-knowledge.js";
import { getSetting, localize } from "../module.js";
import { unownedItemToMessage } from "../pf2e/item.js";
import { showItemSummary } from "../popup.js";
import {
	addNameTooltipListeners,
	deleteMacro,
	filterIn,
	getMacros,
	onDroppedMacro,
} from "../shared.js";
import {
	SKILLS_SLUGS,
	getMapModifier,
	getSkillLabel,
	variantsDialog,
} from "./skills.js";

export const extrasUUIDS = {
	aid: "Compendium.pf2e.actionspf2e.Item.HCl3pzVefiv9ZKQW",
	escape: "Compendium.pf2e.actionspf2e.Item.SkZAQRkLLkmBQNB9",
	"recall-knowledge": "Compendium.pf2e.actionspf2e.Item.1OagaWtBpVXExToo",
	"point-out": "Compendium.pf2e.actionspf2e.Item.sn2hIy1iIJX9Vpgj",
};

export async function getExtrasData({ actor, filter }) {
	const initiative = actor.system.initiative;

	return {
		contentData: {
			noMacro: localize("extras.no-macro"),
			macros: getMacros(actor)?.filter((macro) => filterIn(macro.name, filter)),
			initiative: initiative && {
				selected: initiative.statistic,
				skills: SKILLS_SLUGS.map((slug) => ({
					slug,
					label: getSkillLabel(slug),
				})),
			},
			hasDailies: game.modules.get("pf2e-dailies")?.active,
			hasPerception: game.modules.get("pf2e-perception")?.active,
			uuids: extrasUUIDS,
		},
	};
}

export function addExtrasListeners({ el, actor, token, hud }) {
	function action(action, callback, type = "click") {
		el.find(`[data-action=${action}]`).on(type, (event) => {
			event.preventDefault();
			callback(event);
		});
	}

	action("action-description", (event) => {
		const action = $(event.currentTarget).closest(".row");
		showItemSummary(action, actor);
	});

	// IS OWNER
	if (!actor.isOwner) return;

	addNameTooltipListeners(el.find(".macro"));

	async function getMacro(event) {
		const { uuid } = event.currentTarget.closest(".macro").dataset;
		return fromUuid(uuid);
	}

	action("delete-macro", (event) => deleteMacro(event, actor));

	action("edit-macro", async (event) => {
		const macro = await getMacro(event);
		macro?.sheet.render(true);
	});

	action("use-macro", async (event) => {
		const macro = await getMacro(event);
		macro?.execute({ actor, token });
		if (getSetting("macro-close")) hud.close();
	});

	el.on("drop", (event) => onDroppedMacro(event, actor));

	action("action-chat", async (event) => {
		const { uuid } = event.currentTarget.closest(".row").dataset;
		const item = await fromUuid(uuid);
		if (!item) return;

		unownedItemToMessage(event, item, actor, { create: true });
		if (getSetting("chat-close")) hud.close();
	});

	el.find("input[name], select[name]").on("change", async (event) => {
		const target = event.currentTarget;
		const value =
			target.type === "number" ? target.valueAsNumber : target.value;
		await actor.update({ [target.name]: value });
	});

	action("roll-initiative", async (event) => {
		await actor.initiative.roll({ event });
		if (getSetting("skill-close")) hud.close();
	});

	action("prepare-dailies", (event) => {
		const dailies = game.modules.get("pf2e-dailies");
		if (dailies?.active) dailies.api.openDailiesInterface(actor);
	});

	action("rest-for-the-night", (event) => {
		game.pf2e.actions.restForTheNight({ actors: [actor], tokens: [token] });
	});

	action("roll-recall-knowledge", (event) => {
		rollRecallKnowledges(actor);
		if (getSetting("skill-close")) hud.close();
	});

	action(
		"roll-aid",
		async (event) => {
			const variants = await variantsDialog(
				game.i18n.localize("PF2E.Actions.Aid.Title"),
				{ dc: 15 },
			);
			const note = {
				text: "@UUID[Compendium.pf2e.other-effects.Item.AHMUpMbaVkZ5A1KX]",
			};
			if (variants !== null) {
				game.pf2e.actions.get("aid").use({
					event,
					actors: [actor],
					tokens: [token],
					statistic: variants?.skill,
					difficultyClass: { value: variants?.dc },
					notes: [note],
				});
				if (getSetting("skill-close")) hud.close();
			}
		},
		"click contextmenu",
	);

	action("roll-point-out", (event) => {
		game.pf2e.actions
			.get("point-out")
			.use({ event, actors: [actor], tokens: [token] });
		if (getSetting("skill-close")) hud.close();
	});

	action(
		"roll-escape",
		async (event) => {
			const map = $(event.currentTarget).data().map;
			const variants =
				event.type === "contextmenu"
					? await variantsDialog(
							game.i18n.localize("PF2E.Actions.Escape.Title"),
							{ agile: map ? false : undefined },
					  )
					: undefined;
			if (variants === null) return;

			const modifiers = [];

			if (map) {
				const agile = variants?.agile;
				const modifier = getMapModifier(map, agile);
				modifiers.push(modifier);
			}

			game.pf2e.actions
				.get("escape")
				.use({
					event,
					actors: [actor],
					tokens: [token],
					statistic: variants?.skill,
					modifiers,
				});

			if (getSetting("skill-close")) hud.close();
		},
		"click contextmenu",
	);
}
