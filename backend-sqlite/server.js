// PRODUCTION BACKEND - Render Optimized with SQLite Database and Authentication
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Environment Variables laden

const Database = require('./database'); // SQLite Database Module

// Module Pattern für Server-Funktionalität
const TaskServer = (function () {
    'use strict';
    
    // PRODUCTION KONFIGURATION
    const PORT = process.env.PORT || 10000;
    const JWT_SECRET = process.env.JWT_SECRET || 'production-fallback-secret-2025';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    const NODE_ENV = process.env.NODE_ENV || 'production';
    
    const STATUS = {
        OPEN: 'offen',
        COMPLETED: 'erledigt'
    };
    
    // Express App initialisieren
    const app = express();
    
    console.log('🏭 === STARTING PRODUCTION TODO SERVER ===');
    console.log('📍 PORT:', PORT);
    console.log('🌍 NODE_ENV:', NODE_ENV);
    console.log('🔑 JWT_SECRET:', JWT_SECRET ? 'SET ✅' : 'NOT SET ❌');
    console.log('⏰ JWT_EXPIRES_IN:', JWT_EXPIRES_IN);
    
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
    
    // Database Status
    let databaseAvailable = false;
    
    // Authentication Middleware
    const authenticateToken = async function (req, res, next) {
        if (NODE_ENV === 'development') {
            console.log('🔐 Prüfe Authentication...');
        }
        
        if (!databaseAvailable) {
            console.log('⚠️ Database nicht verfügbar - Demo-Modus');
            req.user = null;
            return next();
        }
        
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    error: 'Nicht authentifiziert',
                    message: 'Authorization Header mit Bearer Token erforderlich'
                });
            }
            
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            const user = await Database.getUserById(decoded.userId);
            
            if (!user) {
                return res.status(401).json({
                    error: 'User nicht gefunden',
                    message: 'Token ist gültig, aber User existiert nicht mehr'
                });
            }
            
            req.user = user;
            if (NODE_ENV === 'development') {
                console.log('👤 User authentifiziert:', user.username);
            }
            
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
        if (!databaseAvailable) {
            req.user = null;
            return next();
        }
        
        try {
            const authHeader = req.headers.authorization;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const decoded = verifyToken(token);
                const user = await Database.getUserById(decoded.userId);
                
                if (user) {
                    req.user = user;
                    if (NODE_ENV === 'development') {
                        console.log('👤 Optional Auth: User erkannt:', user.username);
                    }
                }
            }
            
            next();
        } catch (error) {
            if (NODE_ENV === 'development') {
                console.log('⚠️ Optional Auth: Token ungültig, verwende Demo-User');
            }
            next(); // Fehler ignorieren, Demo-User verwenden
        }
    };
    
    // 🔒 ERWEITERTE CORS-MIDDLEWARE mit mehreren erlaubten Origins
    const setupMiddleware = function () {
        console.log('⚙️ Setting up EXTENDED CORS with multiple origins...');
        
        // JSON Parser
        app.use(express.json({
            limit: '1mb',
            strict: true
        }));
        
        // 🔒 ERWEITERTE CORS mit mehreren erlaubten Origins
        app.use(function (req, res, next) {
            const origin = req.headers.origin;
            const method = req.method;
            const path = req.path;
            const userAgent = req.headers['user-agent'];
            
            // ERLAUBTE ORIGINS (erweitert für Entwicklung und Produktion)
            const allowedOrigins = [
                'https://todo-app-fullstack-gamma.vercel.app',  // Hauptproduktion
                'http://localhost:3000',                        // React Dev Server
                'http://localhost:8080',                        // Andere Dev Server  
                'http://127.0.0.1:5500',                       // Live Server Extension
                'http://localhost:5500',                        // Live Server Alternative
                'https://localhost:3000',                       // HTTPS Local
                'null'                                          // File:// Protokoll für lokale Dateien
            ];
            
            // AUSFÜHRLICHES DEBUGGING (immer aktiv)
            console.log('🌐 === CORS REQUEST DEBUG ===');
            console.log('🔍 Method:', method);
            console.log('🔍 Path:', path);
            console.log('🔍 Origin:', origin || 'NO-ORIGIN');
            console.log('🔍 User-Agent:', userAgent ? userAgent.substring(0, 50) + '...' : 'NO-USER-AGENT');
            
            // Origin-Prüfung und Auswahl
            let allowedOrigin;
            if (!origin) {
                // Kein Origin (z.B. direkter Server-Aufruf oder Postman)
                allowedOrigin = allowedOrigins[0]; // Fallback zur Hauptdomain
                console.log('🔍 No Origin provided, using fallback:', allowedOrigin);
            } else if (allowedOrigins.includes(origin)) {
                // Origin ist in der erlaubten Liste
                allowedOrigin = origin;
                console.log('✅ Origin allowed:', allowedOrigin);
            } else {
                // Origin nicht erlaubt, verwende Fallback
                allowedOrigin = allowedOrigins[0];
                console.log('⚠️ Origin not in allowlist:', origin, '-> using fallback:', allowedOrigin);
            }
            
            // CORS Headers setzen
            res.header('Access-Control-Allow-Origin', allowedOrigin);
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400');
            
            console.log('✅ CORS Headers gesetzt für:', allowedOrigin);
            console.log('🔍 Response Headers:', {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
            });
            
            // OPTIONS Preflight (AUSFÜHRLICH)
            if (method === 'OPTIONS') {
                console.log('🔄 === OPTIONS PREFLIGHT DETECTED ===');
                console.log('🔍 Request Headers for Preflight:', req.headers);
                console.log('🔍 Sending OPTIONS response with status 200');
                
                // Explizite Antwort für OPTIONS
                res.status(200).json({
                    message: 'CORS Preflight OK',
                    allowedOrigin: allowedOrigin,
                    allowedOrigins: allowedOrigins,
                    allowedMethods: 'GET, POST, PUT, DELETE, OPTIONS',
                    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
                });
                return;
            }
            
            console.log('➡️ Continuing to route handler');
            console.log('🌐 === END CORS DEBUG ===');
            next();
        });
        
        // REQUEST LOGGING (ausführlich)
        app.use(function (req, res, next) {
            const timestamp = new Date().toISOString();
            const hasAuth = req.headers.authorization ? '🔐' : '📝';
            const origin = req.headers.origin || 'direct';
            console.log(`${timestamp} - ${hasAuth} ${req.method} ${req.path} from ${origin}`);
            next();
        });
        
        console.log('✅ Extended CORS setup complete');
    };
    
    // ===== AUTHENTICATION ROUTE HANDLERS =====
    
    // POST /auth/register - Neuen User registrieren
    const handleRegister = async function (req, res) {
        if (NODE_ENV === 'development') {
            console.log('🆕 REGISTER Request empfangen');
        }
        
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Registrierung temporär nicht möglich.'
            });
        }
        
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
            
            // User erstellen
            const newUser = await Database.createUser(username.trim(), email.trim(), password);
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
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    };
    
    // POST /auth/login - User anmelden
    const handleLogin = async function (req, res) {
        if (NODE_ENV === 'development') {
            console.log('🔑 LOGIN Request empfangen');
        }
        
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Anmeldung temporär nicht möglich.'
            });
        }
        
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({
                    error: 'Fehlende Daten',
                    message: 'Username und Password erforderlich'
                });
            }
            
            // User authentifizieren
            const user = await Database.authenticateUser(username.trim(), password);
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
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
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
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    };
    
    // POST /auth/logout - Abmelden (Client-side)
    const handleLogout = function (req, res) {
        res.json({
            message: 'Erfolgreich abgemeldet',
            instructions: 'Token auf Client-Seite löschen'
        });
    };
    
    // ===== TASK ROUTE HANDLERS =====
    
    // GET /tasks - Tasks für eingeloggten User abrufen
    const handleGetTasks = async function (req, res) {
        try {
            let tasks;
            
            if (!databaseAvailable) {
                // Demo-Daten wenn Database nicht verfügbar
                tasks = [
                    { id: 1, text: 'Demo-Aufgabe 1', status: 'offen' },
                    { id: 2, text: 'Demo-Aufgabe 2', status: 'erledigt' },
                    { id: 3, text: 'Database startet noch...', status: 'offen' }
                ];
            } else if (req.user) {
                // Authentifizierter User - lade nur seine Tasks
                tasks = await Database.getAllTasksForUser(req.user.id);
                if (NODE_ENV === 'development') {
                    console.log("👤 Lade Tasks für User:", req.user.username);
                }
            } else {
                // Legacy-Modus für Demo-User
                tasks = await Database.getAllTasks();
            }
            
            res.json(tasks);
        } catch (error) {
            console.error('🚨 Fehler beim Laden der Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Laden der Aufgaben',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    };
    
    // POST /tasks - Neue Task für User erstellen
    const handleCreateTask = async function (req, res) {
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Tasks können temporär nicht erstellt werden.'
            });
        }
        
        try {
            const text = req.body && req.body.text;
            
            if (!isValidTaskText(text)) {
                return res.status(400).json({
                    error: 'Ungültiger Aufgabentext',
                    message: 'Text ist erforderlich, darf nicht leer sein und maximal 500 Zeichen haben'
                });
            }
            
            let newTask;
            
            if (req.user) {
                // Authentifizierter User
                newTask = await Database.createTaskForUser(req.user.id, text.trim());
                if (NODE_ENV === 'development') {
                    console.log("👤 Erstelle Task für User:", req.user.username);
                }
            } else {
                // Legacy-Modus für Demo-User
                newTask = await Database.createTask(text.trim());
            }
            
            res.status(201).json(newTask);
            
        } catch (error) {
            console.error("🚨 FEHLER in handleCreateTask:", error);
            res.status(500).json({
                error: 'Fehler beim Erstellen der Aufgabe',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    };
    
    // PUT /tasks/:id - Status einer Task ändern (nur eigene)
    const handleToggleTask = async function (req, res) {
        if (!databaseAvailable) {
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
            
            let updatedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                updatedTask = await Database.toggleTaskStatusForUser(Number(taskId), req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                updatedTask = await Database.toggleTaskStatus(Number(taskId));
            }
            
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
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    };
    
    // DELETE /tasks/:id - Task löschen (nur eigene)
    const handleDeleteTask = async function (req, res) {
        if (!databaseAvailable) {
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
            
            let deletedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                deletedTask = await Database.deleteTaskForUser(Number(taskId), req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                deletedTask = await Database.deleteTask(Number(taskId));
            }
            
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
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    };
    
    // DELETE /tasks?status=completed - Alle erledigten Tasks löschen
    const handleDeleteCompleted = async function (req, res) {
        if (!databaseAvailable) {
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
            
            let result;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                result = await Database.deleteCompletedTasksForUser(req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                result = await Database.deleteCompletedTasks();
            }
            
            res.json(result);
            
        } catch (error) {
            console.error('🚨 Fehler beim Löschen erledigter Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Löschen erledigter Aufgaben',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    };
    
    // PUT /tasks/:id/text - Task Text bearbeiten (nur eigene)
    const handleEditTaskText = async function (req, res) {
        if (!databaseAvailable) {
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
            
            let updatedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                updatedTask = await Database.updateTaskTextForUser(Number(taskId), req.user.id, newText.trim());
            } else {
                // Legacy-Modus für Demo-User
                updatedTask = await Database.updateTaskText(Number(taskId), newText.trim());
            }
            
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
    };
    
    // Routen registrieren
    const setupRoutes = function () {
        console.log('🛣️ Setting up Production routes...');
        
        // Health Check Route (CRITICAL for Render)
        app.get('/health', function (req, res) {
            res.json({
                status: 'ok',
                message: 'EXTENDED CORS TODO SERVER IS RUNNING',
                timestamp: new Date().toISOString(),
                version: 'EXTENDED-CORS-1.1',
                port: PORT,
                environment: NODE_ENV,
                cors: 'EXTENDED_MULTI_ORIGIN',
                database: databaseAvailable ? 'connected' : 'unavailable',
                allowedOrigins: [
                    'https://todo-app-fullstack-gamma.vercel.app',
                    'http://localhost:3000',
                    'http://localhost:8080', 
                    'http://127.0.0.1:5500',
                    'http://localhost:5500',
                    'https://localhost:3000'
                ]
            });
        });
        
        // Root route for testing
        app.get('/', function (req, res) {
            res.json({
                message: 'Extended CORS Todo App Backend API',
                version: 'EXTENDED-CORS-1.1',
                environment: NODE_ENV,
                cors: 'EXTENDED_MULTI_ORIGIN',
                database: databaseAvailable ? 'connected' : 'unavailable',
                endpoints: {
                    health: '/health',
                    auth: {
                        register: 'POST /auth/register',
                        login: 'POST /auth/login',
                        me: 'GET /auth/me',
                        logout: 'POST /auth/logout'
                    },
                    tasks: {
                        list: 'GET /tasks',
                        create: 'POST /tasks',
                        toggle: 'PUT /tasks/:id',
                        delete: 'DELETE /tasks/:id',
                        edit: 'PUT /tasks/:id/text',
                        cleanup: 'DELETE /tasks?status=completed'
                    }
                }
            });
        });
        
        // Authentication Routes
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
        
        // 404-Handler für unbekannte Routen
        app.use(function (req, res) {
            res.status(404).json({
                error: 'Route nicht gefunden',
                message: 'Die angeforderte URL ' + req.path + ' existiert nicht',
                availableRoutes: ['/', '/health', '/auth/*', '/tasks/*']
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
        
        console.log('✅ Extended CORS routes setup complete');
    };
    
    // ===== SERVER START MIT PRODUCTION CONFIGURATION =====
    const start = async function () {
        try {
            console.log('🏭 === STARTING EXTENDED CORS TODO SERVER ===');
            console.log('📅 Timestamp:', new Date().toISOString());
            console.log('🌍 Environment:', NODE_ENV);
            console.log('📍 Port:', PORT);
            console.log('🔑 JWT Secret:', JWT_SECRET ? 'Configured ✅' : 'Missing ❌');
            
            // DATABASE INITIALISIERUNG
            console.log('🗄️ Initializing production database...');
            try {
                const dbPromise = Database.initialize();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Database initialization timeout after 15 seconds')), 15000)
                );
                
                await Promise.race([dbPromise, timeoutPromise]);
                console.log('✅ Database initialized successfully');
                databaseAvailable = true;
                
            } catch (error) {
                console.error('🚨 Database initialization failed:', error.message);
                console.log('⚠️ Server starting without database connection...');
                console.log('📝 App will use demo mode for tasks');
                databaseAvailable = false;
            }
            
            // Middleware und Routen setup
            setupMiddleware();
            setupRoutes();
            
            const server = app.listen(PORT, function () {
                console.log('');
                console.log('🎉 === EXTENDED CORS TODO SERVER STARTED ===');
                console.log('📍 Port:', PORT);
                console.log('🌍 Environment:', NODE_ENV);
                console.log('🗄️ Database:', databaseAvailable ? 'Connected ✅' : 'Demo Mode ⚠️');
                console.log('🔑 JWT Secret:', JWT_SECRET ? 'Configured ✅' : 'Missing ❌');
                console.log('⏰ Started at:', new Date().toISOString());
                
                console.log('🛡️ CORS: EXTENDED (Multi-Origin)');
                console.log('✅ Allowed Origins:');
                console.log('  • https://todo-app-fullstack-gamma.vercel.app');
                console.log('  • http://localhost:3000');
                console.log('  • http://localhost:8080');
                console.log('  • http://127.0.0.1:5500');
                console.log('  • http://localhost:5500');
                console.log('  • https://localhost:3000');
                
                console.log('');
                console.log('📡 Endpoints:');
                console.log('  • POST /auth/register - Registration', databaseAvailable ? '✅' : '⚠️');
                console.log('  • POST /auth/login    - Login', databaseAvailable ? '✅' : '⚠️');
                console.log('  • GET  /auth/me      - User-Info', databaseAvailable ? '✅' : '⚠️');
                console.log('  • POST /auth/logout  - Logout ✅');
                console.log('  • GET    /tasks      - Get tasks', databaseAvailable ? '✅' : '📝 Demo');
                console.log('  • POST   /tasks      - Create task', databaseAvailable ? '✅' : '⚠️');
                console.log('  • PUT    /tasks/:id  - Toggle status', databaseAvailable ? '✅' : '⚠️');
                console.log('  • DELETE /tasks/:id  - Delete task', databaseAvailable ? '✅' : '⚠️');
                console.log('');
                
                if (!databaseAvailable) {
                    console.log('⚠️ === DEMO MODE ACTIVE ===');
                    console.log('🔄 Database may connect later - server will continue running');
                    console.log('📝 Tasks endpoint returns demo data for now');
                    console.log('');
                }
                
                console.log('🚀 === EXTENDED CORS SERVER READY ===');
                console.log('🔍 Enhanced debugging active - check logs for CORS details');
                console.log('');
            });
            
            // Graceful Shutdown
            const shutdown = async function (signal) {
                console.log('\n🛑 ' + signal + ' received. Shutting down server...');
                
                server.close(async function () {
                    console.log('📪 HTTP Server stopped');
                    
                    if (databaseAvailable) {
                        try {
                            await Database.close();
                            console.log('🗄️ Database closed');
                        } catch (error) {
                            console.error('🚨 Error closing database:', error);
                        }
                    }
                    
                    console.log('✅ Graceful shutdown completed');
                    process.exit(0);
                });
                
                // Force-Kill nach 10 Sekunden
                setTimeout(() => {
                    console.error('⏰ Forced shutdown after 10 seconds');
                    process.exit(1);
                }, 10000);
            };
            
            process.on('SIGINT', () => shutdown('SIGINT'));
            process.on('SIGTERM', () => shutdown('SIGTERM'));
            
            return server;
        } catch (error) {
            console.error('🚨 Server startup error:', error);
            process.exit(1);
        }
    };
    
    // Öffentliche API
    return {
        start: start,
        app: app
    };
})();

// Server initialisieren und starten
console.log('🏭 Initializing Extended CORS TaskServer...');
TaskServer.start();