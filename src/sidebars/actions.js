import { enrichHTML, getSetting, localize, templatePath } from "../module.js";
import { createSelfEffectMessage } from "../pf2e/item.js";
import { getActionIcon } from "../pf2e/misc.js";
import { eventToRollMode } from "../pf2e/scripts.js";
import { toggleWeaponTrait } from "../pf2e/weapon.js";
import { popup, showItemSummary } from "../popup.js";
import {
	addNameTooltipListeners,
	filterIn,
	getItemFromEvent,
	localeCompare,
} from "../shared.js";
import { extrasUUIDS } from "./extras.js";
import { skillActionsUUIDS } from "./skills.js";

const SECTIONS_TYPES = {
	action: {
		order: 0,
		label: "PF2E.ActionsActionsHeader",
		actionLabel: "PF2E.ActionTypeAction",
	},
	reaction: {
		order: 1,
		label: "PF2E.ActionsReactionsHeader",
		actionLabel: "PF2E.ActionTypeReaction",
	},
	free: {
		order: 2,
		label: "PF2E.ActionsFreeActionsHeader",
		actionLabel: "PF2E.ActionTypeFree",
	},
	passive: {
		order: 3,
		label: "PF2E.NPC.PassivesLabel",
		actionLabel: "PF2E.ActionTypePassive",
	},
	exploration: {
		order: 3,
		label: "PF2E.TravelSpeed.ExplorationActivity",
		actionLabel: "PF2E.TabActionsExplorationLabel",
	},
};

export async function getActionsData({ hud, actor, filter }) {
	const isCharacter = actor.isOfType("character");
	const sorting = getSetting("actions");

	const stances = (await getStancesModuleApi()?.getStances(actor))?.sort(
		(a, b) => localeCompare(a.name, b.name),
	);

	const heroActions = isCharacter
		? await getHeroActionsApi()?.getHeroActions(actor)
		: undefined;
	const heroDiff = heroActions
		? actor.heroPoints.value - heroActions.length
		: undefined;

	const isOwner = actor.isOwner;
	const rollData = actor.getRollData();

	const strikes = actor.system.actions
		? await Promise.all(
				actor.system.actions.map(async (strike, index) => ({
					...strike,
					index,
					visible: !isCharacter || strike.visible,
					damageFormula: await strike.damage?.({ getFormula: true }),
					criticalFormula: await strike.critical?.({ getFormula: true }),
					description: strike.description
						? await enrichHTML(strike.description, actor, { rollData, isOwner })
						: undefined,
					altUsages:
						strike.altUsages &&
						(await Promise.all(
							strike.altUsages.map(async (altUsage) => ({
								...altUsage,
								usage: altUsage.item.isThrown ? "thrown" : "melee",
								damageFormula: await altUsage.damage?.({ getFormula: true }),
								criticalFormula: await altUsage.critical?.({
									getFormula: true,
								}),
							})),
						)),
				})),
		  )
		: undefined;

	const blast = isCharacter ? new game.pf2e.ElementalBlast(actor) : undefined;
	const blasts = blast
		? (
				await Promise.all(
					blast.configs.map(async (config) => {
						const damageType =
							config.damageTypes.find((damage) => damage.selected)?.value ??
							"untyped";

						const formulaFor = (outcome, melee = true) => {
							return blast.damage({
								element: config.element,
								damageType,
								melee,
								outcome,
								getFormula: true,
							});
						};

						return {
							...config,
							damageType,
							formula: {
								melee: {
									damage: await formulaFor("success"),
									critical: await formulaFor("criticalSuccess"),
								},
								ranged: {
									damage: await formulaFor("success", false),
									critical: await formulaFor("criticalSuccess", false),
								},
							},
						};
					}),
				)
		  ).sort((a, b) => localeCompare(a.label, b.label))
		: undefined;

	let sections = {};

	const actions = isCharacter
		? getCharacterActions(actor, stances)
		: getNpcActions(actor);
	for (const action of actions) {
		if (!filterIn(action.name, filter)) continue;

		if (sorting !== "split") {
			sections.action ??= [];
			sections.action.push(action);
		} else {
			sections[action.type] ??= [];
			sections[action.type].push(action);
		}
	}

	sections = Object.entries(sections).map(([type, actions]) => {
		for (const action of actions) {
			action.img = getActionIcon(action.cost);
			action.typeLabel = SECTIONS_TYPES[action.type].actionLabel;
		}

		if (sorting !== "type") {
			actions.sort((a, b) => localeCompare(a.name, b.name));
		} else {
			actions.sort((a, b) => {
				const orderA = SECTIONS_TYPES[a.type].order;
				const orderB = SECTIONS_TYPES[b.type].order;
				return orderA === orderB
					? localeCompare(a.name, b.name)
					: orderA - orderB;
			});
		}

		return { type, actions, label: SECTIONS_TYPES[type].label };
	});

	if (sorting === "split")
		sections.sort(
			(a, b) => SECTIONS_TYPES[a.type].order - SECTIONS_TYPES[b.type].order,
		);

	if (
		stances?.length ||
		strikes?.length ||
		blasts?.length ||
		sections.length ||
		heroActions?.length
	) {
		const nb =
			Number((stances?.length ?? 0) > 0) +
			Number((strikes?.length ?? 0) > 0) +
			Number((blasts?.length ?? 0) > 0) +
			sections.length +
			Number((heroActions?.length ?? 0) > 0);

		return {
			contentData: {
				stances,
				strikes,
				blasts,
				sections,
				heroActions: heroActions && {
					actions: heroActions,
					draw: Math.max(heroDiff, 0),
					discard: Math.abs(Math.min(heroDiff, 0)),
					canTrade: heroActions.length && canTradeHeroActions(),
				},
				i18n: (str) => localize(`actions.${str}`),
				variantLabel: (label) => label.replace(/.+\((.+)\)/, "$1"),
				damageTypes: CONFIG.PF2E.damageTypes,
			},
			doubled: nb > 1 && getSetting("actions-columns"),
		};
	}
}

export function addActionsListeners({ el, actor, hud }) {
	addNameTooltipListeners(el.find(".toggle"));
	addNameTooltipListeners(el.find(".strike"));
	addNameTooltipListeners(el.find(".action"));

	function action(action, callback, type = "click") {
		const actions = typeof action === "string" ? [action] : action;
		const selector = actions.map((x) => `[data-action=${x}]`).join(", ");
		return el.find(selector).on(type, (event) => {
			event.preventDefault();
			callback(event);
		});
	}

	function getStrike(event) {
		const strikeEl = event.currentTarget.closest(".strike");
		const strike = actor.system.actions[strikeEl.dataset.index];
		if (!strike) return null;

		const { altUsage } = event.currentTarget.dataset;
		return ["melee", "thrown"].includes(altUsage)
			? strike.altUsages?.find((s) =>
					altUsage === "thrown" ? s.item.isThrown : s.item.isMelee,
			  ) ?? null
			: strike;
	}

	function getUuid(event) {
		return $(event.currentTarget).closest(".action").data().uuid;
	}

	action("action-description", async (event) => {
		const action = $(event.currentTarget).closest(".action");
		showItemSummary(action, actor);
	});

	action("hero-action-description", async (event) => {
		const uuid = getUuid(event);
		const { description, name } =
			(await getHeroActionsApi()?.getHeroActionDetails(uuid)) ?? {};
		if (description) popup(name, description, actor);
	});

	action("strike-description", async (event) => {
		const strike = getStrike(event);
		if (!strike) return;

		const description = document.createElement("div");
		description.classList.add("description");
		// this one is a copy of the system template, there is nothing to generate it
		description.innerHTML = await renderTemplate(
			templatePath("strike-description"),
			strike,
		);

		popup(strike.label, description, actor);
	});

	action("blast-description", async (event) => {
		const blast = event.currentTarget.closest(".blast");
		showItemSummary($(blast), actor);
	});

	action("trait-description", (event) => {
		const strike = getStrike(event);
		if (!strike) return;

		const { index } = event.currentTarget.dataset;
		const trait = strike.traits[index];
		if (!trait) return;

		const description = game.i18n.localize(trait.description);
		if (description) popup(game.i18n.localize(trait.label), description, actor);
	});

	action("stance-description", (event) => {
		const stance = $(event.currentTarget).closest(".action");
		showItemSummary(stance, actor, stance.data().itemName);
	});

	// IS OWNER
	if (!actor.isOwner) return;

	action("use-action", (event) => {
		const item = getItemFromEvent(event, actor);
		if (item?.isOfType("action", "feat")) {
			createSelfEffectMessage(item, eventToRollMode(event));
			if (getSetting("action-effect")) applyActionEffect(actor, item);
			if (getSetting("action-close")) hud.close();
		}
	});

	action("stance-chat", (event) => {
		const item = getItemFromEvent(event, actor);
		if (!item) return;

		item.toMessage(event, { create: true });
		if (getSetting("chat-close")) hud.close();
	});

	action("stance-toggle", (event) => {
		const { effectUuid } = event.currentTarget.closest(".action").dataset;
		getStancesModuleApi()?.toggleStance(actor, effectUuid);
	});

	action("exploration-toggle", (event) => {
		const actionId = event.currentTarget.closest(".action").dataset.itemId;

		const exploration = actor.system.exploration.filter((id) =>
			actor.items.has(id),
		);
		if (!exploration.findSplice((id) => id === actionId)) {
			exploration.push(actionId);
		}

		actor.update({ "system.exploration": exploration });
	});

	action("action-chat", (event) => {
		const item = getItemFromEvent(event, actor);
		if (!item) return;

		item.toMessage(event, { create: true });
		if (getSetting("chat-close")) hud.close();
	});

	action("hero-action-chat", async (event) => {
		const api = getHeroActionsApi();
		if (!api) return;

		api.sendActionToChat(actor, getUuid(event));
		if (getSetting("chat-close")) hud.close();
	});

	action("draw-hero-action", async (event) => {
		await getHeroActionsApi()?.drawHeroActions(actor);
	});

	action("use-hero-action", async (event) => {
		const api = getHeroActionsApi();
		if (!api) return;

		api.useHeroAction(actor, getUuid(event));
		if (getSetting("action-close")) hud.close();
	});

	action("discard-hero-action", async (event) => {
		await getHeroActionsApi()?.discardHeroActions(actor, getUuid(event));
	});

	action("trade-hero-action", async (event) => {
		getHeroActionsApi()?.tradeHeroAction(actor);
	});

	action("strike-attack", (event) => {
		const { index, altUsage } = event.currentTarget.dataset;
		const strike = getStrike(event);

		strike?.variants[index].roll({ event, altUsage });
		if (getSetting("attack-close")) hud.close();
	});

	action(["strike-damage", "strike-critical"], (event) => {
		const { action } = event.currentTarget.dataset;
		const strike = getStrike(event);

		strike?.[action === "strike-damage" ? "damage" : "critical"]({ event });
		if (getSetting("attack-close")) hud.close();
	});

	action("strike-auxiliary", (event) => {
		if (event.currentTarget !== event.target) return;

		const strike = getStrike(event);
		if (!strike) return;

		const { index } = event.currentTarget.dataset;
		const modular = event.currentTarget.querySelector("select")?.value ?? null;

		strike.auxiliaryActions?.[index]?.execute({ selection: modular });
	});

	action("toggle-versatile", (event) => {
		const weapon = getStrike(event)?.item;
		if (!weapon) return;

		const target = event.currentTarget;
		const { value } = target.dataset;
		const baseType = weapon?.system.damage.damageType ?? null;
		const selection =
			target.classList.contains("selected") || value === baseType
				? null
				: value;

		toggleWeaponTrait({ trait: "versatile", weapon, selection });
	});

	action(
		"strike-ammo",
		async (event) => {
			const weapon = getStrike(event)?.item;
			if (!weapon) return;

			const ammo = actor.items.get(event.currentTarget.value);
			await weapon.update({ system: { selectedAmmoId: ammo?.id ?? null } });
		},
		"change",
	);

	if (!actor.isOfType("character")) return;

	const selectors = ["roll-attack", "roll-damage", "set-damage-type"]
		.map((s) => `[data-action=${s}]`)
		.join(",");
	el.find(".blast").each((_, blastEl) => {
		const { element, damageType } = blastEl.dataset;
		const blast = new game.pf2e.ElementalBlast(actor);

		$(blastEl)
			.find(selectors)
			.on("click", async (event) => {
				event.preventDefault();

				const dataset = event.currentTarget.dataset;
				const melee = dataset.melee === "true";

				switch (dataset.action) {
					case "roll-attack": {
						const mapIncreases = Math.clamped(
							Number(dataset.mapIncreases),
							0,
							2,
						);
						blast.attack({
							mapIncreases: Math.clamped(mapIncreases, 0, 2),
							element,
							damageType,
							melee,
							event,
						});
						break;
					}
					case "roll-damage": {
						blast.damage({
							element,
							damageType,
							melee,
							outcome: dataset.outcome,
							event,
						});
						break;
					}
					case "set-damage-type": {
						blast.setDamageType({ element, damageType: dataset.value });
					}
				}

				if (
					["roll-attack", "roll-damage"].includes(dataset.action) &&
					getSetting("attack-close")
				)
					hud.close();
			});
	});
}

function getToolBeltModule(setting) {
	const module = game.modules.get("pf2e-toolbelt");
	return module?.active && game.settings.get("pf2e-toolbelt", setting)
		? module
		: undefined;
}

function getToolBeltApi(setting) {
	return getToolBeltModule(setting)?.api;
}

function getStancesModuleApi() {
	const module = game.modules.get("pf2e-stances");
	return module?.active ? module.api : getToolBeltApi("stances")?.stances;
}

function getHeroActionsApi() {
	const module = game.modules.get("pf2e-hero-actions");
	return module?.active ? module.api : getToolBeltApi("hero")?.heroActions;
}

function canTradeHeroActions() {
	if (game.modules.get("pf2e-hero-actions")?.active)
		return game.settings.get("pf2e-hero-actions", "trade");
	if (getToolBeltModule("hero"))
		return game.settings.get("pf2e-toolbelt", "hero-trade");
}

function getCharacterActions(actor, stances) {
	const stancesUUIDS =
		getStancesModuleApi()?.getActionsUUIDS?.() ??
		(stances?.some((stance) => stance.actionUUID)
			? new Set(stances.map(({ actionUUID }) => actionUUID))
			: undefined) ??
		new Set();

	const actionsUUIDS = new Set([
		...stancesUUIDS,
		...skillActionsUUIDS,
		...Object.values(extrasUUIDS),
	]);
	const actions = actor.itemTypes.action;
	const feats = actor.itemTypes.feat.filter((item) => item.actionCost);
	const inParty = actor.parties.size > 0;
	const explorations = actor.system.exploration;

	return [...actions, ...feats]
		.map((action) => {
			const sourceId = action.sourceId;
			const actionId = action.id;
			const actionCost = action.actionCost;
			const traits = action.system.traits.value;
			const isExploration = traits.includes("exploration");

			return {
				sourceId,
				id: actionId,
				type: actionCost?.type ?? (isExploration ? "exploration" : "free"),
				cost: actionCost,
				name: action.name,
				isExploration,
				isDowntime: traits.includes("downtime"),
				isActive: isExploration && explorations.includes(actionId),
				hasEffect: !!action.system.selfEffect,
			};
		})
		.filter(
			(action) =>
				!action.isDowntime &&
				(inParty || !action.isExploration) &&
				(action.isExploration || !actionsUUIDS.has(action.sourceId)),
		);
}

function getNpcActions(actor) {
	return actor.itemTypes.action.map((item) => {
		const actionCost = item.actionCost;
		const actionType = actionCost?.type ?? "passive";
		const hasAura =
			actionType === "passive" &&
			(item.system.traits.value.includes("aura") ||
				!!item.system.rules.find((r) => r.key === "Aura"));

		return {
			id: item.id,
			type: actionType,
			cost: actionCost,
			name: item.name,
			hasDeathNote: item.system.deathNote,
			hasAura,
			hasEffect: !!item.system.selfEffect,
		};
	});
}

async function applyActionEffect(actor, item) {
	const uuid = item.system.selfEffect?.uuid;
	if (!uuid) return;

	const source = (await fromUuid(uuid))?.toObject();
	if (!source) return;

	actor.createEmbeddedDocuments("Item", [source]);
}
