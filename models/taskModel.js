const prisma = require('../config/prisma');
const { number, dateOnly, timestamp } = require('../utils/prismaFormat');

function taskRow(task) {
    return task && {
        task_id: task.taskId,
        group_id: task.groupId,
        title: task.title,
        category: task.category,
        assigned_to: task.assignedToId,
        assigned_to_name: task.assignedTo ? task.assignedTo.name : null,
        assigned_by: task.assignedById,
        assigned_by_name: task.assignedBy ? task.assignedBy.name : null,
        schedule: task.schedule,
        due_date: task.dueDate ? dateOnly(task.dueDate) : null,
        status: task.status,
        created_at: timestamp(task.createdAt),
        completed_at: task.completedAt ? timestamp(task.completedAt) : null
    };
}

const includePeople = { assignedTo: true, assignedBy: true };

const TaskModel = {
    async getTasksByGroup(groupId, filters = {}) {
        const where = { groupId: Number(groupId) };
        if (filters.status) where.status = filters.status;
        if (filters.assignedTo !== undefined && filters.assignedTo !== null && filters.assignedTo !== '') {
            where.assignedToId = Number(filters.assignedTo);
        }
        const tasks = await prisma.task.findMany({
            where,
            include: includePeople,
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
        });
        return tasks.map(taskRow);
    },

    async getTaskById(taskId) {
        const task = await prisma.task.findUnique({ where: { taskId: Number(taskId) }, include: includePeople });
        return taskRow(task);
    },

    async getTaskCounts(groupId) {
        const [pending, done] = await Promise.all([
            prisma.task.count({ where: { groupId: Number(groupId), status: 'pending' } }),
            prisma.task.count({ where: { groupId: Number(groupId), status: 'done' } })
        ]);
        return { pending, done };
    },

    async createTask({ groupId, title, category, assignedToId, assignedById, schedule, dueDate }) {
        const task = await prisma.task.create({
            data: {
                groupId: Number(groupId),
                title,
                category,
                assignedToId: assignedToId ? Number(assignedToId) : null,
                assignedById: Number(assignedById),
                schedule,
                dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null,
                status: 'pending'
            },
            include: includePeople
        });
        return taskRow(task);
    },

    async updateTask(taskId, { title, category, assignedToId, schedule, dueDate }) {
        const task = await prisma.task.update({
            where: { taskId: Number(taskId) },
            data: {
                title,
                category,
                assignedToId: assignedToId ? Number(assignedToId) : null,
                schedule,
                dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null
            },
            include: includePeople
        });
        return taskRow(task);
    },

    async updateStatus(taskId, status) {
        const task = await prisma.task.update({
            where: { taskId: Number(taskId) },
            data: {
                status,
                completedAt: status === 'done' ? new Date() : null
            },
            include: includePeople
        });
        return taskRow(task);
    },

    async deleteTask(taskId) {
        await prisma.task.delete({ where: { taskId: Number(taskId) } });
    }
};

module.exports = TaskModel;
