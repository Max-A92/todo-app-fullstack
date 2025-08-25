// ===== PROJECT MANAGEMENT SERVICE =====
import { ApiService } from './ApiService.js';
import { TokenManager } from '../utils/TokenManager.js';

export const ProjectService = {
    /**
     * Alle Projekte laden
     */
    async getProjects() {
        if (!TokenManager.isValid()) {
            console.log('🚫 No valid token - returning empty projects');
            return [];
        }
        
        console.log('📁 Loading projects...');
        const projects = await ApiService.get('/projects');
        console.log('✅ Projects loaded:', projects.length);
        return projects;
    },

    /**
     * Neues Projekt erstellen
     */
    async createProject(name) {
        if (!name || name.trim() === '') {
            throw new Error('Projektname ist erforderlich');
        }
        
        console.log('📁 Creating project:', name);
        
        const response = await ApiService.post('/projects', { 
            name: name.trim() 
        });
        
        console.log('✅ Project created:', response);
        return response;
    },

    /**
     * Projekt löschen
     */
    async deleteProject(projectId) {
        console.log('🗑️ Deleting project:', projectId);
        
        const response = await ApiService.delete(`/projects/${projectId}`);
        console.log('✅ Project deleted:', response);
        return response;
    },

    /**
     * Tasks nach Projekten gruppieren
     */
    groupTasksByProject(tasks, projects = []) {
        const tasksByProject = {};
        
        tasks.forEach(task => {
            const projectName = task.project_name || 'Kein Projekt';
            if (!tasksByProject[projectName]) {
                tasksByProject[projectName] = [];
            }
            tasksByProject[projectName].push(task);
        });
        
        return tasksByProject;
    },

    /**
     * Projekt-Statistiken berechnen
     */
    calculateProjectStats(tasks, projectName) {
        const projectTasks = tasks.filter(task => 
            (task.project_name || 'Kein Projekt') === projectName
        );
        
        const total = projectTasks.length;
        const completed = projectTasks.filter(task => task.status === 'erledigt').length;
        
        return {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }
};

console.log('✅ ProjectService loaded');