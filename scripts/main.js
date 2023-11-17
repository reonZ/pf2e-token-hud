(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/actions/use-resolve.js
  var RESOLVE_UUID = "Compendium.pf2e.feats-srd.Item.jFmdevE4nKevovzo";
  async function useResolve(actor) {
    function toChat(content2) {
      ChatMessage.create({
        user: game.user.id,
        content: content2,
        speaker: ChatMessage.getSpeaker({ actor })
      });
    }
    __name(toChat, "toChat");
    const { name, attributes, system } = actor;
    const sp = attributes.hp.sp;
    const resolve = system.resources.resolve;
    const fullStamina = localize("hud.resolve.full", { name });
    const noResolve = game.i18n.format("PF2E.Actions.SteelYourResolve.NoStamina", { name });
    if (sp.value === sp.max)
      return ui.notifications.warn(fullStamina);
    if (resolve.value < 1)
      return ui.notifications.warn(noResolve);
    const hasSteel = actor.itemTypes.feat.find((item) => item.sourceId === RESOLVE_UUID);
    const content = await renderTemplate(templatePath("dialogs/resolve"), {
      hasSteel,
      i18n: (str) => localize(`hud.resolve.${str}`)
    });
    new Dialog({
      title: localize("hud.resolve.title"),
      content,
      buttons: {
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: localize("hud.resolve.yes"),
          callback: async (html) => {
            const { attributes: attributes2, system: system2 } = actor;
            const sp2 = attributes2.hp.sp;
            const resolve2 = system2.resources.resolve;
            if (sp2.value === sp2.max)
              return toChat(fullStamina);
            if (resolve2.value < 1)
              return toChat(noResolve);
            const selected = html.find("input:checked").val();
            const ratio = `${sp2.value}/${sp2.max}`;
            if (selected === "breather") {
              toChat(localize("hud.resolve.breather.used", { name, ratio }));
              await actor.update({
                "system.attributes.hp.sp.value": sp2.max,
                "system.resources.resolve.value": resolve2.value - 1
              });
            } else {
              toChat(game.i18n.format("PF2E.Actions.SteelYourResolve.RecoverStamina", { name, ratio }));
              const newSP = sp2.value + Math.floor(sp2.max / 2);
              await actor.update({
                "system.attributes.hp.sp.value": Math.min(newSP, sp2.max),
                "system.resources.resolve.value": resolve2.value - 1
              });
            }
          }
        },
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: localize("hud.resolve.no")
        }
      }
    }).render(true);
  }
  __name(useResolve, "useResolve");

  // src/pf2e/classes.js
  function getDamageRollClass() {
    return CONFIG.Dice.rolls.find((Roll2) => Roll2.name === "DamageRoll");
  }
  __name(getDamageRollClass, "getDamageRollClass");
  function getChatMessageClass() {
    return CONFIG.ChatMessage.documentClass;
  }
  __name(getChatMessageClass, "getChatMessageClass");
  function getMeasuredTemplateDocumentClass() {
    return CONFIG.MeasuredTemplate.documentClass;
  }
  __name(getMeasuredTemplateDocumentClass, "getMeasuredTemplateDocumentClass");
  function getMeasuredTemplateObjectClass() {
    return CONFIG.MeasuredTemplate.objectClass;
  }
  __name(getMeasuredTemplateObjectClass, "getMeasuredTemplateObjectClass");

  // src/pf2e/dc.js
  var dcAdjustments = /* @__PURE__ */ new Map([
    ["incredibly-easy", -10],
    ["very-easy", -5],
    ["easy", -2],
    ["normal", 0],
    ["hard", 2],
    ["very-hard", 5],
    ["incredibly-hard", 10]
  ]);
  var dcByLevel = /* @__PURE__ */ new Map([
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
    [25, 50]
  ]);
  function adjustDC(dc, adjustment = "normal") {
    return dc + (dcAdjustments.get(adjustment) ?? 0);
  }
  __name(adjustDC, "adjustDC");
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
  __name(rarityToDCAdjustment, "rarityToDCAdjustment");
  function adjustDCByRarity(dc, rarity = "common") {
    return adjustDC(dc, rarityToDCAdjustment(rarity));
  }
  __name(adjustDCByRarity, "adjustDCByRarity");
  function calculateDC(level, { proficiencyWithoutLevel, rarity = "common" } = {}) {
    const pwlSetting = game.settings.get("pf2e", "proficiencyVariant");
    proficiencyWithoutLevel ??= pwlSetting === "ProficiencyWithoutLevel";
    const dc = dcByLevel.get(level) ?? 14;
    if (proficiencyWithoutLevel) {
      return adjustDCByRarity(dc - Math.max(level, 0), rarity);
    } else {
      return adjustDCByRarity(dc, rarity);
    }
  }
  __name(calculateDC, "calculateDC");

  // src/pf2e/dom.js
  function htmlQueryAll(parent, selectors) {
    if (!(parent instanceof Element || parent instanceof Document))
      return [];
    return Array.from(parent.querySelectorAll(selectors));
  }
  __name(htmlQueryAll, "htmlQueryAll");
  function htmlClosest(child, selectors) {
    if (!(child instanceof Element))
      return null;
    return child.closest(selectors);
  }
  __name(htmlClosest, "htmlClosest");

  // src/pf2e/misc.js
  var actionImgMap = {
    0: "systems/pf2e/icons/actions/FreeAction.webp",
    free: "systems/pf2e/icons/actions/FreeAction.webp",
    1: "systems/pf2e/icons/actions/OneAction.webp",
    2: "systems/pf2e/icons/actions/TwoActions.webp",
    3: "systems/pf2e/icons/actions/ThreeActions.webp",
    "1 or 2": "systems/pf2e/icons/actions/OneTwoActions.webp",
    "1 to 3": "systems/pf2e/icons/actions/OneThreeActions.webp",
    "2 or 3": "systems/pf2e/icons/actions/TwoThreeActions.webp",
    reaction: "systems/pf2e/icons/actions/Reaction.webp",
    passive: "systems/pf2e/icons/actions/Passive.webp"
  };
  var actionGlyphMap = {
    0: "F",
    free: "F",
    1: "A",
    2: "D",
    3: "T",
    "1 or 2": "A/D",
    "1 to 3": "A - T",
    "2 or 3": "D/T",
    reaction: "R"
  };
  function getActionIcon(action, fallback = "systems/pf2e/icons/actions/Empty.webp") {
    if (action === null)
      return actionImgMap["passive"];
    const value = typeof action !== "object" ? action : action.type === "action" ? action.value : action.type;
    const sanitized = String(value ?? "").toLowerCase().trim();
    return actionImgMap[sanitized] ?? fallback;
  }
  __name(getActionIcon, "getActionIcon");
  function getActionGlyph(action) {
    if (!action && action !== 0)
      return "";
    const value = typeof action !== "object" ? action : action.type === "action" ? action.value : action.type;
    const sanitized = String(value ?? "").toLowerCase().trim();
    return actionGlyphMap[sanitized] ?? "";
  }
  __name(getActionGlyph, "getActionGlyph");
  function ErrorPF2e(message) {
    return Error(`PF2e System | ${message}`);
  }
  __name(ErrorPF2e, "ErrorPF2e");
  function tupleHasValue(array, value) {
    return array.includes(value);
  }
  __name(tupleHasValue, "tupleHasValue");
  function objectHasKey(obj, key) {
    return (typeof key === "string" || typeof key === "number") && key in obj;
  }
  __name(objectHasKey, "objectHasKey");
  var wordCharacter = String.raw`[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
  var nonWordCharacter = String.raw`[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`;
  var nonWordCharacterRE = new RegExp(nonWordCharacter, "gu");
  var wordBoundary = String.raw`(?:${wordCharacter})(?=${nonWordCharacter})|(?:${nonWordCharacter})(?=${wordCharacter})`;
  var nonWordBoundary = String.raw`(?:${wordCharacter})(?=${wordCharacter})`;
  var lowerCaseLetter = String.raw`\p{Lowercase_Letter}`;
  var upperCaseLetter = String.raw`\p{Uppercase_Letter}`;
  var lowerCaseThenUpperCaseRE = new RegExp(`(${lowerCaseLetter})(${upperCaseLetter}${nonWordBoundary})`, "gu");
  var nonWordCharacterHyphenOrSpaceRE = /[^-\p{White_Space}\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/gu;
  var upperOrWordBoundariedLowerRE = new RegExp(`${upperCaseLetter}|(?:${wordBoundary})${lowerCaseLetter}`, "gu");
  function sluggify(text, { camel = null } = {}) {
    if (typeof text !== "string") {
      console.warn("Non-string argument passed to `sluggify`");
      return "";
    }
    if (text === "-")
      return text;
    switch (camel) {
      case null:
        return text.replace(lowerCaseThenUpperCaseRE, "$1-$2").toLowerCase().replace(/['’]/g, "").replace(nonWordCharacterRE, " ").trim().replace(/[-\s]+/g, "-");
      case "bactrian": {
        const dromedary = sluggify(text, { camel: "dromedary" });
        return dromedary.charAt(0).toUpperCase() + dromedary.slice(1);
      }
      case "dromedary":
        return text.replace(nonWordCharacterHyphenOrSpaceRE, "").replace(/[-_]+/g, " ").replace(upperOrWordBoundariedLowerRE, (part, index) => index === 0 ? part.toLowerCase() : part.toUpperCase()).replace(/\s+/g, "");
      default:
        throw ErrorPF2e("I don't think that's a real camel.");
    }
  }
  __name(sluggify, "sluggify");
  function traitSlugToObject(trait, dictionary) {
    const traitObject = {
      name: trait,
      label: game.i18n.localize(dictionary[trait] ?? trait)
    };
    if (objectHasKey(CONFIG.PF2E.traitsDescriptions, trait)) {
      traitObject.description = CONFIG.PF2E.traitsDescriptions[trait];
    }
    return traitObject;
  }
  __name(traitSlugToObject, "traitSlugToObject");
  function ordinalString(value) {
    const pluralRules = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
    const suffix = game.i18n.localize(`PF2E.OrdinalSuffixes.${pluralRules.select(value)}`);
    return game.i18n.format("PF2E.OrdinalNumber", { value, suffix });
  }
  __name(ordinalString, "ordinalString");

  // src/pf2e/scripts.js
  function isRelevantEvent(event) {
    return !!event && "ctrlKey" in event && "metaKey" in event && "shiftKey" in event;
  }
  __name(isRelevantEvent, "isRelevantEvent");
  function eventToRollParams(event) {
    const skipDefault = !game.user.settings.showRollDialogs;
    if (!isRelevantEvent(event))
      return { skipDialog: skipDefault };
    const params = { skipDialog: event.shiftKey ? !skipDefault : skipDefault };
    if (event.ctrlKey || event.metaKey) {
      params.rollMode = game.user.isGM ? "gmroll" : "blindroll";
    }
    return params;
  }
  __name(eventToRollParams, "eventToRollParams");

  // src/pf2e/inline-roll.js
  var SAVE_TYPES = ["fortitude", "reflex", "will"];
  var inlineSelector = ["action", "check", "effect-area"].map((keyword) => `[data-pf2-${keyword}]`).join(",");
  function injectRepostElement(links, foundryDoc) {
    for (const link of links) {
      if (!foundryDoc || foundryDoc.isOwner)
        link.classList.add("with-repost");
      const repostButtons = htmlQueryAll(link, "i[data-pf2-repost]");
      if (repostButtons.length > 0) {
        if (foundryDoc && !foundryDoc.isOwner) {
          for (const button of repostButtons) {
            button.remove();
          }
          link.classList.remove("with-repost");
        }
        continue;
      }
      if (foundryDoc && !foundryDoc.isOwner)
        continue;
      const newButton = document.createElement("i");
      const icon = link.parentElement?.dataset?.pf2Checkgroup !== void 0 ? "fa-comment-alt-dots" : "fa-comment-alt";
      newButton.classList.add("fa-solid", icon);
      newButton.dataset.pf2Repost = "";
      newButton.title = game.i18n.localize("PF2E.Repost");
      link.appendChild(newButton);
      newButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const target = event.target;
        if (!(target instanceof HTMLElement))
          return;
        const parent = target?.parentElement;
        if (!parent)
          return;
        const document2 = resolveDocument(target, foundryDoc);
        repostAction(parent, document2);
      });
    }
  }
  __name(injectRepostElement, "injectRepostElement");
  function flavorDamageRolls(html, actor = null) {
    for (const rollLink of htmlQueryAll(html, "a.inline-roll[data-damage-roll]")) {
      const itemId = htmlClosest(rollLink, "[data-item-id]")?.dataset.itemId;
      const item = actor?.items.get(itemId ?? "");
      if (item)
        rollLink.dataset.flavor ||= item.name;
    }
  }
  __name(flavorDamageRolls, "flavorDamageRolls");
  function makeRepostHtml(target, defaultVisibility) {
    const flavor = target.attributes.getNamedItem("data-pf2-repost-flavor")?.value ?? "";
    const showDC = target.attributes.getNamedItem("data-pf2-show-dc")?.value ?? defaultVisibility;
    return `<span data-visibility="${showDC}">${flavor}</span> ${target.outerHTML}`.trim();
  }
  __name(makeRepostHtml, "makeRepostHtml");
  function repostAction(target, foundryDoc = null) {
    if (!["pf2Action", "pf2Check", "pf2EffectArea"].some((d) => d in target.dataset)) {
      return;
    }
    const actor = resolveActor(foundryDoc, target);
    const defaultVisibility = (actor ?? foundryDoc)?.hasPlayerOwner ? "all" : "gm";
    const content = (() => {
      if (target.parentElement?.dataset?.pf2Checkgroup !== void 0) {
        const content2 = htmlQueryAll(target.parentElement, inlineSelector).map((target2) => makeRepostHtml(target2, defaultVisibility)).join("<br>");
        return `<div data-pf2-checkgroup>${content2}</div>`;
      } else {
        return makeRepostHtml(target, defaultVisibility);
      }
    })();
    const ChatMessagePF2e = getChatMessageClass();
    const speaker = actor ? ChatMessagePF2e.getSpeaker({ actor, token: actor.getActiveTokens(false, true).shift() }) : ChatMessagePF2e.getSpeaker();
    const message = game.messages.get(htmlClosest(target, "[data-message-id]")?.dataset.messageId ?? "");
    const flags = foundryDoc instanceof JournalEntry ? { pf2e: { journalEntry: foundryDoc.uuid } } : message?.flags.pf2e.origin ? { pf2e: { origin: deepClone(message.flags.pf2e.origin) } } : {};
    ChatMessagePF2e.create({
      speaker,
      content,
      flags
    });
  }
  __name(repostAction, "repostAction");
  function listenInlineRoll(html, foundryDoc) {
    foundryDoc ??= resolveDocument(html, foundryDoc);
    const links = htmlQueryAll(html, inlineSelector).filter((l) => ["A", "SPAN"].includes(l.nodeName));
    injectRepostElement(links, foundryDoc);
    flavorDamageRolls(html, foundryDoc instanceof Actor ? foundryDoc : null);
    for (const link of links.filter((l) => l.dataset.pf2Action)) {
      const { pf2Action, pf2Glyph, pf2Variant, pf2Dc, pf2ShowDc, pf2Skill } = link.dataset;
      link.addEventListener("click", (event) => {
        const action = game.pf2e.actions[pf2Action ? sluggify(pf2Action, { camel: "dromedary" }) : ""];
        const visibility = pf2ShowDc ?? "all";
        if (pf2Action && action) {
          action({
            event,
            glyph: pf2Glyph,
            variant: pf2Variant,
            difficultyClass: pf2Dc ? { scope: "check", value: Number(pf2Dc) || 0, visibility } : void 0,
            skill: pf2Skill
          });
        } else {
          console.warn(`PF2e System | Skip executing unknown action '${pf2Action}'`);
        }
      });
    }
    for (const link of links.filter((l) => l.dataset.pf2Check && !l.dataset.invalid)) {
      const { pf2Check, pf2Dc, pf2Traits, pf2Label, pf2Defense, pf2Adjustment, pf2Roller, pf2RollOptions } = link.dataset;
      if (!pf2Check)
        return;
      link.addEventListener("click", async (event) => {
        const parent = resolveActor(foundryDoc, link);
        const actors = [parent];
        const extraRollOptions = [
          ...pf2Traits?.split(",").map((o) => o.trim()) ?? [],
          ...pf2RollOptions?.split(",").map((o) => o.trim()) ?? []
        ];
        const eventRollParams = eventToRollParams(event);
        switch (pf2Check) {
          case "flat": {
            for (const actor of actors) {
              const flatCheck = new Statistic(actor, {
                label: "",
                slug: "flat",
                modifiers: [],
                check: { type: "flat-check" }
              });
              const dc = Number.isInteger(Number(pf2Dc)) ? { label: pf2Label, value: Number(pf2Dc) } : null;
              flatCheck.roll({ ...eventRollParams, extraRollOptions, dc });
            }
            break;
          }
          default: {
            const isSavingThrow = tupleHasValue(SAVE_TYPES, pf2Check);
            const traits = isSavingThrow ? [] : extraRollOptions.filter((t) => t in CONFIG.PF2E.actionTraits) ?? [];
            for (const actor of actors) {
              const statistic = (() => {
                if (pf2Check in CONFIG.PF2E.magicTraditions) {
                  const bestSpellcasting = actor.spellcasting.filter((c) => c.tradition === pf2Check).flatMap((s) => s.statistic ?? []).sort((a, b) => b.check.mod - a.check.mod).shift() ?? null;
                  if (bestSpellcasting)
                    return bestSpellcasting;
                }
                return actor.getStatistic(pf2Check);
              })();
              if (!statistic) {
                console.warn(ErrorPF2e(`Skip rolling unknown statistic ${pf2Check}`).message);
                continue;
              }
              const targetActor = pf2Defense ? game.user.targets.first()?.actor : null;
              const dcValue = (() => {
                const adjustment = Number(pf2Adjustment) || 0;
                if (pf2Dc === "@self.level") {
                  return calculateDC(actor.level) + adjustment;
                }
                return Number(pf2Dc ?? "NaN") + adjustment;
              })();
              const dc = (() => {
                if (Number.isInteger(dcValue)) {
                  return { label: pf2Label, value: dcValue };
                } else if (pf2Defense) {
                  const defenseStat = targetActor?.getStatistic(pf2Defense);
                  return defenseStat ? {
                    statistic: defenseStat.dc,
                    scope: "check",
                    value: defenseStat.dc.value
                  } : null;
                }
                return null;
              })();
              const item = (() => {
                const itemFromDoc = foundryDoc instanceof Item ? foundryDoc : foundryDoc instanceof ChatMessage ? foundryDoc.item : null;
                return itemFromDoc?.isOfType("action", "feat", "campaignFeature") || isSavingThrow && !itemFromDoc?.isOfType("weapon") ? itemFromDoc : null;
              })();
              const args = {
                ...eventRollParams,
                extraRollOptions,
                origin: isSavingThrow && parent instanceof Actor ? parent : null,
                dc,
                target: !isSavingThrow && dc?.statistic ? targetActor : null,
                item,
                traits
              };
              const itemIsEncounterAction = !!(item?.isOfType("action", "feat") && item.actionCost);
              if (itemIsEncounterAction && pf2Defense) {
                const subtitleLocKey = pf2Check in CONFIG.PF2E.magicTraditions ? "PF2E.ActionsCheck.spell" : statistic.check.type === "attack-roll" ? "PF2E.ActionsCheck.x-attack-roll" : "PF2E.ActionsCheck.x";
                args.label = await renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
                  glyph: getActionGlyph(item.actionCost),
                  subtitle: game.i18n.format(subtitleLocKey, { type: statistic.label }),
                  title: item.name
                });
              }
              statistic.roll(args);
            }
          }
        }
      });
    }
    const templateConversion = {
      burst: "circle",
      cone: "cone",
      cube: "rect",
      emanation: "circle",
      line: "ray",
      rect: "rect",
      square: "rect"
    };
    for (const link of links.filter((l) => l.hasAttribute("data-pf2-effect-area"))) {
      const { pf2EffectArea, pf2Distance, pf2TemplateData, pf2Traits, pf2Width } = link.dataset;
      link.addEventListener("click", () => {
        if (typeof pf2EffectArea !== "string") {
          console.warn(`PF2e System | Could not create template'`);
          return;
        }
        const templateData = JSON.parse(pf2TemplateData ?? "{}");
        templateData.distance ||= Number(pf2Distance);
        templateData.fillColor ||= game.user.color;
        templateData.t = templateConversion[pf2EffectArea];
        switch (templateData.t) {
          case "ray":
            templateData.width = Number(pf2Width) || CONFIG.MeasuredTemplate.defaults.width * (canvas.dimensions?.distance ?? 1);
            break;
          case "cone":
            templateData.angle = CONFIG.MeasuredTemplate.defaults.angle;
            break;
          case "rect": {
            const distance = templateData.distance ?? 0;
            templateData.distance = Math.hypot(distance, distance);
            templateData.width = distance;
            templateData.direction = 45;
            break;
          }
        }
        if (pf2Traits) {
          templateData.flags = {
            pf2e: {
              origin: {
                traits: pf2Traits.split(",")
              }
            }
          };
        }
        const templateDoc = new (getMeasuredTemplateDocumentClass())(templateData, { parent: canvas.scene });
        new (getMeasuredTemplateObjectClass())(templateDoc).drawPreview();
      });
    }
    for (const link of html.querySelectorAll("a[data-damage-roll]")) {
      link.dataset.itemUuid = foundryDoc.uuid;
    }
  }
  __name(listenInlineRoll, "listenInlineRoll");
  function resolveDocument(html, foundryDoc) {
    if (foundryDoc)
      return foundryDoc;
    const sheet = ui.windows[Number(html.closest(".app.sheet")?.dataset.appid)] ?? null;
    const document2 = sheet?.document;
    return document2 instanceof Actor || document2 instanceof JournalEntry ? document2 : null;
  }
  __name(resolveDocument, "resolveDocument");
  function resolveActor(foundryDoc, anchor) {
    if (isInstanceOf(foundryDoc, "ActorPF2e"))
      return foundryDoc;
    if (isInstanceOf(foundryDoc, "ItemPF2e") || isInstanceOf(foundryDoc, "ChatMessagePF2e"))
      return foundryDoc.actor;
    const itemUuid = anchor.dataset.itemUuid;
    const itemByUUID = itemUuid && !itemUuid.startsWith("Compendium.") ? fromUuidSync(itemUuid) : null;
    return itemByUUID instanceof Item ? itemByUUID.actor : null;
  }
  __name(resolveActor, "resolveActor");

  // src/shared.js
  var RANKS = ["U", "T", "E", "M", "L"];
  var COVER_UUID = "Compendium.pf2e.other-effects.Item.I9lfZUiCwMiGogVi";
  async function getItemSummary(el, actor) {
    const dataset = el.data();
    const item = dataset.itemId ? actor.items.get(dataset.itemId) : await fromUuid(dataset.uuid);
    const data = await item?.getChatData({ secrets: actor.isOwner }, dataset);
    if (!data)
      return;
    const description = document.createElement("div");
    description.classList.add("description");
    await actor.sheet.itemRenderer.renderItemSummary(description, item, data);
    listenInlineRoll(description, item);
    return description;
  }
  __name(getItemSummary, "getItemSummary");
  function addNameTooltipListeners(el) {
    el.on("mouseenter", (event) => {
      event.preventDefault();
      const target = event.currentTarget.querySelector(".name");
      const { width } = target.getBoundingClientRect();
      if (target.scrollWidth <= Math.ceil(width))
        return;
      const name = target.innerHTML.trim();
      game.tooltip.activate(event.currentTarget, { text: name });
    });
    el.on("mouseleave", (event) => {
      event.preventDefault();
      game.tooltip.deactivate();
    });
    el.on("mousedown", (event) => {
      game.tooltip.deactivate();
    });
  }
  __name(addNameTooltipListeners, "addNameTooltipListeners");
  function editItem(event, actor) {
    event.preventDefault();
    const item = getItemFromEvent(event, actor);
    item?.sheet.render(true, { focus: true });
  }
  __name(editItem, "editItem");
  async function deleteItem(event, actor) {
    event.preventDefault();
    const item = getItemFromEvent(event, actor);
    if (!item)
      return;
    if (event.ctrlKey)
      return item.delete();
    new Dialog({
      title: localize("deleteItem.title"),
      content: `<p>${game.i18n.format("PF2E.DeleteQuestion", { name: item.name })}</p>`,
      buttons: {
        ok: {
          icon: '<i class="fa-solid fa-trash"></i>',
          label: localize("deleteItem.ok"),
          callback: () => item.delete()
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: localize("deleteItem.cancel")
        }
      }
    }).render(true);
  }
  __name(deleteItem, "deleteItem");
  function getItemFromEvent(event, actor) {
    const { itemId } = event.currentTarget.closest("[data-item-id]").dataset;
    return actor.items.get(itemId);
  }
  __name(getItemFromEvent, "getItemFromEvent");
  function getMacros(actor) {
    return actor.isOwner ? getFlag(actor, `macros.${game.user.id}`)?.map((uuid) => {
      const macro = fromUuidSync(uuid);
      if (!macro)
        return null;
      return { img: macro.img, name: macro.name, uuid };
    }).filter(Boolean) : void 0;
  }
  __name(getMacros, "getMacros");
  function onDroppedMacro(event, actor) {
    const { type, uuid } = TextEditor.getDragEventData(event.originalEvent) ?? {};
    if (type !== "Macro" || !fromUuidSync(uuid))
      return;
    const flag = `macros.${game.user.id}`;
    const macros = getFlag(actor, flag)?.slice() ?? [];
    if (macros.includes(uuid))
      return;
    macros.push(uuid);
    setFlag(actor, flag, macros);
  }
  __name(onDroppedMacro, "onDroppedMacro");
  function deleteMacro(event, actor) {
    const flag = `macros.${game.user.id}`;
    const macros = getFlag(actor, flag)?.slice();
    if (!macros?.length)
      return;
    const { uuid } = event.currentTarget.closest(".macro").dataset;
    const index = macros.indexOf(uuid);
    if (index === -1)
      return;
    macros.splice(index, 1);
    setFlag(actor, flag, macros);
  }
  __name(deleteMacro, "deleteMacro");
  function getUniqueTarget(condition = () => true) {
    const targets = game.user.targets;
    const target = targets.size === 1 ? targets.first() : null;
    return target && condition(target) ? target : null;
  }
  __name(getUniqueTarget, "getUniqueTarget");
  function filterIn(value, filter) {
    if (!filter)
      return true;
    return value.toLowerCase().includes(filter);
  }
  __name(filterIn, "filterIn");
  function localeCompare(a, b) {
    return a.localeCompare(b, game.i18n.lang);
  }
  __name(localeCompare, "localeCompare");
  function getCoverEffect(actor) {
    return actor?.itemTypes.effect.find((effect) => effect.flags.core?.sourceId === COVER_UUID);
  }
  __name(getCoverEffect, "getCoverEffect");

  // src/popup.js
  async function popup(title, content, actor) {
    const hud2 = getHud();
    const el = hud2?.element;
    if (!el)
      return;
    el.find("> .popup").remove();
    const tmp = document.createElement("div");
    tmp.innerHTML = `<div class="popup">
    <div class="header">
        <div class="title">${title}</div>
        <a class="observable" data-action="close-popup"><i class="fas fa-times"></i> ${localize("popup.close")}</a>
    </div>
</div>`;
    const popup2 = tmp.firstElementChild;
    if (typeof content === "string") {
      content = await enrichHTML(content, actor);
      popup2.insertAdjacentHTML("beforeend", content);
    } else {
      popup2.append(content);
    }
    popup2.querySelector("[data-action=close-popup]").addEventListener("click", () => popup2.remove());
    el.append(popup2);
    hud2.lock();
  }
  __name(popup, "popup");
  async function showItemSummary(el, actor, title) {
    title ??= el.find(".name").html();
    const description = await getItemSummary(el, actor);
    if (description)
      popup(title.trim(), description, actor);
  }
  __name(showItemSummary, "showItemSummary");

  // src/pf2e/item.js
  async function unownedItemToMessage(event, item, actor, { rollMode = void 0, create = true, data = {} }) {
    const template = `systems/pf2e/templates/chat/${item.type}-card.hbs`;
    const token = actor.token;
    const nearestItem = event?.currentTarget.closest(".item") ?? {};
    const ChatMessagePF2e = getChatMessageClass();
    const contextualData = Object.keys(data).length > 0 ? data : nearestItem.dataset || {};
    const templateData = {
      actor,
      tokenId: token ? `${token.parent?.id}.${token.id}` : null,
      item,
      data: await item.getChatData(void 0, contextualData)
    };
    const chatData = {
      speaker: ChatMessagePF2e.getSpeaker({
        actor,
        token: actor.getActiveTokens(false, true)[0] ?? null
      }),
      flags: {
        core: {
          canPopout: true
        },
        pf2e: {
          origin: { uuid: item.uuid, type: item.type }
        }
      },
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    };
    rollMode ??= event?.ctrlKey || event?.metaKey ? "blindroll" : game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode))
      chatData.whisper = ChatMessagePF2e.getWhisperRecipients("GM").map((u) => u.id);
    if (rollMode === "blindroll")
      chatData.blind = true;
    chatData.content = await renderTemplate(template, templateData);
    return create ? ChatMessagePF2e.create(chatData, { renderSheet: false }) : new ChatMessagePF2e(chatData);
  }
  __name(unownedItemToMessage, "unownedItemToMessage");
  async function createSelfEffectMessage(item) {
    if (!item.system.selfEffect) {
      throw ErrorPF2e(
        [
          "Only actions with self-applied effects can be passed to `ActorPF2e#useAction`.",
          "Support will be expanded at a later time."
        ].join(" ")
      );
    }
    const { actor, actionCost } = item;
    const token = actor.getActiveTokens(true, true).shift() ?? null;
    const ChatMessagePF2e = getChatMessageClass();
    const speaker = ChatMessagePF2e.getSpeaker({ actor, token });
    const flavor = await renderTemplate("systems/pf2e/templates/chat/action/flavor.hbs", {
      action: {
        glyph: getActionGlyph(actionCost),
        title: item.name
      },
      item,
      traits: item.system.traits.value.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits))
    });
    const previewLength = 100;
    const descriptionPreview = (() => {
      if (item.actor.pack)
        return null;
      const tempDiv = document.createElement("div");
      const documentTypes = [...CONST.DOCUMENT_LINK_TYPES, "Compendium", "UUID"];
      const linkPattern = new RegExp(`@(${documentTypes.join("|")})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, "g");
      tempDiv.innerHTML = item.description.replace(linkPattern, (_match, ...args) => args[3]);
      return tempDiv.innerText.slice(0, previewLength);
    })();
    const description = {
      full: descriptionPreview && descriptionPreview.length < previewLength ? item.description : null,
      preview: descriptionPreview
    };
    const content = await renderTemplate("systems/pf2e/templates/chat/action/self-effect.hbs", {
      actor: item.actor,
      description
    });
    const flags = { pf2e: { context: { type: "self-effect", item: item.id } } };
    return ChatMessagePF2e.create({ speaker, flavor, content, flags });
  }
  __name(createSelfEffectMessage, "createSelfEffectMessage");

  // src/pf2e/weapon.js
  async function toggleWeaponTrait({ weapon, trait, selection }) {
    const current = weapon.system.traits.toggles[trait].selection;
    if (current === selection)
      return false;
    const item = weapon.actor?.items.get(weapon.id);
    if (item?.isOfType("weapon") && item === weapon) {
      await item.update({ [`system.traits.toggles.${trait}.selection`]: selection });
    } else if (item?.isOfType("weapon") && weapon.altUsageType === "melee") {
      await item.update({ [`system.meleeUsage.traitToggles.${trait}`]: selection });
    } else {
      const rule = item?.rules.find((r) => r.key === "Strike" && !r.ignored && r.slug === weapon.slug);
      await rule?.toggleTrait({ trait, selection });
    }
    return true;
  }
  __name(toggleWeaponTrait, "toggleWeaponTrait");

  // src/pf2e/success.js
  var DEGREE_OF_SUCCESS = {
    CRITICAL_FAILURE: 0,
    FAILURE: 1,
    SUCCESS: 2,
    CRITICAL_SUCCESS: 3
  };
  var DEGREE_ADJUSTMENT_AMOUNTS = {
    LOWER_BY_TWO: -2,
    LOWER: -1,
    INCREASE: 1,
    INCREASE_BY_TWO: 2,
    TO_CRITICAL_FAILURE: "criticalFailure",
    TO_FAILURE: "failure",
    TO_SUCCESS: "success",
    TO_CRITICAL_SUCCESS: "criticalSuccess"
  };
  function adjustDegreeOfSuccess(amount, degreeOfSuccess) {
    switch (amount) {
      case "criticalFailure":
        return 0;
      case "failure":
        return 1;
      case "success":
        return 2;
      case "criticalSuccess":
        return 3;
      default:
        return Math.clamped(degreeOfSuccess + amount, 0, 3);
    }
  }
  __name(adjustDegreeOfSuccess, "adjustDegreeOfSuccess");
  function adjustDegreeByDieValue(dieResult, degree) {
    if (dieResult === 20) {
      return adjustDegreeOfSuccess(DEGREE_ADJUSTMENT_AMOUNTS.INCREASE, degree);
    } else if (dieResult === 1) {
      return adjustDegreeOfSuccess(DEGREE_ADJUSTMENT_AMOUNTS.LOWER, degree);
    }
    return degree;
  }
  __name(adjustDegreeByDieValue, "adjustDegreeByDieValue");
  function calculateDegreeOfSuccess(rollTotal, dieResult, dc) {
    if (rollTotal - dc >= 10) {
      return adjustDegreeByDieValue(dieResult, DEGREE_OF_SUCCESS.CRITICAL_SUCCESS);
    } else if (dc - rollTotal >= 10) {
      return adjustDegreeByDieValue(dieResult, DEGREE_OF_SUCCESS.CRITICAL_FAILURE);
    } else if (rollTotal >= dc) {
      return adjustDegreeByDieValue(dieResult, DEGREE_OF_SUCCESS.SUCCESS);
    }
    return adjustDegreeByDieValue(dieResult, DEGREE_OF_SUCCESS.FAILURE);
  }
  __name(calculateDegreeOfSuccess, "calculateDegreeOfSuccess");

  // src/actions/recall-knowledge.js
  var SKILLS = ["arcana", "crafting", "medicine", "nature", "occultism", "religion", "society"];
  var SUCCESS = {
    0: { icon: '<i class="fa-solid fa-xmark-large"></i><i class="fa-solid fa-xmark-large"></i>', name: "criticalFailure" },
    1: { icon: '<i class="fa-solid fa-xmark-large"></i>', name: "failure" },
    2: { icon: '<i class="fa-solid fa-check"></i>', name: "success" },
    3: { icon: '<i class="fa-solid fa-check"></i><i class="fa-solid fa-check"></i>', name: "criticalSuccess" }
  };
  async function rollRecallKnowledges(actor) {
    const roll = await new Roll("1d20").evaluate({ async: true });
    const dieResult = roll.dice[0].total;
    const dieSuccess = dieResult === 1 ? "0" : dieResult === 20 ? "3" : "";
    const lores = Object.values(actor.skills).filter((skill) => skill.lore);
    const target = getUniqueTarget((target2) => target2.actor?.identificationDCs)?.actor;
    let data = {
      dieSuccess,
      dieResult,
      target,
      i18n: (str) => localize(`actions.recall-knowledge.${str}`)
    };
    if (target) {
      const { standard, skills, lore } = target.identificationDCs;
      let skillsDCs = standard.progression.slice();
      skillsDCs.length = 4;
      skillsDCs = [...skillsDCs];
      const loresDCs = lore.map(({ progression }) => {
        let dcs = progression;
        dcs.length = 6;
        return [...dcs];
      });
      data.skillsDCs = skillsDCs;
      data.loresDCs = loresDCs;
      data.skills = await Promise.all(
        skills.map((slug) => {
          const skill = actor.skills[slug];
          return rollSkill(skill, dieResult, skillsDCs);
        })
      );
      data.lores = await Promise.all(lores.map((lore2) => rollSkill(lore2, dieResult)));
    } else {
      data.skills = await Promise.all(
        [...SKILLS.map((slug) => actor.skills[slug]), ...lores].map((skill) => rollSkill(skill, dieResult))
      );
    }
    const flavor = await renderTemplate(templatePath("chat/recall-knowledge"), data);
    ChatMessage.create({
      flavor,
      speaker: ChatMessage.getSpeaker({ actor }),
      rollMode: CONST.DICE_ROLL_MODES.BLIND,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL
    });
  }
  __name(rollRecallKnowledges, "rollRecallKnowledges");
  async function rollSkill(skill, dieResult, dcs) {
    const { rank, label } = skill;
    const roll = await skill.roll({
      createMessage: false,
      skipDialog: true,
      extraRollOptions: ["action:recall-knowledge"]
    });
    const mod = roll.total - roll.dice[0].total;
    const total = dieResult + mod;
    return {
      mod,
      rank,
      label,
      total,
      modifier: modifier(mod),
      rankLabel: RANKS[rank],
      checks: dcs?.map((dc) => {
        if (!dc)
          return `-`;
        const success = calculateDegreeOfSuccess(total, dieResult, dc);
        return {
          success,
          icon: SUCCESS[success].icon,
          title: SUCCESS[success].name
        };
      })
    };
  }
  __name(rollSkill, "rollSkill");

  // src/sidebars/skills.js
  var MODULE_ID = "pf2e-token-hud";
  var UNTRAINED_IMPROVISATION = "Compendium.pf2e.feats-srd.Item.9jGaBxLUtevZYcZO";
  var CROWBAR_UUIDS = /* @__PURE__ */ new Set([
    "Compendium.pf2e.equipment-srd.Item.44F1mfJei4GY8f2X",
    "Compendium.pf2e.equipment-srd.Item.4kz3vhkKPUuXBpxk"
  ]);
  var BON_MOT_UUID = "Compendium.pf2e.feats-srd.Item.0GF2j54roPFIDmXf";
  var NATURAL_MEDICINE_UUID = "Compendium.pf2e.feats-srd.Item.WC4xLBGmBsdOdHWu";
  var FOLLOW_THE_EXPERT_UUID = "Compendium.pf2e.other-effects.Item.VCSpuc3Tf3XWMkd3";
  var LABELS = {
    initiative: "PF2E.InitiativeLabel",
    "recall-knowledge": "PF2E.RecallKnowledge.Label",
    "cover-tracks": "PF2E.TravelSpeed.ExplorationActivities.CoverTracks",
    earnIncome: `${MODULE_ID}.skills.actions.earnIncome`,
    treatWounds: `${MODULE_ID}.skills.actions.treatWounds`,
    "borrow-arcane-spell": `${MODULE_ID}.skills.actions.borrow-arcane-spell`,
    "identify-magic": `${MODULE_ID}.skills.actions.identify-magic`,
    "identify-alchemy": `${MODULE_ID}.skills.actions.identify-alchemy`,
    "learn-spell": `${MODULE_ID}.skills.actions.learn-spell`,
    "crafting-goods": `${MODULE_ID}.skills.actions.crafting-goods`,
    "staging-performance": `${MODULE_ID}.skills.actions.staging-performance`
  };
  var ACTIONS_UUIDS = {
    aid: "Compendium.pf2e.actionspf2e.Item.HCl3pzVefiv9ZKQW",
    "sense-motive": "Compendium.pf2e.actionspf2e.Item.1xRFPTFtWtGJ9ELw",
    seek: "Compendium.pf2e.actionspf2e.Item.BlAOM2X92SI6HMtJ",
    balance: "Compendium.pf2e.actionspf2e.Item.M76ycLAqHoAgbcej",
    escape: "Compendium.pf2e.actionspf2e.Item.SkZAQRkLLkmBQNB9",
    "follow-the-expert": "Compendium.pf2e.actionspf2e.Item.tfa4Sh7wcxCEqL29",
    "tumble-through": "Compendium.pf2e.actionspf2e.Item.21WIfSu7Xd7uKqV8",
    "maneuver-in-flight": "Compendium.pf2e.actionspf2e.Item.Qf1ylAbdVi1rkc8M",
    squeeze: "Compendium.pf2e.actionspf2e.Item.kMcV8e5EZUxa6evt",
    "recall-knowledge": "Compendium.pf2e.actionspf2e.Item.1OagaWtBpVXExToo",
    "borrow-arcane-spell": "Compendium.pf2e.actionspf2e.Item.OizxuPb44g3eHPFh",
    "decipher-writing": "Compendium.pf2e.actionspf2e.Item.d9gbpiQjChYDYA2L",
    "identify-magic": "Compendium.pf2e.actionspf2e.Item.eReSHVEPCsdkSL4G",
    "learn-spell": "Compendium.pf2e.actionspf2e.Item.Q5iIYCFdqJFM31GW",
    climb: "Compendium.pf2e.actionspf2e.Item.pprgrYQ1QnIDGZiy",
    forceOpen: "Compendium.pf2e.actionspf2e.Item.SjmKHgI7a5Z9JzBx",
    grapple: "Compendium.pf2e.actionspf2e.Item.PMbdMWc2QroouFGD",
    highJump: "Compendium.pf2e.actionspf2e.Item.2HJ4yuEFY1Cast4h",
    longJump: "Compendium.pf2e.actionspf2e.Item.JUvAvruz7yRQXfz2",
    reposition: "Compendium.pf2e.actionspf2e.Item.lOE4yjUnETTdaf2T",
    shove: "Compendium.pf2e.actionspf2e.Item.7blmbDrQFNfdT731",
    swim: "Compendium.pf2e.actionspf2e.Item.c8TGiZ48ygoSPofx",
    trip: "Compendium.pf2e.actionspf2e.Item.ge56Lu1xXVFYUnLP",
    disarm: "Compendium.pf2e.actionspf2e.Item.Dt6B1slsBy8ipJu9",
    repair: "Compendium.pf2e.actionspf2e.Item.bT3skovyLUtP22ME",
    craft: "Compendium.pf2e.actionspf2e.Item.rmwa3OyhTZ2i2AHl",
    "crafting-goods": "",
    earnIncome: "Compendium.pf2e.actionspf2e.Item.QyzlsLrqM0EEwd7j",
    "identify-alchemy": "Compendium.pf2e.actionspf2e.Item.Q4kdWVOf2ztIBFg1",
    createADiversion: "Compendium.pf2e.actionspf2e.Item.GkmbTGfg8KcgynOA",
    impersonate: "Compendium.pf2e.actionspf2e.Item.AJstokjdG6iDjVjE",
    lie: "Compendium.pf2e.actionspf2e.Item.ewwCglB7XOPLUz72",
    feint: "Compendium.pf2e.actionspf2e.Item.QNAVeNKtHA0EUw4X",
    bonMot: BON_MOT_UUID,
    gatherInformation: "Compendium.pf2e.actionspf2e.Item.plBGdZhqq5JBl1D8",
    makeAnImpression: "Compendium.pf2e.actionspf2e.Item.OX4fy22hQgUHDr0q",
    request: "Compendium.pf2e.actionspf2e.Item.DCb62iCBrJXy0Ik6",
    coerce: "Compendium.pf2e.actionspf2e.Item.tHCqgwjtQtzNqVvd",
    demoralize: "Compendium.pf2e.actionspf2e.Item.2u915NdUyQan6uKF",
    "administer-first-aid": "Compendium.pf2e.actionspf2e.Item.MHLuKy4nQO2Z4Am1",
    "treat-disease": "Compendium.pf2e.actionspf2e.Item.TC7OcDa7JlWbqMaN",
    "treat-poison": "Compendium.pf2e.actionspf2e.Item.KjoCEEmPGTeFE4hh",
    treatWounds: "Compendium.pf2e.actionspf2e.Item.1kGNdIIhuglAjIp9",
    "command-an-animal": "Compendium.pf2e.actionspf2e.Item.q9nbyIF0PEBqMtYe",
    perform: "Compendium.pf2e.actionspf2e.Item.EEDElIyin4z60PXx",
    "staging-performance": "",
    subsist: "Compendium.pf2e.actionspf2e.Item.49y9Ec4bDii8pcD3",
    "create-forgery": "Compendium.pf2e.actionspf2e.Item.ftG89SjTSa9DYDOD",
    "conceal-an-object": "Compendium.pf2e.actionspf2e.Item.qVNVSmsgpKFGk9hV",
    hide: "Compendium.pf2e.actionspf2e.Item.XMcnh4cSI32tljXa",
    sneak: "Compendium.pf2e.actionspf2e.Item.VMozDqMMuK5kpoX4",
    senseDirection: "Compendium.pf2e.actionspf2e.Item.fJImDBQfqfjKJOhk",
    "cover-tracks": "Compendium.pf2e.actionspf2e.Item.SB7cMECVtE06kByk",
    track: "Compendium.pf2e.actionspf2e.Item.EA5vuSgJfiHH7plD",
    "palm-an-object": "Compendium.pf2e.actionspf2e.Item.ijZ0DDFpMkWqaShd",
    steal: "Compendium.pf2e.actionspf2e.Item.RDXXE7wMrSPCLv5k",
    "disable-device": "Compendium.pf2e.actionspf2e.Item.cYdz2grcOcRt4jk6",
    "pick-a-lock": "Compendium.pf2e.actionspf2e.Item.2EE4aF4SZpYf0R6H"
  };
  var DUPLICATE_SKILLS = {
    escape: { slug: "escape", cost: "1", type: 2, noSkill: true },
    "recall-knowledge": { slug: "recall-knowledge", cost: "1", secret: true },
    "decipher-writing": { slug: "decipher-writing", type: 2, trained: true },
    "identify-magic": { slug: "identify-magic", trained: true },
    "learn-spell": { slug: "learn-spell", trained: true }
  };
  var SKILLS2 = [
    {
      slug: "perception",
      actions: [
        { slug: "sense-motive", cost: "1", type: 2 },
        { slug: "seek", cost: "1", type: 2 }
      ]
    },
    {
      slug: "acrobatics",
      actions: [
        { slug: "balance", cost: "1", type: 2 },
        // 'escape',
        { slug: "tumble-through", cost: "1", type: 2 },
        { slug: "maneuver-in-flight", cost: "1", type: 2, trained: true },
        { slug: "squeeze", type: 2, trained: true }
      ]
    },
    {
      slug: "arcana",
      actions: [
        // 'recall-knowledge',
        { slug: "borrow-arcane-spell", trained: true },
        "decipher-writing",
        "identify-magic",
        "learn-spell"
      ]
    },
    {
      slug: "athletics",
      actions: [
        { slug: "climb", cost: "1", type: 1 },
        // 'escape',
        {
          slug: "forceOpen",
          cost: "1",
          type: 1,
          map: true,
          modifiers: [
            {
              condition: (actor) => !actor.itemTypes.equipment.some((item) => item.isHeld && CROWBAR_UUIDS.has(item.sourceId)),
              modifiers: [
                {
                  slug: "crowbar-missing",
                  modifier: -2,
                  type: "circumstance"
                }
              ]
            }
          ]
        },
        { slug: "grapple", cost: "1", type: 1, map: true },
        { slug: "highJump", cost: "1", type: 1 },
        { slug: "longJump", cost: "1", type: 1 },
        { slug: "reposition", cost: "1", type: 2, map: true },
        { slug: "shove", cost: "1", type: 1, map: true },
        { slug: "swim", cost: "1", type: 1 },
        { slug: "trip", cost: "1", type: 2, map: true },
        { slug: "disarm", cost: "1", type: 1, map: true, trained: true }
      ]
    },
    {
      slug: "crafting",
      actions: [
        // 'recall-knowledge',
        { slug: "repair", type: 1 },
        { slug: "craft", type: 1, trained: true },
        { slug: "crafting-goods", trained: true },
        { slug: "earnIncome", type: 3, trained: true },
        { slug: "identify-alchemy", trained: true }
      ]
    },
    {
      slug: "deception",
      actions: [
        { slug: "createADiversion", cost: "1", type: 1, variants: ["distracting-words", "gesture", "trick"] },
        { slug: "impersonate", type: 1 },
        { slug: "lie", type: 1 },
        { slug: "feint", cost: "1", type: 1, trained: true }
      ]
    },
    {
      slug: "diplomacy",
      actions: [
        {
          slug: "bonMot",
          cost: "1",
          type: 1,
          condition: (actor) => hasFeat(actor, BON_MOT_UUID)
        },
        { slug: "gatherInformation", type: 1 },
        { slug: "makeAnImpression", type: 1 },
        { slug: "request", cost: "1", type: 1 }
      ]
    },
    {
      slug: "intimidation",
      actions: [
        { slug: "coerce", type: 2 },
        { slug: "demoralize", cost: "1", type: 2 }
      ]
    },
    {
      slug: "medicine",
      actions: [
        {
          slug: "administer-first-aid",
          cost: "2",
          type: 2,
          variants: ["stabilize", "stop-bleeding"],
          rollOption: "administer-first-aid"
        },
        { slug: "treat-disease", type: 2, trained: true },
        { slug: "treat-poison", cost: "1", type: 2, trained: true },
        { slug: "treatWounds", type: 1, trained: true }
      ]
    },
    {
      slug: "nature",
      actions: [
        { slug: "command-an-animal", cost: "1", type: 2 },
        //
        // 'recall-knowledge',
        "identify-magic",
        "learn-spell",
        { slug: "treatWounds", type: 1, trained: true, condition: (actor) => hasFeat(actor, NATURAL_MEDICINE_UUID) }
      ]
    },
    {
      slug: "occultism",
      actions: [
        // 'recall-knowledge', //
        "decipher-writing",
        "identify-magic",
        "learn-spell"
      ]
    },
    {
      slug: "performance",
      actions: [
        {
          slug: "perform",
          cost: "1",
          type: 1,
          variants: ["acting", "comedy", "dance", "keyboards", "oratory", "percussion", "singing", "strings", "winds"]
        },
        { slug: "staging-performance", trained: true }
      ]
    },
    {
      slug: "religion",
      actions: [
        // 'recall-knowledge', //
        "decipher-writing",
        "identify-magic",
        "learn-spell"
      ]
    },
    {
      slug: "society",
      actions: [
        // 'recall-knowledge', //
        { slug: "subsist", type: 2 },
        { slug: "create-forgery", type: 2, trained: true },
        "decipher-writing"
      ]
    },
    {
      slug: "stealth",
      actions: [
        { slug: "conceal-an-object", cost: "1", type: 2 },
        { slug: "hide", cost: "1", type: 2 },
        { slug: "sneak", cost: "1", type: 2 }
      ]
    },
    {
      slug: "survival",
      actions: [
        { slug: "senseDirection", type: 1 },
        { slug: "subsist", type: 2 },
        { slug: "cover-tracks", trained: true },
        { slug: "track", type: 1, trained: true }
      ]
    },
    {
      slug: "thievery",
      actions: [
        { slug: "palm-an-object", cost: "1", type: 2 },
        { slug: "steal", cost: "1", type: 2 },
        { slug: "disable-device", cost: "2", type: 2, trained: true },
        { slug: "pick-a-lock", cost: "2", type: 2, trained: true }
      ]
    }
  ];
  SKILLS2.forEach((skill) => {
    skill.actions = skill.actions.map((action) => typeof action === "string" ? DUPLICATE_SKILLS[action] : action);
    const { slug, actions } = skill;
    for (let action of actions) {
      const unslugged = action.slug.replace(/-(.)/g, (_, c) => c.toUpperCase()).capitalize();
      action.skillSlug = slug;
      action.uuid = ACTIONS_UUIDS[action.slug];
      action.label = LABELS[action.slug] ?? `PF2E.Actions.${unslugged}.Title`;
      if (action.variants) {
        action.variants = action.variants.map((variant) => ({
          slug: variant,
          label: `${MODULE_ID}.skills.actions.${variant}`
        }));
      } else if (action.map) {
        action.variants = [
          { label: "PF2E.Roll.Normal" },
          { label: "PF2E.MAPAbbreviationLabel", map: -5 },
          { label: "PF2E.MAPAbbreviationLabel", map: -10 }
        ];
      }
      action.modifiers?.forEach(({ modifiers }) => {
        modifiers.forEach((modifier2) => {
          modifier2.label = `${MODULE_ID}.skills.modifiers.${modifier2.slug}`;
        });
      });
    }
  });
  var SKILLS_SLUGS = SKILLS2.map((skill) => skill.slug);
  var SKILLS_MAP = SKILLS2.reduce((skills, { slug, actions }) => {
    skills[slug] = {
      slug,
      actions: actions.reduce((actions2, action) => {
        actions2[action.slug] = action;
        return actions2;
      }, {})
    };
    return skills;
  }, {});
  var skillActionsUUIDS = new Set(Object.values(ACTIONS_UUIDS).filter(Boolean));
  function getSkillLabel(slug) {
    return game.i18n.localize(slug === "perception" ? "PF2E.PerceptionLabel" : CONFIG.PF2E.skillList[slug]);
  }
  __name(getSkillLabel, "getSkillLabel");
  async function getSkillsData({ actor, filter }) {
    const skills = [];
    const isCharacter = actor.isOfType("character");
    const noUntrained = isCharacter && getSetting("untrained") && !actor.itemTypes.feat.some((feat) => feat.sourceId === UNTRAINED_IMPROVISATION);
    for (let i = 0; i < SKILLS2.length; i++) {
      const { slug, actions } = SKILLS2[i];
      const { label, rank, mod } = actor.getStatistic(slug);
      const name = game.i18n.localize(label);
      const actionsList = actions.filter(
        ({ condition, trained }) => (!noUntrained || !isCharacter || !trained || actor.skills[slug].rank >= 1) && (!condition || condition(actor))
      ).map((action) => ({
        ...action,
        name: game.i18n.localize(action.label),
        variants: action.variants?.map((variant) => ({
          ...variant,
          name: game.i18n.localize(variant.label)
        }))
      }));
      const passedFilter = filterIn(name, filter);
      let filteredActions = actionsList;
      if (!passedFilter) {
        filteredActions = actionsList.filter(
          ({ name: name2, variants }) => filterIn(name2, filter) || variants?.some((variant) => filterIn(variant.name, filter))
        );
        if (!filteredActions.length)
          continue;
      }
      skills[i] = {
        slug,
        name,
        rank,
        modifier: modifier(mod),
        actions: passedFilter ? actionsList : filteredActions
      };
    }
    skills.sort((a, b) => a.slug === "perception" ? -1 : b.slug === "perception" ? 1 : localeCompare(a.name, b.name));
    const lores = Object.values(actor.skills).filter(({ lore, label }) => lore && filterIn(label, filter)).map(({ label, rank, mod, slug }) => ({
      slug,
      label,
      rank,
      modifier: modifier(mod)
    }));
    const loresModifierWidth = lores.reduce((width, lore) => lore.modifier.length > width ? lore.modifier.length : width, 2);
    return {
      contentData: {
        follow: localize(`skills.actions.${isFollowingAnExpert(actor) ? "following" : "follow"}`),
        skills,
        lores,
        loresModifierWidth
      },
      doubled: getSetting("skills-columns")
    };
  }
  __name(getSkillsData, "getSkillsData");
  function addSkillsListeners({ el, actor, token, hud: hud2 }) {
    el.find("[data-action=action-description]").on("click", (event) => {
      event.preventDefault();
      const action = $(event.currentTarget).closest(".action");
      showItemSummary(action, actor, action.find(".name").children().html());
    });
    if (!actor.isOwner)
      return;
    el.find("[data-action=follow-the-expert]").on("click", async (event) => {
      event.preventDefault();
      const following = isFollowingAnExpert(actor);
      if (following)
        return await following.delete();
      const source = (await fromUuid(FOLLOW_THE_EXPERT_UUID)).toObject();
      setProperty(source, "flags.core.sourceId", FOLLOW_THE_EXPERT_UUID);
      await actor.createEmbeddedDocuments("Item", [source]);
    });
    el.find("[data-action=roll-skill]").on("click", (event) => {
      event.preventDefault();
      const { slug } = event.currentTarget.dataset;
      actor.getStatistic(slug)?.roll({ event });
    });
    el.find("[data-action=roll-action]").on("click contextmenu", async (event) => {
      event.preventDefault();
      const target = $(event.currentTarget);
      const { skillSlug, slug } = target.closest(".action").data();
      const { variant, map } = target.data();
      const variants = event.type === "contextmenu" ? await variantsDialog(skillSlug) : void 0;
      if (variants !== null)
        rollAction({ event, actor, token, skillSlug, slug, variant, map, skill: variants?.selected });
    });
    el.find("[data-action=action-chat]").on("click", async (event) => {
      event.preventDefault();
      const { uuid } = event.currentTarget.closest(".action").dataset;
      const item = await fromUuid(uuid);
      if (!item)
        return;
      unownedItemToMessage(event, item, actor, { create: true });
      if (getSetting("chat-close"))
        hud2.close();
    });
  }
  __name(addSkillsListeners, "addSkillsListeners");
  function isFollowingAnExpert(actor) {
    return actor.itemTypes.effect.find((effect) => effect.sourceId === FOLLOW_THE_EXPERT_UUID);
  }
  __name(isFollowingAnExpert, "isFollowingAnExpert");
  async function variantsDialog(base, dc) {
    const skills = SKILLS_SLUGS.map((slug) => ({ slug, label: getSkillLabel(slug) }));
    const content = await renderTemplate(templatePath("dialogs/variant"), {
      i18n: (str) => localize(`skills.variant.${str}`),
      dc,
      skills,
      selected: base
    });
    return Dialog.prompt({
      title: localize("skills.variant.title"),
      label: localize("skills.variant.button"),
      callback: (html) => ({ selected: html.find("select").val(), dc: Number(html.find("input").val()) }),
      rejectClose: false,
      content,
      options: { width: 280 }
    });
  }
  __name(variantsDialog, "variantsDialog");
  function rollAction({ event, actor, skillSlug, slug, variant, map, skill, token }) {
    const action = SKILLS_MAP[skillSlug].actions[slug];
    const type = action.type === 3 ? 3 : game.pf2e.actions.has(slug) ? 2 : 1;
    skill ??= action.noSkill ? void 0 : skillSlug;
    const rollOptions = action.rollOption ? [`action:${action.rollOption}`] : void 0;
    if (rollOptions && variant)
      rollOptions.push(`action:${action.rollOption}:${variant}`);
    const options = {
      event,
      actors: [actor],
      tokens: [token],
      variant,
      rollOptions,
      rollMode: action.secret ? "blindroll" : "roll"
    };
    options.modifiers = [];
    if (action.modifiers) {
      for (const { condition, modifiers } of action.modifiers) {
        if (condition && !condition(actor))
          continue;
        for (const modifier2 of modifiers) {
          options.modifiers.push(new game.pf2e.Modifier(modifier2));
        }
      }
    }
    if (action.custom) {
      action.custom(actor, options);
      return;
    } else if (!type) {
      actor.getStatistic(skill)?.roll(options);
      return;
    }
    if (type === 1) {
      options.skill = skill;
      if (map)
        options.modifiers.push(new game.pf2e.Modifier({ label: "PF2E.MultipleAttackPenalty", modifier: map }));
      game.pf2e.actions[slug](options);
    } else if (type === 2) {
      options.statistic = skill;
      if (map)
        options.multipleAttackPenalty = map / -5;
      game.pf2e.actions.get(slug).use(options);
    } else if (type === 3) {
      game.pf2e.actions[slug](actor);
    }
  }
  __name(rollAction, "rollAction");

  // src/sidebars/extras.js
  var extrasUUIDS = {
    aid: "Compendium.pf2e.actionspf2e.Item.HCl3pzVefiv9ZKQW",
    escape: "Compendium.pf2e.actionspf2e.Item.SkZAQRkLLkmBQNB9",
    "recall-knowledge": "Compendium.pf2e.actionspf2e.Item.1OagaWtBpVXExToo",
    "point-out": "Compendium.pf2e.actionspf2e.Item.sn2hIy1iIJX9Vpgj"
  };
  async function getExtrasData({ actor, filter }) {
    const { attributes } = actor;
    const { initiative } = attributes;
    return {
      contentData: {
        noMacro: localize("extras.no-macro"),
        macros: getMacros(actor)?.filter((macro) => filterIn(macro.name, filter)),
        initiative: initiative && {
          selected: initiative.statistic,
          skills: SKILLS_SLUGS.map((slug) => ({ slug, label: getSkillLabel(slug) }))
        },
        hasDailies: game.modules.get("pf2e-dailies")?.active,
        hasPerception: game.modules.get("pf2e-perception")?.active,
        uuids: extrasUUIDS
      }
    };
  }
  __name(getExtrasData, "getExtrasData");
  function addExtrasListeners({ el, actor, token, hud: hud2 }) {
    function action(action2, callback, type = "click") {
      el.find(`[data-action=${action2}]`).on(type, (event) => {
        event.preventDefault();
        callback(event);
      });
    }
    __name(action, "action");
    action("action-description", (event) => {
      const action2 = $(event.currentTarget).closest(".row");
      showItemSummary(action2, actor);
    });
    if (!actor.isOwner)
      return;
    addNameTooltipListeners(el.find(".macro"));
    async function getMacro(event) {
      const { uuid } = event.currentTarget.closest(".macro").dataset;
      return fromUuid(uuid);
    }
    __name(getMacro, "getMacro");
    action("delete-macro", (event) => deleteMacro(event, actor));
    action("edit-macro", async (event) => {
      const macro = await getMacro(event);
      macro?.sheet.render(true);
    });
    action("use-macro", async (event) => {
      const macro = await getMacro(event);
      macro?.execute({ actor, token });
    });
    el.on("drop", (event) => onDroppedMacro(event, actor));
    action("action-chat", async (event) => {
      const { uuid } = event.currentTarget.closest(".row").dataset;
      const item = await fromUuid(uuid);
      if (!item)
        return;
      unownedItemToMessage(event, item, actor, { create: true });
      if (getSetting("chat-close"))
        hud2.close();
    });
    el.find("input[name], select[name]").on("change", async (event) => {
      const target = event.currentTarget;
      const value = target.type === "number" ? target.valueAsNumber : target.value;
      await actor.update({ [target.name]: value });
    });
    action("roll-initiative", async (event) => {
      await actor.initiative.roll({ event });
    });
    action("prepare-dailies", (event) => {
      const dailies = game.modules.get("pf2e-dailies");
      if (dailies?.active)
        dailies.api.openDailiesInterface(actor);
    });
    action("rest-for-the-night", (event) => {
      game.pf2e.actions.restForTheNight({ actors: [actor], tokens: [token] });
    });
    action("roll-recall-knowledge", (event) => {
      rollRecallKnowledges(actor);
    });
    action(
      "roll-aid",
      async (event) => {
        const variants = await variantsDialog(null, 15);
        const note = { text: "@UUID[Compendium.pf2e.other-effects.Item.AHMUpMbaVkZ5A1KX]" };
        if (variants !== null) {
          game.pf2e.actions.get("aid").use({
            event,
            actors: [actor],
            tokens: [token],
            statistic: variants?.selected,
            difficultyClass: { value: variants?.dc },
            notes: [note]
          });
        }
      },
      "click contextmenu"
    );
    action("roll-point-out", (event) => {
      game.pf2e.actions.get("point-out").use({ event, actors: [actor], tokens: [token] });
    });
    action(
      "roll-escape",
      async (event) => {
        const variants = event.type === "contextmenu" ? await variantsDialog() : void 0;
        const multipleAttackPenalty = $(event.currentTarget).data().map;
        if (variants === null)
          return;
        game.pf2e.actions.get("escape").use({ event, actors: [actor], tokens: [token], statistic: variants?.selected, multipleAttackPenalty });
      },
      "click contextmenu"
    );
  }
  __name(addExtrasListeners, "addExtrasListeners");

  // src/sidebars/actions.js
  var SECTIONS_TYPES = {
    action: { order: 0, label: "PF2E.ActionsActionsHeader", actionLabel: "PF2E.ActionTypeAction" },
    reaction: { order: 1, label: "PF2E.ActionsReactionsHeader", actionLabel: "PF2E.ActionTypeReaction" },
    free: { order: 2, label: "PF2E.ActionsFreeActionsHeader", actionLabel: "PF2E.ActionTypeFree" },
    passive: { order: 3, label: "PF2E.NPC.PassivesLabel", actionLabel: "PF2E.ActionTypePassive" },
    exploration: { order: 3, label: "PF2E.TravelSpeed.ExplorationActivity", actionLabel: "PF2E.TabActionsExplorationLabel" }
  };
  async function getActionsData({ hud: hud2, actor, filter }) {
    const isCharacter = actor.isOfType("character");
    const toggles = actor.synthetics.toggles.slice();
    const sorting = getSetting("actions");
    const stances = (await getStancesModuleApi()?.getStances(actor))?.sort((a, b) => localeCompare(a.name, b.name));
    const heroActions = isCharacter ? await getHeroActionsApi()?.getHeroActions(actor) : void 0;
    const heroDiff = heroActions ? actor.heroPoints.value - heroActions.length : void 0;
    const isOwner = actor.isOwner;
    const rollData = actor.getRollData();
    const strikes = actor.system.actions ? await Promise.all(
      actor.system.actions.map(async (strike, index) => ({
        ...strike,
        index,
        visible: !isCharacter || strike.visible,
        damageFormula: await strike.damage?.({ getFormula: true }),
        criticalFormula: await strike.critical?.({ getFormula: true }),
        description: strike.description ? await enrichHTML(strike.description, actor, { rollData, isOwner }) : void 0,
        altUsages: strike.altUsages && await Promise.all(
          strike.altUsages.map(async (altUsage) => ({
            ...altUsage,
            usage: altUsage.item.isThrown ? "thrown" : "melee",
            damageFormula: await altUsage.damage?.({ getFormula: true }),
            criticalFormula: await altUsage.critical?.({ getFormula: true })
          }))
        )
      }))
    ) : void 0;
    const blast = isCharacter ? new game.pf2e.ElementalBlast(actor) : void 0;
    const blasts = blast ? (await Promise.all(
      blast.configs.map(async (config) => {
        const damageType = config.damageTypes.find((damage) => damage.selected)?.value ?? "untyped";
        const formulaFor = /* @__PURE__ */ __name((outcome, melee = true) => {
          return blast.damage({
            element: config.element,
            damageType,
            melee,
            outcome,
            getFormula: true
          });
        }, "formulaFor");
        return {
          ...config,
          damageType,
          formula: {
            melee: {
              damage: await formulaFor("success"),
              critical: await formulaFor("criticalSuccess")
            },
            ranged: {
              damage: await formulaFor("success", false),
              critical: await formulaFor("criticalSuccess", false)
            }
          }
        };
      })
    )).sort((a, b) => localeCompare(a.label, b.label)) : void 0;
    let sections = {};
    const actions = isCharacter ? getCharacterActions(actor, stances) : getNpcActions(actor);
    for (const action of actions) {
      if (!filterIn(action.name, filter))
        continue;
      if (sorting !== "split") {
        sections.action ??= [];
        sections.action.push(action);
      } else {
        sections[action.type] ??= [];
        sections[action.type].push(action);
      }
    }
    sections = Object.entries(sections).map(([type, actions2]) => {
      actions2.forEach((action) => {
        action.img = getActionIcon(action.cost);
        action.typeLabel = SECTIONS_TYPES[action.type].actionLabel;
      });
      if (sorting !== "type") {
        actions2.sort((a, b) => localeCompare(a.name, b.name));
      } else {
        actions2.sort((a, b) => {
          const orderA = SECTIONS_TYPES[a.type].order;
          const orderB = SECTIONS_TYPES[b.type].order;
          return orderA === orderB ? localeCompare(a.name, b.name) : orderA - orderB;
        });
      }
      return { type, actions: actions2, label: SECTIONS_TYPES[type].label };
    });
    if (sorting === "split")
      sections.sort((a, b) => SECTIONS_TYPES[a.type].order - SECTIONS_TYPES[b.type].order);
    if (toggles.length || stances?.length || strikes?.length || blasts?.length || sections.length || heroActions?.length) {
      const nb = Number((stances?.length ?? 0) > 0) + Number((strikes?.length ?? 0) > 0) + Number((blasts?.length ?? 0) > 0) + sections.length + Number((heroActions?.length ?? 0) > 0);
      return {
        contentData: {
          toggles,
          stances,
          strikes,
          blasts,
          sections,
          heroActions: heroActions && {
            actions: heroActions,
            draw: Math.max(heroDiff, 0),
            discard: Math.abs(Math.min(heroDiff, 0)),
            canTrade: heroActions.length && canTradeHeroActions()
          },
          i18n: (str) => localize(`actions.${str}`),
          variantLabel: (label) => label.replace(/.+\((.+)\)/, "$1"),
          damageTypes: CONFIG.PF2E.damageTypes
        },
        doubled: nb > 1 && getSetting("actions-columns"),
        classes: [getSetting("actions-colors") ? "attack-damage-system-colors" : ""]
      };
    }
  }
  __name(getActionsData, "getActionsData");
  function addActionsListeners({ el, actor, hud: hud2 }) {
    addNameTooltipListeners(el.find(".toggle"));
    addNameTooltipListeners(el.find(".strike"));
    addNameTooltipListeners(el.find(".action"));
    function action(action2, callback, type = "click") {
      action2 = typeof action2 === "string" ? [action2] : action2;
      action2 = action2.map((x) => `[data-action=${x}]`).join(", ");
      return el.find(action2).on(type, (event) => {
        event.preventDefault();
        callback(event);
      });
    }
    __name(action, "action");
    function getStrike(event) {
      const strikeEl = event.currentTarget.closest(".strike");
      const strike = actor.system.actions[strikeEl.dataset.index];
      if (!strike)
        return null;
      const { altUsage } = event.currentTarget.dataset;
      return ["melee", "thrown"].includes(altUsage) ? strike.altUsages?.find((s) => altUsage === "thrown" ? s.item.isThrown : s.item.isMelee) ?? null : strike;
    }
    __name(getStrike, "getStrike");
    function getUuid(event) {
      return $(event.currentTarget).closest(".action").data().uuid;
    }
    __name(getUuid, "getUuid");
    action("action-description", async (event) => {
      const action2 = $(event.currentTarget).closest(".action");
      showItemSummary(action2, actor);
    });
    action("hero-action-description", async (event) => {
      const uuid = getUuid(event);
      const { description, name } = await getHeroActionsApi()?.getHeroActionDetails(uuid) ?? {};
      if (description)
        popup(name, description, actor);
    });
    action("strike-description", async (event) => {
      const strike = getStrike(event);
      if (!strike)
        return;
      const description = document.createElement("div");
      description.classList.add("description");
      description.innerHTML = await renderTemplate(templatePath("strike-description"), strike);
      popup(strike.label, description, actor);
    });
    action("blast-description", async (event) => {
      const blast = event.currentTarget.closest(".blast");
      showItemSummary($(blast), actor);
    });
    action("trait-description", (event) => {
      const strike = getStrike(event);
      if (!strike)
        return;
      const { index } = event.currentTarget.dataset;
      const trait = strike.traits[index];
      if (!trait)
        return;
      const description = game.i18n.localize(trait.description);
      if (description)
        popup(game.i18n.localize(trait.label), description, actor);
    });
    action("stance-description", (event) => {
      const stance = $(event.currentTarget).closest(".action");
      showItemSummary(stance, actor, stance.data().itemName);
    });
    if (!actor.isOwner)
      return;
    action("use-action", (event) => {
      const item = getItemFromEvent(event, actor);
      if (item?.isOfType("action", "feat")) {
        createSelfEffectMessage(item);
      }
    });
    action("stance-chat", (event) => {
      const item = getItemFromEvent(event, actor);
      if (!item)
        return;
      item.toMessage(event, { create: true });
      if (getSetting("chat-close"))
        hud2.close();
    });
    action("stance-toggle", (event) => {
      const { effectUuid } = event.currentTarget.closest(".action").dataset;
      getStancesModuleApi()?.toggleStance(actor, effectUuid);
    });
    action("exploration-toggle", (event) => {
      const actionId = event.currentTarget.closest(".action").dataset.itemId;
      const exploration = actor.system.exploration.filter((id) => actor.items.has(id));
      if (!exploration.findSplice((id) => id === actionId)) {
        exploration.push(actionId);
      }
      actor.update({ "system.exploration": exploration });
    });
    action("action-chat", (event) => {
      const item = getItemFromEvent(event, actor);
      if (!item)
        return;
      item.toMessage(event, { create: true });
      if (getSetting("chat-close"))
        hud2.close();
    });
    action("hero-action-chat", async (event) => {
      const api = getHeroActionsApi();
      if (!api)
        return;
      api.sendActionToChat(actor, getUuid(event));
      if (getSetting("chat-close"))
        hud2.close();
    });
    action("draw-hero-action", async (event) => {
      await getHeroActionsApi()?.drawHeroActions(actor);
    });
    action("use-hero-action", async (event) => {
      await getHeroActionsApi()?.useHeroAction(actor, getUuid(event));
    });
    action("discard-hero-action", async (event) => {
      await getHeroActionsApi()?.discardHeroActions(actor, getUuid(event));
    });
    action("trade-hero-action", async (event) => {
      getHeroActionsApi()?.tradeHeroAction(actor);
    });
    action("strike-attack", (event) => {
      const { index, altUsage } = event.currentTarget.dataset;
      const strike = getStrike(event);
      strike?.variants[index].roll({ event, altUsage });
      if (getSetting("attack-close"))
        hud2.close();
    });
    action(["strike-damage", "strike-critical"], (event) => {
      const { action: action2 } = event.currentTarget.dataset;
      const strike = getStrike(event);
      strike?.[action2 === "strike-damage" ? "damage" : "critical"]({ event });
      if (getSetting("attack-close"))
        hud2.close();
    });
    action(["toggle-roll-option", "set-suboption"], (event) => {
      const toggle = event.currentTarget.closest(".toggle");
      const { domain, option, itemId } = toggle.dataset;
      const suboption = toggle.querySelector("select")?.value ?? null;
      actor.toggleRollOption(domain, option, itemId ?? null, toggle.querySelector("input").checked, suboption);
    });
    action("strike-auxiliary", (event) => {
      if (event.currentTarget !== event.target)
        return;
      const strike = getStrike(event);
      if (!strike)
        return;
      const { index } = event.currentTarget.dataset;
      const modular = event.currentTarget.querySelector("select")?.value ?? null;
      strike.auxiliaryActions?.[index]?.execute({ selection: modular });
    });
    action("toggle-versatile", (event) => {
      const weapon = getStrike(event)?.item;
      if (!weapon)
        return;
      const target = event.currentTarget;
      const { value } = target.dataset;
      const baseType = weapon?.system.damage.damageType ?? null;
      const selection = target.classList.contains("selected") || value === baseType ? null : value;
      toggleWeaponTrait({ trait: "versatile", weapon, selection });
    });
    action(
      "strike-ammo",
      async (event) => {
        const weapon = getStrike(event)?.item;
        if (!weapon)
          return;
        const ammo = actor.items.get(event.currentTarget.value);
        await weapon.update({ system: { selectedAmmoId: ammo?.id ?? null } });
      },
      "change"
    );
    if (!actor.isOfType("character"))
      return;
    const selectors = ["roll-attack", "roll-damage", "set-damage-type"].map((s) => `[data-action=${s}]`).join(",");
    el.find(".blast").each((_, blastEl) => {
      const { element, damageType } = blastEl.dataset;
      const blast = new game.pf2e.ElementalBlast(actor);
      $(blastEl).find(selectors).on("click", async (event) => {
        event.preventDefault();
        const dataset = event.currentTarget.dataset;
        const melee = dataset.melee === "true";
        switch (dataset.action) {
          case "roll-attack": {
            const mapIncreases = Math.clamped(Number(dataset.mapIncreases), 0, 2);
            blast.attack({ mapIncreases: Math.clamped(mapIncreases, 0, 2), element, damageType, melee, event });
            break;
          }
          case "roll-damage": {
            blast.damage({ element, damageType, melee, outcome: dataset.outcome, event });
            break;
          }
          case "set-damage-type": {
            blast.setDamageType({ element, damageType: dataset.value });
          }
        }
        if (["roll-attack", "roll-damage"].includes(dataset.action) && getSetting("attack-close"))
          hud2.close();
      });
    });
  }
  __name(addActionsListeners, "addActionsListeners");
  function getToolBeltModule(setting) {
    const module = game.modules.get("pf2e-toolbelt");
    return module?.active && game.settings.get("pf2e-toolbelt", setting) ? module : void 0;
  }
  __name(getToolBeltModule, "getToolBeltModule");
  function getToolBeltApi(setting) {
    return getToolBeltModule(setting)?.api;
  }
  __name(getToolBeltApi, "getToolBeltApi");
  function getStancesModuleApi() {
    const module = game.modules.get("pf2e-stances");
    return module?.active ? module.api : getToolBeltApi("stances")?.stances;
  }
  __name(getStancesModuleApi, "getStancesModuleApi");
  function getHeroActionsApi() {
    const module = game.modules.get("pf2e-hero-actions");
    return module?.active ? module.api : getToolBeltApi("hero")?.heroActions;
  }
  __name(getHeroActionsApi, "getHeroActionsApi");
  function canTradeHeroActions() {
    if (game.modules.get("pf2e-hero-actions")?.active)
      return game.settings.get("pf2e-hero-actions", "trade");
    if (getToolBeltModule("hero"))
      return game.settings.get("pf2e-toolbelt", "hero-trade");
  }
  __name(canTradeHeroActions, "canTradeHeroActions");
  function getCharacterActions(actor, stances) {
    const stancesUUIDS = getStancesModuleApi()?.getActionsUUIDS?.() ?? (stances?.some((stance) => stance.actionUUID) ? new Set(stances.map(({ actionUUID }) => actionUUID)) : void 0) ?? /* @__PURE__ */ new Set();
    const actionsUUIDS = /* @__PURE__ */ new Set([...stancesUUIDS, ...skillActionsUUIDS, ...Object.values(extrasUUIDS)]);
    const actions = actor.itemTypes.action;
    const feats = actor.itemTypes.feat.filter((item) => item.actionCost);
    const inParty = actor.parties.size > 0;
    const explorations = actor.system.exploration;
    return [...actions, ...feats].map((action) => {
      const sourceId = action.sourceId;
      const actionId = action.id;
      const actionCost = action.actionCost;
      const traits = action.system.traits.value;
      const isExploration = traits.includes("exploration");
      return {
        sourceId,
        id: actionId,
        type: actionCost?.type ?? (isExploration ? "exploration" : "free"),
        cost: actionCost,
        name: action.name,
        isExploration,
        isDowntime: traits.includes("downtime"),
        isActive: isExploration && explorations.includes(actionId),
        hasEffect: !!action.system.selfEffect
      };
    }).filter(
      (action) => !action.isDowntime && (inParty || !action.isExploration) && (action.isExploration || !actionsUUIDS.has(action.sourceId))
    );
  }
  __name(getCharacterActions, "getCharacterActions");
  function getNpcActions(actor) {
    return actor.itemTypes.action.map((item) => {
      const actionCost = item.actionCost;
      const actionType = actionCost?.type ?? "passive";
      const hasAura = actionType === "passive" && (item.system.traits.value.includes("aura") || !!item.system.rules.find((r) => r.key === "Aura"));
      return {
        id: item.id,
        type: actionType,
        cost: actionCost,
        name: item.name,
        hasDeathNote: item.system.deathNote,
        hasAura,
        hasEffect: !!item.system.selfEffect
      };
    });
  }
  __name(getNpcActions, "getNpcActions");

  // src/sidebars/hazard.js
  async function getHazardData({ actor }) {
    const { system } = actor;
    const { details, traits, attributes } = system;
    const { stealth } = attributes;
    const { description, disable, routine, reset, isComplex } = details;
    const rollData = actor.getRollData();
    const isOwner = actor.isOwner;
    const enrich = /* @__PURE__ */ __name(async (str) => {
      return enrichHTML(str, actor, { isOwner, rollData });
    }, "enrich");
    return {
      contentData: {
        description: await enrich(description),
        disable: await enrich(disable),
        routine: await enrich(routine),
        reset: await enrich(reset),
        isComplex,
        rarity: { value: traits.rarity, label: CONFIG.PF2E.rarityTraits[traits.rarity] },
        traits: traits.value.map((trait) => CONFIG.PF2E.hazardTraits[trait]),
        stealth: modifier(stealth.value)
      },
      style: { ["--max-width"]: getSetting("hazard-width") + "em" }
    };
  }
  __name(getHazardData, "getHazardData");
  function addHazardListeners({ el, actor }) {
    el.find("[data-action=action-description]").on("click", (event) => {
      event.preventDefault();
      const action = $(event.currentTarget).closest(".action");
      showItemSummary(action, actor);
    });
    listenInlineRoll(el[0], actor);
    if (!actor.isOwner)
      return;
    el.find("[data-action=roll-initiative").on("click", (event) => {
      event.preventDefault();
      actor.initiative.roll({ event });
    });
  }
  __name(addHazardListeners, "addHazardListeners");

  // src/pf2e/identify.js
  var MAGIC_TRADITIONS = /* @__PURE__ */ new Set(["arcane", "divine", "occult", "primal"]);
  function setHasElement(set, value) {
    return set.has(value);
  }
  __name(setHasElement, "setHasElement");
  function getDcRarity(item) {
    return item.traits.has("cursed") ? "unique" : item.rarity;
  }
  __name(getDcRarity, "getDcRarity");
  function getMagicTraditions(item) {
    const traits = item.system.traits.value;
    return new Set(traits.filter((t) => setHasElement(MAGIC_TRADITIONS, t)));
  }
  __name(getMagicTraditions, "getMagicTraditions");
  function getIdentifyMagicDCs(item, baseDC, notMatchingTraditionModifier) {
    const result = {
      occult: baseDC,
      primal: baseDC,
      divine: baseDC,
      arcane: baseDC
    };
    const traditions = getMagicTraditions(item);
    for (const key of MAGIC_TRADITIONS) {
      if (traditions.size > 0 && !traditions.has(key)) {
        result[key] = baseDC + notMatchingTraditionModifier;
      }
    }
    return { arcana: result.arcane, nature: result.primal, religion: result.divine, occultism: result.occult };
  }
  __name(getIdentifyMagicDCs, "getIdentifyMagicDCs");
  function getItemIdentificationDCs(item, { proficiencyWithoutLevel = false, notMatchingTraditionModifier }) {
    const baseDC = calculateDC(item.level, { proficiencyWithoutLevel });
    const rarity = getDcRarity(item);
    const dc = adjustDCByRarity(baseDC, rarity);
    if (item.isMagical) {
      return getIdentifyMagicDCs(item, dc, notMatchingTraditionModifier);
    } else if (item.isAlchemical) {
      return { crafting: dc };
    } else {
      return { dc };
    }
  }
  __name(getItemIdentificationDCs, "getItemIdentificationDCs");
  function objectHasKey2(obj, key) {
    return (typeof key === "string" || typeof key === "number") && key in obj;
  }
  __name(objectHasKey2, "objectHasKey");
  var IdentifyItemPopup = class extends FormApplication {
    static get defaultOptions() {
      return {
        ...super.defaultOptions,
        id: "identify-item",
        title: game.i18n.localize("PF2E.identification.Identify"),
        template: "systems/pf2e/templates/actors/identify-item.hbs",
        width: "auto",
        classes: ["identify-popup"]
      };
    }
    get item() {
      return this.object;
    }
    async getData() {
      const item = this.object;
      const notMatchingTraditionModifier = game.settings.get("pf2e", "identifyMagicNotMatchingTraditionModifier");
      const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
      const dcs = getItemIdentificationDCs(item, { proficiencyWithoutLevel, notMatchingTraditionModifier });
      return {
        ...await super.getData(),
        isMagic: item.isMagical,
        isAlchemical: item.isAlchemical,
        dcs
      };
    }
    activateListeners($form) {
      $form.find("button.update-identification").on("click", (event) => {
        const $button = $(event.delegateTarget);
        this.submit({ updateData: { status: $button.val() } });
      });
      $form.find("button.post-skill-checks").on("click", async () => {
        const item = this.item;
        const itemImg = item.system.identification.unidentified.img;
        const itemName = item.system.identification.unidentified.name;
        const identifiedName = item.system.identification.identified.name;
        const skills = $("div#identify-item").find("tr").toArray().flatMap((row) => {
          const slug = row.dataset.skill;
          const dc = Number(row.dataset.dc);
          if (!(Number.isInteger(dc) && objectHasKey2(CONFIG.PF2E.skillList, slug))) {
            return [];
          }
          const name = game.i18n.localize(CONFIG.PF2E.skillList[slug]);
          return { slug, name, dc };
        });
        const actionOption = item.isMagical ? "action:identify-magic" : item.isAlchemical ? "action:identify-alchemy" : null;
        const content = await renderTemplate("systems/pf2e/templates/actors/identify-item-chat-skill-checks.hbs", {
          itemImg,
          itemName,
          identifiedName,
          // We don't want to install remeda just for that so we do our own thing
          // rollOptions: R.compact(['concentrate', 'exploration', 'secret', actionOption]),
          rollOptions: ["concentrate", "exploration", "secret", actionOption].filter(Boolean),
          skills
        });
        await getChatMessageClass().create({ user: game.user.id, content });
      });
    }
    async _updateObject(_event, formData) {
      const status = formData["status"];
      if (status === "identified") {
        await this.item.setIdentificationStatus(status);
      }
    }
  };
  __name(IdentifyItemPopup, "IdentifyItemPopup");

  // src/tooltip.js
  async function createTooltip({
    target,
    selected,
    direction = "DOWN",
    onCreate,
    onDismiss,
    onClick,
    content,
    cssClass = [],
    locked = false
  }) {
    return new Promise((resolve) => {
      const tooltipClass = `${MODULE_ID2}-tooltip`;
      const exist = document.body.querySelectorAll(`.${tooltipClass}:not(#tooltip)`);
      for (const el of exist) {
        dismissTooltip(el);
      }
      requestAnimationFrame(() => {
        cssClass = typeof cssClass === "string" ? [cssClass] : cssClass;
        if (selected)
          cssClass.push("selection-tooltip");
        if (Array.isArray(content)) {
          content = content.map(({ value, label }) => {
            const selectedClass = value === selected ? 'class="selected"' : "";
            return `<li><a  ${selectedClass} data-value="${value}">${label}</a></li>`;
          }).join("");
        }
        let tooltip;
        if (content instanceof HTMLElement) {
          tooltip = content;
        } else {
          tooltip = document.createElement("ul");
          tooltip.innerHTML = content;
        }
        tooltip.style.setProperty("--font-size", getSetting("scale") + "px");
        if (cssClass.length) {
          tooltip.classList.add(...cssClass.map((c) => `${MODULE_ID2}-${c}`));
        }
        if (onDismiss) {
          new MutationObserver(function() {
            if (!document.body.contains(tooltip)) {
              onDismiss();
              this.disconnect();
            }
          }).observe(document.body, { childList: true });
        }
        if (onClick) {
          locked = true;
          tooltip.querySelectorAll("[data-value]").forEach((el) => {
            el.addEventListener("click", async (event) => {
              event.preventDefault();
              const target2 = event.currentTarget;
              dismissTooltip(target2);
              onClick?.(target2.dataset.value);
            });
          });
        }
        game.tooltip.activate(target, { content: tooltip, direction, locked, cssClass: tooltipClass });
        onCreate?.(tooltip);
        resolve(tooltip);
      });
    });
  }
  __name(createTooltip, "createTooltip");
  function dismissTooltip(el) {
    el = el.closest(`.${MODULE_ID2}-tooltip`);
    game.tooltip.dismissLockedTooltip(el);
  }
  __name(dismissTooltip, "dismissTooltip");

  // src/sidebars/items.js
  var ITEMS_TYPES = {
    weapon: { order: 0, label: "PF2E.InventoryWeaponsHeader" },
    armor: { order: 1, label: "PF2E.InventoryArmorHeader" },
    consumable: { order: 2, label: "PF2E.InventoryConsumablesHeader" },
    equipment: { order: 3, label: "PF2E.InventoryEquipmentHeader" },
    treasure: { order: 4, label: "PF2E.InventoryTreasureHeader" },
    backpack: { order: 5, label: "PF2E.InventoryBackpackHeader" }
  };
  async function getItemsData({ actor, filter }) {
    const { contents, coins, totalWealth, bulk, invested } = actor.inventory;
    const openedContainers = getSetting("containers") || (getFlag(actor, `containers.${game.user.id}`) ?? []);
    const containers = {};
    let categories = {};
    for (const item of contents) {
      if (!ITEMS_TYPES[item.type])
        continue;
      const containerId = item.system.containerId;
      if (item.type !== "backpack" && containerId && (openedContainers === true || openedContainers.includes(containerId))) {
        containers[containerId] ??= [];
        containers[containerId].push(item);
      } else {
        categories[item.type] ??= [];
        categories[item.type].push(item);
      }
    }
    categories = Object.entries(categories).map(([type, items]) => {
      items.sort((a, b) => localeCompare(a.name, b.name));
      if (type === "backpack") {
        for (let i = items.length - 1; i >= 0; i--) {
          const container = items[i];
          const contained = containers[container.id]?.filter((item) => filterIn(item.name, filter));
          if (!contained?.length) {
            if (!filterIn(container.name, filter))
              items.splice(i, 1);
            continue;
          }
          contained.sort((a, b) => localeCompare(a.name, b.name));
          items.splice(i + 1, 0, ...contained);
        }
      } else
        items = items.filter((item) => filterIn(item.name, filter));
      return {
        type,
        items,
        label: ITEMS_TYPES[type].label
      };
    }).filter((category) => category.items.length).sort((a, b) => ITEMS_TYPES[a.type].order - ITEMS_TYPES[b.type].order);
    if (categories.length) {
      return {
        doubled: categories.length > 1 && getSetting("items-columns"),
        contentData: {
          canCarry: !!actor.adjustCarryType,
          categories,
          bulk,
          containers: openedContainers,
          i18n: (str) => localize(`items.${str}`),
          invested: invested ? `${game.i18n.localize("PF2E.InvestedLabel")}: ${invested.value} / ${invested.max}` : "",
          wealth: { coins: coins.goldValue, total: totalWealth.goldValue }
        }
      };
    }
  }
  __name(getItemsData, "getItemsData");
  function addItemsListeners({ el, actor, token, hud: hud2 }) {
    const item = el.find(".item");
    addNameTooltipListeners(item);
    item.find("[data-action=item-description]").on("click", async (event) => {
      event.preventDefault();
      const item2 = $(event.currentTarget).closest(".item");
      await showItemSummary(item2, actor);
    });
    item.find("[data-action=toggle-contains-items]").on("click", async (event) => {
      event.preventDefault();
      const flag = `containers.${game.user.id}`;
      const containerId = event.currentTarget.closest(".item").dataset.itemId;
      const containers = getFlag(actor, flag)?.slice() ?? [];
      const index = containers.indexOf(containerId);
      if (index === -1)
        containers.push(containerId);
      else
        containers.splice(index, 1);
      await setFlag(actor, flag, containers);
    });
    if (!actor.isOwner)
      return;
    item.find("[data-action=item-chat]").on("click", async (event) => {
      const item2 = getItemFromEvent(event, actor);
      if (!item2)
        return;
      item2.toMessage(event, { create: true });
      if (getSetting("chat-close"))
        hud2.close();
    });
    item.on("dragstart", (event) => {
      const target = event.target.closest(".item");
      const { itemType, uuid } = target.dataset;
      const img = new Image();
      img.src = target.querySelector(".item-img img").src;
      img.style.width = "32px";
      img.style.height = "32px";
      img.style.borderRadius = "4px";
      img.style.position = "absolute";
      img.style.left = "-1000px";
      document.body.append(img);
      event.originalEvent.dataTransfer.setDragImage(img, 16, 16);
      event.originalEvent.dataTransfer.setData(
        "text/plain",
        JSON.stringify({ type: "Item", fromInventory: true, itemType, uuid })
      );
      target.addEventListener("dragend", () => img.remove(), { once: true });
    });
    el.find(".quantity input").on("change", async (event) => {
      await getItemFromEvent(event, actor)?.update({ "system.quantity": event.currentTarget.valueAsNumber });
    });
    el.find("[data-action=toggle-item-invest]").on("click", (event) => {
      event.preventDefault();
      const { itemId } = event.currentTarget.closest(".item").dataset;
      actor.toggleInvested(itemId);
    });
    el.find("[data-action=repair-item]").on("click", (event) => {
      event.preventDefault();
      const item2 = getItemFromEvent(event, actor);
      if (item2)
        game.pf2e.actions.repair({ item: item2, actors: [actor], tokens: [token] });
    });
    el.find("[data-action=toggle-identified]").on("click", (event) => {
      event.preventDefault();
      const item2 = getItemFromEvent(event, actor);
      if (!item2)
        return;
      if (item2.isIdentified)
        item2.setIdentificationStatus("unidentified");
      else
        new IdentifyItemPopup(item2).render(true);
    });
    el.find("[data-action=edit-item]").on("click", (event) => {
      event.preventDefault();
      editItem(event, actor);
    });
    el.find("[data-action=delete-item]").on("click", (event) => {
      event.preventDefault();
      deleteItem(event, actor);
    });
    el.find("[data-action=toggle-item-worn").on("click", async (event) => {
      const item2 = getItemFromEvent(event, actor);
      if (!item2)
        return;
      const tmp = document.createElement("div");
      tmp.innerHTML = await renderTemplate("systems/pf2e/templates/actors/partials/carry-type.hbs", { item: item2 });
      const content = tmp.children[1].firstElementChild;
      content.querySelectorAll("[data-carry-type]").forEach((el2) => {
        el2.addEventListener("click", async (event2) => {
          const menu = event2.currentTarget;
          const current = item2.system.equipped;
          const inSlot = menu.dataset.inSlot === "true";
          const handsHeld = Number(menu.dataset.handsHeld) || 0;
          const carryType = menu.dataset.carryType;
          dismissTooltip(menu);
          if (carryType !== current.carryType || inSlot !== current.inSlot || carryType === "held" && handsHeld !== current.handsHeld) {
            actor.adjustCarryType(item2, { carryType, handsHeld, inSlot });
          }
        });
      });
      if (item2.type !== "backpack") {
        const containers = actor.itemTypes.backpack.filter((container) => container.isIdentified);
        if (containers.length) {
          let rows = "";
          for (const container of containers) {
            rows += '<li><a class="item-control item-location-option';
            if (container === item2.container)
              rows += " selected";
            rows += `" data-action="send-to-container" data-container-id="${container.id}">`;
            rows += `<i class="fas fa-box"></i>${container.name}</a></li>`;
          }
          content.insertAdjacentHTML("beforeend", rows);
          content.querySelectorAll("[data-action=send-to-container]").forEach((el2) => {
            el2.addEventListener("click", (event2) => {
              const menu = event2.currentTarget;
              const containerId = menu.dataset.containerId;
              if (!actor.items.has(containerId))
                return;
              dismissTooltip(menu);
              item2.update({ "system.containerId": containerId });
            });
          });
        }
      }
      createTooltip({
        target: event.currentTarget,
        content,
        locked: true,
        direction: "UP",
        selected: true
      });
    });
  }
  __name(addItemsListeners, "addItemsListeners");

  // src/sidebars/spells.js
  async function getSpellsData({ actor, filter }) {
    const focusPool = actor.system.resources.focus ?? { value: 0, max: 0 };
    const entries = actor.spellcasting.regular;
    const showTradition = getSetting("tradition");
    const stavesActive = game.modules.get("pf2e-staves")?.active;
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
        const isStaff = getProperty(entry, "flags.pf2e-staves.staveID") !== void 0;
        const charges = { value: getProperty(entry, "flags.pf2e-staves.charges") ?? 0 };
        for (const slot of data.levels) {
          if (!slot.active.length || slot.uses?.max === 0)
            continue;
          const slotSpells = [];
          const isCantrip = slot.isCantrip;
          const actives = slot.active.filter((x) => x && x.uses?.max !== 0);
          for (let slotId = 0; slotId < actives.length; slotId++) {
            const { spell, expended, virtual, uses, castLevel } = actives[slotId];
            if (!filterIn(spell.name, filter))
              continue;
            slotSpells.push({
              name: spell.name,
              img: spell.img,
              tradition,
              castLevel: castLevel ?? spell.level,
              slotId,
              entryId,
              itemId: spell.id,
              inputId: data.isInnate ? spell.id : data.id,
              inputPath: isCharge ? "flags.pf2e-staves.charges" : data.isInnate ? "system.location.uses.value" : `system.slots.slot${slot.level}.value`,
              isCharge,
              isActiveCharge: isCharge && stavesActive,
              isVirtual: virtual,
              isInnate: data.isInnate,
              isCantrip,
              isFocus,
              isPrepared: data.isPrepared,
              isSpontaneous: data.isSpontaneous || data.isFlexible,
              slotLevel: slot.level,
              uses: uses ?? (isCharge ? charges : slot.uses),
              expended: expended ?? (isFocus && !isCantrip ? focusPool.value <= 0 : false),
              action: spell.system.time.value,
              type: isCharge ? isStaff ? `${MODULE_ID2}.spells.staff` : `${MODULE_ID2}.spells.charges` : data.isInnate ? "PF2E.PreparationTypeInnate" : data.isSpontaneous ? "PF2E.PreparationTypeSpontaneous" : data.isFlexible ? "PF2E.SpellFlexibleLabel" : isFocus ? "PF2E.SpellFocusLabel" : "PF2E.SpellPreparedLabel",
              order: isCharge ? 0 : data.isPrepared ? 1 : isFocus ? 2 : data.isInnate ? 3 : data.isSpontaneous ? 4 : 5
            });
          }
          if (slotSpells.length) {
            if (isFocus) {
              if (isCantrip)
                hasFocusCantrips = true;
              else {
                focuses.push(...slotSpells);
                continue;
              }
            }
            spells[slot.level] ??= [];
            spells[slot.level].push(...slotSpells);
          }
        }
      })
    );
    if (spells.length) {
      const sort = getSetting("spells") ? (a, b) => a.order === b.order ? localeCompare(a.name, b.name) : a.order - b.order : (a, b) => localeCompare(a.name, b.name);
      spells.forEach((entry) => entry.sort(sort));
    }
    if (focuses.length) {
      focuses.sort((a, b) => localeCompare(a.name, b.name));
      spells[12] = focuses;
      hasFocusCantrips = false;
    }
    const ritualData = await actor.spellcasting.ritual?.getSheetData();
    const rituals = ritualData?.levels.flatMap(
      (slot, slotId) => slot.active.map(({ spell }) => {
        if (!filterIn(spell.name, filter))
          return;
        return {
          name: spell.name,
          img: spell.img,
          slotId,
          itemId: spell.id,
          level: spell.level,
          time: spell.system.time.value
        };
      }).filter(Boolean)
    );
    if (spells.length || rituals?.length) {
      const attacks = getSpellAttacks(actor);
      const nb = spells.length + Number((rituals?.length ?? 0) > 0);
      return {
        contentData: {
          spells,
          rituals,
          focusPool,
          stavesActive,
          hasFocusCantrips,
          attackMod: hasSingleSpellAttack(attacks) ? attacks[0].mod : null,
          entryRank: (rank) => game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) })
        },
        doubled: nb > 1 && getSetting("spells-columns")
      };
    }
  }
  __name(getSpellsData, "getSpellsData");
  function getSpellAttacks(actor) {
    return actor.spellcasting.filter((entry) => entry.statistic).map(({ statistic, name, id }) => ({ name, id, mod: modifier(statistic.mod), statistic }));
  }
  __name(getSpellAttacks, "getSpellAttacks");
  function hasSingleSpellAttack(attacks) {
    return new Set(attacks.map(({ mod }) => mod)).size === 1;
  }
  __name(hasSingleSpellAttack, "hasSingleSpellAttack");
  function addSpellsListeners({ el, actor, hud: hud2 }) {
    addNameTooltipListeners(el.find(".spell"));
    el.find("[data-action=spell-description]").on("click", async (event) => {
      event.preventDefault();
      const spell = $(event.currentTarget).closest(".spell");
      showItemSummary(spell, actor);
    });
    if (!actor.isOwner)
      return;
    el.find("[data-action=spell-attack]").on("click", async (event) => {
      event.preventDefault();
      const attacks = getSpellAttacks(actor);
      if (!attacks.length)
        return;
      let statistic;
      if (!hasSingleSpellAttack(attacks)) {
        const id = await Dialog.wait({
          buttons: {
            ok: {
              icon: '<i class="fa-solid fa-dice-d20"></i>',
              label: localize("spells.attacks.ok"),
              callback: (html) => html.find("input:checked").val()
            }
          },
          title: localize("spells.attacks.title"),
          content: await renderTemplate(templatePath("dialogs/spell-attacks"), { attacks }),
          close: () => null
        });
        if (id)
          statistic = actor.items.get(id)?.statistic;
      } else {
        statistic = attacks[0].statistic;
      }
      const rollParams = eventToRollParams(event);
      const { map } = event.currentTarget.dataset;
      if (map) {
        rollParams.modifiers = [new game.pf2e.Modifier({ label: "PF2E.MultipleAttackPenalty", modifier: Number(map) })];
      }
      statistic?.check.roll(rollParams);
    });
    el.find("[data-action=spell-chat]").on("click", async (event) => {
      event.preventDefault();
      const item = getItemFromEvent(event, actor);
      if (!item)
        return;
      item.toMessage(event, { create: true });
      if (getSetting("chat-close"))
        hud2.close();
    });
    el.find("[data-action=toggle-pips]").on("click contextmenu", async (event) => {
      event.preventDefault();
      const change = event.type === "click" ? 1 : -1;
      const points = (actor.system.resources.focus?.value ?? 0) + change;
      await actor.update({ "system.resources.focus.value": points });
    });
    el.find("[data-action=toggle-prepared]").on("click", (event) => {
      event.preventDefault();
      const { slotLevel, slotId, entryId, expended } = $(event.currentTarget).closest(".spell").data();
      const collection = actor.spellcasting.collections.get(entryId);
      collection?.setSlotExpendedState(slotLevel ?? 0, slotId ?? 0, expended !== true);
    });
    el.find("[data-action=cast-spell]").on("click", (event) => {
      event.preventDefault();
      const { slotLevel, slotId, entryId, itemId } = $(event.currentTarget).closest(".spell").data();
      const collection = actor.spellcasting.collections.get(entryId, { strict: true });
      if (!collection)
        return;
      const spell = collection.get(itemId, { strict: true });
      if (!spell)
        return;
      collection.entry.cast(spell, { slot: slotId, level: slotLevel });
      if (getSetting("cast-close"))
        hud2.close();
    });
    el.find("[data-input-path]").on("change", async (event) => {
      const { inputPath, entryId } = $(event.currentTarget).data();
      const value = event.currentTarget.valueAsNumber;
      await actor.updateEmbeddedDocuments("Item", [{ _id: entryId, [inputPath]: value }]);
    });
  }
  __name(addSpellsListeners, "addSpellsListeners");

  // src/hud.js
  var HOVER_EXCEPTIONS = [
    "#combat-popout",
    "#sidebar",
    "#mini-tracker",
    "#combat-dock",
    "#combat-carousel",
    "[id^=pf2e-perception]"
  ].join(", ");
  var POSITIONS = {
    left: ["left", "right", "top", "bottom"],
    right: ["right", "left", "top", "bottom"],
    top: ["top", "bottom", "left", "right"],
    bottom: ["bottom", "top", "left", "right"]
  };
  var ALLIANCES = {
    opposition: { icon: "fa-solid fa-face-angry-horns", label: "PF2E.Actor.Creature.Alliance.Opposition" },
    party: { icon: "fa-solid fa-face-smile-halo", label: "PF2E.Actor.Creature.Alliance.Party" },
    neutral: { icon: "fa-solid fa-face-meh", label: "PF2E.Actor.Creature.Alliance.Neutral" }
  };
  var SPEEDS = [
    { type: "land", icon: "fa-solid fa-shoe-prints" },
    { type: "burrow", icon: "fa-solid fa-chevrons-down" },
    { type: "climb", icon: "fa-solid fa-spider" },
    { type: "fly", icon: "fa-solid fa-feather" },
    { type: "swim", icon: "fa-solid fa-person-swimming" }
  ];
  var SIDEBARS = {
    actions: { getData: getActionsData, addListeners: addActionsListeners },
    items: { getData: getItemsData, addListeners: addItemsListeners },
    spells: { getData: getSpellsData, addListeners: addSpellsListeners },
    skills: { getData: getSkillsData, addListeners: addSkillsListeners },
    extras: { getData: getExtrasData, addListeners: addExtrasListeners },
    hazard: { getData: getHazardData, addListeners: addHazardListeners }
  };
  var SAVES = {
    fortitude: { icon: "fa-solid fa-chess-rook", label: "PF2E.SavesFortitude" },
    reflex: { icon: "fa-solid fa-person-running", label: "PF2E.SavesReflex" },
    will: { icon: "fa-solid fa-brain", label: "PF2E.SavesWill" }
  };
  var SKILLS3 = {
    perception: { icon: "fa-solid fa-eye", label: "PF2E.PerceptionLabel" },
    stealth: { icon: "fa-duotone fa-eye-slash", label: "PF2E.SkillStealth" },
    athletics: { icon: "fa-solid fa-hand-fist", label: "PF2E.SkillAthletics" }
  };
  var HUD = class extends Application {
    #token = null;
    #lastToken = null;
    #hoveredToken = null;
    #delay = null;
    #holding = false;
    #closing = null;
    #mousedown = [false, false, false];
    #lock = false;
    #softLock = false;
    #isObserved = false;
    #hoverTokenHandler;
    #mouseeventHandler;
    #deleteTokenHandler;
    constructor() {
      super();
      this.forceClose = () => this.close({ force: true });
      this.#hoverTokenHandler = (token, hover) => {
        if (hover)
          this.#tokenEnter(token);
        else
          this.#tokenLeave(token);
      };
      this.#mouseeventHandler = (event) => {
        const button = event.button;
        if (![0, 2].includes(button))
          return;
        if (event.type === "mouseup") {
          this.#mousedown[button] = false;
          return;
        }
        this.#mousedown[button] = true;
        const target = event.target;
        const el = this.element[0];
        if (el) {
          const popup2 = el.querySelector(".popup");
          if (popup2 && !popup2.contains(target)) {
            if (!el.querySelector(".sidebar"))
              this.forceClose();
            else
              return popup2.remove();
          }
          if (target.closest("canvas"))
            this.forceClose();
          return;
        } else
          this.#cancelDelay();
        this.unlock(true);
      };
      this.#deleteTokenHandler = (token) => {
        if (this.#token && token.id === this.#token.id)
          this.forceClose();
      };
      window.addEventListener("mousedown", this.#mouseeventHandler);
      window.addEventListener("mouseup", this.#mouseeventHandler);
      Hooks.on("hoverToken", this.#hoverTokenHandler);
      Hooks.on("deleteToken", this.#deleteTokenHandler);
      Hooks.on("canvasPan", this.forceClose);
    }
    setToken(token, isObserved) {
      if (token !== this.#token) {
        delete this.#token?.actor?.apps[this.appId];
        this.#token = token;
        const actor = token?.actor;
        if (actor)
          actor.apps[this.appId] = this;
      }
      this.#isObserved = isObserved ?? this.#checkIfObserved(token);
    }
    setHolding(held) {
      const holding = getSetting("use-holding");
      if (holding === "none")
        return;
      this.#holding = held;
      if (this.#softLock || this.#lock)
        return;
      if (held) {
        if (!this.#hoveredToken)
          return;
        const isObserved = this.#checkIfObserved(this.#hoveredToken);
        if (holding === "half" && !game.user.isGM && !isObserved) {
          this.#cancelDelay();
          this.render();
          return;
        }
        this.setToken(this.#hoveredToken, isObserved);
        this.render();
      } else {
        if (holding === "all")
          this.close();
        else if (game.user.isGM) {
          this.setToken(this.#hoveredToken);
          this.render();
        } else if (this.#isObserved)
          this.close();
      }
    }
    #checkIfObserved(token) {
      const actor = token?.actor;
      if (!actor)
        return false;
      let isObserved;
      const isParty = actor.system.details.alliance === "party";
      if (game.user.isGM && getSetting("use-holding") === "half" && !this.#holding)
        isObserved = false;
      else if (actor.isOfType("familiar") && !actor.master)
        isObserved = false;
      else
        isObserved = token.isOwner || getSetting("observer") && (token.observer || isParty && getSetting("party"));
      return isObserved;
    }
    #tokenEnter(token) {
      if ($(window.document).find(":hover").filter(HOVER_EXCEPTIONS).length)
        return;
      const actor = token.actor;
      if (!actor || actor.isOfType("loot", "party"))
        return;
      if (token.document.disposition === CONST.TOKEN_DISPOSITIONS.SECRET && !actor.isOwner)
        return;
      this.#hoveredToken = token;
      if (token !== this.#lastToken && !this.#lock)
        this.close();
      if (this.mousedown || this.#lock || this.#softLock || token === this.#token)
        return;
      const holding = getSetting("use-holding");
      const isObserved = this.#checkIfObserved(token);
      if (holding !== "none" && !this.#holding && (holding === "all" || isObserved))
        return;
      this.#cancelClosing(true);
      this.setToken(token, isObserved);
      if (holding === "none" || !this.#holding)
        this.renderWithDelay();
      else
        this.render();
    }
    #tokenLeave(token) {
      this.#hoveredToken = null;
      if (this.mousedown || this.#lock || this.#softLock)
        return;
      this.#closing = setTimeout(() => {
        this.#closing = null;
        if (this.#softLock || this.#lock)
          return;
        this.close();
      }, 10);
    }
    renderWithDelay() {
      let delay = getSetting("delay");
      if (delay) {
        if (delay < 10)
          delay = 10;
        this.#delay = setTimeout(() => {
          this.#delay = null;
          this.render();
        }, delay);
      } else
        this.render();
    }
    #cancelClosing(close) {
      if (this.#closing === null)
        return;
      clearTimeout(this.#closing);
      this.#closing = null;
      if (close)
        this.close();
    }
    #cancelDelay() {
      if (this.#delay === null)
        return;
      clearTimeout(this.#delay);
      this.#delay = null;
    }
    delete() {
      this.forceClose();
      window.removeEventListener("mousedown", this.#mouseeventHandler);
      window.removeEventListener("mouseup", this.#mouseeventHandler);
      Hooks.off("hoverToken", this.#hoverTokenHandler);
      Hooks.off("deleteToken", this.#deleteTokenHandler);
      Hooks.off("canvasPan", this.forceClose);
    }
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        popOut: false,
        minimizable: false,
        template: templatePath("hud")
      });
    }
    get mousedown() {
      return this.#mousedown[0] || this.#mousedown[2];
    }
    get token() {
      return this.#token;
    }
    get actor() {
      return this.#token?.actor;
    }
    get hasCover() {
      return !!getCoverEffect(this.actor);
    }
    get isCharacter() {
      return this.actor?.isOfType("character");
    }
    get sidebar() {
      return this.element?.find("> .sidebar") ?? [];
    }
    get popup() {
      return this.element?.find("> .popup") ?? [];
    }
    get inner() {
      return this.element?.find("> .inner") ?? [];
    }
    async getData() {
      const token = this.#token;
      const actor = this.#token?.actor;
      if (!actor)
        return {};
      let distance = null;
      const savesSetting = getSetting("saves");
      const othersSetting = getSetting("others");
      const isCharacter = this.isCharacter;
      const { attributes } = actor;
      const { hp, ac } = attributes;
      const sp = hp.sp ?? { max: 0, value: 0 };
      const useStamina = game.settings.get("pf2e", "staminaVariant");
      const showDistance = getSetting("distance");
      const fontSize = getSetting("scale");
      if (showDistance === "all" || showDistance === "self" && this.#isObserved) {
        const unitSplit = getSetting("unit").split(",");
        const multiplier = Number(unitSplit[0]?.trim()) || 1;
        const unit = unitSplit[1]?.trim() || game.system.gridUnits;
        const decimals = Number(unitSplit[2]?.trim()) || 0;
        const selected = canvas.tokens.controlled;
        let isTarget = false;
        let target = selected.length === 1 ? selected[0] : null;
        if (!target || target === token) {
          target = getUniqueTarget();
          isTarget = true;
        }
        if (target && target !== token) {
          distance = {
            unit,
            icon: isTarget ? '<i class="fa-solid fa-crosshairs-simple"></i>' : '<i class="fa-solid fa-expand"></i>',
            range: (token.distanceTo(target) * multiplier).toFixed(decimals)
          };
        }
      }
      let status;
      if (!this.#isObserved || getSetting("see-status")) {
        const statuses = getSetting("status").split(",").map((x) => x.trim()).filter(Boolean);
        if (statuses.length && hp.max) {
          const max = hp.max + (useStamina ? sp.max : 0);
          const current = hp.value + (useStamina ? sp.value : 0);
          const ratio = Math.clamped(current / max, 0, 1);
          const pick = (() => {
            const length = statuses.length;
            if (getSetting("last-status")) {
              if (ratio === 1)
                return length;
              return Math.ceil(ratio * (length - 1));
            }
            return Math.ceil(ratio * length);
          })();
          status = {
            hue: ratio * ratio * 122 + 3,
            value: pick === 0 ? game.i18n.localize("EFFECT.StatusDead") : statuses.at(pick - 1)
          };
        }
      }
      let sharedData = {
        status,
        distance,
        fontSize,
        tokenId: token.id,
        type: actor.isOfType("creature") ? "creature" : actor.type
      };
      if (!this.#isObserved || actor.isOfType("familiar") && !actor.master)
        return sharedData;
      const { level, saves, isOwner, system, itemTypes } = actor;
      const { resistances, weaknesses, immunities } = attributes;
      sharedData = {
        ...sharedData,
        isOwner,
        isObserver: this.#isObserved,
        name: token.document.name,
        hp,
        ac: ac.value,
        level,
        hasActions: itemTypes.action.length || system.actions?.filter((action) => action.visible !== false).length
      };
      const showRanks = getSetting("ranks");
      function getStatistic(stat, type, stats) {
        const slug = stat.slug;
        const value = type === "bonus" ? modifier(stat.mod) : stat.dc.value;
        return { slug, value, label: stats[slug].label, icon: stats[slug].icon, rank: showRanks && RANKS[stat.rank] };
      }
      __name(getStatistic, "getStatistic");
      function toIWR(category, header) {
        if (!category.length)
          return "";
        const rows = category.map((x) => toInfo(x.label.replace("-", " ").titleCase())).join("");
        if (!header)
          return rows;
        return `<li>${game.i18n.localize(header)}<ul>` + rows + "</ul></li>";
      }
      __name(toIWR, "toIWR");
      if (actor.isOfType("hazard")) {
        const { hardness, emitsSound, stealth } = attributes;
        return {
          ...sharedData,
          hardness,
          emitsSound: emitsSound.toString().capitalize(),
          immunities: toIWR(immunities),
          weaknesses: toIWR(weaknesses),
          resistances: toIWR(resistances),
          stealth: {
            value: stealth.value,
            details: await enrichHTML(stealth.details, actor)
          },
          saves: savesSetting !== "none" && ["fortitude", "reflex", "will"].map((slug) => {
            const save = saves[slug];
            if (!save)
              return { slug, label: SAVES[slug].label, icon: SAVES[slug].icon };
            return getStatistic(save, savesSetting, SAVES);
          })
        };
      }
      sharedData = {
        ...sharedData,
        sidebarTitles: {
          actions: `${MODULE_ID2}.actions.title`,
          items: `${MODULE_ID2}.items.title`,
          spells: `${MODULE_ID2}.spells.title`,
          skills: `${MODULE_ID2}.skills.title`,
          extras: `${MODULE_ID2}.extras.title`
        },
        hasItems: actor.inventory.size
      };
      if (actor.isOfType("vehicle")) {
        const { hardness, collisionDC, collisionDamage } = attributes;
        const { details } = system;
        const { crew, passengers, pilotingCheck, speed: speed2 } = details;
        return {
          ...sharedData,
          hardness,
          crew,
          passengers,
          pilotingCheck,
          speed: speed2,
          collisionDC: collisionDC.value,
          collisionDamage: collisionDamage.value,
          immunities: toIWR(immunities),
          weaknesses: toIWR(weaknesses),
          resistances: toIWR(resistances),
          fortitude: getStatistic(saves.fortitude, savesSetting, SAVES)
        };
      }
      const showDeath = getSetting("show-death");
      const { heroPoints } = actor;
      const { traits, resources } = system;
      const { wounded, dying, shield, speed, adjustment } = attributes;
      function toInfo(str) {
        return `<li>${str.trim()}</li>`;
      }
      __name(toInfo, "toInfo");
      function sort(a, b) {
        return localeCompare(a, b);
      }
      __name(sort, "sort");
      const languages = traits?.languages?.value.map((x) => game.i18n.localize(CONFIG.PF2E.languages[x])).filter(Boolean).sort(sort).map(toInfo).join("");
      const senses = isCharacter ? traits.senses.map((x) => x.label) : traits.senses.value?.split(",");
      const speeds = SPEEDS.map(({ type, icon }, index) => ({
        index,
        icon,
        label: game.i18n.localize(CONFIG.PF2E.speedTypes[type] ?? "PF2E.SpeedTypesLand"),
        value: (index === 0 ? speed.total : speed.otherSpeeds.find((s) => s.type === type)?.total) || 0
      }));
      const selectedSpeed = getFlag(actor, `speeds.selected.${game.user.id}`);
      const mainSpeed = (() => {
        let index = 0;
        if (selectedSpeed !== void 0)
          index = selectedSpeed;
        else if (getSetting("force-speed") || speeds[0].value === 0) {
          const base = { index: 0, value: speeds[0].value };
          index = speeds.reduce((prev, { value }, index2) => value > prev.value ? { index: index2, value } : prev, base).index;
        }
        return speeds.splice(index, 1)[0];
      })();
      let otherSpeeds = speeds.map(({ value, label, index }) => `<li><a data-value="${index}">${label}: ${value}</a></li>`).join("");
      if (speed.details)
        otherSpeeds += `<li>${game.i18n.localize("PF2E.DetailsHeading")}: ${speed.details}</li>`;
      return {
        ...sharedData,
        sp: useStamina ? sp : { max: 0 },
        hero: heroPoints,
        dying,
        wounded,
        shield,
        resolve: resources.resolve,
        adjustment,
        alliance: ALLIANCES[getAlliance(actor).alliance],
        isCharacter,
        showDeathLine: isCharacter && (showDeath === "always" || dying.value || wounded.value),
        digitalPips: getSetting("pips"),
        hasCover: this.hasCover,
        saves: savesSetting !== "none" && ["fortitude", "reflex", "will"].map((slug) => getStatistic(saves[slug], savesSetting, SAVES)),
        others: othersSetting !== "none" && ["perception", "stealth", "athletics"].map((slug) => getStatistic(actor.getStatistic(slug), othersSetting, SKILLS3)),
        speeds: {
          main: mainSpeed,
          others: otherSpeeds
        },
        iwr: toIWR(immunities, "PF2E.ImmunitiesLabel") + toIWR(weaknesses, "PF2E.WeaknessesLabel") + toIWR(resistances, "PF2E.ResistancesLabel"),
        senses: senses?.filter(Boolean).map(toInfo).join(""),
        languages,
        hasSpells: actor.spellcasting.some((x) => x.category !== "items"),
        hasNotes: !isCharacter && (system.details.publicNotes || system.details.privateNotes && isOwner)
      };
    }
    close(options = {}) {
      this.setToken(null);
      this.unlock(true);
      this.#softLock = false;
      this.#cancelDelay();
      const states = Application.RENDER_STATES;
      if (!options.force && ![states.RENDERED, states.ERROR].includes(this._state))
        return;
      this._state = states.CLOSING;
      let el = this.element;
      if (!el)
        return this._state = states.CLOSED;
      el.css({ minHeight: 0 });
      for (let cls of this.constructor._getInheritanceChain()) {
        Hooks.call(`close${cls.name}`, this, el);
      }
      el.remove();
      this._element = null;
      this._state = states.CLOSED;
      delete ui.windows[this.appId];
    }
    async _render(force = false, options = {}) {
      let sidebarType;
      let sidebarScrolltop;
      let popup2;
      let popupScrollTop;
      let filter;
      if (this.#lastToken === this.#token) {
        const sidebar = this.sidebar[0];
        if (sidebar) {
          sidebarType = sidebar.dataset.type;
          sidebarScrolltop = sidebar.scrollTop;
          const filterHeader = sidebar.querySelector(".sidebar-header");
          if (filterHeader.classList.contains("show"))
            filter = filterHeader.querySelector(" input").value.trim();
        }
        popup2 = this.popup[0];
        if (popup2)
          popupScrollTop = popup2.scrollTop;
      }
      await super._render(force, options);
      ui.windows[this.appId] = this;
      if (sidebarType) {
        const sidebar = await this.#openSidebar(sidebarType, filter);
        if (sidebarScrolltop > 0)
          sidebar.scrollTop(sidebarScrolltop);
      }
      if (popup2) {
        this.element.append(popup2);
        if (popupScrollTop > 0)
          popup2.scrollTop = popupScrollTop;
      }
      this.#lastToken = this.#token;
      if (!this.inner.length)
        return;
      if (getSetting("autolock") === "render")
        this.lock();
    }
    render() {
      if (this.actor)
        super.render(true);
    }
    _injectHTML(html) {
      $("body").append(html);
      this._element = html;
    }
    setPosition() {
      const token = this.#token;
      if (!token)
        return;
      const element = this.element[0];
      const scale = token.worldTransform.a;
      const hud2 = element.getBoundingClientRect();
      const targetCoords = canvas.clientCoordinatesFromCanvas(token.document._source);
      const target = {
        x: targetCoords.x,
        y: targetCoords.y,
        width: token.hitArea.width * scale,
        height: token.hitArea.height * scale,
        get right() {
          return this.x + this.width;
        },
        get bottom() {
          return this.y + this.height;
        }
      };
      let coords;
      const positions = this.#isObserved ? POSITIONS[getSetting("position")].slice() : POSITIONS[getSetting("small-position")].slice();
      while (positions.length && !coords) {
        const position = positions.shift();
        if (position === "left") {
          coords = {
            x: target.x - hud2.width,
            y: postionFromTargetY(hud2, target)
          };
          if (coords.x < 0)
            coords = void 0;
        } else if (position === "right") {
          coords = {
            x: target.right,
            y: postionFromTargetY(hud2, target)
          };
          if (coords.x + hud2.width > window.innerWidth)
            coords = void 0;
        } else if (position === "top") {
          coords = {
            x: postionFromTargetX(hud2, target),
            y: target.y - hud2.height
          };
          if (coords.y < 0)
            coords = void 0;
        } else if (position === "bottom") {
          coords = {
            x: postionFromTargetX(hud2, target),
            y: target.bottom
          };
          if (coords.y + hud2.height > window.innerHeight)
            coords = void 0;
        }
      }
      if (coords) {
        element.style.left = `${coords.x}px`;
        element.style.top = `${coords.y}px`;
      }
      return coords;
    }
    lock() {
      this.#lock = true;
    }
    unlock(force) {
      if (!force && (this.sidebar.length || getSetting("autolock") !== "none"))
        return;
      this.#lock = false;
    }
    activateListeners(html) {
      const token = this.#token;
      const actor = token?.actor;
      if (!actor)
        return;
      const isOwner = token.isOwner;
      const ChatMessagePF2e = getChatMessageClass();
      if (getSetting("tooltips")) {
        html.find(".inner [data-tooltip]").attr("data-tooltip", "");
      }
      html.find("[data-action=show-notes").on("click", async (event) => {
        event.preventDefault();
        const { publicNotes, privateNotes, blurb } = actor.system.details;
        const traits = actor.system.traits.value.map((trait) => ({
          label: game.i18n.localize(CONFIG.PF2E.creatureTraits[trait]) ?? trait,
          description: game.i18n.localize(CONFIG.PF2E.traitsDescriptions[trait]) ?? ""
        }));
        const content = await renderTemplate(templatePath("show-notes"), {
          traits,
          blurb: blurb.trim(),
          publicNotes: publicNotes.trim(),
          privateNotes: isOwner && privateNotes.trim()
        });
        popup(`${actor.name} - ${game.i18n.localize("PF2E.NPC.NotesTab")}`, content, actor);
      });
      html.on("mousedown", () => this.bringToTop());
      html.on("mouseenter", () => {
        if (!html.find(".inner").length)
          return;
        if (getSetting("autolock") === "hover")
          this.lock();
        this.#softLock = true;
      });
      html.on("mouseleave", () => {
        this.#softLock = false;
        if (this.#lock || this.#hoveredToken)
          return;
        this.close();
      });
      html.on("dragover", () => {
        if (token.isOwner && html.find("> .sidebar.extras").length && !html.find("> .popup").length)
          return;
        html.css("opacity", 0.1);
        html.css("pointerEvents", "none");
        window.addEventListener(
          "dragend",
          () => {
            html.css("opacity", 1);
            html.css("pointerEvents", "");
          },
          { once: true }
        );
      });
      const infos = html.find("[data-action=show-info]");
      const infosElements = isOwner ? infos.filter(":not(.speeds)") : infos;
      infosElements.on("click", (event) => {
        const target = event.currentTarget;
        const content = target.dataset.tooltipContent;
        if (target.classList.contains("stealth")) {
          this.#createHUDLockedListTooltip({ content, event, direction: "DOWN" });
        } else {
          createTooltip({ target, content, direction: "UP" });
        }
      });
      html.find("[data-action=open-sidebar]").on("click", this.#openSidebar.bind(this));
      if (!isOwner)
        return;
      html.find("[data-action=toggle-adjustment]").on("click contextmenu", (event) => {
        event.preventDefault();
        const adjustment = event.type === "click" ? "elite" : "weak";
        actor.applyAdjustment(actor.system.attributes.adjustment === adjustment ? null : adjustment);
      });
      html.find("[data-action=toggle-alliance]").on("click", (event) => {
        const { originalAlliance, defaultAlliance } = getAlliance(actor);
        const content = [
          {
            value: "default",
            label: game.i18n.format("PF2E.Actor.Creature.Alliance.Default", {
              alliance: game.i18n.localize(ALLIANCES[defaultAlliance].label)
            })
          },
          { value: "opposition", label: game.i18n.localize(ALLIANCES.opposition.label) },
          { value: "party", label: game.i18n.localize(ALLIANCES.party.label) },
          { value: "neutral", label: game.i18n.localize(ALLIANCES.neutral.label) }
        ];
        this.#createHUDLockedListTooltip({
          content,
          event,
          selected: originalAlliance,
          onClick: (value) => {
            if (value === "default")
              actor.update({ "system.details.-=alliance": null });
            else
              actor.update({ "system.details.alliance": value === "neutral" ? null : value });
          }
        });
      });
      html.find("[data-action=collision-dc]").on("click", (event) => {
        event.preventDefault();
        const dc = actor.system.attributes.collisionDC.value || 15;
        ChatMessagePF2e.create({
          content: `@Check[type:reflex|dc:${dc}]`,
          speaker: ChatMessagePF2e.getSpeaker({ actor })
        });
      });
      html.find("[data-action=collision-damage]").on("click", async (event) => {
        event.preventDefault();
        let formula = (actor.system.attributes.collisionDamage.value || "1d6").trim();
        if (!isNaN(Number(formula.at(-1))))
          formula += "[bludgeoning]";
        const DamageRoll = getDamageRollClass();
        const roll = await new DamageRoll(formula).evaluate({ async: true });
        ChatMessagePF2e.create({
          flavor: `<strong>${game.i18n.localize("PF2E.vehicle.collisionDamageLabel")}</strong>`,
          speaker: ChatMessagePF2e.getSpeaker({ actor }),
          type: CONST.CHAT_MESSAGE_TYPES.ROLL,
          sound: "sounds/dice.wav",
          rolls: [roll]
        });
      });
      html.find("input").on("change", async (event) => {
        const target = event.currentTarget;
        const value = target.valueAsNumber;
        const attr = target.name;
        target.blur();
        if (attr !== "shield.value")
          await actor.update({ [attr]: value });
        else
          await actor.heldShield.update({ "system.hp.value": value });
      });
      html.find("[data-action=toggle-hero]").on("click contextmenu", (event) => {
        event.preventDefault();
        let { max, value } = actor.heroPoints;
        const change = event.type === "click" ? 1 : -1;
        const newValue = Math.clamped(value + change, 0, max);
        if (newValue !== value)
          actor.update({ "system.resources.heroPoints.value": newValue });
      });
      html.find("[data-action=raise-shield]").on("click", (event) => {
        event.preventDefault();
        game.pf2e.actions.raiseAShield({ actors: [actor], tokens: [token] });
      });
      html.find("[data-action=take-cover]").on("click", async (event) => {
        event.preventDefault();
        const existing = getCoverEffect(actor);
        if (existing)
          existing.delete();
        else
          game.pf2e.actions.get("take-cover").use({ actors: [actor], tokens: [token] });
      });
      html.find("[data-action=roll-save]").on("click", (event) => {
        event.preventDefault();
        const save = event.currentTarget.dataset.save;
        actor.saves[save].roll({ event });
      });
      html.find("[data-action=roll-other]").on("click", (event) => {
        event.preventDefault();
        const slug = event.currentTarget.dataset.slug;
        if (slug !== "athletics") {
          const { ctrlKey, metaKey, shiftKey } = event;
          event = new MouseEvent("click", { ctrlKey: !ctrlKey, metaKey, shiftKey });
        }
        actor.getStatistic(slug)?.roll({ event });
      });
      html.find("[data-action=recovery-check]").on("click", (event) => {
        event.preventDefault();
        actor.rollRecovery(event);
      });
      html.find("[data-action=toggle-dying], [data-action=toggle-wounded]").on("click contextmenu", (event) => {
        event.preventDefault();
        const condition = event.currentTarget.dataset.action === "toggle-dying" ? "dying" : "wounded";
        const max = actor.system.attributes[condition]?.max;
        if (!max)
          return;
        if (event.type === "click")
          actor.increaseCondition(condition, { max });
        else
          actor.decreaseCondition(condition);
      });
      html.find("[data-action=use-resolve]").on("click", (event) => {
        event.preventDefault();
        useResolve(actor);
      });
      infos.filter(".speeds").on("click", (event) => {
        this.#createHUDLockedListTooltip({
          event,
          content: event.currentTarget.dataset.tooltipContent,
          direction: "UP",
          onClick: (index) => {
            setFlag(actor, `speeds.selected.${game.user.id}`, Number(index));
          }
        });
      });
    }
    #createHUDLockedListTooltip({ content, event, onClick, selected, direction, locked }) {
      createTooltip({
        content,
        target: event.currentTarget,
        direction,
        selected,
        locked: true,
        onCreate: () => this.lock(),
        onClick,
        onDismiss: () => this.unlock()
      });
    }
    async showFilter() {
      let sidebar = this.sidebar;
      if (!sidebar.length)
        return;
      if (!sidebar.find(".sidebar-header").hasClass("show"))
        sidebar = await this.#openSidebar(sidebar.data().type, "");
      sidebar.find(".sidebar-header").find("input").focus().select();
      sidebar.scrollTop(0);
    }
    async #openSidebar(type, filter) {
      type = typeof type === "string" ? type : type.currentTarget.dataset.type;
      let element = this.element;
      let sidebar = this.sidebar;
      const action = sidebar[0]?.dataset.type;
      sidebar.remove();
      element.find("[data-action=open-sidebar]").removeClass("active");
      if (action === type && filter === void 0) {
        this.unlock();
        return;
      }
      const token = this.#token;
      const actor = token.actor;
      const showFilter = filter !== void 0 || getSetting("filter");
      const { getData, addListeners } = SIDEBARS[type];
      const data = await getData({ hud: this, actor, token, filter: filter?.toLowerCase() }) ?? {};
      if (!data.contentData && !showFilter)
        return ui.notifications.warn(localize(`${type}.empty`, { name: this.#token.name }));
      const contentData = {
        ...data.contentData ?? {},
        isGM: game.user.isGM,
        isCharacter: this.isCharacter,
        isOwner: actor.isOwner
      };
      this.lock();
      element.find(`[data-action=open-sidebar][data-type=${type}]`).addClass("active");
      element = element[0];
      const classes = data.classes ?? [];
      classes.push(type);
      if (!getSetting("scrollbar"))
        classes.push("no-scrollbar");
      if (data.doubled)
        classes.push("doubled");
      const style = data.style ?? {};
      style["--max-height"] = getSetting("height").trim() || "100%";
      const tmp = document.createElement("div");
      tmp.innerHTML = await renderTemplate(templatePath("sidebar"), {
        classes: classes.join(" "),
        style: Object.entries(style).map(([key, value]) => `${key}: ${value}`).join("; "),
        type,
        filter,
        filterLabel: localize("filter"),
        showFilter,
        content: (await renderTemplate(templatePath(`sidebars/${type}`), contentData)).trim()
      });
      sidebar = tmp.firstElementChild;
      element.append(sidebar);
      const rect = sidebar.getBoundingClientRect();
      const target = element.getBoundingClientRect();
      let left;
      const position = getSetting("position");
      if (position === "left") {
        left = target.x - rect.width;
        if (left < 0)
          left = target.right;
      } else {
        left = target.right;
        if (left + rect.width > window.innerWidth)
          left = target.x - rect.width;
      }
      const elPadding = parseInt(window.getComputedStyle(element).padding);
      let top = postionFromTargetY(rect, target, elPadding);
      sidebar.style.left = `${left}px`;
      sidebar.style.top = `${top}px`;
      sidebar = $(sidebar);
      sidebar.find(".sidebar-header [data-action=sidebar-filter-clear]").on("click", (event) => {
        event.preventDefault();
        sidebar.find(".sidebar-header [data-action=sidebar-filter]").val("");
        this.#openSidebar(type, "");
      });
      sidebar.find(".sidebar-header [data-action=sidebar-filter]").on("keydown", (event) => {
        if (event.key === "Enter")
          this.#openSidebar(type, event.currentTarget.value.trim());
      });
      addListeners({ el: sidebar, actor, token, hud: this });
      Hooks.callAll("renderHUDSidebar", type, sidebar, this);
      return sidebar;
    }
  };
  __name(HUD, "HUD");
  function postionFromTargetY(el, target, margin = 0) {
    let y2 = target.y + target.height / 2 - el.height / 2;
    if (y2 + el.height > window.innerHeight)
      y2 = window.innerHeight - el.height - margin;
    if (y2 < 0)
      y2 = margin;
    return y2;
  }
  __name(postionFromTargetY, "postionFromTargetY");
  function postionFromTargetX(el, target) {
    let x = target.x + target.width / 2 - el.width / 2;
    if (x + el.width > window.innerWidth)
      y = window.innerWidth - el.width;
    if (x < 0)
      x = 0;
    return x;
  }
  __name(postionFromTargetX, "postionFromTargetX");
  function getAlliance(actor) {
    const allianceSource = actor._source.system.details?.alliance;
    const alliance = allianceSource === null ? "neutral" : allianceSource ?? "default";
    const defaultAlliance = actor.hasPlayerOwner ? "party" : "opposition";
    return {
      defaultAlliance,
      originalAlliance: alliance,
      alliance: alliance === "default" ? defaultAlliance : alliance
    };
  }
  __name(getAlliance, "getAlliance");

  // src/module.js
  var MODULE_ID2 = "pf2e-token-hud";
  var hud = null;
  function getHud(element = false) {
    return element ? hud?.element : hud;
  }
  __name(getHud, "getHud");
  function enableModule(enabled) {
    if (enabled && !hud) {
      hud = new HUD();
    } else if (!enabled && hud) {
      hud.delete();
      hud = null;
    }
  }
  __name(enableModule, "enableModule");
  function getSetting(setting) {
    return game.settings.get(MODULE_ID2, setting);
  }
  __name(getSetting, "getSetting");
  function localize(...args) {
    const data = args.at(-1);
    const useFormat = typeof data === "object";
    const keys = useFormat ? args.slice(0, -1) : args;
    keys.unshift(MODULE_ID2);
    return game.i18n[useFormat ? "format" : "localize"](keys.join("."), data);
  }
  __name(localize, "localize");
  function hasFeat(actor, uuid) {
    return actor.itemTypes.feat.some((feat) => feat.sourceId === uuid);
  }
  __name(hasFeat, "hasFeat");
  function templatePath(template) {
    return `modules/${MODULE_ID2}/templates/${template}.hbs`;
  }
  __name(templatePath, "templatePath");
  function modifier(mod) {
    return mod >= 0 ? `+${mod}` : mod;
  }
  __name(modifier, "modifier");
  function getFlag(doc, flag) {
    return doc.getFlag(MODULE_ID2, flag);
  }
  __name(getFlag, "getFlag");
  function setFlag(doc, flag, value) {
    return doc.setFlag(MODULE_ID2, flag, value);
  }
  __name(setFlag, "setFlag");
  async function enrichHTML(str, actor, { isOwner = actor.isOwner, rollData = actor.getRollData() } = {}) {
    str = str?.trim();
    if (!str)
      return "";
    const enriched = await TextEditor.enrichHTML(str, { async: true, secrets: isOwner, rollData });
    return enriched;
  }
  __name(enrichHTML, "enrichHTML");
  function isInstanceOf(obj, name) {
    if (typeof obj !== "object")
      return false;
    while (obj = Reflect.getPrototypeOf(obj)) {
      if (obj.constructor.name === name)
        return true;
    }
    return false;
  }
  __name(isInstanceOf, "isInstanceOf");

  // src/keybindings.js
  function registerKeybindings() {
    register("hold", {
      onDown: () => {
        if (getSetting("use-holding") !== "none")
          getHud()?.setHolding(true);
      },
      onUp: () => {
        getHud()?.setHolding(false);
      }
    });
    register("filter", {
      onUp: () => {
        getHud()?.showFilter();
      },
      editable: [
        {
          key: "KeyQ",
          modifiers: ["Control"]
        }
      ]
    });
  }
  __name(registerKeybindings, "registerKeybindings");
  function path(bind, key) {
    return `${MODULE_ID2}.keybinds.${bind}.${key}`;
  }
  __name(path, "path");
  function register(name, extras = {}) {
    game.keybindings.register(MODULE_ID2, name, {
      name: path(name, "name"),
      hint: path(name, "hint"),
      precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
      ...extras
    });
  }
  __name(register, "register");

  // src/settings.js
  function registerSettings() {
    const isGM = game.data.users.find((x) => x._id === game.data.userId).role >= CONST.USER_ROLES.GAMEMASTER;
    const statuses = ["first", "second", "third", "fourth"].map((x) => localize(`settings.status.statuses.${x}`)).join(", ");
    register2("status", String, statuses, { scope: "world" });
    register2("last-status", Boolean, false, { scope: "world" });
    register2("party", Boolean, false, { scope: "world" });
    register2("enabled", Boolean, true, { onChange: enableModule });
    register2("position", String, "right", {
      choices: {
        left: path2("position", "choices.left"),
        right: path2("position", "choices.right"),
        top: path2("position", "choices.top"),
        bottom: path2("position", "choices.bottom")
      }
    });
    register2("small-position", String, "top", {
      choices: {
        left: path2("position", "choices.left"),
        right: path2("position", "choices.right"),
        top: path2("position", "choices.top"),
        bottom: path2("position", "choices.bottom")
      }
    });
    register2("delay", Number, 250, {
      range: {
        min: 0,
        max: 2e3,
        step: 50
      }
    });
    register2("scale", Number, 14, {
      range: {
        min: 10,
        max: 30,
        step: 1
      }
    });
    register2("use-holding", String, "none", {
      hint: path2("use-holding", isGM ? "choices.gm.hint" : "choices.player.hint"),
      choices: {
        none: path2("use-holding", "choices.none"),
        half: path2("use-holding", isGM ? "choices.gm.half" : "choices.player.half"),
        all: path2("use-holding", isGM ? "choices.gm.all" : "choices.player.all")
      }
    });
    register2("autolock", String, "none", {
      choices: {
        none: path2("autolock", "choices.none"),
        hover: path2("autolock", "choices.hover"),
        render: path2("autolock", "choices.render")
      }
    });
    register2("chat-close", Boolean, false);
    register2("observer", Boolean, true);
    register2("see-status", Boolean, false);
    register2("saves", String, "bonus", {
      choices: {
        none: path2("saves", "choices.none"),
        bonus: path2("saves", "choices.bonus"),
        dc: path2("saves", "choices.dc")
      }
    });
    register2("others", String, "none", {
      choices: {
        none: path2("saves", "choices.none"),
        bonus: path2("saves", "choices.bonus"),
        dc: path2("saves", "choices.dc")
      }
    });
    register2("ranks", Boolean, false);
    register2("show-death", String, "always", {
      choices: {
        none: path2("show-death", "choices.none"),
        always: path2("show-death", "choices.always"),
        only: path2("show-death", "choices.only")
      }
    });
    register2("force-speed", Boolean, false);
    register2("tooltips", Boolean, false);
    register2("pips", Boolean, false);
    register2("distance", String, "all", {
      choices: {
        none: path2("distance", "choices.none"),
        self: path2("distance", "choices.self"),
        all: path2("distance", "choices.all")
      }
    });
    register2("unit", String, "");
    register2("height", String, "");
    register2("filter", Boolean, false);
    register2("scrollbar", Boolean, true);
    register2("hazard-width", Number, 32, {
      range: {
        min: 14,
        max: 50,
        step: 1
      }
    });
    register2("actions-columns", Boolean, false);
    register2("items-columns", Boolean, false);
    register2("spells-columns", Boolean, false);
    register2("skills-columns", Boolean, false);
    register2("actions", String, "split", {
      choices: {
        name: path2("actions", "choices.name"),
        type: path2("actions", "choices.type"),
        split: path2("actions", "choices.split")
      }
    });
    register2("actions-colors", Boolean, true);
    register2("attack-close", Boolean, false);
    register2("containers", Boolean, false);
    register2("spells", Boolean, false);
    register2("tradition", Boolean, false);
    register2("cast-close", Boolean, false);
    register2("untrained", Boolean, true);
  }
  __name(registerSettings, "registerSettings");
  function renderSettingsConfig(_, html) {
    const tab = html.find(`.tab[data-tab=${MODULE_ID2}]`);
    function beforeGroup(name, key, dom = "h3") {
      const localized = localize(`menu.${key}`);
      tab.find(`[name="${MODULE_ID2}.${name}"]`).closest(".form-group").before(`<${dom}>${localized}</${dom}>`);
    }
    __name(beforeGroup, "beforeGroup");
    if (game.user.isGM) {
      beforeGroup("enabled", "client.header", "h2");
    }
    beforeGroup("saves", "client.tooltip");
    beforeGroup("distance", "client.distance");
    beforeGroup("height", "client.sidebar");
    beforeGroup("actions", "client.actions");
    beforeGroup("containers", "client.items");
    beforeGroup("spells", "client.spells");
    beforeGroup("untrained", "client.skills");
  }
  __name(renderSettingsConfig, "renderSettingsConfig");
  function path2(setting, key) {
    return `${MODULE_ID2}.settings.${setting}.${key}`;
  }
  __name(path2, "path");
  function register2(name, type, defValue, extra = {}) {
    game.settings.register(MODULE_ID2, name, {
      name: path2(name, "name"),
      hint: path2(name, "hint"),
      scope: "client",
      config: true,
      type,
      default: defValue,
      ...extra
    });
  }
  __name(register2, "register");

  // src/main.js
  Hooks.once("setup", async () => {
    registerSettings();
    registerKeybindings();
    await loadTemplates({
      creature: templatePath("tooltips/creature"),
      hazard: templatePath("tooltips/hazard"),
      vehicle: templatePath("tooltips/vehicle")
    });
  });
  Hooks.once("ready", () => {
    if (getSetting("enabled"))
      enableModule(true);
    game.modules.get("pf2e-token-hud").api = {
      getHud
    };
  });
  Hooks.on("renderSettingsConfig", renderSettingsConfig);
  Hooks.on("drawMeasuredTemplate", (template) => {
    if (template.isPreview)
      getHud()?.close();
  });
  Hooks.on("getActorDirectoryEntryContext", (_, data) => {
    data.unshift({
      icon: '<i class="fa-solid fa-code"></i>',
      name: `${MODULE_ID2}.actor.macros.contextmenu`,
      condition: (html) => {
        const { documentId } = html.data();
        return getSetting("enabled") && game.actors.get(documentId)?.isOwner;
      },
      callback: (html) => {
        const { documentId } = html.data();
        openMacrosDialog(documentId);
      }
    });
  });
  var DataDialog = class extends Dialog {
    async getData(options = {}) {
      const data = super.getData(options);
      if (typeof data.content === "function")
        data.content = await data.content();
      return data;
    }
  };
  __name(DataDialog, "DataDialog");
  function openMacrosDialog(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor)
      return;
    const dialog = new DataDialog(
      {
        title: `${actor.name} - ${localize("actor.macros.title")}`,
        content: async () => {
          const macros = getMacros(actor) ?? [];
          return renderTemplate(templatePath("dialogs/macros"), {
            macros,
            noMacro: localize("extras.no-macro")
          });
        },
        buttons: {},
        render: (html) => {
          actor.apps[dialog.appId] = dialog;
          html.on("drop", (event) => onDroppedMacro(event, actor));
          html.find("[data-action=delete-macro]").on("click", (event) => deleteMacro(event, actor));
        },
        close: () => {
          delete actor.apps[dialog.appId];
        }
      },
      { height: "auto" }
    ).render(true);
  }
  __name(openMacrosDialog, "openMacrosDialog");
})();
//# sourceMappingURL=main.js.map
