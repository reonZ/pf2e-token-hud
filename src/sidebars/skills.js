import {
	getSetting,
	hasFeat,
	localize,
	modifier,
	templatePath,
} from "../module.js";
import { unownedItemToMessage } from "../pf2e/item.js";
import { showItemSummary } from "../popup.js";
import { filterIn, localeCompare } from "../shared.js";

const MODULE_ID = "pf2e-token-hud";

const UNTRAINED_IMPROVISATION =
	"Compendium.pf2e.feats-srd.Item.9jGaBxLUtevZYcZO";

const CROWBAR_UUIDS = new Set([
	"Compendium.pf2e.equipment-srd.Item.44F1mfJei4GY8f2X",
	"Compendium.pf2e.equipment-srd.Item.4kz3vhkKPUuXBpxk",
]);
const BON_MOT_UUID = "Compendium.pf2e.feats-srd.Item.0GF2j54roPFIDmXf";
const NATURAL_MEDICINE_UUID = "Compendium.pf2e.feats-srd.Item.WC4xLBGmBsdOdHWu";
const FOLLOW_THE_EXPERT_UUID =
	"Compendium.pf2e.other-effects.Item.VCSpuc3Tf3XWMkd3";

const LABELS = {
	initiative: "PF2E.InitiativeLabel",
	"recall-knowledge": "PF2E.RecallKnowledge.Label",
	"cover-tracks": "PF2E.TravelSpeed.ExplorationActivities.CoverTracks",
	earnIncome: `${MODULE_ID}.skills.actions.earnIncome`,
	treatWounds: `${MODULE_ID}.skills.actions.treatWounds`,
	"borrow-arcane-spell": `${MODULE_ID}.skills.actions.borrow-arcane-spell`,
	"identify-magic": `${MODULE_ID}.skills.actions.identify-magic`,
	"identify-alchemy": `${MODULE_ID}.skills.actions.identify-alchemy`,
	"crafting-goods": `${MODULE_ID}.skills.actions.crafting-goods`,
	"staging-performance": `${MODULE_ID}.skills.actions.staging-performance`,
};

const ACTIONS_UUIDS = {
	aid: "Compendium.pf2e.actionspf2e.Item.HCl3pzVefiv9ZKQW",
	"sense-motive": "Compendium.pf2e.actionspf2e.Item.1xRFPTFtWtGJ9ELw",
	seek: "Compendium.pf2e.actionspf2e.Item.BlAOM2X92SI6HMtJ",
	balance: "Compendium.pf2e.actionspf2e.Item.M76ycLAqHoAgbcej",
	escape: "Compendium.pf2e.actionspf2e.Item.SkZAQRkLLkmBQNB9",
	"follow-the-expert": "Compendium.pf2e.actionspf2e.Item.tfa4Sh7wcxCEqL29",
	"tumble-through": "Compendium.pf2e.actionspf2e.Item.21WIfSu7Xd7uKqV8",
	"maneuver-in-flight": "Compendium.pf2e.actionspf2e.Item.Qf1ylAbdVi1rkc8M",
	squeeze: "Compendium.pf2e.actionspf2e.Item.kMcV8e5EZUxa6evt",
	"recall-knowledge": "Compendium.pf2e.actionspf2e.Item.1OagaWtBpVXExToo",
	"borrow-arcane-spell": "Compendium.pf2e.actionspf2e.Item.OizxuPb44g3eHPFh",
	"decipher-writing": "Compendium.pf2e.actionspf2e.Item.d9gbpiQjChYDYA2L",
	"identify-magic": "Compendium.pf2e.actionspf2e.Item.eReSHVEPCsdkSL4G",
	"learn-a-spell": "Compendium.pf2e.actionspf2e.Item.Q5iIYCFdqJFM31GW",
	climb: "Compendium.pf2e.actionspf2e.Item.pprgrYQ1QnIDGZiy",
	"force-open": "Compendium.pf2e.actionspf2e.Item.SjmKHgI7a5Z9JzBx",
	grapple: "Compendium.pf2e.actionspf2e.Item.PMbdMWc2QroouFGD",
	"high-jump": "Compendium.pf2e.actionspf2e.Item.2HJ4yuEFY1Cast4h",
	"long-jump": "Compendium.pf2e.actionspf2e.Item.JUvAvruz7yRQXfz2",
	reposition: "Compendium.pf2e.actionspf2e.Item.lOE4yjUnETTdaf2T",
	shove: "Compendium.pf2e.actionspf2e.Item.7blmbDrQFNfdT731",
	swim: "Compendium.pf2e.actionspf2e.Item.c8TGiZ48ygoSPofx",
	trip: "Compendium.pf2e.actionspf2e.Item.ge56Lu1xXVFYUnLP",
	disarm: "Compendium.pf2e.actionspf2e.Item.Dt6B1slsBy8ipJu9",
	repair: "Compendium.pf2e.actionspf2e.Item.bT3skovyLUtP22ME",
	craft: "Compendium.pf2e.actionspf2e.Item.rmwa3OyhTZ2i2AHl",
	"crafting-goods": "",
	earnIncome: "Compendium.pf2e.actionspf2e.Item.QyzlsLrqM0EEwd7j",
	"identify-alchemy": "Compendium.pf2e.actionspf2e.Item.Q4kdWVOf2ztIBFg1",
	"create-a-diversion": "Compendium.pf2e.actionspf2e.Item.GkmbTGfg8KcgynOA",
	impersonate: "Compendium.pf2e.actionspf2e.Item.AJstokjdG6iDjVjE",
	lie: "Compendium.pf2e.actionspf2e.Item.ewwCglB7XOPLUz72",
	feint: "Compendium.pf2e.actionspf2e.Item.QNAVeNKtHA0EUw4X",
	bonMot: BON_MOT_UUID,
	"gather-information": "Compendium.pf2e.actionspf2e.Item.plBGdZhqq5JBl1D8",
	"make-an-impression": "Compendium.pf2e.actionspf2e.Item.OX4fy22hQgUHDr0q",
	request: "Compendium.pf2e.actionspf2e.Item.DCb62iCBrJXy0Ik6",
	coerce: "Compendium.pf2e.actionspf2e.Item.tHCqgwjtQtzNqVvd",
	demoralize: "Compendium.pf2e.actionspf2e.Item.2u915NdUyQan6uKF",
	"administer-first-aid": "Compendium.pf2e.actionspf2e.Item.MHLuKy4nQO2Z4Am1",
	"treat-disease": "Compendium.pf2e.actionspf2e.Item.TC7OcDa7JlWbqMaN",
	"treat-poison": "Compendium.pf2e.actionspf2e.Item.KjoCEEmPGTeFE4hh",
	treatWounds: "Compendium.pf2e.actionspf2e.Item.1kGNdIIhuglAjIp9",
	"command-an-animal": "Compendium.pf2e.actionspf2e.Item.q9nbyIF0PEBqMtYe",
	perform: "Compendium.pf2e.actionspf2e.Item.EEDElIyin4z60PXx",
	"staging-performance": "",
	subsist: "Compendium.pf2e.actionspf2e.Item.49y9Ec4bDii8pcD3",
	"create-forgery": "Compendium.pf2e.actionspf2e.Item.ftG89SjTSa9DYDOD",
	"conceal-an-object": "Compendium.pf2e.actionspf2e.Item.qVNVSmsgpKFGk9hV",
	hide: "Compendium.pf2e.actionspf2e.Item.XMcnh4cSI32tljXa",
	sneak: "Compendium.pf2e.actionspf2e.Item.VMozDqMMuK5kpoX4",
	"sense-direction": "Compendium.pf2e.actionspf2e.Item.fJImDBQfqfjKJOhk",
	"cover-tracks": "Compendium.pf2e.actionspf2e.Item.SB7cMECVtE06kByk",
	track: "Compendium.pf2e.actionspf2e.Item.EA5vuSgJfiHH7plD",
	"palm-an-object": "Compendium.pf2e.actionspf2e.Item.ijZ0DDFpMkWqaShd",
	steal: "Compendium.pf2e.actionspf2e.Item.RDXXE7wMrSPCLv5k",
	"disable-device": "Compendium.pf2e.actionspf2e.Item.cYdz2grcOcRt4jk6",
	"pick-a-lock": "Compendium.pf2e.actionspf2e.Item.2EE4aF4SZpYf0R6H",
};

const DUPLICATE_SKILLS = {
	escape: { slug: "escape", cost: "1", type: 2, noSkill: true },
	"recall-knowledge": { slug: "recall-knowledge", cost: "1", secret: true },
	"decipher-writing": { slug: "decipher-writing", type: 2, trained: true },
	"identify-magic": { slug: "identify-magic", trained: true },
	"learn-a-spell": { slug: "learn-a-spell", trained: true },
};

const SKILLS = [
	{
		slug: "perception",
		actions: [
			{ slug: "sense-motive", cost: "1", type: 2 },
			{ slug: "seek", cost: "1", type: 2 },
		],
	},
	{
		slug: "acrobatics",
		actions: [
			{ slug: "balance", cost: "1", type: 2 },
			// 'escape',
			{ slug: "tumble-through", cost: "1", type: 2 },
			{ slug: "maneuver-in-flight", cost: "1", type: 2, trained: true },
			{ slug: "squeeze", type: 2, trained: true },
		],
	},
	{
		slug: "arcana",
		actions: [
			// 'recall-knowledge',
			{ slug: "borrow-arcane-spell", trained: true },
			"decipher-writing",
			"identify-magic",
			"learn-a-spell",
		],
	},
	{
		slug: "athletics",
		actions: [
			{ slug: "climb", cost: "1", type: 1 },
			// 'escape',
			{
				slug: "force-open",
				cost: "1",
				type: 1,
				map: true,
				modifiers: [
					{
						condition: (actor) =>
							!actor.itemTypes.equipment.some(
								(item) => item.isHeld && CROWBAR_UUIDS.has(item.sourceId),
							),
						modifiers: [
							{
								slug: "crowbar-missing",
								modifier: -2,
								type: "circumstance",
							},
						],
					},
				],
			},
			{ slug: "grapple", cost: "1", type: 1, map: true, agile: true },
			{ slug: "high-jump", cost: "1", type: 1 },
			{ slug: "long-jump", cost: "1", type: 1 },
			{ slug: "reposition", cost: "1", type: 2, map: true, agile: true },
			{ slug: "shove", cost: "1", type: 1, map: true, agile: true },
			{ slug: "swim", cost: "1", type: 1 },
			{ slug: "trip", cost: "1", type: 2, map: true, agile: true },
			{
				slug: "disarm",
				cost: "1",
				type: 1,
				map: true,
				trained: true,
				agile: true,
			},
		],
	},
	{
		slug: "crafting",
		actions: [
			// 'recall-knowledge',
			{ slug: "repair", type: 1 },
			{ slug: "craft", type: 1, trained: true },
			{ slug: "crafting-goods", trained: true },
			{ slug: "earnIncome", type: 3, trained: true },
			{ slug: "identify-alchemy", trained: true },
		],
	},
	{
		slug: "deception",
		actions: [
			{
				slug: "create-a-diversion",
				cost: "1",
				type: 1,
				variants: ["distracting-words", "gesture", "trick"],
			},
			{ slug: "impersonate", type: 1 },
			{ slug: "lie", type: 1 },
			{ slug: "feint", cost: "1", type: 1, trained: true },
		],
	},
	{
		slug: "diplomacy",
		actions: [
			{
				slug: "bonMot",
				cost: "1",
				type: 1,
				condition: (actor) => hasFeat(actor, BON_MOT_UUID),
			},
			{ slug: "gather-information", type: 1 },
			{ slug: "make-an-impression", type: 1 },
			{ slug: "request", cost: "1", type: 1 },
		],
	},
	{
		slug: "intimidation",
		actions: [
			{ slug: "coerce", type: 2 },
			{ slug: "demoralize", cost: "1", type: 2 },
		],
	},
	{
		slug: "medicine",
		actions: [
			{
				slug: "administer-first-aid",
				cost: "2",
				type: 2,
				variants: ["stabilize", "stop-bleeding"],
				rollOption: "administer-first-aid",
			},
			{ slug: "treat-disease", type: 2, trained: true },
			{ slug: "treat-poison", cost: "1", type: 2, trained: true },
			{ slug: "treatWounds", type: 1, trained: true },
		],
	},
	{
		slug: "nature",
		actions: [
			{ slug: "command-an-animal", cost: "1", type: 2 }, //
			// 'recall-knowledge',
			"identify-magic",
			"learn-a-spell",
			{
				slug: "treatWounds",
				type: 1,
				trained: true,
				condition: (actor) => hasFeat(actor, NATURAL_MEDICINE_UUID),
			},
		],
	},
	{
		slug: "occultism",
		actions: [
			// 'recall-knowledge', //
			"decipher-writing",
			"identify-magic",
			"learn-a-spell",
		],
	},
	{
		slug: "performance",
		actions: [
			{
				slug: "perform",
				cost: "1",
				type: 1,
				variants: [
					"acting",
					"comedy",
					"dance",
					"keyboards",
					"oratory",
					"percussion",
					"singing",
					"strings",
					"winds",
				],
			},
			{ slug: "staging-performance", trained: true },
		],
	},
	{
		slug: "religion",
		actions: [
			// 'recall-knowledge', //
			"decipher-writing",
			"identify-magic",
			"learn-a-spell",
		],
	},
	{
		slug: "society",
		actions: [
			// 'recall-knowledge', //
			{ slug: "subsist", type: 2 },
			{ slug: "create-forgery", type: 2, trained: true },
			"decipher-writing",
		],
	},
	{
		slug: "stealth",
		actions: [
			{ slug: "conceal-an-object", cost: "1", type: 2 },
			{ slug: "hide", cost: "1", type: 2 },
			{ slug: "sneak", cost: "1", type: 2 },
		],
	},
	{
		slug: "survival",
		actions: [
			{ slug: "sense-direction", type: 1 },
			{ slug: "subsist", type: 2 },
			{ slug: "cover-tracks", trained: true },
			{ slug: "track", type: 1, trained: true },
		],
	},
	{
		slug: "thievery",
		actions: [
			{ slug: "palm-an-object", cost: "1", type: 2 },
			{ slug: "steal", cost: "1", type: 2 },
			{ slug: "disable-device", cost: "2", type: 2, trained: true },
			{ slug: "pick-a-lock", cost: "2", type: 2, trained: true },
		],
	},
];

for (const skill of SKILLS) {
	skill.actions = skill.actions.map((action) =>
		typeof action === "string" ? DUPLICATE_SKILLS[action] : action,
	);

	const { slug, actions } = skill;
	for (const action of actions) {
		const unslugged = action.slug
			.replace(/-(.)/g, (_, c) => c.toUpperCase())
			.capitalize();

		action.skillSlug = slug;
		action.uuid = ACTIONS_UUIDS[action.slug];
		action.label = LABELS[action.slug] ?? `PF2E.Actions.${unslugged}.Title`;

		if (action.variants) {
			action.variants = action.variants.map((variant) => ({
				slug: variant,
				label: `${MODULE_ID}.skills.actions.${variant}`,
			}));
		} else if (action.map) {
			const agile = !!action.agile;

			action.variants = [
				{ label: "PF2E.Roll.Normal" },
				{
					label: "PF2E.MAPAbbreviationLabel",
					map: 1,
					agile,
					mapValue: agile ? -4 : -5,
				},
				{
					label: "PF2E.MAPAbbreviationLabel",
					map: 2,
					agile,
					mapValue: agile ? -8 : -10,
				},
			];
		}

		for (const { modifiers } of action.modifiers ?? []) {
			for (const modifier of modifiers) {
				modifier.label = `${MODULE_ID}.skills.modifiers.${modifier.slug}`;
			}
		}
	}
}

export const SKILLS_SLUGS = SKILLS.map((skill) => skill.slug);

const SKILLS_MAP = SKILLS.reduce((skills, { slug, actions }) => {
	skills[slug] = {
		slug,
		actions: actions.reduce((actions, action) => {
			actions[action.slug] = action;
			return actions;
		}, {}),
	};
	return skills;
}, {});

export const skillActionsUUIDS = new Set(
	Object.values(ACTIONS_UUIDS).filter(Boolean),
);

export function getSkillLabel(slug) {
	return game.i18n.localize(
		slug === "perception"
			? "PF2E.PerceptionLabel"
			: CONFIG.PF2E.skillList[slug],
	);
}

export async function getSkillsData({ actor, filter }) {
	const skills = [];
	const isCharacter = actor.isOfType("character");

	const noUntrained =
		isCharacter &&
		getSetting("untrained") &&
		!actor.itemTypes.feat.some(
			(feat) => feat.sourceId === UNTRAINED_IMPROVISATION,
		);

	for (let i = 0; i < SKILLS.length; i++) {
		const { slug, actions } = SKILLS[i];
		const { label, rank, mod } = actor.getStatistic(slug);

		const name = game.i18n.localize(label);
		const actionsList = actions
			.filter(
				({ condition, trained }) =>
					(!noUntrained ||
						!isCharacter ||
						!trained ||
						actor.skills[slug].rank >= 1) &&
					(!condition || condition(actor)),
			)
			.map((action) => ({
				...action,
				name: game.i18n.localize(action.label),
				variants: action.variants?.map((variant) => ({
					...variant,
					name: game.i18n.localize(variant.label),
				})),
			}));

		const passedFilter = filterIn(name, filter);
		let filteredActions = actionsList;
		if (!passedFilter) {
			filteredActions = actionsList.filter(
				({ name, variants }) =>
					filterIn(name, filter) ||
					variants?.some((variant) => filterIn(variant.name, filter)),
			);
			if (!filteredActions.length) continue;
		}

		skills[i] = {
			slug,
			name,
			rank,
			modifier: modifier(mod),
			actions: passedFilter ? actionsList : filteredActions,
		};
	}

	skills.sort((a, b) =>
		a.slug === "perception"
			? -1
			: b.slug === "perception"
			  ? 1
			  : localeCompare(a.name, b.name),
	);

	const lores = Object.values(actor.skills)
		.filter(({ lore, label }) => lore && filterIn(label, filter))
		.map(({ label, rank, mod, slug }) => ({
			slug,
			label,
			rank,
			modifier: modifier(mod),
		}));

	const loresModifierWidth = lores.reduce(
		(width, lore) =>
			lore.modifier.length > width ? lore.modifier.length : width,
		2,
	);

	return {
		contentData: {
			follow: localize(
				`skills.actions.${isFollowingAnExpert(actor) ? "following" : "follow"}`,
			),
			skills,
			lores,
			loresModifierWidth,
		},
		doubled: getSetting("skills-columns"),
	};
}

export function addSkillsListeners({ el, actor, token, hud }) {
	el.find("[data-action=action-description]").on("click", (event) => {
		event.preventDefault();
		const action = $(event.currentTarget).closest(".action");
		showItemSummary(action, actor, action.find(".name").children().html());
	});

	// IS OWNER
	if (!actor.isOwner) return;

	el.find("[data-action=follow-the-expert]").on("click", async (event) => {
		event.preventDefault();

		const following = isFollowingAnExpert(actor);
		if (following) return await following.delete();

		const source = (await fromUuid(FOLLOW_THE_EXPERT_UUID)).toObject();
		setProperty(source, "flags.core.sourceId", FOLLOW_THE_EXPERT_UUID);
		await actor.createEmbeddedDocuments("Item", [source]);
	});

	el.find("[data-action=roll-skill]").on("click", (event) => {
		event.preventDefault();
		const { slug } = event.currentTarget.dataset;
		actor.getStatistic(slug)?.roll({ event });
		if (getSetting("skill-close")) hud.close();
	});

	el.find("[data-action=roll-action]").on(
		"click contextmenu",
		async (event) => {
			event.preventDefault();

			const target = $(event.currentTarget);
			const { skillSlug, slug, actionName } = target.closest(".action").data();
			const { variant, map, agile } = target.data();

			const variants =
				event.type === "contextmenu"
					? await variantsDialog(actionName, { skill: skillSlug, agile })
					: undefined;

			if (variants !== null) {
				rollAction({
					event,
					actor,
					token,
					skillSlug,
					slug,
					variant,
					map,
					skill: variants?.skill,
					agile: variants?.agile ?? agile,
				});
				if (getSetting("skill-close")) hud.close();
			}
		},
	);

	el.find("[data-action=action-chat]").on("click", async (event) => {
		event.preventDefault();

		const { uuid } = event.currentTarget.closest(".action").dataset;
		const item = await fromUuid(uuid);
		if (!item) return;

		unownedItemToMessage(event, item, actor, { create: true });
		if (getSetting("chat-close")) hud.close();
	});
}

function isFollowingAnExpert(actor) {
	return actor.itemTypes.effect.find(
		(effect) => effect.sourceId === FOLLOW_THE_EXPERT_UUID,
	);
}

export async function variantsDialog(action, { dc, agile, skill } = {}) {
	const skills = SKILLS_SLUGS.map((slug) => ({
		slug,
		label: getSkillLabel(slug),
	}));

	const content = await renderTemplate(templatePath("dialogs/variant"), {
		i18n: (str) => localize(`skills.variant.${str}`),
		dc,
		skill,
		agile,
		skills,
	});

	return Dialog.prompt({
		title: action,
		label: localize("skills.variant.button"),
		callback: (html) => ({
			skill: html.find("select").val(),
			dc: Number(html.find("[name=dc]").val()),
			agile: html.find("[name=agile]").is(":checked"),
		}),
		rejectClose: false,
		content,
		options: { width: 280 },
	});
}

export function getMapModifier(map, agile) {
	const modifier = map === 1 ? (agile ? -4 : -5) : agile ? -8 : -10;
	return new game.pf2e.Modifier({
		label: "PF2E.MultipleAttackPenalty",
		modifier,
	});
}

function rollAction({
	event,
	actor,
	skillSlug,
	slug,
	variant,
	map,
	agile,
	skill,
	token,
}) {
	const action = SKILLS_MAP[skillSlug].actions[slug];
	const type =
		action.type === 3
			? 3
			: game.pf2e.actions.has(slug)
			  ? 2
			  : slug in game.pf2e.actions
				  ? 1
				  : undefined;

	skill ??= action.noSkill ? undefined : skillSlug;

	const rollOptions = action.rollOption
		? [`action:${action.rollOption}`]
		: undefined;
	if (rollOptions && variant)
		rollOptions.push(`action:${action.rollOption}:${variant}`);

	const options = {
		event,
		actors: [actor],
		tokens: [token],
		variant,
		rollOptions,
		rollMode: action.secret ? "blindroll" : "roll",
	};

	options.modifiers = [];

	if (action.modifiers) {
		for (const { condition, modifiers } of action.modifiers) {
			if (condition && !condition(actor)) continue;
			for (const modifier of modifiers) {
				options.modifiers.push(new game.pf2e.Modifier(modifier));
			}
		}
	}

	if (map) {
		const modifier = getMapModifier(map, agile);
		options.modifiers.push(modifier);
	}

	if (action.custom) {
		action.custom(actor, options);
		return;
	}

	if (!type) {
		actor.getStatistic(skill)?.roll(options);
		return;
	}

	// old actions
	if (type === 1) {
		options.skill = skill;
		game.pf2e.actions[slug](options);
	}
	// new actions
	else if (type === 2) {
		options.statistic = skill;
		game.pf2e.actions.get(slug).use(options);
	}
	// exception for old actions that only accept one actor argument
	else if (type === 3) {
		game.pf2e.actions[slug](actor);
	}
}
