import { HUD } from "./hud.js";

export const MODULE_ID = "pf2e-token-hud";

let hud = null;
export function getHud(element = false) {
	return element ? hud?.element : hud;
}

export function enableModule(enabled) {
	if (enabled && !hud) {
		hud = new HUD();
	} else if (!enabled && hud) {
		hud.delete();
		hud = null;
	}
}

export function getSetting(setting) {
	return game.settings.get(MODULE_ID, setting);
}

export function localize(...args) {
	const data = args.at(-1);
	const useFormat = typeof data === "object";

	const keys = useFormat ? args.slice(0, -1) : args;
	keys.unshift(MODULE_ID);

	return game.i18n[useFormat ? "format" : "localize"](keys.join("."), data);
}

export function hasFeat(actor, uuid) {
	return actor.itemTypes.feat.some((feat) => feat.sourceId === uuid);
}

export function templatePath(template) {
	return `modules/${MODULE_ID}/templates/${template}.hbs`;
}

export function modifier(mod) {
	return mod >= 0 ? `+${mod}` : mod;
}

export function getFlag(doc, flag) {
	return doc.getFlag(MODULE_ID, flag);
}

export function setFlag(doc, flag, value) {
	return doc.setFlag(MODULE_ID, flag, value);
}

export async function enrichHTML(
	str,
	actor,
	{ isOwner = actor.isOwner, rollData = actor.getRollData() } = {},
) {
	const htmlStr = str?.trim();
	if (!htmlStr) return "";

	const enriched = await TextEditor.enrichHTML(htmlStr, {
		async: true,
		secrets: isOwner,
		rollData,
	});
	return enriched;
}

export function isInstanceOf(obj, name) {
	if (typeof obj !== "object") return false;

	let cursor = Reflect.getPrototypeOf(obj);
	while (cursor) {
		if (cursor.constructor.name === name) return true;
		cursor = Reflect.getPrototypeOf(cursor);
	}

	return false;
}
