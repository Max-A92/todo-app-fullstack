// ===== HAUPTANWENDUNG - KOORDINIERT ALLE MODULE =====

// === IMPORTS ===
import { CONFIG } from './config/config.js';
import { CalendarUtils } from './utils/CalendarUtils.js';
import { TokenManager } from './utils/TokenManager.js';

import { ApiService } from './services/ApiService.js';
import { AuthService } from './services/AuthService.js';
import { TaskService } from './services/TaskService.js';
import { ProjectService } from './services/ProjectService.js';

import { TaskList } from './components/TaskList.js';
import { ProjectManager } from './components/ProjectManager.js';
import { AuthModal } from './components/AuthModal.js';
import { Calendar } from './components/Calendar.js';

// === GLOBALE APP-VARIABLEN ===
let editingTaskId = null;
let cachedTasks = [];
let cachedProjects = [];
let currentUser = null;
let connectionStatus = 'connecting';
let retryCount = 0;
let pendingVerificationEmail = null;
let currentFilter = 'all';
let currentViewMode = 'normal';

// DOM-Referenzen
let elements = {};

// === APP CLASS ===
class TodoApp {
    constructor() {
        console.log('🚀 Initialisiere TODO_APP - MODULARE VERSION v4.0');
        this.initialize();
    }

    // === INITIALISIERUNG ===
    async initialize() {
        try {
            this.initializeElements();
            this.setupEventListeners();
            
            // Services initialisieren
            AuthService.initialize();
            this.ensureDateInputVisible();
            
            // Auth UI aktualisieren
            this.updateAuthUI();
            
            // Backend-Verbindung testen
            console.log('🔍 Teste Backend-Verbindung...');
            this.updateConnectionStatus('connecting', 'Verbinde...');
            
            const connectionOk = await this.testConnection();
            
            if (connectionOk) {
                console.log('✅ Backend online, lade Daten...');
                await this.loadProjects();
                await this.loadTasks();
            } else {
                console.log('🔥 Backend Cold Start erkannt - Background-Retries aktiv...');
            }
            
            // Finaler Check
            setTimeout(() => this.ensureDateInputVisible(), 1000);
            
            // E-Mail-Verifikation aus URL prüfen
            this.checkEmailVerificationFromUrl();
            
            console.log('✅ TODO_APP MODULARE VERSION erfolgreich initialisiert');
        } catch (error) {
            console.error('🚨 Fehler beim Initialisieren:', error);
            this.showErrorBanner('Fehler beim Initialisieren der App: ' + error.message, 'error');
        }
    }

    // === DOM-REFERENZEN ===
    initializeElements() {
        elements = {
            taskText: document.getElementById('taskText'),
            taskDate: document.getElementById('taskDate'),
            projectSelect: document.getElementById('projectSelect'),
            addButton: document.getElementById('addButton'),
            cleanupButton: document.getElementById('cleanupButton'),
            taskList: document.getElementById('taskList'),
            stats: document.getElementById('stats'),
            authModal: document.getElementById('authModal'),
            authMessages: document.getElementById('authMessages'),
            loginForm: document.getElementById('loginForm'),
            registerForm: document.getElementById('registerForm'),
            guestControls: document.getElementById('guestControls'),
            userControls: document.getElementById('userControls'),
            currentUsername: document.getElementById('currentUsername'),
            userWelcome: document.getElementById('userWelcome'),
            connectionStatus: document.getElementById('connectionStatus'),
            connectionText: document.getElementById('connectionText'),
            errorBanner: document.getElementById('errorBanner'),
            errorMessage: document.getElementById('errorMessage'),
            providerInfo: document.getElementById('providerInfo'),
            verificationBanner: document.getElementById('verificationBanner'),
            verificationMessage: document.getElementById('verificationMessage'),
            resendVerificationBtn: document.getElementById('resendVerificationBtn'),
            resendVerificationBtn2: document.getElementById('resendVerificationBtn2'),
            emailVerificationSection: document.getElementById('emailVerificationSection'),
            verificationStatus: document.getElementById('verificationStatus'),
            filterSection: document.getElementById('filterSection'),
            projectSection: document.getElementById('projectSection'),
            newProjectName: document.getElementById('newProjectName'),
            addProjectBtn: document.getElementById('addProjectBtn')
        };
        console.log('✅ DOM-Elemente initialisiert');
    }

    // === EVENT-LISTENER ===
    setupEventListeners() {
        // Task-Events
        elements.addButton.addEventListener('click', () => this.addTask());
        elements.taskText.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') this.addTask();
        });
        elements.cleanupButton.addEventListener('click', () => this.deleteCompletedTasks());

        // Projekt-Events
        ProjectManager.setupEventListeners(elements, {
            onAddProject: () => this.addProject()
        });

        // Auth-Events
        AuthModal.setupEventListeners(elements, {
            onLogin: (event) => this.handleLogin(event),
            onRegister: (event) => this.handleRegister(event)
        });

        // E-Mail-Verifikation Events
        this.initializeEmailVerification();

        console.log('✅ Event-Listener eingerichtet');
    }

    // === CONNECTION MANAGEMENT ===
    updateConnectionStatus(status, message) {
        connectionStatus = status;
        if (elements.connectionStatus && elements.connectionText) {
            elements.connectionStatus.className = 'status-indicator ' + status;
            
            switch (status) {
                case 'connected':
                    elements.connectionText.textContent = 'Online ✅';
                    this.hideErrorBanner();
                    break;
                case 'disconnected':
                    elements.connectionText.textContent = 'Offline ❌';
                    break;
                case 'connecting':
                    elements.connectionText.textContent = 'Verbinde...';
                    break;
            }
        }
    }

    async testConnection() {
        console.log('🔄 Teste Backend... Versuch:', retryCount + 1);
        
        try {
            const isHealthy = await ApiService.healthCheck();
            if (isHealthy) {
                retryCount = 0;
                this.updateConnectionStatus('connected', 'Online ✅');
                return true;
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            console.log('❌ Backend nicht erreichbar:', error.message);
            retryCount++;
            
            this.updateConnectionStatus('connecting', 'Verbinde...');
            
            if (retryCount < CONFIG.API.RETRY_COUNT) {
                console.log(`🔄 Retry in ${CONFIG.API.RETRY_INTERVAL/1000} Sekunden...`);
                setTimeout(async () => {
                    const success = await this.testConnection();
                    if (success) console.log('🎉 Backend nach Retry erreichbar!');
                }, CONFIG.API.RETRY_INTERVAL);
            } else {
                console.log('🚨 Maximale Retry-Anzahl erreicht');
                this.updateConnectionStatus('disconnected', 'Backend nicht erreichbar');
                this.showErrorBanner('Backend nicht erreichbar nach ' + CONFIG.API.RETRY_COUNT + ' Versuchen.', 'error');
            }
            
            return false;
        }
    }

    // === PROJEKT-MANAGEMENT ===
    async loadProjects() {
        try {
            const projects = await ProjectService.getProjects();
            cachedProjects = projects;
            ProjectManager.renderProjectSelect(projects, elements);
        } catch (error) {
            console.error('🚨 Fehler beim Laden der Projekte:', error);
            if (cachedProjects.length > 0) {
                ProjectManager.renderProjectSelect(cachedProjects, elements);
            }
        }
    }

    async addProject() {
        const name = elements.newProjectName.value;
        
        if (!name || name.trim() === '') {
            this.showErrorBanner('⚠️ Bitte geben Sie einen Projektnamen ein', 'warning');
            return;
        }
        
        ProjectManager.setProjectButtonState(true, elements);
        
        try {
            await ProjectService.createProject(name);
            ProjectManager.resetProjectInput(elements);
            await this.loadProjects();
            await this.loadTasks();
            this.showErrorBanner('✅ Projekt "' + name + '" erfolgreich erstellt!', 'info');
        } catch (error) {
            console.error('🚨 FEHLER in addProject:', error);
            this.showErrorBanner('Fehler beim Erstellen des Projekts: ' + error.message, 'error');
        } finally {
            ProjectManager.setProjectButtonState(false, elements);
        }
    }

    // === TASK-MANAGEMENT ===
    async loadTasks() {
        if (!TokenManager.isValid()) {
            this.renderTasks([]);
            this.updateStats([]);
            this.updateConnectionStatus('connected', 'Online ✅');
            return;
        }
        
        this.updateConnectionStatus('connecting', 'Lade...');
        
        try {
            const tasks = await TaskService.getTasks();
            cachedTasks = tasks;
            this.renderTasks(tasks);
            this.updateStats(tasks);
            this.updateConnectionStatus('connected', 'Online ✅');
            this.hideErrorBanner();
        } catch (error) {
            console.error('🚨 Fehler beim Laden der Tasks:', error);
            
            if (cachedTasks.length > 0) {
                this.renderTasks(cachedTasks);
                this.updateStats(cachedTasks);
                this.showErrorBanner('⚠️ Offline-Modus: Zeige letzte gespeicherte Aufgaben', 'warning');
            } else {
                this.renderTasks([]);
                this.updateStats([]);
            }
        }
    }

    renderTasks(tasks) {
        if (currentViewMode === 'grouped' && cachedProjects.length > 0) {
            TaskList.renderGrouped(tasks, currentFilter, elements);
        } else {
            TaskList.render(tasks, currentFilter, elements);
        }
    }

    async addTask() {
        const text = elements.taskText.value;
        const dueDate = elements.taskDate ? elements.taskDate.value : null;
        const projectId = elements.projectSelect ? elements.projectSelect.value : null;
        
        if (!text || text.trim() === '') {
            this.showErrorBanner('⚠️ Bitte geben Sie einen Aufgabentext ein', 'warning');
            return;
        }
        
        elements.addButton.disabled = true;
        elements.addButton.textContent = '⏳ Wird hinzugefügt...';
        
        try {
            const taskData = { 
                text: text.trim(), 
                dueDate: dueDate || null,
                project_id: projectId || null
            };
            
            await TaskService.createTask(taskData);
            
            elements.taskText.value = '';
            if (elements.taskDate) elements.taskDate.value = '';
            if (elements.projectSelect) elements.projectSelect.value = '';
            
            await this.loadTasks();
            await this.loadProjects();
        } catch (error) {
            console.error('🚨 FEHLER in addTask:', error);
            this.showErrorBanner('Fehler beim Hinzufügen der Aufgabe: ' + error.message, 'error');
        } finally {
            elements.addButton.disabled = false;
            elements.addButton.textContent = '➕ Hinzufügen';
        }
    }

    // === GLOBALE FUNKTIONEN (für onclick-Handler) ===
    async toggleTask(taskId) {
        try {
            await TaskService.toggleTask(taskId);
            await this.loadTasks();
            await this.loadProjects();
        } catch (error) {
            this.showErrorBanner('Fehler beim Ändern des Status: ' + error.message, 'error');
        }
    }

    async deleteTask(taskId) {
        if (!confirm('❓ Aufgabe wirklich löschen?')) return;
        
        try {
            const response = await TaskService.deleteTask(taskId);
            
            if (response && response.autoDeletedProject) {
                this.showErrorBanner('✅ Aufgabe gelöscht! Leeres Projekt wurde automatisch entfernt.', 'info');
            }
            
            await this.loadTasks();
            await this.loadProjects();
        } catch (error) {
            this.showErrorBanner('Fehler beim Löschen der Aufgabe: ' + error.message, 'error');
        }
    }

    async updateTaskDate(taskId, newDate) {
        try {
            await TaskService.updateTaskDate(taskId, newDate);
            await this.loadTasks();
        } catch (error) {
            console.error('🚨 updateTaskDate error:', error);
            this.showErrorBanner('Fehler beim Aktualisieren des Datums: ' + error.message, 'error');
        }
    }

    async deleteCompletedTasks() {
        if (!confirm('🧹 Alle erledigten Aufgaben wirklich löschen?')) return;
        
        try {
            await TaskService.deleteCompletedTasks();
            await this.loadTasks();
            await this.loadProjects();
            this.showErrorBanner('✅ Alle erledigten Aufgaben gelöscht!', 'info');
        } catch (error) {
            this.showErrorBanner('Fehler beim Löschen: ' + error.message, 'error');
        }
    }

    // === FILTER-FUNKTIONEN ===
    filterTasks(filterType) {
        currentFilter = filterType;
        Calendar.updateFilterButtons(filterType);
        this.renderTasks(cachedTasks);
    }

    // === STATISTIKEN ===
    updateStats(tasks) {
        const stats = TaskService.calculateStats(tasks, cachedProjects.length);
        const calendarStats = Calendar.calculateCalendarStats(tasks);
        const userInfo = currentUser ? ' von ' + currentUser.username : ' (Demo)';
        
        let statsText = `📊 Gesamt: ${stats.total} | ✅ Erledigt: ${stats.completed} (${stats.percentage}%) | 📝 Offen: ${stats.open}${userInfo}`;
        
        if (stats.projectCount > 0) {
            statsText += ` | 📁 Projekte: ${stats.projectCount}`;
        }
        
        if (calendarStats.overdue > 0 || calendarStats.dueToday > 0) {
            statsText += ' | ';
            if (calendarStats.overdue > 0) statsText += `🔴 Überfällig: ${calendarStats.overdue} `;
            if (calendarStats.dueToday > 0) statsText += `🟡 Heute: ${calendarStats.dueToday}`;
        }
        
        if (elements.stats) {
            elements.stats.textContent = statsText;
        }
    }

    // === AUTH-FUNKTIONEN ===
    updateAuthUI() {
        const isLoggedIn = TokenManager.isValid();
        currentUser = TokenManager.getUser();
        
        AuthModal.updateAuthUI(isLoggedIn, currentUser, elements);
        ProjectManager.toggleProjectSection(isLoggedIn, elements);
        Calendar.toggleFilterSection(true, elements); // Immer anzeigen
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            AuthModal.showMessage('Bitte alle Felder ausfüllen', 'error', elements);
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Anmelden...';
        
        try {
            const response = await AuthService.login(username, password);
            
            if (response.token) {
                AuthModal.showMessage('Erfolgreich angemeldet!', 'success', elements);
                
                setTimeout(async () => {
                    AuthModal.hide(elements);
                    this.updateAuthUI();
                    await this.loadProjects();
                    await this.loadTasks();
                    this.hideVerificationBanner();
                    this.showEmailVerificationSection(false);
                }, 1000);
            } else {
                AuthModal.showMessage(response.message || 'Login fehlgeschlagen', 'error', elements);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.handleAuthError(error, 'login');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '🔑 Anmelden';
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        if (!username || !email || !password) {
            AuthModal.showMessage('Bitte alle Felder ausfüllen', 'error', elements);
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Registrieren...';
        
        try {
            const response = await AuthService.register(username, email, password);
            
            if (response.httpStatus === 201) {
                AuthModal.showMessage('🎉 Registrierung erfolgreich!', 'success', elements);
                
                if (response.verificationRequired) {
                    this.showVerificationBanner(
                        response.emailSent ? 
                        '📧 Prüfe deine E-Mails und bestätige deine E-Mail-Adresse.' :
                        '📧 E-Mail-Bestätigung erforderlich. Prüfe deine E-Mails.',
                        'pending', true
                    );
                    this.showEmailVerificationSection(true);
                    pendingVerificationEmail = email;
                    setTimeout(() => AuthModal.switchTab('login', elements), 2000);
                } else if (response.token) {
                    setTimeout(async () => {
                        AuthModal.hide(elements);
                        this.updateAuthUI();
                        await this.loadProjects();
                        await this.loadTasks();
                    }, 1500);
                }
                
                if (response.emailInfo) {
                    AuthModal.showProviderInfo(response.emailInfo, elements);
                }
            } else {
                let errorMessage = response.message || 'Registrierung fehlgeschlagen';
                if (response.suggestion) {
                    errorMessage += '\n\n' + response.suggestion;
                }
                AuthModal.showMessage(errorMessage, 'error', elements);
            }
        } catch (error) {
            console.error('Register error:', error);
            this.handleAuthError(error, 'register');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '👤 Registrieren';
        }
    }

    handleAuthError(error, type) {
        let message = `${type === 'login' ? 'Anmeldung' : 'Registrierung'} fehlgeschlagen: `;
        
        if (error.code === 'HONEYPOT_TRIGGERED') {
            message = '🤖 Sicherheitsprüfung fehlgeschlagen. Bitte versuchen Sie es erneut.';
        } else if (error.code === 'TOO_FAST') {
            message = '⚡ Bitte nehmen Sie sich mehr Zeit beim Ausfüllen.';
        } else if (error.code === 'TOO_SLOW') {
            message = '🕐 Sitzung abgelaufen. Bitte aktualisieren Sie die Seite.';
        } else if (error.code === 'EMAIL_NOT_VERIFIED') {
            message = '❌ E-Mail-Adresse noch nicht bestätigt.';
            this.showVerificationBanner('📧 Bitte bestätige zuerst deine E-Mail-Adresse.', 'pending', true);
            this.showEmailVerificationSection(true);
        } else if (error.httpStatus === 429) {
            message = '⏳ Zu viele Versuche. Bitte warten Sie einen Moment.';
        } else if (error.httpStatus === 423) {
            message = '🔒 Konto vorübergehend gesperrt.';
        } else {
            message += error.message || 'Unbekannter Fehler';
        }
        
        AuthModal.showMessage(message, 'error', elements);
    }

    logout() {
        if (confirm('🚪 Wirklich abmelden?')) {
            AuthService.logout();
            currentUser = null;
            pendingVerificationEmail = null;
            cachedTasks = [];
            cachedProjects = [];
            currentFilter = 'all';
            currentViewMode = 'normal';
            
            this.renderTasks([]);
            ProjectManager.renderProjectSelect([], elements);
            this.updateStats([]);
            
            this.updateAuthUI();
            this.loadTasks();
            this.hideVerificationBanner();
            this.showEmailVerificationSection(false);
            this.showErrorBanner('✅ Erfolgreich abgemeldet!', 'info');
        }
    }

    // === UTILITY FUNKTIONEN ===
    ensureDateInputVisible() {
        const dateInput = document.getElementById('taskDate');
        if (dateInput) {
            Object.assign(dateInput.style, {
                display: 'block',
                visibility: 'visible',
                opacity: '1',
                position: 'relative',
                backgroundColor: 'white',
                border: '2px solid #007bff',
                borderRadius: '8px',
                padding: '15px',
                fontSize: '14px',
                minHeight: '50px',
                boxSizing: 'border-box'
            });
        }
    }

    // === ERROR & BANNER MANAGEMENT ===
    showErrorBanner(message, type = 'error') {
        if (elements.errorBanner && elements.errorMessage) {
            elements.errorBanner.className = 'error-banner show ' + type;
            elements.errorMessage.textContent = message;
            
            setTimeout(() => this.hideErrorBanner(), 15000);
        }
    }

    hideErrorBanner() {
        if (elements.errorBanner && elements.errorMessage) {
            elements.errorBanner.classList.remove('show');
            elements.errorMessage.textContent = '';
        }
    }

    showVerificationBanner(message, type = 'info', showResend = false) {
        const banner = elements.verificationBanner;
        const messageSpan = elements.verificationMessage;
        const resendBtn = elements.resendVerificationBtn;
        
        if (banner && messageSpan) {
            banner.className = 'verification-banner show ' + type;
            messageSpan.textContent = message;
            
            if (showResend && resendBtn) {
                resendBtn.style.display = 'inline-block';
            } else if (resendBtn) {
                resendBtn.style.display = 'none';
            }
            
            if (type !== 'pending') {
                setTimeout(() => this.hideVerificationBanner(), 10000);
            }
        }
    }

    hideVerificationBanner() {
        const banner = elements.verificationBanner;
        if (banner) {
            banner.classList.remove('show');
        }
    }

    showEmailVerificationSection(show) {
        const section = elements.emailVerificationSection;
        if (section) {
            if (show) {
                section.classList.add('show');
            } else {
                section.classList.remove('show');
            }
        }
    }

    // === E-MAIL VERIFICATION ===
    initializeEmailVerification() {
        if (elements.resendVerificationBtn) {
            elements.resendVerificationBtn.addEventListener('click', () => {
                if (pendingVerificationEmail) {
                    this.resendVerificationEmail(pendingVerificationEmail);
                } else {
                    this.showVerificationBanner('❌ E-Mail-Adresse nicht verfügbar.', 'error');
                }
            });
        }
        
        if (elements.resendVerificationBtn2) {
            elements.resendVerificationBtn2.addEventListener('click', () => {
                const email = prompt('Bitte gib deine E-Mail-Adresse ein:');
                if (email) {
                    this.resendVerificationEmail(email);
                }
            });
        }
    }

    async resendVerificationEmail(email) {
        try {
            await AuthService.resendVerification(email);
            this.showVerificationBanner('📧 Neue Verifikations-E-Mail wurde gesendet!', 'success');
        } catch (error) {
            console.error('🚨 Resend Fehler:', error);
            this.showVerificationBanner('❌ Fehler beim E-Mail-Versand.', 'error');
        }
    }

    checkEmailVerificationFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const action = urlParams.get('action');
        
        if (token && action === 'verify') {
            this.verifyEmailWithToken(token);
        }
    }

    async verifyEmailWithToken(token) {
        try {
            await AuthService.verifyEmail(token);
            this.showVerificationBanner('🎉 E-Mail erfolgreich bestätigt! Du kannst dich jetzt anmelden.', 'success');
            
            if (window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error('🚨 E-Mail-Verifikation Fehler:', error);
            this.showVerificationBanner('❌ Verifikations-Link ungültig oder abgelaufen.', 'error', true);
        }
    }
}

// === GLOBALE INSTANZ & FUNKTIONEN ===
let todoApp = null;

// Globale Funktionen für onclick-Handler
window.showAuthModal = (tab) => AuthModal.show(tab, elements);
window.closeAuthModal = () => AuthModal.hide(elements);
window.switchAuthTab = (tab) => AuthModal.switchTab(tab, elements);
window.logout = () => todoApp?.logout();
window.filterTasks = (filter) => todoApp?.filterTasks(filter);
window.updateTaskDate = (taskId, newDate) => todoApp?.updateTaskDate(taskId, newDate);
window.toggleTask = (taskId) => todoApp?.toggleTask(taskId);
window.deleteTask = (taskId) => todoApp?.deleteTask(taskId);
window.hideErrorBanner = () => todoApp?.hideErrorBanner();

// APP STARTEN
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        todoApp = new TodoApp();
    });
} else {
    todoApp = new TodoApp();
}

// Debug-Zugriff
window.TODO_DEBUG = {
    getStats() {
        return {
            version: 'MODULARE VERSION v4.0',
            cachedTasks: cachedTasks.length,
            cachedProjects: cachedProjects.length,
            apiBase: CONFIG.API.BASE_URL,
            currentUser: currentUser,
            isLoggedIn: TokenManager.isValid(),
            connectionStatus: connectionStatus,
            retryCount: retryCount,
            maxRetries: CONFIG.API.RETRY_COUNT,
            pendingVerificationEmail: pendingVerificationEmail,
            currentFilter: currentFilter,
            currentViewMode: currentViewMode,
            features: [
                'Modular Architecture',
                'ES6 Modules', 
                'Professional UI', 
                'Calendar Integration', 
                'Task Filtering', 
                'Due Date Management', 
                'Mobile Responsive', 
                'Touch-Friendly Design',
                'Project Management',
                'Auto-Delete Projects',
                'Grouped Task View'
            ]
        };
    },
    testConnection: () => todoApp?.testConnection(),
    app: () => todoApp
};

console.log('✅ TODO APP LOADED - MODULARE VERSION v4.0');
console.log('🎨 Features: Modular Architecture • ES6 Modules • Professional UI');
console.log('📱 Mobile: Touch-friendly • Responsive • Better UX');
console.log('📅 Calendar: Due dates • Filtering • Overdue tracking');
console.log('📁 Projects: Create • Assignment • Auto-delete • Grouped view');
console.log('🎯 Debug: TODO_DEBUG.testConnection() | TODO_DEBUG.getStats()');