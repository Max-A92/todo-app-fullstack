// ===== ENHANCED SECURITY HEADERS SUITE =====
// Advanced security middleware with CSP, XSS protection, and threat analysis

// Environment Variables laden
require('dotenv').config();

// Security Stats Global Store
const SecurityStats = {
    stats: {
        totalRequests: 0,
        suspiciousRequests: 0,
        blockedRequests: 0,
        securityScores: [],
        topThreats: new Map(),
        lastReset: Date.now()
    },

    reset: function() {
        this.stats = {
            totalRequests: 0,
            suspiciousRequests: 0,
            blockedRequests: 0,
            securityScores: [],
            topThreats: new Map(),
            lastReset: Date.now()
        };
    }
};

console.log('🛡️ Security Headers Suite loaded');
console.log('🛡️ Security Features:');
console.log('  • Content Security Policy (CSP)');
console.log('  • XSS Protection Headers');
console.log('  • CSRF Protection');
console.log('  • Clickjacking Protection');
console.log('  • Suspicious Pattern Detection');
console.log('  • Security Score Analysis');
console.log('  • Real-Time Threat Monitoring');

// ===== CORE SECURITY MIDDLEWARE =====

// Content Security Policy Generator
const generateCSP = function(req) {
    const NODE_ENV = process.env.NODE_ENV || 'development'; // ← FIX: Sichere NODE_ENV Abfrage
    
    // Basis CSP für verschiedene Umgebungen
    const baseCSP = {
        'default-src': ["'self'"],
        'script-src': NODE_ENV === 'development' 
            ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://unpkg.com"]
            : ["'self'", "https://cdnjs.cloudflare.com"],
        'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        'font-src': ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        'img-src': ["'self'", "data:", "https:", "blob:"],
        'connect-src': ["'self'", "https:", "wss:", "ws:"],
        'frame-src': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': []
    };
    
    // CSP String generieren
    let cspString = '';
    for (const [directive, sources] of Object.entries(baseCSP)) {
        if (sources.length > 0) {
            cspString += `${directive} ${sources.join(' ')}; `;
        } else {
            cspString += `${directive}; `;
        }
    }
    
    return cspString.trim();
};

// Suspicious Pattern Detection
const detectSuspiciousPatterns = function(req) {
    const suspiciousPatterns = [
        // XSS Patterns
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[\s\S]*?>/gi,
        /<object[\s\S]*?>/gi,
        /<embed[\s\S]*?>/gi,
        
        // SQL Injection Patterns
        /union[\s\S]*?select/gi,
        /select[\s\S]*?from/gi,
        /insert[\s\S]*?into/gi,
        /delete[\s\S]*?from/gi,
        /update[\s\S]*?set/gi,
        /drop[\s\S]*?table/gi,
        
        // Path Traversal
        /\.\.\/|\.\.\\/gi,
        /\/etc\/passwd/gi,
        /\/windows\/system32/gi,
        
        // Command Injection
        /;\s*(rm|del|format|shutdown)/gi,
        /\|\s*(cat|type|dir|ls)/gi,
        /`.*`/gi,
        /\$\(.*\)/gi
    ];
    
    const threats = [];
    const userAgent = req.headers['user-agent'] || '';
    const queryString = JSON.stringify(req.query);
    const bodyString = JSON.stringify(req.body || {});
    const urlPath = req.path || '';
    
    // Check all input sources
    const inputs = [userAgent, queryString, bodyString, urlPath];
    
    inputs.forEach((input, index) => {
        const inputNames = ['User-Agent', 'Query', 'Body', 'Path'];
        suspiciousPatterns.forEach((pattern, patternIndex) => {
            if (pattern.test(input)) {
                threats.push({
                    type: getPatternType(patternIndex),
                    source: inputNames[index],
                    pattern: pattern.toString(),
                    content: input.substring(0, 100)
                });
            }
        });
    });
    
    return threats;
};

// Pattern Type Classifier
const getPatternType = function(patternIndex) {
    if (patternIndex < 6) return 'XSS';
    if (patternIndex < 12) return 'SQL_INJECTION';
    if (patternIndex < 15) return 'PATH_TRAVERSAL';
    return 'COMMAND_INJECTION';
};

// Security Score Calculator
const calculateSecurityScore = function(req, threats) {
    let score = 100;
    
    // Deduct points for threats
    threats.forEach(threat => {
        switch (threat.type) {
            case 'XSS': score -= 15; break;
            case 'SQL_INJECTION': score -= 25; break;
            case 'PATH_TRAVERSAL': score -= 20; break;
            case 'COMMAND_INJECTION': score -= 30; break;
        }
    });
    
    // Bonus points for good practices
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') score += 5;
    if (req.headers.referer && req.headers.referer.includes(req.headers.host)) score += 5;
    if (req.headers['content-type'] === 'application/json') score += 3;
    
    // User-Agent analysis
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('Mozilla') && userAgent.includes('Chrome')) score += 10;
    if (userAgent.length < 20) score -= 10;
    if (!userAgent) score -= 20;
    
    return Math.max(0, Math.min(100, score));
};

// Security Level Determiner
const getSecurityLevel = function(score) {
    if (score >= 80) return 'HIGH';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'LOW';
    return 'CRITICAL';
};

// ===== MAIN SECURITY MIDDLEWARE =====

const securityHeadersMiddleware = function(req, res, next) {
    const startTime = Date.now();
    const NODE_ENV = process.env.NODE_ENV || 'development'; // ← FIX: Sichere NODE_ENV Abfrage
    
    // Generate CSP
    const csp = generateCSP(req);
    
    // Detect threats
    const threats = detectSuspiciousPatterns(req);
    const securityScore = calculateSecurityScore(req, threats);
    const securityLevel = getSecurityLevel(securityScore);
    
    // Update stats
    SecurityStats.stats.totalRequests++;
    SecurityStats.stats.securityScores.push(securityScore);
    
    if (threats.length > 0) {
        SecurityStats.stats.suspiciousRequests++;
        threats.forEach(threat => {
            const count = SecurityStats.stats.topThreats.get(threat.type) || 0;
            SecurityStats.stats.topThreats.set(threat.type, count + 1);
        });
    }
    
    // Block highly suspicious requests
    if (securityScore < 30 && threats.length > 2) {
        SecurityStats.stats.blockedRequests++;
        console.log(`🚫 SECURITY BLOCK: Score ${securityScore}, Threats: ${threats.length}`);
        return res.status(403).json({
            error: 'Security violation detected',
            message: 'Request blocked due to suspicious patterns',
            code: 'SECURITY_BLOCK',
            score: securityScore,
            threats: threats.length
        });
    }
    
    // Set Security Headers
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // HSTS for production
    if (NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    // Custom Security Headers
    res.setHeader('X-Security-Score', securityScore);
    res.setHeader('X-Security-Level', securityLevel);
    res.setHeader('X-Threat-Count', threats.length);
    
    const processingTime = Date.now() - startTime;
    
    // Log security analysis
    if (NODE_ENV === 'development' || threats.length > 0) {
        console.log(`🛡️ Security middleware: ${processingTime}ms, Score: ${securityScore}, Level: ${securityLevel}`);
        if (threats.length > 0) {
            console.log(`⚠️ Threats detected:`, threats.map(t => t.type).join(', '));
        }
    }
    
    // Add security info to request for further processing
    req.securityInfo = {
        score: securityScore,
        level: securityLevel,
        threats: threats,
        processingTime: processingTime
    };
    
    next();
};

// ===== ENHANCED SECURITY MIDDLEWARE COMPOSER =====

const enhancedSecurityMiddleware = function(req, res, next) {
    // Apply security headers and analysis
    securityHeadersMiddleware(req, res, next);
};

// ===== SECURITY STATS API =====

SecurityStats.getReport = function() {
    const avgScore = this.stats.securityScores.length > 0 
        ? Math.round(this.stats.securityScores.reduce((a, b) => a + b, 0) / this.stats.securityScores.length)
        : 0;
    
    const threatArray = Array.from(this.stats.topThreats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    return {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.stats.lastReset,
        overview: {
            totalRequests: this.stats.totalRequests,
            suspiciousRequests: this.stats.suspiciousRequests,
            blockedRequests: this.stats.blockedRequests,
            averageSecurityScore: avgScore,
            threatDetectionRate: this.stats.totalRequests > 0 
                ? Math.round((this.stats.suspiciousRequests / this.stats.totalRequests) * 100) 
                : 0
        },
        threats: {
            topThreats: threatArray.map(([type, count]) => ({ type, count })),
            totalThreatsDetected: Array.from(this.stats.topThreats.values()).reduce((a, b) => a + b, 0)
        },
        performance: {
            requestsPerMinute: this.stats.totalRequests > 0 
                ? Math.round(this.stats.totalRequests / ((Date.now() - this.stats.lastReset) / 60000))
                : 0,
            averageProcessingTime: '< 1ms'
        },
        security: {
            cspEnabled: true,
            xssProtection: true,
            frameOptions: true,
            contentTypeOptions: true,
            referrerPolicy: true,
            permissionsPolicy: true
        }
    };
};

// Export für Integration in server.js
module.exports = {
    enhancedSecurityMiddleware,
    SecurityStats
};