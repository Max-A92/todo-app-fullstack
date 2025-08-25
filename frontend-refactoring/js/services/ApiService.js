// ===== HTTP API SERVICE =====
import { CONFIG } from '../config/config.js';
import { TokenManager } from '../utils/TokenManager.js';

export const ApiService = {
    /**
     * Basis API-Call mit Error-Handling
     */
    async apiCall(url, options = {}) {
        console.log("🌐 API Call:", CONFIG.API.BASE_URL + url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);
        
        const defaultOptions = {
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Auth-Header hinzufügen falls Token vorhanden
        const authHeader = TokenManager.getAuthHeader();
        if (authHeader) {
            defaultOptions.headers['Authorization'] = authHeader;
        }
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options?.headers || {})
            }
        };
        
        try {
            const startTime = Date.now();
            const response = await fetch(CONFIG.API.BASE_URL + url, finalOptions);
            const duration = Date.now() - startTime;
            
            console.log("📥 Response:", duration + "ms - Status:", response.status);
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                error.code = errorData.code;
                error.httpStatus = response.status;
                throw error;
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("🚨 API Error:", error);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - Backend startet möglicherweise noch');
            } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
                throw new Error('Backend nicht erreichbar');
            }
            
            throw error;
        }
    },

    /**
     * Health-Check für Backend
     */
    async healthCheck() {
        try {
            const response = await this.apiCall('/health');
            console.log('✅ Backend health:', response);
            return true;
        } catch (error) {
            console.log('❌ Backend health check failed:', error.message);
            return false;
        }
    },

    /**
     * GET Request
     */
    async get(url) {
        return this.apiCall(url, { method: 'GET' });
    },

    /**
     * POST Request
     */
    async post(url, data) {
        return this.apiCall(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * PUT Request
     */
    async put(url, data) {
        return this.apiCall(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * DELETE Request
     */
    async delete(url) {
        return this.apiCall(url, { method: 'DELETE' });
    }
};

console.log('✅ ApiService loaded');