export function htmlQueryAll(parent, selectors) {
    if (!(parent instanceof Element || parent instanceof Document)) return []
    return Array.from(parent.querySelectorAll(selectors))
}

export function htmlClosest(child, selectors) {
    if (!(child instanceof Element)) return null
    return child.closest(selectors)
}
