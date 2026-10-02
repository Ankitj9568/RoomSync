// tasks.js - Household task board (owner-assigned chores for staff/members)

let taskFilter = 'pending';
let taskMembersCache = [];
let iAmTaskManager = false;

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('groupReady', loadTasksPage);
    window.addEventListener('groupChanged', loadTasksPage);

    if (getActiveGroupId()) {
        loadTasksPage();
    }

    const taskForm = document.getElementById('taskForm');
    if (taskForm) taskForm.addEventListener('submit', saveTask);
});

async function loadTasksPage() {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        const [membersRes, tasksRes] = await Promise.all([
            apiFetch(`/api/groups/members?group_id=${groupId}`),
            fetchTasks(groupId)
        ]);

        taskMembersCache = membersRes.data || [];
        const me = taskMembersCache.find(m => String(m.user_id) === String(getUserId()));
        iAmTaskManager = me && ['admin', 'owner'].includes(me.role);
        document.getElementById('assignTaskBtn').classList.toggle('d-none', !iAmTaskManager);

        renderTasks(tasksRes.data || []);
    } catch (error) {
        console.error('Tasks load failed', error);
    }
}

async function fetchTasks(groupId) {
    let url = `/api/tasks?group_id=${groupId}`;
    if (taskFilter === 'pending' || taskFilter === 'done') {
        url += `&status=${taskFilter}`;
    } else if (taskFilter === 'mine') {
        url += '&assigned_to=me';
    }
    return apiFetch(url);
}

function setTaskFilter(filter, btn) {
    taskFilter = filter;
    document.querySelectorAll('[data-task-filter]').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadTasksPage();
}

function categoryBadge(category) {
    const colors = {
        cooking: 'warning', cleaning: 'info', utensils: 'secondary',
        laundry: 'primary', grocery: 'success', maintenance: 'danger',
        security: 'dark', other: 'light'
    };
    const label = category.charAt(0).toUpperCase() + category.slice(1);
    return `<span class="badge bg-${colors[category] || 'secondary'}">${esc(label)}</span>`;
}

function renderTasks(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;

    if (!tasks.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No tasks here.</td></tr>';
        return;
    }

    const currentUserId = getUserId();
    tbody.innerHTML = tasks.map(task => {
        const mine = String(task.assigned_to) === String(currentUserId);
        const canFlip = iAmTaskManager || mine;
        const flipBtn = task.status === 'pending'
            ? (canFlip ? `<button class="btn btn-sm btn-outline-success me-1" onclick="flipTaskStatus(${task.task_id}, 'done')" title="Mark done"><i class="bi bi-check-lg"></i></button>` : '')
            : (canFlip ? `<button class="btn btn-sm btn-outline-secondary me-1" onclick="flipTaskStatus(${task.task_id}, 'pending')" title="Reopen"><i class="bi bi-arrow-counterclockwise"></i></button>` : '');
        const editBtn = iAmTaskManager
            ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="prepareTaskModal(${task.task_id})" title="Edit"><i class="bi bi-pencil"></i></button>
               <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.task_id})" title="Delete"><i class="bi bi-trash"></i></button>`
            : '';
        return `
            <tr>
                <td>
                    <div class="fw-medium">${esc(task.title)}${mine ? ' <span class="badge bg-light text-dark ms-1">Mine</span>' : ''}</div>
                    <div class="small text-muted">${esc(task.schedule)}${task.due_date ? ' · due ' + esc(task.due_date) : ''}</div>
                </td>
                <td>${categoryBadge(task.category)}</td>
                <td>${task.assigned_to_name ? esc(task.assigned_to_name) : '<span class="text-muted">Unassigned</span>'}</td>
                <td class="small">${task.due_date ? esc(task.due_date) : '—'}</td>
                <td>${task.status === 'done' ? '<span class="badge bg-success">Done</span>' : '<span class="badge bg-warning text-dark">Pending</span>'}</td>
                <td class="text-end">${flipBtn}${editBtn}</td>
            </tr>
        `;
    }).join('');
}

async function prepareTaskModal(taskId = null) {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    const assigneeSelect = document.getElementById('taskAssignee');
    assigneeSelect.innerHTML = '<option value="">Unassigned</option>' + taskMembersCache.map(m =>
        `<option value="${m.user_id}">${esc(m.name)} (${esc(m.role)})</option>`
    ).join('');

    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';

    if (taskId) {
        document.getElementById('taskModalTitle').textContent = 'Edit Task';
        const res = await apiFetch(`/api/tasks?group_id=${groupId}`);
        const task = (res.data || []).find(t => Number(t.task_id) === Number(taskId));
        if (!task) return;
        document.getElementById('taskId').value = task.task_id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskCategory').value = task.category;
        document.getElementById('taskSchedule').value = task.schedule;
        document.getElementById('taskAssignee').value = task.assigned_to || '';
        document.getElementById('taskDueDate').value = task.due_date || '';
        new bootstrap.Modal(document.getElementById('taskModal')).show();
    } else {
        document.getElementById('taskModalTitle').textContent = 'Assign Task';
    }
}

async function saveTask(e) {
    e.preventDefault();
    const groupId = getActiveGroupId();
    if (!groupId) return;

    const taskId = document.getElementById('taskId').value;
    const body = {
        group_id: groupId,
        title: document.getElementById('taskTitle').value,
        category: document.getElementById('taskCategory').value,
        schedule: document.getElementById('taskSchedule').value,
        assigned_to: document.getElementById('taskAssignee').value || null,
        due_date: document.getElementById('taskDueDate').value || null
    };

    try {
        if (taskId) {
            await apiFetch(`/api/tasks/${taskId}`, { method: 'PATCH', body });
        } else {
            await apiFetch('/api/tasks', { method: 'POST', body });
        }
        bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
        loadTasksPage();
    } catch (error) {
        alert(error.message || 'Failed to save task');
    }
}

async function flipTaskStatus(taskId, status) {
    try {
        await apiFetch(`/api/tasks/${taskId}/status`, { method: 'PATCH', body: { status } });
        loadTasksPage();
    } catch (error) {
        alert(error.message || 'Failed to update task');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    try {
        await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        loadTasksPage();
    } catch (error) {
        alert(error.message || 'Failed to delete task');
    }
}
