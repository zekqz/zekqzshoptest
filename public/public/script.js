const API_BASE = 'http://localhost:3000';

// === АНИМАЦИЯ ЗВЁЗД ===
function initStars() {
  const container = document.getElementById('starsContainer');
  for (let i = 0; i < 100; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = (Math.random() * 2 + 0.5).toFixed(1);
    const delay = Math.random() * 3;
    const duration = 2 + Math.random() * 3;
    star.style.setProperty('--size', size + 'px');
    star.style.setProperty('--delay', delay + 's');
    star.style.setProperty('--duration', duration + 's');
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    container.appendChild(star);
  }
}

// === АУТЕНТИФИКАЦИЯ ===
let token = localStorage.getItem('token');

function setAuth(user, tk) {
  token = tk;
  localStorage.setItem('token', tk);
  document.getElementById('nav-login').style.display = 'none';
  document.getElementById('nav-register').style.display = 'none';
  document.getElementById('nav-dashboard').style.display = 'inline';
  document.getElementById('nav-shop').style.display = 'inline';
  document.getElementById('nav-logout').style.display = 'inline';
  if (user.isAdmin) document.getElementById('nav-admin').style.display = 'inline';
  loadUserData();
}

function clearAuth() {
  token = null;
  localStorage.removeItem('token');
  document.getElementById('nav-login').style.display = 'inline';
  document.getElementById('nav-register').style.display = 'inline';
  document.getElementById('nav-dashboard').style.display = 'none';
  document.getElementById('nav-admin').style.display = 'none';
  document.getElementById('nav-logout').style.display = 'none';
  document.getElementById('nav-shop').style.display = 'none';
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('shopView').style.display = 'none';
  showLoginModal();
}

// Проверить токен при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initStars();
  if (token) checkAuth();
  loadProducts();
});

async function checkAuth() {
  try {
    const res = await fetch(API_BASE + '/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      setAuth(user, token);
    } else {
      clearAuth();
    }
  } catch (err) {
    clearAuth();
  }
}

// === МОДАЛЬНЫЕ ОКНА ===
function showLoginModal() {
  document.getElementById('loginModal').style.display = 'block';
  document.getElementById('registerModal').style.display = 'none';
}

function showRegisterModal() {
  document.getElementById('registerModal').style.display = 'block';
  document.getElementById('loginModal').style.display = 'none';
}

document.getElementById('nav-login').addEventListener('click', (e) => {
  e.preventDefault();
  showLoginModal();
});

document.getElementById('go-to-register').addEventListener('click', (e) => {
  e.preventDefault();
  showRegisterModal();
});

document.getElementById('go-to-login').addEventListener('click', (e) => {
  e.preventDefault();
  showLoginModal();
});

document.getElementById('nav-register').addEventListener('click', (e) => {
  e.preventDefault();
  showRegisterModal();
});

document.getElementById('nav-logout').addEventListener('click', (e) => {
  e.preventDefault();
  clearAuth();
});

document.getElementById('nav-admin').addEventListener('click', (e) => {
  e.preventDefault();
  showAdminPanel();
});

document.getElementById('nav-shop').addEventListener('click', (e) => {
  e.preventDefault();
  if (!token) {
    alert('Для доступа к магазину войдите в аккаунт.');
    showLoginModal();
    return;
  }
  showShop();
});

document.getElementById('back-to-dashboard').addEventListener('click', (e) => {
  e.preventDefault();
  showDashboard();
});

document.querySelector('.logo').addEventListener('click', (e) => {
  e.preventDefault();
  if (token) showDashboard();
  else showLoginModal();
});

document.querySelectorAll('.close').forEach(el => {
  el.addEventListener('click', () => {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
  });
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// === РЕГИСТРАЦИЯ ===
document.getElementById('register-btn').addEventListener('click', async () => {
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();

  if (!username || !password || password.length < 6) {
    alert('Никнейм и пароль обязательны. Пароль — минимум 6 символов.');
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    alert('Никнейм может содержать только латиницу, цифры и подчёркивание.');
    return;
  }

  try {
    const res = await fetch(API_BASE + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      setAuth(data.user, data.token);
      document.getElementById('registerModal').style.display = 'none';
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Ошибка регистрации.');
  }
});

// === ВХОД ===
document.getElementById('login-btn').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    alert('Введите ник и пароль.');
    return;
  }

  try {
    const res = await fetch(API_BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      setAuth(data.user, data.token);
      document.getElementById('loginModal').style.display = 'none';
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Ошибка входа.');
  }
});

// === ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ===
async function loadUserData() {
  try {
    const res = await fetch(API_BASE + '/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const user = await res.json();

    document.getElementById('user-name').textContent = user.username;
    document.getElementById('user-balance').textContent = user.balance + ' ₽';
    document.getElementById('user-joined').textContent = new Date(user.joined).toLocaleDateString();
    document.getElementById('user-last-login').textContent = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—';

    const historyList = document.getElementById('user-history-list');
    historyList.innerHTML = '';
    user.history.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `[${new Date(item.date).toLocaleString()}] ${item.service} — ${item.amount} ₽`;
      historyList.appendChild(li);
    });
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
  }
}

// === ПОПОЛНЕНИЕ БАЛАНСА ===
document.getElementById('add-balance-btn').addEventListener('click', async () => {
  const amount = prompt('Введите сумму для пополнения (в ₽):');
  if (!amount || isNaN(amount) || amount <= 0) return;

  try {
    const res = await fetch(API_BASE + '/api/balance/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: document.getElementById('user-name').textContent, amount: parseFloat(amount) })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`+${amount}₽ добавлено на баланс!`);
      loadUserData();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Ошибка пополнения.');
  }
});

// === ОТПРАВКА ТИКЕТА ===
document.getElementById('send-support').addEventListener('click', async () => {
  const subject = document.getElementById('support-subject').value.trim();
  const message = document.getElementById('support-message').value.trim();

  if (!subject || !message) {
    alert('Заголовок и сообщение обязательны.');
    return;
  }

  try {
    const res = await fetch(API_BASE + '/api/support', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subject, message })
    });
    const data = await res.json();
    alert(data.message);
    document.getElementById('support-subject').value = '';
    document.getElementById('support-message').value = '';
  } catch (err) {
    alert('Ошибка отправки тикета.');
  }
});

// === ЗАГРУЗКА ТОВАРОВ ===
async function loadProducts() {
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '<p style="color: #a0c0ff; text-align: center;">Загрузка товаров...</p>';

  try {
    const res = await fetch(API_BASE + '/api/products');
    const products = await res.json();

    grid.innerHTML = '';
    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <h3>${product.name}</h3>
        <div class="price">${product.price} ₽</div>
        <p class="desc">${product.desc}</p>
        <button class="buy-btn" data-id="${product._id}">Купить</button>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('buy-btn')) {
          buyProduct(product._id);
        }
      });
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = '<p style="color: #ff6b6b; text-align: center;">Ошибка загрузки товаров.</p>';
  }
}

// === ПОКУПКА ТОВАРА ===
async function buyProduct(productId) {
  if (!token) {
    alert('Вы не авторизованы. Войдите в аккаунт.');
    showLoginModal();
    return;
  }

  try {
    const res = await fetch(API_BASE + '/api/buy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`✅ Покупка успешна! Вы приобрели: ${data.message}`);
      loadUserData();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Ошибка покупки.');
  }
}

// === АДМИН-ПАНЕЛЬ ===
function showAdminPanel() {
  document.getElementById('adminPanel').style.display = 'block';
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('shopView').style.display = 'none';
  loadAdminData();
}

function showDashboard() {
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('userDashboard').style.display = 'block';
  document.getElementById('shopView').style.display = 'none';
}

function showShop() {
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('shopView').style.display = 'block';
}

async function loadAdminData() {
  try {
    const res = await fetch(API_BASE + '/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await res.json();

    document.getElementById('admin-total-users').textContent = users.length;

    const today = new Date().toDateString();
    const activeToday = users.filter(u => new Date(u.lastLogin).toDateString() === today).length;
    document.getElementById('admin-active-users').textContent = activeToday;

    const totalOrders = users.reduce((sum, u) => sum + u.history.length, 0);
    document.getElementById('admin-total-orders').textContent = totalOrders;

    const totalBalance = users.reduce((sum, u) => sum + u.balance, 0);
    document.getElementById('admin-total-balance').textContent = totalBalance + ' ₽';

    // Тикеты
    const ticketsRes = await fetch(API_BASE + '/api/admin/tickets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tickets = await ticketsRes.json();
    const ticketsList = document.getElementById('admin-tickets-list');
    ticketsList.innerHTML = '';
    tickets.forEach(t => {
      const div = document.createElement('div');
      div.className = 'ticket';
      div.innerHTML = `
        <h4>${t.subject}</h4>
        <p>${t.message}</p>
        <div class="meta">От: ${t.username} • ${new Date(t.date).toLocaleString()}</div>
      `;
      ticketsList.appendChild(div);
    });

  } catch (err) {
    alert('Ошибка загрузки админ-данных.');
  }
}

document.getElementById('admin-add-balance').addEventListener('click', async () => {
  const username = document.getElementById('admin-username').value.trim();
  const amount = document.getElementById('admin-amount').value.trim();

  if (!username || !amount || isNaN(amount) || amount <= 0) {
    alert('Введите никнейм и сумму.');
    return;
  }

  try {
    const res = await fetch(API_BASE + '/api/balance/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, amount: parseFloat(amount) })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadAdminData();
      document.getElementById('admin-username').value = '';
      document.getElementById('admin-amount').value = '';
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert('Ошибка пополнения.');
  }
});
