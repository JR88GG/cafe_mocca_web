// js/auth.js

/**
 * Inicia sesión enviando credenciales
 */
async function loginUser(email, password) {
    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch('http://127.0.0.1:8000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Credenciales incorrectas o error de autenticación.');
        }

        const data = await response.json();
        
        // Guardar el token JWT exclusivamente en sessionStorage
        sessionStorage.setItem('token', data.access_token);
        
        showToast('¡Inicio de sesión exitoso!', 'success');
        return true;
    } catch (error) {
        console.error('Error en login:', error);
        showToast(error.message, 'danger');
        return false;
    }
}

/**
 * Cierra la sesión del usuario limpiando el sessionStorage
 */
function logoutUser() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/login.html';
}

/**
 * Verifica si el usuario tiene un token activo
 */
function isAuthenticated() {
    return !!sessionStorage.getItem('token');
}