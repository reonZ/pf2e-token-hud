const dcAdjustments = new Map([
	["incredibly-easy", -10],
	["very-easy", -5],
	["easy", -2],
	["normal", 0],
	["hard", 2],
	["very-hard", 5],
	["incredibly-hard", 10],
]);

const dcByLevel = new Map([
	[-1, 13],
	[0, 14],
	[1, 15],
	[2, 16],
	[3, 18],
	[4, 19],
	[5, 20],
	[6, 22],
	[7, 23],
	[8, 24],
	[9, 26],
	[10, 27],
	[11, 28],
	[12, 30],
	[13, 31],
	[14, 32],
	[15, 34],
	[16, 35],
	[17, 36],
	[18, 38],
	[19, 39],
	[20, 40],
	[21, 42],
	[22, 44],
	[23, 46],
	[24, 48],
	[25, 50],
]);

function adjustDC(dc, adjustment = "normal") {
	return dc + (dcAdjustments.get(adjustment) ?? 0);
}

function rarityToDCAdjustment(rarity = "common") {
	switch (rarity) {
		case "uncommon":
			return "hard";
		case "rare":
			return "very-hard";
		case "unique":
			return "incredibly-hard";
		default:
			return "normal";
	}
}

export function adjustDCByRarity(dc, rarity = "common") {
	return adjustDC(dc, rarityToDCAdjustment(rarity));
}

export function calculateDC(level, { pwol, rarity = "common" } = {}) {
	pwol ??= game.pf2e.settings.variants.pwol.enabled;
	const dc = dcByLevel.get(level) ?? 14;
	return pwol
		? adjustDCByRarity(dc - Math.max(level, 0), rarity)
		: adjustDCByRarity(dc, rarity);
}
