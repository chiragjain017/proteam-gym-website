const db = require('./database');

console.log('\n=== TABLES & SCHEMA ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => {
  console.log('\nTABLE: ' + t.name.toUpperCase());
  const info = db.prepare('PRAGMA table_info(' + t.name + ')').all();
  info.forEach(col => {
    console.log('  ' + col.cid + '  ' + col.name + '  ' + col.type + (col.notnull ? '  NOT NULL' : '') + (col.pk ? '  PRIMARY KEY' : ''));
  });
});

console.log('\n\n=== ROW COUNTS ===');
tables.forEach(t => {
  const count = db.prepare('SELECT COUNT(*) as c FROM ' + t.name).get();
  console.log(t.name + ': ' + count.c + ' rows');
});

console.log('\n\n=== USERS TABLE ===');
const users = db.prepare('SELECT id, name, email, role, membership_plan, membership_end, created_at FROM users').all();
console.table(users);

console.log('\n\n=== CLASSES TABLE ===');
const classes = db.prepare('SELECT id, name, trainer, day, time, duration, max_capacity, current_enrolled, category FROM classes').all();
console.table(classes);

console.log('\n\n=== TRAINERS TABLE ===');
const trainers = db.prepare('SELECT id, name, specialization, experience, rating FROM trainers').all();
console.table(trainers);

console.log('\n\n=== MEMBERSHIPS TABLE ===');
const memberships = db.prepare('SELECT * FROM memberships').all();
console.table(memberships);

console.log('\n\n=== BOOKINGS TABLE ===');
const bookings = db.prepare('SELECT * FROM bookings').all();
console.table(bookings);

console.log('\n\n=== CONTACTS TABLE ===');
const contacts = db.prepare('SELECT * FROM contacts').all();
console.table(contacts);

console.log('\n\n=== FOREIGN KEY RELATIONSHIPS ===');
console.log('memberships.user_id  -->  users.id');
console.log('bookings.user_id     -->  users.id');
console.log('bookings.class_id    -->  classes.id');
