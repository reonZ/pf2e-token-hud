import { useResolve } from './actions/use-resolve.js'
import { enrichHTML, getFlag, getSetting, localize, modifier, MODULE_ID, setFlag, templatePath } from './module.js'
import { getDamageRollClass } from './pf2e/classes.js'
import { popup } from './popup.js'
import { getCoverEffect, getUniqueTarget, localeCompare, RANKS } from './shared.js'
import { addActionsListeners, getActionsData } from './sidebars/actions.js'
import { addExtrasListeners, getExtrasData } from './sidebars/extras.js'
import { addHazardListeners, getHazardData } from './sidebars/hazard.js'
import { addItemsListeners, getItemsData } from './sidebars/items.js'
import { addSkillsListeners, getSkillsData } from './sidebars/skills.js'
import { addSpellsListeners, getSpellsData } from './sidebars/spells.js'
import { createTooltip } from './tooltip.js'

const HOVER_EXCEPTIONS = [
    '#combat-popout',
    '#sidebar',
    '#mini-tracker',
    '#combat-dock',
    '#combat-carousel',
    '[id^=pf2e-perception]',
].join(', ')

const POSITIONS = {
    left: ['left', 'right', 'top', 'bottom'],
    right: ['right', 'left', 'top', 'bottom'],
    top: ['top', 'bottom', 'left', 'right'],
    bottom: ['bottom', 'top', 'left', 'right'],
}

const ALLIANCES = {
    opposition: { icon: 'fa-solid fa-face-angry-horns', label: 'PF2E.Actor.Creature.Alliance.Opposition' },
    party: { icon: 'fa-solid fa-face-smile-halo', label: 'PF2E.Actor.Creature.Alliance.Party' },
    neutral: { icon: 'fa-solid fa-face-meh', label: 'PF2E.Actor.Creature.Alliance.Neutral' },
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
    fortitude: { icon: 'fa-solid fa-chess-rook', label: 'PF2E.SavesFortitude' },
    reflex: { icon: 'fa-solid fa-person-running', label: 'PF2E.SavesReflex' },
    will: { icon: 'fa-solid fa-brain', label: 'PF2E.SavesWill' },
}

const SKILLS = {
    perception: { icon: 'fa-solid fa-eye', label: 'PF2E.PerceptionLabel' },
    stealth: { icon: 'fa-duotone fa-eye-slash', label: 'PF2E.SkillStealth' },
    athletics: { icon: 'fa-solid fa-hand-fist', label: 'PF2E.SkillAthletics' },
}

export class HUD extends Application {
    #token = null
    #lastToken = null
    #hoveredToken = null
    #delay = null
    #holding = false
    #closing = null
    #mousedown = [false, false, false]
    #lock = false
    #softLock = false
    #isObserved = false
    #hoverTokenHandler
    #mouseeventHandler
    #deleteTokenHandler

    constructor() {
        super()

        this.forceClose = () => this.close({ force: true })

        this.#hoverTokenHandler = (token, hover) => {
            if (hover) this.#tokenEnter(token)
            else this.#tokenLeave(token)
        }

        this.#mouseeventHandler = event => {
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

                if (popup && !popup.contains(target)) {
                    if (!el.querySelector('.sidebar')) this.forceClose()
                    else return popup.remove()
                }

                if (target.closest('canvas')) this.forceClose()

                return
            } else this.#cancelDelay()

            this.unlock(true)
        }

        this.#deleteTokenHandler = token => {
            if (this.#token && token.id === this.#token.id) this.forceClose()
        }

        window.addEventListener('mousedown', this.#mouseeventHandler)
        window.addEventListener('mouseup', this.#mouseeventHandler)

        Hooks.on('hoverToken', this.#hoverTokenHandler)
        Hooks.on('deleteToken', this.#deleteTokenHandler)
        Hooks.on('canvasPan', this.forceClose)
    }

    setToken(token, isObserved) {
        if (token !== this.#token) {
            delete this.#token?.actor?.apps[this.appId]

            this.#token = token
            const actor = token?.actor
            if (actor) actor.apps[this.appId] = this
        }
        this.#isObserved = isObserved ?? this.#checkIfObserved(token)
    }

    setHolding(held) {
        const holding = getSetting('key-holding')
        if (holding === 'none') return

        this.#holding = held

        if (this.#softLock || this.#lock) return

        if (held) {
            if (!this.#hoveredToken) return
            const isObserved = this.#checkIfObserved(this.#hoveredToken)
            if (holding === 'half' && !game.user.isGM && !isObserved) {
                this.#cancelDelay()
                this.render()
                return
            }
            this.setToken(this.#hoveredToken, isObserved)
            this.render()
        } else {
            if (holding === 'all') this.close()
            else if (game.user.isGM) {
                this.setToken(this.#hoveredToken)
                this.render()
            } else if (this.#isObserved) this.close()
        }
    }

    #checkIfObserved(token) {
        const actor = token?.actor
        if (!actor) return false

        let isObserved
        const isParty = actor.system.details.alliance === 'party'

        if (game.user.isGM && getSetting('key-holding') === 'half' && !this.#holding) isObserved = false
        else if (actor.isOfType('familiar') && !actor.master) isObserved = false
        else isObserved = token.isOwner || (getSetting('observer') && (token.observer || (isParty && getSetting('party'))))

        return isObserved
    }

    #tokenEnter(token) {
        if ($(window.document).find(':hover').filter(HOVER_EXCEPTIONS).length) return

        const actor = token.actor
        if (!actor || actor.isOfType('loot', 'party')) return

        if (token.document.disposition === CONST.TOKEN_DISPOSITIONS.SECRET && !actor.isOwner) return

        if (actor.isOfType('npc') && getSetting('no-dead') && actor.isDead) return

        this.#hoveredToken = token

        if (token !== this.#lastToken && !this.#lock) this.close()

        if (this.mousedown || this.#lock || this.#softLock || token === this.#token) return

        const holding = getSetting('key-holding')
        const isObserved = this.#checkIfObserved(token)
        if (holding !== 'none' && !this.#holding && (holding === 'all' || isObserved)) return

        this.#cancelClosing(true)
        this.setToken(token, isObserved)

        if (holding === 'none' || !this.#holding) this.renderWithDelay()
        else this.render()
    }

    #tokenLeave(token) {
        this.#hoveredToken = null

        if (this.mousedown || this.#lock || this.#softLock) return

        this.#closing = setTimeout(() => {
            this.#closing = null
            if (this.#softLock || this.#lock) return
            this.close()
        }, 10)
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

    delete() {
        this.forceClose()

        window.removeEventListener('mousedown', this.#mouseeventHandler)
        window.removeEventListener('mouseup', this.#mouseeventHandler)

        Hooks.off('hoverToken', this.#hoverTokenHandler)
        Hooks.off('deleteToken', this.#deleteTokenHandler)
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
        return !!getCoverEffect(this.actor)
    }

    get sidebar() {
        return this.element?.find('> .sidebar') ?? []
    }

    get popup() {
        return this.element?.find('> .popup') ?? []
    }

    get inner() {
        return this.element?.find('> .inner') ?? []
    }

    async getData() {
        const token = this.#token
        const actor = this.#token?.actor
        if (!actor) return {}

        let distance = null
        const savesSetting = getSetting('saves')
        const othersSetting = getSetting('others')
        const isCharacter = actor.isOfType('character')
        const { attributes } = actor
        const { hp, ac } = attributes
        const sp = hp.sp ?? { max: 0, value: 0 }
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
                const pick = (() => {
                    const length = statuses.length
                    if (getSetting('last-status')) {
                        if (ratio === 1) return length
                        return Math.ceil(ratio * (length - 1))
                    }
                    return Math.ceil(ratio * length)
                })()

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
            level,
        }

        if (actor.isOfType('army')) {
            const BASIC_WAR_ACTIONS_FOLDER = 'Vqp8b64uH35zkncy'
            const pack = game.packs.get('pf2e.kingmaker-features')
            const compendiumFeatures = ((await pack?.getDocuments({ type: 'campaignFeature' })) ?? []).filter(
                d => d instanceof Item && d.isOfType('campaignFeature')
            )

            sharedData = {
                ...sharedData,
                basicWarActions: compendiumFeatures
                    .filter(d => d.system.category === 'army-war-action' && d.folder?.id === BASIC_WAR_ACTIONS_FOLDER)
                    .map(i => new CONFIG.Item.documentClass(i.toObject(true), { parent: this.actor }))
                    .filter(i => i.isOfType('campaignFeature')),
            }

            return sharedData
        }

        sharedData = {
            ...sharedData,
            ac: ac.value,
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
        const { heroPoints } = actor
        const { resources, perception, details } = system
        const { wounded, dying, shield, speed, adjustment } = attributes

        function toInfo(str) {
            return `<li>${str.trim()}</li>`
        }

        function sort(a, b) {
            return localeCompare(a, b)
        }

        const languages = details?.languages?.value
            .map(x => game.i18n.localize(CONFIG.PF2E.languages[x]))
            .filter(Boolean)
            .sort(sort)
            .map(toInfo)
            .join('')

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
            .map(({ value, label, index }) => `<li><a data-value="${index}">${label}: ${value}</a></li>`)
            .join('')
        if (speed.details) otherSpeeds += `<li>${game.i18n.localize('PF2E.DetailsHeading')}: ${speed.details}</li>`

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
            showDeathLine: isCharacter && (showDeath === 'always' || dying.value || wounded.value),
            digitalPips: getSetting('pips'),
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
            senses: perception.senses
                .map(x => x.label)
                ?.map(toInfo)
                .join(''),
            languages,
            hasSpells: actor.spellcasting.some(x => x.category !== 'items'),
            hasNotes: !isCharacter && (system.details.publicNotes || (system.details.privateNotes && isOwner)),
        }
    }

    close(options = {}) {
        this.setToken(null)
        this.unlock(true)
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
        let sidebarScrolltop
        let popup
        let popupScrollTop
        let filter

        if (this.#lastToken === this.#token) {
            const sidebar = this.sidebar[0]
            if (sidebar) {
                sidebarType = sidebar.dataset.type
                sidebarScrolltop = sidebar.scrollTop
                const filterHeader = sidebar.querySelector('.sidebar-header')
                if (filterHeader.classList.contains('show')) filter = filterHeader.querySelector(' input').value.trim()
            }

            popup = this.popup[0]
            if (popup) popupScrollTop = popup.scrollTop
        }

        await super._render(force, options)
        ui.windows[this.appId] = this

        if (sidebarType) {
            const sidebar = await this.#openSidebar(sidebarType, filter)
            if (sidebarScrolltop > 0) sidebar.scrollTop(sidebarScrolltop)
        }

        if (popup) {
            this.element.append(popup)
            if (popupScrollTop > 0) popup.scrollTop = popupScrollTop
        }

        this.#lastToken = this.#token

        if (!this.inner.length) return
        if (getSetting('autolock') === 'render') this.lock()
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

    lock() {
        this.#lock = true
    }

    unlock(force) {
        if (!force && (this.sidebar.length || getSetting('autolock') !== 'none')) return
        this.#lock = false
    }

    activateListeners(html) {
        const token = this.#token
        const actor = token?.actor
        if (!actor) return

        const isOwner = token.isOwner
        const ChatMessagePF2e = ChatMessage.implementation

        if (getSetting('tooltips')) {
            html.find('.inner [data-tooltip]').attr('data-tooltip', '')
        }

        html.find('[data-action=show-notes').on('click', async event => {
            event.preventDefault()

            const { publicNotes, privateNotes, blurb } = actor.system.details
            const traits = actor.system.traits.value.map(trait => ({
                label: game.i18n.localize(CONFIG.PF2E.creatureTraits[trait]) ?? trait,
                description: game.i18n.localize(CONFIG.PF2E.traitsDescriptions[trait]) ?? '',
            }))

            const content = await renderTemplate(templatePath('show-notes'), {
                traits,
                blurb: blurb.trim(),
                publicNotes: publicNotes.trim(),
                privateNotes: isOwner && privateNotes.trim(),
            })

            popup(`${actor.name} - ${game.i18n.localize('PF2E.NPC.NotesTab')}`, content, actor)
        })

        html.on('mousedown', () => this.bringToTop())

        html.on('mouseenter', () => {
            if (!html.find('.inner').length) return
            if (getSetting('autolock') === 'hover') this.lock()
            this.#softLock = true
        })

        html.on('mouseleave', () => {
            this.#softLock = false
            if (this.#lock || this.#hoveredToken) return
            this.close()
        })

        html.on('dragover', () => {
            if (token.isOwner && html.find('> .sidebar.extras').length && !html.find('> .popup').length) return
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
        const infosElements = isOwner ? infos.filter(':not(.speeds)') : infos
        infosElements.on('click', event => {
            const target = event.currentTarget
            const content = target.dataset.tooltipContent

            if (target.classList.contains('stealth')) {
                this.#createHUDLockedListTooltip({ content, event, direction: 'DOWN' })
            } else {
                createTooltip({ target, content, direction: 'UP' })
            }
        })

        html.find('[data-action=open-sidebar]').on('click', this.#openSidebar.bind(this))

        // IS OWNER
        if (!isOwner) return

        html.find('[data-action=toggle-adjustment]').on('click contextmenu', event => {
            event.preventDefault()
            const adjustment = event.type === 'click' ? 'elite' : 'weak'
            actor.applyAdjustment(actor.system.attributes.adjustment === adjustment ? null : adjustment)
        })

        html.find('[data-action=toggle-alliance]').on('click', event => {
            const { originalAlliance, defaultAlliance } = getAlliance(actor)

            const content = [
                {
                    value: 'default',
                    label: game.i18n.format('PF2E.Actor.Creature.Alliance.Default', {
                        alliance: game.i18n.localize(ALLIANCES[defaultAlliance].label),
                    }),
                },
                { value: 'opposition', label: game.i18n.localize(ALLIANCES.opposition.label) },
                { value: 'party', label: game.i18n.localize(ALLIANCES.party.label) },
                { value: 'neutral', label: game.i18n.localize(ALLIANCES.neutral.label) },
            ]

            this.#createHUDLockedListTooltip({
                content,
                event,
                selected: originalAlliance,
                onClick: value => {
                    if (value === 'default') actor.update({ 'system.details.-=alliance': true })
                    else actor.update({ 'system.details.alliance': value === 'neutral' ? null : value })
                },
            })
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
            const DamageRoll = getDamageRollClass()
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
            let { max, value } = actor.heroPoints

            const change = event.type === 'click' ? 1 : -1
            const newValue = Math.clamped(value + change, 0, max)

            if (newValue !== value) actor.update({ 'system.resources.heroPoints.value': newValue })
        })

        html.find('[data-action=raise-shield]').on('click', event => {
            event.preventDefault()
            game.pf2e.actions.raiseAShield({ actors: [actor], tokens: [token] })
        })

        html.find('[data-action=take-cover]').on('click', async event => {
            event.preventDefault()

            const existing = getCoverEffect(actor)

            if (existing) existing.delete()
            else game.pf2e.actions.get('take-cover').use({ actors: [actor], tokens: [token] })
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

        infos.filter('.speeds').on('click', event => {
            this.#createHUDLockedListTooltip({
                event,
                content: event.currentTarget.dataset.tooltipContent,
                direction: 'UP',
                onClick: index => {
                    setFlag(actor, `speeds.selected.${game.user.id}`, Number(index))
                },
            })
        })
    }

    #createHUDLockedListTooltip({ content, event, onClick, selected, direction }) {
        createTooltip({
            content,
            target: event.currentTarget,
            direction,
            selected,
            locked: true,
            onCreate: () => this.lock(),
            onClick,
            onDismiss: () => this.unlock(),
        })
    }

    async showFilter() {
        let sidebar = this.sidebar
        if (!sidebar.length) return
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
            this.unlock()
            return
        }

        const token = this.#token
        const actor = token.actor
        const showFilter = filter !== undefined || getSetting('filter')
        const { getData, addListeners } = SIDEBARS[type]
        const data = (await getData({ hud: this, actor, token, filter: filter?.toLowerCase() })) ?? {}
        if (!data.contentData && !showFilter) return ui.notifications.warn(localize(`${type}.empty`, { name: this.#token.name }))

        const contentData = {
            ...(data.contentData ?? {}),
            isGM: game.user.isGM,
            isCharacter: actor.isOfType('character'),
            isOwner: actor.isOwner,
            isCreature: actor.isOfType('creature'),
        }

        this.lock()

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
        element.append(sidebar)

        const rect = sidebar.getBoundingClientRect()
        const target = element.getBoundingClientRect()

        let left
        const position = getSetting('position')
        if (position === 'left') {
            left = target.x - rect.width
            if (left < 0) left = target.right
        } else {
            left = target.right
            if (left + rect.width > window.innerWidth) left = target.x - rect.width
        }

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
        addListeners({ el: sidebar, actor, token, hud: this })

        Hooks.callAll('renderHUDSidebar', type, sidebar, this)

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

function getAlliance(actor) {
    const allianceSource = actor._source.system.details?.alliance
    const alliance = allianceSource === null ? 'neutral' : allianceSource ?? 'default'
    const defaultAlliance = actor.hasPlayerOwner ? 'party' : 'opposition'
    return {
        defaultAlliance,
        originalAlliance: alliance,
        alliance: alliance === 'default' ? defaultAlliance : alliance,
    }
}
