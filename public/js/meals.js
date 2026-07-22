// meals.js - Meals Logic

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('groupReady', loadMealsData);
    window.addEventListener('groupChanged', loadMealsData);

    if (getActiveGroupId()) {
        loadMealsData();
    }
    
    // Wire up save menu form
    const saveMenuBtn = document.getElementById('saveMenuBtn');
    if (saveMenuBtn) {
        saveMenuBtn.addEventListener('click', saveMenu);
    }

    // Wire up save preferences form
    const mealPreferenceForm = document.getElementById('mealPreferenceForm');
    if (mealPreferenceForm) {
        mealPreferenceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveMealPreferences();
        });
    }

    // Wire up toggles to enable/disable details
    document.getElementById('lunchToggle')?.addEventListener('change', (e) => {
        document.getElementById('lunchDetails').style.opacity = e.target.checked ? '1' : '0.5';
        document.getElementById('lunchDiet').disabled = !e.target.checked;
        document.getElementById('lunchGuests').disabled = !e.target.checked;
    });
    
    document.getElementById('dinnerToggle')?.addEventListener('change', (e) => {
        document.getElementById('dinnerDetails').style.opacity = e.target.checked ? '1' : '0.5';
        document.getElementById('dinnerDiet').disabled = !e.target.checked;
        document.getElementById('dinnerGuests').disabled = !e.target.checked;
    });
});

async function loadMealsData() {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        const dateStr = new Date().toISOString().split('T')[0];
        
        // 1. Fetch Today's Menu
        const menuRes = await apiFetch(`/api/meals/menu?group_id=${groupId}&date=${dateStr}`);
        renderMenu(menuRes.data);

        // 2. Fetch Group Meals/Headcount for today
        const mealsRes = await apiFetch(`/api/meals?group_id=${groupId}&date=${dateStr}`);
        renderHeadcount(mealsRes.data);
        
        // 3. Pre-fill user's own meal preferences in the form
        const currentUserId = getUserId();
        if (currentUserId && mealsRes.data) {
            prefillUserPreferences(mealsRes.data, currentUserId);
        }
        
    } catch (error) {
        console.error("Meals data load failed", error);
    }
}

function renderMenu(menus) {
    const lunchItems = document.getElementById('lunchMenuItems');
    const dinnerItems = document.getElementById('dinnerMenuItems');
    
    if (lunchItems) lunchItems.innerHTML = '<span class="text-muted small">No menu updated yet</span>';
    if (dinnerItems) dinnerItems.innerHTML = '<span class="text-muted small">No menu updated yet</span>';

    if (!menus || menus.length === 0) return;

    menus.forEach(menu => {
        let html = '';
        if (menu.veg_item) {
            html += `
            <div class="d-flex align-items-center mb-1">
                <span class="badge bg-success me-2" style="font-size: 0.65em;">Veg</span>
                <span class="fw-medium small">${menu.veg_item}</span>
            </div>`;
        }
        if (menu.nonveg_item) {
            html += `
            <div class="d-flex align-items-center mb-1">
                <span class="badge bg-danger me-2" style="font-size: 0.65em;">Non-Veg</span>
                <span class="fw-medium small">${menu.nonveg_item}</span>
            </div>`;
        }
        
        if (menu.meal_type === 'lunch' && lunchItems) {
            lunchItems.innerHTML = html;
        } else if (menu.meal_type === 'dinner' && dinnerItems) {
            dinnerItems.innerHTML = html;
        }
    });
}

function renderHeadcount(meals) {
    const tbody = document.getElementById('headcountTableBody');
    const tfoot = document.getElementById('headcountTableFoot');
    if (!tbody || !tfoot) return;

    if (!meals || meals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-muted py-3">No meal preferences logged yet.</td></tr>';
        tfoot.innerHTML = '';
        return;
    }

    // Group meals by user
    const usersMap = {};
    meals.forEach(m => {
        if (!usersMap[m.user_id]) {
            usersMap[m.user_id] = { name: m.name, lunch: null, dinner: null };
        }
        usersMap[m.user_id][m.meal_type] = m;
    });

    let html = '';
    
    const stats = {
        lunch: { total: 0, veg: 0, nonVeg: 0, egg: 0, guests: 0 },
        dinner: { total: 0, veg: 0, nonVeg: 0, egg: 0, guests: 0 }
    };

    const currentUserId = getUserId();

    Object.values(usersMap).forEach(user => {
        // Calculate cell contents for Lunch
        let lunchCell = '<i class="bi bi-x-circle-fill text-danger fs-5"></i>';
        if (user.lunch && user.lunch.is_attending) {
            lunchCell = `<i class="bi bi-check-circle-fill text-success fs-5"></i>`;
            if (user.lunch.guest_count > 0) {
                lunchCell += `<br><small class="text-muted">+${user.lunch.guest_count} guests</small>`;
            }
            stats.lunch.total += (1 + user.lunch.guest_count);
            stats.lunch.guests += user.lunch.guest_count;
            if (user.lunch.diet_preference === 'veg') stats.lunch.veg += (1 + user.lunch.guest_count);
            else if (user.lunch.diet_preference === 'non-veg') stats.lunch.nonVeg += (1 + user.lunch.guest_count);
            else if (user.lunch.diet_preference === 'egg') stats.lunch.egg += (1 + user.lunch.guest_count);
        }

        // Calculate cell contents for Dinner
        let dinnerCell = '<i class="bi bi-x-circle-fill text-danger fs-5"></i>';
        if (user.dinner && user.dinner.is_attending) {
            dinnerCell = `<i class="bi bi-check-circle-fill text-success fs-5"></i>`;
            if (user.dinner.guest_count > 0) {
                dinnerCell += `<br><small class="text-muted">+${user.dinner.guest_count} guests</small>`;
            }
            stats.dinner.total += (1 + user.dinner.guest_count);
            stats.dinner.guests += user.dinner.guest_count;
            if (user.dinner.diet_preference === 'veg') stats.dinner.veg += (1 + user.dinner.guest_count);
            else if (user.dinner.diet_preference === 'non-veg') stats.dinner.nonVeg += (1 + user.dinner.guest_count);
            else if (user.dinner.diet_preference === 'egg') stats.dinner.egg += (1 + user.dinner.guest_count);
        }

        // Overall Diet Preference Badge based on Dinner (or Lunch if Dinner null)
        const activeMeal = (user.dinner && user.dinner.is_attending) ? user.dinner : ((user.lunch && user.lunch.is_attending) ? user.lunch : null);
        let dietBadge = '';
        if (activeMeal) {
            if (activeMeal.diet_preference === 'veg') dietBadge = '<span class="badge bg-success small">Veg</span>';
            else if (activeMeal.diet_preference === 'non-veg') dietBadge = '<span class="badge bg-danger small">Non-Veg</span>';
            else if (activeMeal.diet_preference === 'egg') dietBadge = '<span class="badge bg-warning text-dark small">Egg</span>';
        }

        html += `
            <tr>
                <td class="text-start ps-4">
                    ${user.name} ${currentUserId == user.lunch?.user_id ? '(You)' : ''} <br>${dietBadge}
                </td>
                <td>${lunchCell}</td>
                <td>${dinnerCell}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Render footer stats
    tfoot.innerHTML = `
        <tr>
            <th class="text-start ps-4">Total Eaters</th>
            <th>${stats.lunch.total}</th>
            <th>${stats.dinner.total}</th>
        </tr>
        <tr>
            <th class="text-start ps-4 text-muted small border-0 py-1"><span class="badge bg-success me-2" style="font-size: 0.6em;">Veg</span> Eaters</th>
            <th class="text-muted small border-0 py-1">${stats.lunch.veg}</th>
            <th class="text-muted small border-0 py-1">${stats.dinner.veg}</th>
        </tr>
        <tr>
            <th class="text-start ps-4 text-muted small border-0 py-1"><span class="badge bg-danger me-2" style="font-size: 0.6em;">Non-Veg</span> Eaters</th>
            <th class="text-muted small border-0 py-1">${stats.lunch.nonVeg}</th>
            <th class="text-muted small border-0 py-1">${stats.dinner.nonVeg}</th>
        </tr>
        <tr>
            <th class="text-start ps-4 text-muted small py-1"><span class="badge bg-warning text-dark me-2" style="font-size: 0.6em;">Egg</span> Eaters</th>
            <th class="text-muted small py-1">${stats.lunch.egg}</th>
            <th class="text-muted small py-1">${stats.dinner.egg}</th>
        </tr>
        <tr class="table-secondary">
            <th class="text-start ps-4 text-muted small">Total Guests</th>
            <th class="text-muted small">${stats.lunch.guests}</th>
            <th class="text-muted small">${stats.dinner.guests}</th>
        </tr>
    `;
}

function prefillUserPreferences(meals, userId) {
    const lunchToggle = document.getElementById('lunchToggle');
    const lunchDiet = document.getElementById('lunchDiet');
    const lunchGuests = document.getElementById('lunchGuests');
    
    const dinnerToggle = document.getElementById('dinnerToggle');
    const dinnerDiet = document.getElementById('dinnerDiet');
    const dinnerGuests = document.getElementById('dinnerGuests');

    // Default state: not attending
    if (lunchToggle) lunchToggle.checked = false;
    if (dinnerToggle) dinnerToggle.checked = false;
    
    meals.forEach(m => {
        if (m.user_id == userId) {
            if (m.meal_type === 'lunch') {
                if (lunchToggle) lunchToggle.checked = m.is_attending === 1;
                if (lunchDiet) lunchDiet.value = m.diet_preference || 'veg';
                if (lunchGuests) lunchGuests.value = m.guest_count || 0;
            } else if (m.meal_type === 'dinner') {
                if (dinnerToggle) dinnerToggle.checked = m.is_attending === 1;
                if (dinnerDiet) dinnerDiet.value = m.diet_preference || 'veg';
                if (dinnerGuests) dinnerGuests.value = m.guest_count || 0;
            }
        }
    });
    
    // Trigger change events to update opacity
    lunchToggle?.dispatchEvent(new Event('change'));
    dinnerToggle?.dispatchEvent(new Event('change'));
}

async function saveMealPreferences() {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    
    const dateStr = new Date().toISOString().split('T')[0];
    const btn = document.getElementById('savePreferencesBtn');
    if (btn) btn.disabled = true;

    try {
        // Prepare Lunch payload
        const lunchAttending = document.getElementById('lunchToggle').checked;
        const lunchDiet = document.getElementById('lunchDiet').value;
        const lunchGuests = parseInt(document.getElementById('lunchGuests').value) || 0;

        await apiFetch('/api/meals', {
            method: 'POST',
            body: {
                group_id: groupId,
                meal_date: dateStr,
                meal_type: 'lunch',
                is_attending: lunchAttending ? 1 : 0,
                diet_preference: lunchDiet,
                guest_count: lunchGuests
            }
        });

        // Prepare Dinner payload
        const dinnerAttending = document.getElementById('dinnerToggle').checked;
        const dinnerDiet = document.getElementById('dinnerDiet').value;
        const dinnerGuests = parseInt(document.getElementById('dinnerGuests').value) || 0;

        await apiFetch('/api/meals', {
            method: 'POST',
            body: {
                group_id: groupId,
                meal_date: dateStr,
                meal_type: 'dinner',
                is_attending: dinnerAttending ? 1 : 0,
                diet_preference: dinnerDiet,
                guest_count: dinnerGuests
            }
        });

        // Reload data to reflect changes
        await loadMealsData();
        
    } catch (error) {
        console.error("Failed to save meal preferences", error);
        alert(error.message || "Failed to save preferences. It might be past the cutoff time.");
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function saveMenu() {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    
    const isLunch = document.getElementById('lunchMenuBtn').classList.contains('active');
    const mealType = isLunch ? 'lunch' : 'dinner';
    const vegOption = document.getElementById('vegOption').value;
    const nonVegOption = document.getElementById('nonVegOption').value;
    
    try {
        await apiFetch('/api/meals/menu', {
            method: 'POST',
            body: {
                group_id: groupId,
                date: new Date().toISOString().split('T')[0],
                type: mealType,
                veg_item: vegOption,
                nonveg_item: nonVegOption
            }
        });
        
        // Hide modal
        const modalEl = document.getElementById('editMenuModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        // Reload data
        loadMealsData();
        
    } catch (error) {
        console.error("Failed to save menu", error);
        alert(error.message || "Failed to save menu");
    }
}
