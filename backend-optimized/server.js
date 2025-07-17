// optimized backend
const express = require('express');
const fs = require('fs');
const path = require('path');

// Module Pattern für Server-Funktionalität
const TaskServer = (function () {
    'use strict';
    
    // Private Konstanten und Konfiguration
    const PORT = 3000;
    const TASKS_FILE = path.join(__dirname, 'tasks.json');
    const STATUS = {
        OPEN: 'offen',
        COMPLETED: 'erledigt'
    };
    
    // Express App initialisieren
    const app = express();
    
    // Private Hilfsfunktionen
    
    // Sichere Datei-Operationen mit expliziter Fehlerbehandlung
    const loadTasks = function () {
    console.log("📂 loadTasks() gestartet, Datei:", TASKS_FILE); // Debug: Welche Datei wird geladen?
    
    try {
        const data = fs.readFileSync(TASKS_FILE, 'utf8');
        console.log("📄 Datei erfolgreich gelesen, Größe:", data.length, "Zeichen"); // Debug: Dateigröße
        
        const tasks = JSON.parse(data);
        console.log("📋 JSON geparst, Tasks gefunden:", tasks.length); // Debug: Wie viele Tasks?
        console.log("🔍 Erste 3 Tasks:", tasks.slice(0, 3)); // Debug: Beispiel-Daten anzeigen
        
        if (!Array.isArray(tasks)) {
            console.warn('⚠️ Tasks-Datei enthält kein Array, verwende leeres Array');
            return [];
        }
        
        return tasks;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('📝 Tasks-Datei existiert noch nicht, erstelle leeres Array');
            return [];
        }
        console.error('🚨 Fehler beim Laden der Tasks:', error.message);
        console.error('🔍 Error Details:', error); // Vollständiger Error für Debugging
        return [];
    }
};
    
    const saveTasks = function (tasks) {
    console.log("💾 saveTasks() gestartet, speichere", tasks.length, "Tasks"); // Debug
    
    if (!Array.isArray(tasks)) {
        console.error("❌ Tasks ist kein Array:", typeof tasks); // Debug
        throw new Error('Tasks muss ein Array sein');
    }
    
    try {
        const data = JSON.stringify(tasks, null, 2);
        console.log("📝 JSON erstellt, Größe:", data.length, "Zeichen"); // Debug
        
        fs.writeFileSync(TASKS_FILE, data, 'utf8');
        console.log("✅ Datei erfolgreich geschrieben"); // Debug
        return true;
    } catch (error) {
        console.error('🚨 Fehler beim Speichern der Tasks:', error.message);
        console.error('🔍 Error Details:', error); // Debug
        throw error;
    }
};
    
    // Validierungsfunktionen (strikte Typenprüfung)
    const isValidTaskText = function (text) {
        return typeof text === 'string' && text.trim() !== '';
    };
    
    const isValidTaskId = function (id) {
        const numId = Number(id);
        return Number.isInteger(numId) && numId > 0;
    };
    
    const isValidStatus = function (status) {
        return status === STATUS.OPEN || status === STATUS.COMPLETED;
    };
    
    // Task-Erstellung mit Validierung
    const createTask = function (text) {
        if (!isValidTaskText(text)) {
            throw new Error('Ungültiger Aufgabentext');
        }
        
        return {
            id: Date.now(), // Einfache ID-Generierung
            text: text.trim(),
            status: STATUS.OPEN,
            createdAt: new Date().toISOString()
        };
    };
    
    // Task-Suche mit Validierung
    const findTaskById = function (tasks, id) {
        if (!isValidTaskId(id)) {
            return null;
        }
        
        const numId = Number(id);
        return tasks.find(function (task) {
            return task.id === numId;
        }) || null;
    };
    
    // Middleware-Setup
    const setupMiddleware = function () {
        // JSON Parser
        app.use(express.json({
            limit: '1mb', // Limit für Sicherheit
            strict: true  // Nur Objects und Arrays erlauben
        }));
        
        // CORS für Frontend-Kommunikation (sicherer konfiguriert)
        app.use(function (req, res, next) {
            res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            
            // Preflight-Requests behandeln
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
                return;
            }
            next();
        });
        
        // Request-Logging (hilfreich für Debugging)
        app.use(function (req, res, next) {
            console.log(new Date().toISOString() + ' - ' + req.method + ' ' + req.path);
            next();
        });
    };
    
    // Route-Handler (alle als Funktionsausdrücke nach Crockford)
    
    // GET /tasks - Alle Aufgaben abrufen
    const handleGetTasks = function (req, res) {
        try {
            const tasks = loadTasks();
            res.json(tasks);
        } catch (error) {
            console.error('Fehler beim Laden der Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Laden der Aufgaben',
                message: error.message
            });
        }
    };
    
    // POST /tasks - Neue Aufgabe erstellen
    const handleCreateTask = function (req, res) {
    console.log("🆕 CREATE TASK gestartet"); // Debug: Funktion gestartet
    console.log("📋 Request Body:", req.body); // Debug: Was kommt vom Frontend?
    
    try {
        const text = req.body && req.body.text;
        console.log("✏️ Aufgabentext:", text); // Debug: Welcher Text wurde empfangen?
        
        if (!isValidTaskText(text)) {
            console.log("❌ Ungültiger Text erkannt:", text); // Debug: Validation fehlgeschlagen
            return res.status(400).json({
                error: 'Ungültiger Aufgabentext',
                message: 'Text ist erforderlich und darf nicht leer sein'
            });
        }
        
        const tasks = loadTasks();
        console.log("📚 Aktuelle Tasks geladen, Anzahl:", tasks.length); // Debug: Wie viele Tasks existieren?
        
        const newTask = createTask(text);
        console.log("✨ Neue Task erstellt:", newTask); // Debug: Wie sieht die neue Task aus?
        
        tasks.push(newTask);
        console.log("📝 Task zur Liste hinzugefügt, neue Anzahl:", tasks.length); // Debug: Neue Gesamtanzahl
        
        saveTasks(tasks);
        console.log("💾 Tasks gespeichert"); // Debug: Speicherung erfolgreich
        
        res.status(201).json(newTask);
        console.log("✅ Response gesendet an Frontend"); // Debug: Antwort verschickt
        
    } catch (error) {
        console.error("🚨 FEHLER in handleCreateTask:", error); // Debug: Was ist schiefgelaufen?
        console.error("🔍 Error Stack:", error.stack); // Debug: Wo genau ist der Fehler?
        res.status(500).json({
            error: 'Fehler beim Erstellen der Aufgabe',
            message: error.message
        });
    }
};
    
    // PUT /tasks/:id - Status einer Aufgabe wechseln
    const handleToggleTask = function (req, res) {
        try {
            const taskId = req.params.id;
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            const tasks = loadTasks();
            const task = findTaskById(tasks, taskId);
            
            if (!task) {
                return res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Keine Aufgabe mit der ID ' + taskId + ' gefunden'
                });
            }
            
            // Status umschalten
            task.status = task.status === STATUS.OPEN ? STATUS.COMPLETED : STATUS.OPEN;
            task.updatedAt = new Date().toISOString();
            
            saveTasks(tasks);
            res.json(task);
        } catch (error) {
            console.error('Fehler beim Umschalten des Task-Status:', error);
            res.status(500).json({
                error: 'Fehler beim Ändern des Status',
                message: error.message
            });
        }
    };
    
    // DELETE /tasks/:id - Einzelne Aufgabe löschen
    const handleDeleteTask = function (req, res) {
        try {
            const taskId = req.params.id;
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            const tasks = loadTasks();
            const taskIndex = tasks.findIndex(function (task) {
                return task.id === Number(taskId);
            });
            
            if (taskIndex === -1) {
                return res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Keine Aufgabe mit der ID ' + taskId + ' gefunden'
                });
            }
            
            const deletedTask = tasks.splice(taskIndex, 1)[0];
            saveTasks(tasks);
            
            res.json({
                message: 'Aufgabe erfolgreich gelöscht',
                task: deletedTask
            });
        } catch (error) {
            console.error('Fehler beim Löschen der Task:', error);
            res.status(500).json({
                error: 'Fehler beim Löschen der Aufgabe',
                message: error.message
            });
        }
    };
    
    // DELETE /tasks?status=completed - Alle erledigten Aufgaben löschen
    const handleDeleteCompleted = function (req, res) {
        try {
            const status = req.query.status;
            
            if (status !== 'completed' && status !== 'erledigt') {
                return res.status(400).json({
                    error: 'Ungültiger Parameter',
                    message: 'Parameter status=completed oder status=erledigt erforderlich'
                });
            }
            
            const tasks = loadTasks();
            const remainingTasks = tasks.filter(function (task) {
                return task.status === STATUS.OPEN;
            });
            
            const deletedCount = tasks.length - remainingTasks.length;
            
            saveTasks(remainingTasks);
            res.json({
                message: deletedCount + ' erledigte Aufgaben gelöscht',
                deletedCount: deletedCount
            });
        } catch (error) {
            console.error('Fehler beim Löschen erledigter Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Löschen erledigter Aufgaben',
                message: error.message
            });
        }
    };
    
    // PUT /tasks/:id/text - Text einer Aufgabe bearbeiten
    const handleEditTaskText = function (req, res) {
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
                    message: 'Text ist erforderlich und darf nicht leer sein'
                });
            }
            
            const tasks = loadTasks();
            const task = findTaskById(tasks, taskId);
            
            if (!task) {
                return res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Keine Aufgabe mit der ID ' + taskId + ' gefunden'
                });
            }
            
            // Text aktualisieren
            task.text = newText.trim();
            task.updatedAt = new Date().toISOString();
            
            saveTasks(tasks);
            res.json(task);
        } catch (error) {
            console.error('Fehler beim Bearbeiten des Task-Texts:', error);
            res.status(500).json({
                error: 'Fehler beim Bearbeiten der Aufgabe',
                message: error.message
            });
        }
    };
    
    // Routen registrieren
    const setupRoutes = function () {
        app.get('/tasks', handleGetTasks);
        app.post('/tasks', handleCreateTask);
        app.put('/tasks/:id', handleToggleTask);
        app.delete('/tasks/:id', handleDeleteTask);
        app.delete('/tasks', handleDeleteCompleted);
        app.put('/tasks/:id/text', handleEditTaskText);
        
        // 404-Handler für unbekannte Routen
        app.use(function (req, res) {
            res.status(404).json({
                error: 'Route nicht gefunden',
                message: 'Die angeforderte URL ' + req.path + ' existiert nicht'
            });
        });
        
        // Globaler Error-Handler
        app.use(function (err, req, res, next) {
            console.error('Unbehandelter Fehler:', err);
            res.status(500).json({
                error: 'Interner Serverfehler',
                message: 'Ein unerwarteter Fehler ist aufgetreten'
            });
        });
    };
    
    // Server starten
    const start = function () {
        setupMiddleware();
        setupRoutes();
        
        const server = app.listen(PORT, function () {
            console.log('🚀 OPTIMIERTE TODO-Server gestartet:');
            console.log('- Port: ' + PORT);
            console.log('- Tasks-Datei: ' + TASKS_FILE);
            console.log('- Zeit: ' + new Date().toISOString());
            console.log('- URL: http://localhost:' + PORT);
        });
        
        // Graceful Shutdown
        const shutdown = function () {
            console.log('Server wird heruntergefahren...');
            server.close(function () {
                console.log('Server erfolgreich beendet');
                process.exit(0);
            });
        };
        
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        
        return server;
    };
    
    // Öffentliche API
    return {
        start: start,
        app: app // Für Tests exportieren
    };
})();

// Server initialisieren und starten
TaskServer.start();