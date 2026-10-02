function number(value) {
    return value === null || value === undefined ? value : Number(value);
}

function dateOnly(value) {
    if (!value) return value;
    if (typeof value === 'string') return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
}

function timestamp(value) {
    return value instanceof Date ? value.toISOString() : value;
}

module.exports = { number, dateOnly, timestamp };
