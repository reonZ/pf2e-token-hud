import { getFlag, localize, setFlag } from "./module.js";
import { listenInlineRoll } from "./pf2e/inline-roll.js";

export const RANKS = ["U", "T", "E", "M", "L"];

const COVER_UUID = "Compendium.pf2e.other-effects.Item.I9lfZUiCwMiGogVi";

export async function getItemSummary(el, actor) {
	const dataset = el.data();
	const item = dataset.itemId
		? actor.items.get(dataset.itemId)
		: await fromUuid(dataset.uuid);
	const data = await item?.getChatData({ secrets: actor.isOwner }, dataset);
	if (!data) return;

	const description = document.createElement("div");
	description.classList.add("description");

	await actor.sheet.itemRenderer.renderItemSummary(description, item, data);
	listenInlineRoll(description, item);

	if (dataset.castRank) {
		description.dataset.castRank = dataset.castRank;
	}

	return description;
}

export function addNameTooltipListeners(el) {
	const targetEl = el.find(".name");

	targetEl.on("mouseenter", (event) => {
		event.preventDefault();

		const target = event.currentTarget;
		const { width } = target.getBoundingClientRect();
		if (target.scrollWidth <= Math.ceil(width)) return;

		const name = target.innerHTML.trim();
		game.tooltip.activate(event.currentTarget, {
			text: name,
			direction: TooltipManager.TOOLTIP_DIRECTIONS.UP,
		});
	});

	targetEl.on("mouseleave", (event) => {
		event.preventDefault();
		game.tooltip.deactivate();
	});

	targetEl.on("mousedown", (event) => {
		game.tooltip.deactivate();
	});
}

export function editItem(event, actor) {
	event.preventDefault();
	const item = getItemFromEvent(event, actor);
	item?.sheet.render(true, { focus: true });
}

export async function deleteItem(event, actor) {
	event.preventDefault();

	const item = getItemFromEvent(event, actor);
	if (!item) return;

	if (event.ctrlKey) return item.delete();

	new Dialog({
		title: localize("deleteItem.title"),
		content: `<p>${game.i18n.format("PF2E.DeleteQuestion", {
			name: item.name,
		})}</p>`,
		buttons: {
			ok: {
				icon: '<i class="fa-solid fa-trash"></i>',
				label: localize("deleteItem.ok"),
				callback: () => item.delete(),
			},
			cancel: {
				icon: '<i class="fas fa-times"></i>',
				label: localize("deleteItem.cancel"),
			},
		},
	}).render(true);
}

export function getItemFromEvent(event, actor) {
	const { itemId } = event.currentTarget.closest("[data-item-id]").dataset;
	return actor.items.get(itemId);
}

export function getMacros(actor) {
	return actor.isOwner
		? getFlag(actor, `macros.${game.user.id}`)
				?.map((uuid) => {
					const macro = fromUuidSync(uuid);
					if (!macro) return null;
					return { img: macro.img, name: macro.name, uuid };
				})
				.filter(Boolean)
		: undefined;
}

export function onDroppedMacro(event, actor) {
	const { type, uuid } = TextEditor.getDragEventData(event.originalEvent) ?? {};
	if (type !== "Macro" || !fromUuidSync(uuid)) return;

	const flag = `macros.${game.user.id}`;
	const macros = getFlag(actor, flag)?.slice() ?? [];
	if (macros.includes(uuid)) return;

	macros.push(uuid);
	setFlag(actor, flag, macros);
}

export function deleteMacro(event, actor) {
	const flag = `macros.${game.user.id}`;
	const macros = getFlag(actor, flag)?.slice();
	if (!macros?.length) return;

	const { uuid } = event.currentTarget.closest(".macro").dataset;
	const index = macros.indexOf(uuid);
	if (index === -1) return;

	macros.splice(index, 1);
	setFlag(actor, flag, macros);
}

export function getUniqueTarget(condition = () => true) {
	const targets = game.user.targets;
	const target = targets.size === 1 ? targets.first() : null;
	return target && condition(target) ? target : null;
}

export function filterIn(value, filter) {
	if (!filter) return true;
	return value.toLowerCase().includes(filter);
}

export function localeCompare(a, b) {
	return a.localeCompare(b, game.i18n.lang);
}

export function getCoverEffect(actor) {
	return actor?.itemTypes.effect.find(
		(effect) => effect.flags.core?.sourceId === COVER_UUID,
	);
}
