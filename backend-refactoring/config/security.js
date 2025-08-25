// ===== SECURITY CONFIGURATION =====
require('dotenv').config();

const SecurityConfig = {
    // Environment
    nodeEnv: process.env.NODE_ENV || 'production',
    port: process.env.PORT || 10000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'production-fallback-secret-2025',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    
    // Rate Limiting - KONFIGURIERBAR (aus Environment Variables)
    rateLimits: {
        login: {
            windowMs: parseInt(process.env.LOGIN_WINDOW_MS) || 15 * 60 * 1000,
            maxRequests: parseInt(process.env.LOGIN_MAX_REQUESTS) || 5
        },
        register: {
            windowMs: parseInt(process.env.REGISTER_WINDOW_MS) || 60 * 60 * 1000,
            maxRequests: parseInt(process.env.REGISTER_MAX_REQUESTS) || 3
        },
        emailVerify: {
            windowMs: parseInt(process.env.EMAIL_VERIFY_WINDOW_MS) || 10 * 60 * 1000,
            maxRequests: parseInt(process.env.EMAIL_VERIFY_MAX_REQUESTS) || 10
        },
        passwordReset: {
            windowMs: parseInt(process.env.PASSWORD_RESET_WINDOW_MS) || 60 * 60 * 1000,
            maxRequests: parseInt(process.env.PASSWORD_RESET_MAX_REQUESTS) || 2
        },
        general: {
            windowMs: parseInt(process.env.GENERAL_WINDOW_MS) || 60 * 1000,
            maxRequests: parseInt(process.env.GENERAL_MAX_REQUESTS) || 120
        }
    },
    
    // Bot Protection - konfigurierbare Werte
    botProtection: {
        minFormTime: parseInt(process.env.MIN_FORM_TIME_MS) || 3000,
        maxFormTime: parseInt(process.env.MAX_FORM_TIME_MS) || 3600000,
        enableHoneypot: process.env.ENABLE_HONEYPOT !== 'false',
        enableTiming: process.env.ENABLE_TIMING !== 'false',
        enableUserAgent: process.env.ENABLE_USER_AGENT !== 'false',
        honeypotFields: process.env.HONEYPOT_FIELDS ? 
            process.env.HONEYPOT_FIELDS.split(',') : 
            ['website', 'email_confirm', 'phone', 'fax', 'url', 'homepage']
    },
    
    // Security Scoring - konfigurierbare Schwellenwerte
    securityScoring: {
        blockThreshold: parseInt(process.env.SECURITY_BLOCK_THRESHOLD) || 30,
        suspiciousThreshold: parseInt(process.env.SECURITY_SUSPICIOUS_THRESHOLD) || 60,
        highSecurityThreshold: parseInt(process.env.SECURITY_HIGH_THRESHOLD) || 80
    },
    
    // Cleanup Intervals - konfigurierbar
    cleanup: {
        rateLimitCleanup: parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL) || 30 * 60 * 1000,
        botProtectionCleanup: parseInt(process.env.BOT_PROTECTION_CLEANUP_INTERVAL) || 2 * 60 * 60 * 1000,
        monitoringCleanup: parseInt(process.env.MONITORING_CLEANUP_INTERVAL) || 2 * 60 * 60 * 1000
    }
};

// ✅ VERBESSERTE SICHERHEITSPRÜFUNG: JWT_SECRET Validierung (Development-freundlich)
if (!SecurityConfig.jwt.secret || SecurityConfig.jwt.secret === 'production-fallback-secret-2025') {
    console.error('🚨 CRITICAL: Set strong JWT_SECRET in production!');
    if (SecurityConfig.nodeEnv === 'production') {
        console.error('🛑 REFUSING TO START without secure JWT_SECRET');
        process.exit(1);
    } else {
        console.warn('⚠️ Development: Using fallback JWT_SECRET (not secure for production)');
    }
}

// 🐛 DEBUG: Bot Protection entspannen für Development
if (SecurityConfig.nodeEnv === 'development') {
    console.log('🐛 DEVELOPMENT MODE: Entspanne Bot Protection für Testing...');
    SecurityConfig.botProtection.minFormTime = 500;           // Reduziert von 3000ms auf 500ms
    SecurityConfig.botProtection.enableHoneypot = false;      // Honeypot temporär deaktivieren
    SecurityConfig.botProtection.enableTiming = false;        // Timing-Checks deaktivieren
    console.log('🐛 DEBUG: Bot Protection entspannt für Development');
    console.log('  • minFormTime: 3000ms → 500ms');
    console.log('  • enableHoneypot: true → false');
    console.log('  • enableTiming: true → false');
    console.log('⚠️ Diese Einstellungen NUR für Development - Production bleibt sicher!');
}

console.log('✅ Security Configuration loaded');
console.log('📍 Environment:', SecurityConfig.nodeEnv);
console.log('📍 Port:', SecurityConfig.port);
console.log('🔑 JWT Secret:', SecurityConfig.jwt.secret ? 'SET ✅' : 'NOT SET ❌');
console.log('🌐 Frontend URL:', SecurityConfig.frontendUrl);

module.exports = SecurityConfig;