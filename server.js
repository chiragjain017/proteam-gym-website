const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'proteamgym_secret_2024_ultraSecure';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)'
    ).run(name, email, phone || '', hash);

    const user = db.prepare('SELECT id, name, email, phone, role, membership_plan FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, phone, role, membership_plan, membership_start, membership_end, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ─── MEMBERSHIP ROUTES ────────────────────────────────────────────────────────
app.post('/api/membership/purchase', authMiddleware, (req, res) => {
  try {
    const { plan, payment_method } = req.body;
    const plans = { basic: { price: 999, months: 1 }, standard: { price: 2499, months: 3 }, premium: { price: 7999, months: 12 } };
    if (!plans[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const { price, months } = plans[plan];
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.prepare('INSERT INTO memberships (user_id, plan, price, start_date, end_date, payment_method) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, plan, price, start, end, payment_method || 'cash');
    db.prepare('UPDATE users SET membership_plan = ?, membership_start = ?, membership_end = ? WHERE id = ?').run(plan, start, end, req.user.id);

    res.json({ success: true, message: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated!`, end_date: end });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CLASS ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/classes', (req, res) => {
  try {
    const classes = db.prepare(
      "SELECT * FROM classes ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 END, time"
    ).all();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes/book', authMiddleware, (req, res) => {
  try {
    const { class_id } = req.body;
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(class_id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    if (cls.current_enrolled >= cls.max_capacity) return res.status(400).json({ error: 'Class is full' });

    const existing = db.prepare("SELECT id FROM bookings WHERE user_id = ? AND class_id = ? AND status = 'confirmed'").get(req.user.id, class_id);
    if (existing) return res.status(409).json({ error: 'Already booked' });

    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(req.user.id);
    const today = new Date().toISOString().split('T')[0];

    db.prepare('INSERT INTO bookings (user_id, class_id, user_name, user_email, class_name, booking_date) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, class_id, user.name, user.email, cls.name, today);
    db.prepare('UPDATE classes SET current_enrolled = current_enrolled + 1 WHERE id = ?').run(class_id);

    res.json({ success: true, message: `Booked: ${cls.name} on ${cls.day} at ${cls.time}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/classes/my-bookings', authMiddleware, (req, res) => {
  try {
    const bookings = db.prepare('SELECT b.*, c.day, c.time, c.trainer, c.category FROM bookings b JOIN classes c ON b.class_id = c.id WHERE b.user_id = ? ORDER BY b.created_at DESC').all(req.user.id);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TRAINER ROUTES ───────────────────────────────────────────────────────────
app.get('/api/trainers', (req, res) => {
  try {
    const trainers = db.prepare('SELECT * FROM trainers').all();
    res.json(trainers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONTACT ROUTES ───────────────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message required' });

    db.prepare('INSERT INTO contacts (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)').run(name, email, phone || '', subject || 'General Inquiry', message);
    res.json({ success: true, message: "Message received! We'll get back to you within 24 hours." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/admin/stats', adminMiddleware, (req, res) => {
  try {
    const totalMembers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'member'").get();
    const activeMembers = db.prepare("SELECT COUNT(*) as count FROM users WHERE membership_plan != 'none' AND membership_end >= date('now')").get();
    const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
    const unreadContacts = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE status = 'unread'").get();
    const revenue = db.prepare('SELECT COALESCE(SUM(price), 0) as total FROM memberships').get();
    const recentSignups = db.prepare("SELECT id, name, email, membership_plan, created_at FROM users WHERE role = 'member' ORDER BY created_at DESC LIMIT 5").all();

    res.json({
      totalMembers: totalMembers.count,
      activeMembers: activeMembers.count,
      totalBookings: totalBookings.count,
      unreadContacts: unreadContacts.count,
      revenue: revenue.total,
      recentSignups
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/members', adminMiddleware, (req, res) => {
  try {
    const members = db.prepare("SELECT id, name, email, phone, membership_plan, membership_start, membership_end, created_at FROM users WHERE role = 'member' ORDER BY created_at DESC").all();
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/bookings', adminMiddleware, (req, res) => {
  try {
    const bookings = db.prepare('SELECT b.*, c.day, c.time, c.trainer FROM bookings b JOIN classes c ON b.class_id = c.id ORDER BY b.created_at DESC').all();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/contacts', adminMiddleware, (req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/contacts/:id/read', adminMiddleware, (req, res) => {
  try {
    db.prepare("UPDATE contacts SET status = 'read' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/members/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DB VIEWER DELETE ROUTES ───────────────────────────────────────────────────
app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    db.prepare('DELETE FROM bookings WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM memberships WHERE user_id = ?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'User and related records deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/memberships/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM memberships WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/bookings/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/classes/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM bookings WHERE class_id = ?').run(req.params.id);
    db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/trainers/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM trainers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/contacts/:id', adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN GET ROUTES (for DB Viewer) ─────────────────────────────────────────
app.get('/api/admin/users', adminMiddleware, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, phone, role, membership_plan, membership_start, membership_end, created_at FROM users ORDER BY id').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/memberships', adminMiddleware, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM memberships ORDER BY id').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SERVE PAGES ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║         PROTEAM GYM SERVER               ║
  ║   Running at http://localhost:${PORT}       ║
  ║   Admin: admin@proteamgym.com            ║
  ║   Pass:  admin123                        ║
  ╚══════════════════════════════════════════╝
  `);
});
