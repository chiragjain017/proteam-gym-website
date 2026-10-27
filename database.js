// Uses Node.js built-in SQLite (available in Node.js 22.5+ / Node.js 24)
// No external compilation required!
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'proteam.db'));

// Enable WAL mode and foreign keys via exec
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    membership_plan TEXT DEFAULT 'none',
    membership_start TEXT,
    membership_end TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    plan TEXT NOT NULL,
    price REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    payment_method TEXT DEFAULT 'cash',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trainer TEXT NOT NULL,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER DEFAULT 60,
    max_capacity INTEGER DEFAULT 20,
    current_enrolled INTEGER DEFAULT 0,
    category TEXT DEFAULT 'general',
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    class_id INTEGER,
    user_name TEXT,
    user_email TEXT,
    class_name TEXT,
    booking_date TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS trainers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT,
    experience TEXT,
    bio TEXT,
    photo TEXT,
    instagram TEXT,
    rating REAL DEFAULT 4.5
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Helper: prepare().get() returns undefined if not found (same as better-sqlite3)
// node:sqlite uses the same synchronous API pattern

// Seed default admin
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@proteamgym.com');
if (!adminExists) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)`)
    .run('Admin', 'admin@proteamgym.com', '9999999999', hash, 'admin');
  console.log('✅ Admin account created: admin@proteamgym.com / admin123');
}

// Seed classes
const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get();
if (classCount.count === 0) {
  const classes = [
    { name: 'Power Lifting', trainer: 'Rajan Verma', day: 'Monday', time: '06:00', duration: 90, max_capacity: 15, category: 'strength', description: 'Build raw power and strength' },
    { name: 'HIIT Cardio', trainer: 'Priya Sharma', day: 'Monday', time: '08:00', duration: 60, max_capacity: 20, category: 'cardio', description: 'High intensity fat burning session' },
    { name: 'Yoga & Flexibility', trainer: 'Anita Patel', day: 'Tuesday', time: '07:00', duration: 60, max_capacity: 25, category: 'yoga', description: 'Flexibility and mindfulness' },
    { name: 'Bodybuilding', trainer: 'Rajan Verma', day: 'Tuesday', time: '09:00', duration: 90, max_capacity: 15, category: 'strength', description: 'Muscle hypertrophy training' },
    { name: 'Zumba Dance', trainer: 'Priya Sharma', day: 'Wednesday', time: '06:30', duration: 60, max_capacity: 30, category: 'cardio', description: 'Fun cardio with dance moves' },
    { name: 'CrossFit', trainer: 'Arjun Singh', day: 'Wednesday', time: '08:00', duration: 75, max_capacity: 18, category: 'crossfit', description: 'Functional fitness at its peak' },
    { name: 'Boxing Basics', trainer: 'Arjun Singh', day: 'Thursday', time: '07:00', duration: 60, max_capacity: 16, category: 'combat', description: 'Learn boxing fundamentals' },
    { name: 'Core Blaster', trainer: 'Anita Patel', day: 'Thursday', time: '09:00', duration: 45, max_capacity: 25, category: 'strength', description: 'Intense core workout' },
    { name: 'Spin Cycling', trainer: 'Priya Sharma', day: 'Friday', time: '06:00', duration: 60, max_capacity: 20, category: 'cardio', description: 'Indoor cycling for endurance' },
    { name: 'Functional Training', trainer: 'Arjun Singh', day: 'Friday', time: '08:00', duration: 75, max_capacity: 18, category: 'strength', description: 'Real-world movement training' },
    { name: 'Weekend Warriors', trainer: 'Rajan Verma', day: 'Saturday', time: '07:00', duration: 120, max_capacity: 20, category: 'crossfit', description: 'Full body weekend challenge' },
    { name: 'Meditation & Stretch', trainer: 'Anita Patel', day: 'Sunday', time: '08:00', duration: 60, max_capacity: 30, category: 'yoga', description: 'Recovery and mental wellness' },
  ];

  const insertClass = db.prepare(`INSERT INTO classes (name, trainer, day, time, duration, max_capacity, category, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  classes.forEach(c => insertClass.run(c.name, c.trainer, c.day, c.time, c.duration, c.max_capacity, c.category, c.description));
  console.log('✅ 12 Classes seeded');
}

// Seed trainers
const trainerCount = db.prepare('SELECT COUNT(*) as count FROM trainers').get();
if (trainerCount.count === 0) {
  const trainers = [
    { name: 'Rajan Verma', specialization: 'Powerlifting & Bodybuilding', experience: '10 Years', bio: 'National level powerlifter with 10+ years of coaching experience. Specializes in strength training and competition prep.', photo: '', instagram: '@rajan_lifts', rating: 4.9 },
    { name: 'Priya Sharma', specialization: 'Cardio & Dance Fitness', experience: '7 Years', bio: 'Certified Zumba and spinning instructor. Helps clients achieve fat loss goals through dynamic and fun workouts.', photo: '', instagram: '@priya_fitness', rating: 4.8 },
    { name: 'Arjun Singh', specialization: 'CrossFit & Boxing', experience: '8 Years', bio: 'Former state boxing champion turned fitness coach. Expert in functional movement and CrossFit programming.', photo: '', instagram: '@arjun_box', rating: 4.9 },
    { name: 'Anita Patel', specialization: 'Yoga & Mindfulness', experience: '12 Years', bio: 'Certified yoga therapist with expertise in flexibility training, meditation, and injury rehabilitation.', photo: '', instagram: '@anita_yoga', rating: 5.0 },
  ];
  const insertTrainer = db.prepare(`INSERT INTO trainers (name, specialization, experience, bio, photo, instagram, rating) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  trainers.forEach(t => insertTrainer.run(t.name, t.specialization, t.experience, t.bio, t.photo, t.instagram, t.rating));
  console.log('✅ 4 Trainers seeded');
}

module.exports = db;
