// js/carrito.js

const CART_STORAGE_KEY = 'mocca_cart';

/**
 * Obtiene los elementos del carrito desde el localStorage del navegador
 */
function getCart() {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
}

/**
 * Guarda los cambios del carrito y actualiza la UI
 */
function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartCountUI();
}

/**
 * Agrega un producto al carrito
 */
function addToCart(product, quantity = 1, options = {}) {
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            nombre: product.nombre,
            precio_base: product.precio_base,
            imagen_url: product.imagen_url || '',
            quantity: quantity,
            options: options
        });
    }

    saveCart(cart);
}

/**
 * Modifica la cantidad de un producto específico
 */
function updateQuantity(productId, newQuantity) {
    let cart = getCart();
    if (newQuantity <= 0) {
        cart = cart.filter(item => item.id !== productId);
    } else {
        const item = cart.find(item => item.id === productId);
        if (item) item.quantity = newQuantity;
    }
    saveCart(cart);
}

/**
 * Elimina un producto del carrito
 */
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
}

/**
 * Calcula el subtotal preliminar del carrito
 */
function calculateCartTotal() {
    const cart = getCart();
    return cart.reduce((sum, item) => sum + (item.precio_base * item.quantity), 0);
}

/**
 * Actualiza el indicador numérico del carrito en el navbar usando textContent
 */
function updateCartCountUI() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const badges = document.querySelectorAll('.cart-counter-badge');
    badges.forEach(badge => {
        badge.textContent = totalItems.toString(); // Seguro contra XSS
        badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
    });
}