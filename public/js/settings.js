// settings.js

document.addEventListener('DOMContentLoaded', () => {
    loadSettingsProfile();
    
    if (getActiveGroupId()) {
        loadGroupSettings();
    }
    
    window.addEventListener('groupChanged', () => {
        loadGroupSettings();
    });
    
    document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
});

async function loadSettingsProfile() {
    try {
        const res = await apiFetch('/api/users/me');
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
        await apiFetch('/api/users/me', {
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
            
            const joinUrl = `${window.location.origin}/pages/join.html?code=${res.data.join_code}`;
            document.getElementById('groupCode').value = joinUrl;
            
            // Generate QR Code
            const qrContainer = document.getElementById('qrcodePlaceholder');
            const qrHint = document.getElementById('qrcodeHint');
            if (qrContainer && typeof QRCode !== 'undefined') {
                qrContainer.innerHTML = ''; // clear previous
                qrContainer.style.setProperty('display', 'inline-block', 'important');
                qrHint.style.display = 'block';
                new QRCode(qrContainer, {
                    text: joinUrl,
                    width: 128,
                    height: 128,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            }
            
            // Render Members
            const membersList = document.getElementById('groupMembersList');
            let html = '';
            const currentUserId = parseInt(getUserId());
            let currentUserIsAdmin = false;
            
            res.data.members.forEach(m => {
                const isMe = m.user_id === currentUserId;
                const isAdmin = m.role === 'admin';
                if (isMe && isAdmin) currentUserIsAdmin = true;
                
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${m.name} ${isMe ? '(You)' : ''}
                        ${isAdmin ? '<span class="badge bg-primary rounded-pill">Admin</span>' : ''}
                    </li>
                `;
            });
            membersList.innerHTML = html;
            
            // Handle Admin UI
            const adminPanel = document.getElementById('adminSettingsPanel');
            if (currentUserIsAdmin) {
                adminPanel.classList.remove('d-none');
                
                // Set toggle state
                const toggle = document.getElementById('allowDirectJoinToggle');
                toggle.checked = res.data.allow_direct_join === 1;
                
                // Immediate save
                toggle.onchange = async function() {
                    try {
                        await apiFetch(`/api/groups/${groupId}/settings`, {
                            method: 'PATCH',
                            body: { allow_direct_join: this.checked }
                        });
                        console.log('Toggle direct join:', this.checked);
                    } catch (e) {
                        console.error('Failed to update direct join setting:', e);
                        this.checked = !this.checked; // revert UI
                        alert('Failed to update setting');
                    }
                };
                
                loadJoinRequests(groupId);
            } else {
                adminPanel.classList.add('d-none');
            }
        }
    } catch (error) {
        console.error("Failed to load group settings", error);
    }
}

async function loadJoinRequests(groupId) {
    try {
        const res = await apiFetch(`/api/groups/${groupId}/join_requests`);
        const list = document.getElementById('pendingRequestsList');
        
        if (res.success && res.data && res.data.length > 0) {
            let html = '';
            res.data.forEach(req => {
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                        <div>
                            <div class="fw-bold">${req.user_name}</div>
                            <div class="small text-muted">${req.user_email}</div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-success me-1" onclick="processJoinRequest(${req.request_id}, 'approved')"><i class="bi bi-check-lg"></i></button>
                            <button class="btn btn-sm btn-danger" onclick="processJoinRequest(${req.request_id}, 'rejected')"><i class="bi bi-x-lg"></i></button>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        } else {
            list.innerHTML = '<div class="list-group-item text-center text-muted small py-3">No pending requests</div>';
        }
    } catch (e) {
        console.error("Failed to load join requests", e);
    }
}

async function processJoinRequest(reqId, status) {
    const groupId = getActiveGroupId();
    try {
        await apiFetch(`/api/groups/${groupId}/join_requests/${reqId}`, {
            method: 'PATCH',
            body: { status }
        });
        loadJoinRequests(groupId);
        loadGroupSettings(); // Reload members if approved
    } catch (e) {
        alert(e.message || 'Failed to process request');
    }
}

function copyGroupCode() {
    const code = document.getElementById('groupCode').value;
    navigator.clipboard.writeText(code).then(() => {
        alert('Join link copied to clipboard!');
    });
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('activeGroupId');
    window.location.href = '/pages/login.html';
}
