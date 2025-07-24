// ===== ADVANCED MONITORING SYSTEM =====
// Real-time request tracking, analytics, and performance monitoring

// Environment Variables laden
require('dotenv').config();

// Monitoring Stats Global Store
const MonitoringStats = {
    requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byMethod: new Map(),
        byPath: new Map(),
        byStatusCode: new Map()
    },
    
    auth: {
        loginAttempts: 0,
        loginSuccess: 0,
        loginFailures: 0,
        registrations: 0,
        botBlocked: 0,
        rateLimited: 0
    },
    
    performance: {
        responseTimes: [],
        slowRequests: 0,
        averageResponseTime: 0
    },
    
    security: {
        suspiciousRequests: 0,
        blockedRequests: 0,
        threatTypes: new Map()
    },
    
    realTime: {
        requestsLastMinute: [],
        currentConnections: 0,
        peakConnections: 0
    },
    
    system: {
        startTime: Date.now(),
        lastReset: Date.now(),
        uptime: 0
    }
};

console.log('✅ Advanced Monitoring System loaded');
console.log('📊 Monitoring Features:');
console.log('  • Request Tracking & Analytics');
console.log('  • Authentication Monitoring');
console.log('  • Security Event Tracking');
console.log('  • Performance Metrics');
console.log('  • Health Status Monitoring');
console.log('  • Real-time Metrics Dashboard');

// ===== CORE MONITORING FUNCTIONS =====

// Request Tracker
const trackRequest = function(req, res, responseTime, statusCode) {
    const NODE_ENV = process.env.NODE_ENV || 'development'; // ← FIX: Sichere NODE_ENV Abfrage
    
    // Update basic stats
    MonitoringStats.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
        MonitoringStats.requests.successful++;
    } else {
        MonitoringStats.requests.failed++;
    }
    
    // Track by method
    const method = req.method;
    MonitoringStats.requests.byMethod.set(method, 
        (MonitoringStats.requests.byMethod.get(method) || 0) + 1);
    
    // Track by path
    const path = req.path || req.url;
    MonitoringStats.requests.byPath.set(path, 
        (MonitoringStats.requests.byPath.get(path) || 0) + 1);
    
    // Track by status code
    MonitoringStats.requests.byStatusCode.set(statusCode, 
        (MonitoringStats.requests.byStatusCode.get(statusCode) || 0) + 1);
    
    // Performance tracking
    MonitoringStats.performance.responseTimes.push(responseTime);
    if (responseTime > 1000) {
        MonitoringStats.performance.slowRequests++;
    }
    
    // Calculate rolling average (last 100 requests)
    if (MonitoringStats.performance.responseTimes.length > 100) {
        MonitoringStats.performance.responseTimes.shift();
    }
    
    const avgTime = MonitoringStats.performance.responseTimes.reduce((a, b) => a + b, 0) / 
                   MonitoringStats.performance.responseTimes.length;
    MonitoringStats.performance.averageResponseTime = Math.round(avgTime);
    
    // Real-time tracking (last minute)
    const now = Date.now();
    MonitoringStats.realTime.requestsLastMinute.push(now);
    
    // Clean old entries (older than 1 minute)
    MonitoringStats.realTime.requestsLastMinute = 
        MonitoringStats.realTime.requestsLastMinute.filter(time => now - time < 60000);
    
    // Log significant events
    if (NODE_ENV === 'development' && responseTime > 1000) {
        console.log(`🐌 Slow request: ${method} ${path} took ${responseTime}ms`);
    }
    
    if (statusCode >= 500) {
        console.log(`🚨 Server error: ${method} ${path} returned ${statusCode}`);
    }
};

// Authentication Event Tracker
const trackAuth = function(event, success = true) {
    const NODE_ENV = process.env.NODE_ENV || 'development'; // ← FIX: Sichere NODE_ENV Abfrage
    
    switch (event) {
        case 'login':
            MonitoringStats.auth.loginAttempts++;
            if (success) {
                MonitoringStats.auth.loginSuccess++;
            } else {
                MonitoringStats.auth.loginFailures++;
            }
            break;
            
        case 'register':
            if (success) {
                MonitoringStats.auth.registrations++;
            }
            break;
            
        case 'bot_blocked':
            MonitoringStats.auth.botBlocked++;
            MonitoringStats.security.suspiciousRequests++;
            break;
            
        case 'rate_limited':
            MonitoringStats.auth.rateLimited++;
            MonitoringStats.security.suspiciousRequests++;
            break;
    }
    
    if (NODE_ENV === 'development') {
        console.log(`📊 Auth event tracked: ${event} (success: ${success})`);
    }
};

// Security Event Tracker
const trackSecurity = function(threatType, blocked = false) {
    MonitoringStats.security.suspiciousRequests++;
    
    if (blocked) {
        MonitoringStats.security.blockedRequests++;
    }
    
    const count = MonitoringStats.security.threatTypes.get(threatType) || 0;
    MonitoringStats.security.threatTypes.set(threatType, count + 1);
    
    console.log(`🛡️ Security event: ${threatType} (blocked: ${blocked})`);
};

// Connection Tracker
const trackConnection = function(increment = true) {
    if (increment) {
        MonitoringStats.realTime.currentConnections++;
        if (MonitoringStats.realTime.currentConnections > MonitoringStats.realTime.peakConnections) {
            MonitoringStats.realTime.peakConnections = MonitoringStats.realTime.currentConnections;
        }
    } else {
        MonitoringStats.realTime.currentConnections = Math.max(0, 
            MonitoringStats.realTime.currentConnections - 1);
    }
};

// ===== MONITORING MIDDLEWARE =====

const requestMonitoringMiddleware = function(req, res, next) {
    const startTime = Date.now();
    
    // Track connection
    trackConnection(true);
    
    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // Track the request
        trackRequest(req, res, responseTime, statusCode);
        
        // Track connection end
        trackConnection(false);
        
        // Call original end
        originalEnd.apply(res, args);
    };
    
    next();
};

// ===== ANALYTICS & REPORTING =====

// Get comprehensive analytics
const getAnalytics = function() {
    const uptime = Date.now() - MonitoringStats.system.startTime;
    
    // Convert Maps to Arrays for JSON serialization
    const methodStats = Array.from(MonitoringStats.requests.byMethod.entries())
        .sort((a, b) => b[1] - a[1]);
    
    const pathStats = Array.from(MonitoringStats.requests.byPath.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 paths
    
    const statusStats = Array.from(MonitoringStats.requests.byStatusCode.entries())
        .sort((a, b) => b[1] - a[1]);
    
    const threatStats = Array.from(MonitoringStats.security.threatTypes.entries())
        .sort((a, b) => b[1] - a[1]);
    
    return {
        timestamp: new Date().toISOString(),
        uptime: {
            milliseconds: uptime,
            seconds: Math.round(uptime / 1000),
            minutes: Math.round(uptime / 60000),
            hours: Math.round(uptime / 3600000)
        },
        
        requests: {
            total: MonitoringStats.requests.total,
            successful: MonitoringStats.requests.successful,
            failed: MonitoringStats.requests.failed,
            successRate: MonitoringStats.requests.total > 0 
                ? Math.round((MonitoringStats.requests.successful / MonitoringStats.requests.total) * 100) 
                : 0,
            byMethod: methodStats,
            byPath: pathStats,
            byStatusCode: statusStats
        },
        
        authentication: {
            loginAttempts: MonitoringStats.auth.loginAttempts,
            loginSuccess: MonitoringStats.auth.loginSuccess,
            loginFailures: MonitoringStats.auth.loginFailures,
            loginSuccessRate: MonitoringStats.auth.loginAttempts > 0 
                ? Math.round((MonitoringStats.auth.loginSuccess / MonitoringStats.auth.loginAttempts) * 100)
                : 0,
            registrations: MonitoringStats.auth.registrations,
            securityEvents: {
                botBlocked: MonitoringStats.auth.botBlocked,
                rateLimited: MonitoringStats.auth.rateLimited
            }
        },
        
        performance: {
            averageResponseTime: MonitoringStats.performance.averageResponseTime,
            slowRequests: MonitoringStats.performance.slowRequests,
            slowRequestRate: MonitoringStats.requests.total > 0 
                ? Math.round((MonitoringStats.performance.slowRequests / MonitoringStats.requests.total) * 100)
                : 0,
            requestsPerMinute: MonitoringStats.realTime.requestsLastMinute.length
        },
        
        security: {
            suspiciousRequests: MonitoringStats.security.suspiciousRequests,
            blockedRequests: MonitoringStats.security.blockedRequests,
            threatTypes: threatStats,
            securityScore: calculateSecurityScore()
        },
        
        realTime: {
            currentConnections: MonitoringStats.realTime.currentConnections,
            peakConnections: MonitoringStats.realTime.peakConnections,
            requestsLastMinute: MonitoringStats.realTime.requestsLastMinute.length
        }
    };
};

// Calculate overall security score
const calculateSecurityScore = function() {
    let score = 100;
    
    const totalRequests = MonitoringStats.requests.total;
    if (totalRequests === 0) return score;
    
    // Deduct for security issues
    const suspiciousRate = (MonitoringStats.security.suspiciousRequests / totalRequests) * 100;
    const failureRate = (MonitoringStats.requests.failed / totalRequests) * 100;
    
    score -= Math.min(30, suspiciousRate * 2); // Max 30 points deduction
    score -= Math.min(20, failureRate); // Max 20 points deduction
    
    // Bonus for good authentication ratio
    if (MonitoringStats.auth.loginAttempts > 0) {
        const authSuccessRate = (MonitoringStats.auth.loginSuccess / MonitoringStats.auth.loginAttempts) * 100;
        if (authSuccessRate > 80) score += 5;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
};

// Get health status
const getHealthStatus = function() {
    const uptime = Date.now() - MonitoringStats.system.startTime;
    const memUsage = process.memoryUsage();
    
    // Determine health based on various metrics
    let status = 'healthy';
    let issues = [];
    
    // Check response time
    if (MonitoringStats.performance.averageResponseTime > 2000) {
        status = 'degraded';
        issues.push('High response times');
    }
    
    // Check error rate
    const errorRate = MonitoringStats.requests.total > 0 
        ? (MonitoringStats.requests.failed / MonitoringStats.requests.total) * 100 
        : 0;
    
    if (errorRate > 10) {
        status = 'unhealthy';
        issues.push('High error rate');
    }
    
    // Check security issues
    if (MonitoringStats.security.blockedRequests > 10) {
        status = 'under_attack';
        issues.push('Multiple security blocks');
    }
    
    return {
        status: status,
        timestamp: new Date().toISOString(),
        uptime: {
            milliseconds: uptime,
            humanReadable: formatUptime(uptime)
        },
        performance: {
            averageResponseTime: MonitoringStats.performance.averageResponseTime,
            requestsPerMinute: MonitoringStats.realTime.requestsLastMinute.length,
            currentConnections: MonitoringStats.realTime.currentConnections
        },
        memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
        },
        issues: issues,
        metrics: {
            totalRequests: MonitoringStats.requests.total,
            successRate: MonitoringStats.requests.total > 0 
                ? Math.round((MonitoringStats.requests.successful / MonitoringStats.requests.total) * 100) 
                : 100,
            securityScore: calculateSecurityScore()
        }
    };
};

// Get real-time metrics
const getRealTimeMetrics = function() {
    return {
        timestamp: new Date().toISOString(),
        current: {
            connections: MonitoringStats.realTime.currentConnections,
            requestsLastMinute: MonitoringStats.realTime.requestsLastMinute.length,
            averageResponseTime: MonitoringStats.performance.averageResponseTime
        },
        totals: {
            requests: MonitoringStats.requests.total,
            successful: MonitoringStats.requests.successful,
            failed: MonitoringStats.requests.failed
        },
        rates: {
            successRate: MonitoringStats.requests.total > 0 
                ? Math.round((MonitoringStats.requests.successful / MonitoringStats.requests.total) * 100)
                : 100,
            requestsPerSecond: Math.round(MonitoringStats.realTime.requestsLastMinute.length / 60)
        },
        security: {
            score: calculateSecurityScore(),
            suspiciousRequests: MonitoringStats.security.suspiciousRequests,
            blockedRequests: MonitoringStats.security.blockedRequests
        }
    };
};

// Helper function to format uptime
const formatUptime = function(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
};

// Performance Monitoring (runs every minute)
setInterval(() => {
    const NODE_ENV = process.env.NODE_ENV || 'development'; // ← FIX: Sichere NODE_ENV Abfrage
    
    MonitoringSystem.trackPerformance();
    
    // Cleanup old data every 5 minutes
    if (Date.now() % (5 * 60 * 1000) < 60000) {
        if (NODE_ENV === 'development') {
            console.log('🧹 Monitoring cleanup: Removing old performance data');
        }
    }
}, 60000);

// Health Status Logging (runs every 5 minutes)
setInterval(() => {
    const healthStatus = MonitoringSystem.getHealthStatus();
    
    if (healthStatus.status !== 'healthy') {
        console.log(`⚠️ HEALTH WARNING: Status ${healthStatus.status}`, healthStatus.issues);
    }
}, 5 * 60 * 1000);

// ===== MONITORING SYSTEM OBJECT =====

const MonitoringSystem = {
    // Core tracking functions
    trackRequest: trackRequest,
    trackAuth: trackAuth,
    trackSecurity: trackSecurity,
    trackConnection: trackConnection,
    
    // Analytics functions
    getAnalytics: getAnalytics,
    getHealthStatus: getHealthStatus,
    getRealTimeMetrics: getRealTimeMetrics,
    
    // Performance tracking
    trackPerformance: function() {
        const memUsage = process.memoryUsage();
        
        // Log memory warnings
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        if (heapUsedMB > 100) {
            console.log(`🐘 High memory usage: ${Math.round(heapUsedMB)}MB heap used`);
        }
        
        // Update system stats
        MonitoringStats.system.uptime = Date.now() - MonitoringStats.system.startTime;
    },
    
    // Reset stats (for testing or periodic cleanup)
    reset: function() {
        Object.keys(MonitoringStats).forEach(key => {
            if (typeof MonitoringStats[key] === 'object' && MonitoringStats[key] !== null) {
                if (MonitoringStats[key] instanceof Map) {
                    MonitoringStats[key].clear();
                } else if (Array.isArray(MonitoringStats[key])) {
                    MonitoringStats[key].length = 0;
                } else {
                    Object.keys(MonitoringStats[key]).forEach(subKey => {
                        if (typeof MonitoringStats[key][subKey] === 'number') {
                            MonitoringStats[key][subKey] = 0;
                        } else if (Array.isArray(MonitoringStats[key][subKey])) {
                            MonitoringStats[key][subKey].length = 0;
                        } else if (MonitoringStats[key][subKey] instanceof Map) {
                            MonitoringStats[key][subKey].clear();
                        }
                    });
                }
            }
        });
        
        MonitoringStats.system.startTime = Date.now();
        MonitoringStats.system.lastReset = Date.now();
        console.log('🔄 Monitoring stats reset');
    }
};

// Export für Integration in server.js
module.exports = {
    MonitoringSystem,
    requestMonitoringMiddleware
};