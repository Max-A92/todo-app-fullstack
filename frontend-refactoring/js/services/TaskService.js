// ===== TASK MANAGEMENT SERVICE =====
import { ApiService } from './ApiService.js';
import { TokenManager } from '../utils/TokenManager.js';

export const TaskService = {
    /**
     * Alle Tasks laden
     */
    async getTasks() {
        if (!TokenManager.isValid()) {
            console.log('🚫 No valid token - returning empty tasks');
            return [];
        }
        
        console.log('📚 Loading tasks...');
        const tasks = await ApiService.get('/tasks');
        console.log('✅ Tasks loaded:', tasks.length);
        return tasks;
    },

    /**
     * Neue Task erstellen
     */
    async createTask(taskData) {
        console.log('📝 Creating task:', taskData);
        
        const response = await ApiService.post('/tasks', taskData);
        console.log('✅ Task created:', response);
        return response;
    },

    /**
     * Task-Status umschalten (erledigt/offen)
     */
    async toggleTask(taskId) {
        console.log('🔄 Toggling task:', taskId);
        
        const response = await ApiService.put(`/tasks/${taskId}`, {});
        console.log('✅ Task toggled:', response);
        return response;
    },

    /**
     * Task-Datum aktualisieren
     */
    async updateTaskDate(taskId, newDate) {
        console.log('📅 Updating task date:', taskId, newDate);
        
        try {
            // Primäre Methode mit action
            const response = await ApiService.put(`/tasks/${taskId}`, {
                action: 'updateDate',
                dueDate: newDate || null
            });
            console.log('✅ Task date updated:', response);
            return response;
        } catch (error) {
            console.log('⚠️ Primary method failed, trying fallback...');
            
            // Fallback ohne action
            const response = await ApiService.put(`/tasks/${taskId}`, {
                dueDate: newDate || null
            });
            console.log('✅ Task date updated (fallback):', response);
            return response;
        }
    },

    /**
     * Task löschen
     */
    async deleteTask(taskId) {
        console.log('🗑️ Deleting task:', taskId);
        
        const response = await ApiService.delete(`/tasks/${taskId}`);
        console.log('✅ Task deleted:', response);
        return response;
    },

    /**
     * Alle erledigten Tasks löschen
     */
    async deleteCompletedTasks() {
        console.log('🧹 Deleting all completed tasks...');
        
        const response = await ApiService.delete('/tasks?status=completed');
        console.log('✅ Completed tasks deleted:', response);
        return response;
    },

    /**
     * Tasks nach Filter filtern
     */
    filterTasks(tasks, filter, calendarUtils) {
        if (filter === 'all') return tasks;
        
        return tasks.filter(task => calendarUtils.shouldShowTask(task, filter));
    },

    /**
     * Task-Statistiken berechnen
     */
    calculateStats(tasks, projectCount = 0) {
        const total = tasks.length;
        const completed = tasks.filter(task => task.status === 'erledigt').length;
        const open = total - completed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
            total,
            completed,
            open,
            percentage,
            projectCount
        };
    }
};

console.log('✅ TaskService loaded');