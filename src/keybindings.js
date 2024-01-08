import { MODULE_ID, getHud, getSetting } from "./module.js";

export function registerKeybindings() {
	register("hold", {
		onDown: () => {
			if (getSetting("key-holding") !== "none") getHud()?.setHolding(true);
		},
		onUp: () => {
			getHud()?.setHolding(false);
		},
	});

	register("filter", {
		onUp: () => {
			getHud()?.showFilter();
		},
		editable: [
			{
				key: "KeyQ",
				modifiers: ["Control"],
			},
		],
	});
}

function path(bind, key) {
	return `${MODULE_ID}.keybinds.${bind}.${key}`;
}

function register(name, extras = {}) {
	game.keybindings.register(MODULE_ID, name, {
		name: path(name, "name"),
		hint: path(name, "hint"),
		precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
		...extras,
	});
}
