import { enrichHTML, getHud, localize } from "./module.js";
import { getItemSummary } from "./shared.js";

export async function popup(title, content, actor) {
	const hud = getHud();
	const el = hud?.element;
	if (!el) return;

	el.find("> .popup").remove();

	const tmp = document.createElement("div");
	tmp.innerHTML = `<div class="popup">
    <div class="header">
        <div class="title">${title}</div>
        <a class="observable" data-action="close-popup"><i class="fas fa-times"></i> ${localize(
					"popup.close",
				)}</a>
    </div>
</div>`;

	const popup = tmp.firstElementChild;
	if (typeof content === "string") {
		const enriched = await enrichHTML(content, actor);
		popup.insertAdjacentHTML("beforeend", enriched);
	} else {
		popup.append(content);
	}

	popup
		.querySelector("[data-action=close-popup]")
		.addEventListener("click", () => popup.remove());

	const consumeLinks = popup.querySelectorAll("[data-action='consume']");
	for (const link of consumeLinks) {
		link.addEventListener("click", () => popup.remove());
	}

	el.append(popup);
	hud.lock();
}

export async function showItemSummary(el, actor, title) {
	const description = await getItemSummary(el, actor);
	if (description) {
		const popupTitle = title ?? el.find(".name").html();
		popup(popupTitle.trim(), description, actor);
	}
}
