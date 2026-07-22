// auth.js - Authentication Logic

document.addEventListener('DOMContentLoaded', () => {
    
    // Handle Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await apiFetch('/api/auth/login', {
                    method: 'POST',
                    body: { email, password }
                });

                if (response.success) {
                    setUserId(response.data.user_id);
                    window.location.href = 'dashboard.html';
                }
            } catch (error) {
                // apiFetch already shows error message
            }
        });
    }

    // Handle Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                showError("Passwords do not match");
                return;
            }

            try {
                const response = await apiFetch('/api/auth/register', {
                    method: 'POST',
                    body: { name, email, password }
                });

                if (response.success) {
                    setUserId(response.data.user_id);
                    window.location.href = 'dashboard.html';
                }
            } catch (error) {
                // Error shown by apiFetch
            }
        });
    }
});
