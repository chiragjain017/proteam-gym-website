# 💪 PROTEAM GYM — Full Stack Website

A real, working gym website with database, authentication, bookings, and admin panel.

---

## 🚀 Quick Start

### 1. Install dependencies
```powershell
npm install
```

### 2. Start the server
```powershell
npm start
```

### 3. Open your browser
```
http://localhost:3000
```

---

## 🔑 Default Credentials

| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@proteamgym.com     | admin123   |

---

## 📄 Pages

| Page           | URL                              | Description                          |
|----------------|----------------------------------|--------------------------------------|
| Home           | `http://localhost:3000`          | Landing page with hero, stats, about |
| Membership     | `/membership.html`               | 3-tier pricing plans with purchase   |
| Schedule       | `/schedule.html`                 | Weekly class schedule with booking   |
| Trainers       | `/trainers.html`                 | Expert trainer profiles              |
| Contact        | `/contact.html`                  | Contact form (saves to DB)           |
| Dashboard      | `/dashboard.html`                | Member portal                        |
| Admin          | `/admin.html`                    | Admin panel (admin only)             |

---

## 🗄️ Database (SQLite — proteam.db)

Auto-created on first run with:
- **users** — Member accounts with hashed passwords
- **memberships** — Purchase records
- **classes** — 12 pre-seeded weekly classes
- **bookings** — Class reservations
- **trainers** — 4 pre-seeded trainers
- **contacts** — Contact form submissions

---

## 🌐 API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user (JWT required)

### Membership
- `POST /api/membership/purchase` — Buy a plan (JWT required)

### Classes
- `GET /api/classes` — List all classes
- `POST /api/classes/book` — Book a class (JWT required)
- `GET /api/classes/my-bookings` — My bookings (JWT required)

### Trainers
- `GET /api/trainers` — List all trainers

### Contact
- `POST /api/contact` — Submit contact form

### Admin (admin JWT required)
- `GET /api/admin/stats` — Dashboard stats
- `GET /api/admin/members` — All members
- `GET /api/admin/bookings` — All bookings
- `GET /api/admin/contacts` — All messages
- `PUT /api/admin/contacts/:id/read` — Mark message read
- `DELETE /api/admin/members/:id` — Delete member

---

## 🎨 Tech Stack

- **Frontend**: HTML5, Vanilla CSS (custom design system), Vanilla JS
- **Backend**: Node.js + Express.js
- **Database**: SQLite3 (via better-sqlite3)
- **Auth**: JWT + bcrypt
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Outfit + Bebas Neue)
