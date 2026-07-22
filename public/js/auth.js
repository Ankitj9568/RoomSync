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
