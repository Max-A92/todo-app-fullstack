// ===== PROJECT ROUTES =====
const express = require('express');
const router = express.Router();

// Import Middleware
const { tasksLimit } = require('../middleware/rateLimiting');
const { authenticateToken } = require('../middleware/auth');
const { validateProjectCreation, isValidProjectId } = require('../middleware/validation');

// Import Services
const ProjectService = require('../services/ProjectService');

console.log('📁 Project Routes loading...');

// ===== PROJECT ROUTE HANDLERS =====

// GET /projects - Alle Projekte für eingeloggten User abrufen
router.get('/', authenticateToken, async function (req, res) {
    if (!global.databaseAvailable) {
        return res.status(503).json({
            error: 'Service nicht verfügbar',
            message: 'Datenbank nicht verfügbar.'
        });
    }
    
    try {
        const projects = await ProjectService.getAllProjects(req.user);
        console.log("📁 Lade Projekte für User:", req.user.username);
        res.json(projects);
    } catch (error) {
        console.error('🚨 Fehler beim Laden der Projekte:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der Projekte',
            message: 'Ein interner Fehler ist aufgetreten'
        });
    }
});

// POST /projects - Neues Projekt für User erstellen
router.post('/', 
    tasksLimit, 
    authenticateToken, 
    validateProjectCreation,
    async function (req, res) {
        if (!global.databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
            const { name } = req.body;
            
            const newProject = await ProjectService.createProject(req.user, name.trim());
            console.log('📁 Projekt erstellt für User:', req.user.username, 'Projekt:', name);
            
            res.status(201).json(newProject);
        } catch (error) {
            console.error('🚨 Fehler beim Erstellen des Projekts:', error);
            res.status(500).json({
                error: 'Fehler beim Erstellen des Projekts',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    }
);

// DELETE /projects/:id - Projekt löschen (nur eigene)
router.delete('/:id', 
    tasksLimit, 
    authenticateToken, 
    async function (req, res) {
        if (!global.databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
            const projectId = req.params.id;
            
            if (!isValidProjectId(projectId)) {
                return res.status(400).json({
                    error: 'Ungültige Projekt-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            const deletedProject = await ProjectService.deleteProject(req.user, Number(projectId));
            
            res.json({
                message: 'Projekt erfolgreich gelöscht',
                project: deletedProject
            });
            
        } catch (error) {
            console.error('🚨 Fehler beim Löschen des Projekts:', error);
            
            if (error.message.includes('nicht gefunden') || error.message.includes('gehört nicht')) {
                res.status(404).json({
                    error: 'Projekt nicht gefunden',
                    message: 'Projekt nicht gefunden oder gehört nicht dir'
                });
            } else if (error.message.includes('letzte Projekt')) {
                res.status(400).json({
                    error: 'Letztes Projekt',
                    message: 'Das letzte Projekt kann nicht gelöscht werden'
                });
            } else {
                res.status(500).json({
                    error: 'Fehler beim Löschen des Projekts',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    }
);

console.log('✅ Project Routes loaded');

module.exports = router;