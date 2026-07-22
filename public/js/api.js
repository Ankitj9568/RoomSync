// api.js - Core API Utilities

// Global Loading Spinner overlay
function showLoader() {
    let loader = document.getElementById('global-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        Object.assign(loader.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '9999'
        });
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Custom alert modal wrapper for errors
function showError(message) {
    alert("Error: " + message); // Simple alert for now, can be upgraded to Bootstrap toast
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
            const errorMsg = data && data.error ? data.error : (data.message || 'Something went wrong');
            
            // Redirect to login if unauthorized
            if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
                window.location.href = '/pages/login.html';
                return;
            }

            // Handle stale group IDs
            if (errorMsg === 'NOT_A_MEMBER' || response.status === 403) {
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
