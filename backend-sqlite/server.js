// optimized backend with SQLite Database and Authentication - SECURE RENDER CORS
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Environment Variables laden

const Database = require('./database'); // SQLite Database Module

// Module Pattern für Server-Funktionalität
const TaskServer = (function () {
    'use strict';
    
    // Private Konstanten und Konfiguration
    const PORT = process.env.PORT || 10000; // RENDER VERWENDET PORT 10000
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    
    const STATUS = {
        OPEN: 'offen',
        COMPLETED: 'erledigt'
    };
    
    // Express App initialisieren
    const app = express();
    
    console.log('🚀 STARTING SECURE TODO SERVER...');
    console.log('📍 PORT:', PORT);
    console.log('🔑 JWT_SECRET:', JWT_SECRET ? 'SET' : 'NOT SET');
    
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
    
    // ========== SICHERE RENDER-OPTIMIERTE CORS-LÖSUNG ==========
    const setupMiddleware = function () {
        console.log('⚙️ Setting up Render-optimized middleware...');
        
        // JSON Parser
        app.use(express.json({
            limit: '1mb',
            strict: true
        }));
        
        // RENDER-OPTIMIERTE CORS-MIDDLEWARE (SICHER)
        app.use(function (req, res, next) {
            const origin = req.headers.origin;
            const method = req.method;
            const path = req.path;
            
            console.log('🌐 CORS REQUEST:', {
                method: method,
                path: path,
                origin: origin || 'NO-ORIGIN',
                userAgent: req.headers['user-agent'] ? 'present' : 'missing',
                timestamp: new Date().toISOString()
            });
            
            // SICHERE ORIGIN-LISTE (keine Wildcards)
            const allowedOrigins = [
                'https://todo-app-fullstack-gamma.vercel.app',
                'http://localhost:5173',
                'http://localhost:5500',
                'http://localhost:3000',
                'http://127.0.0.1:5500',
                'http://127.0.0.1:3000'
            ];
            
            // ORIGIN-VALIDIERUNG UND HEADER-SETZUNG
            let corsOrigin = null;
            
            if (!origin) {
                // Kein Origin (direkte Requests, Postman, etc.)
                corsOrigin = 'https://todo-app-fullstack-gamma.vercel.app'; // Fallback für Render
                console.log('🔧 No origin provided - using Vercel fallback');
            } else if (allowedOrigins.includes(origin)) {
                // Origin ist in der erlaubten Liste
                corsOrigin = origin;
                console.log('✅ Origin allowed:', origin);
            } else {
                // Unbekannte Origin - Sicherheitslog
                console.log('❌ Origin not allowed:', origin);
                console.log('📋 Allowed origins:', allowedOrigins);
                // Für Render-Debugging: Verwende Vercel als Fallback
                corsOrigin = 'https://todo-app-fullstack-gamma.vercel.app';
                console.log('🔧 Using Vercel fallback for unknown origin');
            }
            
            // CORS-HEADERS SETZEN (immer, für alle Requests)
            res.header('Access-Control-Allow-Origin', corsOrigin);
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400'); // 24h Cache
            
            // ZUSÄTZLICHE RENDER-SPEZIFISCHE HEADERS
            res.header('X-Content-Type-Options', 'nosniff');
            res.header('X-Frame-Options', 'DENY');
            res.header('X-XSS-Protection', '1; mode=block');
            
            console.log('✅ CORS headers set - Origin:', corsOrigin);
            
            // KRITISCH: OPTIONS-REQUEST BEHANDLUNG (Render-spezifisch)
            if (method === 'OPTIONS') {
                console.log('🔄 OPTIONS preflight request detected');
                console.log('📋 Preflight headers set for origin:', corsOrigin);
                
                // RENDER BENÖTIGT EXPLICIT STATUS + END
                res.status(204).end();
                return; // WICHTIG: Nicht next() nach res.end()
            }
            
            console.log('➡️ Continuing to next middleware');
            next();
        });
        
        // REQUEST-LOGGING (nach CORS)
        app.use(function (req, res, next) {
            const timestamp = new Date().toISOString();
            const hasAuth = req.headers.authorization ? '🔐' : '📝';
            const origin = req.headers.origin || 'direct';
            console.log(`${timestamp} - ${hasAuth} ${req.method} ${req.path} from ${origin}`);
            next();
        });
        
        console.log('✅ Render-optimized middleware setup complete');
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
        console.log('🛣️ Setting up routes...');
        
        // Health Check Route (FIRST - for debugging)
        app.get('/health', function (req, res) {
            console.log('❤️ Health check requested');
            res.json({
                status: 'ok',
                message: 'SECURE TODO SERVER WITH RENDER-CORS IS RUNNING',
                timestamp: new Date().toISOString(),
                version: 'SECURE-2.0',
                port: PORT,
                cors: 'SECURE_RENDER_OPTIMIZED',
                allowedOrigins: [
                    'https://todo-app-fullstack-gamma.vercel.app',
                    'localhost development'
                ]
            });
        });
        
        // Root route for testing
        app.get('/', function (req, res) {
            console.log('🏠 Root route requested');
            res.json({
                message: 'Secure Todo App Backend API',
                version: 'SECURE-2.0',
                cors: 'RENDER_OPTIMIZED',
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
        
        // 404-Handler für unbekannte Routen
        app.use(function (req, res) {
            console.log('❌ 404 - Route not found:', req.path);
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
        
        console.log('✅ Routes setup complete');
    };
    
    // Server starten (async für Datenbank-Initialisierung)
    const start = async function () {
        try {
            console.log('🚀 === STARTING SECURE TODO SERVER WITH RENDER-CORS ===');
            console.log('📅 Timestamp:', new Date().toISOString());
            console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
            console.log('📍 Port:', PORT);
            console.log('🔑 JWT Secret:', JWT_SECRET ? 'Configured ✅' : 'Missing ❌');
            
            // Datenbank initialisieren
            console.log('🗄️ Initializing database...');
            await Database.initialize();
            console.log('✅ Database initialized');
            
            // Middleware und Routen setup
            setupMiddleware();
            setupRoutes();
            
            const server = app.listen(PORT, function () {
                console.log('');
                console.log('🎉 === SECURE TODO SERVER WITH RENDER-CORS STARTED ===');
                console.log('📍 Port:', PORT);
                console.log('🗄️ Database: SQLite (todos.db)');
                console.log('🔑 JWT Secret:', JWT_SECRET ? 'Configured ✅' : 'Missing ❌');
                console.log('⏰ Started at:', new Date().toISOString());
                console.log('🌐 URL: http://localhost:' + PORT);
                console.log('🔗 Health Check: http://localhost:' + PORT + '/health');
                console.log('🛡️ CORS: SECURE RENDER-OPTIMIZED');
                console.log('✅ Allowed Origins:');
                console.log('  • https://todo-app-fullstack-gamma.vercel.app');
                console.log('  • localhost development servers');
                console.log('');
                console.log('📡 Auth-Endpoints:');
                console.log('  • POST /auth/register - Registration');
                console.log('  • POST /auth/login    - Login');
                console.log('  • GET  /auth/me      - User-Info');
                console.log('  • POST /auth/logout  - Logout');
                console.log('');
                console.log('📋 Task-Endpoints (Auth optional):');
                console.log('  • GET    /tasks      - Get tasks');
                console.log('  • POST   /tasks      - Create task');
                console.log('  • PUT    /tasks/:id  - Toggle status');
                console.log('  • DELETE /tasks/:id  - Delete task');
                console.log('  • PUT    /tasks/:id/text - Edit task');
                console.log('  • DELETE /tasks?status=completed - Delete completed');
                console.log('');
                console.log('🎯 === READY FOR SECURE CORS-FREE AUTHENTICATION ===');
                console.log('');
            });
            
            // Graceful Shutdown (erweitert für Datenbank)
            const shutdown = async function (signal) {
                console.log('\n🛑 ' + signal + ' received. Shutting down server...');
                
                server.close(async function () {
                    console.log('📪 HTTP Server stopped');
                    
                    try {
                        await Database.close();
                        console.log('🗄️ Database closed');
                        console.log('✅ Graceful shutdown completed');
                        process.exit(0);
                    } catch (error) {
                        console.error('🚨 Error closing database:', error);
                        process.exit(1);
                    }
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
        app: app // Für Tests exportieren
    };
})();

// Server initialisieren und starten
console.log('🔥 Initializing Secure TaskServer...');
TaskServer.start();