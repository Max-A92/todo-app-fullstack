// ===== AUTHENTICATION SERVICE =====
import { ApiService } from './ApiService.js';
import { TokenManager } from '../utils/TokenManager.js';
import { CONFIG } from '../config/config.js';

export const AuthService = {
    /**
     * Bot Protection - Form Timestamps setzen
     */
    setFormTimestamps() {
        const now = Date.now();
        const loginTimestamp = document.getElementById('loginTimestamp');
        const registerTimestamp = document.getElementById('registerTimestamp');
        
        if (loginTimestamp) loginTimestamp.value = now;
        if (registerTimestamp) registerTimestamp.value = now;
        
        console.log('🕐 Form timestamps set:', now);
    },

    /**
     * Bot Protection - Honeypot Fields sichern
     */
    clearHoneypots() {
        let securedCount = 0;
        
        CONFIG.BOT_PROTECTION.HONEYPOT_FIELDS.forEach(fieldName => {
            const fields = document.querySelectorAll(`input[name="${fieldName}"]`);
            fields.forEach(field => {
                field.value = '';
                field.setAttribute('tabindex', '-1');
                field.setAttribute('autocomplete', 'off');
                field.setAttribute('aria-hidden', 'true');
                
                // Unsichtbar machen
                Object.assign(field.style, {
                    display: 'none',
                    visibility: 'hidden',
                    opacity: '0',
                    position: 'absolute',
                    left: '-9999px',
                    height: '0',
                    width: '0',
                    overflow: 'hidden'
                });
                securedCount++;
            });
        });
        
        console.log(`🍯 ${securedCount} honeypot fields secured`);
    },

    /**
     * Bot Protection - Timing-Info für Formulare
     */
    getTimingInfo(formType) {
        const timestampField = document.getElementById(formType + 'Timestamp');
        if (!timestampField?.value) return { timing: 0, seconds: 0, valid: false };
        
        const formTime = Date.now() - parseInt(timestampField.value);
        const seconds = Math.round(formTime / 1000);
        const valid = seconds >= 3 && seconds <= 3600;
        
        console.log(`⏱️ ${formType} timing: ${formTime}ms (${seconds}s) - ${valid ? 'VALID' : 'INVALID'}`);
        
        return { timing: formTime, seconds, valid };
    },

    /**
     * Bot Protection - Formdaten vorbereiten
     */
    prepareFormData(formType, baseData) {
        const timestampField = document.getElementById(formType + 'Timestamp');
        if (timestampField?.value) {
            baseData.formTimestamp = timestampField.value;
        }
        
        // Honeypot-Werte hinzufügen
        CONFIG.BOT_PROTECTION.HONEYPOT_FIELDS.forEach(fieldName => {
            const field = document.querySelector(`#${formType}Form input[name="${fieldName}"]`);
            baseData[fieldName] = field?.value || '';
        });
        
        const timingInfo = this.getTimingInfo(formType);
        console.log(`🛡️ ${formType} form prepared with bot protection`);
        console.log(`   Timing: ${timingInfo.seconds}s (${timingInfo.valid ? 'valid' : 'invalid'})`);
        
        return baseData;
    },

    /**
     * E-Mail Format validieren (einfach)
     */
    validateEmailFormat(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, error: 'E-Mail ist erforderlich' };
        }
        
        const trimmedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(trimmedEmail) && trimmedEmail.length <= 254;
        
        if (!isValid) {
            return { valid: false, error: 'Ungültiges E-Mail-Format' };
        }
        
        console.log('✅ E-Mail format OK:', trimmedEmail);
        return { valid: true, email: trimmedEmail };
    },

    /**
     * User registrieren
     */
    async register(username, email, password) {
        console.log('🆕 Register attempt:', username, email);
        
        // E-Mail validieren
        const emailValidation = this.validateEmailFormat(email);
        if (!emailValidation.valid) {
            throw new Error(emailValidation.error);
        }
        
        // Bot Protection Daten hinzufügen
        let formData = { 
            username, 
            email: emailValidation.email, 
            password 
        };
        formData = this.prepareFormData('register', formData);
        
        const result = await ApiService.post('/auth/register', formData);
        result.httpStatus = 201; // Für Kompatibilität
        
        console.log('🆕 Register response:', result);
        return result;
    },

    /**
     * User anmelden
     */
    async login(username, password) {
        console.log('🔑 Login attempt:', username);
        
        // Bot Protection Daten hinzufügen
        let formData = { username, password };
        formData = this.prepareFormData('login', formData);
        
        const result = await ApiService.post('/auth/login', formData);
        
        if (result.token) {
            TokenManager.save(result.token);
            console.log('✅ Login successful, token saved');
        }
        
        console.log('🔑 Login response:', result);
        return result;
    },

    /**
     * User abmelden
     */
    logout() {
        TokenManager.remove();
        console.log('🚪 Logout successful');
    },

    /**
     * E-Mail-Verifikation mit Token
     */
    async verifyEmail(token) {
        console.log('✅ Verifying email with token...');
        return ApiService.get(`/auth/verify-email/${token}`);
    },

    /**
     * Verifikations-E-Mail erneut senden
     */
    async resendVerification(email) {
        console.log('📧 Resending verification email...');
        return ApiService.post('/auth/resend-verification', { email });
    },

    /**
     * Bot Protection initialisieren
     */
    initialize() {
        console.log('🛡️ Initializing Bot Protection...');
        
        this.clearHoneypots();
        this.setFormTimestamps();
        
        // Modal Observer für Timestamp-Reset
        const authModal = document.getElementById('authModal');
        if (authModal) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        if (authModal.style.display === 'block') {
                            setTimeout(() => this.setFormTimestamps(), 100);
                        }
                    }
                });
            });
            observer.observe(authModal, { attributes: true });
        }
        
        // Tab-Switch Observer
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-tab')) {
                setTimeout(() => this.setFormTimestamps(), 100);
            }
        });
        
        console.log('✅ Bot Protection initialized');
    }
};

console.log('✅ AuthService loaded');