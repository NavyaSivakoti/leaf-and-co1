// Leaf & Co: shared behaviour for every page.
const CART_KEY = 'leafco-cart';
const ORDER_KEY = 'leafco-last-order';

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage is unavailable; the page keeps working without saving.
  }
}

function getCart() {
  return readJSON(CART_KEY, []);
}

function saveCart(cart) {
  writeJSON(CART_KEY, cart);
  updateNavCount();
}

function money(n) {
  return '$' + n.toFixed(2);
}

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function itemCount(cart) {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateNavCount() {
  const badge = document.getElementById('nav-cart-count');
  if (badge) badge.textContent = itemCount(getCart());
}

/* Shop (index.html) */
function initShop() {
  const filter = document.getElementById('category-filter');
  const cards = document.querySelectorAll('#product-grid .card');

  filter.addEventListener('change', () => {
    cards.forEach(card => {
      card.hidden = filter.value !== 'All' && card.dataset.category !== filter.value;
    });
  });

  document.getElementById('product-grid').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;

    const card = button.closest('.card');
    const cart = getCart();
    const existing = cart.find(item => item.id === card.dataset.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: card.dataset.id,
        name: card.dataset.name,
        price: Number(card.dataset.price),
        qty: 1
      });
    }
    saveCart(cart);
  });
}

/* Cart (cart.html) */
function initCart() {
  const list = document.getElementById('cart-list');
  const emptyMessage = document.getElementById('empty-message');
  const subtotal = document.getElementById('subtotal');
  const checkoutButton = document.getElementById('checkout-button');

  function changeQuantity(id, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    render();
  }

  function removeItem(id) {
    saveCart(getCart().filter(i => i.id !== id));
    render();
  }

  function render() {
    const cart = getCart();

    list.innerHTML = cart.map(item => `
      <li class="cart-row" id="row-${item.id}">
        <div class="cart-info">
          <h2 id="name-${item.id}">${item.name}</h2>
          <p id="price-${item.id}">${money(item.price)} each</p>
        </div>
        <div class="qty-controls">
          <button class="btn btn-outline" type="button" id="minus-${item.id}" data-action="minus" data-id="${item.id}">-</button>
          <span class="qty" id="qty-${item.id}">${item.qty}</span>
          <button class="btn btn-outline" type="button" id="plus-${item.id}" data-action="plus" data-id="${item.id}">+</button>
        </div>
        <p class="line-total" id="line-total-${item.id}">${money(item.price * item.qty)}</p>
        <button class="btn btn-outline" type="button" id="remove-${item.id}" data-action="remove" data-id="${item.id}">Remove</button>
      </li>`).join('');

    subtotal.textContent = 'Subtotal: ' + money(cartTotal(cart));
    emptyMessage.hidden = cart.length > 0;
    list.hidden = cart.length === 0;
    checkoutButton.hidden = cart.length === 0;
  }

  list.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === 'plus') changeQuantity(id, 1);
    if (button.dataset.action === 'minus') changeQuantity(id, -1);
    if (button.dataset.action === 'remove') removeItem(id);
  });

  checkoutButton.addEventListener('click', () => {
    window.location.href = 'checkout.html';
  });

  render();
}

/* Checkout (checkout.html) */
function showError(inputId, errorId, message) {
  document.getElementById(inputId).classList.toggle('invalid', message !== '');
  document.getElementById(errorId).textContent = message;
}

function validateForm() {
  const name = document.getElementById('full-name').value.trim();
  const email = document.getElementById('email').value.trim();
  const address = document.getElementById('address').value.trim();

  const nameError = name ? '' : 'Full name is required';
  let emailError = '';
  if (!email) {
    emailError = 'Email is required';
  } else if (!email.includes('@') || !email.includes('.')) {
    emailError = 'Enter a valid email';
  }
  const addressError = address ? '' : 'Address is required';

  showError('full-name', 'full-name-error', nameError);
  showError('email', 'email-error', emailError);
  showError('address', 'address-error', addressError);

  return !nameError && !emailError && !addressError;
}

function placeOrder() {
  const cart = getCart();
  const order = {
    orderNumber: String(Math.floor(100000 + Math.random() * 900000)),
    items: cart,
    total: cartTotal(cart)
  };
  writeJSON(ORDER_KEY, order);
  saveCart([]);
  window.location.href = 'confirmation.html';
}

function initCheckout() {
  if (getCart().length === 0) {
    window.location.replace('cart.html');
    return;
  }

  document.getElementById('checkout-form').addEventListener('submit', event => {
    event.preventDefault();
    if (validateForm()) placeOrder();
  });
}

/* Confirmation (confirmation.html) */
function initConfirmation() {
  const order = readJSON(ORDER_KEY, null);
  if (!order) {
    window.location.replace('index.html');
    return;
  }

  document.getElementById('order-number').textContent = order.orderNumber;
  document.getElementById('order-items').innerHTML = order.items.map(item => `
    <li id="ordered-${item.id}">${item.name} x ${item.qty} = ${money(item.price * item.qty)}</li>`).join('');
  document.getElementById('order-total').textContent = 'Total: ' + money(order.total);
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavCount();
  if (document.getElementById('product-grid')) initShop();
  if (document.getElementById('cart-list')) initCart();
  if (document.getElementById('checkout-form')) initCheckout();
  if (document.getElementById('order-items')) initConfirmation();
});
