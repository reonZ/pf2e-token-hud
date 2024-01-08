import {
	MODULE_ID,
	getSetting,
	localize,
	modifier,
	templatePath,
} from "../module.js";
import {
	coerceToSpellGroupId,
	ordinalString,
	spellSlotGroupIdToNumber,
} from "../pf2e/misc.js";
import { eventToRollParams } from "../pf2e/scripts.js";
import { showItemSummary } from "../popup.js";
import {
	addNameTooltipListeners,
	filterIn,
	getItemFromEvent,
	localeCompare,
} from "../shared.js";

export async function getSpellsData({ actor, filter }) {
	const focusPool = actor.system.resources.focus ?? { value: 0, max: 0 };
	const entries = actor.spellcasting.regular;
	const showTradition = getSetting("tradition");

	const pf2eStavesActive = game.modules.get("pf2e-staves")?.active;
	const pf2eDailies = game.modules.get("pf2e-dailies");
	const pf2eDailiesActive = pf2eDailies?.active;
	const stavesActive =
		pf2eStavesActive ||
		(pf2eDailiesActive && isNewerVersion(pf2eDailies.version, "2.14.0"));
	const chargesPath = pf2eStavesActive
		? "flags.pf2e-staves.charges"
		: pf2eDailiesActive
		  ? "flags.pf2e-dailies.staff.charges"
		  : "";

	const spells = [];
	const focuses = [];

	let hasFocusCantrips = false;

	await Promise.all(
		entries.map(async (entry) => {
			const entryId = entry.id;
			const tradition = showTradition && entry.statistic.label[0];
			const data = await entry.getSheetData();
			const isFocus = data.isFocusPool;
			const isCharge = entry.system?.prepared?.value === "charge";

			const charges = (() => {
				if (!isCharge) return;

				const dailiesData =
					pf2eDailiesActive &&
					pf2eDailies.api.getSpellcastingEntryStaffData(entry);
				const { charges, max, canPayCost } = dailiesData ??
					getProperty(entry, "flags.pf2e-staves.charges") ?? {
						charges: 0,
						max: 0,
					};

				return {
					value: charges,
					max,
					noMax: true,
					canPayCost: canPayCost ?? (() => true),
				};
			})();

			for (const group of data.groups) {
				if (!group.active.length || group.uses?.max === 0) continue;

				const slotSpells = [];
				const isCantrip = group.id === "cantrips";
				const groupNumber = spellSlotGroupIdToNumber(group.id);

				for (let slotId = 0; slotId < group.active.length; slotId++) {
					const active = group.active[slotId];
					if (!active || active.uses?.max === 0) continue;

					const { spell, expended, virtual, uses, castRank } = active;
					if (!filterIn(spell.name, filter)) continue;

					slotSpells.push({
						name: spell.name,
						img: spell.img,
						tradition,
						castRank: castRank ?? spell.rank,
						slotId,
						entryId,
						itemId: spell.id,
						inputId: data.isInnate ? spell.id : data.id,
						inputPath: isCharge
							? chargesPath
							: data.isInnate
							  ? "system.location.uses.value"
							  : `system.slots.slot${groupNumber}.value`,
						isCharge,
						isActiveCharge: isCharge && stavesActive,
						isVirtual: virtual,
						isInnate: data.isInnate,
						isCantrip: isCantrip,
						isFocus,
						isPrepared: data.isPrepared,
						isSpontaneous: data.isSpontaneous || data.isFlexible,
						groupId: group.id,
						uses: uses ?? (isCharge ? charges : group.uses),
						expended: isCharge
							? !charges.canPayCost(groupNumber)
							: expended ??
							  (isFocus && !isCantrip ? focusPool.value <= 0 : false),
						action: spell.system.time.value,
						type: isCharge
							? `${MODULE_ID}.spells.staff`
							: data.isInnate
							  ? "PF2E.PreparationTypeInnate"
							  : data.isSpontaneous
								  ? "PF2E.PreparationTypeSpontaneous"
								  : data.isFlexible
									  ? "PF2E.SpellFlexibleLabel"
									  : isFocus
										  ? "PF2E.TraitFocus"
										  : "PF2E.SpellPreparedLabel",
						order: isCharge
							? 0
							: data.isPrepared
							  ? 1
							  : isFocus
								  ? 2
								  : data.isInnate
									  ? 3
									  : data.isSpontaneous
										  ? 4
										  : 5,
					});
				}

				if (slotSpells.length) {
					if (isFocus) {
						if (isCantrip) hasFocusCantrips = true;
						else {
							focuses.push(...slotSpells);
							continue;
						}
					}

					spells[groupNumber] ??= [];
					spells[groupNumber].push(...slotSpells);
				}
			}
		}),
	);

	if (spells.length) {
		const sortingSetting = getSetting("spells-sort");
		const sort =
			sortingSetting === "type"
				? (a, b) =>
						a.order === b.order
							? localeCompare(a.name, b.name)
							: a.order - b.order
				: sortingSetting === "entry"
				  ? (a, b) => {
							const compareEntries = localeCompare(a.entryId, b.entryId);
							if (compareEntries !== 0) return compareEntries;
							return localeCompare(a.name, b.name);
					  }
				  : (a, b) => localeCompare(a.name, b.name);

		for (const entry of spells) {
			entry.sort(sort);
		}
	}

	if (focuses.length) {
		focuses.sort((a, b) => localeCompare(a.name, b.name));
		spells[12] = focuses;
		hasFocusCantrips = false;
	}

	const ritualData = await actor.spellcasting.ritual?.getSheetData();
	const rituals = ritualData?.groups.flatMap((group, slotId) =>
		group.active
			.map(({ spell }) => {
				if (!filterIn(spell.name, filter)) return;
				return {
					name: spell.name,
					img: spell.img,
					slotId,
					itemId: spell.id,
					rank: spell.rank,
					time: spell.system.time.value,
				};
			})
			.filter(Boolean),
	);

	if (spells.length || rituals?.length) {
		const attacks = getSpellAttacks(actor);

		const nb = spells.length + Number((rituals?.length ?? 0) > 0);
		return {
			contentData: {
				spells,
				rituals,
				focusPool,
				hasFocusCantrips,
				attackMod: hasSingleSpellAttack(attacks) ? attacks[0].mod : null,
				entryRank: (rank) =>
					game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", {
						rank: ordinalString(rank),
					}),
			},
			doubled: nb > 1 && getSetting("spells-columns"),
		};
	}
}

function getSpellAttacks(actor) {
	return actor.spellcasting
		.filter((entry) => entry.statistic)
		.map(({ statistic, name, id }) => ({
			name,
			id,
			mod: modifier(statistic.mod),
			statistic,
		}));
}

function hasSingleSpellAttack(attacks) {
	return new Set(attacks.map(({ mod }) => mod)).size === 1;
}

export function addSpellsListeners({ el, actor, hud }) {
	addNameTooltipListeners(el.find(".spell"));

	el.find("[data-action=spell-description]").on("click", async (event) => {
		event.preventDefault();
		const spell = $(event.currentTarget).closest(".spell");
		showItemSummary(spell, actor);
	});

	// IS OWNER
	if (!actor.isOwner) return;

	el.find("[data-action=spell-attack]").on("click", async (event) => {
		event.preventDefault();

		const attacks = getSpellAttacks(actor);
		if (!attacks.length) return;

		let statistic;
		if (!hasSingleSpellAttack(attacks)) {
			const id = await Dialog.wait({
				buttons: {
					ok: {
						icon: '<i class="fa-solid fa-dice-d20"></i>',
						label: localize("spells.attacks.ok"),
						callback: (html) => html.find("input:checked").val(),
					},
				},
				title: localize("spells.attacks.title"),
				content: await renderTemplate(templatePath("dialogs/spell-attacks"), {
					attacks,
				}),
				close: () => null,
			});

			if (id) statistic = actor.items.get(id)?.statistic;
		} else {
			statistic = attacks[0].statistic;
		}

		const rollParams = eventToRollParams(event, { type: "check" });
		const { map } = event.currentTarget.dataset;
		if (map) {
			rollParams.modifiers = [
				new game.pf2e.Modifier({
					label: "PF2E.MultipleAttackPenalty",
					modifier: Number(map),
				}),
			];
		}

		statistic?.check.roll(rollParams);
	});

	el.find("[data-action=spell-chat]").on("click", async (event) => {
		event.preventDefault();

		const item = getItemFromEvent(event, actor);
		if (!item) return;

		item.toMessage(event);
		if (getSetting("chat-close")) hud.close();
	});

	el.find("[data-action=toggle-pips]").on(
		"click contextmenu",
		async (event) => {
			event.preventDefault();
			const change = event.type === "click" ? 1 : -1;
			const points = (actor.system.resources.focus?.value ?? 0) + change;
			await actor.update({ "system.resources.focus.value": points });
		},
	);

	el.find("[data-action=toggle-prepared]").on("click", (event) => {
		event.preventDefault();
		const { groupId, slotId, entryId, expended } = $(event.currentTarget)
			.closest(".spell")
			.data();
		const collection = actor.spellcasting.collections.get(entryId);
		collection?.setSlotExpendedState(
			coerceToSpellGroupId(groupId),
			slotId || 0,
			expended !== true,
		);
	});

	el.find("[data-action=cast-spell]").on("click", (event) => {
		event.preventDefault();

		const { castRank, slotId, entryId, itemId } = $(event.currentTarget)
			.closest(".spell")
			.data();
		const collection = actor.spellcasting.collections.get(entryId);
		if (!collection) return;

		const spell = collection.get(itemId);
		if (!spell) return;

		collection.entry.cast(spell, { rank: castRank, slotId: slotId });
		if (getSetting("cast-close")) hud.close();
	});

	el.find("[data-input-path]").on("change", async (event) => {
		const { inputPath, entryId } = $(event.currentTarget).data();
		const value = event.currentTarget.valueAsNumber;
		await actor.updateEmbeddedDocuments("Item", [
			{ _id: entryId, [inputPath]: value },
		]);
	});
}
