import { registerKeybindings } from "./keybindings.js";
import {
	MODULE_ID,
	enableModule,
	getHud,
	getSetting,
	localize,
	templatePath,
} from "./module.js";
import { registerSettings, renderSettingsConfig } from "./settings.js";
import { deleteMacro, getMacros, onDroppedMacro } from "./shared.js";

Hooks.once("setup", async () => {
	registerSettings();
	registerKeybindings();

	await loadTemplates({
		creature: templatePath("tooltips/creature"),
		hazard: templatePath("tooltips/hazard"),
		vehicle: templatePath("tooltips/vehicle"),
		army: templatePath("tooltips/army"),
	});
});

Hooks.once("ready", () => {
	if (getSetting("enabled")) enableModule(true);

	game.modules.get("pf2e-token-hud").api = {
		getHud,
	};
});

Hooks.on("renderSettingsConfig", renderSettingsConfig);

Hooks.on("drawMeasuredTemplate", (template) => {
	if (template.isPreview) getHud()?.close();
});

Hooks.on("getActorDirectoryEntryContext", (_, data) => {
	data.unshift({
		icon: '<i class="fa-solid fa-code"></i>',
		name: `${MODULE_ID}.actor.macros.contextmenu`,
		condition: (html) => {
			const { documentId } = html.data();
			return getSetting("enabled") && game.actors.get(documentId)?.isOwner;
		},
		callback: (html) => {
			const { documentId } = html.data();
			openMacrosDialog(documentId);
		},
	});
});

class DataDialog extends Dialog {
	async getData(options = {}) {
		const data = super.getData(options);
		if (typeof data.content === "function") data.content = await data.content();
		return data;
	}
}

function openMacrosDialog(actorId) {
	const actor = game.actors.get(actorId);
	if (!actor) return;

	const dialog = new DataDialog(
		{
			title: `${actor.name} - ${localize("actor.macros.title")}`,
			content: async () => {
				const macros = getMacros(actor) ?? [];
				return renderTemplate(templatePath("dialogs/macros"), {
					macros,
					noMacro: localize("extras.no-macro"),
				});
			},
			buttons: {},
			render: (html) => {
				actor.apps[dialog.appId] = dialog;
				html.on("drop", (event) => onDroppedMacro(event, actor));
				html
					.find("[data-action=delete-macro]")
					.on("click", (event) => deleteMacro(event, actor));
			},
			close: () => {
				delete actor.apps[dialog.appId];
			},
		},
		{ height: "auto" },
	).render(true);
}
