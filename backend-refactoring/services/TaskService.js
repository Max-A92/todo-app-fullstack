// ===== TASK SERVICE =====
console.log('📝 TaskService loading...');

const TaskService = {
    
    // Alle Tasks für User abrufen (🔒 SECURITY-FIXED)
    getAllTasks: async function(user) {
        console.log('📚 TaskService: Lade Tasks für User:', user?.username || 'Anonymous');
        
        let tasks;
        
        if (!global.databaseAvailable) {
            // Demo-Daten mit Kalender-Beispielen und Projekten
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            
            tasks = [
                { id: 1, text: 'Demo-Aufgabe 1', status: 'offen', dueDate: today, project_name: 'Allgemein' },
                { id: 2, text: 'Demo-Aufgabe 2', status: 'erledigt', dueDate: tomorrow, project_name: 'Privat' },
                { id: 3, text: 'Database startet noch...', status: 'offen', dueDate: null, project_name: 'System' }
            ];
        } else if (user) {
            // Authentifizierter User - lade nur seine Tasks ✅ (MIT PROJEKT-INFO)
            const Database = require('../models/database');
            tasks = await Database.getAllTasksForUser(user.id);
            
            const SecurityConfig = require('../config/security');
            if (SecurityConfig.nodeEnv === 'development') {
                console.log("👤 TaskService: Tasks mit Projekten geladen für User:", user.username);
            }
        } else {
            // ✅ SECURITY-FIX: Keine Tasks für unauthentifizierte Requests
            tasks = [];
            console.log('⚠️ TaskService: Unauthentifizierter Request - leere Liste zurückgegeben');
        }
        
        return tasks;
    },
    
    // Task erstellen
    createTask: async function(user, taskData) {
        console.log('🆕 TaskService: Erstelle Task für User:', user?.username || 'Demo');
        
        const { text, dueDate, project_id } = taskData;
        
        console.log('📅📁 TaskService DEBUG: Text:', text, 'DueDate:', dueDate, 'ProjectId:', project_id);
        
        const Database = require('../models/database');
        let newTask;
        
        if (user) {
            // Authentifizierter User - MIT KALENDER-UNTERSTÜTZUNG + PROJEKTE
            newTask = await Database.createTaskForUser(
                user.id, 
                text, 
                dueDate,     // ← KALENDER-Support
                project_id   // ← PROJEKT-Support
            );
            console.log('👤 TaskService: Task erstellt für User:', user.username, 'mit Datum:', dueDate, 'Projekt:', project_id);
        } else {
            // Legacy-Modus für Demo-User
            newTask = await Database.createTask(text, dueDate, project_id);
        }
        
        console.log('✅ TaskService DEBUG: Task created successfully:', newTask);
        return newTask;
    },
    
    // Task Status ändern
    toggleTaskStatus: async function(user, taskId) {
        console.log('🔄 TaskService: Ändere Status für Task:', taskId, 'User:', user?.username || 'Demo');
        
        const Database = require('../models/database');
        
        if (user) {
            // Authentifizierter User - nur eigene Tasks
            return await Database.toggleTaskStatusForUser(taskId, user.id);
        } else {
            // Legacy-Modus für Demo-User
            return await Database.toggleTaskStatus(taskId);
        }
    },
    
    // Task-Datum aktualisieren
    updateTaskDate: async function(user, taskId, dueDate) {
        console.log('📅 TaskService: Aktualisiere Datum für Task:', taskId, 'User:', user?.username || 'Demo', 'NewDate:', dueDate);
        
        const Database = require('../models/database');
        
        if (user) {
            // Authentifizierter User - nur eigene Tasks
            return await Database.updateTaskDateForUser(taskId, user.id, dueDate);
        } else {
            // Legacy-Modus für Demo-User
            return await Database.updateTaskDate(taskId, dueDate);
        }
    },
    
    // Task-Projekt ändern
    updateTaskProject: async function(user, taskId, projectId) {
        console.log('📁 TaskService: Aktualisiere Projekt für Task:', taskId, 'User:', user?.username || 'Demo', 'NewProjectId:', projectId);
        
        const Database = require('../models/database');
        
        if (user) {
            // Authentifizierter User - nur eigene Tasks
            return await Database.updateTaskProjectForUser(taskId, user.id, projectId);
        } else {
            throw new Error('Projekt-Update nur für authentifizierte User verfügbar');
        }
    },
    
    // Task Text bearbeiten
    updateTaskText: async function(user, taskId, newText) {
        console.log('✏️ TaskService: Aktualisiere Text für Task:', taskId, 'User:', user?.username || 'Demo');
        
        const Database = require('../models/database');
        
        if (user) {
            // Authentifizierter User - nur eigene Tasks
            return await Database.updateTaskTextForUser(taskId, user.id, newText);
        } else {
            // Legacy-Modus für Demo-User
            return await Database.updateTaskText(taskId, newText);
        }
    },
    
    // Task löschen MIT AUTO-DELETE
    deleteTask: async function(user, taskId) {
        console.log('🗑️ TaskService: Lösche Task:', taskId, 'User:', user?.username || 'Demo');
        
        const Database = require('../models/database');
        
        if (user) {
            // Authentifizierter User - nur eigene Tasks (MIT AUTO-DELETE)
            return await Database.deleteTaskForUser(taskId, user.id);
        } else {
            // Legacy-Modus für Demo-User (MIT AUTO-DELETE)
            return await Database.deleteTask(taskId);
        }
    },
    
    // Alle erledigten Tasks löschen
    deleteCompletedTasks: async function(user) {
        console.log('🧹 TaskService: Lösche alle erledigten Tasks für User:', user?.username || 'Demo');
        
        const Database = require('../models/database');
        
        if (user) {
            // Authentifizierter User - nur eigene Tasks
            return await Database.deleteCompletedTasksForUser(user.id);
        } else {
            // Legacy-Modus für Demo-User
            return await Database.deleteCompletedTasks();
        }
    }
};

console.log('✅ TaskService loaded');

module.exports = TaskService;