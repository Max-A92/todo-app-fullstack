// ===== CALENDAR FILTER COMPONENT =====
import { CalendarUtils } from '../utils/CalendarUtils.js';

export const Calendar = {
    /**
     * Filter-Sektion ein/ausblenden
     */
    toggleFilterSection(show, elements) {
        if (elements.filterSection) {
            elements.filterSection.style.display = show ? 'block' : 'none';
        }
    },

    /**
     * Filter-Button Status aktualisieren
     */
    updateFilterButtons(activeFilter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Aktiven Button markieren
        const activeButton = document.querySelector(`[onclick="filterTasks('${activeFilter}')"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    },

    /**
     * Tasks nach Filter filtern
     */
    filterTasks(tasks, filter) {
        if (filter === 'all') return tasks;
        
        return tasks.filter(task => CalendarUtils.shouldShowTask(task, filter));
    },

    /**
     * Kalender-Statistiken berechnen
     */
    calculateCalendarStats(tasks) {
        const overdue = tasks.filter(task => 
            CalendarUtils.getDateStatus(task.dueDate) === 'overdue' && 
            task.status !== 'erledigt'
        ).length;
        
        const dueToday = tasks.filter(task => 
            CalendarUtils.getDateStatus(task.dueDate) === 'due-today'
        ).length;
        
        const dueTomorrow = tasks.filter(task => 
            CalendarUtils.getDateStatus(task.dueDate) === 'due-tomorrow'
        ).length;
        
        const dueThisWeek = tasks.filter(task => 
            ['due-today', 'due-tomorrow', 'due-soon'].includes(
                CalendarUtils.getDateStatus(task.dueDate)
            )
        ).length;
        
        return {
            overdue,
            dueToday,
            dueTomorrow,
            dueThisWeek
        };
    },

    /**
     * Datum-Status für Task-Element setzen
     */
    setDateStatus(taskElement, dueDate) {
        const dateContainer = taskElement.querySelector('.task-date');
        if (!dateContainer || !dueDate) return;
        
        const dateStatus = CalendarUtils.getDateStatus(dueDate);
        const statusIcon = CalendarUtils.getStatusIcon(dateStatus);
        const formattedDate = CalendarUtils.formatDate(dueDate);
        
        dateContainer.className = `task-date ${dateStatus}`;
        
        const statusSpan = dateContainer.querySelector('span');
        if (statusSpan) {
            statusSpan.textContent = `${statusIcon} ${formattedDate}`;
        }
    },

    /**
     * Event-Listener für Filter-Buttons
     */
    setupFilterEventListeners(callback) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const filter = event.target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (filter && callback) {
                    this.updateFilterButtons(filter);
                    callback(filter);
                }
            });
        });
    }
};

console.log('✅ Calendar component loaded');