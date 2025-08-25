// ===== AUTHENTICATION ROUTES =====
const express = require('express');
const router = express.Router();

// Import Middleware
const { authRegisterLimit, authLoginLimit, rateLimitMiddleware } = require('../middleware/rateLimiting');
const { botProtectionMiddleware } = require('../middleware/botProtection');
const { authenticateToken } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

// Import Services
const AuthService = require('../services/AuthService');
const EmailService = require('../services/EmailService');

console.log('🔐 Auth Routes loading...');

// ===== AUTHENTICATION ROUTE HANDLERS =====

// POST /auth/register - ERWEITERTE Registrierung mit E-Mail-Verifikation
router.post('/register', 
    authRegisterLimit,                      // Rate Limiting
    botProtectionMiddleware,                // Bot Protection
    validateUserRegistration,               // Input Validation
    async function (req, res) {
        console.log('🆕 REGISTER Request mit E-Mail-Verifikation');
        
        if (!global.databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Registrierung temporär nicht möglich.'
            });
        }
        
        try {
            const result = await AuthService.registerUser(req.body);
            
            // Verifikations-E-Mail senden (falls Service verfügbar)
            if (global.emailServiceAvailable && result.user.verificationToken) {
                try {
                    await EmailService.sendVerificationEmail(result.user);
                    console.log('📧 Verifikations-E-Mail erfolgreich gesendet');
                } catch (emailError) {
                    console.error('🚨 E-Mail-Versand fehlgeschlagen:', emailError.message);
                    // Registrierung trotzdem erfolgreich, aber ohne E-Mail
                }
            }
            
            // Auth Event Tracking
            if (global.MonitoringSystem) {
                try {
                    global.MonitoringSystem.trackAuth('register', true);
                } catch (error) {
                    console.warn('⚠️ Monitoring trackAuth failed:', error.message);
                }
            }
            
            res.status(201).json({
                message: 'User erfolgreich registriert',
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    emailVerified: result.user.emailVerified,
                    createdAt: result.user.createdAt
                },
                emailInfo: result.emailInfo,
                verificationRequired: !result.user.emailVerified,
                emailSent: global.emailServiceAvailable && result.user.verificationToken,
                instructions: result.user.emailVerified ? 
                    'Du kannst dich sofort anmelden.' : 
                    'Bitte prüfe deine E-Mails und bestätige deine E-Mail-Adresse.'
            });
            
        } catch (error) {
            console.error('🚨 Registration Fehler:', error);
            
            if (error.message.includes('bereits vergeben')) {
                res.status(409).json({
                    error: 'User bereits vorhanden',
                    message: error.message
                });
            } else {
                res.status(500).json({
                    error: 'Fehler bei der Registrierung',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    }
);

// POST /auth/login - User anmelden (mit E-Mail-Verifikation)
router.post('/login', 
    authLoginLimit,                         // Rate Limiting
    botProtectionMiddleware,                // Bot Protection
    validateUserLogin,                      // Input Validation
    async function (req, res) {
        console.log('🔑 LOGIN Request empfangen');
        
        if (!global.databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Anmeldung temporär nicht möglich.'
            });
        }
        
        try {
            const result = await AuthService.loginUser(req.body);
            
            console.log('🎉 Login erfolgreich für User:', result.user.username);
            
            // Auth Event Tracking
            if (global.MonitoringSystem) {
                try {
                    global.MonitoringSystem.trackAuth('login', true);
                } catch (error) {
                    console.warn('⚠️ Monitoring trackAuth failed:', error.message);
                }
            }
            
            res.json({
                message: 'Erfolgreich angemeldet',
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    emailVerified: result.user.emailVerified,
                    createdAt: result.user.createdAt
                },
                token: result.token,
                expiresIn: result.expiresIn
            });
            
        } catch (error) {
            console.error('🚨 Login Fehler:', error.message);
            
            // Track failed login
            if (global.MonitoringSystem) {
                try {
                    global.MonitoringSystem.trackAuth('login', false);
                } catch (monitoringError) {
                    console.warn('⚠️ Monitoring trackAuth failed:', monitoringError.message);
                }
            }
            
            // Spezifische Fehlermeldung für nicht verifizierte E-Mail
            if (error.message.includes('E-Mail nicht verifiziert')) {
                res.status(403).json({
                    error: 'E-Mail nicht verifiziert',
                    message: error.message,
                    code: 'EMAIL_NOT_VERIFIED',
                    instructions: 'Bitte bestätige deine E-Mail-Adresse oder fordere eine neue Bestätigungs-E-Mail an.'
                });
            } else {
                // Aus Sicherheitsgründen immer die gleiche Fehlermeldung für andere Fälle
                res.status(401).json({
                    error: 'Anmeldung fehlgeschlagen',
                    message: 'Ungültiger Username oder Passwort'
                });
            }
        }
    }
);

// GET /auth/verify-email/:token - E-Mail verifizieren
router.get('/verify-email/:token', 
    rateLimitMiddleware('emailVerify'),     // Nur Rate Limiting
    async function(req, res) {
        console.log('✅ E-Mail-Verifikation Request:', req.params.token);
        
        if (!global.databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
            const verifiedUser = await AuthService.verifyEmail(req.params.token);
            
            res.json({
                message: 'E-Mail erfolgreich verifiziert!',
                user: {
                    id: verifiedUser.id,
                    username: verifiedUser.username,
                    email: verifiedUser.email,
                    emailVerified: verifiedUser.emailVerified
                },
                instructions: 'Du kannst dich jetzt anmelden.'
            });
            
        } catch (error) {
            console.error('🚨 E-Mail-Verifikation Fehler:', error);
            
            if (error.message.includes('Ungültiger oder abgelaufener')) {
                res.status(400).json({
                    error: 'Ungültiger Token',
                    message: 'Der Verifikations-Link ist ungültig oder abgelaufen',
                    code: 'INVALID_TOKEN',
                    instructions: 'Bitte fordere eine neue Bestätigungs-E-Mail an.'
                });
            } else {
                res.status(500).json({
                    error: 'Verifikation fehlgeschlagen',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    }
);

// POST /auth/resend-verification - Neuen Verifikations-Token anfordern
router.post('/resend-verification', 
    authRegisterLimit,                      // Rate Limiting
    botProtectionMiddleware,                // Bot Protection
    async function(req, res) {
        console.log('📧 Neuen Verifikations-Token angefordert');
        
        if (!global.databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        if (!global.emailServiceAvailable) {
            return res.status(503).json({
                error: 'E-Mail-Service nicht verfügbar',
                message: 'E-Mail-Versand temporär nicht möglich.'
            });
        }
        
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({
                    error: 'E-Mail fehlt',
                    message: 'E-Mail-Adresse ist erforderlich'
                });
            }
            
            const userWithNewToken = await AuthService.resendVerificationToken(email);
            
            // Neue Verifikations-E-Mail senden
            await EmailService.sendVerificationEmail(userWithNewToken);
            
            res.json({
                message: 'Neue Verifikations-E-Mail wurde gesendet',
                email: email,
                instructions: 'Bitte prüfe deine E-Mails und klicke auf den Bestätigungslink.'
            });
            
        } catch (error) {
            console.error('🚨 Resend-Verifikation Fehler:', error);
            
            if (error.message.includes('nicht gefunden')) {
                res.status(404).json({
                    error: 'E-Mail nicht gefunden',
                    message: 'Diese E-Mail-Adresse ist nicht registriert'
                });
            } else if (error.message.includes('bereits verifiziert')) {
                res.status(400).json({
                    error: 'Bereits verifiziert',
                    message: 'Diese E-Mail-Adresse ist bereits bestätigt'
                });
            } else {
                res.status(500).json({
                    error: 'E-Mail-Versand fehlgeschlagen',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    }
);

// GET /auth/me - Aktuelle User-Info abrufen
router.get('/me', authenticateToken, async function (req, res) {
    if (!global.databaseAvailable) {
        return res.status(503).json({
            error: 'Service nicht verfügbar',
            message: 'Datenbank nicht verfügbar.'
        });
    }
    
    try {
        res.json({
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                emailVerified: req.user.emailVerified,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        console.error('🚨 Get Me Fehler:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der User-Daten',
            message: 'Ein interner Fehler ist aufgetreten'
        });
    }
});

// POST /auth/logout - Abmelden (Client-side)
router.post('/logout', function (req, res) {
    res.json({
        message: 'Erfolgreich abgemeldet',
        instructions: 'Token auf Client-Seite löschen'
    });
});

console.log('✅ Auth Routes loaded');

module.exports = router;