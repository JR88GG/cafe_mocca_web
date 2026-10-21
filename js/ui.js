// js/ui.js

/**
 * Formatea un valor numérico a moneda USD ($)
 */
export function formatUSD(amount) {
    const numericAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(numericAmount);
}

/**
 * Convierte una fecha en formato UTC a fecha/hora local legible
 */
export function formatDate(utcDateString) {
    if (!utcDateString) return '';
    const date = new Date(utcDateString);
    return date.toLocaleString();
}

/**
 * Muestra una alerta visual tipo Toast en la interfaz sin innerHTML (seguro contra XSS)
 */
export function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1080';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0 mb-2 shadow`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const flexContainer = document.createElement('div');
    flexContainer.className = 'd-flex';

    const body = document.createElement('div');
    body.className = 'toast-body';
    body.textContent = message; // Uso estricto de textContent para seguridad

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close btn-close-white me-2 m-auto';
    closeBtn.setAttribute('data-bs-dismiss', 'toast');
    closeBtn.setAttribute('aria-label', 'Close');

    flexContainer.appendChild(body);
    flexContainer.appendChild(closeBtn);
    toast.appendChild(flexContainer);
    container.appendChild(toast);
    
    if (window.bootstrap && window.bootstrap.Toast) {
        const bsToast = new window.bootstrap.Toast(toast, { delay: 3500 });
        bsToast.show();
        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    } else {
        setTimeout(() => toast.remove(), 3500);
    }
}