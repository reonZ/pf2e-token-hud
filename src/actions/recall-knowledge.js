import { getSetting, localize, modifier, templatePath } from "../module.js";
import { DegreeOfSuccess } from "../pf2e/success.js";
import { RANKS, getUniqueTarget } from "../shared.js";

const SKILLS = [
	"arcana",
	"crafting",
	"medicine",
	"nature",
	"occultism",
	"religion",
	"society",
];

const SUCCESS = {
	0: {
		icon: '<i class="fa-solid fa-xmark-large"></i><i class="fa-solid fa-xmark-large"></i>',
		name: "criticalFailure",
	},
	1: { icon: '<i class="fa-solid fa-xmark-large"></i>', name: "failure" },
	2: { icon: '<i class="fa-solid fa-check"></i>', name: "success" },
	3: {
		icon: '<i class="fa-solid fa-check"></i><i class="fa-solid fa-check"></i>',
		name: "criticalSuccess",
	},
};

export async function rollRecallKnowledges(actor) {
	const roll = await new Roll("1d20").evaluate({ async: true });
	const dieResult = roll.dice[0].total;
	const dieSuccess = dieResult === 1 ? "0" : dieResult === 20 ? "3" : "";
	const lores = Object.values(actor.skills).filter((skill) => skill.lore);
	const target = getUniqueTarget(
		(target) => target.actor?.identificationDCs,
	)?.actor;

	const data = {
		dieSuccess,
		dieResult,
		target,
		i18n: (str) => localize(`actions.recall-knowledge.${str}`),
	};

	if (target) {
		const { standard, skills, lore } = target.identificationDCs;

		let skillsDCs = standard.progression.slice();
		skillsDCs.length = 4;
		skillsDCs = [...skillsDCs];

		const loresDCs = lore.map(({ progression }) => {
			const dcs = progression;
			dcs.length = 6;
			return [...dcs];
		});

		data.skillsDCs = skillsDCs;
		data.loresDCs = loresDCs;

		data.skills = await Promise.all(
			skills.map((slug) => {
				const skill = actor.skills[slug];
				return rollSkill(skill, dieResult, skillsDCs);
			}),
		);

		data.lores = await Promise.all(
			lores.map((lore) => rollSkill(lore, dieResult)),
		);
	} else {
		data.skills = await Promise.all(
			[...SKILLS.map((slug) => actor.skills[slug]), ...lores].map((skill) =>
				rollSkill(skill, dieResult),
			),
		);
	}

	const rkDice = getSetting("rk-dice");

	const options = {
		speaker: ChatMessage.getSpeaker({ actor }),
		rollMode: CONST.DICE_ROLL_MODES.BLIND,
		type: CONST.CHAT_MESSAGE_TYPES.ROLL,
	};

	if (rkDice) {
		options.rolls = [roll];
		data.rkDice = true;
	}

	options.flavor = await renderTemplate(
		templatePath("chat/recall-knowledge"),
		data,
	);

	ChatMessage.create(options);
}

async function rollSkill(skill, dieResult, dcs) {
	const { rank, label } = skill;

	const roll = await skill.roll({
		createMessage: false,
		skipDialog: true,
		extraRollOptions: ["action:recall-knowledge"],
	});

	const mod = roll.total - roll.dice[0].total;
	const total = dieResult + mod;

	return {
		mod,
		rank,
		label,
		total,
		modifier: modifier(mod),
		rankLabel: RANKS[rank],
		checks: dcs?.map((dc) => {
			if (!dc) return "-";
			const success = new DegreeOfSuccess(roll, dc).value;
			return {
				success,
				icon: SUCCESS[success].icon,
				title: SUCCESS[success].name,
			};
		}),
	};
}
