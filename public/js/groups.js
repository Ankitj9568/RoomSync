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
            const code = document.getElementById('joinGroupCode').value.trim().toUpperCase();
            try {
                await apiFetch('/api/groups/join', {
                    method: 'POST',
                    body: { code }
                });
                alert('Joined group successfully!');
                joinGroupForm.reset();
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

            try {
                await apiFetch('/api/groups/members/add', {
                    method: 'POST',
                    body: { group_id: groupId, email, role }
                });
                
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
    let html = '';

    members.forEach(member => {
        let badgeColor = member.role === 'admin' ? 'primary' : 'secondary';
        let youTag = member.user_id == currentUserId ? ' <span class="badge bg-light text-dark ms-1">You</span>' : '';
        
        html += `
            <tr>
                <td class="ps-4">
                    <div class="fw-medium">${member.name}${youTag}</div>
                    <div class="small text-muted">${member.email}</div>
                </td>
                <td><span class="badge bg-${badgeColor}">${member.role}</span></td>
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
                <div><strong>${log.user_name}</strong>: ${log.description}</div>
            </li>
        `;
    });
    html += '</ul>';

    container.innerHTML = html;
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
