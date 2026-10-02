const roomSyncLogo = `
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="me-2 text-primary-custom" style="min-width: 28px;">
  <path d="M3 10L12 3l9 7"></path>
  <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10"></path>
  <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
  <circle cx="8" cy="17" r="2" fill="var(--color-accent)" stroke="none"></circle>
  <circle cx="16" cy="17" r="1.5" fill="currentColor"></circle>
  <path d="M11 13L9 15.5"></path>
  <path d="M13 13l2 2.5"></path>
</svg>
`;

const navbarHTML = `
<!-- Mobile Header (Hidden on Desktop) -->
<div class="mobile-app-header d-lg-none bg-surface shadow-sm p-3 d-flex justify-content-between align-items-center sticky-top">
  <a class="navbar-brand d-flex align-items-center text-decoration-none mb-0" href="/pages/dashboard.html">
      ${roomSyncLogo}
      <span class="fs-4 fw-bold text-primary-custom">RoomSync</span>
  </a>
  <div class="d-flex align-items-center">
    <button class="btn btn-link text-dark text-decoration-none p-1 me-2" id="themeToggleMobile" onclick="toggleTheme()">
      <i class="bi bi-moon-fill" id="themeIconMobile"></i>
    </button>
    <button class="btn btn-outline-secondary border-0 p-1" type="button" aria-label="Open navigation menu" data-bs-toggle="offcanvas" data-bs-target="#sidebarOffcanvas" aria-controls="sidebarOffcanvas">
      <i class="bi bi-list fs-1 text-dark"></i>
    </button>
  </div>
</div>

<!-- Sidebar / Offcanvas Drawer -->
<div class="offcanvas-lg offcanvas-start sidebar d-flex flex-column" tabindex="-1" id="sidebarOffcanvas" aria-labelledby="sidebarOffcanvasLabel">
  
  <!-- Offcanvas Header for Mobile -->
  <div class="offcanvas-header d-lg-none p-3 border-bottom">
    <a class="navbar-brand d-flex align-items-center text-decoration-none" href="/pages/dashboard.html">
        ${roomSyncLogo}
        <span class="fs-4 fw-bold text-primary-custom">RoomSync</span>
    </a>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebarOffcanvas" aria-label="Close"></button>
  </div>

  <!-- Header for Desktop -->
  <div class="offcanvas-header d-none d-lg-flex p-4 pb-2 border-bottom-0">
      <a class="navbar-brand d-flex align-items-center text-decoration-none w-100" href="/pages/dashboard.html">
          ${roomSyncLogo}
          <span class="fs-4 fw-bold text-primary-custom">RoomSync</span>
      </a>
      <button class="btn btn-link text-dark text-decoration-none p-1" id="themeToggleDesktop" onclick="toggleTheme()" title="Toggle Theme">
        <i class="bi bi-moon-fill" id="themeIconDesktop"></i>
      </button>
  </div>
  <hr class="d-none d-lg-block mx-4 mt-2 mb-2">
      
  <!-- Nav Links -->
  <div class="offcanvas-body p-3 d-flex flex-column overflow-y-auto">
    <ul class="nav nav-pills flex-column mb-auto w-100">
      <li class="nav-item">
        <a class="nav-link" href="/pages/dashboard.html"><i class="bi bi-grid-1x2 me-3"></i> Dashboard</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/groceries.html"><i class="bi bi-cart me-3"></i> Groceries</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/shopping-list.html"><i class="bi bi-list-check me-3"></i> Shopping List</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/meals.html"><i class="bi bi-cup-hot me-3"></i> Meals</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/tasks.html"><i class="bi bi-list-task me-3"></i> Tasks</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-financial-link href="/pages/expenses.html"><i class="bi bi-receipt me-3"></i> Expenses</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-financial-link href="/pages/settlements.html"><i class="bi bi-arrow-left-right me-3"></i> Settlements</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-financial-link href="/pages/analytics.html"><i class="bi bi-graph-up me-3"></i> Analytics</a>
      </li>
    </ul>
    
    <hr class="mt-3 mb-3 w-100 border-secondary opacity-25">
    <ul class="nav nav-pills flex-column w-100">
      <li class="nav-item">
        <a class="nav-link" href="/pages/groups.html"><i class="bi bi-people me-3"></i> Manage Groups</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/settings.html"><i class="bi bi-gear me-3"></i> Settings</a>
      </li>
      <li class="nav-item">
        <a class="nav-link text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-3"></i> Logout</a>
      </li>
    </ul>

    <!-- User Profile & Group Selector -->
    <div class="mt-auto border-top pt-3 w-100 px-2 pb-2">
        <div class="d-flex align-items-center mb-3">
            <div class="bg-primary-custom rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style="width: 40px; height: 40px; font-weight: bold;" id="navUserInitial">
                ?
            </div>
            <div class="text-truncate">
                <h6 class="mb-0 text-dark fw-bold text-truncate" id="navUserName">Loading...</h6>
                <small class="text-muted-custom text-truncate" style="font-size: 0.75rem;" id="navUserEmail">...</small>
            </div>
        </div>
        
        <select class="form-select form-select-sm shadow-sm bg-light text-dark border-0" id="navGroupSelect">
            <option value="">Loading Groups...</option>
        </select>
    </div>
  </div>
</div>
`;

function toggleTheme() {
    document.body.classList.add('theme-transition');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('roomsync-theme', newTheme);
    updateThemeIcons(newTheme);
    window.dispatchEvent(new Event('themeChanged')); // For charts
}

function updateThemeIcons(theme) {
    const iconClass = theme === 'dark' ? 'bi-sun-fill text-warning' : 'bi-moon-fill text-dark';
    const mobileIcon = document.getElementById('themeIconMobile');
    const desktopIcon = document.getElementById('themeIconDesktop');
    if (mobileIcon) mobileIcon.className = 'bi ' + iconClass;
    if (desktopIcon) desktopIcon.className = 'bi ' + iconClass;
}

document.addEventListener("DOMContentLoaded", () => {
    // Inject Sidebar
    const navPlaceholder = document.getElementById("navbar-placeholder");
    if (navPlaceholder) {
        navPlaceholder.innerHTML = navbarHTML;
        document.body.classList.add('has-sidebar');
    }

    // Set Active State
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
            link.classList.remove('text-secondary');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.add('text-secondary');
        }

        // Explicitly close the mobile drawer before navigation. The normal
        // anchor behavior is intentionally preserved so this works with
        // keyboard, mouse, and touch input across Bootstrap breakpoints.
        if (link.id !== 'logoutBtn') {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                    const drawer = document.getElementById('sidebarOffcanvas');
                    if (drawer && window.bootstrap && window.bootstrap.Offcanvas) {
                        window.bootstrap.Offcanvas.getOrCreateInstance(drawer).hide();
                    }
                }
            });
        }
    });

    // Initialize Theme
    const savedTheme = localStorage.getItem('roomsync-theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcons(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcons('dark');
    }

    // Fetch User Data and Groups
    if (navPlaceholder && typeof apiFetch !== 'undefined') {
        // These requests are independent. Running them together avoids making
        // every page wait for two sequential serverless/database round trips.
        const userProfilePromise = loadUserProfile();
        loadUserGroups(userProfilePromise);
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await apiFetch('/api/auth/logout', { method: 'POST' });
                } catch (error) {
                    console.error('Logout API failed, clearing local state anyway', error);
                } finally {
                    localStorage.removeItem('activeGroupId');
                    localStorage.removeItem('userId');
                    window.location.href = '/pages/login.html';
                }
            });
        }
        
        const groupSelect = document.getElementById('navGroupSelect');
        if (groupSelect) {
            // Debounced so rapid selection changes collapse into a single reload.
            const onGroupSwitch = debounce(value => {
                setActiveGroupId(value);
                applyRoleToNav(getActiveGroupRole());
                // Dispatch event so page can reload its data
                window.dispatchEvent(new Event('groupChanged'));
            });
            groupSelect.addEventListener('change', e => onGroupSwitch(e.target.value));
        }
    }
});

async function loadUserProfile() {
    try {
        const res = await cachedGet('/api/users/me'); // silent cached load
        if (res.success && res.data) {
            const user = res.data;
            // Keep legacy page scripts in sync for OAuth sessions, which do
            // not pass through the login form that normally sets localStorage.
            setUserId(user.user_id);
            document.getElementById('navUserName').textContent = user.name;
            document.getElementById('navUserEmail').textContent = user.email;
            document.getElementById('navUserInitial').textContent = user.name.charAt(0).toUpperCase();
            
        }
    } catch (error) {
        console.error("Failed to load profile", error);
    }
}

async function loadUserGroups(userProfilePromise = Promise.resolve()) {
    try {
        const res = await cachedGet('/api/groups');
        const groupSelect = document.getElementById('navGroupSelect');
        
        if (res.success && res.data) {
            groupSelect.innerHTML = '';
            const groups = res.data;
            
            if (groups.length === 0) {
                groupSelect.innerHTML = '<option value="">No Groups Found</option>';
                if (!window.location.pathname.includes('/pages/groups.html')) {
                    window.location.href = '/pages/groups.html';
                }
                return;
            }
            
            let activeGroupId = getActiveGroupId();
            
            groups.forEach(group => {
                const opt = document.createElement('option');
                opt.value = group.id;
                opt.textContent = group.name;
                groupSelect.appendChild(opt);
            });
            
            // Set active or default to first
            if (!activeGroupId || !groups.find(g => g.id == activeGroupId)) {
                activeGroupId = groups[0].id;
                setActiveGroupId(activeGroupId);
            }
            
            groupSelect.value = activeGroupId;
            // Keep page modules from rendering before the profile has populated
            // localStorage with the current user id.
            await userProfilePromise;
            applyRoleToNav(getActiveGroupRole());
            window.dispatchEvent(new Event('groupReady'));
        }
    } catch (error) {
        console.error("Failed to load groups", error);
    }
}

// Role of the current user in the active group, from the cached group list.
function getActiveGroupRole() {
    try {
        const cache = typeof readCache !== 'undefined' ? readCache : null;
        const hit = cache ? cache.get('/api/groups') : null;
        const groups = hit && hit.data && hit.data.data ? hit.data.data : [];
        const active = groups.find(g => String(g.id) === String(getActiveGroupId()));
        return active ? active.role : null;
    } catch {
        return null;
    }
}

// Staff (chef, maid) and owners never see roommate-shared financial
// navigation; the backend enforces the same restriction on every endpoint.
function applyRoleToNav(role) {
    const hideFinancials = role === 'staff' || role === 'owner';
    document.querySelectorAll('[data-financial-link]').forEach(link => {
        link.classList.toggle('d-none', hideFinancials);
    });
}

// Back-button safety: browsers can restore the page DOM from the
// back-forward cache without re-running scripts, which makes a logged-out
// session look logged in. Re-validate on restore; apiFetch redirects to the
// login page automatically when the session is gone.
if (typeof window !== 'undefined') {
    window.addEventListener('pageshow', event => {
        if (!event.persisted || typeof apiFetch === 'undefined') return;
        apiFetch('/api/users/me', {}, true).catch(() => {});
    });
}
