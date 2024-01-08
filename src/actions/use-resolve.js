import { localize, templatePath } from "../module.js";

const RESOLVE_UUID = "Compendium.pf2e.feats-srd.Item.jFmdevE4nKevovzo";

export async function useResolve(actor) {
	function toChat(content) {
		ChatMessage.create({
			user: game.user.id,
			content,
			speaker: ChatMessage.getSpeaker({ actor }),
		});
	}

	const { name, attributes, system } = actor;
	const sp = attributes.hp.sp;
	const resolve = system.resources.resolve;
	const fullStamina = localize("hud.resolve.full", { name });
	const noResolve = game.i18n.format(
		"PF2E.Actions.SteelYourResolve.NoStamina",
		{ name },
	);

	if (sp.value === sp.max) return ui.notifications.warn(fullStamina);
	if (resolve.value < 1) return ui.notifications.warn(noResolve);

	const hasSteel = actor.itemTypes.feat.find(
		(item) => item.sourceId === RESOLVE_UUID,
	);
	const content = await renderTemplate(templatePath("dialogs/resolve"), {
		hasSteel,
		i18n: (str) => localize(`hud.resolve.${str}`),
	});

	new Dialog({
		title: localize("hud.resolve.title"),
		content,
		buttons: {
			yes: {
				icon: "<i class='fas fa-check'></i>",
				label: localize("hud.resolve.yes"),
				callback: async (html) => {
					const { attributes, system } = actor;
					const sp = attributes.hp.sp;
					const resolve = system.resources.resolve;

					if (sp.value === sp.max) return toChat(fullStamina);
					if (resolve.value < 1) return toChat(noResolve);

					const selected = html.find("input:checked").val();
					const ratio = `${sp.value}/${sp.max}`;

					if (selected === "breather") {
						toChat(localize("hud.resolve.breather.used", { name, ratio }));
						await actor.update({
							"system.attributes.hp.sp.value": sp.max,
							"system.resources.resolve.value": resolve.value - 1,
						});
					} else {
						toChat(
							game.i18n.format("PF2E.Actions.SteelYourResolve.RecoverStamina", {
								name,
								ratio,
							}),
						);
						const newSP = sp.value + Math.floor(sp.max / 2);
						await actor.update({
							"system.attributes.hp.sp.value": Math.min(newSP, sp.max),
							"system.resources.resolve.value": resolve.value - 1,
						});
					}
				},
			},
			no: {
				icon: "<i class='fas fa-times'></i>",
				label: localize("hud.resolve.no"),
			},
		},
	}).render(true);
}
