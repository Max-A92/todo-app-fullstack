// ===== BOT PROTECTION MIDDLEWARE =====
const SecurityConfig = require('../config/security');

// Bot Protection Analytics
const botProtectionStats = {
    honeypotTriggers: 0,
    timingViolations: 0,
    userAgentBlocks: 0,
    requestFingerprints: new Map()
};

const BotProtection = {
    // 1. HONEYPOT FIELD DETECTION (konfigurierbar)
    checkHoneypot: function(req) {
        if (!SecurityConfig.botProtection.enableHoneypot) {
            return true; // Honeypot deaktiviert
        }
        
        console.log('🍯 Checking honeypot fields for IP:', req.ip);
        
        // Konfigurierbare Honeypot-Felder verwenden
        const honeypotFields = SecurityConfig.botProtection.honeypotFields.map(field => req.body[field]).filter(field => field && field.trim() !== '');
        
        if (honeypotFields.length > 0) {
            botProtectionStats.honeypotTriggers++;
            console.log(`🍯 HONEYPOT TRIGGERED von IP: ${req.ip}`);
            console.log(`   Gefüllte Felder: ${honeypotFields.length}`);
            console.log(`   Inhalte: ${honeypotFields.map(f => f.substring(0, 20)).join(', ')}`);
            return false; // Bot erkannt!
        }
        
        console.log('✅ Honeypot check passed');
        return true; // Kein Bot
    },
    
    // 2. TIMING ANALYSIS (konfigurierbare Timings)
    checkFormTiming: function(req) {
        if (!SecurityConfig.botProtection.enableTiming) {
            return { valid: true, reason: 'TIMING_CHECK_DISABLED' };
        }
        
        const formTimestamp = req.body.formTimestamp;
        
        if (!formTimestamp) {
            console.log('⚠️ Kein formTimestamp gefunden - Skip timing check');
            return { valid: true, reason: 'NO_TIMESTAMP' };
        }
        
        const submissionTime = Date.now() - parseInt(formTimestamp);
        console.log(`⏱️ Form submission timing: ${submissionTime}ms`);
        
        // Konfigurierbare Schwellenwerte verwenden
        if (submissionTime < SecurityConfig.botProtection.minFormTime) {
            botProtectionStats.timingViolations++;
            console.log(`⚡ TIMING VIOLATION: Zu schnell (${submissionTime}ms) von IP: ${req.ip}`);
            return { valid: false, reason: 'TOO_FAST', timing: submissionTime };
        }
        
        if (submissionTime > SecurityConfig.botProtection.maxFormTime) {
            botProtectionStats.timingViolations++;
            console.log(`🐌 TIMING VIOLATION: Zu langsam (${submissionTime}ms) von IP: ${req.ip}`);
            return { valid: false, reason: 'TOO_SLOW', timing: submissionTime };
        }
        
        console.log('✅ Timing check passed');
        return { valid: true, timing: submissionTime };
    },
    
    // 3. USER-AGENT ANALYSIS (konfigurierbar)
    analyzeUserAgent: function(req) {
        if (!SecurityConfig.botProtection.enableUserAgent) {
            return { allowed: true, reason: 'USER_AGENT_CHECK_DISABLED' };
        }
        
        const userAgent = req.headers['user-agent'] || '';
        const ip = req.ip;
        
        console.log(`🕵️ Analyzing User-Agent: ${userAgent.substring(0, 50)}...`);
        
        // Verdächtige User-Agents (Bot-Tools)
        const suspiciousAgents = [
            'curl/', 'wget/', 'python-requests/', 'python-urllib/',
            'node-fetch', 'axios/', 'got/', 'superagent/',
            'bot', 'spider', 'crawler', 'scraper', 'scanner',
            'postman', 'insomnia', 'httpie', 'powershell'
        ];
        
        const isSuspiciousAgent = suspiciousAgents.some(agent => 
            userAgent.toLowerCase().includes(agent.toLowerCase()));
        
        if (isSuspiciousAgent) {
            botProtectionStats.userAgentBlocks++;
            console.log(`🤖 SUSPICIOUS USER-AGENT detected: ${userAgent} von IP: ${ip}`);
            return { allowed: false, reason: 'SUSPICIOUS_USER_AGENT', userAgent: userAgent };
        }
        
        // Fehlender User-Agent bei Auth-Requests (sehr verdächtig)
        if (!userAgent && req.path.includes('/auth/')) {
            botProtectionStats.userAgentBlocks++;
            console.log(`👻 MISSING USER-AGENT bei Auth-Request von IP: ${ip}`);
            return { allowed: false, reason: 'MISSING_USER_AGENT' };
        }
        
        // Zu kurzer User-Agent (oft Bot-Anzeichen)
        if (userAgent.length < 10 && req.path.includes('/auth/')) {
            botProtectionStats.userAgentBlocks++;
            console.log(`📏 SUSPICIOUSLY SHORT USER-AGENT: "${userAgent}" von IP: ${ip}`);
            return { allowed: false, reason: 'SHORT_USER_AGENT', userAgent: userAgent };
        }
        
        console.log('✅ User-Agent check passed');
        return { allowed: true, userAgent: userAgent };
    },
    
    // 4. REQUEST FINGERPRINTING (für Security Analysis)
    generateFingerprint: function(req) {
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';
        const acceptLanguage = req.headers['accept-language'] || '';
        const acceptEncoding = req.headers['accept-encoding'] || '';
        const origin = req.headers.origin || '';
        const referer = req.headers.referer || '';
        
        const fingerprint = `${ip}:${userAgent}:${acceptLanguage}:${acceptEncoding}:${origin}:${referer}`;
        const fingerprintHash = require('crypto').createHash('md5').update(fingerprint).digest('hex').substring(0, 16);
        
        // Fingerprint für Analytics speichern
        if (!botProtectionStats.requestFingerprints.has(fingerprintHash)) {
            botProtectionStats.requestFingerprints.set(fingerprintHash, {
                firstSeen: Date.now(),
                count: 1,
                ip: ip,
                userAgent: userAgent.substring(0, 100)
            });
        } else {
            botProtectionStats.requestFingerprints.get(fingerprintHash).count++;
        }
        
        return fingerprintHash;
    },
    
    // 5. COMPREHENSIVE BOT CHECK (Alle Checks kombiniert)
    performBotCheck: function(req) {
        console.log(`🛡️ Performing comprehensive bot check for ${req.method} ${req.path} from ${req.ip}`);
        
        // Request Fingerprint generieren
        const fingerprint = this.generateFingerprint(req);
        
        // 1. User-Agent Check
        const userAgentCheck = this.analyzeUserAgent(req);
        if (!userAgentCheck.allowed) {
            return {
                allowed: false,
                reason: userAgentCheck.reason,
                details: userAgentCheck.userAgent,
                fingerprint: fingerprint
            };
        }
        
        // 2. Honeypot Check (nur bei POST-Requests mit Body)
        if (req.method === 'POST' && req.body) {
            const honeypotCheck = this.checkHoneypot(req);
            if (!honeypotCheck) {
                return {
                    allowed: false,
                    reason: 'HONEYPOT_TRIGGERED',
                    fingerprint: fingerprint
                };
            }
        }
        
        // 3. Timing Check (nur bei Formularen mit Timestamp)
        if (req.method === 'POST' && req.body && req.body.formTimestamp) {
            const timingCheck = this.checkFormTiming(req);
            if (!timingCheck.valid) {
                return {
                    allowed: false,
                    reason: timingCheck.reason,
                    timing: timingCheck.timing,
                    fingerprint: fingerprint
                };
            }
        }
        
        console.log('✅ All bot protection checks passed');
        return {
            allowed: true,
            fingerprint: fingerprint,
            checks: {
                userAgent: 'passed',
                honeypot: req.method === 'POST' ? 'passed' : 'skipped',
                timing: (req.method === 'POST' && req.body?.formTimestamp) ? 'passed' : 'skipped'
            }
        };
    },
    
    // 6. STATISTICS & CLEANUP
    getStats: function() {
        return {
            honeypotTriggers: botProtectionStats.honeypotTriggers,
            timingViolations: botProtectionStats.timingViolations,
            userAgentBlocks: botProtectionStats.userAgentBlocks,
            uniqueFingerprints: botProtectionStats.requestFingerprints.size,
            timestamp: new Date().toISOString()
        };
    },
    
    cleanup: function() {
        // Cleanup alte Fingerprints
        const now = Date.now();
        const maxAge = SecurityConfig.cleanup.botProtectionCleanup;
        let cleanedCount = 0;
        
        for (const [hash, data] of botProtectionStats.requestFingerprints.entries()) {
            if (now - data.firstSeen > maxAge) {
                botProtectionStats.requestFingerprints.delete(hash);
                cleanedCount++;
            }
        }
        
        console.log(`🧹 Bot Protection cleanup: ${cleanedCount} alte Fingerprints entfernt`);
        console.log(`📊 Bot Protection Stats:`, this.getStats());
    }
};

// Bot Protection Middleware
const botProtectionMiddleware = function(req, res, next) {
    const botCheck = BotProtection.performBotCheck(req);
    
    if (!botCheck.allowed) {
        console.log(`🚫 BOT DETECTED and BLOCKED: ${botCheck.reason} from ${req.ip}`);
        
        // Track bot attack
        if (global.MonitoringSystem) {
            try {
                global.MonitoringSystem.trackAuth('bot_blocked');
            } catch (error) {
                console.warn('⚠️ Monitoring trackAuth failed:', error.message);
            }
        }
        
        // Detaillierte Error-Response je nach Grund
        let errorMessage, userMessage;
        
        switch (botCheck.reason) {
            case 'HONEYPOT_TRIGGERED':
                errorMessage = 'Bot detection: Honeypot triggered';
                userMessage = 'Security check failed. Please try again.';
                break;
            case 'TOO_FAST':
                errorMessage = 'Bot detection: Form submitted too quickly';
                userMessage = 'Please take your time filling out the form.';
                break;
            case 'TOO_SLOW':
                errorMessage = 'Bot detection: Form session expired';
                userMessage = 'Form session expired. Please refresh and try again.';
                break;
            case 'SUSPICIOUS_USER_AGENT':
            case 'MISSING_USER_AGENT':
            case 'SHORT_USER_AGENT':
                errorMessage = 'Bot detection: Suspicious client detected';
                userMessage = 'Please use a standard web browser to access this service.';
                break;
            default:
                errorMessage = 'Bot detection: Automated access detected';
                userMessage = 'Automated access is not permitted.';
        }
        
        return res.status(403).json({
            error: 'Bot detected',
            message: userMessage,
            code: botCheck.reason,
            fingerprint: botCheck.fingerprint
        });
    }
    
    // Request-Info für Debug-Zwecke zu req hinzufügen
    req.botCheck = botCheck;
    next();
};

// Cleanup mit konfigurierbarem Intervall
setInterval(() => BotProtection.cleanup(), SecurityConfig.cleanup.botProtectionCleanup);

console.log('✅ Bot Protection Middleware loaded');
console.log('🤖 Bot Protection Features (configurable):');
console.log(`  • Honeypot Detection: ${SecurityConfig.botProtection.enableHoneypot ? 'ENABLED' : 'DISABLED'}`);
console.log(`  • Timing Analysis: ${SecurityConfig.botProtection.enableTiming ? 'ENABLED' : 'DISABLED'} (${SecurityConfig.botProtection.minFormTime}ms - ${SecurityConfig.botProtection.maxFormTime}ms)`);
console.log(`  • User-Agent Analysis: ${SecurityConfig.botProtection.enableUserAgent ? 'ENABLED' : 'DISABLED'}`);
console.log(`  • Honeypot Fields: ${SecurityConfig.botProtection.honeypotFields.join(', ')}`);

module.exports = {
    botProtectionMiddleware,
    BotProtection
};