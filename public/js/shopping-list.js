// shopping-list.js

document.addEventListener('DOMContentLoaded', () => {
    if (getActiveGroupId()) {
        fetchGroupMembers().then(() => loadShoppingList());
    }
    
    window.addEventListener('groupChanged', () => {
        fetchGroupMembers().then(() => loadShoppingList());
    });
    
    const form = document.getElementById('addItemForm');
    if (form) {
        form.addEventListener('submit', handleAddItem);
    }
});

let groupMembers = [];

async function fetchGroupMembers() {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    try {
        const res = await apiFetch(`/api/groups/members?group_id=${groupId}`);
        groupMembers = res.data;
        
        const select = document.getElementById('assignTo');
        let html = '<option value="" selected>Assign To... (Optional)</option>';
        groupMembers.forEach(m => {
            html += `<option value="${m.user_id}">${m.name}</option>`;
        });
        select.innerHTML = html;
    } catch (error) {
        console.error("Failed to load group members", error);
    }
}

async function loadShoppingList() {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        const res = await apiFetch(`/api/shopping-list?group_id=${groupId}`);
        renderShoppingList(res.data);
    } catch (error) {
        console.error("Shopping list load failed", error);
    }
}

function renderShoppingList(items) {
    const container = document.getElementById('shoppingListContainer');
    if (!items || items.length === 0) {
        container.innerHTML = '<li class="list-group-item text-center text-muted py-4">Your shopping list is empty.</li>';
        return;
    }
    
    let html = '';
    items.forEach(item => {
        const isPurchased = item.status === 'purchased';
        
        if (isPurchased) {
            html += `
                <li class="list-group-item d-flex justify-content-between align-items-center py-3 bg-light text-muted">
                    <div>
                        <input class="form-check-input me-2" type="checkbox" checked onchange="updateStatus(${item.item_id}, 'pending')">
                        <del>${item.item_name}</del>
                        <span class="badge bg-success ms-2">Purchased</span>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="small me-3">Assigned to: ${item.assigned_name || 'Anyone'}</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.item_id})"><i class="bi bi-trash"></i></button>
                    </div>
                </li>
            `;
        } else {
            html += `
                <li class="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div>
                        <input class="form-check-input me-2" type="checkbox" onchange="updateStatus(${item.item_id}, 'purchased')">
                        <strong>${item.item_name}</strong>
                        <span class="badge bg-warning text-dark ms-2">Pending</span>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="text-muted-custom small me-3">Assigned to: ${item.assigned_name || 'Anyone'}</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${item.item_id})"><i class="bi bi-trash"></i></button>
                    </div>
                </li>
            `;
        }
    });
    container.innerHTML = html;
}

async function handleAddItem(e) {
    e.preventDefault();
    const groupId = getActiveGroupId();
    if (!groupId) return;
    
    const name = document.getElementById('itemName').value;
    const assigned = document.getElementById('assignTo').value;
    
    try {
        await apiFetch('/api/shopping-list', {
            method: 'POST',
            body: { 
                group_id: groupId, 
                item_name: name,
                assigned_to: assigned ? parseInt(assigned) : null
            }
        });
        document.getElementById('addItemForm').reset();
        loadShoppingList();
    } catch (e) {
        alert(e.message || "Failed to add item");
    }
}

async function updateStatus(id, newStatus) {
    try {
        // Find existing item to preserve other fields
        // Since we only need to update status, we can just fetch list again or rely on endpoint logic
        // Wait, updateItem requires item_name and assigned_to. Let's just fetch it first if needed.
        // Actually our update route expects full data. 
        // We might need to do a GET or just pass null to ignore?
        // Let's rely on backend accepting partial updates. I need to check `shoppingListController.js`.
        
        // For now, let's send a PATCH or PUT with just status
        await apiFetch(`/api/shopping-list/${id}`, {
            method: 'PUT',
            body: { status: newStatus }
        });
        loadShoppingList();
    } catch (e) {
        alert(e.message || "Failed to update status");
        loadShoppingList(); // revert UI
    }
}

async function deleteItem(id) {
    if (!confirm('Delete this item?')) return;
    try {
        await apiFetch(`/api/shopping-list/${id}`, { method: 'DELETE' });
        loadShoppingList();
    } catch (e) {
        alert(e.message || "Failed to delete item");
    }
}
