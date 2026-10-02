// api.js - Core API Utilities

// Global Loading Spinner overlay. Multiple page requests can run in parallel,
// so keep the overlay visible until the last request finishes.
let activeLoadingRequests = 0;

function showLoader() {
    activeLoadingRequests++;
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'global-loader-overlay';
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoader() {
    activeLoadingRequests = Math.max(0, activeLoadingRequests - 1);
    if (activeLoadingRequests > 0) return;
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Lightweight Bootstrap-style toast notifications keep feedback visible
// without blocking the page on mobile with native alert dialogs.
function showToast(message, variant = 'danger') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `app-toast toast align-items-center border-start border-4 border-${variant}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${esc(message)}</div>
            <button type="button" class="btn-close me-2 m-auto" aria-label="Close"></button>
        </div>`;
    container.appendChild(toast);
    const close = () => toast.remove();
    toast.querySelector('.btn-close').addEventListener('click', close);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(close, 4200);
}

function showError(message) {
    showToast(`Error: ${message}`, 'danger');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function enhanceDynamicUI() {
    document.body.classList.add('page-loaded');

    document.querySelectorAll('.page-container > h2, .page-container > .card, .page-container > .row > *, .page-container > .tab-content').forEach((element, index) => {
        element.classList.add('reveal-on-scroll');
        element.style.transitionDelay = `${Math.min(index * 45, 240)}ms`;
    });

    const observer = 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        }), { threshold: 0.08 })
        : null;
    document.querySelectorAll('.reveal-on-scroll').forEach(element => {
        if (observer) observer.observe(element);
        else element.classList.add('is-visible');
    });

    document.addEventListener('pointerdown', event => {
        const button = event.target.closest('.btn');
        if (!button || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        ripple.className = 'btn-ripple';
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
        button.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', enhanceDynamicUI);
    document.addEventListener('groupChanged', invalidateReadCache);
}

/**
 * Standard fetch wrapper for all API calls
 * @param {string} endpoint - The API endpoint (e.g., '/api/auth/login')
 * @param {object} options - Fetch options (method, body, etc.)
 * @param {boolean} silent - If true, doesn't show global loader
 */
async function apiFetch(endpoint, options = {}, silent = false) {
    if (!silent) showLoader();

    try {
        // Ensure credentials are sent for sessions
        options.credentials = 'include';
        options.headers = options.headers || {};
        
        if (options.body && !(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        const response = await fetch(endpoint, options);
        
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text(); // Fallback for non-JSON
        }

        if (!response.ok) {
            const errorMsg = data && data.error
                ? (typeof data.error === 'string' ? data.error : data.error.message)
                : (data && data.message ? data.message : 'Something went wrong');
            
            // Redirect to login if unauthorized
            if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
                window.location.href = '/pages/login.html';
                return;
            }

            // Handle stale group IDs
            if (errorMsg === 'NOT_A_MEMBER' || errorMsg === 'GROUP_NOT_FOUND') {
                localStorage.removeItem('activeGroupId');
                if (!window.location.pathname.includes('/pages/groups.html')) {
                    window.location.href = '/pages/groups.html';
                } else {
                    window.location.reload();
                }
                // Don't throw, we are redirecting/reloading
                return;
            }
            
            throw new Error(errorMsg);
        }

        // Any successful mutation can change cached reads (profile, groups).
        const method = String((options.method || 'GET')).toUpperCase();
        if (method !== 'GET') invalidateReadCache();

        return data;

    } catch (error) {
        console.error('API Error:', error);
        if (!silent) showError(error.message);
        throw error; // Re-throw for caller to handle specific UI updates
    } finally {
        if (!silent) hideLoader();
    }
}

// Group State Management
function getActiveGroupId() {
    return localStorage.getItem('activeGroupId');
}
function setActiveGroupId(id) {
    localStorage.setItem('activeGroupId', id);
}

function getUserId() {
    return localStorage.getItem('userId');
}

function setUserId(id) {
    localStorage.setItem('userId', id);
}

/**
 * Escapes HTML special characters to prevent XSS when injecting
 * user-supplied strings into innerHTML. Always use this for any
 * data that comes from the API (names, titles, descriptions, etc.)
 * @param {*} str - The string to escape
 * @returns {string} - HTML-safe string
 */
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Short-lived in-memory cache for idempotent reads (profile, group list).
// Entries expire after their TTL; any successful mutation or group switch
// clears the whole cache so the UI never serves stale membership data.
const readCache = new Map();

function cachedGet(endpoint, ttlMs = 60000) {
    const hit = readCache.get(endpoint);
    if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
    return apiFetch(endpoint, {}, true).then(data => {
        readCache.set(endpoint, { expires: Date.now() + ttlMs, data });
        return data;
    });
}

function invalidateReadCache() {
    readCache.clear();
}

// Trailing-edge debounce: rapid group-switch selections collapse into one
// reload instead of firing a request storm at the serverless backend.
function debounce(fn, waitMs = 250) {
    let timer = null;
    return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, waitMs);
    };
}

// Empty state for groupless users: points to group creation and the QR
// scanner instead of leaving "Loading..." skeletons behind.
function noGroupCard(title = 'No active group') {
    return `<div class="card shadow-sm border-0 mb-4"><div class="card-body text-center py-5">
        <div class="empty-state-icon"><i class="bi bi-people"></i></div>
        <h5>${esc(title)}</h5>
        <p class="text-muted-custom small">Create a group, join with an invite code, or scan a group QR.</p>
        <div class="d-flex gap-2 justify-content-center flex-wrap">
            <a href="/pages/groups.html" class="btn btn-primary">Create or Join a Group</a>
            <a href="/pages/scan.html" class="btn btn-outline-secondary"><i class="bi bi-qr-code-scan me-1"></i>Scan to Join</a>
        </div></div></div>`;
}

function renderNoGroup(slotId = 'noGroupSlot') {
    const slot = typeof document !== 'undefined' ? document.getElementById(slotId) : null;
    if (slot) slot.innerHTML = noGroupCard();
}

function clearNoGroup(slotId = 'noGroupSlot') {
    const slot = typeof document !== 'undefined' ? document.getElementById(slotId) : null;
    if (slot) slot.innerHTML = '';
}

// Exposed for Jest without affecting browser script usage.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { esc, apiFetch, cachedGet, invalidateReadCache, debounce, noGroupCard, renderNoGroup, clearNoGroup, __readCache: readCache };
}
