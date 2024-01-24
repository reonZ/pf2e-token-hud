export function htmlQueryAll(parent, selectors) {
	if (!(parent instanceof Element || parent instanceof Document)) return [];
	return Array.from(parent.querySelectorAll(selectors));
}

export function htmlClosest(child, selectors) {
	if (!(child instanceof Element)) return null;
	return child.closest(selectors);
}

export function createHTMLElement(
	nodeName,
	{ classes = [], dataset = {}, children = [], innerHTML } = {},
) {
	const element = document.createElement(nodeName);
	if (classes.length > 0) element.classList.add(...classes);

	for (const [key, value] of Object.entries(dataset).filter(
		([, v]) => !R.isNil(v),
	)) {
		element.dataset[key] = String(value);
	}

	if (innerHTML) {
		element.innerHTML = innerHTML;
	} else {
		for (const child of children) {
			const childElement =
				child instanceof HTMLElement ? child : new Text(child);
			element.appendChild(childElement);
		}
	}

	return element;
}
