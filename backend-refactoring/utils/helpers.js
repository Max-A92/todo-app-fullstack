// ===== HELPER UTILITIES =====
console.log('🔧 Helpers loading...');

const Helpers = {
    
    // ✅ VERBESSERTE FUNKTION: CORS Origin Validierung
    validateCorsOrigins: function(origins) {
        return origins.filter(origin => {
            try {
                if (origin === 'null') return true; // Spezialfall für lokale HTML-Dateien
                new URL(origin); // Prüft ob URL valid ist
                return true;
            } catch {
                console.warn('⚠️ Invalid CORS origin:', origin);
                return false; // Entfernt ungültige URLs
            }
        });
    },
    
    // ✅ VERBESSERTE FUNKTION: Environment Variable Validierung (Development-freundlich)
    validateRequiredEnvVars: function() {
        const SecurityConfig = require('../config/security');
        
        // Nur in Production strikt validieren
        if (SecurityConfig.nodeEnv !== 'production') {
            console.log('⚠️ Development mode: Skipping strict environment validation');
            return;
        }
        
        const required = [
            'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'FRONTEND_URL'
        ];
        
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            console.error('🚨 Missing required environment variables:', missing);
            console.error('🛑 Server cannot start without these critical variables');
            process.exit(1);
        }
        
        console.log('✅ All required environment variables are set');
    },
    
    // Format uptime helper
    formatUptime: function(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    },
    
    // IP Address extractor
    extractIP: function(req) {
        return req.headers['x-forwarded-for'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               '127.0.0.1';
    },
    
    // Safe JSON parse
    safeJsonParse: function(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('⚠️ JSON parse failed:', error.message);
            return fallback;
        }
    },
    
    // Generate random string
    generateRandomString: function(length = 32) {
        const crypto = require('crypto');
        return crypto.randomBytes(length).toString('hex');
    },
    
    // Sanitize filename
    sanitizeFilename: function(filename) {
        return filename.replace(/[^a-z0-9.-]/gi, '_').toLowerCase();
    },
    
    // Check if URL is valid
    isValidUrl: function(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    },
    
    // Deep clone object
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Delay function for testing
    delay: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Convert bytes to human readable
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    
    // Capitalize first letter
    capitalize: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    // Remove undefined/null values from object
    cleanObject: function(obj) {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined && value !== null) {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }
};

console.log('✅ Helpers loaded');

module.exports = Helpers;