// ===== KALENDER & DATUM UTILITIES =====
export const CalendarUtils = {
    /**
     * Formatiert Datum für deutsche Anzeige
     */
    formatDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
    },

    /**
     * Berechnet Tage-Differenz zu heute
     */
    getDaysDifference(dateString) {
        if (!dateString) return null;
        
        const today = new Date();
        const taskDate = new Date(dateString);
        
        // Nur Datum-Teil vergleichen (ohne Zeit)
        today.setHours(0, 0, 0, 0);
        taskDate.setHours(0, 0, 0, 0);
        
        const diffTime = taskDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        console.log('📅 getDaysDifference:', {
            dateString,
            today: today.toISOString().split('T')[0],
            taskDate: taskDate.toISOString().split('T')[0],
            diffDays
        });
        
        return diffDays;
    },

    /**
     * Ermittelt Status eines Datums
     */
    getDateStatus(dateString) {
        if (!dateString) return 'no-date';
        
        const days = this.getDaysDifference(dateString);
        
        if (days < 0) return 'overdue';
        if (days === 0) return 'due-today';
        if (days === 1) return 'due-tomorrow';
        if (days <= 7) return 'due-soon';
        return 'future';
    },

    /**
     * Status-Icons für Datum
     */
    getStatusIcon(status) {
        const icons = {
            'overdue': '🔴',
            'due-today': '🟡',
            'due-tomorrow': '🔵',
            'due-soon': '🟠',
            'future': '⚪',
            'no-date': ''
        };
        return icons[status] || '';
    },

    /**
     * Prüft ob Task in Filter passt
     */
    shouldShowTask(task, filter) {
        if (filter === 'all') return true;
        
        const dateStatus = this.getDateStatus(task.dueDate);
        
        switch (filter) {
            case 'overdue':
                return dateStatus === 'overdue' && task.status !== 'erledigt';
            case 'today':
                return dateStatus === 'due-today';
            case 'tomorrow':
                return dateStatus === 'due-tomorrow';
            case 'week':
                return ['due-today', 'due-tomorrow', 'due-soon'].includes(dateStatus);
            case 'no-date':
                return !task.dueDate;
            default:
                return true;
        }
    }
};

console.log('✅ CalendarUtils loaded');