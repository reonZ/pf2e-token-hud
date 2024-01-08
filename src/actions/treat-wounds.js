import { hasFeat, localize, templatePath } from "../module.js";

const NATURAL_MEDICINE = "Compendium.pf2e.feats-srd.Item.WC4xLBGmBsdOdHWu";
const RISKY_SURGERY = "Compendium.pf2e.feats-srd.Item.bkZgWFSFV4cAf5Ot";

const DC_LIST = [15, 20, 30, 40];

export async function rollTreatWounds(actor, options) {
	const name = actor.name;

	const skills = [];
	if (actor.skills.medicine.rank) skills.push(actor.skills.medicine);
	if (hasFeat(actor, NATURAL_MEDICINE) && actor.skills.nature.rank)
		skills.push(actor.skills.nature);

	if (skills.length < 1) {
		ui.notifications.warn(
			localize("actions.treat-wounds.no-proficiency", { name }),
		);
		return;
	}

	const content = await renderTemplate(templatePath("dialogs/treat-wounds"), {
		skills,
		risky: hasFeat(actor, RISKY_SURGERY),
	});

	new Dialog({
		title: localize("actions.treat-wounds.title", { name }),
		content,
		buttons: {},
		render: (html) => {
			html.find("select[name=skill]").on("change", (event) => {
				const slug = event.currentTarget.value;
				const rank = actor.skills[slug].rank;
				html
					.find(".rank")
					.text(game.i18n.localize(`PF2E.ProficiencyLevel${rank}`))
					.attr("class", `rank ${rank}`);
			});
		},
	}).render(true);
}
