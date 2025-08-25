// ===== DATABASE CONFIGURATION =====
const path = require('path');
require('dotenv').config();

const DatabaseConfig = {
    // Database Path Configuration
    path: process.env.DATABASE_PATH || path.join(__dirname, '..', 'todos.db'),
    
    // SQLite Configuration
    sqlite: {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        timeout: parseInt(process.env.DB_TIMEOUT) || 5000,
        readonly: process.env.DB_READONLY === 'true',
        fileMustExist: process.env.DB_FILE_MUST_EXIST === 'true'
    },
    
    // Connection Settings
    connection: {
        busyTimeout: parseInt(process.env.DB_BUSY_TIMEOUT) || 30000,
        pragmas: {
            foreignKeys: true,
            journalMode: process.env.DB_JOURNAL_MODE || 'WAL',
            synchronous: process.env.DB_SYNCHRONOUS || 'NORMAL',
            cacheSize: parseInt(process.env.DB_CACHE_SIZE) || -64000,
            tempStore: process.env.DB_TEMP_STORE || 'MEMORY'
        }
    },
    
    // Security Settings
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
        tokenExpiryHours: parseInt(process.env.TOKEN_EXPIRY_HOURS) || 24
    },
    
    // Migration Settings
    migration: {
        autoMigrate: process.env.AUTO_MIGRATE !== 'false',
        backupOnMigration: process.env.BACKUP_ON_MIGRATION !== 'false',
        createDemoUser: process.env.CREATE_DEMO_USER !== 'false'
    },
    
    // Validation Settings
    validation: {
        maxUsernameLength: parseInt(process.env.MAX_USERNAME_LENGTH) || 30,
        minUsernameLength: parseInt(process.env.MIN_USERNAME_LENGTH) || 3,
        maxTaskTextLength: parseInt(process.env.MAX_TASK_TEXT_LENGTH) || 500,
        maxProjectNameLength: parseInt(process.env.MAX_PROJECT_NAME_LENGTH) || 100
    }
};

// Path Validation
const validateDatabasePath = function() {
    const fs = require('fs');
    const dir = path.dirname(DatabaseConfig.path);
    
    if (!fs.existsSync(dir)) {
        console.log('📁 Creating database directory:', dir);
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log('✅ Database directory created successfully');
        } catch (error) {
            console.error('🚨 Failed to create database directory:', error.message);
            throw new Error(`Cannot create database directory: ${dir}`);
        }
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

// Auto-validate path
try {
    validateDatabasePath();
} catch (error) {
    console.error('🚨 Database path validation failed:', error.message);
}

console.log('🗄️ Database Configuration loaded');
console.log('🗄️ Database Path:', DatabaseConfig.path);
console.log('🗄️ Journal Mode:', DatabaseConfig.connection.pragmas.journalMode);
console.log('🗄️ Auto Migration:', DatabaseConfig.migration.autoMigrate);
console.log('🗄️ Demo User Creation:', DatabaseConfig.migration.createDemoUser);

module.exports = DatabaseConfig;