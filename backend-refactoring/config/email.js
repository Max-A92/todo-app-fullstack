// ===== EMAIL SERVICE CONFIGURATION =====
require('dotenv').config();

const EmailConfig = {
    // SMTP Configuration
    smtp: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true für 465, false für andere ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    },
    
    // Email Settings
    settings: {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
        timeout: parseInt(process.env.EMAIL_TIMEOUT) || 10000,
        retries: parseInt(process.env.EMAIL_RETRIES) || 3
    },
    
    // Email Templates
    templates: {
        verification: {
            subject: '📧 E-Mail-Adresse bestätigen - Todo App',
            getHtml: function(user, verificationUrl) {
                return `
                    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0; font-size: 28px;">📋 Todo App</h1>
                            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">E-Mail-Bestätigung</p>
                        </div>
                        
                        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; margin-top: 0;">🎉 Willkommen, ${user.username}!</h2>
                            <p>Vielen Dank für deine Registrierung bei der Todo App! Um deinen Account zu aktivieren, bestätige bitte deine E-Mail-Adresse:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${verificationUrl}" 
                                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                                    ✅ E-Mail bestätigen
                                </a>
                            </div>
                            
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 14px; color: #666;"><strong>Link funktioniert nicht?</strong></p>
                                <p style="margin: 5px 0 0; font-size: 13px; word-break: break-all; color: #007bff;">
                                    ${verificationUrl}
                                </p>
                            </div>
                            
                            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                                <p style="margin: 0; font-size: 13px; color: #999;">
                                    ⏰ Dieser Link ist <strong>24 Stunden</strong> gültig.<br>
                                    🔒 Falls du dich nicht registriert hast, ignoriere diese E-Mail.
                                </p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
                            Todo App - Deine persönliche Aufgabenverwaltung
                        </div>
                    </div>
                `;
            }
        }
    },
    
    // Service Status
    isConfigured: function() {
        return !!(this.smtp.auth.user && this.smtp.auth.pass);
    }
};

console.log('📧 Email Configuration loaded');
console.log('📧 Email Service:', EmailConfig.isConfigured() ? 'CONFIGURED ✅' : 'NOT CONFIGURED ❌');
if (EmailConfig.isConfigured()) {
    console.log('📧 SMTP Host:', EmailConfig.smtp.host);
    console.log('📧 SMTP Port:', EmailConfig.smtp.port);
    console.log('📧 From Address:', EmailConfig.settings.from);
}

module.exports = EmailConfig;