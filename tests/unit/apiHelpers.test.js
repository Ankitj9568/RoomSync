const { esc, apiFetch, cachedGet, invalidateReadCache, debounce, __readCache } = require('../../public/js/api');

function jsonResponse(payload) {
    return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => payload
    };
}

describe('api helpers', () => {
    beforeEach(() => {
        invalidateReadCache();
        global.fetch = jest.fn(async () => jsonResponse({ success: true }));
    });

    afterEach(() => {
        delete global.fetch;
    });

    test('esc neutralises HTML metacharacters', () => {
        expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
        expect(esc(null)).toBe('');
    });

    test('cachedGet serves repeat reads from cache', async () => {
        const first = await cachedGet('/api/groups', 60000);
        const second = await cachedGet('/api/groups', 60000);
        expect(first).toEqual({ success: true });
        expect(second).toEqual({ success: true });
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('cachedGet caches endpoints independently', async () => {
        await cachedGet('/api/groups', 60000);
        await cachedGet('/api/users/me', 60000);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('invalidateReadCache forces a refetch', async () => {
        await cachedGet('/api/groups', 60000);
        invalidateReadCache();
        await cachedGet('/api/groups', 60000);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('successful mutations invalidate the read cache', async () => {
        await cachedGet('/api/groups', 60000);
        expect(__readCache.size).toBe(1);
        await apiFetch('/api/groups/create', { method: 'POST', body: { name: 'Flat' } }, true);
        expect(__readCache.size).toBe(0);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('debounce collapses rapid calls into one', () => {
        jest.useFakeTimers();
        try {
            const fn = jest.fn();
            const debounced = debounce(fn, 250);
            debounced('a');
            debounced('b');
            debounced('c');
            expect(fn).not.toHaveBeenCalled();
            jest.advanceTimersByTime(250);
            expect(fn).toHaveBeenCalledTimes(1);
            expect(fn).toHaveBeenCalledWith('c');
        } finally {
            jest.useRealTimers();
        }
    });
});
