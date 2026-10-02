// groups.js - Group Management Logic

document.addEventListener('DOMContentLoaded', () => {
    // Initial data load if a group is active
    if (getActiveGroupId()) {
        loadGroupData();
    }
    
    // Listen for group changes
    window.addEventListener('groupChanged', loadGroupData);

    // Create Group Form
    const createGroupForm = document.getElementById('createGroupForm');
    if (createGroupForm) {
        createGroupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newGroupName').value;
            try {
                const res = await apiFetch('/api/groups/create', {
                    method: 'POST',
                    body: { name }
                });
                alert(`Group created successfully! Invite Code: ${res.data.group_code}`);
                createGroupForm.reset();
                
                // Set the new group as active and reload navbar
                localStorage.setItem('activeGroupId', res.data.group_id);
                window.location.reload();
            } catch (error) {
                alert(error.message || 'Failed to create group');
            }
        });
    }

    // Join Group Form
    const joinGroupForm = document.getElementById('joinGroupForm');
    if (joinGroupForm) {
        joinGroupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let code = document.getElementById('joinGroupCode').value.trim();
            if (code.includes('?code=')) {
                code = code.split('?code=')[1].split('&')[0];
            }
            code = code.toUpperCase();
            try {
                const res = await apiFetch('/api/groups/join', {
                    method: 'POST',
                    body: { code }
                });
                alert('Joined group successfully!');
                joinGroupForm.reset();
                if (res.data && res.data.group_id) {
                    localStorage.setItem('activeGroupId', res.data.group_id);
                }
                window.location.reload();
            } catch (error) {
                alert(error.message || 'Failed to join group');
            }
        });
    }

    // Add Member Form
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const groupId = getActiveGroupId();
            if (!groupId) return;

            const email = document.getElementById('addMemberEmail').value;
            const role = document.getElementById('addMemberRole').value;
            const provision = document.getElementById('provisionStaffCheck').checked;

            try {
                if (provision) {
                    const name = document.getElementById('provisionStaffName').value;
                    const res = await apiFetch('/api/groups/members/provision', {
                        method: 'POST',
                        body: { group_id: groupId, name, email }
                    });
                    if (res.data && res.data.temporary_password) {
                        alert(`Staff account created! Temporary password (share once): ${res.data.temporary_password}`);
                    } else {
                        alert('Existing user added as staff.');
                    }
                } else {
                    await apiFetch('/api/groups/members/add', {
                        method: 'POST',
                        body: { group_id: groupId, email, role }
                    });
                }
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('addMemberModal'));
                if (modal) modal.hide();
                addMemberForm.reset();
                
                loadGroupData(); // Reload data
            } catch (error) {
                alert(error.message || 'Failed to add member');
            }
        });
    }
});

async function loadGroupData() {
    const groupId = getActiveGroupId();
    if (!groupId) {
        document.getElementById('membersTableBody').innerHTML = '<tr><td colspan="3" class="text-center text-muted">No active group selected.</td></tr>';
        document.getElementById('activityLogContainer').innerHTML = '<p class="text-muted">No active group selected.</p>';
        return;
    }

    try {
        const [membersRes, logsRes] = await Promise.all([
            apiFetch(`/api/groups/members?group_id=${groupId}`),
            apiFetch(`/api/groups/logs?group_id=${groupId}`)
        ]);

        renderMembers(membersRes.data);
        renderLogs(logsRes.data);
    } catch (error) {
        console.error("Failed to load group data", error);
    }
}

function renderMembers(members) {
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;

    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No members found.</td></tr>';
        return;
    }

    const currentUserId = getUserId();
    const me = members.find(member => String(member.user_id) === String(currentUserId));
    // Managers (admins and owners) can change other members' roles.
    // The backend re-validates every change; this only controls the UI.
    const iAmManager = me && ['admin', 'owner'].includes(me.role);
    const badgeFor = role => ({
        admin: 'primary',
        owner: 'warning',
        staff: 'info',
        member: 'secondary'
    }[role] || 'secondary');
    const labelFor = role => role.charAt(0).toUpperCase() + role.slice(1);
    let html = '';

    members.forEach(member => {
        let youTag = member.user_id == currentUserId ? ' <span class="badge bg-light text-dark ms-1">You</span>' : '';
        const roleControl = (iAmManager && member.user_id != currentUserId)
            ? `<select class="form-select form-select-sm d-inline-block w-auto" onchange="changeMemberRole(${member.user_id}, this.value)" aria-label="Change role">
                ${['member', 'staff', 'admin', 'owner'].map(r => `<option value="${r}"${r === member.role ? ' selected' : ''}>${labelFor(r)}</option>`).join('')}
               </select>`
            : `<span class="badge bg-${badgeFor(member.role)}">${esc(labelFor(member.role))}</span>`;
        html += `
            <tr>
                <td class="ps-4">
                    <div class="fw-medium">${esc(member.name)}${youTag}</div>
                    <div class="small text-muted">${esc(member.email)}</div>
                </td>
                <td>${roleControl}</td>
                <td class="text-end pe-4">
                    ${member.user_id != currentUserId ? `<button class="btn btn-sm btn-outline-danger" onclick="removeMember(${member.user_id})"><i class="bi bi-person-x"></i></button>` : ''}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function renderLogs(logs) {
    const container = document.getElementById('activityLogContainer');
    if (!container) return;

    if (!logs || logs.length === 0) {
        container.innerHTML = '<p class="text-muted small">No recent activity.</p>';
        return;
    }

    let html = '<ul class="list-unstyled">';
    logs.forEach(log => {
        const date = new Date(log.created_at).toLocaleString();
        html += `
            <li class="mb-3 border-start border-2 border-primary ps-3">
                <div class="small text-muted mb-1">${date}</div>
                <div><strong>${esc(log.user_name)}</strong>: ${esc(log.description)}</div>
            </li>
        `;
    });
    html += '</ul>';

    container.innerHTML = html;
}

async function changeMemberRole(userId, role) {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        await apiFetch(`/api/groups/${groupId}/members/${userId}`, {
            method: 'PATCH',
            body: { role }
        });
        loadGroupData();
    } catch (error) {
        alert(error.message || 'Failed to update role. The group must keep at least one manager.');
        loadGroupData();
    }
}

async function removeMember(userId) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        await apiFetch('/api/groups/members/remove', {
            method: 'POST',
            body: { group_id: groupId, user_id: userId }
        });
        loadGroupData();
    } catch (error) {
        alert(error.message || 'Failed to remove member. You might not have admin privileges.');
    }
}
