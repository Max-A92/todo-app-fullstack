// ===== AUTHENTICATION SERVICE =====
const { generateToken } = require('../middleware/auth');
const EmailValidator = require('../utils/EmailValidator');

console.log('🔐 AuthService loading...');

const AuthService = {
    
    // User registrieren mit E-Mail-Verifikation
    registerUser: async function(userData) {
        console.log('🆕 AuthService: Registriere User:', userData.username, 'Email:', userData.email);
        
        const { username, email, password } = userData;
        
        // E-Mail-Validierung mit detailliertem Feedback
        const emailValidation = EmailValidator.validateEmail(email);
        
        if (!emailValidation.valid) {
            throw new Error(emailValidation.error);
        }
        
        // Database laden
        const Database = require('../models/database');
        
        // User erstellen mit Verifikations-Token
        const newUser = await Database.createUser(
            username.trim(), 
            emailValidation.email,
            password
        );
        
        // Erfolgs-Logging
        console.log('🎉 AuthService: User erfolgreich registriert:', {
            username: newUser.username,
            email: emailValidation.email,
            provider: emailValidation.provider,
            category: emailValidation.category,
            securityLevel: emailValidation.securityLevel,
            emailVerificationRequired: !newUser.emailVerified
        });
        
        return {
            user: newUser,
            emailInfo: {
                provider: emailValidation.provider,
                category: emailValidation.category,
                securityLevel: emailValidation.securityLevel
            }
        };
    },
    
    // User anmelden
    loginUser: async function(credentials) {
        console.log('🔑 AuthService: Authentifiziere User:', credentials.username);
        
        const { username, password } = credentials;
        
        // Database laden
        const Database = require('../models/database');
        
        // User authentifizieren (prüft automatisch E-Mail-Verifikation)
        const user = await Database.authenticateUser(username.trim(), password);
        const token = generateToken(user);
        
        const SecurityConfig = require('../config/security');
        
        return {
            user: user,
            token: token,
            expiresIn: SecurityConfig.jwt.expiresIn
        };
    },
    
    // E-Mail verifizieren
    verifyEmail: async function(token) {
        console.log('✅ AuthService: Verifiziere E-Mail mit Token:', token);
        
        if (!token) {
            throw new Error('Token fehlt - Verifikations-Token ist erforderlich');
        }
        
        // Database laden
        const Database = require('../models/database');
        
        const verifiedUser = await Database.verifyUserEmail(token);
        
        console.log('🎉 AuthService: E-Mail erfolgreich verifiziert für User:', verifiedUser.username);
        return verifiedUser;
    },
    
    // Neuen Verifikations-Token senden
    resendVerificationToken: async function(email) {
        console.log('📧 AuthService: Sende neuen Verifikations-Token für:', email);
        
        if (!email) {
            throw new Error('E-Mail fehlt - E-Mail-Adresse ist erforderlich');
        }
        
        // Database laden
        const Database = require('../models/database');
        
        const userWithNewToken = await Database.resendVerificationToken(email);
        
        console.log('✅ AuthService: Neuer Verifikations-Token erstellt');
        return userWithNewToken;
    }
};

console.log('✅ AuthService loaded');

module.exports = AuthService;