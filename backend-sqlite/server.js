// optimized backend with SQLite Database and Authentication
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Environment Variables laden

const Database = require('./database'); // SQLite Database Module

// Module Pattern für Server-Funktionalität
const TaskServer = (function () {
    'use strict';
    
    // Private Konstanten und Konfiguration
    const PORT = process.env.PORT || 3000;
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    
    const STATUS = {
        OPEN: 'offen',
        COMPLETED: 'erledigt'
    };
    
    // Express App initialisieren
    const app = express();
    
    // JWT Secret Validierung
    if (!JWT_SECRET) {
        console.error('🚨 FEHLER: JWT_SECRET nicht in .env definiert!');
        process.exit(1);
    }
    
    // Private Hilfsfunktionen
    
    // Validierungsfunktionen (strikte Typenprüfung)
    const isValidTaskText = function (text) {
        return typeof text === 'string' && text.trim() !== '' && text.trim().length <= 500;
    };
    
    const isValidTaskId = function (id) {
        const numId = Number(id);
        return Number.isInteger(numId) && numId > 0;
    };
    
    const isValidUsername = function (username) {
        return typeof username === 'string' && 
               username.trim().length >= 3 && 
               username.trim().length <= 30 &&
               /^[a-zA-Z0-9_-]+$/.test(username.trim());
    };
    
    const isValidEmail = function (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return typeof email === 'string' && emailRegex.test(email.trim());
    };
    
    const isValidPassword = function (password) {
        return typeof password === 'string' && 
               password.length >= 6 && 
               password.length <= 100;
    };
    
    // JWT Token Hilfsfunktionen
    const generateToken = function (user) {
        const payload = {
            userId: user.id,
            username: user.username,
            email: user.email
        };
        
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
    };
    
    const verifyToken = function (token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Ungültiger Token');
        }
    };
    
    // Authentication Middleware
    const authenticateToken = async function (req, res, next) {
        console.log('🔐 Prüfe Authentication...');
        
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.log('❌ Kein Authorization Header gefunden');
                return res.status(401).json({
                    error: 'Nicht authentifiziert',
                    message: 'Authorization Header mit Bearer Token erforderlich'
                });
            }
            
            const token = authHeader.substring(7); // "Bearer " entfernen
            console.log('🎫 Token gefunden, verifiziere...');
            
            // Token verifizieren
            const decoded = verifyToken(token);
            console.log('✅ Token valid für User:', decoded.username);
            
            // User-Daten laden (für Sicherheit)
            const user = await Database.getUserById(decoded.userId);
            
            if (!user) {
                console.log('❌ User nicht mehr in Datenbank vorhanden');
                return res.status(401).json({
                    error: 'User nicht gefunden',
                    message: 'Token ist gültig, aber User existiert nicht mehr'
                });
            }
            
            // User-Daten zu Request hinzufügen
            req.user = user;
            console.log('👤 User authentifiziert:', user.username);
            
            next();
        } catch (error) {
            console.error('🚨 Authentication Fehler:', error.message);
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token abgelaufen',
                    message: 'Bitte erneut anmelden'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Ungültiger Token',
                    message: 'Token ist beschädigt oder gefälscht'
                });
            } else {
                return res.status(401).json({
                    error: 'Authentication fehlgeschlagen',
                    message: error.message
                });
            }
        }
    };
    
    // Optional Authentication (für Legacy-Kompatibilität)
    const optionalAuth = async function (req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const decoded = verifyToken(token);
                const user = await Database.getUserById(decoded.userId);
                
                if (user) {
                    req.user = user;
                    console.log('👤 Optional Auth: User erkannt:', user.username);
                } else {
                    console.log('⚠️ Optional Auth: Token valid, aber User nicht gefunden');
                }
            } else {
                console.log('📝 Optional Auth: Kein Token - verwende Demo-User');
            }
            
            next();
        } catch (error) {
            console.log('⚠️ Optional Auth: Token ungültig, verwende Demo-User');
            next(); // Fehler ignorieren, Demo-User verwenden
        }
    };
    
    // Middleware-Setup
    const setupMiddleware = function () {
        // JSON Parser
        app.use(express.json({
            limit: '1mb',
            strict: true
        }));
        
        // CORS für Frontend-Kommunikation (ROBUSTE LÖSUNG)
        app.use(function (req, res, next) {
            console.log('🌐 CORS Middleware - Request from:', req.headers.origin || 'no-origin');
            console.log('🌐 Method:', req.method);
            console.log('🌐 Path:', req.path);
            
            // CORS-Header IMMER setzen (für alle Requests)
            res.header('Access-Control-Allow-Origin', 'https://todo-app-fullstack-gamma.vercel.app');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400'); // 24 Stunden Cache für Preflight
            
            console.log('✅ CORS Headers gesetzt für alle Requests');
            
            // OPTIONS-Requests (Preflight) sofort beantworten
            if (req.method === 'OPTIONS') {
                console.log('🔄 OPTIONS (Preflight) Request - sende 204 No Content');
                res.status(204).end();
                return;
            }
            
            next();
        });
        
        // Request-Logging
        app.use(function (req, res, next) {
            const timestamp = new Date().toISOString();
            const hasAuth = req.headers.authorization ? '🔐' : '📝';
            console.log(`${timestamp} - ${hasAuth} ${req.method} ${req.path}`);
            next();
        });
    };
    
    // ===== AUTHENTICATION ROUTE HANDLERS =====
    
    // POST /auth/register - Neuen User registrieren
    const handleRegister = async function (req, res) {
        console.log('🆕 REGISTER Request empfangen');
        console.log('📋 Request Body:', req.body);
        
        try {
            const { username, email, password } = req.body;
            
            // Validierung
            if (!isValidUsername(username)) {
                return res.status(400).json({
                    error: 'Ungültiger Username',
                    message: 'Username: 3-30 Zeichen, nur Buchstaben, Zahlen, _ und -'
                });
            }
            
            if (!isValidEmail(email)) {
                return res.status(400).json({
                    error: 'Ungültige E-Mail',
                    message: 'Bitte gib eine gültige E-Mail-Adresse ein'
                });
            }
            
            if (!isValidPassword(password)) {
                return res.status(400).json({
                    error: 'Ungültiges Passwort',
                    message: 'Passwort: 6-100 Zeichen erforderlich'
                });
            }
            
            console.log('✅ Validation erfolgreich, erstelle User...');
            
            // User erstellen
            const newUser = await Database.createUser(username.trim(), email.trim(), password);
            
            // Token generieren
            const token = generateToken(newUser);
            
            console.log('🎉 User erfolgreich registriert:', newUser.username);
            
            res.status(201).json({
                message: 'User erfolgreich registriert',
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    createdAt: newUser.createdAt
                },
                token: token,
                expiresIn: JWT_EXPIRES_IN
            });
            
        } catch (error) {
            console.error('🚨 Registration Fehler:', error);
            
            if (error.message.includes('bereits vergeben')) {
                res.status(409).json({
                    error: 'User bereits vorhanden',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    error: 'Fehler bei der Registrierung',
                    message: error.message
                });
            }
        }
    };
    
    // POST /auth/login - User anmelden
    const handleLogin = async function (req, res) {
        console.log('🔑 LOGIN Request empfangen');
        console.log('📋 Request Body (ohne Password):', { username: req.body.username });
        
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({
                    error: 'Fehlende Daten',
                    message: 'Username und Password erforderlich'
                });
            }
            
            console.log('🔐 Authentifiziere User:', username);
            
            // User authentifizieren
            const user = await Database.authenticateUser(username.trim(), password);
            
            // Token generieren
            const token = generateToken(user);
            
            console.log('🎉 Login erfolgreich für User:', user.username);
            
            res.json({
                message: 'Erfolgreich angemeldet',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.createdAt
                },
                token: token,
                expiresIn: JWT_EXPIRES_IN
            });
            
        } catch (error) {
            console.error('🚨 Login Fehler:', error.message);
            
            // Aus Sicherheitsgründen immer die gleiche Fehlermeldung
            res.status(401).json({
                error: 'Anmeldung fehlgeschlagen',
                message: 'Ungültiger Username oder Passwort'
            });
        }
    };
    
    // GET /auth/me - Aktuelle User-Info abrufen
    const handleGetMe = async function (req, res) {
        console.log('👤 GET ME Request für User:', req.user.username);
        
        try {
            // User-Daten sind bereits durch authenticateToken Middleware verfügbar
            res.json({
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    email: req.user.email,
                    createdAt: req.user.createdAt
                }
            });
        } catch (error) {
            console.error('🚨 Get Me Fehler:', error);
            res.status(500).json({
                error: 'Fehler beim Laden der User-Daten',
                message: error.message
            });
        }
    };
    
    // POST /auth/logout - Abmelden (Client-side)
    const handleLogout = function (req, res) {
        console.log('👋 LOGOUT Request empfangen');
        
        // Bei JWT ist Logout hauptsächlich Client-side (Token löschen)
        // Server kann optional eine Blacklist führen, aber das ist für Basic Auth nicht nötig
        
        res.json({
            message: 'Erfolgreich abgemeldet',
            instructions: 'Token auf Client-Seite löschen'
        });
    };
    
    // ===== TASK ROUTE HANDLERS (Protected) =====
    
    // GET /tasks - Tasks für eingeloggten User abrufen
    const handleGetTasks = async function (req, res) {
        console.log("📚 GET /tasks - Lade Tasks aus SQLite");
        
        try {
            let tasks;
            
            if (req.user) {
                // Authentifizierter User - lade nur seine Tasks
                console.log("👤 Lade Tasks für User:", req.user.username);
                tasks = await Database.getAllTasksForUser(req.user.id);
            } else {
                // Legacy-Modus für Demo-User (Rückwärtskompatibilität)
                console.log("📝 Legacy-Modus: Lade Tasks für Demo-User");
                tasks = await Database.getAllTasks();
            }
            
            console.log("✅ Tasks erfolgreich geladen:", tasks.length);
            res.json(tasks);
        } catch (error) {
            console.error('🚨 Fehler beim Laden der Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Laden der Aufgaben',
                message: error.message
            });
        }
    };
    
    // POST /tasks - Neue Task für User erstellen
    const handleCreateTask = async function (req, res) {
        console.log("🆕 POST /tasks - Erstelle neue Task");
        
        try {
            const text = req.body && req.body.text;
            console.log("✏️ Aufgabentext:", text);
            
            if (!isValidTaskText(text)) {
                console.log("❌ Ungültiger Text erkannt:", text);
                return res.status(400).json({
                    error: 'Ungültiger Aufgabentext',
                    message: 'Text ist erforderlich, darf nicht leer sein und maximal 500 Zeichen haben'
                });
            }
            
            let newTask;
            
            if (req.user) {
                // Authentifizierter User
                console.log("👤 Erstelle Task für User:", req.user.username);
                newTask = await Database.createTaskForUser(req.user.id, text.trim());
            } else {
                // Legacy-Modus für Demo-User
                console.log("📝 Legacy-Modus: Erstelle Task für Demo-User");
                newTask = await Database.createTask(text.trim());
            }
            
            console.log("✨ Neue Task erstellt:", newTask);
            
            res.status(201).json(newTask);
            console.log("✅ Response gesendet an Frontend");
            
        } catch (error) {
            console.error("🚨 FEHLER in handleCreateTask:", error);
            res.status(500).json({
                error: 'Fehler beim Erstellen der Aufgabe',
                message: error.message
            });
        }
    };
    
    // PUT /tasks/:id - Status einer Task ändern (nur eigene)
    const handleToggleTask = async function (req, res) {
        console.log("🔄 PUT /tasks/:id - Ändere Task Status");
        
        try {
            const taskId = req.params.id;
            console.log("🆔 Task ID:", taskId);
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            let updatedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                console.log("👤 Toggle Task für User:", req.user.username);
                updatedTask = await Database.toggleTaskStatusForUser(Number(taskId), req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                console.log("📝 Legacy-Modus: Toggle Task für Demo-User");
                updatedTask = await Database.toggleTaskStatus(Number(taskId));
            }
            
            console.log("✅ Task Status geändert:", updatedTask.status);
            res.json(updatedTask);
            
        } catch (error) {
            console.error('🚨 Fehler beim Toggle Task Status:', error);
            
            if (error.message.includes('nicht gefunden') || error.message.includes('gehört nicht')) {
                res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Aufgabe nicht gefunden oder gehört nicht dir'
                });
            } else {
                res.status(500).json({
                    error: 'Fehler beim Ändern des Status',
                    message: error.message
                });
            }
        }
    };
    
    // DELETE /tasks/:id - Task löschen (nur eigene)
    const handleDeleteTask = async function (req, res) {
        console.log("🗑️ DELETE /tasks/:id - Lösche Task");
        
        try {
            const taskId = req.params.id;
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            let deletedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                console.log("👤 Lösche Task für User:", req.user.username);
                deletedTask = await Database.deleteTaskForUser(Number(taskId), req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                console.log("📝 Legacy-Modus: Lösche Task für Demo-User");
                deletedTask = await Database.deleteTask(Number(taskId));
            }
            
            console.log("✅ Task erfolgreich gelöscht");
            
            res.json({
                message: 'Aufgabe erfolgreich gelöscht',
                task: deletedTask
            });
            
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
                    message: error.message
                });
            }
        }
    };
    
    // DELETE /tasks?status=completed - Alle erledigten Tasks löschen
    const handleDeleteCompleted = async function (req, res) {
        console.log("🧹 DELETE /tasks?status=completed - Lösche erledigte Tasks");
        
        try {
            const status = req.query.status;
            
            if (status !== 'completed' && status !== 'erledigt') {
                return res.status(400).json({
                    error: 'Ungültiger Parameter',
                    message: 'Parameter status=completed oder status=erledigt erforderlich'
                });
            }
            
            let result;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                console.log("👤 Lösche erledigte Tasks für User:", req.user.username);
                result = await Database.deleteCompletedTasksForUser(req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                console.log("📝 Legacy-Modus: Lösche erledigte Tasks für Demo-User");
                result = await Database.deleteCompletedTasks();
            }
            
            console.log("✅ Erledigte Tasks gelöscht:", result.deletedCount);
            res.json(result);
            
        } catch (error) {
            console.error('🚨 Fehler beim Löschen erledigter Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Löschen erledigter Aufgaben',
                message: error.message
            });
        }
    };
    
    // PUT /tasks/:id/text - Task Text bearbeiten (nur eigene)
    const handleEditTaskText = async function (req, res) {
        console.log("✏️ PUT /tasks/:id/text - Bearbeite Task Text");
        
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
            
            let updatedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                console.log("👤 Bearbeite Task für User:", req.user.username);
                updatedTask = await Database.updateTaskTextForUser(Number(taskId), req.user.id, newText.trim());
            } else {
                // Legacy-Modus für Demo-User
                console.log("📝 Legacy-Modus: Bearbeite Task für Demo-User");
                updatedTask = await Database.updateTaskText(Number(taskId), newText.trim());
            }
            
            console.log("✅ Task Text erfolgreich aktualisiert");
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
                    message: error.message
                });
            }
        }
    };
    
    // Routen registrieren
    const setupRoutes = function () {
        // Authentication Routes (öffentlich)
        app.post('/auth/register', handleRegister);
        app.post('/auth/login', handleLogin);
        app.post('/auth/logout', handleLogout);
        app.get('/auth/me', authenticateToken, handleGetMe);
        
        // Task Routes (mit optionaler Auth für Legacy-Kompatibilität)
        app.get('/tasks', optionalAuth, handleGetTasks);
        app.post('/tasks', optionalAuth, handleCreateTask);
        app.put('/tasks/:id', optionalAuth, handleToggleTask);
        app.delete('/tasks/:id', optionalAuth, handleDeleteTask);
        app.delete('/tasks', optionalAuth, handleDeleteCompleted);
        app.put('/tasks/:id/text', optionalAuth, handleEditTaskText);
        
        // Health Check Route
        app.get('/health', function (req, res) {
            res.json({
                status: 'ok',
                message: 'Todo API with Authentication is running',
                timestamp: new Date().toISOString(),
                version: '2.0.0'
            });
        });
        
        // 404-Handler für unbekannte Routen
        app.use(function (req, res) {
            res.status(404).json({
                error: 'Route nicht gefunden',
                message: 'Die angeforderte URL ' + req.path + ' existiert nicht'
            });
        });
        
        // Globaler Error-Handler
        app.use(function (err, req, res, next) {
            console.error('🚨 Unbehandelter Fehler:', err);
            res.status(500).json({
                error: 'Interner Serverfehler',
                message: 'Ein unerwarteter Fehler ist aufgetreten'
            });
        });
    };
    
    // Server starten (async für Datenbank-Initialisierung)
    const start = async function () {
        try {
            console.log('🚀 Starte OPTIMIERTEN TODO-Server mit Authentication...');
            
            // Datenbank initialisieren
            await Database.initialize();
            
            setupMiddleware();
            setupRoutes();
            
            const server = app.listen(PORT, function () {
                console.log('🎉 TODO-Server mit Authentication gestartet:');
                console.log('- Port: ' + PORT);
                console.log('- Datenbank: SQLite (todos.db)');
                console.log('- JWT Secret: ' + (JWT_SECRET ? 'Konfiguriert ✅' : 'FEHLT ❌'));
                console.log('- Zeit: ' + new Date().toISOString());
                console.log('- URL: http://localhost:' + PORT);
                console.log('');
                console.log('📡 Auth-Endpunkte:');
                console.log('- POST /auth/register - Registrierung');
                console.log('- POST /auth/login    - Anmeldung');
                console.log('- GET  /auth/me      - User-Info');
                console.log('- POST /auth/logout  - Abmeldung');
                console.log('');
                console.log('📋 Task-Endpunkte (Auth optional):');
                console.log('- GET    /tasks      - Tasks abrufen');
                console.log('- POST   /tasks      - Task erstellen');
                console.log('- PUT    /tasks/:id  - Status ändern');
                console.log('- DELETE /tasks/:id  - Task löschen');
                console.log('');
                console.log('🎯 Bereit für Authentifizierung!');
            });
            
            // Graceful Shutdown (erweitert für Datenbank)
            const shutdown = async function (signal) {
                console.log('\n🛑 ' + signal + ' empfangen. Server wird heruntergefahren...');
                
                server.close(async function () {
                    console.log('📪 HTTP Server gestoppt');
                    
                    try {
                        await Database.close();
                        console.log('🗄️ Datenbank geschlossen');
                        console.log('✅ Graceful Shutdown abgeschlossen');
                        process.exit(0);
                    } catch (error) {
                        console.error('🚨 Fehler beim Datenbankschließen:', error);
                        process.exit(1);
                    }
                });
                
                // Force-Kill nach 10 Sekunden
                setTimeout(() => {
                    console.error('⏰ Forced Shutdown nach 10 Sekunden');
                    process.exit(1);
                }, 10000);
            };
            
            process.on('SIGINT', () => shutdown('SIGINT'));
            process.on('SIGTERM', () => shutdown('SIGTERM'));
            
            return server;
        } catch (error) {
            console.error('🚨 Server-Start Fehler:', error);
            process.exit(1);
        }
    };
    
    // Öffentliche API
    return {
        start: start,
        app: app // Für Tests exportieren
    };
})();

// Server initialisieren und starten
TaskServer.start();