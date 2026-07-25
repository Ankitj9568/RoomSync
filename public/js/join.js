// join.js
let inviteCode = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Inject fouc fix
    document.body.classList.add('theme-transition');

    const params = new URLSearchParams(window.location.search);
    inviteCode = params.get('code');

    if (!inviteCode) {
        showError("No invite code provided in the URL.");
        return;
    }

    try {
        // Fetch group info publicly
        const res = await fetch(`/api/groups/code/${inviteCode}`);
        const data = await res.json();

        if (data.success) {
            document.getElementById('groupNameDisplay').textContent = data.data.name;
            showInvite(true);
        } else {
            showError(data.message || "Invalid or expired invite link.");
        }
    } catch (e) {
        console.error("Error fetching group info", e);
        showError("Failed to load invite. Please try again later.");
    }
});

function showInvite(isValid) {
    document.getElementById('loadingState').classList.add('d-none');
    document.getElementById('inviteState').classList.remove('d-none');

    // Check if user is logged in
    const token = localStorage.getItem('token');
    
    if (token) {
        document.getElementById('joinBtn').style.display = 'block';
    } else {
        document.getElementById('authRequiredAlert').classList.remove('d-none');
        
        // Update login/register links to return here
        const returnUrl = encodeURIComponent(`/pages/join.html?code=${inviteCode}`);
        document.getElementById('loginBtn').href = `login.html?returnTo=${returnUrl}`;
        document.getElementById('registerBtn').href = `register.html?returnTo=${returnUrl}`;
        
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('registerBtn').style.display = 'block';
    }
}

function showError(msg) {
    document.getElementById('loadingState').classList.add('d-none');
    document.getElementById('errorState').classList.remove('d-none');
    if (msg) document.getElementById('errorMessage').textContent = msg;
}

async function handleJoin() {
    const btn = document.getElementById('joinBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Joining...';
    
    try {
        const res = await apiFetch('/api/groups/join', {
            method: 'POST',
            body: { code: inviteCode }
        });
        
        if (res.pending) {
            alert('Your request to join has been sent to the group admins for approval.');
            window.location.href = 'dashboard.html';
        } else {
            alert('Successfully joined the group!');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        alert(error.message || 'Failed to join group.');
        btn.disabled = false;
        btn.textContent = 'Join Now';
    }
}
