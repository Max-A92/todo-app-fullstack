// ===== TASK LIST COMPONENT =====
import { CalendarUtils } from '../utils/CalendarUtils.js';

export const TaskList = {
    /**
     * Normale Task-Liste rendern
     */
    render(tasks, filter = 'all', elements) {
        console.log('🎨 Rendering TaskList:', tasks.length, 'tasks, filter:', filter);
        
        if (!Array.isArray(tasks) || !elements.taskList) {
            console.error('❌ Invalid tasks or elements.taskList');
            return;
        }
        
        elements.taskList.innerHTML = '';
        
        // Tasks filtern
        const filteredTasks = tasks.filter(task => 
            CalendarUtils.shouldShowTask(task, filter)
        );
        
        console.log('🔍 After filtering:', filteredTasks.length, 'tasks');
        
        if (filteredTasks.length === 0) {
            this.renderEmptyMessage(elements.taskList, filter);
            return;
        }
        
        // Tasks rendern
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            elements.taskList.appendChild(taskElement);
        });
        
        console.log('✅ TaskList rendered successfully');
    },

    /**
     * Gruppierte Task-Liste rendern (nach Projekten)
     */
    renderGrouped(tasks, filter = 'all', elements) {
        console.log('🎨 Rendering grouped TaskList:', tasks.length, 'tasks');
        
        if (!Array.isArray(tasks) || !elements.taskList) {
            console.error('❌ Invalid tasks or elements.taskList');
            return;
        }
        
        elements.taskList.innerHTML = '';
        
        // Tasks filtern
        const filteredTasks = tasks.filter(task => 
            CalendarUtils.shouldShowTask(task, filter)
        );
        
        if (filteredTasks.length === 0) {
            this.renderEmptyMessage(elements.taskList, filter);
            return;
        }
        
        // Nach Projekten gruppieren
        const tasksByProject = this.groupTasksByProject(filteredTasks);
        
        // Projekt-Gruppen rendern
        Object.keys(tasksByProject).forEach(projectName => {
            const projectTasks = tasksByProject[projectName];
            const projectGroupElement = this.createProjectGroup(projectName, projectTasks);
            elements.taskList.appendChild(projectGroupElement);
        });
        
        console.log('✅ Grouped TaskList rendered successfully');
    },

    /**
     * Empty Message rendern
     */
    renderEmptyMessage(container, filter) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'task-item';
        emptyMessage.style.textAlign = 'center';
        emptyMessage.textContent = filter === 'all' ? 
            '🎉 Keine Aufgaben vorhanden!' : 
            `📭 Keine Aufgaben für Filter "${filter}"`;
        container.appendChild(emptyMessage);
    },

    /**
     * Tasks nach Projekten gruppieren
     */
    groupTasksByProject(tasks) {
        const tasksByProject = {};
        
        tasks.forEach(task => {
            const projectName = task.project_name || 'Kein Projekt';
            if (!tasksByProject[projectName]) {
                tasksByProject[projectName] = [];
            }
            tasksByProject[projectName].push(task);
        });
        
        return tasksByProject;
    },

    /**
     * Projekt-Gruppe Element erstellen
     */
    createProjectGroup(projectName, tasks) {
        const projectGroup = document.createElement('li');
        projectGroup.className = 'project-group';
        
        // Header mit Statistiken
        const header = document.createElement('h3');
        const completedCount = tasks.filter(t => t.status === 'erledigt').length;
        const totalCount = tasks.length;
        
        header.innerHTML = `
            📁 ${projectName}
            <span class="project-stats">${completedCount}/${totalCount} erledigt</span>
        `;
        
        // Tasks-Container
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'project-tasks';
        
        // Tasks hinzufügen
        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            tasksContainer.appendChild(taskElement);
        });
        
        projectGroup.appendChild(header);
        projectGroup.appendChild(tasksContainer);
        
        return projectGroup;
    },

    /**
     * Einzelnes Task-Element erstellen
     */
    createTaskElement(task) {
        const item = document.createElement('li');
        item.className = `task-item ${task.status === 'erledigt' ? 'task-completed' : 'task-open'}`;
        
        // Task-Text mit Projekt-Info
        const textSpan = document.createElement('span');
        textSpan.className = 'task-text';
        textSpan.textContent = task.text;
        
        // Projekt-Info anhängen (falls vorhanden und nicht gruppiert)
        if (task.project_name) {
            const projectSpan = document.createElement('span');
            projectSpan.className = 'task-project';
            projectSpan.textContent = ` [${task.project_name}]`;
            projectSpan.style.fontSize = '12px';
            projectSpan.style.color = '#6c757d';
            projectSpan.style.fontWeight = 'normal';
            textSpan.appendChild(projectSpan);
        }
        
        // Datum-Container
        const dateContainer = this.createDateContainer(task);
        
        // Button-Container
        const buttonsContainer = this.createButtonsContainer(task);
        
        // Zusammenbauen
        item.appendChild(textSpan);
        item.appendChild(dateContainer);
        item.appendChild(buttonsContainer);
        
        return item;
    },

    /**
     * Datum-Container erstellen
     */
    createDateContainer(task) {
        const dateContainer = document.createElement('div');
        dateContainer.className = 'task-date';
        
        if (task.dueDate) {
            const dateStatus = CalendarUtils.getDateStatus(task.dueDate);
            const statusIcon = CalendarUtils.getStatusIcon(dateStatus);
            const formattedDate = CalendarUtils.formatDate(task.dueDate);
            
            dateContainer.className += ` ${dateStatus}`;
            dateContainer.innerHTML = `
                <span>${statusIcon} ${formattedDate}</span>
                <input type="date" value="${task.dueDate}" onchange="updateTaskDate(${task.id}, this.value)">
            `;
        } else {
            dateContainer.innerHTML = `
                <input type="date" placeholder="Datum setzen" onchange="updateTaskDate(${task.id}, this.value)">
            `;
        }
        
        return dateContainer;
    },

    /**
     * Buttons-Container erstellen
     */
    createButtonsContainer(task) {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'task-buttons';
        
        // Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = `status-button ${task.status === 'erledigt' ? 'btn-reopen' : 'btn-complete'}`;
        toggleBtn.textContent = task.status === 'erledigt' ? '🔄 Wieder öffnen' : '✅ Erledigt';
        toggleBtn.addEventListener('click', () => window.toggleTask(task.id));
        
        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'status-button btn-delete';
        deleteBtn.textContent = '🗑️ Löschen';
        deleteBtn.addEventListener('click', () => window.deleteTask(task.id));
        
        buttonsContainer.appendChild(toggleBtn);
        buttonsContainer.appendChild(deleteBtn);
        
        return buttonsContainer;
    }
};

console.log('✅ TaskList component loaded');