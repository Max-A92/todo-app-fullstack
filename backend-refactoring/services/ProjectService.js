// ===== PROJECT SERVICE =====
console.log('📁 ProjectService loading...');

const ProjectService = {
    
    // Alle Projekte für User abrufen
    getAllProjects: async function(user) {
        console.log('📁 ProjectService: Lade Projekte für User:', user.username);
        
        const Database = require('../models/database');
        const projects = await Database.getAllProjectsForUser(user.id);
        
        const SecurityConfig = require('../config/security');
        if (SecurityConfig.nodeEnv === 'development') {
            console.log("📁 ProjectService: Projekte geladen:", projects.length);
        }
        
        return projects;
    },
    
    // Neues Projekt erstellen
    createProject: async function(user, name) {
        console.log('🆕 ProjectService: Erstelle Projekt für User:', user.username, 'Name:', name);
        
        const Database = require('../models/database');
        const newProject = await Database.createProjectForUser(user.id, name);
        
        console.log('✅ ProjectService: Projekt erstellt - ID:', newProject.id, 'Name:', name);
        return newProject;
    },
    
    // Projekt löschen
    deleteProject: async function(user, projectId) {
        console.log('🗑️ ProjectService: Lösche Projekt:', projectId, 'User:', user.username);
        
        const Database = require('../models/database');
        const deletedProject = await Database.deleteProjectForUser(projectId, user.id);
        
        console.log('✅ ProjectService: Projekt gelöscht');
        return deletedProject;
    }
};

console.log('✅ ProjectService loaded');

module.exports = ProjectService;