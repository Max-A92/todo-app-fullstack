// ===== KONFIGURATION & KONSTANTEN =====
export const CONFIG = {
    // API-Konfiguration
    API: {
        BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://todo-app-fullstack-fdvh.onrender.com',
        TIMEOUT: 60000,
        RETRY_COUNT: 8,
        RETRY_INTERVAL: 30000
    },
    
    // UI-Konstanten
    UI: {
        FILTER_TYPES: ['all', 'overdue', 'today', 'tomorrow', 'week', 'no-date'],
        VIEW_MODES: ['normal', 'grouped'],
        DEFAULT_FILTER: 'all',
        DEFAULT_VIEW_MODE: 'normal'
    },
    
    // Bot Protection
    BOT_PROTECTION: {
        MIN_FORM_TIME: 3000,      // 3 Sekunden
        MAX_FORM_TIME: 3600000,   // 1 Stunde
        HONEYPOT_FIELDS: [
            'website', 'email_confirm', 'phone', 
            'fax', 'url', 'homepage'
        ]
    },
    
    // Cache-Einstellungen
    CACHE: {
        TASKS: 'cached_tasks',
        PROJECTS: 'cached_projects',
        USER: 'current_user'
    },
    
    // Debug-Modus
    DEBUG: true
};

// Helper für Logging
export const log = CONFIG.DEBUG ? console.log : () => {};
export const warn = CONFIG.DEBUG ? console.warn : () => {};
export const error = console.error;

console.log('✅ CONFIG loaded:', CONFIG.API.BASE_URL);