export async function toggleWeaponTrait({ weapon, trait, selection }) {
	const current = weapon.system.traits.toggles[trait].selection;
	if (current === selection) return false;

	const item = weapon.actor?.items.get(weapon.id);
	if (item?.isOfType("weapon") && item === weapon) {
		await item.update({
			[`system.traits.toggles.${trait}.selection`]: selection,
		});
	} else if (item?.isOfType("weapon") && weapon.altUsageType === "melee") {
		item.update({ [`system.meleeUsage.traitToggles.${trait}`]: selection });
	} else if (trait === "versatile" && item?.isOfType("shield")) {
		item.update({ "system.traits.integrated.versatile.selection": selection });
	} else {
		const rule = item?.rules.find(
			(r) => r.key === "Strike" && !r.ignored && r.slug === weapon.slug,
		);
		await rule?.toggleTrait({ trait, selection });
	}

	return true;
}
