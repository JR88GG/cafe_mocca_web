// js/api.js

/**
 * Wrapper centralizado de fetch con inyección de JWT y manejo de errores HTTP
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // El token JWT se almacena exclusivamente en sessionStorage
    const token = sessionStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // 401 y 403: Limpiar sesión y redirigir a login
            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                window.location.href = '/login.html';
                throw new Error('Sesión expirada o no autorizada.');
            }
            
            // 409 Conflict
            if (response.status === 409) {
                throw new Error(errorData.detail || 'Conflicto en el registro de datos.');
            }
            
            // 422 Unprocessable Entity
            if (response.status === 422) {
                throw new Error(errorData.detail || 'Error de validación en los datos enviados.');
            }

            // 429 Too Many Requests
            if (response.status === 429) {
                throw new Error('Demasiadas solicitudes. Por favor, intente más tarde.');
            }

            throw new Error(errorData.detail || `Error en el servidor: ${response.status}`);
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error en apiFetch:', error);
        throw error;
    }
}