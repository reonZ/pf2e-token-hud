import { addItemsListeners, getItemsData } from './items.js'
import { getSetting, localize, MODULE_ID, templatePath } from './module.js'
import { addSkillsListeners, getSkillsData } from './skills.js'
import { addSpellsListeners, getSpellsData } from './spells.js'

const COVER_UUID = 'Compendium.pf2e.other-effects.I9lfZUiCwMiGogVi'

const POSITIONS = {
    left: ['left', 'right', 'top', 'bottom'],
    right: ['right', 'left', 'top', 'bottom'],
    top: ['top', 'bottom', 'left', 'right'],
    bottom: ['bottom', 'top', 'left', 'right'],
}

const SPEEDS = [
    { type: 'land', icon: '<i class="fa-solid fa-shoe-prints"></i>' },
    { type: 'burrow', icon: '<i class="fa-solid fa-chevrons-down"></i>' },
    { type: 'climb', icon: '<i class="fa-solid fa-spider"></i>' },
    { type: 'fly', icon: '<i class="fa-solid fa-feather"></i>' },
    { type: 'swim', icon: '<i class="fa-solid fa-person-swimming"></i>' },
]

const SIDEBARS = {
    actions: { getData: () => null, addListeners: () => {} },
    items: { getData: getItemsData, addListeners: addItemsListeners },
    spells: { getData: getSpellsData, addListeners: addSpellsListeners },
    skills: { getData: getSkillsData, addListeners: addSkillsListeners },
    extras: { getData: () => null, addListeners: () => {} },
}

export class HUD extends Application {
    #token = null
    #lastToken = null
    #delay = null
    #hover = false
    #closing = null
    #mouseevent
    #mousedown = false
    #lock = false
    #softLock = false

    constructor() {
        super()

        this.hoverToken = (token, hover) => {
            if (
                this.#mousedown ||
                this.#lock ||
                this.#softLock ||
                !(token instanceof Token) ||
                !token.isOwner ||
                !token.actor?.isOfType('character', 'npc')
            )
                return

            const transform = token.localTransform
            const document = token.document
            if (transform.tx !== document.x || transform.ty !== document.y) return

            this.#hover = hover
            if (hover && this.#token === token && this.rendered) return

            if (hover) {
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
            if (event.type === 'mouseup') {
                this.#mousedown = false
                return
            }

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
            }

            this.#lock = false
            this.#mousedown = true
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

    get token() {
        return this.#token
    }

    get actor() {
        return this.#token?.actor
    }

    get hasCover() {
        return this.actor?.itemTypes.effect.find(effect => effect.flags.core?.sourceId === COVER_UUID)
    }

    getData() {
        const token = this.#token
        const actor = this.#token?.actor
        if (!actor) return {}

        const { attributes, saves } = actor
        const { hp, sp, ac, shield, speed } = attributes

        const speeds = SPEEDS.map(s => {
            s.value = (s.type === 'land' ? speed.total : speed.otherSpeeds.find(o => o.type === s.type)?.total) ?? 0
            return s
        })

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
                will: saves.will.mod,
            },
            speeds,
            languages: this.actor.system.traits?.languages?.value.join(', '),
            hasSpells: actor.spellcasting.some(x => x.category !== 'items'),
            hasItems: actor.inventory.coins.copperValue || actor.inventory.length,
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
        if (!this.#token?.actor || this.#mousedown) return

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
        const hud = element.getBoundingClientRect()
        const scale = token.worldTransform.a
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

        const positions = POSITIONS[getSetting('position')].slice()
        let coords

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

            if (attr === 'shield.value') {
                await actor.heldShield.update({ 'system.hp.value': value })
            } else {
                await actor.update({ [attr]: value })
            }
        })

        html.find('[data-action=raise-shield]').on('click', () => {
            game.pf2e.actions.raiseAShield({ actors: [actor] })
        })

        html.find('[data-action=take-cover]').on('click', async () => {
            const source = (await fromUuid(COVER_UUID)).toObject()
            setProperty(source, 'flags.core.sourceId', COVER_UUID)

            const hasCover = this.hasCover
            if (this.hasCover) await hasCover.delete()
            else await actor.createEmbeddedDocuments('Item', [source])
        })

        html.find('[data-action=roll-save]').on('click', event => {
            const save = event.currentTarget.dataset.save
            actor.saves[save].roll({ event })
        })

        html.find('.inner .footer [data-type]').on('click', this.#openSidebar.bind(this))
    }

    async #openSidebar(event) {
        const actor = this.actor
        const type = typeof event === 'string' ? event : event.currentTarget.dataset.type
        const { getData, addListeners } = SIDEBARS[type]
        const data = await getData(actor)
        if (!data) return ui.notifications.warn(localize(`${type}.empty`, { name: this.#token.name }))

        data.isGM = game.user.isGM
        data.isCharacter = actor.isOfType('character')

        this.#lock = true

        let element = this.element
        element.find('.sidebar').remove()
        element.find('.inner .footer [data-type]').removeClass('active')
        element.find(`.inner .footer [data-type=${type}]`).addClass('active')
        element = element[0]

        const tmp = document.createElement('div')
        tmp.innerHTML = await renderTemplate(templatePath(type), data)

        const sidebar = tmp.firstElementChild
        sidebar.classList.add('sidebar')
        if (!getSetting('scrollbar')) sidebar.classList.add('no-scrollbar')
        sidebar.dataset.type = type
        this.element.append(sidebar)

        const rect = sidebar.getBoundingClientRect()
        const target = element.getBoundingClientRect()

        let left = target.x - rect.width
        if (left < 0) left = target.right
        // left -= target.x

        const elPadding = parseInt(window.getComputedStyle(element).padding)
        let top = postionFromTargetY(rect, target, elPadding)
        // top -= target.y

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
