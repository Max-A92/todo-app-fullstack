// ===== AUTH MODAL COMPONENT =====
export const AuthModal = {
    /**
     * Modal anzeigen
     */
    show(tab = 'login', elements) {
        if (elements.authModal) {
            elements.authModal.style.display = 'block';
            if (tab) this.switchTab(tab, elements);
        }
    },

    /**
     * Modal verstecken
     */
    hide(elements) {
        if (elements.authModal) {
            elements.authModal.style.display = 'none';
            this.clearMessages(elements);
            this.hideProviderInfo(elements);
        }
    },

    /**
     * Tab wechseln (Login/Register)
     */
    switchTab(tab, elements) {
        const tabs = document.querySelectorAll('.modal-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));
        
        // Korrekten Tab aktivieren
        const tabButton = document.querySelector(
            `.modal-tab:${tab === 'login' ? 'first-child' : 'last-child'}`
        );
        if (tabButton) tabButton.classList.add('active');
        
        const form = document.getElementById(`${tab}Form`);
        if (form) form.classList.add('active');
    },

    /**
     * Nachricht anzeigen
     */
    showMessage(message, type, elements) {
        if (!elements.authMessages) return;
        
        const messageClass = type === 'error' ? 'error-message' : 'success-message';
        elements.authMessages.innerHTML = 
            `<div class="${messageClass}">${message}</div>`;
        
        setTimeout(() => this.clearMessages(elements), 5000);
    },

    /**
     * Nachrichten löschen
     */
    clearMessages(elements) {
        if (elements.authMessages) {
            elements.authMessages.innerHTML = '';
        }
    },

    /**
     * Provider-Info anzeigen
     */
    showProviderInfo(emailInfo, elements) {
        if (!emailInfo?.provider || !elements.providerInfo) return;
        
        const categoryEmojis = {
            'major_international': '🌍',
            'regional_european': '🇪🇺', 
            'privacy_focused': '🔐',
            'educational': '🎓',
            'business_or_personal': '🏢'
        };
        
        const emoji = categoryEmojis[emailInfo.category] || '📧';
        const securityLevel = emailInfo.securityLevel || 'standard';
        
        elements.providerInfo.textContent = `${emoji} ${emailInfo.provider} (${securityLevel})`;
        elements.providerInfo.style.display = 'block';
        
        setTimeout(() => this.hideProviderInfo(elements), 5000);
    },

    /**
     * Provider-Info verstecken
     */
    hideProviderInfo(elements) {
        if (elements.providerInfo) {
            elements.providerInfo.style.display = 'none';
        }
    },

    /**
     * UI nach Login/Logout aktualisieren
     */
    updateAuthUI(isLoggedIn, currentUser, elements) {
        if (isLoggedIn && currentUser) {
            // Eingeloggt
            this.showLoggedInState(currentUser, elements);
        } else {
            // Ausgeloggt
            this.showLoggedOutState(elements);
        }
    },

    /**
     * Eingeloggte UI anzeigen
     */
    showLoggedInState(currentUser, elements) {
        if (elements.guestControls) elements.guestControls.style.display = 'none';
        if (elements.userControls) elements.userControls.style.display = 'block';
        if (elements.currentUsername) elements.currentUsername.textContent = currentUser.username;
        if (elements.userWelcome) elements.userWelcome.style.display = 'block';
        if (elements.filterSection) elements.filterSection.style.display = 'block';
        
        if (elements.verificationStatus) {
            elements.verificationStatus.className = 'verification-status verified';
            elements.verificationStatus.textContent = '✅ Secure';
        }
    },

    /**
     * Ausgeloggte UI anzeigen
     */
    showLoggedOutState(elements) {
        if (elements.guestControls) elements.guestControls.style.display = 'block';
        if (elements.userControls) elements.userControls.style.display = 'none';
        if (elements.userWelcome) elements.userWelcome.style.display = 'none';
        if (elements.filterSection) elements.filterSection.style.display = 'block'; // Demo-Daten
    },

    /**
     * Event-Listener für Auth-Modal
     */
    setupEventListeners(elements, callbacks) {
        // Login Form
        if (elements.loginForm && callbacks.onLogin) {
            elements.loginForm.addEventListener('submit', callbacks.onLogin);
        }
        
        // Register Form
        if (elements.registerForm && callbacks.onRegister) {
            elements.registerForm.addEventListener('submit', callbacks.onRegister);
        }
        
        // Modal außerhalb klicken zum Schließen
        window.onclick = (event) => {
            if (event.target === elements.authModal) {
                this.hide(elements);
            }
        };
    }
};

console.log('✅ AuthModal component loaded');