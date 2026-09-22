const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidDate(value) {
    if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function todayInTimeZone(timeZone = 'Asia/Kolkata') {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

function isFutureDate(value, timeZone = 'Asia/Kolkata') {
    return isValidDate(value) && value > todayInTimeZone(timeZone);
}

function isValidTime(value) {
    return typeof value === 'string' && TIME_RE.test(value);
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
    return EMAIL_RE.test(normalizeEmail(value));
}

function toCents(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) : NaN;
}

function centsToAmount(cents) {
    return (cents / 100).toFixed(2);
}

module.exports = {
    isValidDate,
    todayInTimeZone,
    isFutureDate,
    isValidTime,
    normalizeEmail,
    isValidEmail,
    toCents,
    centsToAmount
};
