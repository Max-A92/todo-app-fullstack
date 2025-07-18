// database.js - SQLite Datenbank mit Authentication für Todo-App
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config(); // Environment Variables laden

// Database Module Pattern
const Database = (function () {
    'use strict';
    
    // Private Variablen
    let db = null;
    const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'todos.db');
    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    
    // Datenbank initialisieren
    const initialize = async function () {
        console.log('📂 Initialisiere SQLite Datenbank mit Authentication:', DB_PATH);
        
        try {
            // Datenbank öffnen/erstellen
            db = await open({
                filename: DB_PATH,
                driver: sqlite3.Database
            });
            
            console.log('✅ Datenbank verbunden');
            
            // Foreign Keys aktivieren (wichtig für Beziehungen!)
            await db.exec('PRAGMA foreign_keys = ON');
            console.log('🔗 Foreign Keys aktiviert');
            
            // Tabellen erstellen falls nicht existiert
            await createTables();
            
            // Migration von alter Struktur
            await migrateDatabase();
            
            console.log('🎯 Datenbank mit Authentication bereit!');
            
        } catch (error) {
            console.error('🚨 Datenbank Fehler:', error);
            throw error;
        }
    };
    
    // Tabellen erstellen
    const createTables = async function () {
        console.log('📋 Erstelle/überprüfe Tabellen...');
        
        // Users Tabelle erstellen
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        // Tasks Tabelle (neue Version mit user_id)
        const createTasksTable = `
            CREATE TABLE IF NOT EXISTS tasks_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                status TEXT DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt')),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        
        await db.exec(createUsersTable);
        console.log('👥 Users-Tabelle erstellt/überprüft');
        
        await db.exec(createTasksTable);
        console.log('📋 Tasks-Tabelle (mit user_id) erstellt/überprüft');
    };
    
    // Migration von alter zu neuer Datenbankstruktur
    const migrateDatabase = async function () {
        console.log('🔄 Prüfe Datenbank-Migration...');
        
        try {
            // Prüfen ob alte tasks Tabelle existiert (ohne user_id)
            const oldTableInfo = await db.all("PRAGMA table_info(tasks)");
            const hasUserId = oldTableInfo.some(column => column.name === 'user_id');
            
            if (oldTableInfo.length > 0 && !hasUserId) {
                console.log('🔄 Migriere alte Tasks zu neuer Struktur...');
                
                // Demo-User erstellen für Migration
                const demoUser = await createDemoUser();
                
                // Alte Tasks in neue Tabelle kopieren
                await db.exec(`
                    INSERT INTO tasks_new (user_id, text, status, createdAt, updatedAt)
                    SELECT ${demoUser.id}, text, status, createdAt, updatedAt FROM tasks
                `);
                
                // Alte Tabelle löschen und neue umbenennen
                await db.exec('DROP TABLE tasks');
                await db.exec('ALTER TABLE tasks_new RENAME TO tasks');
                
                console.log('✅ Migration abgeschlossen! Alte Tasks dem Demo-User zugeordnet.');
                console.log('👤 Demo-User erstellt - Username: demo, Password: demo123');
                
                // JSON-Backup-Migration
                await migrateFromJson(demoUser.id);
            } else if (oldTableInfo.length === 0) {
                // Keine alte Tabelle, neue Struktur von Anfang an
                await db.exec('ALTER TABLE tasks_new RENAME TO tasks');
                console.log('📊 Neue Tabellen-Struktur eingerichtet');
                
                // JSON-Migration für neuen Setup
                await migrateFromJson(null);
            } else {
                console.log('✅ Datenbank bereits auf neuestem Stand');
            }
        } catch (error) {
            console.error('🚨 Migration Fehler:', error);
        }
    };
    
    // Demo-User für Migration erstellen
    const createDemoUser = async function () {
        const demoUser = {
            username: 'demo',
            email: 'demo@todoapp.local',
            password: 'demo123'
        };
        
        try {
            return await createUser(demoUser.username, demoUser.email, demoUser.password);
        } catch (error) {
            console.log('Demo-User existiert bereits oder Fehler:', error.message);
            // Demo-User laden falls bereits vorhanden
            return await getUserByUsername('demo');
        }
    };
    
    // Migration von JSON zu SQLite (erweitert für User)
    const migrateFromJson = async function (defaultUserId) {
        const fs = require('fs');
        const jsonPath = path.join(__dirname, 'tasks.json');
        
        if (!fs.existsSync(jsonPath)) {
            console.log('📝 Keine tasks.json gefunden - keine JSON-Migration nötig');
            return;
        }
        
        try {
            const jsonData = fs.readFileSync(jsonPath, 'utf8');
            const tasks = JSON.parse(jsonData);
            
            if (Array.isArray(tasks) && tasks.length > 0) {
                console.log('🔄 Migriere', tasks.length, 'Tasks von JSON...');
                
                // Demo-User erstellen falls nicht vorhanden
                let userId = defaultUserId;
                if (!userId) {
                    const demoUser = await createDemoUser();
                    userId = demoUser.id;
                }
                
                // Tasks in neue Struktur migrieren
                for (const task of tasks) {
                    await db.run(
                        'INSERT INTO tasks (user_id, text, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
                        [userId, task.text, task.status, task.createdAt, task.updatedAt]
                    );
                }
                
                console.log('✅ JSON-Migration erfolgreich!');
                fs.renameSync(jsonPath, jsonPath + '.backup');
                console.log('💾 JSON-Datei als .backup gesichert');
            }
        } catch (error) {
            console.error('🚨 JSON-Migration Fehler:', error);
        }
    };
    
    // ===== USER MANAGEMENT FUNCTIONS =====
    
    // Neuen User erstellen (Registration)
    const createUser = async function (username, email, password) {
        console.log('🆕 Erstelle neuen User:', username);
        
        try {
            // Passwort hashen
            const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            
            // User in Datenbank einfügen
            const result = await db.run(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash]
            );
            
            // Neu erstellten User abrufen (ohne password_hash)
            const newUser = await db.get(
                'SELECT id, username, email, createdAt FROM users WHERE id = ?',
                [result.lastID]
            );
            
            console.log('✅ User erstellt mit ID:', result.lastID);
            return newUser;
        } catch (error) {
            console.error('🚨 Fehler beim Erstellen des Users:', error);
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('Username oder Email bereits vergeben');
            }
            throw error;
        }
    };
    
    // User anmelden (Login)
    const authenticateUser = async function (username, password) {
        console.log('🔐 Authentifiziere User:', username);
        
        try {
            // User mit Passwort-Hash laden
            const user = await db.get(
                'SELECT id, username, email, password_hash, createdAt FROM users WHERE username = ?',
                [username]
            );
            
            if (!user) {
                throw new Error('User nicht gefunden');
            }
            
            // Passwort prüfen
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                throw new Error('Falsches Passwort');
            }
            
            // User-Daten ohne password_hash zurückgeben
            const { password_hash, ...userWithoutPassword } = user;
            
            console.log('✅ Authentifizierung erfolgreich für User:', username);
            return userWithoutPassword;
        } catch (error) {
            console.error('🚨 Authentifizierung fehlgeschlagen:', error.message);
            throw error;
        }
    };
    
    // User nach ID laden
    const getUserById = async function (userId) {
        try {
            const user = await db.get(
                'SELECT id, username, email, createdAt FROM users WHERE id = ?',
                [userId]
            );
            
            return user || null;
        } catch (error) {
            console.error('🚨 Fehler beim Laden des Users:', error);
            throw error;
        }
    };
    
    // User nach Username laden
    const getUserByUsername = async function (username) {
        try {
            const user = await db.get(
                'SELECT id, username, email, createdAt FROM users WHERE username = ?',
                [username]
            );
            
            return user || null;
        } catch (error) {
            console.error('🚨 Fehler beim Laden des Users:', error);
            throw error;
        }
    };
    
    // ===== TASK FUNCTIONS (erweitert für User) =====
    
    // Tasks für spezifischen User abrufen
    const getAllTasksForUser = async function (userId) {
        console.log('📚 Lade Tasks für User:', userId);
        
        try {
            const tasks = await db.all(
                'SELECT * FROM tasks WHERE user_id = ? ORDER BY createdAt DESC',
                [userId]
            );
            console.log('✅ Tasks geladen:', tasks.length);
            return tasks;
        } catch (error) {
            console.error('🚨 Fehler beim Laden der Tasks:', error);
            throw error;
        }
    };
    
    // Neue Task für User erstellen
    const createTaskForUser = async function (userId, text) {
        console.log('🆕 Erstelle Task für User:', userId, 'Text:', text);
        
        try {
            const result = await db.run(
                'INSERT INTO tasks (user_id, text) VALUES (?, ?)',
                [userId, text]
            );
            
            // Neu erstellte Task abrufen
            const newTask = await db.get(
                'SELECT * FROM tasks WHERE id = ?',
                [result.lastID]
            );
            
            console.log('✅ Task erstellt mit ID:', result.lastID);
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
            const currentTask = await db.get(
                'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
                [taskId, userId]
            );
            
            if (!currentTask) {
                throw new Error('Task nicht gefunden oder gehört nicht dem User');
            }
            
            // Status umschalten
            const newStatus = currentTask.status === 'offen' ? 'erledigt' : 'offen';
            
            // Task aktualisieren
            await db.run(
                'UPDATE tasks SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
                [newStatus, taskId, userId]
            );
            
            // Aktualisierte Task abrufen
            const updatedTask = await db.get(
                'SELECT * FROM tasks WHERE id = ?',
                [taskId]
            );
            
            console.log('✅ Task Status geändert:', currentTask.status, '→', newStatus);
            return updatedTask;
        } catch (error) {
            console.error('🚨 Fehler beim Status-Wechsel:', error);
            throw error;
        }
    };
    
    // Task Text bearbeiten (nur für eigene Tasks)
    const updateTaskTextForUser = async function (taskId, userId, newText) {
        console.log('✏️ Aktualisiere Text für Task:', taskId, 'User:', userId);
        
        try {
            // Prüfen ob Task dem User gehört
            const currentTask = await db.get(
                'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
                [taskId, userId]
            );
            
            if (!currentTask) {
                throw new Error('Task nicht gefunden oder gehört nicht dem User');
            }
            
            // Text aktualisieren
            await db.run(
                'UPDATE tasks SET text = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
                [newText, taskId, userId]
            );
            
            // Aktualisierte Task abrufen
            const updatedTask = await db.get(
                'SELECT * FROM tasks WHERE id = ?',
                [taskId]
            );
            
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
            const taskToDelete = await db.get(
                'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
                [taskId, userId]
            );
            
            if (!taskToDelete) {
                throw new Error('Task nicht gefunden oder gehört nicht dem User');
            }
            
            // Task löschen
            const result = await db.run(
                'DELETE FROM tasks WHERE id = ? AND user_id = ?',
                [taskId, userId]
            );
            
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
            const result = await db.run(
                'DELETE FROM tasks WHERE status = ? AND user_id = ?',
                ['erledigt', userId]
            );
            
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
    
    // ===== LEGACY FUNCTIONS (für Rückwärtskompatibilität) =====
    
    // Alle Tasks abrufen (für Demo-User)
    const getAllTasks = async function () {
        console.log('📚 Lade alle Tasks (Legacy-Modus)');
        
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
    
    // Task erstellen (für Demo-User)
    const createTask = async function (text) {
        console.log('🆕 Erstelle Task (Legacy-Modus)');
        
        try {
            const demoUser = await getUserByUsername('demo');
            if (demoUser) {
                return await createTaskForUser(demoUser.id, text);
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
    
    // Datenbank schließen
    const close = async function () {
        if (db) {
            await db.close();
            console.log('📪 Datenbank geschlossen');
        }
    };
    
    // Öffentliche API
    return {
        // Initialisierung
        initialize,
        close,
        
        // User Management
        createUser,
        authenticateUser,
        getUserById,
        getUserByUsername,
        
        // Task Management (User-spezifisch)
        getAllTasksForUser,
        createTaskForUser,
        toggleTaskStatusForUser,
        updateTaskTextForUser,
        deleteTaskForUser,
        deleteCompletedTasksForUser,
        
        // Legacy API (für Rückwärtskompatibilität)
        getAllTasks,
        createTask,
        toggleTaskStatus,
        updateTaskText,
        deleteTask,
        deleteCompletedTasks
    };
})();

module.exports = Database;