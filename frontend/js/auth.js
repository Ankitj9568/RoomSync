// auth.js - Authentication Logic

// Human-check helpers (zero-dependency arithmetic CAPTCHA).
async function loadCaptcha(kind) {
    const questionEl = document.getElementById(`captchaQuestion-${kind}`);
    const tokenEl = document.getElementById(`captchaToken-${kind}`);
    if (!questionEl || !tokenEl) return;
    try {
        const res = await apiFetch('/api/auth/captcha', {}, true);
        if (res.success) {
            questionEl.textContent = res.data.question;
            tokenEl.value = res.data.token;
        }
    } catch (error) {
        questionEl.textContent = 'Could not load the human check. Retry.';
    }
}

function refreshCaptcha(kind) {
    const answerEl = document.getElementById(`captchaAnswer-${kind}`);
    if (answerEl) answerEl.value = '';
    loadCaptcha(kind);
}

function captchaFields(kind) {
    return {
        captchaToken: (document.getElementById(`captchaToken-${kind}`) || {}).value || '',
        captchaAnswer: (document.getElementById(`captchaAnswer-${kind}`) || {}).value || ''
    };
}

document.addEventListener('DOMContentLoaded', () => {
    loadCaptcha('login');
    loadCaptcha('register');

    // Owners arriving from Google hit the second factor here.
    const oauthFlag = new URLSearchParams(window.location.search).get('oauth');
    if (oauthFlag === 'mfa-required') {
        const loginForm = document.getElementById('loginForm');
        const mfaForm = document.getElementById('mfaForm');
        if (loginForm && mfaForm) {
            loginForm.classList.add('d-none');
            mfaForm.classList.remove('d-none');
        }
    }
    
    // Handle Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Role-first login: the selector sets expectations, the server checks
        // the real account and decides the landing. Preselect via ?as=owner.
        const loginRoleHints = {
            roommate: 'Roommates land on the shared dashboard.',
            owner: 'Owners verify a second step, then open their PG home.',
            staff: 'Staff land directly on today\u2019s tasks.'
        };
        const applyLoginRoleHint = () => {
            const selected = document.querySelector('input[name="loginRole"]:checked');
            const hint = document.getElementById('loginRoleHint');
            if (selected && hint && loginRoleHints[selected.value]) hint.textContent = loginRoleHints[selected.value];
            const roleName = document.getElementById('loginRoleName');
            if (selected && roleName) roleName.textContent = selected.value === 'owner' ? 'PG / Flat Owner' : selected.value.charAt(0).toUpperCase() + selected.value.slice(1);
            // The Gmail path must carry the same selection into OAuth state.
            const googleBtn = document.getElementById('googleLoginBtn');
            if (googleBtn && selected) googleBtn.href = `/api/auth/google?as=${selected.value}`;
        };
        const loginAsParam = new URLSearchParams(window.location.search).get('as');
        if (loginAsParam && loginRoleHints[loginAsParam]) {
            const radio = document.querySelector(`input[name="loginRole"][value="${loginAsParam}"]`);
            if (radio) radio.checked = true;
        }
        document.querySelectorAll('input[name="loginRole"]').forEach(radio => {
            radio.addEventListener('change', applyLoginRoleHint);
        });
        applyLoginRoleHint();

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginRole = (document.querySelector('input[name="loginRole"]:checked') || {}).value || 'roommate';

            try {
                const response = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: { email, password, as: loginRole, ...captchaFields('login') }
                });

                if (response.success) {
                    // A stored group belongs to whoever used this browser
                    // before; drop it so pages never fetch with a stale id.
                    localStorage.removeItem('activeGroupId');
                    // PG/flat owners pass a second factor before entering.
                    if (response.mfaRequired) {
                        setUserId(response.data.user_id);
                        document.getElementById('loginForm').classList.add('d-none');
                        document.getElementById('mfaForm').classList.remove('d-none');
                        document.getElementById('mfaCode').focus();
                        return;
                    }
                    if (response.mfaSetupRequired) {
                        setUserId(response.data.user_id);
                        window.location.href = '/pages/settings.html#mfa';
                        return;
                    }
                    setUserId(response.data.user_id);
                    const urlParams = new URLSearchParams(window.location.search);
                    let returnTo = urlParams.get('returnTo');
                    if (returnTo) {
                        returnTo = decodeURIComponent(returnTo);
                        // Strict same-origin check to prevent open redirect (e.g. //evil.com/page.html)
                        try {
                            const parsed = new URL(returnTo, window.location.origin);
                            if (parsed.origin !== window.location.origin) returnTo = null;
                        } catch { returnTo = null; }
                    }
                    // The server picks the home from the verified account:
                    // staff land on today's tasks, everyone else on the dashboard.
                    window.location.href = returnTo || (response.data && response.data.home) || '/pages/dashboard.html';
                }
            } catch (error) {
                refreshCaptcha('login');
                // apiFetch already shows error message
            }
        });
    }

    // Handle Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        // Preselect account type from links like register.html?as=owner.
        const asParam = new URLSearchParams(window.location.search).get('as');
        const accountHints = {
            roommate: 'Roommates split costs and run the home together.',
            owner: 'Owners run a PG or flat: rooms, staff, tasks, and monthly billing. Owner logins need a second step.',
            staff: 'Staff (cook, maid, watchman) get tasks from the owner. Ask your owner for the group invite code.'
        };
        const applyAccountHint = () => {
            const selected = document.querySelector('input[name="accountType"]:checked');
            const hint = document.getElementById('accountTypeHint');
            if (selected && hint && accountHints[selected.value]) hint.textContent = accountHints[selected.value];
            const googleBtn = document.getElementById('googleRegisterBtn');
            if (googleBtn && selected) googleBtn.href = `/api/auth/google?as=${selected.value}`;
        };
        if (asParam && accountHints[asParam]) {
            const radio = document.querySelector(`input[name="accountType"][value="${asParam}"]`);
            if (radio) radio.checked = true;
        }
        document.querySelectorAll('input[name="accountType"]').forEach(radio => {
            radio.addEventListener('change', applyAccountHint);
        });
        applyAccountHint();

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const accountType = (document.querySelector('input[name="accountType"]:checked') || {}).value || 'roommate';

            if (password !== confirmPassword) {
                showError("Passwords do not match");
                return;
            }

            try {
                const response = await apiFetch('/api/auth/register', {
                    method: 'POST',
                    body: { name, email, password, account_type: accountType, ...captchaFields('register') }
                });

                if (response.success) {
                    setUserId(response.data.user_id);
                    // A stored group belongs to whoever used this browser
                    // before; drop it so pages never fetch with a stale id.
                    localStorage.removeItem('activeGroupId');
                    const urlParams = new URLSearchParams(window.location.search);
                    let returnTo = urlParams.get('returnTo');
                    if (returnTo) {
                        returnTo = decodeURIComponent(returnTo);
                        try {
                            const parsed = new URL(returnTo, window.location.origin);
                            if (parsed.origin !== window.location.origin) returnTo = null;
                        } catch { returnTo = null; }
                    }
                    window.location.href = returnTo || response.data.onboarding || '/pages/dashboard.html';
                }
            } catch (error) {
                refreshCaptcha('register');
                // Error shown by apiFetch
            }
        });
    }

    // Handle MFA challenge form (owner second factor)
    const mfaForm = document.getElementById('mfaForm');
    if (mfaForm) {
        mfaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = document.getElementById('mfaCode').value;

            try {
                const response = await apiFetch('/api/auth/mfa/challenge', {
                    method: 'POST',
                    body: { token }
                });

                if (response.success) {
                    const home = (response.data && response.data.home) || '/pages/dashboard.html';
                    window.location.href = home;
                }
            } catch (error) {
                // apiFetch already shows error message
            }
        });
    }

    // Handle Password Visibility Toggles
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            // The input field is previous sibling to the button in the input-group
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        });
    });
});
