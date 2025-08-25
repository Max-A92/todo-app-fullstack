// ===== RATE LIMITING MIDDLEWARE =====
const rateLimit = require('express-rate-limit');
const SecurityConfig = require('../config/security');

// Rate Limiting Store (Memory-based für einfache Implementierung)
const rateLimitStore = new Map();
const suspiciousIPs = new Set();

const RateLimiter = {
    limits: SecurityConfig.rateLimits,

    checkLimit: function(identifier, action) {
        const limit = this.limits[action] || this.limits.general;
        const key = `${action}:${identifier}`;
        const now = Date.now();
        
        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, { count: 1, firstRequest: now });
            return { allowed: true, remaining: limit.maxRequests - 1 };
        }

        const data = rateLimitStore.get(key);
        
        // Window abgelaufen? Reset
        if (now - data.firstRequest > limit.windowMs) {
            rateLimitStore.set(key, { count: 1, firstRequest: now });
            return { allowed: true, remaining: limit.maxRequests - 1 };
        }

        // Limit überschritten?
        if (data.count >= limit.maxRequests) {
            // IP als verdächtig markieren bei wiederholten Überschreitungen
            if (data.count > limit.maxRequests * 2) {
                const ip = identifier.split(':')[0]; // Extrahiere IP aus identifier
                suspiciousIPs.add(ip);
                console.log(`🚨 IP als verdächtig markiert: ${ip} (Action: ${action})`);
            }
            return { 
                allowed: false, 
                remaining: 0,
                retryAfter: Math.ceil((limit.windowMs - (now - data.firstRequest)) / 1000) // Sekunden
            };
        }

        data.count++;
        return { 
            allowed: true, 
            remaining: limit.maxRequests - data.count 
        };
    },
    
    // Cleanup-Funktion für Memory Management
    cleanup: function() {
        const now = Date.now();
        const maxAge = SecurityConfig.cleanup.rateLimitCleanup;
        let cleanedCount = 0;
        
        for (const [key, data] of rateLimitStore.entries()) {
            if (now - data.firstRequest > maxAge) {
                rateLimitStore.delete(key);
                cleanedCount++;
            }
        }
        
        console.log(`🧹 Rate Limiter cleanup: ${cleanedCount} alte Einträge entfernt`);
        console.log(`📊 Aktuelle Rate Limit Einträge: ${rateLimitStore.size}`);
        console.log(`🚨 Verdächtige IPs: ${suspiciousIPs.size}`);
    }
};

// Express Rate Limit Konfiguration
const createRateLimit = function(windowMs, max, message) {
    return rateLimit({
        windowMs: windowMs,
        max: max,
        message: {
            error: 'Rate limit exceeded',
            message: message,
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
        trustProxy: true // Wichtig für Render/Heroku
    });
};

// Spezifische Rate Limiters
const authRegisterLimit = createRateLimit(
    SecurityConfig.rateLimits.register.windowMs,
    SecurityConfig.rateLimits.register.maxRequests,
    'Too many registration attempts. Please try again later.'
);

const authLoginLimit = createRateLimit(
    SecurityConfig.rateLimits.login.windowMs,
    SecurityConfig.rateLimits.login.maxRequests,
    'Too many login attempts. Please try again later.'
);

const tasksLimit = createRateLimit(
    60 * 1000, // 1 minute
    30, // max 30 task operations per window  
    'Too many task operations. Please slow down.'
);

const generalLimit = createRateLimit(
    SecurityConfig.rateLimits.general.windowMs,
    SecurityConfig.rateLimits.general.maxRequests,
    'Too many requests. Please slow down.'
);

// Rate Limiting Middleware
const rateLimitMiddleware = function(action) {
    return function(req, res, next) {
        // IP-Adresse extrahieren (verschiedene Proxy-Header berücksichtigen)
        const ip = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   '127.0.0.1';
                   
        const identifier = `${ip}:${req.path}`;
        
        // Bereits als verdächtig markierte IPs sofort blockieren
        if (suspiciousIPs.has(ip)) {
            console.log(`🚫 Verdächtige IP blockiert: ${ip}`);
            return res.status(429).json({
                error: 'IP temporarily blocked',
                message: 'This IP address has been temporarily blocked due to suspicious activity',
                code: 'IP_BLOCKED'
            });
        }
        
        const rateCheck = RateLimiter.checkLimit(identifier, action);
        
        if (!rateCheck.allowed) {
            console.log(`🚫 Rate limit exceeded für ${action} von IP: ${ip}`);
            
            // Track rate limiting
            if (global.MonitoringSystem) {
                try {
                    global.MonitoringSystem.trackAuth('rate_limited');
                } catch (error) {
                    console.warn('⚠️ Monitoring trackAuth failed:', error.message);
                }
            }
            
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: `Too many ${action} attempts. Please try again in ${rateCheck.retryAfter} seconds.`,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: rateCheck.retryAfter
            });
        }
        
        // Rate Limit Headers setzen für Client-Information
        res.setHeader('X-RateLimit-Limit', RateLimiter.limits[action]?.maxRequests || RateLimiter.limits.general.maxRequests);
        res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
        res.setHeader('X-RateLimit-Window', Math.ceil(RateLimiter.limits[action]?.windowMs / 1000) || Math.ceil(RateLimiter.limits.general.windowMs / 1000));
        
        next();
    };
};

// Cleanup mit konfigurierbarem Intervall
setInterval(() => RateLimiter.cleanup(), SecurityConfig.cleanup.rateLimitCleanup);

console.log('✅ Rate Limiting Middleware loaded');
console.log('📊 Rate Limits (from Security Config):');
Object.entries(RateLimiter.limits).forEach(([action, limit]) => {
    console.log(`  • ${action}: ${limit.maxRequests} requests per ${limit.windowMs/1000/60} minutes`);
});

module.exports = {
    authRegisterLimit,
    authLoginLimit,
    tasksLimit,
    generalLimit,
    rateLimitMiddleware,
    RateLimiter
};