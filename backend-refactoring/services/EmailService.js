// ===== EMAIL SERVICE =====
const nodemailer = require('nodemailer');
const EmailConfig = require('../config/email');
const SecurityConfig = require('../config/security');

console.log('📧 EmailService loading...');

// E-Mail-Transporter konfigurieren
const emailTransporter = nodemailer.createTransport(EmailConfig.smtp);

const EmailService = {
    
    // E-Mail-Service testen
    testConnection: async function() {
        if (!EmailConfig.isConfigured()) {
            console.log('⚠️ E-Mail-Service nicht konfiguriert - Verifikation deaktiviert');
            return false;
        }
        
        try {
            await emailTransporter.verify();
            console.log('✅ E-Mail-Service bereit');
            return true;
        } catch (error) {
            console.error('🚨 E-Mail-Service Fehler:', error.message);
            return false;
        }
    },
    
    // Verifikations-E-Mail senden
    sendVerificationEmail: async function(user) {
        console.log('📧 EmailService: Sende Verifikations-E-Mail an:', user.email);
        
        if (!EmailConfig.isConfigured()) {
            throw new Error('E-Mail-Service nicht konfiguriert');
        }
        
        const verificationUrl = `${SecurityConfig.frontendUrl}?action=verify&token=${user.verificationToken}`;
        
        const mailOptions = {
            from: EmailConfig.settings.from,
            to: user.email,
            subject: EmailConfig.templates.verification.subject,
            html: EmailConfig.templates.verification.getHtml(user, verificationUrl)
        };
        
        try {
            await emailTransporter.sendMail(mailOptions);
            console.log('📧 EmailService: Verifikations-E-Mail erfolgreich gesendet an:', user.email);
            return true;
        } catch (error) {
            console.error('🚨 EmailService: Fehler beim E-Mail-Versand:', error);
            throw new Error('E-Mail konnte nicht gesendet werden: ' + error.message);
        }
    },
    
    // E-Mail-Service Status
    getStatus: function() {
        return {
            configured: EmailConfig.isConfigured(),
            host: EmailConfig.smtp.host,
            port: EmailConfig.smtp.port,
            user: EmailConfig.smtp.auth.user,
            from: EmailConfig.settings.from
        };
    }
};

console.log('✅ EmailService loaded');
console.log('📧 EmailService Status:', EmailService.getStatus());

module.exports = EmailService;