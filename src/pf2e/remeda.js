export const R = {
    compact: arr => arr.filter(Boolean),
    pick: (obj, names) => {
        if (obj == null) return {}
        return names.reduce((acc, name) => {
            if (name in obj) acc[name] = obj[name]
            return acc
        }, {})
    },
    groupBy: (...args) => purry(_groupBy(false), args),
    omit: (...args) => purry(_omit, args),
    uniq: (...args) => purry(_uniq, args, uniqLazy),
}

function purry(fn, args, lazy) {
    const diff = fn.length - args.length
    const arrayArgs = Array.from(args)
    if (diff === 0) {
        return fn(...arrayArgs)
    }
    if (diff === 1) {
        const ret = data => fn(data, ...arrayArgs)
        if (lazy || fn.lazy) {
            ret.lazy = lazy || fn.lazy
            ret.lazyArgs = args
        }
        return ret
    }
    throw new Error('Wrong number of arguments')
}

const _groupBy = indexed => (array, fn) => {
    const ret = {}
    array.forEach((item, index) => {
        const key = indexed ? fn(item, index, array) : fn(item)
        if (key !== undefined) {
            const actualKey = String(key)
            if (!ret[actualKey]) {
                ret[actualKey] = []
            }
            ret[actualKey].push(item)
        }
    })
    return ret
}

function uniqLazy() {
    const set = new Set()
    return value => {
        if (set.has(value)) {
            return {
                done: false,
                hasNext: false,
            }
        }
        set.add(value)
        return {
            done: false,
            hasNext: true,
            next: value,
        }
    }
}

function fromPairs(entries) {
    const out = {}
    for (const [key, value] of entries) {
        out[key] = value
    }
    return out
}

function _uniq(array) {
    return _reduceLazy(array, uniq.lazy())
}

function _omit(data, propNames) {
    if (propNames.length === 0) {
        return { ...data }
    }

    if (propNames.length === 1) {
        const [propName] = propNames
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- use destructuring to remove a single key, letting JS optimize here...
            [propName]: omitted,
            ...remaining
        } = data
        return remaining
    }

    if (!propNames.some(propName => propName in data)) {
        return { ...data }
    }

    const asSet = new Set(propNames)
    return fromPairs(Object.entries(data).filter(([key]) => !asSet.has(key)))
}
