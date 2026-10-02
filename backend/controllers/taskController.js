const TaskModel = require('../models/taskModel');
const GroupModel = require('../models/groupModel');
const ActivityLogModel = require('../models/activityLogModel');
const { canManage } = require('../utils/roles');
const { isValidDate } = require('../utils/validation');

// Household task categories seen across Indian PGs and shared flats:
// cooking (daily mess), cleaning (rooms, bathrooms), utensils (dishes),
// laundry (washing, ironing), grocery (market runs), maintenance (repairs),
// security (watchman rounds), other.
const TASK_CATEGORIES = ['cooking', 'cleaning', 'utensils', 'laundry', 'grocery', 'maintenance', 'security', 'other'];
const TASK_SCHEDULES = ['once', 'daily', 'weekly'];
const TASK_STATUSES = ['pending', 'done'];

function validateTaskInput(input, existing = null) {
    existing = existing || {};
    const title = String(input.title === undefined ? existing.title : input.title || '').trim();
    const category = input.category === undefined ? (existing.category || 'other') : String(input.category);
    const schedule = input.schedule === undefined ? (existing.schedule || 'once') : String(input.schedule);
    const dueDate = input.due_date === undefined
        ? (existing.due_date ? String(existing.due_date).slice(0, 10) : null)
        : (input.due_date || null);

    if (!title || title.length > 200) throw new Error('Task title is required (max 200 characters)');
    if (!TASK_CATEGORIES.includes(category)) throw new Error('Invalid task category');
    if (!TASK_SCHEDULES.includes(schedule)) throw new Error('Invalid task schedule');
    if (dueDate !== null && !isValidDate(dueDate)) throw new Error('Invalid due date');
    return { title, category, schedule, dueDate };
}

const taskController = {
    async getTasks(req, res) {
        try {
            const { group_id, status, assigned_to } = req.query;
            if (!group_id) return res.status(400).json({ success: false, message: 'group_id is required' });
            if (!await GroupModel.isMember(group_id, req.session.userId)) {
                return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            }
            if (status !== undefined && !TASK_STATUSES.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status filter' });
            }
            const assignee = assigned_to === 'me' ? req.session.userId : assigned_to;
            if (assignee !== undefined && assignee !== null && assignee !== '') {
                if (!await GroupModel.isMember(group_id, assignee)) {
                    return res.status(400).json({ success: false, message: 'MEMBER_NOT_FOUND' });
                }
            }
            const tasks = await TaskModel.getTasksByGroup(group_id, { status, assignedTo: assignee });
            res.json({ success: true, data: tasks });
        } catch (error) {
            console.error('Get tasks error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async addTask(req, res) {
        try {
            const { group_id, assigned_to } = req.body;
            if (!group_id) return res.status(400).json({ success: false, message: 'group_id is required' });
            const membership = await GroupModel.isMember(group_id, req.session.userId);
            if (!membership) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            if (!canManage(membership.role)) return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            if (assigned_to !== undefined && assigned_to !== null && assigned_to !== '') {
                if (!await GroupModel.isMember(group_id, assigned_to)) {
                    return res.status(400).json({ success: false, message: 'MEMBER_NOT_FOUND' });
                }
            }
            const data = validateTaskInput(req.body);
            const task = await TaskModel.createTask({
                groupId: group_id,
                assignedById: req.session.userId,
                assignedToId: assigned_to || null,
                ...data
            });
            await ActivityLogModel.create(Number(group_id), req.session.userId, 'ADD_TASK', `Assigned task "${data.title}"`);
            res.status(201).json({ success: true, data: task });
        } catch (error) {
            if (error.message !== 'Server error') return res.status(400).json({ success: false, message: error.message });
            console.error('Add task error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateTask(req, res) {
        try {
            const task = await TaskModel.getTaskById(req.params.id);
            if (!task) return res.status(404).json({ success: false, message: 'TASK_NOT_FOUND' });
            const membership = await GroupModel.isMember(task.group_id, req.session.userId);
            if (!membership) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            if (!canManage(membership.role)) return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            const { assigned_to } = req.body;
            if (assigned_to !== undefined && assigned_to !== null && assigned_to !== '') {
                if (!await GroupModel.isMember(task.group_id, assigned_to)) {
                    return res.status(400).json({ success: false, message: 'MEMBER_NOT_FOUND' });
                }
            }
            const data = validateTaskInput(req.body, task);
            const updated = await TaskModel.updateTask(task.task_id, { ...data, assignedToId: assigned_to === undefined ? task.assigned_to : (assigned_to || null) });
            res.json({ success: true, data: updated });
        } catch (error) {
            if (error.message !== 'Server error') return res.status(400).json({ success: false, message: error.message });
            console.error('Update task error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async updateStatus(req, res) {
        try {
            const task = await TaskModel.getTaskById(req.params.id);
            if (!task) return res.status(404).json({ success: false, message: 'TASK_NOT_FOUND' });
            const membership = await GroupModel.isMember(task.group_id, req.session.userId);
            if (!membership) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            const status = String(req.body.status || '').toLowerCase();
            if (!TASK_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
            // Managers can flip any task; everyone else only their own assignment.
            const isAssignee = Number(task.assigned_to) === Number(req.session.userId);
            if (!canManage(membership.role) && !isAssignee) {
                return res.status(403).json({ success: false, message: 'Only the assignee can update this task' });
            }
            const updated = await TaskModel.updateStatus(task.task_id, status);
            res.json({ success: true, data: updated });
        } catch (error) {
            console.error('Update task status error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    async deleteTask(req, res) {
        try {
            const task = await TaskModel.getTaskById(req.params.id);
            if (!task) return res.status(404).json({ success: false, message: 'TASK_NOT_FOUND' });
            const membership = await GroupModel.isMember(task.group_id, req.session.userId);
            if (!membership) return res.status(403).json({ success: false, message: 'NOT_A_MEMBER' });
            if (!canManage(membership.role)) return res.status(403).json({ success: false, message: 'NOT_ADMIN' });
            await TaskModel.deleteTask(task.task_id);
            res.json({ success: true, message: 'Task deleted' });
        } catch (error) {
            console.error('Delete task error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = { taskController, validateTaskInput, TASK_CATEGORIES, TASK_SCHEDULES, TASK_STATUSES };
