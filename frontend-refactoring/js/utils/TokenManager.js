// ===== JWT TOKEN MANAGEMENT =====
export const TokenManager = {
    /**
     * Token speichern
     */
    save(token) {
        localStorage.setItem('authToken', token);
        console.log('🔐 Token saved');
    },

    /**
     * Token abrufen
     */
    get() {
        return localStorage.getItem('authToken');
    },

    /**
     * Token entfernen
     */
    remove() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        console.log('🗑️ Token removed');
    },

    /**
     * Token-Gültigkeit prüfen
     */
    isValid() {
        const token = this.get();
        if (!token) return false;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const isValid = payload.exp * 1000 > Date.now();
            
            if (!isValid) {
                console.log('⚠️ Token expired');
                this.remove();
            }
            
            return isValid;
        } catch (error) {
            console.error('❌ Token validation error:', error);
            this.remove();
            return false;
        }
    },

    /**
     * User-Daten aus Token extrahieren
     */
    getUser() {
        const token = this.get();
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return { 
                id: payload.userId, 
                username: payload.username 
            };
        } catch (error) {
            console.error('❌ User extraction error:', error);
            return null;
        }
    },

    /**
     * Token für HTTP-Header formatieren
     */
    getAuthHeader() {
        const token = this.get();
        return token && this.isValid() ? `Bearer ${token}` : null;
    }
};

console.log('✅ TokenManager loaded');