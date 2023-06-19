import { enrichHTML, getFlag, getSetting, localize, modifier, MODULE_ID, setFlag, templatePath } from './module.js'
import { getUniqueTarget, RANKS } from './shared.js'
import { addActionsListeners, getActionsData } from './sidebars/actions.js'
import { addExtrasListeners, getExtrasData } from './sidebars/extras.js'
import { addHazardListeners, getHazardData } from './sidebars/hazard.js'
import { addItemsListeners, getItemsData } from './sidebars/items.js'
import { addSkillsListeners, getSkillsData } from './sidebars/skills.js'
import { addSpellsListeners, getSpellsData } from './sidebars/spells.js'

const COVER_UUID = 'Compendium.pf2e.other-effects.Item.I9lfZUiCwMiGogVi'
const RESOLVE_UUID = 'Compendium.pf2e.feats-srd.Item.jFmdevE4nKevovzo'

const POSITIONS = {
    left: ['left', 'right', 'top', 'bottom'],
    right: ['right', 'left', 'top', 'bottom'],
    top: ['top', 'bottom', 'left', 'right'],
    bottom: ['bottom', 'top', 'left', 'right'],
}

const ALIGNMENTS = {
    G: 'fa-solid fa-face-smile-halo',
    N: 'fa-solid fa-face-meh',
    E: 'fa-solid fa-face-angry-horns',
}

const SPEEDS = [
    { type: 'land', icon: 'fa-solid fa-shoe-prints' },
    { type: 'burrow', icon: 'fa-solid fa-chevrons-down' },
    { type: 'climb', icon: 'fa-solid fa-spider' },
    { type: 'fly', icon: 'fa-solid fa-feather' },
    { type: 'swim', icon: 'fa-solid fa-person-swimming' },
]

const SIDEBARS = {
    actions: { getData: getActionsData, addListeners: addActionsListeners },
    items: { getData: getItemsData, addListeners: addItemsListeners },
    spells: { getData: getSpellsData, addListeners: addSpellsListeners },
    skills: { getData: getSkillsData, addListeners: addSkillsListeners },
    extras: { getData: getExtrasData, addListeners: addExtrasListeners },
    hazard: { getData: getHazardData, addListeners: addHazardListeners },
}

const SAVES = {
    fortitude: { icon: 'fa-solid fa-hand-fist', label: 'PF2E.SavesFortitude' },
    reflex: { icon: 'fa-solid fa-person-running', label: 'PF2E.SavesReflex' },
    will: { icon: 'fa-solid fa-brain', label: 'PF2E.SavesWill' },
}

const SKILLS = {
    perception: { icon: 'fa-solid fa-eye', label: 'PF2E.PerceptionLabel' },
    stealth: { icon: 'fa-duotone fa-eye-slash', label: 'PF2E.SkillStealth' },
    athletics: { icon: 'fa-solid fa-dumbbell', label: 'PF2E.SkillAthletics' },
}

export class HUD extends Application {
    #token = null
    #nextToken = null
    #lastToken = null
    #delay = null
    #hover = false
    #holding = false
    #closing = null
    #mouseevent
    #mousedown = [false, false, false]
    #lock = false
    #softLock = false
    #hoverToken = null
    #deleteToken = null
    #isObserved = false

    constructor() {
        super()

        this.forceClose = () => this.close({ force: true })

        this.#hoverToken = (token, hover) => {
            if (hover) this.#tokenEnter(token)
            else this.#tokenLeave(token)
        }

        this.#mouseevent = event => {
            const button = event.button
            if (![0, 2].includes(button)) return

            if (event.type === 'mouseup') {
                this.#mousedown[button] = false
                return
            }

            this.#mousedown[button] = true

            const target = event.target
            const el = this.element[0]

            if (el) {
                const popup = el.querySelector('.popup')
                if (el.contains(target)) {
                    if (popup && !popup.contains(target)) popup.remove()
                    return
                }
                if (target.closest('.app') || target.closest('.tooltipster-base')) return
                if (el.querySelector('.sidebar.extras') && target.closest('#hotbar')) return
                if (popup) return popup.remove()
                this.forceClose()
            } else this.#cancelDelay()

            this.#lock = false
        }

        this.#deleteToken = token => {
            if (this.#token && token.id === this.#token.id) this.forceClose()
        }

        window.addEventListener('mousedown', this.#mouseevent)
        window.addEventListener('mouseup', this.#mouseevent)

        Hooks.on('hoverToken', this.#hoverToken)
        Hooks.on('deleteToken', this.#deleteToken)
        Hooks.on('canvasPan', this.forceClose)
    }

    setToken(token, isObserved) {
        if (token !== this.#token) {
            if (this.#token) delete this.#token.actor.apps[this.appId]
            this.#token = token
            const actor = token?.actor
            if (actor) actor.apps[this.appId] = this
        }
        this.#isObserved = isObserved ?? this.#checkIfObserved(token)
    }

    setHolding(held) {
        const holding = getSetting('use-holding')
        if (holding === 'none') return

        this.#holding = held

        if (this.#softLock || this.#lock) return

        if (held) {
            if (!this.#hover) return
            const isObserved = this.#checkIfObserved(this.#nextToken)
            if (holding === 'half' && !game.user.isGM && !isObserved) {
                this.#cancelDelay()
                this.render()
                return
            }
            this.setToken(this.#nextToken, isObserved)
            this.render()
        } else {
            if (holding === 'all') this.close()
            else if (game.user.isGM) {
                this.setToken(this.#nextToken)
                this.render()
            } else if (this.#isObserved) this.close()
        }
    }

    #checkIfObserved(token) {
        const actor = token?.actor
        if (!actor) return false

        let isObserved
        const isParty = actor.system.details.alliance === 'party'

        if (game.user.isGM && getSetting('use-holding') === 'half' && !this.#holding) isObserved = false
        else if (actor.isOfType('familiar') && !actor.master) isObserved = false
        else isObserved = token.isOwner || (getSetting('observer') && (token.observer || (isParty && getSetting('party'))))

        return isObserved
    }

    #tokenEnter(token) {
        if ($(window.document).find(':hover').filter('#combat-popout, #sidebar, #mini-tracker').length) return

        const actor = token.actor
        if (!actor || actor.isOfType('loot', 'party')) return

        this.#hover = true
        this.#nextToken = token

        if (this.mousedown || this.#lock || this.#softLock || token === this.#token) return

        const holding = getSetting('use-holding')
        const isObserved = this.#checkIfObserved(token)
        if (holding !== 'none' && !this.#holding && (holding === 'all' || isObserved)) return

        this.#cancelClosing(true)
        this.setToken(token, isObserved)

        if (holding === 'none' || !this.#holding) this.renderWithDelay()
        else this.render()
    }

    renderWithDelay() {
        let delay = getSetting('delay')
        if (delay) {
            if (delay < 10) delay = 10
            this.#delay = setTimeout(() => {
                this.#delay = null
                this.render()
            }, delay)
        } else this.render()
    }

    #cancelClosing(close) {
        if (this.#closing === null) return
        clearTimeout(this.#closing)
        this.#closing = null
        if (close) this.close()
    }

    #cancelDelay() {
        if (this.#delay === null) return
        clearTimeout(this.#delay)
        this.#delay = null
    }

    #tokenLeave(token) {
        this.#hover = false

        if (this.mousedown || this.#lock || this.#softLock) return

        this.#closing = setTimeout(() => {
            this.#closing = null
            if (this.#softLock || this.#lock) return
            this.close()
        }, 10)
    }

    delete() {
        this.forceClose()

        window.removeEventListener('mousedown', this.#mouseevent)
        window.removeEventListener('mouseup', this.#mouseevent)

        Hooks.off('hoverToken', this.#hoverToken)
        Hooks.off('deleteToken', this.#deleteToken)
        Hooks.off('canvasPan', this.forceClose)
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            popOut: false,
            minimizable: false,
            template: templatePath('hud'),
        })
    }

    get mousedown() {
        return this.#mousedown[0] || this.#mousedown[2]
    }

    get token() {
        return this.#token
    }

    get actor() {
        return this.#token?.actor
    }

    get hasCover() {
        return this.actor?.itemTypes.effect.find(effect => effect.flags.core?.sourceId === COVER_UUID)
    }

    get isCharacter() {
        return this.actor?.isOfType('character')
    }

    get sidebar() {
        return this.element.find('> .sidebar')
    }

    async getData() {
        const token = this.#token
        const actor = this.#token?.actor
        if (!actor) return {}

        let distance = null
        const savesSetting = getSetting('saves')
        const othersSetting = getSetting('others')
        const isCharacter = this.isCharacter
        const { attributes } = actor
        const { hp, sp = { max: 0, value: 0 }, ac } = attributes
        const useStamina = game.settings.get('pf2e', 'staminaVariant')
        const showDistance = getSetting('distance')
        const fontSize = getSetting('scale')

        if (showDistance === 'all' || (showDistance === 'self' && this.#isObserved)) {
            const unitSplit = getSetting('unit').split(',')
            const multiplier = Number(unitSplit[0]?.trim()) || 1
            const unit = unitSplit[1]?.trim() || game.system.gridUnits
            const decimals = Number(unitSplit[2]?.trim()) || 0
            const selected = canvas.tokens.controlled

            let isTarget = false
            let target = selected.length === 1 ? selected[0] : null

            if (!target || target === token) {
                target = getUniqueTarget()
                isTarget = true
            }

            if (target && target !== token) {
                distance = {
                    unit,
                    icon: isTarget ? '<i class="fa-solid fa-crosshairs-simple"></i>' : '<i class="fa-solid fa-expand"></i>',
                    range: (token.distanceTo(target) * multiplier).toFixed(decimals),
                }
            }
        }

        let status
        if (!this.#isObserved || getSetting('see-status')) {
            const statuses = getSetting('status')
                .split(',')
                .map(x => x.trim())
                .filter(Boolean)

            if (statuses.length && hp.max) {
                const max = hp.max + (useStamina ? sp.max : 0)
                const current = hp.value + (useStamina ? sp.value : 0)
                const ratio = Math.clamped(current / max, 0, 1)
                const pick = Math.ceil(ratio * statuses.length)

                status = {
                    hue: ratio * ratio * 122 + 3,
                    value: pick === 0 ? game.i18n.localize('EFFECT.StatusDead') : statuses.at(pick - 1),
                }
            }
        }

        let sharedData = {
            status,
            distance,
            fontSize,
            tokenId: token.id,
            type: actor.isOfType('creature') ? 'creature' : actor.type,
        }

        if (!this.#isObserved || (actor.isOfType('familiar') && !actor.master)) return sharedData

        const { level, saves, isOwner, system, itemTypes } = actor
        const { resistances, weaknesses, immunities } = attributes

        sharedData = {
            ...sharedData,
            isOwner,
            isObserver: this.#isObserved,
            name: token.document.name,
            hp,
            ac: ac.value,
            level,
            hasActions: itemTypes.action.length || system.actions?.filter(action => action.visible !== false).length,
        }

        const showRanks = getSetting('ranks')

        function getStatistic(stat, type, stats) {
            const slug = stat.slug
            const value = type === 'bonus' ? modifier(stat.mod) : stat.dc.value
            return { slug, value, label: stats[slug].label, icon: stats[slug].icon, rank: showRanks && RANKS[stat.rank] }
        }

        function toIWR(category, header) {
            if (!category.length) return ''
            const rows = category.map(x => toInfo(x.label.replace('-', ' ').titleCase())).join('')
            if (!header) return rows
            return `<li>${game.i18n.localize(header)}<ul>` + rows + '</ul></li>'
        }

        if (actor.isOfType('hazard')) {
            const { hardness, emitsSound, stealth } = attributes

            return {
                ...sharedData,
                hardness,
                emitsSound: emitsSound.toString().capitalize(),
                immunities: toIWR(immunities),
                weaknesses: toIWR(weaknesses),
                resistances: toIWR(resistances),
                stealth: {
                    value: stealth.value,
                    details: await enrichHTML(stealth.details, actor),
                },
                saves:
                    savesSetting !== 'none' &&
                    ['fortitude', 'reflex', 'will'].map(slug => {
                        const save = saves[slug]
                        if (!save) return { slug, label: SAVES[slug].label, icon: SAVES[slug].icon }
                        return getStatistic(save, savesSetting, SAVES)
                    }),
            }
        }

        sharedData = {
            ...sharedData,
            sidebarTitles: {
                actions: `${MODULE_ID}.actions.title`,
                items: `${MODULE_ID}.items.title`,
                spells: `${MODULE_ID}.spells.title`,
                skills: `${MODULE_ID}.skills.title`,
                extras: `${MODULE_ID}.extras.title`,
            },
            hasItems: actor.inventory.size,
        }

        if (actor.isOfType('vehicle')) {
            const { hardness, collisionDC, collisionDamage } = attributes
            const { details } = system
            const { crew, passengers, pilotingCheck, speed } = details

            return {
                ...sharedData,
                hardness,
                crew,
                passengers,
                pilotingCheck,
                speed,
                collisionDC: collisionDC.value,
                collisionDamage: collisionDamage.value,
                immunities: toIWR(immunities),
                weaknesses: toIWR(weaknesses),
                resistances: toIWR(resistances),
                fortitude: getStatistic(saves.fortitude, savesSetting, SAVES),
            }
        }

        const showDeath = getSetting('show-death')
        const { alignment, heroPoints } = actor
        const { traits } = system
        const { wounded, dying, shield, resolve, speed, adjustment } = attributes

        function toInfo(str) {
            return `<li>${str.trim()}</li>`
        }

        function sort(a, b) {
            return a.localeCompare(b)
        }

        const languages = traits?.languages?.value
            .map(x => game.i18n.localize(CONFIG.PF2E.languages[x]))
            .filter(Boolean)
            .sort(sort)
            .map(toInfo)
            .join('')

        const senses = isCharacter ? traits.senses.map(x => x.label) : traits.senses.value?.split(',').filter(Boolean)

        const speeds = SPEEDS.map(({ type, icon }, index) => ({
            index,
            icon,
            label: game.i18n.localize(CONFIG.PF2E.speedTypes[type] ?? 'PF2E.SpeedTypesLand'),
            value: (index === 0 ? speed.total : speed.otherSpeeds.find(s => s.type === type)?.total) || 0,
        }))

        const selectedSpeed = getFlag(actor, `speeds.selected.${game.user.id}`)
        const mainSpeed = (() => {
            let index = 0
            if (selectedSpeed !== undefined) index = selectedSpeed
            else if (getSetting('force-speed') || speeds[0].value === 0) {
                const base = { index: 0, value: speeds[0].value }
                index = speeds.reduce((prev, { value }, index) => (value > prev.value ? { index, value } : prev), base).index
            }
            return speeds.splice(index, 1)[0]
        })()

        let otherSpeeds = speeds
            .map(({ value, label, index }) => `<a data-index="${index}"><li>${label}: ${value}</li></a>`)
            .join('')
        if (speed.details) otherSpeeds += `<li>${game.i18n.localize('PF2E.DetailsHeading')}: ${speed.details}</li>`

        return {
            ...sharedData,
            sp: useStamina ? sp : { max: 0 },
            hero: heroPoints,
            dying,
            wounded,
            shield,
            resolve,
            adjustment,
            alignment: {
                value: alignment,
                icon: ALIGNMENTS[alignment.at(-1)],
            },
            isCharacter,
            showDeathLine: isCharacter && (showDeath === 'always' || dying.value || wounded.value),
            hasCover: this.hasCover,
            saves:
                savesSetting !== 'none' &&
                ['fortitude', 'reflex', 'will'].map(slug => getStatistic(saves[slug], savesSetting, SAVES)),
            others:
                othersSetting !== 'none' &&
                ['perception', 'stealth', 'athletics'].map(slug => getStatistic(actor.getStatistic(slug), othersSetting, SKILLS)),
            speeds: {
                main: mainSpeed,
                others: otherSpeeds,
            },
            iwr:
                toIWR(immunities, 'PF2E.ImmunitiesLabel') +
                toIWR(weaknesses, 'PF2E.WeaknessesLabel') +
                toIWR(resistances, 'PF2E.ResistancesLabel'),
            senses: senses?.map(toInfo).join(''),
            languages,
            hasSpells: actor.spellcasting.some(x => x.category !== 'items'),
        }
    }

    close(options = {}) {
        this.setToken(null)
        this.#lock = false
        this.#softLock = false

        this.#cancelDelay()

        const states = Application.RENDER_STATES
        if (!options.force && ![states.RENDERED, states.ERROR].includes(this._state)) return

        this._state = states.CLOSING

        let el = this.element
        if (!el) return (this._state = states.CLOSED)
        el.css({ minHeight: 0 })

        for (let cls of this.constructor._getInheritanceChain()) {
            Hooks.call(`close${cls.name}`, this, el)
        }

        el.remove()

        this._element = null
        this._state = states.CLOSED
        delete ui.windows[this.appId]
    }

    async _render(force = false, options = {}) {
        let sidebarType
        let scrollTop
        let filter

        if (this.#lastToken === this.#token) {
            const sidebar = this.element.find('> .sidebar')[0]
            if (sidebar) {
                sidebarType = sidebar.dataset.type
                scrollTop = sidebar.scrollTop
                const filterHeader = sidebar.querySelector('.sidebar-header')
                if (filterHeader.classList.contains('show')) filter = filterHeader.querySelector(' input').value.trim()
            }
        }

        await super._render(force, options)
        ui.windows[this.appId] = this

        if (sidebarType) {
            const sidebar = await this.#openSidebar(sidebarType, filter)
            if (scrollTop > 0) sidebar.scrollTop = scrollTop
        }

        this.#lastToken = this.#token
    }

    render() {
        if (this.actor) super.render(true)
    }

    _injectHTML(html) {
        $('body').append(html)
        this._element = html
    }

    setPosition() {
        const token = this.#token
        if (!token) return

        const element = this.element[0]
        const scale = token.worldTransform.a
        const hud = element.getBoundingClientRect()
        const targetCoords = canvas.clientCoordinatesFromCanvas(token.document._source)
        const target = {
            x: targetCoords.x,
            y: targetCoords.y,
            width: token.hitArea.width * scale,
            height: token.hitArea.height * scale,
            get right() {
                return this.x + this.width
            },
            get bottom() {
                return this.y + this.height
            },
        }

        let coords

        const positions = this.#isObserved
            ? POSITIONS[getSetting('position')].slice()
            : POSITIONS[getSetting('small-position')].slice()

        while (positions.length && !coords) {
            const position = positions.shift()

            if (position === 'left') {
                coords = {
                    x: target.x - hud.width,
                    y: postionFromTargetY(hud, target),
                }
                if (coords.x < 0) coords = undefined
            } else if (position === 'right') {
                coords = {
                    x: target.right,
                    y: postionFromTargetY(hud, target),
                }
                if (coords.x + hud.width > window.innerWidth) coords = undefined
            } else if (position === 'top') {
                coords = {
                    x: postionFromTargetX(hud, target),
                    y: target.y - hud.height,
                }
                if (coords.y < 0) coords = undefined
            } else if (position === 'bottom') {
                coords = {
                    x: postionFromTargetX(hud, target),
                    y: target.bottom,
                }
                if (coords.y + hud.height > window.innerHeight) coords = undefined
            }
        }

        if (coords) {
            element.style.left = `${coords.x}px`
            element.style.top = `${coords.y}px`
        }

        return coords
    }

    activateListeners(html) {
        const token = this.#token
        const actor = token?.actor
        if (!actor) return

        const isOwner = token.isOwner
        const ChatMessagePF2e = CONFIG.ChatMessage.documentClass

        if (getSetting('tooltips')) {
            html.find('.inner [data-tooltip]').attr('data-tooltip', '')
        }

        html.on('mousedown', () => this.bringToTop())

        html.on('mouseenter', () => {
            if (!html.find('.inner').length) return
            this.#softLock = true
        })

        html.on('mouseleave', () => {
            this.#softLock = false
            if (this.#lock) return

            const current = this.#token
            if (this.#nextToken !== current && this.#hover) {
                this.close()
                this.#tokenEnter(this.#nextToken)
            } else setTimeout(() => !this.#hover && this.close(), 10)
        })

        html.on('dragover', () => {
            if (token.isOwner && html.find('> .sidebar.extras').length && !html.find('.popup').length) return

            html.css('opacity', 0.1)
            html.css('pointerEvents', 'none')

            window.addEventListener(
                'dragend',
                () => {
                    html.css('opacity', 1)
                    html.css('pointerEvents', '')
                },
                { once: true }
            )
        })

        const infos = html.find('[data-action=show-info]')
        infos.tooltipster({
            position: ['top', 'bottom', 'left', 'right'],
            theme: 'crb-hover',
            arrow: false,
            animationDuration: 0,
            contentAsHTML: true,
            trigger: 'click',
        })

        infos
            .filter('.stealth')
            .tooltipster('option', 'interactive', true)
            .tooltipster('option', 'functionReady', (tooltipster, { origin, tooltip }) => {
                this.#lock = true
                $(tooltip)
                    .find('.content-link')
                    .on('click', () => setTimeout(() => tooltipster.close(), 10))
            })
            .tooltipster('option', 'functionAfter', () => {
                if (html.find('> .sidebar').length) return
                this.#lock = false
            })

        const infosToLeave = isOwner ? infos.filter(':not(.speeds):not(.stealth)') : infos
        infosToLeave.on('mouseleave', event => {
            $(event.currentTarget).tooltipster('hide')
        })

        html.find('[data-action=open-sidebar]').on('click', this.#openSidebar.bind(this))

        // IS OWNER
        if (!isOwner) return

        html.find('[data-action=toggle-adjustment]').on('click contextmenu', event => {
            event.preventDefault()
            const adjustment = event.type === 'click' ? 'elite' : 'weak'
            actor.applyAdjustment(actor.system.attributes.adjustment === adjustment ? null : adjustment)
        })

        html.find('[data-action=collision-dc]').on('click', event => {
            event.preventDefault()
            const dc = actor.system.attributes.collisionDC.value || 15
            ChatMessagePF2e.create({
                content: `@Check[type:reflex|dc:${dc}]`,
                speaker: ChatMessagePF2e.getSpeaker({ actor }),
            })
        })

        html.find('[data-action=collision-damage]').on('click', async event => {
            event.preventDefault()
            let formula = (actor.system.attributes.collisionDamage.value || '1d6').trim()
            if (!isNaN(Number(formula.at(-1)))) formula += '[bludgeoning]'
            const DamageRoll = CONFIG.Dice.rolls.find(R => R.name === 'DamageRoll')
            const roll = await new DamageRoll(formula).evaluate({ async: true })
            ChatMessagePF2e.create({
                flavor: `<strong>${game.i18n.localize('PF2E.vehicle.collisionDamageLabel')}</strong>`,
                speaker: ChatMessagePF2e.getSpeaker({ actor }),
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                sound: 'sounds/dice.wav',
                rolls: [roll],
            })
        })

        html.find('input').on('change', async event => {
            const target = event.currentTarget
            const value = target.valueAsNumber
            const attr = target.name

            target.blur()

            if (attr !== 'shield.value') await actor.update({ [attr]: value })
            else await actor.heldShield.update({ 'system.hp.value': value })
        })

        html.find('[data-action=toggle-hero]').on('click contextmenu', event => {
            event.preventDefault()
            const { max, value } = actor.heroPoints
            const change = event.type === 'click' ? 1 : -1
            const newValue = Math.clamped(value + change, 0, max)
            if (newValue !== value) actor.update({ 'system.resources.heroPoints.value': newValue })
        })

        html.find('[data-action=raise-shield]').on('click', event => {
            event.preventDefault()
            game.pf2e.actions.raiseAShield({ actors: [actor] })
        })

        html.find('[data-action=take-cover]').on('click', async event => {
            event.preventDefault()

            const source = (await fromUuid(COVER_UUID)).toObject()
            setProperty(source, 'flags.core.sourceId', COVER_UUID)

            const hasCover = this.hasCover
            if (this.hasCover) await hasCover.delete()
            else await actor.createEmbeddedDocuments('Item', [source])
        })

        html.find('[data-action=roll-save]').on('click', event => {
            event.preventDefault()
            const save = event.currentTarget.dataset.save
            actor.saves[save].roll({ event })
        })

        html.find('[data-action=roll-other]').on('click', event => {
            event.preventDefault()
            const slug = event.currentTarget.dataset.slug
            if (slug !== 'athletics') {
                const { ctrlKey, metaKey, shiftKey } = event
                event = new MouseEvent('click', { ctrlKey: !ctrlKey, metaKey, shiftKey })
            }
            actor.getStatistic(slug)?.roll({ event })
        })

        html.find('[data-action=recovery-check]').on('click', event => {
            event.preventDefault()
            actor.rollRecovery(event)
        })

        html.find('[data-action=toggle-dying], [data-action=toggle-wounded]').on('click contextmenu', event => {
            event.preventDefault()

            const condition = event.currentTarget.dataset.action === 'toggle-dying' ? 'dying' : 'wounded'
            const max = actor.system.attributes[condition]?.max

            if (!max) return
            if (event.type === 'click') actor.increaseCondition(condition, { max })
            else actor.decreaseCondition(condition)
        })

        html.find('[data-action=use-resolve]').on('click', event => {
            event.preventDefault()
            useResolve(actor)
        })

        infos
            .filter('.speeds')
            .tooltipster('option', 'interactive', true)
            .tooltipster('option', 'functionReady', (tooltipster, { origin, tooltip }) => {
                this.#lock = true
                tooltip.querySelectorAll('[data-index]').forEach(speed => {
                    speed.addEventListener('click', async event => {
                        event.preventDefault()
                        await setFlag(actor, `speeds.selected.${game.user.id}`, Number(speed.dataset.index))
                    })
                })
            })
            .tooltipster('option', 'functionAfter', () => {
                if (html.find('> .sidebar').length) return
                this.#lock = false
            })
    }

    async showFilter() {
        let sidebar = this.sidebar
        if (!sidebar) return
        if (!sidebar.find('.sidebar-header').hasClass('show')) sidebar = await this.#openSidebar(sidebar.data().type, '')
        sidebar.find('.sidebar-header').find('input').focus().select()
        sidebar.scrollTop(0)
    }

    async #openSidebar(type, filter) {
        type = typeof type === 'string' ? type : type.currentTarget.dataset.type

        let element = this.element
        let sidebar = this.sidebar
        const action = sidebar[0]?.dataset.type

        sidebar.remove()
        element.find('[data-action=open-sidebar]').removeClass('active')

        if (action === type && filter === undefined) {
            this.#lock = false
            return
        }

        const token = this.#token
        const actor = token.actor
        const showFilter = filter !== undefined || getSetting('filter')
        const { getData, addListeners } = SIDEBARS[type]
        const data = (await getData(actor, token, filter?.toLowerCase())) ?? {}
        if (!data.contentData && !showFilter) return ui.notifications.warn(localize(`${type}.empty`, { name: this.#token.name }))

        const contentData = {
            ...(data.contentData ?? {}),
            isGM: game.user.isGM,
            isCharacter: this.isCharacter,
            isOwner: actor.isOwner,
        }

        this.#lock = true

        element.find(`[data-action=open-sidebar][data-type=${type}]`).addClass('active')
        element = element[0]

        const classes = data.classes ?? []
        classes.push(type)
        if (!getSetting('scrollbar')) classes.push('no-scrollbar')
        if (data.doubled) classes.push('doubled')

        const style = data.style ?? {}
        style['--max-height'] = getSetting('height').trim() || '100%'

        const tmp = document.createElement('div')
        tmp.innerHTML = await renderTemplate(templatePath('sidebar'), {
            classes: classes.join(' '),
            style: Object.entries(style)
                .map(([key, value]) => `${key}: ${value}`)
                .join('; '),
            type,
            filter,
            filterLabel: localize('filter'),
            showFilter,
            content: (await renderTemplate(templatePath(`sidebars/${type}`), contentData)).trim(),
        })

        sidebar = tmp.firstElementChild
        this.element.append(sidebar)

        const rect = sidebar.getBoundingClientRect()
        const target = element.getBoundingClientRect()

        let left = target.x - rect.width
        if (left < 0) left = target.right

        const elPadding = parseInt(window.getComputedStyle(element).padding)
        let top = postionFromTargetY(rect, target, elPadding)

        sidebar.style.left = `${left}px`
        sidebar.style.top = `${top}px`

        sidebar = $(sidebar)
        sidebar.find('.sidebar-header [data-action=sidebar-filter-clear]').on('click', event => {
            event.preventDefault()
            sidebar.find('.sidebar-header [data-action=sidebar-filter]').val('')
            this.#openSidebar(type, '')
        })
        sidebar.find('.sidebar-header [data-action=sidebar-filter]').on('keydown', event => {
            if (event.key === 'Enter') this.#openSidebar(type, event.currentTarget.value.trim())
        })
        addListeners(sidebar, actor, token)

        return sidebar
    }
}

function postionFromTargetY(el, target, margin = 0) {
    let y = target.y + target.height / 2 - el.height / 2
    if (y + el.height > window.innerHeight) y = window.innerHeight - el.height - margin
    if (y < 0) y = margin
    return y
}

function postionFromTargetX(el, target) {
    let x = target.x + target.width / 2 - el.width / 2
    if (x + el.width > window.innerWidth) y = window.innerWidth - el.width
    if (x < 0) x = 0
    return x
}

async function useResolve(actor) {
    function toChat(content) {
        ChatMessage.create({
            user: game.user.id,
            content,
            speaker: ChatMessage.getSpeaker({ actor }),
        })
    }

    const { name, attributes } = actor
    const { sp, resolve } = attributes
    const fullStamina = localize('hud.resolve.full', { name })
    const noResolve = game.i18n.format('PF2E.Actions.SteelYourResolve.NoStamina', { name })

    if (sp.value === sp.max) return ui.notifications.warn(fullStamina)
    if (resolve.value < 1) return ui.notifications.warn(noResolve)

    const hasSteel = actor.itemTypes.feat.find(item => item.sourceId === RESOLVE_UUID)
    const content = await renderTemplate(templatePath('dialogs/resolve'), {
        hasSteel,
        i18n: str => localize(`hud.resolve.${str}`),
    })

    new Dialog({
        title: localize('hud.resolve.title'),
        content,
        buttons: {
            yes: {
                icon: "<i class='fas fa-check'></i>",
                label: localize('hud.resolve.yes'),
                callback: async html => {
                    const { attributes } = actor
                    const { sp, resolve } = attributes

                    if (sp.value === sp.max) return toChat(fullStamina)
                    if (resolve.value < 1) return toChat(noResolve)

                    const selected = html.find('input:checked').val()
                    const ratio = `${sp.value}/${sp.max}`

                    if (selected === 'breather') {
                        toChat(localize('hud.resolve.breather.used', { name, ratio }))
                        await actor.update({
                            'system.attributes.sp.value': sp.max,
                            'system.attributes.resolve.value': resolve.value - 1,
                        })
                    } else {
                        toChat(game.i18n.format('PF2E.Actions.SteelYourResolve.RecoverStamina', { name, ratio }))
                        const newSP = sp.value + Math.floor(sp.max / 2)
                        await actor.update({
                            'system.attributes.sp.value': Math.min(newSP, sp.max),
                            'system.attributes.resolve.value': resolve.value - 1,
                        })
                    }
                },
            },
            no: {
                icon: "<i class='fas fa-times'></i>",
                label: localize('hud.resolve.no'),
            },
        },
    }).render(true)
}
