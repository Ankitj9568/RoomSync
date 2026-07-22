// settings.js

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    
    if (getActiveGroupId()) {
        loadGroupSettings();
    }
    
    window.addEventListener('groupChanged', () => {
        loadGroupSettings();
    });
    
    document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
});

async function loadUserProfile() {
    try {
        const res = await apiFetch('/api/users/profile');
        if (res.success && res.data) {
            document.getElementById('profileName').value = res.data.name || '';
            document.getElementById('profileEmail').value = res.data.email || '';
            document.getElementById('profilePhone').value = res.data.phone || '';
            document.getElementById('profileUpi').value = res.data.upi_id || '';
        }
    } catch (error) {
        console.error("Failed to load profile", error);
    }
}

async function handleProfileSave(e) {
    e.preventDefault();
    const name = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const upi = document.getElementById('profileUpi').value;
    
    try {
        await apiFetch('/api/users/profile', {
            method: 'PUT',
            body: { name, phone, upi_id: upi }
        });
        alert('Profile updated successfully!');
    } catch (error) {
        alert(error.message || 'Failed to update profile');
    }
}

async function loadGroupSettings() {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    
    try {
        const res = await apiFetch(`/api/groups/${groupId}`);
        if (res.success && res.data) {
            const groupSelect = document.getElementById('groupSelect');
            groupSelect.innerHTML = `<option value="${res.data.group_id}">${res.data.name}</option>`;
            
            document.getElementById('groupCode').value = res.data.join_code;
            
            // Render Members
            const membersList = document.getElementById('groupMembersList');
            let html = '';
            const currentUserId = getUserId();
            
            res.data.members.forEach(m => {
                const isMe = m.user_id == currentUserId;
                const isAdmin = m.role === 'admin';
                
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${m.name} ${isMe ? '(You)' : ''}
                        ${isAdmin ? '<span class="badge bg-primary rounded-pill">Admin</span>' : ''}
                    </li>
                `;
            });
            membersList.innerHTML = html;
        }
    } catch (error) {
        console.error("Failed to load group settings", error);
    }
}

function copyGroupCode() {
    const code = document.getElementById('groupCode').value;
    navigator.clipboard.writeText(code).then(() => {
        alert('Join code copied to clipboard!');
    });
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('activeGroupId');
    window.location.href = '/index.html';
}
