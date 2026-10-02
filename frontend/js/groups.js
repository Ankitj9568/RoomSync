// groups.js - Group Management Logic

let groupsLoadedFor = null;

function requestGroupData(force = false) {
    const groupId = getActiveGroupId();
    if (!groupId) {
        renderEmptyGroupState();
        return;
    }
    if (!force && groupsLoadedFor === String(groupId)) return;
    groupsLoadedFor = String(groupId);
    loadGroupData();
}

function renderEmptyGroupState() {
    const tbody = document.getElementById('membersTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No active group selected. Create or join one above.</td></tr>';
    const logs = document.getElementById('activityLogContainer');
    if (logs) logs.innerHTML = '<p class="text-muted">No active group selected.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
    // Preselect group type from owner onboarding (groups.html?type=pg).
    const typeParam = new URLSearchParams(window.location.search).get('type');
    if (['pg', 'flat', 'friends'].includes(typeParam)) {
        const radio = document.querySelector(`input[name="groupType"][value="${typeParam}"]`);
        if (radio) radio.checked = true;
    }
    updateGroupTypeHint();

    document.querySelectorAll('input[name="groupType"]').forEach(radio => {
        radio.addEventListener('change', updateGroupTypeHint);
    });

    // My Groups list needs no group id; group details wait for the
    // navbar-validated group (groupReady) so a stale stored id cannot 403
    // and reload-loop this page.
    loadMyGroupsList();
    window.addEventListener('groupReady', () => requestGroupData());
    window.addEventListener('groupChanged', () => requestGroupData(true));

    // Create Group Form
    const createGroupForm = document.getElementById('createGroupForm');
    if (createGroupForm) {
        createGroupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newGroupName').value;
            const typeEl = document.querySelector('input[name="groupType"]:checked');
            const body = { name, group_type: typeEl ? typeEl.value : 'friends' };
            if (body.group_type !== 'friends') {
                body.rent_amount = Number(document.getElementById('newGroupRent').value || 0);
                body.billing_day = Number(document.getElementById('newGroupBillingDay').value || 1);
            }
            try {
                const res = await apiFetch('/api/groups/create', {
                    method: 'POST',
                    body
                });
                const roleNote = body.group_type === 'pg' ? ' You are the owner.' : '';
                alert(`Group created successfully! Invite Code: ${res.data.group_code}.${roleNote}`);
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
    const addMemberForm = document.getElementById('addMemberForm');    if (addMemberForm) {
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
        document.getElementById('membersTableBody').innerHTML = '<tr><td colspan="4" class="text-center text-muted">No active group selected.</td></tr>';
        document.getElementById('activityLogContainer').innerHTML = '<p class="text-muted">No active group selected.</p>';
        return;
    }

    try {
        const [membersRes, logsRes, detailsRes] = await Promise.all([
            apiFetch(`/api/groups/members?group_id=${groupId}`),
            apiFetch(`/api/groups/logs?group_id=${groupId}`),
            apiFetch(`/api/groups/${groupId}`)
        ]);

        renderMembers(membersRes.data, detailsRes.success ? detailsRes.data : null);
        renderLogs(logsRes.data);
    } catch (error) {
        console.error("Failed to load group data", error);
    }
}

function renderMembers(members, details = null) {
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;

    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No members found.</td></tr>';
        return;
    }

    const currentUserId = getUserId();
    const me = members.find(member => String(member.user_id) === String(currentUserId));
    // Managers (admins and owners) can change other members' roles and allot rooms.
    // The backend re-validates every change; this only controls the UI.
    const iAmManager = me && ['admin', 'owner'].includes(me.role);
    const showRooms = details && details.group_type === 'pg';
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
        const roomControl = (iAmManager && showRooms && member.user_id != currentUserId)
            ? `<input class="form-control form-control-sm d-inline-block" style="max-width: 110px;" value="${esc(member.room_label || '')}" placeholder="Room" onchange="saveRoomLabel(${member.user_id}, this.value)" aria-label="Room allotment">`
            : `<span class="small ${member.room_label ? '' : 'text-muted'}">${esc(member.room_label || '—')}</span>`;
        html += `
            <tr>
                <td class="ps-4">
                    <div class="fw-medium">${esc(member.name)}${youTag}</div>
                    <div class="small text-muted">${esc(member.email)}</div>
                </td>
                <td>${roleControl}</td>
                <td>${roomControl}</td>
                <td class="text-end pe-4">
                    ${member.user_id != currentUserId ? `<button class="btn btn-sm btn-outline-danger" onclick="removeMember(${member.user_id})"><i class="bi bi-person-x"></i></button>` : ''}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function saveRoomLabel(userId, roomLabel) {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    try {
        await apiFetch(`/api/groups/${groupId}/members/${userId}`, {
            method: 'PATCH',
            body: { room_label: roomLabel }
        });
        loadGroupData();
    } catch (error) {
        alert(error.message || 'Failed to save room');
        loadGroupData();
    }
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

function updateGroupTypeHint() {
    const selected = document.querySelector('input[name="groupType"]:checked');
    const hint = document.getElementById('groupTypeHint');
    const billing = document.getElementById('pgBillingFields');
    const type = selected ? selected.value : 'friends';
    const hints = {
        friends: 'Friends split everything equally. No owner, no billing.',
        flat: 'A rented flat: members run daily chores, the owner sets rent and the bill day.',
        pg: 'A paying guest: you become the owner — rooms, staff, tasks, and monthly billing are yours.'
    };
    if (hint) hint.textContent = hints[type];
    if (billing) billing.classList.toggle('d-none', type === 'friends');
}

async function loadMyGroupsList() {
    const container = document.getElementById('myGroupsList');
    if (!container) return;

    try {
        const res = await apiFetch('/api/groups', {}, true);
        if (!res.success || !res.data || res.data.length === 0) {
            container.innerHTML = '<div class="list-group-item text-center text-muted">No groups yet. Create or join one below.</div>';
            return;
        }
        const activeId = getActiveGroupId();
        const typeBadge = { pg: 'warning', flat: 'info', friends: 'success' };
        container.innerHTML = res.data.map(group => `
            <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${String(group.id) === String(activeId) ? 'active' : ''}" onclick="switchGroup(${group.id})">
                <span>
                    <span class="fw-medium">${esc(group.name)}</span>
                    <span class="badge bg-${typeBadge[group.group_type] || 'secondary'} ms-2">${esc((group.group_type || 'friends').toUpperCase())}</span>
                    <span class="badge bg-light text-dark ms-1">${esc(group.role || '')}</span>
                </span>
                <span class="badge bg-secondary rounded-pill">${group.member_count} members</span>
            </button>
        `).join('');
    } catch (error) {
        console.error('Failed to load groups list', error);
    }
}

function switchGroup(groupId) {
    localStorage.setItem('activeGroupId', groupId);
    window.location.reload();
}
