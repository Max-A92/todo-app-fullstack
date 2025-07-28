// database.js - better-sqlite3 Datenbank mit Authentication + E-Mail-Verifikation + KALENDER-INTEGRATION für Todo-App
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs'); // ✅ FIXED: bcryptjs statt bcrypt
const crypto = require('crypto');
require('dotenv').config(); // Environment Variables laden

// Database Module Pattern
const DatabaseModule = (function () {
    'use strict';
    
    // Private Variablen
    let db = null;
    const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'todos.db');
    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    
    // ✅ NEUE FUNKTION: Database Path Validation
    const validateDatabasePath = function(dbPath) {
        const fs = require('fs');
        const path = require('path');
        
        const dir = path.dirname(dbPath);
        
        if (!fs.existsSync(dir)) {
            console.log('📁 Creating database directory:', dir);
            try {
                fs.mkdirSync(dir, { recursive: true });
                console.log('✅ Database directory created successfully');
            } catch (error) {
                console.error('🚨 Failed to create database directory:', error.message);
                throw new Error(`Cannot create database directory: ${dir}`);
            }
        } else {
            console.log('📁 Database directory exists:', dir);
        }
        
        // Prüfe Schreibrechte im Verzeichnis
        try {
            const testFile = path.join(dir, '.write_test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log('✅ Database directory is writable');
        } catch (error) {
            console.error('🚨 Database directory is not writable:', error.message);
            throw new Error(`Database directory not writable: ${dir}`);
        }
    };
    
    // ===== KALENDER-HILFSFUNKTIONEN (NEU) =====
    
    // Datum-Validierung
    const isValidDate = function(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return false;
        }
        
        // Prüfe Format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return false;
        }
        
        // Prüfe ob gültiges Datum
        const date = new Date(dateString + 'T00:00:00.000Z');
        const isValid = date.toISOString().substring(0, 10) === dateString;
        
        console.log(`📅 DEBUG: Datum-Validierung für "${dateString}": ${isValid ? 'GÜLTIG' : 'UNGÜLTIG'}`);
        return isValid;
    };
    
    // Datenbank initialisieren
    const initialize = async function () {
        console.log('📂 Initialisiere better-sqlite3 Datenbank mit E-Mail-Verifikation + KALENDER:', DB_PATH);
        
        try {
            // ✅ NEUE VALIDIERUNG: Database Path validieren
            console.log('🔍 Validating database path...');
            validateDatabasePath(DB_PATH);
            
            // Datenbank öffnen/erstellen
            db = new Database(DB_PATH);
            
            console.log('✅ Datenbank verbunden');
            
            // Foreign Keys aktivieren (wichtig für Beziehungen!)
            db.exec('PRAGMA foreign_keys = ON');
            console.log('🔗 Foreign Keys aktiviert');
            
            // Tabellen erstellen falls nicht existiert
            await createTables();
            
            // Migration von alter Struktur
            await migrateDatabase();
            
            console.log('🎯 Datenbank mit E-Mail-Verifikation + KALENDER bereit!');
            
        } catch (error) {
            console.error('🚨 Datenbank Fehler:', error);
            throw error;
        }
    };
    
    // Tabellen erstellen (MIT KALENDER-INTEGRATION) - FIXED
    const createTables = async function () {
        console.log('📋 Erstelle/überprüfe Tabellen mit E-Mail-Verifikation + KALENDER...');
        
        // ERWEITERTE Users Tabelle mit E-Mail-Verifikation
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                emailVerified INTEGER DEFAULT 0,
                verificationToken TEXT,
                verificationTokenExpires INTEGER,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        // 📅 KORREKTE Tasks Tabelle MIT KALENDER-UNTERSTÜTZUNG 
        const createTasksTable = `
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                status TEXT DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt')),
                dueDate TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        
        db.exec(createUsersTable);
        console.log('👥 Users-Tabelle mit E-Mail-Verifikation erstellt/überprüft');
        
        db.exec(createTasksTable);
        console.log('📋 Tasks-Tabelle mit KALENDER-INTEGRATION erstellt/überprüft');
        
        // ✅ KORREKTE Indizes für finale tasks Tabelle
        db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verificationToken)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(dueDate)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
        console.log('🔍 Datenbank-Indizes für E-Mail-Verifikation + KALENDER erstellt');
    };
    
    // Migration von alter zu neuer Datenbankstruktur (MIT KALENDER) - FIXED
    const migrateDatabase = async function () {
        console.log('🔄 Prüfe Datenbank-Migration für E-Mail-Verifikation + KALENDER...');
        
        try {
            // Prüfen ob tasks Tabelle existiert und welche Spalten sie hat
            const taskTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
            const hasUserId = taskTableInfo.some(column => column.name === 'user_id');
            const hasDueDate = taskTableInfo.some(column => column.name === 'dueDate');
            
            // 📅 FALL 1: Alte Tabelle ohne user_id (vor User-System)
            if (taskTableInfo.length > 0 && !hasUserId) {
                console.log('🔄 Migriere alte Tasks zu User-System mit KALENDER...');
                
                // Demo-User erstellen für Migration
                const demoUser = await createDemoUser();
                
                // Temporary Tabelle mit neuer Struktur erstellen
                db.exec(`
                    CREATE TABLE tasks_temp (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        text TEXT NOT NULL,
                        status TEXT DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt')),
                        dueDate TEXT,
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `);
                
                // Alte Tasks in neue Struktur kopieren (ohne dueDate)
                db.exec(`
                    INSERT INTO tasks_temp (user_id, text, status, createdAt, updatedAt)
                    SELECT ${demoUser.id}, text, status, createdAt, updatedAt FROM tasks
                `);
                
                // Alte Tabelle löschen und neue umbenennen
                db.exec('DROP TABLE tasks');
                db.exec('ALTER TABLE tasks_temp RENAME TO tasks');
                
                // Indizes neu erstellen
                db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)');
                db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(dueDate)');
                db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
                
                console.log('✅ Migration zu User-System + KALENDER abgeschlossen!');
                console.log('👤 Demo-User erstellt - Username: demo, Password: demo123, Email: demo@gmail.com');
                
                // JSON-Backup-Migration
                await migrateFromJson(demoUser.id);
                
            // 📅 FALL 2: User-System vorhanden, aber kein Kalender
            } else if (taskTableInfo.length > 0 && hasUserId && !hasDueDate) {
                console.log('📅 Füge KALENDER-UNTERSTÜTZUNG zu bestehender User-Tabelle hinzu...');
                await migrateCalendarFields();
                
            // 📅 FALL 3: Keine Tabelle vorhanden - alles neu
            } else if (taskTableInfo.length === 0) {
                console.log('📊 Neue Datenbank - Tasks-Tabelle bereits mit KALENDER erstellt');
                
                // Demo-User für neue Datenbank erstellen
                await createDemoUser();
                console.log('👤 Demo-User für neue Datenbank erstellt');
                
                // JSON-Migration für neuen Setup
                await migrateFromJson(null);
                
            // ✅ FALL 4: Alles bereits vorhanden
            } else {
                console.log('✅ Datenbank bereits auf neuestem Stand (User-System + KALENDER)');
                // Stelle sicher, dass Demo-User existiert und verifiziert ist
                await ensureDemoUserExists();
            }
            
            // NEUE: Migration für E-Mail-Verifikation Felder
            await migrateEmailVerificationFields();
            
        } catch (error) {
            console.error('🚨 Migration Fehler:', error);
        }
    };
    
    // 📅 NEUE: Migration für Kalender-Felder
    const migrateCalendarFields = async function () {
        console.log('📅 Prüfe Kalender-Felder Migration...');
        
        try {
            const taskTableInfo = db.prepare("PRAGMA table_info(tasks)").all();
            const hasDueDate = taskTableInfo.some(column => column.name === 'dueDate');
            
            if (!hasDueDate) {
                console.log('📅 Füge dueDate Spalte zur tasks Tabelle hinzu...');
                db.exec('ALTER TABLE tasks ADD COLUMN dueDate TEXT');
                console.log('✅ dueDate Spalte hinzugefügt');
                
                // Index für neue Spalte erstellen
                db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(dueDate)');
                console.log('🔍 Index für dueDate erstellt');
            }
            
            console.log('📅 Kalender-Migration abgeschlossen');
        } catch (error) {
            console.error('🚨 Kalender-Migration Fehler:', error);
        }
    };
    
    // NEUE: Migration für E-Mail-Verifikation Felder
    const migrateEmailVerificationFields = async function () {
        console.log('📧 Prüfe E-Mail-Verifikation Migration...');
        
        try {
            const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
            const hasEmailVerified = userTableInfo.some(column => column.name === 'emailVerified');
            const hasVerificationToken = userTableInfo.some(column => column.name === 'verificationToken');
            const hasVerificationTokenExpires = userTableInfo.some(column => column.name === 'verificationTokenExpires');
            
            if (!hasEmailVerified) {
                db.exec('ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0');
                console.log('✅ emailVerified Feld hinzugefügt');
            }
            
            if (!hasVerificationToken) {
                db.exec('ALTER TABLE users ADD COLUMN verificationToken TEXT');
                console.log('✅ verificationToken Feld hinzugefügt');
            }
            
            if (!hasVerificationTokenExpires) {
                db.exec('ALTER TABLE users ADD COLUMN verificationTokenExpires INTEGER');
                console.log('✅ verificationTokenExpires Feld hinzugefügt');
            }
            
            console.log('📧 E-Mail-Verifikation Migration abgeschlossen');
        } catch (error) {
            console.error('🚨 E-Mail-Verifikation Migration Fehler:', error);
        }
    };
    
    // ✅ KORRIGIERT: Demo-User mit Gmail-Authentifizierung erstellen
    const createDemoUser = async function () {
        const demoUser = {
            username: 'demo',
            email: 'demo@gmail.com', // ← KORRIGIERT: Echte Gmail-Adresse
            password: 'demo123'
        };
        
        try {
            const newUser = await createUser(demoUser.username, demoUser.email, demoUser.password, true); // Auto-verify demo user
            
            console.log('✅ Demo-User mit Gmail erstellt:');
            console.log('👤 Username: demo');
            console.log('📧 Email: demo@gmail.com (verifiziert)');
            console.log('🔑 Password: demo123');
            
            return newUser;
        } catch (error) {
            console.log('Demo-User existiert bereits oder Fehler:', error.message);
            // Demo-User laden falls bereits vorhanden
            const existingUser = await getUserByUsername('demo');
            if (existingUser) {
                // Stelle sicher, dass Demo-User verifiziert ist und richtige Email hat
                if (!existingUser.emailVerified || existingUser.email !== 'demo@gmail.com') {
                    console.log('🔧 Korrigiere Demo-User-Daten...');
                    db.prepare('UPDATE users SET email = ?, emailVerified = 1, verificationToken = NULL, verificationTokenExpires = NULL WHERE username = ?').run('demo@gmail.com', 'demo');
                    console.log('✅ Demo-User korrigiert: Email auf demo@gmail.com und als verifiziert markiert');
                }
                
                // Aktualisierten User laden
                const updatedUser = await getUserByUsername('demo');
                console.log('✅ Demo-User bereit:');
                console.log('👤 Username: demo');
                console.log('📧 Email: demo@gmail.com (verifiziert)');
                console.log('🔑 Password: demo123');
                
                return updatedUser;
            }
            return null;
        }
    };
    
    // ✅ NEUE: Stelle sicher dass Demo-User existiert und korrekt konfiguriert ist
    const ensureDemoUserExists = async function () {
        console.log('🔍 Prüfe Demo-User Existenz und Konfiguration...');
        
        try {
            let demoUser = await getUserByUsername('demo');
            
            if (!demoUser) {
                console.log('👤 Demo-User nicht gefunden - erstelle neuen...');
                demoUser = await createDemoUser();
            } else {
                // Prüfe und korrigiere Demo-User-Konfiguration
                if (!demoUser.emailVerified || demoUser.email !== 'demo@gmail.com') {
                    console.log('🔧 Korrigiere Demo-User-Konfiguration...');
                    db.prepare('UPDATE users SET email = ?, emailVerified = 1, verificationToken = NULL, verificationTokenExpires = NULL WHERE username = ?').run('demo@gmail.com', 'demo');
                    console.log('✅ Demo-User korrigiert: Email auf demo@gmail.com und als verifiziert markiert');
                    
                    // Aktualisierten User laden
                    demoUser = await getUserByUsername('demo');
                }
                
                console.log('✅ Demo-User konfiguriert:');
                console.log('👤 Username: demo');
                console.log('📧 Email: demo@gmail.com (verifiziert)');
                console.log('🔑 Password: demo123');
            }
            
            return demoUser;
        } catch (error) {
            console.error('🚨 Fehler bei Demo-User-Prüfung:', error);
        }
    };
    
    // Migration von JSON zu SQLite (erweitert für User + Kalender) - ENHANCED
    const migrateFromJson = async function (defaultUserId) {
        const fs = require('fs');
        const jsonPath = path.join(__dirname, 'tasks.json');
        
        if (!fs.existsSync(jsonPath)) {
            console.log('📝 Keine tasks.json gefunden - keine JSON-Migration nötig');
            
            // Falls kein defaultUserId und kein JSON, stelle sicher dass Demo-User existiert
            if (!defaultUserId) {
                const demoUser = await getUserByUsername('demo');
                if (!demoUser) {
                    console.log('👤 Erstelle Demo-User für neue Datenbank...');
                    await createDemoUser();
                }
            }
            return;
        }
        
        try {
            const jsonData = fs.readFileSync(jsonPath, 'utf8');
            const tasks = JSON.parse(jsonData);
            
            if (Array.isArray(tasks) && tasks.length > 0) {
                console.log('🔄 Migriere', tasks.length, 'Tasks von JSON mit KALENDER-UNTERSTÜTZUNG...');
                
                // Demo-User erstellen falls nicht vorhanden
                let userId = defaultUserId;
                if (!userId) {
                    const demoUser = await createDemoUser();
                    userId = demoUser.id;
                }
                
                // Tasks in neue Struktur migrieren (mit dueDate Support)
                const insertStmt = db.prepare('INSERT INTO tasks (user_id, text, status, dueDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
                for (const task of tasks) {
                    // Legacy-Tasks haben möglicherweise kein dueDate
                    const dueDate = task.dueDate || null;
                    insertStmt.run(userId, task.text, task.status, dueDate, task.createdAt, task.updatedAt);
                }
                
                console.log('✅ JSON-Migration mit KALENDER-UNTERSTÜTZUNG erfolgreich!');
                fs.renameSync(jsonPath, jsonPath + '.backup');
                console.log('💾 JSON-Datei als .backup gesichert');
            } else {
                // Leeres JSON aber kein defaultUserId - erstelle Demo-User
                if (!defaultUserId) {
                    await createDemoUser();
                }
            }
        } catch (error) {
            console.error('🚨 JSON-Migration Fehler:', error);
            // Bei Fehler trotzdem Demo-User erstellen falls nötig
            if (!defaultUserId) {
                try {
                    await createDemoUser();
                } catch (demoError) {
                    console.error('🚨 Auch Demo-User-Erstellung fehlgeschlagen:', demoError);
                }
            }
        }
    };
    
    // ===== E-MAIL-VERIFIKATION HILFSFUNKTIONEN =====
    
    // Verifikations-Token erstellen
    const createVerificationToken = function() {
        return crypto.randomBytes(32).toString('hex');
    };
    
    // ===== USER MANAGEMENT FUNCTIONS (erweitert) =====
    
    // Neuen User erstellen (Registration) mit E-Mail-Verifikation
    const createUser = async function (username, email, password, autoVerify = false) {
        console.log('🆕 Erstelle neuen User mit E-Mail-Verifikation:', username, 'Email:', email);
        
        try {
            // Passwort hashen
            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            
            // Verifikations-Token erstellen (24h gültig)
            const verificationToken = createVerificationToken();
            const verificationTokenExpires = Date.now() + (24 * 60 * 60 * 1000); // 24 Stunden
            const emailVerified = autoVerify ? 1 : 0;
            
            // User in Datenbank einfügen
            const insertStmt = db.prepare(`INSERT INTO users (username, email, password_hash, emailVerified, verificationToken, verificationTokenExpires) 
                 VALUES (?, ?, ?, ?, ?, ?)`);
            const result = insertStmt.run(username, email, passwordHash, emailVerified, 
                 autoVerify ? null : verificationToken, 
                 autoVerify ? null : verificationTokenExpires);
            
            // Neu erstellten User abrufen (ohne password_hash)
            const newUser = db.prepare('SELECT id, username, email, emailVerified, verificationToken, createdAt FROM users WHERE id = ?').get(result.lastInsertRowid);
            
            console.log('✅ User erstellt mit ID:', result.lastInsertRowid, autoVerify ? '(Auto-verifiziert)' : '(E-Mail-Verifikation erforderlich)');
            return newUser;
        } catch (error) {
            console.error('🚨 Fehler beim Erstellen des Users:', error);
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('Username oder Email bereits vergeben');
            }
            throw error;
        }
    };
    
    // User anmelden (Login) mit E-Mail-Verifikation
    const authenticateUser = async function (username, password) {
        console.log('🔐 Authentifiziere User mit E-Mail-Verifikation:', username);
        
        try {
            // User mit Passwort-Hash laden
            const user = db.prepare('SELECT id, username, email, password_hash, emailVerified, createdAt FROM users WHERE username = ?').get(username);
            
            if (!user) {
                throw new Error('User nicht gefunden');
            }
            
            // Passwort prüfen
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                throw new Error('Falsches Passwort');
            }
            
            // E-Mail-Verifikation prüfen
            if (!user.emailVerified) {
                throw new Error('E-Mail nicht verifiziert. Bitte prüfe deine E-Mails und bestätige deine E-Mail-Adresse.');
            }
            
            // User-Daten ohne password_hash zurückgeben
            const { password_hash, ...userWithoutPassword } = user;
            
            console.log('✅ Authentifizierung erfolgreich für User:', username, 'Email:', userWithoutPassword.email);
            return userWithoutPassword;
        } catch (error) {
            console.error('🚨 Authentifizierung fehlgeschlagen:', error.message);
            throw error;
        }
    };
    
    // E-Mail als verifiziert markieren
    const verifyUserEmail = async function (token) {
        console.log('✅ Verifiziere E-Mail mit Token:', token);
        
        try {
            // User mit Token finden
            const user = db.prepare('SELECT * FROM users WHERE verificationToken = ? AND verificationTokenExpires > ?').get(token, Date.now());
            
            if (!user) {
                throw new Error('Ungültiger oder abgelaufener Verifikations-Token');
            }
            
            // E-Mail als verifiziert markieren
            db.prepare('UPDATE users SET emailVerified = 1, verificationToken = NULL, verificationTokenExpires = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
            
            // Aktualisierten User abrufen
            const verifiedUser = db.prepare('SELECT id, username, email, emailVerified, createdAt FROM users WHERE id = ?').get(user.id);
            
            console.log('🎉 E-Mail erfolgreich verifiziert für User:', user.username);
            return verifiedUser;
        } catch (error) {
            console.error('🚨 Fehler bei E-Mail-Verifikation:', error);
            throw error;
        }
    };
    
    // Neuen Verifikations-Token senden
    const resendVerificationToken = async function (email) {
        console.log('📧 Sende neuen Verifikations-Token für:', email);
        
        try {
            // User finden
            const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            
            if (!user) {
                throw new Error('E-Mail-Adresse nicht gefunden');
            }
            
            if (user.emailVerified) {
                throw new Error('E-Mail bereits verifiziert');
            }
            
            // Neuen Token erstellen
            const verificationToken = createVerificationToken();
            const verificationTokenExpires = Date.now() + (24 * 60 * 60 * 1000);
            
            // Token aktualisieren
            db.prepare('UPDATE users SET verificationToken = ?, verificationTokenExpires = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(verificationToken, verificationTokenExpires, user.id);
            
            const updatedUser = db.prepare('SELECT id, username, email, verificationToken FROM users WHERE id = ?').get(user.id);
            
            console.log('✅ Neuer Verifikations-Token erstellt');
            return updatedUser;
        } catch (error) {
            console.error('🚨 Fehler beim Erstellen des neuen Tokens:', error);
            throw error;
        }
    };
    
    // User nach ID laden
    const getUserById = async function (userId) {
        try {
            const user = db.prepare('SELECT id, username, email, emailVerified, createdAt FROM users WHERE id = ?').get(userId);
            return user || null;
        } catch (error) {
            console.error('🚨 Fehler beim Laden des Users:', error);
            throw error;
        }
    };
    
    // User nach Username laden
    const getUserByUsername = async function (username) {
        try {
            const user = db.prepare('SELECT id, username, email, emailVerified, createdAt FROM users WHERE username = ?').get(username);
            return user || null;
        } catch (error) {
            console.error('🚨 Fehler beim Laden des Users:', error);
            throw error;
        }
    };
    
    // User nach E-Mail laden
    const getUserByEmail = async function (email) {
        try {
            const user = db.prepare('SELECT id, username, email, emailVerified, createdAt FROM users WHERE email = ?').get(email);
            return user || null;
        } catch (error) {
            console.error('🚨 Fehler beim Laden des Users:', error);
            throw error;
        }
    };
    
    // ===== TASK FUNCTIONS MIT KALENDER-INTEGRATION (erweitert für User) =====
    
    // Tasks für spezifischen User abrufen (MIT KALENDER-DATEN)
    const getAllTasksForUser = async function (userId) {
        console.log('📚 Lade Tasks mit KALENDER-DATEN für User:', userId);
        
        try {
            const tasks = db.prepare('SELECT id, user_id, text, status, dueDate, createdAt, updatedAt FROM tasks WHERE user_id = ? ORDER BY createdAt DESC').all(userId);
            console.log('✅ Tasks mit KALENDER-DATEN geladen:', tasks.length);
            
            // Debug: Zeige Tasks mit Datum
            tasks.forEach(task => {
                if (task.dueDate) {
                    console.log(`📅 DEBUG: Task "${task.text}" hat Fälligkeitsdatum: ${task.dueDate}`);
                }
            });
            
            return tasks;
        } catch (error) {
            console.error('🚨 Fehler beim Laden der Tasks:', error);
            throw error;
        }
    };
    
    // 📅 Task für User erstellen MIT KALENDER-UNTERSTÜTZUNG
    const createTaskForUser = async function (userId, text, dueDate = null) {
        console.log('🆕 Erstelle Task mit KALENDER für User:', userId, 'Text:', text, 'DueDate:', dueDate);
        
        try {
            // Datum-Validierung falls vorhanden
            if (dueDate && !isValidDate(dueDate)) {
                throw new Error('Ungültiges Datum-Format. Erwartet: YYYY-MM-DD');
            }
            
            const result = db.prepare('INSERT INTO tasks (user_id, text, dueDate) VALUES (?, ?, ?)').run(userId, text, dueDate);
            
            // Neu erstellte Task abrufen
            const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
            
            console.log('✅ Task mit KALENDER erstellt - ID:', result.lastInsertRowid, 'DueDate:', dueDate);
            return newTask;
        } catch (error) {
            console.error('🚨 Fehler beim Erstellen der Task:', error);
            throw error;
        }
    };
    
    // Task Status ändern (nur für eigene Tasks)
    const toggleTaskStatusForUser = async function (taskId, userId) {
        console.log('🔄 Ändere Status für Task:', taskId, 'User:', userId);
        
        try {
            // Prüfen ob Task dem User gehört
            const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
            
            if (!currentTask) {
                throw new Error('Task nicht gefunden oder gehört nicht dem User');
            }
            
            // Status umschalten
            const newStatus = currentTask.status === 'offen' ? 'erledigt' : 'offen';
            
            // Task aktualisieren
            db.prepare('UPDATE tasks SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(newStatus, taskId, userId);
            
            // Aktualisierte Task abrufen
            const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
            
            console.log('✅ Task Status geändert:', currentTask.status, '→', newStatus);
            return updatedTask;
        } catch (error) {
            console.error('🚨 Fehler beim Status-Wechsel:', error);
            throw error;
        }
    };
    
    // 📅 Task-Datum aktualisieren (nur für eigene Tasks)
    const updateTaskDateForUser = async function (taskId, userId, dueDate) {
        console.log('📅 Aktualisiere Datum für Task:', taskId, 'User:', userId, 'NewDate:', dueDate);
        
        try {
            // Prüfen ob Task dem User gehört
            const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
            
            if (!currentTask) {
                throw new Error('Task nicht gefunden oder gehört nicht dem User');
            }
            
            // Datum-Validierung falls vorhanden
            if (dueDate && !isValidDate(dueDate)) {
                throw new Error('Ungültiges Datum-Format. Erwartet: YYYY-MM-DD');
            }
            
            // Datum aktualisieren
            db.prepare('UPDATE tasks SET dueDate = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(dueDate, taskId, userId);
            
            // Aktualisierte Task abrufen
            const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
            
            console.log('✅ Task Datum aktualisiert:', currentTask.dueDate, '→', dueDate);
            return updatedTask;
        } catch (error) {
            console.error('🚨 Fehler beim Datum-Update:', error);
            throw error;
        }
    };
    
    // Task Text bearbeiten (nur für eigene Tasks)
    const updateTaskTextForUser = async function (taskId, userId, newText) {
        console.log('✏️ Aktualisiere Text für Task:', taskId, 'User:', userId);
        
        try {
            // Prüfen ob Task dem User gehört
            const currentTask = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
            
            if (!currentTask) {
                throw new Error('Task nicht gefunden oder gehört nicht dem User');
            }
            
            // Text aktualisieren
            db.prepare('UPDATE tasks SET text = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(newText, taskId, userId);
            
            // Aktualisierte Task abrufen
            const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
            
            console.log('✅ Task Text aktualisiert');
            return updatedTask;
        } catch (error) {
            console.error('🚨 Fehler beim Text-Update:', error);
            throw error;
        }
    };
    
    // Task löschen (nur für eigene Tasks)
    const deleteTaskForUser = async function (taskId, userId) {
        console.log('🗑️ Lösche Task:', taskId, 'User:', userId);
        
        try {
            // Task vor dem Löschen abrufen und prüfen
            const taskToDelete = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
            
            if (!taskToDelete) {
                throw new Error('Task nicht gefunden oder gehört nicht dem User');
            }
            
            // Task löschen
            const result = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, userId);
            
            if (result.changes === 0) {
                throw new Error('Task konnte nicht gelöscht werden');
            }
            
            console.log('✅ Task gelöscht');
            return taskToDelete;
        } catch (error) {
            console.error('🚨 Fehler beim Löschen:', error);
            throw error;
        }
    };
    
    // Alle erledigten Tasks für User löschen
    const deleteCompletedTasksForUser = async function (userId) {
        console.log('🧹 Lösche alle erledigten Tasks für User:', userId);
        
        try {
            const result = db.prepare('DELETE FROM tasks WHERE status = ? AND user_id = ?').run('erledigt', userId);
            
            console.log('✅ Erledigte Tasks gelöscht:', result.changes);
            return {
                deletedCount: result.changes,
                message: result.changes + ' erledigte Aufgaben gelöscht'
            };
        } catch (error) {
            console.error('🚨 Fehler beim Bulk-Delete:', error);
            throw error;
        }
    };
    
    // ===== LEGACY FUNCTIONS MIT KALENDER-UNTERSTÜTZUNG (für Rückwärtskompatibilität) =====
    
    // Alle Tasks abrufen (für Demo-User) - MIT KALENDER
    const getAllTasks = async function () {
        console.log('📚 Lade alle Tasks mit KALENDER (Legacy-Modus)');
        
        try {
            // Demo-User suchen
            const demoUser = await getUserByUsername('demo');
            if (demoUser) {
                return await getAllTasksForUser(demoUser.id);
            } else {
                console.log('⚠️ Kein Demo-User gefunden für Legacy-Modus');
                return [];
            }
        } catch (error) {
            console.error('🚨 Fehler im Legacy-Modus:', error);
            return [];
        }
    };
    
    // 📅 Task erstellen MIT KALENDER (für Demo-User)
    const createTask = async function (text, dueDate = null) {
        console.log('🆕 Erstelle Task mit KALENDER (Legacy-Modus)');
        
        try {
            const demoUser = await getUserByUsername('demo');
            if (demoUser) {
                return await createTaskForUser(demoUser.id, text, dueDate);
            } else {
                throw new Error('Demo-User nicht gefunden für Legacy-Modus');
            }
        } catch (error) {
            console.error('🚨 Fehler im Legacy-Modus:', error);
            throw error;
        }
    };
    
    // Task Status ändern (für Demo-User)
    const toggleTaskStatus = async function (taskId) {
        const demoUser = await getUserByUsername('demo');
        if (demoUser) {
            return await toggleTaskStatusForUser(taskId, demoUser.id);
        } else {
            throw new Error('Demo-User nicht gefunden für Legacy-Modus');
        }
    };
    
    // 📅 Task-Datum aktualisieren (für Demo-User)
    const updateTaskDate = async function (taskId, dueDate) {
        console.log('📅 Aktualisiere Task-Datum (Legacy-Modus)');
        
        const demoUser = await getUserByUsername('demo');
        if (demoUser) {
            return await updateTaskDateForUser(taskId, demoUser.id, dueDate);
        } else {
            throw new Error('Demo-User nicht gefunden für Legacy-Modus');
        }
    };
    
    // Task Text bearbeiten (für Demo-User)
    const updateTaskText = async function (taskId, newText) {
        const demoUser = await getUserByUsername('demo');
        if (demoUser) {
            return await updateTaskTextForUser(taskId, demoUser.id, newText);
        } else {
            throw new Error('Demo-User nicht gefunden für Legacy-Modus');
        }
    };
    
    // Task löschen (für Demo-User)
    const deleteTask = async function (taskId) {
        const demoUser = await getUserByUsername('demo');
        if (demoUser) {
            return await deleteTaskForUser(taskId, demoUser.id);
        } else {
            throw new Error('Demo-User nicht gefunden für Legacy-Modus');
        }
    };
    
    // Alle erledigten Tasks löschen (für Demo-User)
    const deleteCompletedTasks = async function () {
        const demoUser = await getUserByUsername('demo');
        if (demoUser) {
            return await deleteCompletedTasksForUser(demoUser.id);
        } else {
            throw new Error('Demo-User nicht gefunden für Legacy-Modus');
        }
    };
    
    // ===== KALENDER-SPEZIFISCHE UTILITY FUNCTIONS (NEU) =====
    
    // Tasks nach Datum filtern
    const getTasksByDateRange = async function (userId, startDate, endDate) {
        console.log('📅 Lade Tasks nach Datum-Range für User:', userId, 'von', startDate, 'bis', endDate);
        
        try {
            const tasks = db.prepare(`
                SELECT * FROM tasks 
                WHERE user_id = ? AND dueDate BETWEEN ? AND ? 
                ORDER BY dueDate ASC, createdAt DESC
            `).all(userId, startDate, endDate);
            
            console.log('✅ Tasks nach Datum geladen:', tasks.length);
            return tasks;
        } catch (error) {
            console.error('🚨 Fehler beim Laden der Tasks nach Datum:', error);
            throw error;
        }
    };
    
    // Überfällige Tasks abrufen
    const getOverdueTasks = async function (userId) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        console.log('🔴 Lade überfällige Tasks für User:', userId, 'vor', today);
        
        try {
            const tasks = db.prepare(`
                SELECT * FROM tasks 
                WHERE user_id = ? AND dueDate < ? AND status = 'offen'
                ORDER BY dueDate ASC
            `).all(userId, today);
            
            console.log('⚠️ Überfällige Tasks gefunden:', tasks.length);
            return tasks;
        } catch (error) {
            console.error('🚨 Fehler beim Laden überfälliger Tasks:', error);
            throw error;
        }
    };
    
    // Tasks für heute abrufen
    const getTodayTasks = async function (userId) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        console.log('🟡 Lade heutige Tasks für User:', userId, 'für', today);
        
        try {
            const tasks = db.prepare(`
                SELECT * FROM tasks 
                WHERE user_id = ? AND dueDate = ?
                ORDER BY createdAt DESC
            `).all(userId, today);
            
            console.log('📅 Heutige Tasks gefunden:', tasks.length);
            return tasks;
        } catch (error) {
            console.error('🚨 Fehler beim Laden heutiger Tasks:', error);
            throw error;
        }
    };
    
    // Datenbank schließen
    const close = async function () {
        if (db) {
            db.close();
            console.log('📪 Datenbank geschlossen');
        }
    };
    
    // 📅 ERWEITERTE ÖFFENTLICHE API MIT KALENDER-INTEGRATION
    return {
        // Initialisierung
        initialize,
        close,
        
        // User Management (mit E-Mail-Verifikation)
        createUser,
        authenticateUser,
        getUserById,
        getUserByUsername,
        getUserByEmail,
        
        // E-Mail-Verifikation
        verifyUserEmail,
        resendVerificationToken,
        
        // Task Management (User-spezifisch) MIT KALENDER
        getAllTasksForUser,
        createTaskForUser,          // ← ERWEITERT mit dueDate
        toggleTaskStatusForUser,
        updateTaskDateForUser,      // ← NEU: Datum-Update
        updateTaskTextForUser,
        deleteTaskForUser,
        deleteCompletedTasksForUser,
        
        // Kalender-spezifische Funktionen (NEU)
        getTasksByDateRange,        // ← NEU
        getOverdueTasks,            // ← NEU
        getTodayTasks,              // ← NEU
        
        // Legacy API MIT KALENDER-UNTERSTÜTZUNG (für Rückwärtskompatibilität)
        getAllTasks,
        createTask,                 // ← ERWEITERT mit dueDate
        toggleTaskStatus,
        updateTaskDate,             // ← NEU: Legacy Datum-Update
        updateTaskText,
        deleteTask,
        deleteCompletedTasks,
        
        // Utility
        isValidDate                 // ← NEU: Datum-Validierung
    };
})();

module.exports = DatabaseModule;