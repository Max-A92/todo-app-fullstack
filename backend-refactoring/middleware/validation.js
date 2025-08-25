// ===== VALIDATION MIDDLEWARE =====
const DatabaseConfig = require('../config/database');

// Standard-Validierungsfunktionen (erweitert)
const isValidTaskText = function (text) {
    return typeof text === 'string' && 
           text.trim() !== '' && 
           text.trim().length <= DatabaseConfig.validation.maxTaskTextLength;
};

const isValidTaskId = function (id) {
    const numId = Number(id);
    return Number.isInteger(numId) && numId > 0;
};

const isValidProjectId = function (id) {
    const numId = Number(id);
    return Number.isInteger(numId) && numId > 0;
};

const isValidProjectName = function (name) {
    return typeof name === 'string' && 
           name.trim() !== '' && 
           name.trim().length <= DatabaseConfig.validation.maxProjectNameLength;
};

const isValidUsername = function (username) {
    return typeof username === 'string' && 
           username.trim().length >= DatabaseConfig.validation.minUsernameLength && 
           username.trim().length <= DatabaseConfig.validation.maxUsernameLength &&
           /^[a-zA-Z0-9_-]+$/.test(username.trim());
};

// ===== KALENDER-VALIDIERUNG =====
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

const isValidPassword = function (password) {
    return typeof password === 'string' && 
           password.length >= 6 && 
           password.length <= 100;
};

// Email Validation (Basic - detaillierte Validation ist im EmailValidator in server.js)
const isValidEmailFormat = function (email) {
    return typeof email === 'string' && 
           email.includes('@') && 
           email.length >= 5 && 
           email.length <= 254;
};

// Validation Middleware Factory
const validateInput = function(validationRules) {
    return function(req, res, next) {
        const errors = [];
        
        for (const [field, validator] of Object.entries(validationRules)) {
            const value = req.body[field];
            
            if (validator.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} ist erforderlich`);
                continue;
            }
            
            if (value !== undefined && value !== null && validator.validate && !validator.validate(value)) {
                errors.push(validator.message || `${field} ist ungültig`);
            }
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validierungsfehler',
                message: 'Eingabedaten sind ungültig',
                details: errors
            });
        }
        
        next();
    };
};

// Spezifische Validation Middleware
const validateTaskCreation = validateInput({
    text: {
        required: true,
        validate: isValidTaskText,
        message: 'Task-Text ist erforderlich und darf maximal ' + DatabaseConfig.validation.maxTaskTextLength + ' Zeichen haben'
    },
    dueDate: {
        required: false,
        validate: isValidDate,
        message: 'Datum muss im Format YYYY-MM-DD vorliegen'
    },
    project_id: {
        required: false,
        validate: isValidProjectId,
        message: 'Projekt-ID muss eine positive Ganzzahl sein'
    }
});

const validateUserRegistration = validateInput({
    username: {
        required: true,
        validate: isValidUsername,
        message: `Username: ${DatabaseConfig.validation.minUsernameLength}-${DatabaseConfig.validation.maxUsernameLength} Zeichen, nur Buchstaben, Zahlen, _ und -`
    },
    email: {
        required: true,
        validate: isValidEmailFormat,
        message: 'Gültige E-Mail-Adresse erforderlich'
    },
    password: {
        required: true,
        validate: isValidPassword,
        message: 'Passwort: 6-100 Zeichen erforderlich'
    }
});

const validateUserLogin = validateInput({
    username: {
        required: true,
        validate: (value) => typeof value === 'string' && value.trim().length > 0,
        message: 'Username ist erforderlich'
    },
    password: {
        required: true,
        validate: (value) => typeof value === 'string' && value.length > 0,
        message: 'Passwort ist erforderlich'
    }
});

const validateProjectCreation = validateInput({
    name: {
        required: true,
        validate: isValidProjectName,
        message: 'Projektname ist erforderlich und darf maximal ' + DatabaseConfig.validation.maxProjectNameLength + ' Zeichen haben'
    }
});

console.log('✅ Validation Middleware loaded');
console.log('📏 Validation Limits:');
console.log(`  • Username: ${DatabaseConfig.validation.minUsernameLength}-${DatabaseConfig.validation.maxUsernameLength} characters`);
console.log(`  • Task Text: max ${DatabaseConfig.validation.maxTaskTextLength} characters`);
console.log(`  • Project Name: max ${DatabaseConfig.validation.maxProjectNameLength} characters`);

module.exports = {
    // Validation Functions
    isValidTaskText,
    isValidTaskId,
    isValidProjectId,
    isValidProjectName,
    isValidUsername,
    isValidDate,
    isValidPassword,
    isValidEmailFormat,
    
    // Validation Middleware
    validateInput,
    validateTaskCreation,
    validateUserRegistration,
    validateUserLogin,
    validateProjectCreation
};