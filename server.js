const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Подключено к MongoDB'))
  .catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

// Модель пользователя
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  joined: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  isAdmin: { type: Boolean, default: false },
  history: [{
    service: String,
    amount: Number,
    date: Date
  }],
  supportTickets: [{
    subject: String,
    message: String,
    date: Date
  }]
});

const User = mongoose.model('User', UserSchema);

// Модель товара
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  desc: String,
  link: String
});

const Product = mongoose.model('Product', ProductSchema);

// === АУТЕНТИФИКАЦИЯ ===

// Регистрация
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ message: 'Никнейм и пароль обязательны. Пароль — минимум 6 символов.' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ message: 'Никнейм может содержать только латиницу, цифры и подчёркивание.' });
  }

  const existing = await User.findOne({ username });
  if (existing) return res.status(409).json({ message: 'Пользователь уже существует.' });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();

  const token = jwt.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { username: user.username, balance: user.balance, isAdmin: user.isAdmin } });
});

// Вход
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: 'Неверный ник или пароль.' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: 'Неверный ник или пароль.' });

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { username: user.username, balance: user.balance, isAdmin: user.isAdmin } });
});

// Проверка токена
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Токен отсутствует.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Недействительный токен.' });
    req.user = user;
    next();
  });
};

// Получить профиль
app.get('/api/me', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Пополнить баланс (только админ)
app.post('/api/balance/add', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Доступ запрещён.' });
  const { username, amount } = req.body;
  if (!username || !amount || amount <= 0) return res.status(400).json({ message: 'Неверные данные.' });

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: 'Пользователь не найден.' });

  user.balance += amount;
  await user.save();
  res.json({ message: `+${amount}₽ добавлено`, balance: user.balance });
});

// Покупка товара
app.post('/api/buy', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Товар не найден.' });

  const user = await User.findById(req.user.id);
  if (user.balance < product.price) {
    return res.status(400).json({ message: `Недостаточно средств. Нужно: ${product.price}₽` });
  }

  user.balance -= product.price;
  user.history.push({
    service: product.name,
    amount: product.price,
    date: new Date()
  });
  await user.save();

  res.json({ message: `✅ Куплено: ${product.name}`, balance: user.balance });
});

// Получить товары
app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Админка: получить всех пользователей
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Доступ запрещён.' });
  const users = await User.find().select('-password');
  res.json(users);
});

// Админка: получить тикеты
app.get('/api/admin/tickets', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Доступ запрещён.' });
  const users = await User.find().select('username supportTickets');
  const tickets = users.flatMap(u => 
    u.supportTickets.map(t => ({ 
      ...t, 
      username: u.username, 
      userId: u._id 
    }))
  );
  res.json(tickets);
});

// Админка: добавить тикет от пользователя (в будущем — через форму)
app.post('/api/support', authenticateToken, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ message: 'Заголовок и сообщение обязательны.' });

  const user = await User.findById(req.user.id);
  user.supportTickets.push({ subject, message, date: new Date() });
  await user.save();
  res.json({ message: 'Тикет отправлен. Мы ответим в течение 24 часов.' });
});

// === ИНИЦИАЛИЗАЦИЯ ТОВАРОВ ===
const initProducts = async () => {
  const count = await Product.countDocuments();
  if (count === 0) {
    const products = [
      { name: "ПОПОЛНЕНИЕ STEAM 100 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 104, desc: "✅ 100 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "http://t.me/send?start=IVgGf3gqWf9G" },
      { name: "ПОПОЛНЕНИЕ 200 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 208, desc: "✅ 200 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=200" },
      { name: "ПОПОЛНЕНИЕ 300 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 312, desc: "✅ 300 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=300" },
      { name: "ПОПОЛНЕНИЕ 400 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 416, desc: "✅ 400 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=400" },
      { name: "ПОПОЛНЕНИЕ 500 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 520, desc: "✅ 500 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=500" },
      { name: "ПОПОЛНЕНИЕ 600 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 624, desc: "✅ 600 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=600" },
      { name: "ПОПОЛНЕНИЕ 700 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 728, desc: "✅ 700 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=700" },
      { name: "ПОПОЛНЕНИЕ 800 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 812, desc: "✅ 800 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=800" },
      { name: "ПОПОЛНЕНИЕ 900 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 916, desc: "✅ 900 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=900" },
      { name: "ПОПОЛНЕНИЕ 1000 РУБЛЕЙ БЕЗ ВХОДА НА АКАУНТ!", price: 1020, desc: "✅ 1000 РУБЛЕЙ в Steam✅ ЧЕРЕЗ ЮЗЕР НЕЙМ БЕЗ ВХОДА НА АКАУНТ! Безопасно и легально – рубли выдаются через официальный донат на сайте. Гарантия выдачи – моментально выдаём! Выгодные условия – дешевле, чем в других магазинах", link: "https://t.me/ZEKQZSteamBot?start=1000" }
    ];
    await Product.insertMany(products);
    console.log('✅ Товары инициализированы.');
  }
};

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  initProducts();
});
