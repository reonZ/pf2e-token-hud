(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // src/module.js
  var MODULE_ID = "pf2e-token-hud";
  function getSetting(setting) {
    return game.settings.get(MODULE_ID, setting);
  }
  __name(getSetting, "getSetting");
  function localize(...args) {
    const data = args.at(-1);
    const useFormat = typeof data === "object";
    const keys = useFormat ? args.slice(0, -1) : args;
    keys.unshift(MODULE_ID);
    return game.i18n[useFormat ? "format" : "localize"](keys.join("."), data);
  }
  __name(localize, "localize");
  function templatePath(template) {
    return `modules/${MODULE_ID}/templates/${template}.hbs`;
  }
  __name(templatePath, "templatePath");
  function modifier(mod) {
    return mod >= 0 ? `+${mod}` : mod;
  }
  __name(modifier, "modifier");

  // src/shared.js
  async function getItemSummary(el, actor) {
    const dataset = el.data();
    const item = dataset.itemId ? actor.items.get(dataset.itemId) : await fromUuid(dataset.uuid);
    const data = await item?.getChatData({}, dataset);
    if (!data)
      return;
    const description = document.createElement("div");
    description.classList.add("description");
    await actor.sheet.itemRenderer.renderItemSummary(description, item, data);
    return description;
  }
  __name(getItemSummary, "getItemSummary");
  function addNameTooltipListeners(el) {
    el.on("mouseenter", (event) => {
      event.preventDefault();
      const target = event.currentTarget.querySelector(".name");
      if (target.scrollWidth <= target.clientWidth)
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

  // src/items.js
  var ITEMS_TYPES = {
    weapon: { order: 0, label: "PF2E.InventoryWeaponsHeader" },
    armor: { order: 1, label: "PF2E.InventoryArmorHeader" },
    consumable: { order: 2, label: "PF2E.InventoryConsumablesHeader" },
    equipment: { order: 3, label: "PF2E.InventoryEquipmentHeader" },
    treasure: { order: 4, label: "PF2E.InventoryTreasureHeader" },
    backpack: { order: 5, label: "PF2E.InventoryBackpackHeader" }
  };
  async function getItemsData(actor) {
    const categories = {};
    for (const item of actor.inventory.contents) {
      categories[item.type] ??= [];
      categories[item.type].push(item);
    }
    return {
      categories: Object.entries(categories).map(([type, items]) => {
        items.sort((a, b) => a.name.localeCompare(b.name));
        return { type, items, label: ITEMS_TYPES[type].label };
      }).sort((a, b) => ITEMS_TYPES[a.type].order - ITEMS_TYPES[b.type].order)
    };
  }
  __name(getItemsData, "getItemsData");
  function addItemsListeners(el, actor) {
    addNameTooltipListeners(el.find(".item"));
    const hud2 = el.closest(`#${MODULE_ID}`);
    el.find(".item").on("dragstart", (event) => {
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
    el.find(".quantity input").on("change", (event) => {
      getItemFromEvent(event, actor)?.update({ "system.quantity": event.currentTarget.valueAsNumber });
    });
    el.find("[data-action=toggle-item-invest]").on("click", (event) => {
      event.preventDefault();
      const { itemId } = event.currentTarget.closest(".item").dataset;
      actor.toggleInvested(itemId);
    });
    el.find("[data-action=repair-item]").on("click", (event) => {
      event.preventDefault();
      const item = getItemFromEvent(event, actor);
      if (item)
        game.pf2e.actions.repair({ item, actors: [actor] });
    });
    el.find("[data-action=toggle-identified]").on("click", (event) => {
      event.preventDefault();
      const item = getItemFromEvent(event, actor);
      if (!item)
        return;
      if (item.isIdentified)
        item.setIdentificationStatus("unidentified");
      else
        item.setIdentificationStatus("identified");
    });
    el.find("[data-action=edit-item]").on("click", (event) => {
      event.preventDefault();
      const item = getItemFromEvent(event, actor);
      item?.sheet.render(true, { focus: true });
    });
    el.find("[data-action=delete-item]").on("click", async (event) => {
      event.preventDefault();
      const item = getItemFromEvent(event, actor);
      if (!item)
        return;
      if (event.ctrlKey)
        return item.delete();
      new Dialog({
        title: localize("items.delete.title"),
        content: await renderTemplate("systems/pf2e/templates/actors/delete-item-dialog.hbs", { name: item.name }),
        buttons: {
          ok: {
            icon: '<i class="fa-solid fa-trash"></i>',
            label: localize("items.delete.ok"),
            callback: () => item.delete()
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: localize("items.delete.cancel")
          }
        }
      }).render(true);
    });
    el.find("[data-action=toggle-item-worn").tooltipster({
      animation: "fade",
      delay: 0,
      animationDuration: 10,
      trigger: "click",
      contentAsHTML: true,
      interactive: true,
      arrow: false,
      side: ["bottom", "top"],
      theme: "crb-hover",
      minWidth: 120,
      content: "",
      functionBefore: async function(tooltipster, { event, origin }) {
        const item = getItemFromEvent(event, actor);
        if (!item)
          return;
        const tmp = document.createElement("div");
        tmp.innerHTML = await renderTemplate("systems/pf2e/templates/actors/partials/carry-type.hbs", { item });
        const content = tmp.children[1];
        $(content).find("[data-carry-type]").on("click", (event2) => {
          const { carryType, handsHeld = 0, inSlot } = $(event2.currentTarget).data();
          actor.adjustCarryType(item, carryType, handsHeld, inSlot);
          tooltipster.close();
        });
        tooltipster.content(content);
      }
    });
  }
  __name(addItemsListeners, "addItemsListeners");
  function getItemFromEvent(event, actor) {
    const { itemId } = event.currentTarget.closest("[data-item-id]").dataset;
    return actor.items.get(itemId);
  }
  __name(getItemFromEvent, "getItemFromEvent");

  // src/popup.js
  async function popup(title, content) {
    const hud2 = $(`#${MODULE_ID}`);
    if (!hud2.length)
      return;
    hud2.find(".popup").remove();
    const tmp = document.createElement("div");
    tmp.innerHTML = await renderTemplate(templatePath("popup"), { title, close: localize("popup.close") });
    const popup2 = tmp.firstElementChild;
    popup2.append(content);
    popup2.querySelector("[data-action=close-popup]").addEventListener("click", () => popup2.remove());
    hud2.append(popup2);
  }
  __name(popup, "popup");

  // src/skills.js
  var CROWBAR_UUIDS = ["Compendium.pf2e.equipment-srd.44F1mfJei4GY8f2X", "Compendium.pf2e.equipment-srd.4kz3vhkKPUuXBpxk"];
  var BON_MOT_UUID = "Compendium.pf2e.feats-srd.0GF2j54roPFIDmXf";
  var LABELS = {
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
    "sense-motive": "Compendium.pf2e.actionspf2e.1xRFPTFtWtGJ9ELw",
    seek: "Compendium.pf2e.actionspf2e.BlAOM2X92SI6HMtJ",
    balance: "Compendium.pf2e.actionspf2e.M76ycLAqHoAgbcej",
    escape: "Compendium.pf2e.actionspf2e.SkZAQRkLLkmBQNB9",
    "tumble-through": "Compendium.pf2e.actionspf2e.21WIfSu7Xd7uKqV8",
    "maneuver-in-flight": "Compendium.pf2e.actionspf2e.Qf1ylAbdVi1rkc8M",
    squeeze: "Compendium.pf2e.actionspf2e.kMcV8e5EZUxa6evt",
    "recall-knowledge": "Compendium.pf2e.actionspf2e.1OagaWtBpVXExToo",
    "borrow-arcane-spell": "Compendium.pf2e.actionspf2e.OizxuPb44g3eHPFh",
    "decipher-writing": "Compendium.pf2e.actionspf2e.d9gbpiQjChYDYA2L",
    "identify-magic": "Compendium.pf2e.actionspf2e.eReSHVEPCsdkSL4G",
    "learn-spell": "Compendium.pf2e.actionspf2e.Q5iIYCFdqJFM31GW",
    climb: "Compendium.pf2e.actionspf2e.pprgrYQ1QnIDGZiy",
    forceOpen: "Compendium.pf2e.actionspf2e.SjmKHgI7a5Z9JzBx",
    grapple: "Compendium.pf2e.actionspf2e.PMbdMWc2QroouFGD",
    highJump: "Compendium.pf2e.actionspf2e.2HJ4yuEFY1Cast4h",
    longJump: "Compendium.pf2e.actionspf2e.JUvAvruz7yRQXfz2",
    shove: "Compendium.pf2e.actionspf2e.7blmbDrQFNfdT731",
    swim: "Compendium.pf2e.actionspf2e.c8TGiZ48ygoSPofx",
    trip: "Compendium.pf2e.actionspf2e.ge56Lu1xXVFYUnLP",
    disarm: "Compendium.pf2e.actionspf2e.Dt6B1slsBy8ipJu9",
    repair: "Compendium.pf2e.actionspf2e.bT3skovyLUtP22ME",
    craft: "Compendium.pf2e.actionspf2e.rmwa3OyhTZ2i2AHl",
    "crafting-goods": "",
    earnIncome: "Compendium.pf2e.actionspf2e.QyzlsLrqM0EEwd7j",
    "identify-alchemy": "Compendium.pf2e.actionspf2e.Q4kdWVOf2ztIBFg1",
    createADiversion: "Compendium.pf2e.actionspf2e.GkmbTGfg8KcgynOA",
    impersonate: "Compendium.pf2e.actionspf2e.AJstokjdG6iDjVjE",
    lie: "Compendium.pf2e.actionspf2e.ewwCglB7XOPLUz72",
    feint: "Compendium.pf2e.actionspf2e.QNAVeNKtHA0EUw4X",
    bonMot: "Compendium.pf2e.feats-srd.0GF2j54roPFIDmXf",
    gatherInformation: "Compendium.pf2e.actionspf2e.plBGdZhqq5JBl1D8",
    makeAnImpression: "Compendium.pf2e.actionspf2e.OX4fy22hQgUHDr0q",
    request: "Compendium.pf2e.actionspf2e.DCb62iCBrJXy0Ik6",
    coerce: "Compendium.pf2e.actionspf2e.tHCqgwjtQtzNqVvd",
    demoralize: "Compendium.pf2e.actionspf2e.2u915NdUyQan6uKF",
    "administer-first-aid": "Compendium.pf2e.actionspf2e.MHLuKy4nQO2Z4Am1",
    "treat-disease": "Compendium.pf2e.actionspf2e.TC7OcDa7JlWbqMaN",
    "treat-poison": "Compendium.pf2e.actionspf2e.KjoCEEmPGTeFE4hh",
    treatWounds: "Compendium.pf2e.actionspf2e.1kGNdIIhuglAjIp9",
    "command-an-animal": "Compendium.pf2e.actionspf2e.q9nbyIF0PEBqMtYe",
    perform: "Compendium.pf2e.actionspf2e.EEDElIyin4z60PXx",
    "staging-performance": "",
    subsist: "Compendium.pf2e.actionspf2e.49y9Ec4bDii8pcD3",
    "create-forgery": "Compendium.pf2e.actionspf2e.ftG89SjTSa9DYDOD",
    "conceal-an-object": "Compendium.pf2e.actionspf2e.qVNVSmsgpKFGk9hV",
    hide: "Compendium.pf2e.actionspf2e.XMcnh4cSI32tljXa",
    sneak: "Compendium.pf2e.actionspf2e.VMozDqMMuK5kpoX4",
    senseDirection: "Compendium.pf2e.actionspf2e.fJImDBQfqfjKJOhk",
    "cover-tracks": "Compendium.pf2e.actionspf2e.SB7cMECVtE06kByk",
    track: "Compendium.pf2e.actionspf2e.EA5vuSgJfiHH7plD",
    "palm-an-object": "Compendium.pf2e.actionspf2e.ijZ0DDFpMkWqaShd",
    steal: "Compendium.pf2e.actionspf2e.RDXXE7wMrSPCLv5k",
    "disable-device": "Compendium.pf2e.actionspf2e.cYdz2grcOcRt4jk6",
    "pick-a-lock": "Compendium.pf2e.actionspf2e.2EE4aF4SZpYf0R6H"
  };
  var DUPLICATE_SKILLS = {
    escape: { slug: "escape", cost: "1", type: 2, noSkill: true },
    "recall-knowledge": { slug: "recall-knowledge", cost: "1", secret: true },
    "decipher-writing": { slug: "decipher-writing", type: 2, trained: true },
    "identify-magic": { slug: "identify-magic", trained: true },
    "learn-spell": { slug: "learn-spell", trained: true }
  };
  var SKILLS = [
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
        "escape",
        { slug: "tumble-through", cost: "1", type: 2 },
        { slug: "maneuver-in-flight", cost: "1", type: 2, trained: true },
        { slug: "squeeze", type: 2, trained: true }
      ]
    },
    {
      slug: "arcana",
      actions: [
        "recall-knowledge",
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
        "escape",
        {
          slug: "forceOpen",
          cost: "1",
          type: 1,
          map: true,
          modifiers: [
            {
              condition: (actor) => !actor.itemTypes.equipment.some(
                (item) => item.isHeld && CROWBAR_UUIDS.includes(item.getFlag("core", "sourceId"))
              ),
              modifiers: [
                {
                  slug: "no-crowbar",
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
        { slug: "shove", cost: "1", type: 1, map: true },
        { slug: "swim", cost: "1", type: 1 },
        { slug: "trip", cost: "1", type: 2, map: true },
        { slug: "disarm", cost: "1", type: 1, map: true, trained: true }
      ]
    },
    {
      slug: "crafting",
      actions: [
        "recall-knowledge",
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
          condition: (actor) => actor.itemTypes.feat.some((feat) => feat.getFlag("core", "sourceId") === BON_MOT_UUID)
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
        { slug: "administer-first-aid", cost: "2", type: 2, variants: ["stabilize", "stop-bleeding"] },
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
        "recall-knowledge",
        "identify-magic",
        "learn-spell"
      ]
    },
    {
      slug: "occultism",
      actions: [
        "recall-knowledge",
        //
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
          variants: [
            "acting",
            "comedy",
            "dance",
            "keyboards",
            "oratory",
            "percussion",
            "singing",
            "strings",
            "winds",
            "warning"
          ]
        },
        { slug: "staging-performance", trained: true }
      ]
    },
    {
      slug: "religion",
      actions: [
        "recall-knowledge",
        //
        "decipher-writing",
        "identify-magic",
        "learn-spell"
      ]
    },
    {
      slug: "society",
      actions: [
        "recall-knowledge",
        //
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
  SKILLS.forEach((skill) => {
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
  var SKILLS_SLUGS = SKILLS.map((skill) => skill.slug);
  var SKILLS_MAP = SKILLS.reduce((skills, { slug, actions }) => {
    skills[slug] = {
      slug,
      actions: actions.reduce((actions2, action) => {
        actions2[action.slug] = action;
        return actions2;
      }, {})
    };
    return skills;
  }, {});
  async function getSkillsData(actor) {
    const skills = [];
    for (let i = 0; i < SKILLS.length; i++) {
      const { slug, actions } = SKILLS[i];
      const { label, rank, mod } = getSkill(slug, actor);
      skills[i] = {
        slug,
        label,
        rank,
        actions: actions.filter((action) => !action.condition || action.condition(actor)),
        modifier: modifier(mod)
      };
    }
    const lores = Object.values(actor.skills).filter((skill) => skill.lore).map(({ label, rank, mod, slug }) => ({
      slug,
      label,
      rank,
      modifier: modifier(mod)
    }));
    return { skills, lores };
  }
  __name(getSkillsData, "getSkillsData");
  function getSkill(slug, actor) {
    return slug === "perception" ? actor.perception : actor.skills[slug];
  }
  __name(getSkill, "getSkill");
  function addSkillsListeners(el, actor) {
    el.find("[data-action=roll-skill]").on("click", (event) => {
      event.preventDefault();
      const { slug } = event.currentTarget.dataset;
      getSkill(slug, actor).roll({ event });
    });
    el.find("[data-action=roll-action]").on("click contextmenu", async (event) => {
      event.preventDefault();
      const target = $(event.currentTarget);
      const { skillSlug, slug } = target.closest(".action").data();
      const variant = event.type === "contextmenu" ? await createVariantDialog(actor, skillSlug) : void 0;
      if (variant !== null)
        rollAction(event, actor, skillSlug, slug, target.data(), variant);
    });
    el.find("[data-action=show-description]").on("click", async (event) => {
      event.preventDefault();
      const action = $(event.currentTarget).closest(".action");
      const description = await getItemSummary(action, actor);
      if (description)
        popup(action.find(".name").children().html().trim(), description);
    });
  }
  __name(addSkillsListeners, "addSkillsListeners");
  async function createVariantDialog(actor, base) {
    let content = '<p style="text-align: center; margin-block: 0 8px;">';
    content += `<strong>${localize("skills.variant.label")}</strong> <select>`;
    for (const slug of SKILLS_SLUGS) {
      const selected = slug === base ? "selected" : "";
      content += `<option value="${slug}" ${selected}>${getSkill(slug, actor).label}</option>`;
    }
    content += "</select></p>";
    return Dialog.prompt({
      title: localize("skills.variant.title"),
      label: localize("skills.variant.button"),
      callback: (html) => html.find("select").val(),
      rejectClose: false,
      content,
      options: { width: 280 }
    });
  }
  __name(createVariantDialog, "createVariantDialog");
  function rollAction(event, actor, skillSlug, slug, { variant, map }, skill) {
    const { type, modifiers, secret, noSkill } = SKILLS_MAP[skillSlug].actions[slug];
    skill ??= noSkill ? void 0 : skillSlug;
    const options = {
      event,
      actors: [actor],
      variant,
      rollMode: secret ? "blindroll" : "roll"
    };
    if (!type) {
      getSkill(skill, actor).roll(options);
      return;
    }
    options.modifiers = modifiers?.flatMap(({ condition, modifiers: modifiers2 }) => {
      if (condition && !condition(actor))
        return null;
      return modifiers2.map((modifier2) => new game.pf2e.Modifier(modifier2));
    }).filter(Boolean) ?? [];
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

  // src/spells.js
  async function getSpellsData(actor) {
    const focusPool = actor.system.resources.focus?.value ?? 0;
    const entries = actor.spellcasting.regular;
    const spells = [];
    for (const entry of entries) {
      const entryId = entry.id;
      const data = await entry.getSheetData();
      const isCharge = entry.system?.prepared?.value === "charge";
      const isStaff = getProperty(entry, "flags.pf2e-staves.staveID") !== void 0;
      const charges = { value: getProperty(entry, "flags.pf2e-staves.charges") ?? 0 };
      for (const slot of data.levels) {
        if (!slot.active.length || slot.uses?.max === 0)
          continue;
        const slotSpells = [];
        const actives = slot.active.filter((x) => x && x.uses?.max !== 0);
        for (let slotId = 0; slotId < actives.length; slotId++) {
          const { spell, expended, virtual, uses, castLevel } = actives[slotId];
          slotSpells.push({
            name: spell.name,
            img: spell.img,
            castLevel: castLevel ?? spell.level,
            slotId,
            entryId,
            itemId: spell.id,
            inputId: data.isInnate ? spell.id : data.id,
            inputPath: isCharge ? "flags.pf2e-staves.charges" : data.isInnate ? "system.location.uses.value" : `system.slots.slot${slot.level}.value`,
            isCharge,
            isVirtual: virtual,
            isInnate: data.isInnate,
            isCantrip: slot.isCantrip,
            isFocus: data.isFocusPool,
            isPrepared: data.isPrepared,
            isSpontaneous: data.isSpontaneous || data.isFlexible,
            slotLevel: slot.level,
            uses: uses ?? (isCharge ? charges : slot.uses),
            expended: expended ?? (data.isFocusPool ? focusPool <= 0 : false),
            action: spell.system.time.value,
            type: isCharge ? isStaff ? `${MODULE_ID}.spells.staff` : `${MODULE_ID}.spells.charges` : data.isInnate ? "PF2E.PreparationTypeInnate" : data.isSpontaneous ? "PF2E.PreparationTypeSpontaneous" : data.isFlexible ? "PF2E.SpellFlexibleLabel" : data.isFocusPool ? "PF2E.SpellFocusLabel" : "PF2E.SpellPreparedLabel",
            order: isCharge ? 0 : data.isPrepared ? 1 : data.isFocusPool ? 2 : data.isInnate ? 3 : data.isSpontaneous ? 4 : 5
          });
        }
        if (slotSpells.length) {
          spells[slot.level] ??= [];
          spells[slot.level].push(...slotSpells);
        }
      }
    }
    if (spells.length) {
      const sort = getSetting("order") ? (a, b) => a.order === b.order ? a.name.localeCompare(b.name) : a.order - b.order : (a, b) => a.name.localeCompare(b.name);
      spells.forEach((entry) => entry.sort(sort));
    }
    const ritualData = await actor.spellcasting.ritual?.getSheetData();
    const rituals = ritualData?.levels.flatMap(
      (slot, slotId) => slot.active.map(({ spell }) => ({
        name: spell.name,
        img: spell.img,
        slotId,
        itemId: spell.id,
        level: spell.level,
        time: spell.system.time.value
      }))
    );
    if (spells.length || rituals?.length)
      return { spells, rituals };
  }
  __name(getSpellsData, "getSpellsData");
  function addSpellsListeners(el, actor) {
    addNameTooltipListeners(el.find(".spell"));
    el.find("[data-action=toggle-pips]").on("click contextmenu", (event) => {
      event.preventDefault();
      const change = event.type === "click" ? 1 : -1;
      const points = (actor.system.resources.focus?.value ?? 0) + change;
      actor.update({ "system.resources.focus.value": points });
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
    });
    el.find("[data-action=show-description]").on("click", async (event) => {
      event.preventDefault();
      const spell = $(event.currentTarget).closest(".spell");
      const description = await getItemSummary(spell, actor);
      if (description)
        popup(spell.find(".name").html().trim(), description);
    });
    el.find("[data-input-path]").on("change", async (event) => {
      const { inputPath, entryId } = $(event.currentTarget).data();
      const value = event.currentTarget.valueAsNumber;
      await actor.updateEmbeddedDocuments("Item", [{ _id: entryId, [inputPath]: value }]);
    });
  }
  __name(addSpellsListeners, "addSpellsListeners");

  // src/hud.js
  var COVER_UUID = "Compendium.pf2e.other-effects.I9lfZUiCwMiGogVi";
  var POSITIONS = {
    left: ["left", "right", "top", "bottom"],
    right: ["right", "left", "top", "bottom"],
    top: ["top", "bottom", "left", "right"],
    bottom: ["bottom", "top", "left", "right"]
  };
  var SPEEDS = [
    { type: "land", icon: '<i class="fa-solid fa-shoe-prints"></i>' },
    { type: "burrow", icon: '<i class="fa-solid fa-chevrons-down"></i>' },
    { type: "climb", icon: '<i class="fa-solid fa-spider"></i>' },
    { type: "fly", icon: '<i class="fa-solid fa-feather"></i>' },
    { type: "swim", icon: '<i class="fa-solid fa-person-swimming"></i>' }
  ];
  var SIDEBARS = {
    actions: { getData: () => null, addListeners: () => {
    } },
    items: { getData: getItemsData, addListeners: addItemsListeners },
    spells: { getData: getSpellsData, addListeners: addSpellsListeners },
    skills: { getData: getSkillsData, addListeners: addSkillsListeners },
    extras: { getData: () => null, addListeners: () => {
    } }
  };
  var HUD = class extends Application {
    #token = null;
    #lastToken = null;
    #delay = null;
    #hover = false;
    #closing = null;
    #mouseevent;
    #mousedown = false;
    #lock = false;
    #softLock = false;
    constructor() {
      super();
      this.hoverToken = (token, hover) => {
        if (this.#mousedown || this.#lock || this.#softLock || !(token instanceof Token) || !token.isOwner || !token.actor?.isOfType("character", "npc"))
          return;
        const transform = token.localTransform;
        const document2 = token.document;
        if (transform.tx !== document2.x || transform.ty !== document2.y)
          return;
        this.#hover = hover;
        if (hover && this.#token === token && this.rendered)
          return;
        if (hover) {
          if (this.#token)
            delete this.#token.actor.apps[MODULE_ID];
          this.#token = token;
          if (!this.#closing)
            return this.render();
          clearTimeout(this.#closing);
          this.#closing = null;
          this.render(true);
        } else {
          this.close();
        }
      };
      this.#mouseevent = (event) => {
        if (event.type === "mouseup") {
          this.#mousedown = false;
          return;
        }
        const target = event.target;
        const el = this.element[0];
        if (el) {
          const popup2 = el.querySelector(".popup");
          if (el.contains(target)) {
            if (popup2 && !popup2.contains(target))
              popup2.remove();
            return;
          }
          if (target.closest(".app") || target.closest(".tooltipster-base"))
            return;
          if (popup2)
            return popup2.remove();
          this.close({ force: true });
        }
        this.#lock = false;
        this.#mousedown = true;
      };
      this.forceClose = () => this.close({ force: true });
      this.deleteToken = (token) => {
        if (this.#token && token.id === this.#token.id)
          this.close({ force: true });
      };
      window.addEventListener("mousedown", this.#mouseevent);
      window.addEventListener("mouseup", this.#mouseevent);
    }
    delete() {
      this.close({ force: true });
      window.removeEventListener("mousedown", this.#mouseevent);
      window.removeEventListener("mouseup", this.#mouseevent);
    }
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        popOut: false,
        minimizable: false,
        template: templatePath("hud")
      });
    }
    get token() {
      return this.#token;
    }
    get actor() {
      return this.#token?.actor;
    }
    get hasCover() {
      return this.actor?.itemTypes.effect.find((effect) => effect.flags.core?.sourceId === COVER_UUID);
    }
    getData() {
      const token = this.#token;
      const actor = this.#token?.actor;
      if (!actor)
        return {};
      const { attributes, saves } = actor;
      const { hp, sp, ac, shield, speed } = attributes;
      const speeds = SPEEDS.map((s) => {
        s.value = (s.type === "land" ? speed.total : speed.otherSpeeds.find((o) => o.type === s.type)?.total) ?? 0;
        return s;
      });
      return {
        tokenId: token.id,
        name: token.document.name,
        hp,
        sp,
        ac: ac.value,
        shield,
        hasCover: this.hasCover,
        saves: {
          fortitude: saves.fortitude.mod,
          reflex: saves.reflex.mod,
          will: saves.will.mod
        },
        speeds,
        languages: this.actor.system.traits?.languages?.value.join(", "),
        hasSpells: actor.spellcasting.some((x) => x.category !== "items"),
        hasItems: actor.inventory.coins.copperValue || actor.inventory.length
      };
    }
    #close() {
      this.#token = null;
      this.#hover = false;
      this.#lock = false;
      this.#softLock = false;
      if (this.#delay !== null) {
        clearTimeout(this.#delay);
        this.#delay = null;
      }
      const states = Application.RENDER_STATES;
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
    }
    close(options = {}) {
      const states = Application.RENDER_STATES;
      if (!options.force && !this.#delay && ![states.RENDERED, states.ERROR].includes(this._state))
        return;
      if (options.force)
        return this.#close(options);
      this.#closing = setTimeout(() => {
        this.#closing = null;
        if (this.#hover)
          return;
        this.#close(options);
      });
    }
    async _render(force = false, options = {}) {
      let sidebarType;
      let scrollTop;
      if (this.#lastToken === this.#token) {
        const sidebar = this.element.find(".sidebar")[0];
        if (sidebar) {
          sidebarType = sidebar.dataset.type;
          scrollTop = sidebar.scrollTop;
        }
      }
      await super._render(force, options);
      if (sidebarType) {
        const sidebar = await this.#openSidebar(sidebarType);
        if (scrollTop > 0)
          sidebar.scrollTop = scrollTop;
      }
      this.#lastToken = this.#token;
    }
    render(force) {
      if (!this.#token?.actor || this.#mousedown)
        return;
      if (force)
        return super.render(true);
      const delay = getSetting("delay");
      if (!delay)
        super.render(true);
      else
        this.#delay = setTimeout(() => super.render(true), delay);
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
      const hud2 = element.getBoundingClientRect();
      const scale = token.worldTransform.a;
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
      const positions = POSITIONS[getSetting("position")].slice();
      let coords;
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
    activateListeners(html) {
      const token = this.#token;
      const actor = token?.actor;
      if (!actor)
        return;
      actor.apps[MODULE_ID] = this;
      html.on("mouseenter", () => {
        this.#hover = true;
        this.#softLock = true;
      });
      html.on("mouseleave", () => {
        this.#softLock = false;
        if (this.#lock)
          return;
        this.#hover = false;
        this.close();
      });
      html.on("dragover", () => {
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
      html.find("input").on("change", async (event) => {
        const target = event.currentTarget;
        const value = target.valueAsNumber;
        const attr = target.name;
        target.blur();
        if (attr === "shield.value") {
          await actor.heldShield.update({ "system.hp.value": value });
        } else {
          await actor.update({ [attr]: value });
        }
      });
      html.find("[data-action=raise-shield]").on("click", () => {
        game.pf2e.actions.raiseAShield({ actors: [actor] });
      });
      html.find("[data-action=take-cover]").on("click", async () => {
        const source = (await fromUuid(COVER_UUID)).toObject();
        setProperty(source, "flags.core.sourceId", COVER_UUID);
        const hasCover = this.hasCover;
        if (this.hasCover)
          await hasCover.delete();
        else
          await actor.createEmbeddedDocuments("Item", [source]);
      });
      html.find("[data-action=roll-save]").on("click", (event) => {
        const save = event.currentTarget.dataset.save;
        actor.saves[save].roll({ event });
      });
      html.find(".inner .footer [data-type]").on("click", this.#openSidebar.bind(this));
    }
    async #openSidebar(event) {
      const actor = this.actor;
      const type = typeof event === "string" ? event : event.currentTarget.dataset.type;
      const { getData, addListeners } = SIDEBARS[type];
      const data = await getData(actor);
      if (!data)
        return ui.notifications.warn(localize(`${type}.empty`, { name: this.#token.name }));
      data.isGM = game.user.isGM;
      data.isCharacter = actor.isOfType("character");
      this.#lock = true;
      let element = this.element;
      element.find(".sidebar").remove();
      element.find(".inner .footer [data-type]").removeClass("active");
      element.find(`.inner .footer [data-type=${type}]`).addClass("active");
      element = element[0];
      const tmp = document.createElement("div");
      tmp.innerHTML = await renderTemplate(templatePath(type), data);
      const sidebar = tmp.firstElementChild;
      sidebar.classList.add("sidebar");
      if (!getSetting("scrollbar"))
        sidebar.classList.add("no-scrollbar");
      sidebar.dataset.type = type;
      this.element.append(sidebar);
      const rect = sidebar.getBoundingClientRect();
      const target = element.getBoundingClientRect();
      let left = target.x - rect.width;
      if (left < 0)
        left = target.right;
      const elPadding = parseInt(window.getComputedStyle(element).padding);
      let top = postionFromTargetY(rect, target, elPadding);
      sidebar.style.left = `${left}px`;
      sidebar.style.top = `${top}px`;
      addListeners($(sidebar), actor);
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

  // src/main.js
  var hud = null;
  function registerSetting(name, type, defValue, extra = {}) {
    game.settings.register(MODULE_ID, name, {
      ...extra,
      name: settingPath(name, "name"),
      hint: settingPath(name, "hint"),
      scope: "client",
      config: true,
      type,
      default: defValue
    });
  }
  __name(registerSetting, "registerSetting");
  Hooks.once("setup", () => {
    registerSetting("enabled", Boolean, true, { onChange: enableModule });
    registerSetting("order", Boolean, false);
    registerSetting("scrollbar", Boolean, true);
    registerSetting("position", String, "right", {
      choices: {
        left: settingPath("position", "choices.left"),
        right: settingPath("position", "choices.right"),
        top: settingPath("position", "choices.top"),
        bottom: settingPath("position", "choices.bottom")
      }
    });
    registerSetting("delay", Number, 250, {
      range: {
        min: 0,
        max: 2e3,
        step: 50
      }
    });
  });
  Hooks.once("ready", () => {
    if (getSetting("enabled"))
      enableModule(true);
  });
  function settingPath(setting, key) {
    return `${MODULE_ID}.settings.${setting}.${key}`;
  }
  __name(settingPath, "settingPath");
  function enableModule(enabled) {
    if (enabled && !hud) {
      hud = new HUD();
      Hooks.on("hoverToken", hud.hoverToken);
      Hooks.on("deleteToken", hud.deleteToken);
      Hooks.on("canvasPan", hud.forceClose);
    } else if (!enabled && hud) {
      Hooks.off("hoverToken", hud.hoverToken);
      Hooks.off("deleteToken", hud.deleteToken);
      Hooks.off("canvasPan", hud.forceClose);
      hud.delete();
      hud = null;
    }
  }
  __name(enableModule, "enableModule");
})();
//# sourceMappingURL=main.js.map
