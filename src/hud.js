import { addActionsListeners, getActionsData, getActionsOptions } from './actions.js'
import { addExtrasListeners, getExtrasData } from './extras.js'
import { addItemsListeners, getItemsData } from './items.js'
import { getFlag, getSetting, localize, MODULE_ID, setFlag, templatePath } from './module.js'
import { addSkillsListeners, getSkillsData } from './skills.js'
import { addSpellsListeners, getSpellsData } from './spells.js'

const COVER_UUID = 'Compendium.pf2e.other-effects.I9lfZUiCwMiGogVi'
const RESOLVE_UUID = 'Compendium.pf2e.feats-srd.jFmdevE4nKevovzo'

const POSITIONS = {
    left: ['left', 'right', 'top', 'bottom'],
    right: ['right', 'left', 'top', 'bottom'],
    top: ['top', 'bottom', 'left', 'right'],
    bottom: ['bottom', 'top', 'left', 'right'],
}

const ALIGNMENTS = {
    G: '<i class="fa-solid fa-face-smile-halo"></i>',
    N: '<i class="fa-solid fa-face-meh"></i>',
    E: '<i class="fa-solid fa-face-angry-horns"></i>',
}

const SPEEDS = [
    { type: 'land', icon: 'fa-solid fa-shoe-prints' },
    { type: 'burrow', icon: 'fa-solid fa-chevrons-down' },
    { type: 'climb', icon: 'fa-solid fa-spider' },
    { type: 'fly', icon: 'fa-solid fa-feather' },
    { type: 'swim', icon: 'fa-solid fa-person-swimming' },
]

const SIDEBARS = {
    actions: { getData: getActionsData, addListeners: addActionsListeners, getOptions: getActionsOptions },
    items: { getData: getItemsData, addListeners: addItemsListeners },
    spells: { getData: getSpellsData, addListeners: addSpellsListeners },
    skills: { getData: getSkillsData, addListeners: addSkillsListeners },
    extras: { getData: getExtrasData, addListeners: addExtrasListeners },
}

export class HUD extends Application {
    #token = null
    #lastToken = null
    #delay = null
    #hover = false
    #closing = null
    #mouseevent
    #mousedown = [false, false, false]
    #lock = false
    #softLock = false

    constructor() {
        super()

        this.hoverToken = (token, hover) => {
            if (
                this.mousedown ||
                this.#lock ||
                this.#softLock ||
                !(token instanceof Token) ||
                !token.actor?.isOfType('character', 'npc')
            )
                return

            const transform = token.localTransform
            const document = token.document
            if (transform.tx !== document.x || transform.ty !== document.y) return

            this.#hover = hover
            if (hover && this.#token === token && this.rendered) return

            if (hover && !game.keyboard.downKeys.has('ControlLeft')) {
                if (this.#token) delete this.#token.actor.apps[MODULE_ID]
                this.#token = token
                if (!this.#closing) return this.render()
                clearTimeout(this.#closing)
                this.#closing = null
                this.render(true)
            } else {
                this.close()
            }
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
                if (popup) return popup.remove()
                this.close({ force: true })
            } else if (this.#delay) {
                clearTimeout(this.#delay)
                this.#delay = null
            }

            this.#lock = false
        }

        this.forceClose = () => this.close({ force: true })

        this.deleteToken = token => {
            if (this.#token && token.id === this.#token.id) this.close({ force: true })
        }

        window.addEventListener('mousedown', this.#mouseevent)
        window.addEventListener('mouseup', this.#mouseevent)
    }

    delete() {
        this.close({ force: true })
        window.removeEventListener('mousedown', this.#mouseevent)
        window.removeEventListener('mouseup', this.#mouseevent)
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

    getData() {
        const token = this.#token
        const actor = this.#token?.actor
        if (!actor) return {}

        let distance = null
        const isOwner = token.isOwner
        const showDistance = getSetting('distance')
        const isCharacter = this.isCharacter
        const { attributes, saves, heroPoints, system, alignment } = actor
        const { traits } = system
        const {
            hp,
            sp = { max: 0, value: 0 },
            resolve,
            ac,
            shield,
            speed,
            dying,
            wounded,
            resistances,
            weaknesses,
            immunities,
        } = attributes
        const useStamina = game.settings.get('pf2e', 'staminaVariant')

        if (showDistance === 'all' || (showDistance === 'self' && isOwner)) {
            const unitSplit = getSetting('unit').split(',')
            const multiplier = Number(unitSplit[0]?.trim()) || 1
            const unit = unitSplit[1]?.trim() || game.system.gridUnits
            const decimals = Number(unitSplit[2]?.trim()) || 0
            const selected = canvas.tokens.controlled

            let isTarget = false
            let target = selected.length === 1 ? selected[0] : null

            if (!target || target === token) {
                const targets = game.user.targets
                target = targets.size === 1 ? targets.first() : null
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

        if (!isOwner) {
            let status
            const statuses = getSetting('status')
                .split(',')
                .map(x => x.trim())
                .filter(Boolean)

            if (statuses.length) {
                const max = hp.max + (useStamina ? sp.max : 0)
                const current = hp.value + (useStamina ? sp.value : 0)
                const ratio = current / max
                const pick = Math.ceil(ratio * statuses.length)

                status = {
                    hue: ratio * ratio * 122 + 3,
                    value: pick === 0 ? game.i18n.localize('EFFECT.StatusDead') : statuses.at(pick - 1),
                }
            }

            return {
                status,
                distance,
                tokenId: token.id,
            }
        }

        function toInfo(str) {
            return `<li>${str.trim()}</li>`
        }

        function sort(a, b) {
            return a.localeCompare(b)
        }

        const languages = actor.system.traits?.languages?.value
            .map(x => game.i18n.localize(CONFIG.PF2E.languages[x]))
            .sort(sort)
            .map(toInfo)
            .join('')

        const senses = isCharacter ? traits.senses.map(x => x.label) : traits.senses.value.split(',')

        function toIWR(category, header) {
            if (!category.length) return ''
            return (
                `<li>${game.i18n.localize(header)}<ul>` +
                category.map(x => toInfo(x.label.replace('-', ' ').titleCase())).join('') +
                '</ul></li>'
            )
        }

        const speeds = SPEEDS.map(({ type, icon }, index) => ({
            index,
            icon,
            label: game.i18n.localize(CONFIG.PF2E.speedTypes[type] ?? 'PF2E.SpeedTypesLand'),
            value: (type === 'land' ? speed.total : speed.otherSpeeds.find(s => s.type === type)?.total) || 0,
        }))

        const selectedSpeed = getFlag(actor, `speeds.selected.${game.user.id}`) || 0
        const mainSpeed = speeds.splice(selectedSpeed, 1)[0]

        let otherSpeeds = speeds
            .map(({ value, label, index }) => `<a data-index="${index}"><li>${label}: ${value}</li></a>`)
            .join('')
        if (speed.details) otherSpeeds += `<li>${game.i18n.localize('PF2E.DetailsHeading')}: ${speed.details}</li>`

        return {
            distance,
            isOwner,
            tokenId: token.id,
            name: token.document.name,
            hp,
            sp: useStamina ? sp : { max: 0 },
            ac: ac.value,
            hero: heroPoints,
            dying,
            wounded,
            shield,
            resolve,
            alignment: {
                value: alignment,
                icon: ALIGNMENTS[alignment.at(-1)],
            },
            level: actor.level,
            isCharacter,
            hasCover: this.hasCover,
            saves: {
                fortitude: saves.fortitude.mod,
                reflex: saves.reflex.mod,
                will: saves.will.mod,
            },
            speeds: {
                main: mainSpeed,
                others: otherSpeeds,
            },
            iwr:
                toIWR(immunities, 'PF2E.ImmunitiesLabel') +
                toIWR(weaknesses, 'PF2E.WeaknessesLabel') +
                toIWR(resistances, 'PF2E.ResistancesLabel'),
            senses: senses.map(toInfo).join(''),
            languages,
            hasSpells: actor.spellcasting.some(x => x.category !== 'items'),
            hasItems: actor.inventory.size,
        }
    }

    #close() {
        this.#token = null
        this.#hover = false
        this.#lock = false
        this.#softLock = false

        if (this.#delay !== null) {
            clearTimeout(this.#delay)
            this.#delay = null
        }

        const states = Application.RENDER_STATES
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
    }

    close(options = {}) {
        const states = Application.RENDER_STATES
        if (!options.force && !this.#delay && ![states.RENDERED, states.ERROR].includes(this._state)) return

        if (options.force) return this.#close(options)

        this.#closing = setTimeout(() => {
            this.#closing = null
            if (this.#hover) return
            this.#close(options)
        })
    }

    async _render(force = false, options = {}) {
        let sidebarType
        let scrollTop

        if (this.#lastToken === this.#token) {
            const sidebar = this.element.find('.sidebar')[0]
            if (sidebar) {
                sidebarType = sidebar.dataset.type
                scrollTop = sidebar.scrollTop
            }
        }

        await super._render(force, options)

        if (sidebarType) {
            const sidebar = await this.#openSidebar(sidebarType)
            if (scrollTop > 0) sidebar.scrollTop = scrollTop
        }

        this.#lastToken = this.#token
    }

    render(force) {
        if (!this.#token?.actor || this.mousedown) return

        if (force) return super.render(true)

        const delay = getSetting('delay')
        if (!delay) super.render(true)
        else this.#delay = setTimeout(() => super.render(true), delay)
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

        const positions = token.isOwner ? POSITIONS[getSetting('position')].slice() : ['top', 'bottom']

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

        actor.apps[MODULE_ID] = this

        html.on('mouseenter', () => {
            this.#hover = true
            this.#softLock = true
        })

        html.on('mouseleave', () => {
            this.#softLock = false
            if (this.#lock) return
            this.#hover = false
            this.close()
        })

        html.on('dragover', () => {
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

        const infos = html.find('[data-action=show-info]')
        infos.tooltipster({
            position: ['top', 'bottom', 'left', 'right'],
            theme: 'crb-hover',
            arrow: false,
            animationDuration: 0,
            contentAsHTML: true,
            trigger: 'click',
        })
        infos.filter(':not(.speeds)').on('mouseleave', event => {
            $(event.currentTarget).tooltipster('hide')
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
                if (html.find('.sidebar').length) return
                this.#lock = false
            })

        html.find('.inner .footer [data-type]').on('click', this.#openSidebar.bind(this))
    }

    async #openSidebar(type) {
        type = typeof type === 'string' ? type : type.currentTarget.dataset.type

        let element = this.element
        let sidebar = element.find('.sidebar')
        const action = sidebar[0]?.dataset.type

        sidebar.remove()
        element.find('.inner .footer [data-type]').removeClass('active')

        if (action === type) {
            this.#lock = false
            return
        }

        const actor = this.actor
        const { getData, addListeners, getOptions } = SIDEBARS[type]
        const data = await getData(actor)
        const { classList = [] } = (getOptions && (await getOptions(actor))) || {}
        if (!data) return ui.notifications.warn(localize(`${type}.empty`, { name: this.#token.name }))

        data.isGM = game.user.isGM
        data.isCharacter = this.isCharacter

        this.#lock = true

        element.find(`.inner .footer [data-type=${type}]`).addClass('active')
        element = element[0]

        const tmp = document.createElement('div')
        tmp.innerHTML = await renderTemplate(templatePath(type), data)

        sidebar = tmp.firstElementChild
        sidebar.classList.add('sidebar', ...classList)
        if (!getSetting('scrollbar')) sidebar.classList.add('no-scrollbar')
        if (data.doubled) sidebar.classList.add('doubled')
        sidebar.dataset.type = type
        sidebar.style.setProperty('--max-height', getSetting('height').trim() || '100%')
        this.element.append(sidebar)

        const rect = sidebar.getBoundingClientRect()
        const target = element.getBoundingClientRect()

        let left = target.x - rect.width
        if (left < 0) left = target.right

        const elPadding = parseInt(window.getComputedStyle(element).padding)
        let top = postionFromTargetY(rect, target, elPadding)

        sidebar.style.left = `${left}px`
        sidebar.style.top = `${top}px`

        addListeners($(sidebar), actor)

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

function useResolve(actor) {
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

    let content = '<p><input type="radio" name="pick" value="breather" style="margin-right: 6px;'
    if (!hasSteel) content += ' display: none;'
    content += '" checked><span>'
    if (hasSteel) content += `<strong>${localize('hud.resolve.breather.label')}:</strong> `
    content += `${localize('hud.resolve.breather.msg')}</span></p>`

    if (hasSteel) {
        content += '<p><input type="radio" name="pick" value="steel" style="margin-right: 6px;">'
        content += `<span><strong>${game.i18n.localize('PF2E.Actions.SteelYourResolve.Title')}:</strong> `
        content += `${localize('hud.resolve.steel.msg')}</span></p>`
    }

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
