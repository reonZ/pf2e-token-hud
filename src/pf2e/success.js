/**
 * Those are copied from the PF2e system because they are not accesible to us in the global
 * adjusted to be independent function
 */

const DegreeOfSuccess = {
    CRITICAL_FAILURE: 0,
    FAILURE: 1,
    SUCCESS: 2,
    CRITICAL_SUCCESS: 3,
}

const DEGREE_ADJUSTMENT_AMOUNTS = {
    LOWER_BY_TWO: -2,
    LOWER: -1,
    INCREASE: 1,
    INCREASE_BY_TWO: 2,
    TO_CRITICAL_FAILURE: 'criticalFailure',
    TO_FAILURE: 'failure',
    TO_SUCCESS: 'success',
    TO_CRITICAL_SUCCESS: 'criticalSuccess',
}

function adjustDegreeOfSuccess(amount, degreeOfSuccess) {
    switch (amount) {
        case 'criticalFailure':
            return 0
        case 'failure':
            return 1
        case 'success':
            return 2
        case 'criticalSuccess':
            return 3
        default:
            return Math.clamped(degreeOfSuccess + amount, 0, 3)
    }
}

function adjustDegreeByDieValue(dieResult, degree) {
    if (dieResult === 20) {
        return adjustDegreeOfSuccess(DEGREE_ADJUSTMENT_AMOUNTS.INCREASE, degree)
    } else if (dieResult === 1) {
        return adjustDegreeOfSuccess(DEGREE_ADJUSTMENT_AMOUNTS.LOWER, degree)
    }

    return degree
}

export function calculateDegreeOfSuccess(rollTotal, dieResult, dc) {
    if (rollTotal - dc >= 10) {
        return adjustDegreeByDieValue(dieResult, DegreeOfSuccess.CRITICAL_SUCCESS)
    } else if (dc - rollTotal >= 10) {
        return adjustDegreeByDieValue(dieResult, DegreeOfSuccess.CRITICAL_FAILURE)
    } else if (rollTotal >= dc) {
        return adjustDegreeByDieValue(dieResult, DegreeOfSuccess.SUCCESS)
    }

    return adjustDegreeByDieValue(dieResult, DegreeOfSuccess.FAILURE)
}
