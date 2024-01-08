import { MODULE_ID, getSetting } from "./module";

export async function createTooltip({
	target,
	selected,
	direction = "DOWN",
	onCreate,
	onDismiss,
	onClick,
	content,
	cssClass = [],
	locked = false,
}) {
	return new Promise((resolve) => {
		const tooltipClass = `${MODULE_ID}-tooltip`;

		const exist = document.body.querySelectorAll(
			`.${tooltipClass}:not(#tooltip)`,
		);
		for (const el of exist) {
			dismissTooltip(el);
		}

		requestAnimationFrame(() => {
			cssClass = typeof cssClass === "string" ? [cssClass] : cssClass;
			if (selected) cssClass.push("selection-tooltip");

			if (Array.isArray(content)) {
				content = content
					.map(({ value, label }) => {
						const selectedClass = value === selected ? 'class="selected"' : "";
						return `<li><a ${selectedClass} data-value="${value}">${label}</a></li>`;
					})
					.join("");
			}

			let tooltip;

			if (content instanceof HTMLElement) {
				tooltip = content;
			} else {
				tooltip = document.createElement("ul");
				tooltip.innerHTML = content;
			}

			tooltip.style.setProperty("--font-size", `${getSetting("scale")}px`);

			if (cssClass.length) {
				tooltip.classList.add(...cssClass.map((c) => `${MODULE_ID}-${c}`));
			}

			if (onDismiss) {
				new MutationObserver(function () {
					if (!document.body.contains(tooltip)) {
						onDismiss();
						this.disconnect();
					}
				}).observe(document.body, { childList: true });
			}

			if (onClick) {
				locked = true;

				for (const el of tooltip.querySelectorAll("[data-value]")) {
					el.addEventListener("click", async (event) => {
						event.preventDefault();
						const target = event.currentTarget;
						dismissTooltip(target);
						onClick?.(target.dataset.value);
					});
				}
			}

			game.tooltip.activate(target, {
				content: tooltip,
				direction,
				locked,
				cssClass: tooltipClass,
			});

			onCreate?.(tooltip);

			resolve(tooltip);
		});
	});
}

export function dismissTooltip(el) {
	const tooltip = el.closest(`.${MODULE_ID}-tooltip`);
	game.tooltip.dismissLockedTooltip(tooltip);
}
