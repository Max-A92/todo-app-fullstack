// ===== PROJECT MANAGER COMPONENT =====
export const ProjectManager = {
    /**
     * Projekt-Auswahl rendern
     */
    renderProjectSelect(projects, elements) {
        console.log('🎨 Rendering project select:', projects.length, 'projects');
        
        if (!elements.projectSelect) {
            console.error('❌ elements.projectSelect not found');
            return;
        }
        
        // Reset Auswahl
        elements.projectSelect.innerHTML = '<option value="">Projekt auswählen...</option>';
        
        if (Array.isArray(projects) && projects.length > 0) {
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = `${project.name} (${project.task_count || 0} Tasks)`;
                elements.projectSelect.appendChild(option);
            });
        }
        
        console.log('✅ Project select rendered');
    },

    /**
     * Projekt-Sektion ein/ausblenden
     */
    toggleProjectSection(show, elements) {
        if (elements.projectSection) {
            elements.projectSection.style.display = show ? 'block' : 'none';
        }
    },

    /**
     * Projekt-Input zurücksetzen
     */
    resetProjectInput(elements) {
        if (elements.newProjectName) {
            elements.newProjectName.value = '';
        }
        if (elements.projectSelect) {
            elements.projectSelect.value = '';
        }
    },

    /**
     * Projekt-Button Status setzen
     */
    setProjectButtonState(loading, elements) {
        if (!elements.addProjectBtn) return;
        
        elements.addProjectBtn.disabled = loading;
        elements.addProjectBtn.textContent = loading ? 
            '⏳ Wird erstellt...' : '📁 Projekt hinzufügen';
    },

    /**
     * Event-Listener für Projekt-Funktionen
     */
    setupEventListeners(elements, callbacks) {
        // Projekt hinzufügen Button
        if (elements.addProjectBtn && callbacks.onAddProject) {
            elements.addProjectBtn.addEventListener('click', callbacks.onAddProject);
        }
        
        // Enter-Key im Projekt-Input
        if (elements.newProjectName && callbacks.onAddProject) {
            elements.newProjectName.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    callbacks.onAddProject();
                }
            });
        }
    }
};

console.log('✅ ProjectManager component loaded');