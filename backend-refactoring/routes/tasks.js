// ===== TASK ROUTES =====
const express = require('express');
const router = express.Router();

// Import Middleware
const { tasksLimit } = require('../middleware/rateLimiting');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateTaskCreation, isValidTaskId, isValidDate, isValidProjectId, isValidTaskText } = require('../middleware/validation');

// Import Services
const TaskService = require('../services/TaskService');

console.log('📝 Task Routes loading...');

// ===== TASK ROUTE HANDLERS =====

// GET /tasks - Tasks für eingeloggten User abrufen (🔒 SECURITY-FIXED + KALENDER + PROJEKTE)
router.get('/', optionalAuth, async function (req, res) {
    try {
        const tasks = await TaskService.getAllTasks(req.user);
        res.json(tasks);
    } catch (error) {
        console.error('🚨 Fehler beim Laden der Tasks:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der Aufgaben',
            message: 'Ein interner Fehler ist aufgetreten'
        });
    }
});

// POST /tasks - Neue Task für User erstellen (MIT KALENDER-SUPPORT + PROJEKTE)
router.post('/', 
    tasksLimit, 
    authenticateToken, 
    validateTaskCreation,
    async function (req, res) {
        if (!global.databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Tasks können temporär nicht erstellt werden.'
            });
        }
        
        try {
            const { text, dueDate, project_id } = req.body;
            
            console.log('📅📁 DEBUG handleCreateTask: Text:', text, 'DueDate:', dueDate, 'ProjectId:', project_id);
            
            const newTask = await TaskService.createTask(req.user, {
                text: text.trim(),
                dueDate: dueDate || null,
                project_id: project_id || null
            });
            
            console.log('✅ DEBUG: Task created successfully:', newTask);
            res.status(201).json(newTask);
            
        } catch (error) {
            console.error("🚨 FEHLER in handleCreateTask:", error);
            res.status(500).json({
                error: 'Fehler beim Erstellen der Aufgabe',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    }
);

// PUT /tasks/:id - Task aktualisieren (Status ODER Datum ODER Projekt) (MIT KALENDER + PROJEKTE)
router.put('/:id', 
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
            const taskId = req.params.id;
            const { action, dueDate, project_id } = req.body;
            
            console.log('📅📁 DEBUG handleToggleTask: TaskID:', taskId, 'Action:', action, 'DueDate:', dueDate, 'ProjectId:', project_id);
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            let updatedTask;
            
            if (action === 'updateDate') {
                // ===== KALENDER-UPDATE =====
                console.log('📅 DEBUG: Datum-Update erkannt');
                
                // Datum-Validierung
                if (dueDate && !isValidDate(dueDate)) {
                    return res.status(400).json({
                        error: 'Ungültiges Datum',
                        message: 'Datum muss im Format YYYY-MM-DD vorliegen oder leer sein'
                    });
                }
                
                updatedTask = await TaskService.updateTaskDate(req.user, Number(taskId), dueDate || null);
                console.log('📅 DEBUG: Datum erfolgreich aktualisiert:', updatedTask);
                
            } else if (action === 'updateProject') {
                // ===== PROJEKT-UPDATE =====
                console.log('📁 DEBUG: Projekt-Update erkannt');
                
                // Projekt-Validierung
                if (project_id && !isValidProjectId(project_id)) {
                    return res.status(400).json({
                        error: 'Ungültige Projekt-ID',
                        message: 'Projekt-ID muss eine positive Ganzzahl sein'
                    });
                }
                
                updatedTask = await TaskService.updateTaskProject(req.user, Number(taskId), Number(project_id));
                console.log('📁 DEBUG: Projekt erfolgreich aktualisiert:', updatedTask);
                
            } else {
                // ===== STATUS-TOGGLE (wie bisher) =====
                console.log('📅 DEBUG: Status-Toggle erkannt');
                updatedTask = await TaskService.toggleTaskStatus(req.user, Number(taskId));
            }
            
            res.json(updatedTask);
            
        } catch (error) {
            console.error('🚨 Fehler beim Update Task:', error);
            
            if (error.message.includes('nicht gefunden') || error.message.includes('gehört nicht')) {
                res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Aufgabe nicht gefunden oder gehört nicht dir'
                });
            } else {
                res.status(500).json({
                    error: 'Fehler beim Aktualisieren der Aufgabe',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    }
);

// DELETE /tasks/:id - Task löschen MIT AUTO-DELETE (nur eigene)
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
            const taskId = req.params.id;
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            const deletedTask = await TaskService.deleteTask(req.user, Number(taskId));
            
            // Response mit Auto-Delete-Info
            const response = {
                message: 'Aufgabe erfolgreich gelöscht',
                task: deletedTask
            };
            
            // Auto-Delete-Info hinzufügen falls vorhanden
            if (deletedTask.autoDeletedProject) {
                response.autoDeletedProject = deletedTask.autoDeletedProject;
                response.message += ` (Projekt "${deletedTask.autoDeletedProject.name}" automatisch gelöscht)`;
            }
            
            res.json(response);
            
        } catch (error) {
            console.error('🚨 Fehler beim Löschen der Task:', error);
            
            if (error.message.includes('nicht gefunden') || error.message.includes('gehört nicht')) {
                res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Aufgabe nicht gefunden oder gehört nicht dir'
                });
            } else {
                res.status(500).json({
                    error: 'Fehler beim Löschen der Aufgabe',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    }
);

// DELETE /tasks?status=completed - Alle erledigten Tasks löschen
router.delete('/', 
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
            const status = req.query.status;
            
            if (status !== 'completed' && status !== 'erledigt') {
                return res.status(400).json({
                    error: 'Ungültiger Parameter',
                    message: 'Parameter status=completed oder status=erledigt erforderlich'
                });
            }
            
            const result = await TaskService.deleteCompletedTasks(req.user);
            res.json(result);
            
        } catch (error) {
            console.error('🚨 Fehler beim Löschen erledigter Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Löschen erledigter Aufgaben',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    }
);

// PUT /tasks/:id/text - Task Text bearbeiten (nur eigene)
router.put('/:id/text', 
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
            const taskId = req.params.id;
            const newText = req.body && req.body.text;
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            if (!isValidTaskText(newText)) {
                return res.status(400).json({
                    error: 'Ungültiger Aufgabentext',
                    message: 'Text ist erforderlich, darf nicht leer sein und maximal 500 Zeichen haben'
                });
            }
            
            const updatedTask = await TaskService.updateTaskText(req.user, Number(taskId), newText.trim());
            res.json(updatedTask);
            
        } catch (error) {
            console.error('🚨 Fehler beim Bearbeiten des Task-Texts:', error);
            
            if (error.message.includes('nicht gefunden') || error.message.includes('gehört nicht')) {
                res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Aufgabe nicht gefunden oder gehört nicht dir'
                });
            } else {
                res.status(500).json({
                    error: 'Fehler beim Bearbeiten der Aufgabe',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    }
);

console.log('✅ Task Routes loaded');

module.exports = router;