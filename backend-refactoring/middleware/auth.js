// ===== AUTHENTICATION MIDDLEWARE =====
const jwt = require('jsonwebtoken');
const SecurityConfig = require('../config/security');

// JWT Token Hilfsfunktionen
const generateToken = function (user) {
    const payload = {
        userId: user.id,
        username: user.username,
        email: user.email
    };
    
    return jwt.sign(payload, SecurityConfig.jwt.secret, {
        expiresIn: SecurityConfig.jwt.expiresIn
    });
};

const verifyToken = function (token) {
    try {
        return jwt.verify(token, SecurityConfig.jwt.secret);
    } catch (error) {
        throw new Error('Ungültiger Token');
    }
};

// Authentication Middleware
const authenticateToken = async function (req, res, next) {
    if (SecurityConfig.nodeEnv === 'development') {
        console.log('🔐 Prüfe Authentication...');
    }
    
    // Check if database is available (wird von außen gesetzt)
    if (!global.databaseAvailable) {
        console.log('⚠️ Database nicht verfügbar - Demo-Modus');
        req.user = null;
        return next();
    }
    
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Nicht authentifiziert',
                message: 'Authorization Header mit Bearer Token erforderlich'
            });
        }
        
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        
        // Database module muss von außen verfügbar gemacht werden
        const Database = require('../models/database');
        const user = await Database.getUserById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                error: 'User nicht gefunden',
                message: 'Token ist gültig, aber User existiert nicht mehr'
            });
        }
        
        req.user = user;
        if (SecurityConfig.nodeEnv === 'development') {
            console.log('👤 User authentifiziert:', user.username);
        }
        
        next();
    } catch (error) {
        console.error('🚨 Authentication Fehler:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token abgelaufen',
                message: 'Bitte erneut anmelden'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Ungültiger Token',
                message: 'Token ist beschädigt oder gefälscht'
            });
        } else {
            return res.status(401).json({
                error: 'Authentication fehlgeschlagen',
                message: error.message
            });
        }
    }
};

// Optional Authentication (für Legacy-Kompatibilität)
const optionalAuth = async function (req, res, next) {
    if (!global.databaseAvailable) {
        req.user = null;
        return next();
    }
    
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            
            const Database = require('../models/database');
            const user = await Database.getUserById(decoded.userId);
            
            if (user) {
                req.user = user;
                if (SecurityConfig.nodeEnv === 'development') {
                    console.log('👤 Optional Auth: User erkannt:', user.username);
                }
            }
        }
        
        next();
    } catch (error) {
        if (SecurityConfig.nodeEnv === 'development') {
            console.log('⚠️ Optional Auth: Token ungültig, verwende Demo-User');
        }
        next(); // Fehler ignorieren, Demo-User verwenden
    }
};

console.log('✅ Authentication Middleware loaded');
console.log('🔑 JWT Configuration:');
console.log('  • Secret:', SecurityConfig.jwt.secret ? 'SET ✅' : 'NOT SET ❌');
console.log('  • Expires In:', SecurityConfig.jwt.expiresIn);

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
    optionalAuth
};