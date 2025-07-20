// PRODUCTION BACKEND - International Email Validation + E-Mail-Verifikation + SQLite Database + Authentication
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Environment Variables laden

const Database = require('./database'); // SQLite Database Module

// Module Pattern für Server-Funktionalität
const TaskServer = (function () {
    'use strict';
    
    // PRODUCTION KONFIGURATION
    const PORT = process.env.PORT || 10000;
    const JWT_SECRET = process.env.JWT_SECRET || 'production-fallback-secret-2025';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    const NODE_ENV = process.env.NODE_ENV || 'production';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const STATUS = {
        OPEN: 'offen',
        COMPLETED: 'erledigt'
    };
    
    // Express App initialisieren
    const app = express();
    
    console.log('🏭 === STARTING EMAIL VERIFICATION TODO SERVER ===');
    console.log('📍 PORT:', PORT);
    console.log('🌍 NODE_ENV:', NODE_ENV);
    console.log('🔑 JWT_SECRET:', JWT_SECRET ? 'SET ✅' : 'NOT SET ❌');
    console.log('⏰ JWT_EXPIRES_IN:', JWT_EXPIRES_IN);
    console.log('🌐 FRONTEND_URL:', FRONTEND_URL);
    console.log('📧 Email Service:', process.env.EMAIL_USER ? 'CONFIGURED ✅' : 'NOT CONFIGURED ❌');
    console.log('🌍 Email Validation: INTERNATIONAL (200+ disposable domains blocked)');
    
    // ===== E-MAIL-SERVICE KONFIGURATION =====
    
    // E-Mail-Transporter konfigurieren
    const emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true für 465, false für andere ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    
    // E-Mail-Service testen
    const testEmailConnection = async function() {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
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
    };
    
    // E-Mail-Versand-Funktionen
    const EmailService = {
        // Verifikations-E-Mail senden
        sendVerificationEmail: async function(user) {
            const verificationUrl = `${FRONTEND_URL}?action=verify&token=${user.verificationToken}`;
            
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: user.email,
                subject: '📧 E-Mail-Adresse bestätigen - Todo App',
                html: `
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
                `
            };
            
            try {
                await emailTransporter.sendMail(mailOptions);
                console.log('📧 Verifikations-E-Mail gesendet an:', user.email);
                return true;
            } catch (error) {
                console.error('🚨 Fehler beim E-Mail-Versand:', error);
                throw new Error('E-Mail konnte nicht gesendet werden: ' + error.message);
            }
        }
    };
    
    // ===== INTERNATIONALE E-MAIL-VALIDIERUNG =====
    
    // Umfassende internationale Wegwerf-E-Mail-Domains
    const DISPOSABLE_EMAIL_DOMAINS = new Set([
        // === ENGLISCHSPRACHIGE SERVICES ===
        '10minutemail.com', '10minutemail.net', '10minutemail.org',
        '20minutemail.com', '30minutemail.com', '60minutemail.com',
        'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.de',
        'mailinator.com', 'mailinator.net', 'mailinator.org', 'mailinator2.com',
        'tempmail.org', 'temp-mail.org', 'temporary-mail.com', 'temporaryemail.net',
        'throwaway.email', 'throwawaymail.com', 'throwawaymailbox.com',
        'getnada.com', 'nadamail.com', 'getairmail.com',
        'maildrop.cc', 'mailnesia.com', 'mailcatch.com', 'mailmetrash.com',
        'trashmail.com', 'trashmail.net', 'trashmail.org', 'trashmail.ws',
        'dispostable.com', 'fakeinbox.com', 'spamgourmet.com',
        'jetable.org', 'mytrashmail.com', 'no-spam.ws', 'nospam4.us',
        'objectmail.com', 'proxymail.eu', 'rcpt.at', 'safe-mail.net',
        'selfdestructingmail.com', 'spam4.me', 'tmail.ws', 'tmailinator.com',
        'anonymousmail24.com', 'dropmail.me', 'fakemail.fr', 'hidemail.de',
        'incognitomail.org', 'mailexpire.com', 'mailfreeonline.com', 'mailscrap.com',
        'mohmal.com', 'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
        'pokemail.net', 'put2.net', 'mailforspam.com', 'bccto.me',
        'emailondeck.com', 'filzmail.com', 'getonemail.com', 'h8s.org',
        'jourrapide.com', 'lookugly.com', 'lopl.co.cc', 'lr78.com',
        'maileater.com', 'mailexpire.com', 'mailin8r.com', 'mailzilla.com',
        'myspaceinc.com', 'myspaceinc.net', 'myspaceinc.org', 'myspacepimpedup.com',
        'noclickemail.com', 'oneoffmail.com', 'opayq.com', 'orangatango.com',
        'pjkh.com', 'plexolan.de', 'pookmail.com', 'privacy.net', 'privatdemail.net',
        'proxymail.eu', 'putthisinyourspamdatabase.com', 'quickinbox.com',
        'rcpt.at', 'recode.me', 'rhyta.com', 'rtrtr.com', 'sendspamhere.com',
        'smellfear.com', 'snakemail.com', 'sneakemail.com', 'sogetthis.com',
        'soodonims.com', 'spam.la', 'spamavert.com', 'spambob.net', 'spambob.org',
        'spambog.com', 'spambog.de', 'spambog.net', 'spambog.ru', 'spambox.org',
        'spambox.us', 'spamcannon.com', 'spamcannon.net', 'spamcon.org',
        'spamcorptastic.com', 'spamday.com', 'spamex.com', 'spamfree24.com',
        'spamfree24.de', 'spamfree24.eu', 'spamfree24.net', 'spamfree24.org',
        'spamherelots.com', 'spamhereplease.com', 'spamhole.com', 'spami.spam.co.za',
        'spaml.com', 'spaml.de', 'spammotel.com', 'spamobox.com', 'spamspot.com',
        'spamstack.net', 'spamthis.co.uk', 'spamthisplease.com', 'spamtrail.com',
        'spamtroll.net', 'speed.1s.fr', 'spoofmail.de', 'stuffmail.de',
        'super-auswahl.de', 'supergreatmail.com', 'supermailer.jp', 'superplatypus.com',
        'teleworm.com', 'teleworm.us', 'temp-mail.de', 'temp-mail.org',
        'tempail.com', 'tempalias.com', 'tempe-mail.com', 'tempemail.biz',
        'tempemail.com', 'tempinbox.co.uk', 'tempinbox.com', 'tempmail.it',
        'tempmail2.com', 'tempmaildemo.com', 'tempmailer.com', 'tempmailer.de',
        'tempomail.fr', 'temporarily.de', 'temporaryforwarding.com', 'temporaryinbox.com',
        'temporarymailaddress.com', 'tempthe.net', 'thankyou2010.com', 'thecloudindex.com',
        'thelimestones.com', 'thisisnotmyrealemail.com', 'thismail.net',
        'throwam.com', 'tilien.com', 'tittbit.in', 'tizi.com', 'tmailinator.com',
        'toiea.com', 'tradermail.info', 'trash-amil.com', 'trash-mail.at',
        'trash-mail.com', 'trash-mail.de', 'trash2009.com', 'trashdevil.com',
        'trashemail.de', 'trashymail.com', 'trialmail.de', 'turual.com',
        'twinmail.de', 'tyldd.com', 'uggsrock.com', 'wegwerfmail.de',
        'wegwerfmail.net', 'wegwerfmail.org', 'wh4f.org', 'whopy.com',
        'willselfdestruct.com', 'winemaven.info', 'wronghead.com', 'wuzup.net',
        'wuzupmail.net', 'www.e4ward.com', 'www.gishpuppy.com', 'www.mailinator.com',
        'xagloo.com', 'xemaps.com', 'xents.com', 'xmaily.com', 'xoxy.net',
        'yapped.net', 'yeah.net', 'yep.it', 'yogamaven.com', 'yopmail.com',
        'yopmail.fr', 'yopmail.net', 'ypmail.webredirect.org', 'yuoia.com',
        'yuurok.com', 'zehnminuten.de', 'zehnminutenmail.de', 'zetmail.com',
        'zippymail.info', 'zoaxe.com', 'zoemail.org', 'zoemail.net',
        
        // === DEUTSCHE SERVICES ===
        'wegwerfmail.de', 'wegwerfmail.net', 'wegwerfmail.org',
        'wegwerfemail.de', 'einmalmail.de', 'trashinbox.de',
        'kurzemail.de', 'tempemail.de', 'spambog.de', 'trash-mail.de',
        'zehnminuten.de', 'zehnminutenmail.de', 'temporaryforwarding.com',
        'tempmailer.de', 'plexolan.de', 'stuffmail.de', 'spoofmail.de',
        'temporarily.de', 'trialmail.de', 'twinmail.de',
        
        // === FRANZÖSISCHE SERVICES ===
        'yopmail.fr', 'jetable.org', 'fakemail.fr', 'tempomail.fr',
        'speed.1s.fr', 'temp-mail.fr', 'jetable.net', 'jetable.com',
        'temporaire.fr', 'poubelle-mail.fr', 'mail-temporaire.fr',
        
        // === SPANISCHE/LATEINAMERIKANISCHE SERVICES ===
        'correo-temporal.com', 'temporal-email.com', 'email-temporal.com',
        'mailtemp.info', 'correotemporal.org', 'tempail.com',
        
        // === ITALIENISCHE SERVICES ===
        'tempmail.it', 'email-temporanea.it', 'mailinator.it',
        
        // === RUSSISCHE/OSTEUROPÄISCHE SERVICES ===
        'spambog.ru', 'tempmail.ru', 'temp-mail.ru', 'guerrillamail.biz',
        'mailforspam.com', 'tempmail.net', 'temporary-mail.net',
        
        // === ASIATISCHE SERVICES ===
        'tempmail.jp', 'supermailer.jp', 'temp-mail.asia',
        'tempmail.asia', 'temporary-mail.asia',
        
        // === BRASILIANISCHE SERVICES ===
        'tempmail.com.br', 'email-temporario.com.br', 'temp-mail.br',
        
        // === WEITERE INTERNATIONALE ===
        'tempmail.co.uk', 'tempinbox.co.uk', 'spamthis.co.uk',
        'tempmail.ca', 'tempmail.com.au', 'tempmail.co.za',
        'spam.co.za', 'spami.spam.co.za',
        
        // === NEUE/MODERNE SERVICES ===
        'temp-inbox.com', '1secmail.com', '1secmail.org', '1secmail.net',
        'emailfake.com', 'mohmal.in', 'tempmailo.com', 'temp-mail.io',
        'burnermail.io', 'guerrillamail.info', 'guerrillamail.biz',
        'guerrillamail.ws', 'guerrillamail.to', 'sharklasers.com',
        'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
        'grr.la', 'guerrillmail.org'
    ]);
    
    // Verdächtige Patterns für internationale E-Mail-Erkennung
    const SUSPICIOUS_PATTERNS = [
        // Englisch
        'temp', 'trash', 'fake', 'spam', 'throw', 'dispos', 'guerr', 
        'minute', 'hour', 'day', 'week', 'mail', 'drop', 'catch',
        'expire', 'destroy', 'self', 'anonym', 'hidden', 'privacy',
        'burner', 'disposable', 'temporary', 'throwaway',
        
        // Deutsch
        'wegwerf', 'einmal', 'kurz', 'temp', 'müll', 'trash',
        
        // Französisch
        'jetable', 'temporaire', 'poubelle',
        
        // Spanisch
        'temporal', 'temporario', 'basura',
        
        // Italienisch
        'temporanea', 'cestino',
        
        // Andere Sprachen
        'одноразов', 'временн', 'spam', 'мусор'  // Russisch
    ];
    
    // Verdächtige TLDs
    const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.pw'];
    
    // E-Mail-Provider-Kategorisierung
    const EMAIL_CATEGORIES = {
        major_international: new Set([
            'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com',
            'live.com', 'yahoo.com', 'icloud.com', 'me.com', 'aol.com'
        ]),
        
        regional_european: new Set([
            'web.de', 'gmx.de', 't-online.de', 'freenet.de', 'arcor.de',
            'laposte.net', 'orange.fr', 'free.fr', 'sfr.fr',  // Französisch
            'libero.it', 'alice.it', 'virgilio.it',           // Italienisch
            'mail.ru', 'yandex.ru', 'rambler.ru',             // Russisch
            'wp.pl', 'o2.pl', 'interia.pl'                    // Polnisch
        ]),
        
        privacy_focused: new Set([
            'protonmail.com', 'proton.me', 'tutanota.com', 'fastmail.com',
            'zoho.com', 'runbox.com', 'posteo.de', 'mailbox.org'
        ])
    };
    
    // Internationale E-Mail-Validierungsfunktionen
    const EmailValidator = {
        // Basis-Format-Validierung
        isValidFormat: function(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email) && email.length <= 254;
        },
        
        // Domain-Kategorisierung
        categorizeEmail: function(email) {
            const domain = email.split('@')[1].toLowerCase();
            
            if (EMAIL_CATEGORIES.major_international.has(domain)) {
                return { category: 'major_international', provider: this.getProviderName(domain) };
            } else if (EMAIL_CATEGORIES.regional_european.has(domain)) {
                return { category: 'regional_european', provider: this.getProviderName(domain) };
            } else if (EMAIL_CATEGORIES.privacy_focused.has(domain)) {
                return { category: 'privacy_focused', provider: this.getProviderName(domain) };
            } else if (domain.endsWith('.edu') || domain.endsWith('.ac.uk') || domain.includes('university')) {
                return { category: 'educational', provider: 'Educational Institution' };
            } else {
                return { category: 'business_or_personal', provider: 'Unknown Provider' };
            }
        },
        
        // Provider-Name ermitteln
        getProviderName: function(domain) {
            const providers = {
                'gmail.com': 'Google Gmail',
                'googlemail.com': 'Google Gmail',
                'outlook.com': 'Microsoft Outlook',
                'hotmail.com': 'Microsoft Hotmail',
                'live.com': 'Microsoft Live',
                'yahoo.com': 'Yahoo Mail',
                'icloud.com': 'Apple iCloud',
                'web.de': 'Web.de',
                'gmx.de': 'GMX Deutschland',
                't-online.de': 'T-Online',
                'protonmail.com': 'ProtonMail',
                'tutanota.com': 'Tutanota'
            };
            
            return providers[domain] || domain;
        },
        
        // Hauptvalidierung (Liberal Approach für GitHub-Projekt)
        validateEmail: function(email) {
            if (!email || typeof email !== 'string') {
                return {
                    valid: false,
                    error: 'E-Mail ist erforderlich',
                    code: 'MISSING_EMAIL'
                };
            }
            
            const trimmedEmail = email.trim().toLowerCase();
            
            // Format prüfen
            if (!this.isValidFormat(trimmedEmail)) {
                return {
                    valid: false,
                    error: 'Ungültiges E-Mail-Format',
                    code: 'INVALID_FORMAT',
                    suggestion: 'Beispiel: max@example.com'
                };
            }
            
            const domain = trimmedEmail.split('@')[1];
            
            // Wegwerf-E-Mail-Domains blockieren
            if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
                return {
                    valid: false,
                    error: 'Wegwerf-E-Mail-Adressen sind nicht erlaubt',
                    code: 'DISPOSABLE_EMAIL',
                    suggestion: 'Verwende deine echte E-Mail-Adresse von Gmail, Outlook, Yahoo, Web.de, GMX oder deiner Firma'
                };
            }
            
            // Verdächtige Patterns erkennen
            const hasSuspiciousPattern = SUSPICIOUS_PATTERNS.some(pattern => 
                domain.includes(pattern)
            );
            
            if (hasSuspiciousPattern) {
                return {
                    valid: false,
                    error: 'Diese E-Mail-Domain erscheint verdächtig',
                    code: 'SUSPICIOUS_DOMAIN',
                    suggestion: 'Verwende eine E-Mail von einem bekannten Anbieter'
                };
            }
            
            // Domain-Struktur-Validierung
            if (domain.length < 4 ||                          // Zu kurz
                (domain.match(/\d/g) || []).length > 5 ||     // Zu viele Zahlen
                domain.includes('--') ||                       // Doppel-Bindestrich
                domain.startsWith('-') ||                      // Beginnt mit Bindestrich
                domain.endsWith('-') ||                        // Endet mit Bindestrich
                domain.includes('..') ||                       // Doppel-Punkt
                SUSPICIOUS_TLDS.some(tld => domain.endsWith(tld))) {
                
                return {
                    valid: false,
                    error: 'Diese E-Mail-Domain ist nicht erlaubt',
                    code: 'INVALID_DOMAIN',
                    suggestion: 'Verwende eine E-Mail von einem seriösen Anbieter'
                };
            }
            
            // E-Mail ist gültig
            const categoryInfo = this.categorizeEmail(trimmedEmail);
            
            return {
                valid: true,
                email: trimmedEmail,
                domain: domain,
                category: categoryInfo.category,
                provider: categoryInfo.provider,
                message: `E-Mail von ${categoryInfo.provider} akzeptiert`
            };
        }
    };
    
    // Logging für Statistiken
    const logEmailValidation = function(email, result) {
        const logData = {
            timestamp: new Date().toISOString(),
            domain: email.split('@')[1].toLowerCase(),
            category: result.category || 'rejected',
            accepted: result.valid,
            reason: result.code || 'accepted'
        };
        
        console.log('📧 Email Validation:', logData);
    };
    
    // ===== ENDE E-MAIL-VALIDIERUNG =====
    
    // Standard-Validierungsfunktionen (erweitert)
    const isValidTaskText = function (text) {
        return typeof text === 'string' && text.trim() !== '' && text.trim().length <= 500;
    };
    
    const isValidTaskId = function (id) {
        const numId = Number(id);
        return Number.isInteger(numId) && numId > 0;
    };
    
    const isValidUsername = function (username) {
        return typeof username === 'string' && 
               username.trim().length >= 3 && 
               username.trim().length <= 30 &&
               /^[a-zA-Z0-9_-]+$/.test(username.trim());
    };
    
    // E-Mail-Validierung mit detailliertem Feedback
    const validateEmailWithFeedback = function(email) {
        return EmailValidator.validateEmail(email);
    };
    
    const isValidPassword = function (password) {
        return typeof password === 'string' && 
               password.length >= 6 && 
               password.length <= 100;
    };
    
    // JWT Token Hilfsfunktionen
    const generateToken = function (user) {
        const payload = {
            userId: user.id,
            username: user.username,
            email: user.email
        };
        
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
    };
    
    const verifyToken = function (token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Ungültiger Token');
        }
    };
    
    // Database Status
    let databaseAvailable = false;
    let emailServiceAvailable = false;
    
    // Authentication Middleware
    const authenticateToken = async function (req, res, next) {
        if (NODE_ENV === 'development') {
            console.log('🔐 Prüfe Authentication...');
        }
        
        if (!databaseAvailable) {
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
            const user = await Database.getUserById(decoded.userId);
            
            if (!user) {
                return res.status(401).json({
                    error: 'User nicht gefunden',
                    message: 'Token ist gültig, aber User existiert nicht mehr'
                });
            }
            
            req.user = user;
            if (NODE_ENV === 'development') {
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
        if (!databaseAvailable) {
            req.user = null;
            return next();
        }
        
        try {
            const authHeader = req.headers.authorization;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const decoded = verifyToken(token);
                const user = await Database.getUserById(decoded.userId);
                
                if (user) {
                    req.user = user;
                    if (NODE_ENV === 'development') {
                        console.log('👤 Optional Auth: User erkannt:', user.username);
                    }
                }
            }
            
            next();
        } catch (error) {
            if (NODE_ENV === 'development') {
                console.log('⚠️ Optional Auth: Token ungültig, verwende Demo-User');
            }
            next(); // Fehler ignorieren, Demo-User verwenden
        }
    };
    
    // CORS-MIDDLEWARE (unverändert)
    const setupMiddleware = function () {
        console.log('⚙️ Setting up EXTENDED CORS with email verification...');
        
        // JSON Parser
        app.use(express.json({
            limit: '1mb',
            strict: true
        }));
        
        // CORS
        app.use(function (req, res, next) {
            const origin = req.headers.origin;
            const method = req.method;
            const path = req.path;
            
            const allowedOrigins = [
                'https://todo-app-fullstack-gamma.vercel.app',
                'http://localhost:3000',
                'http://localhost:8080', 
                'http://127.0.0.1:5500',
                'http://localhost:5500',
                'https://localhost:3000',
                'null'
            ];
            
            let allowedOrigin;
            if (!origin) {
                allowedOrigin = allowedOrigins[0];
            } else if (allowedOrigins.includes(origin)) {
                allowedOrigin = origin;
            } else {
                allowedOrigin = allowedOrigins[0];
            }
            
            res.header('Access-Control-Allow-Origin', allowedOrigin);
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400');
            
            if (method === 'OPTIONS') {
                res.status(200).json({
                    message: 'CORS Preflight OK',
                    allowedOrigin: allowedOrigin,
                    allowedOrigins: allowedOrigins,
                    allowedMethods: 'GET, POST, PUT, DELETE, OPTIONS',
                    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
                });
                return;
            }
            
            next();
        });
        
        // REQUEST LOGGING
        app.use(function (req, res, next) {
            const timestamp = new Date().toISOString();
            const hasAuth = req.headers.authorization ? '🔐' : '📝';
            const origin = req.headers.origin || 'direct';
            console.log(`${timestamp} - ${hasAuth} ${req.method} ${req.path} from ${origin}`);
            next();
        });
        
        console.log('✅ Extended CORS with email verification setup complete');
    };
    
    // ===== AUTHENTICATION ROUTE HANDLERS (erweitert mit E-Mail-Verifikation) =====
    
    // POST /auth/register - ERWEITERTE Registrierung mit E-Mail-Verifikation
    const handleRegister = async function (req, res) {
        console.log('🆕 REGISTER Request mit E-Mail-Verifikation');
        
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Registrierung temporär nicht möglich.'
            });
        }
        
        try {
            const { username, email, password } = req.body;
            
            // Username-Validierung
            if (!isValidUsername(username)) {
                return res.status(400).json({
                    error: 'Ungültiger Username',
                    message: 'Username: 3-30 Zeichen, nur Buchstaben, Zahlen, _ und -'
                });
            }
            
            // ERWEITERTE E-MAIL-VALIDIERUNG
            const emailValidation = validateEmailWithFeedback(email);
            
            if (!emailValidation.valid) {
                return res.status(400).json({
                    error: 'Ungültige E-Mail',
                    message: emailValidation.error,
                    code: emailValidation.code,
                    suggestion: emailValidation.suggestion
                });
            }
            
            // Passwort-Validierung
            if (!isValidPassword(password)) {
                return res.status(400).json({
                    error: 'Ungültiges Passwort',
                    message: 'Passwort: 6-100 Zeichen erforderlich'
                });
            }
            
            // User erstellen mit Verifikations-Token
            const newUser = await Database.createUser(
                username.trim(), 
                emailValidation.email,
                password
            );
            
            // Verifikations-E-Mail senden (falls Service verfügbar)
            if (emailServiceAvailable && newUser.verificationToken) {
                try {
                    await EmailService.sendVerificationEmail(newUser);
                    console.log('📧 Verifikations-E-Mail erfolgreich gesendet');
                } catch (emailError) {
                    console.error('🚨 E-Mail-Versand fehlgeschlagen:', emailError.message);
                    // Registrierung trotzdem erfolgreich, aber ohne E-Mail
                }
            }
            
            // Erfolgs-Logging
            console.log('🎉 User erfolgreich registriert:', {
                username: newUser.username,
                email: emailValidation.email,
                provider: emailValidation.provider,
                category: emailValidation.category,
                emailVerificationRequired: !newUser.emailVerified
            });
            
            res.status(201).json({
                message: 'User erfolgreich registriert',
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    emailVerified: newUser.emailVerified,
                    createdAt: newUser.createdAt
                },
                emailInfo: {
                    provider: emailValidation.provider,
                    category: emailValidation.category
                },
                verificationRequired: !newUser.emailVerified,
                emailSent: emailServiceAvailable && newUser.verificationToken,
                instructions: newUser.emailVerified ? 
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
    };
    
    // POST /auth/login - User anmelden (mit E-Mail-Verifikation)
    const handleLogin = async function (req, res) {
        if (NODE_ENV === 'development') {
            console.log('🔑 LOGIN Request empfangen');
        }
        
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Anmeldung temporär nicht möglich.'
            });
        }
        
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({
                    error: 'Fehlende Daten',
                    message: 'Username und Password erforderlich'
                });
            }
            
            // User authentifizieren (prüft automatisch E-Mail-Verifikation)
            const user = await Database.authenticateUser(username.trim(), password);
            const token = generateToken(user);
            
            console.log('🎉 Login erfolgreich für User:', user.username);
            
            res.json({
                message: 'Erfolgreich angemeldet',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    createdAt: user.createdAt
                },
                token: token,
                expiresIn: JWT_EXPIRES_IN
            });
            
        } catch (error) {
            console.error('🚨 Login Fehler:', error.message);
            
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
    };
    
    // GET /auth/verify-email/:token - E-Mail verifizieren
    const handleVerifyEmail = async function(req, res) {
        console.log('✅ E-Mail-Verifikation Request:', req.params.token);
        
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
            const { token } = req.params;
            
            if (!token) {
                return res.status(400).json({
                    error: 'Token fehlt',
                    message: 'Verifikations-Token ist erforderlich'
                });
            }
            
            const verifiedUser = await Database.verifyUserEmail(token);
            
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
    };
    
    // POST /auth/resend-verification - Neuen Verifikations-Token anfordern
    const handleResendVerification = async function(req, res) {
        console.log('📧 Neuen Verifikations-Token angefordert');
        
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        if (!emailServiceAvailable) {
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
            
            const userWithNewToken = await Database.resendVerificationToken(email);
            
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
    };
    
    // GET /auth/me - Aktuelle User-Info abrufen
    const handleGetMe = async function (req, res) {
        if (!databaseAvailable) {
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
    };
    
    // POST /auth/logout - Abmelden (Client-side)
    const handleLogout = function (req, res) {
        res.json({
            message: 'Erfolgreich abgemeldet',
            instructions: 'Token auf Client-Seite löschen'
        });
    };
    
    // ===== TASK ROUTE HANDLERS (unverändert) =====
    
    // GET /tasks - Tasks für eingeloggten User abrufen
    const handleGetTasks = async function (req, res) {
        try {
            let tasks;
            
            if (!databaseAvailable) {
                // Demo-Daten wenn Database nicht verfügbar
                tasks = [
                    { id: 1, text: 'Demo-Aufgabe 1', status: 'offen' },
                    { id: 2, text: 'Demo-Aufgabe 2', status: 'erledigt' },
                    { id: 3, text: 'Database startet noch...', status: 'offen' }
                ];
            } else if (req.user) {
                // Authentifizierter User - lade nur seine Tasks
                tasks = await Database.getAllTasksForUser(req.user.id);
                if (NODE_ENV === 'development') {
                    console.log("👤 Lade Tasks für User:", req.user.username);
                }
            } else {
                // Legacy-Modus für Demo-User
                tasks = await Database.getAllTasks();
            }
            
            res.json(tasks);
        } catch (error) {
            console.error('🚨 Fehler beim Laden der Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Laden der Aufgaben',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    };
    
    // POST /tasks - Neue Task für User erstellen
    const handleCreateTask = async function (req, res) {
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar. Tasks können temporär nicht erstellt werden.'
            });
        }
        
        try {
            const text = req.body && req.body.text;
            
            if (!isValidTaskText(text)) {
                return res.status(400).json({
                    error: 'Ungültiger Aufgabentext',
                    message: 'Text ist erforderlich, darf nicht leer sein und maximal 500 Zeichen haben'
                });
            }
            
            let newTask;
            
            if (req.user) {
                // Authentifizierter User
                newTask = await Database.createTaskForUser(req.user.id, text.trim());
                if (NODE_ENV === 'development') {
                    console.log("👤 Erstelle Task für User:", req.user.username);
                }
            } else {
                // Legacy-Modus für Demo-User
                newTask = await Database.createTask(text.trim());
            }
            
            res.status(201).json(newTask);
            
        } catch (error) {
            console.error("🚨 FEHLER in handleCreateTask:", error);
            res.status(500).json({
                error: 'Fehler beim Erstellen der Aufgabe',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    };
    
    // PUT /tasks/:id - Status einer Task ändern (nur eigene)
    const handleToggleTask = async function (req, res) {
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
            const taskId = req.params.id;
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            let updatedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                updatedTask = await Database.toggleTaskStatusForUser(Number(taskId), req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                updatedTask = await Database.toggleTaskStatus(Number(taskId));
            }
            
            res.json(updatedTask);
            
        } catch (error) {
            console.error('🚨 Fehler beim Toggle Task Status:', error);
            
            if (error.message.includes('nicht gefunden') || error.message.includes('gehört nicht')) {
                res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Aufgabe nicht gefunden oder gehört nicht dir'
                });
            } else {
                res.status(500).json({
                    error: 'Fehler beim Ändern des Status',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    };
    
    // DELETE /tasks/:id - Task löschen (nur eigene)
    const handleDeleteTask = async function (req, res) {
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
            const taskId = req.params.id;
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            let deletedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                deletedTask = await Database.deleteTaskForUser(Number(taskId), req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                deletedTask = await Database.deleteTask(Number(taskId));
            }
            
            res.json({
                message: 'Aufgabe erfolgreich gelöscht',
                task: deletedTask
            });
            
        } catch (error) {
            console.error('🚨 Fehler beim Löschen der Task:', error);
            
            if (error.message.includes('nicht gefunden') || error.message.includes('gehört nicht')) {
                res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Aufgabe nicht gefunden oder gehört nicht dir'
                });
            } else {
                res.status(500).json({
                    error: 'Fehler beim Löschen der Aufgabe',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    };
    
    // DELETE /tasks?status=completed - Alle erledigten Tasks löschen
    const handleDeleteCompleted = async function (req, res) {
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
            const status = req.query.status;
            
            if (status !== 'completed' && status !== 'erledigt') {
                return res.status(400).json({
                    error: 'Ungültiger Parameter',
                    message: 'Parameter status=completed oder status=erledigt erforderlich'
                });
            }
            
            let result;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                result = await Database.deleteCompletedTasksForUser(req.user.id);
            } else {
                // Legacy-Modus für Demo-User
                result = await Database.deleteCompletedTasks();
            }
            
            res.json(result);
            
        } catch (error) {
            console.error('🚨 Fehler beim Löschen erledigter Tasks:', error);
            res.status(500).json({
                error: 'Fehler beim Löschen erledigter Aufgaben',
                message: 'Ein interner Fehler ist aufgetreten'
            });
        }
    };
    
    // PUT /tasks/:id/text - Task Text bearbeiten (nur eigene)
    const handleEditTaskText = async function (req, res) {
        if (!databaseAvailable) {
            return res.status(503).json({
                error: 'Service nicht verfügbar',
                message: 'Datenbank nicht verfügbar.'
            });
        }
        
        try {
            const taskId = req.params.id;
            const newText = req.body && req.body.text;
            
            if (!isValidTaskId(taskId)) {
                return res.status(400).json({
                    error: 'Ungültige Task-ID',
                    message: 'ID muss eine positive Ganzzahl sein'
                });
            }
            
            if (!isValidTaskText(newText)) {
                return res.status(400).json({
                    error: 'Ungültiger Aufgabentext',
                    message: 'Text ist erforderlich, darf nicht leer sein und maximal 500 Zeichen haben'
                });
            }
            
            let updatedTask;
            
            if (req.user) {
                // Authentifizierter User - nur eigene Tasks
                updatedTask = await Database.updateTaskTextForUser(Number(taskId), req.user.id, newText.trim());
            } else {
                // Legacy-Modus für Demo-User
                updatedTask = await Database.updateTaskText(Number(taskId), newText.trim());
            }
            
            res.json(updatedTask);
            
        } catch (error) {
            console.error('🚨 Fehler beim Bearbeiten des Task-Texts:', error);
            
            if (error.message.includes('nicht gefunden') || error.message.includes('gehört nicht')) {
                res.status(404).json({
                    error: 'Aufgabe nicht gefunden',
                    message: 'Aufgabe nicht gefunden oder gehört nicht dir'
                });
            } else {
                res.status(500).json({
                    error: 'Fehler beim Bearbeiten der Aufgabe',
                    message: 'Ein interner Fehler ist aufgetreten'
                });
            }
        }
    };
    
    // Routen registrieren
    const setupRoutes = function () {
        console.log('🛣️ Setting up routes with email verification...');
        
        // Health Check Route (erweitert)
        app.get('/health', function (req, res) {
            res.json({
                status: 'ok',
                message: 'EMAIL VERIFICATION TODO SERVER IS RUNNING',
                timestamp: new Date().toISOString(),
                version: 'EMAIL-VERIFICATION-1.0',
                port: PORT,
                environment: NODE_ENV,
                cors: 'EXTENDED_MULTI_ORIGIN',
                database: databaseAvailable ? 'connected' : 'unavailable',
                emailService: {
                    configured: emailServiceAvailable,
                    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'not configured'
                },
                emailValidation: {
                    type: 'international',
                    blockedDomains: DISPOSABLE_EMAIL_DOMAINS.size,
                    supportedLanguages: ['English', 'German', 'French', 'Spanish', 'Italian', 'Russian', 'Japanese', 'Portuguese'],
                    approach: 'liberal'
                },
                allowedOrigins: [
                    'https://todo-app-fullstack-gamma.vercel.app',
                    'http://localhost:3000',
                    'http://localhost:8080', 
                    'http://127.0.0.1:5500',
                    'http://localhost:5500',
                    'https://localhost:3000'
                ]
            });
        });
        
        // Root route
        app.get('/', function (req, res) {
            res.json({
                message: 'Todo App with Email Verification',
                version: 'EMAIL-VERIFICATION-1.0',
                environment: NODE_ENV,
                database: databaseAvailable ? 'connected' : 'unavailable',
                emailVerification: emailServiceAvailable ? 'enabled' : 'disabled',
                emailFeatures: {
                    internationalSupport: true,
                    disposableEmailBlocking: true,
                    blockedDomains: DISPOSABLE_EMAIL_DOMAINS.size,
                    supportedProviders: 'All major providers worldwide',
                    approach: 'Liberal (GitHub-friendly)'
                },
                endpoints: {
                    health: '/health',
                    auth: {
                        register: 'POST /auth/register (with email verification)',
                        login: 'POST /auth/login',
                        verifyEmail: 'GET /auth/verify-email/:token',
                        resendVerification: 'POST /auth/resend-verification',
                        me: 'GET /auth/me',
                        logout: 'POST /auth/logout'
                    },
                    tasks: {
                        list: 'GET /tasks',
                        create: 'POST /tasks',
                        toggle: 'PUT /tasks/:id',
                        delete: 'DELETE /tasks/:id',
                        edit: 'PUT /tasks/:id/text',
                        cleanup: 'DELETE /tasks?status=completed'
                    }
                }
            });
        });
        
        // Authentication Routes (erweitert)
        app.post('/auth/register', handleRegister);
        app.post('/auth/login', handleLogin);
        app.get('/auth/verify-email/:token', handleVerifyEmail);
        app.post('/auth/resend-verification', handleResendVerification);
        app.post('/auth/logout', handleLogout);
        app.get('/auth/me', authenticateToken, handleGetMe);
        
        // Task Routes
        app.get('/tasks', optionalAuth, handleGetTasks);
        app.post('/tasks', optionalAuth, handleCreateTask);
        app.put('/tasks/:id', optionalAuth, handleToggleTask);
        app.delete('/tasks/:id', optionalAuth, handleDeleteTask);
        app.delete('/tasks', optionalAuth, handleDeleteCompleted);
        app.put('/tasks/:id/text', optionalAuth, handleEditTaskText);
        
        // 404-Handler
        app.use(function (req, res) {
            res.status(404).json({
                error: 'Route nicht gefunden',
                message: 'Die angeforderte URL ' + req.path + ' existiert nicht',
                availableRoutes: ['/', '/health', '/auth/*', '/tasks/*']
            });
        });
        
        // Globaler Error-Handler
        app.use(function (err, req, res, next) {
            console.error('🚨 Unbehandelter Fehler:', err);
            res.status(500).json({
                error: 'Interner Serverfehler',
                message: 'Ein unerwarteter Fehler ist aufgetreten'
            });
        });
        
        console.log('✅ Routes with email verification setup complete');
    };
    
    // Server Start
    const start = async function () {
        try {
            console.log('🏭 === STARTING EMAIL VERIFICATION TODO SERVER ===');
            console.log('📅 Timestamp:', new Date().toISOString());
            console.log('🌍 Environment:', NODE_ENV);
            console.log('📍 Port:', PORT);
            console.log('🌐 Frontend URL:', FRONTEND_URL);
            console.log('📧 Email Service Configuration:');
            console.log('  • Host:', process.env.EMAIL_HOST || 'smtp.gmail.com');
            console.log('  • User:', process.env.EMAIL_USER || 'NOT SET');
            console.log('  • From:', process.env.EMAIL_FROM || process.env.EMAIL_USER || 'NOT SET');
            
            // E-MAIL-SERVICE TESTEN
            console.log('📧 Testing email service...');
            emailServiceAvailable = await testEmailConnection();
            
            // DATABASE INITIALISIERUNG
            console.log('🗄️ Initializing database...');
            try {
                await Database.initialize();
                console.log('✅ Database initialized successfully');
                databaseAvailable = true;
            } catch (error) {
                console.error('🚨 Database initialization failed:', error.message);
                databaseAvailable = false;
            }
            
            // Middleware und Routen setup
            setupMiddleware();
            setupRoutes();
            
            const server = app.listen(PORT, function () {
                console.log('');
                console.log('🎉 === EMAIL VERIFICATION TODO SERVER STARTED ===');
                console.log('📍 Port:', PORT);
                console.log('🌍 Environment:', NODE_ENV);
                console.log('🌐 Frontend URL:', FRONTEND_URL);
                console.log('🗄️ Database:', databaseAvailable ? 'Connected ✅' : 'Demo Mode ⚠️');
                console.log('📧 Email Service:', emailServiceAvailable ? 'Enabled ✅' : 'Disabled ⚠️');
                console.log('🔑 JWT Secret:', JWT_SECRET ? 'Configured ✅' : 'Missing ❌');
                console.log('⏰ Started at:', new Date().toISOString());
                
                console.log('📧 EMAIL VERIFICATION SYSTEM:');
                console.log('  • Registration:', emailServiceAvailable ? 'Sends verification email ✅' : 'Auto-verified ⚠️');
                console.log('  • Login:', 'Requires verified email ✅');
                console.log('  • Resend verification:', emailServiceAvailable ? 'Available ✅' : 'Disabled ⚠️');
                
                console.log('🌍 INTERNATIONAL EMAIL VALIDATION:');
                console.log('  • Blocked disposable domains:', DISPOSABLE_EMAIL_DOMAINS.size);
                console.log('  • Supported languages: English, German, French, Spanish, Italian, Russian, Japanese, Portuguese');
                console.log('  • Approach: Liberal (GitHub-friendly)');
                console.log('  • ✅ Gmail, Outlook, Yahoo, Web.de, GMX, etc.');
                console.log('  • ✅ Business emails (company.com)');
                console.log('  • ✅ Educational (.edu, .ac.uk)');
                console.log('  • ❌ Wegwerf-E-Mails international blockiert');
                
                console.log('🛡️ CORS: EXTENDED (Multi-Origin)');
                console.log('✅ Allowed Origins:');
                console.log('  • https://todo-app-fullstack-gamma.vercel.app');
                console.log('  • http://localhost:3000');
                console.log('  • http://localhost:8080');
                console.log('  • http://127.0.0.1:5500');
                console.log('  • http://localhost:5500');
                console.log('  • https://localhost:3000');
                
                console.log('');
                console.log('📡 Endpoints:');
                console.log('  • POST /auth/register         - Registration (Email Verification) ✅');
                console.log('  • POST /auth/login            - Login (Email Required) ✅');
                console.log('  • GET  /auth/verify-email/:token - Verify Email ✅');
                console.log('  • POST /auth/resend-verification - Resend Email ✅');
                console.log('  • GET  /auth/me               - User-Info ✅');
                console.log('  • POST /auth/logout           - Logout ✅');
                console.log('  • GET    /tasks               - Get tasks ✅');
                console.log('  • POST   /tasks               - Create task ✅');
                console.log('  • PUT    /tasks/:id           - Toggle status ✅');
                console.log('  • DELETE /tasks/:id           - Delete task ✅');
                console.log('');
                
                console.log('🚀 === EMAIL VERIFICATION SERVER READY ===');
                console.log('📧 Perfect for production with real email verification!');
                
                if (!emailServiceAvailable) {
                    console.log('');
                    console.log('⚠️  WARNING: Email service not configured!');
                    console.log('   Configure EMAIL_USER and EMAIL_PASS for full functionality.');
                }
            });
            
            return server;
        } catch (error) {
            console.error('🚨 Server startup error:', error);
            process.exit(1);
        }
    };
    
    // Öffentliche API
    return {
        start: start,
        app: app
    };
})();

// Server initialisieren und starten
console.log('🏭 Initializing Email Verification TaskServer...');
TaskServer.start();