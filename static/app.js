let cart = [];
let categories = [];
let products = [];
let currentCategory = null;
const API_BASE_URL = 'http://localhost:8080';

// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Get user data
const initData = tg.initData || '';
const userID = tg.initDataUnsafe?.user?.id;

// Headers for API requests
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-Telegram-User-Id': userID || '',
    'X-Telegram-Init-Data': initData
});

document.addEventListener('DOMContentLoaded', async () => {
    if (!userID) {
        showError('Unable to get user data from Telegram');
        return;
    }
    await loadCategories();
    await loadProducts();
    updateCartCount();
    await loadUserBalance();
});

async function loadUserBalance() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/balance`, {
            headers: getHeaders()
        });
        const data = await response.json();
        if (data.success) {
            document.getElementById('user-balance').textContent = data.balance.toFixed(2);
        }
    } catch (error) {
        console.error('Error loading balance:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
            headers: getHeaders()
        });
        categories = await response.json();
        renderCategories();
    } catch (error) {
        showError('Failed to load categories');
        console.error('Error loading categories:', error);
    }
}

async function loadProducts(categoryId = null) {
    try {
        const url = categoryId ? 
            `${API_BASE_URL}/api/products?category=${categoryId}` : 
            `${API_BASE_URL}/api/products`;
        const response = await fetch(url, {
            headers: getHeaders()
        });
        products = await response.json();
        renderProducts();
    } catch (error) {
        showError('Failed to load products');
        console.error('Error loading products:', error);
    }
}

function renderCategories() {
    const categoriesContainer = document.querySelector('.categories');
    categoriesContainer.innerHTML = '';
    
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = `category-btn ${currentCategory === category.id ? 'active' : ''}`;
        button.textContent = category.name;
        button.onclick = () => {
            currentCategory = category.id;
            loadProducts(category.id);
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        };
        categoriesContainer.appendChild(button);
    });
}

function renderProducts() {
    const productsGrid = document.querySelector('.products-grid');
    productsGrid.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-name">${product.name}</div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <div class="product-quantity">
                <button class="quantity-btn" onclick="decrementQuantity(${product.id})">-</button>
                <span id="quantity-${product.id}">0</span>
                <button class="quantity-btn" onclick="incrementQuantity(${product.id})">+</button>
            </div>
            <button class="add-to-cart" onclick="addToCart(${product.id})">Add to Cart</button>
        `;
        productsGrid.appendChild(productCard);
    });
}

function incrementQuantity(productId) {
    const quantityElement = document.getElementById(`quantity-${productId}`);
    let quantity = parseInt(quantityElement.textContent);
    quantityElement.textContent = quantity + 1;
}

function decrementQuantity(productId) {
    const quantityElement = document.getElementById(`quantity-${productId}`);
    let quantity = parseInt(quantityElement.textContent);
    if (quantity > 0) {
        quantityElement.textContent = quantity - 1;
    }
}

function addToCart(productId) {
    const quantity = parseInt(document.getElementById(`quantity-${productId}`).textContent);
    if (quantity === 0) return;

    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productId,
            name: product.name,
            price: product.price,
            quantity
        });
    }

    document.getElementById(`quantity-${productId}`).textContent = '0';
    updateCartCount();
    showSuccess('Added to cart');
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function showCart() {
    const modal = document.getElementById('cart-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    let cartHtml = '<h2>Shopping Cart</h2>';
    let total = 0;

    if (cart.length === 0) {
        cartHtml += '<p>Your cart is empty</p>';
    } else {
        cartHtml += '<div class="cart-items">';
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            cartHtml += `
                <div class="cart-item">
                    <span>${item.name}</span>
                    <span>x${item.quantity}</span>
                    <span>$${itemTotal.toFixed(2)}</span>
                    <button onclick="removeFromCart(${item.productId})">Remove</button>
                </div>
            `;
        });
        cartHtml += `</div>
            <div class="cart-total">Total: $${total.toFixed(2)}</div>
            <button class="btn" onclick="checkout()">Checkout</button>
        `;
    }

    modalContent.innerHTML = cartHtml;
    modal.style.display = 'block';
}

function hideCart() {
    document.getElementById('cart-modal').style.display = 'none';
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    updateCartCount();
    showCart();
}

async function checkout() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/checkout`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ items: cart })
        });

        const result = await response.json();
        
        if (result.success) {
            cart = [];
            updateCartCount();
            hideCart();
            showSuccess('Order placed successfully!');
            await loadUserBalance(); // Refresh balance after successful order
        } else {
            showError(result.message || 'Checkout failed');
        }
    } catch (error) {
        showError('Failed to process checkout');
        console.error('Error processing checkout:', error);
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

// AAIO Payment Integration
async function topUpBalance() {
    const amount = prompt('Enter amount to top up:');
    if (!amount || isNaN(amount) || amount <= 0) {
        showError('Please enter a valid amount');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/topup`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ amount: parseFloat(amount) })
        });

        const result = await response.json();
        
        if (result.success && result.paymentUrl) {
            window.location.href = result.paymentUrl;
        } else {
            showError(result.message || 'Failed to initiate top up');
        }
    } catch (error) {
        showError('Failed to process top up request');
        console.error('Error processing top up request:', error);
    }
}
