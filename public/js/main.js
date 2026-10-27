// ─── GLOBAL UTILS ────────────────────────────────────────────────────────────

const API = '';

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || '💬'}</span> ${message}`;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// Get auth token
function getToken() { return localStorage.getItem('proteam_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('proteam_user')); } catch { return null; }
}

// Auth API helper
async function apiCall(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  const token = getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});

function updateNavAuth() {
  const user = getUser();
  const guestEl = document.getElementById('navGuest');
  const userEl = document.getElementById('navUser');
  const avatarEl = document.getElementById('navAvatar');
  const heroJoinBtn = document.getElementById('heroJoinBtn');

  if (user && getToken()) {
    if (guestEl) guestEl.style.display = 'none';
    if (userEl) { userEl.style.display = 'flex'; }
    if (avatarEl) avatarEl.textContent = user.name ? user.name[0].toUpperCase() : 'U';
    if (heroJoinBtn) {
      heroJoinBtn.innerHTML = '<i class="fas fa-tachometer-alt"></i> My Dashboard';
      heroJoinBtn.onclick = () => location.href = 'dashboard.html';
    }
  } else {
    if (guestEl) guestEl.style.display = '';
    if (userEl) userEl.style.display = 'none';
  }
}

function toggleMenu() {
  const links = document.getElementById('navLinks');
  if (links) links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function openAuthModal(tab = 'login') {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('open');
    switchTab(tab);
  }
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'authModal') closeAuthModal();
});

function switchTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');

  if (tab === 'login') {
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');
    loginTab?.classList.add('active');
    registerTab?.classList.remove('active');
  } else {
    loginForm?.classList.add('hidden');
    registerForm?.classList.remove('hidden');
    loginTab?.classList.remove('active');
    registerTab?.classList.add('active');
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const btn = document.getElementById('loginSubmit');

  if (!email || !password) return showToast('Please fill all fields', 'error');

  btn.innerHTML = '<span class="loading"></span> Logging in...';
  btn.disabled = true;

  try {
    const data = await apiCall('/api/auth/login', 'POST', { email, password });
    localStorage.setItem('proteam_token', data.token);
    localStorage.setItem('proteam_user', JSON.stringify(data.user));
    closeAuthModal();
    showToast(`Welcome back, ${data.user.name}! 💪`);
    updateNavAuth();
    setTimeout(() => {
      if (data.user.role === 'admin') location.href = 'admin.html';
      else location.href = 'dashboard.html';
    }, 1000);
  } catch (err) {
    showToast(err.message, 'error');
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    btn.disabled = false;
  }
}

async function handleRegister() {
  const name = document.getElementById('regName')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const phone = document.getElementById('regPhone')?.value.trim();
  const password = document.getElementById('regPassword')?.value;
  const btn = document.getElementById('registerSubmit');

  if (!name || !email || !password) return showToast('Please fill all required fields', 'error');
  if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');

  btn.innerHTML = '<span class="loading"></span> Creating account...';
  btn.disabled = true;

  try {
    const data = await apiCall('/api/auth/register', 'POST', { name, email, phone, password });
    localStorage.setItem('proteam_token', data.token);
    localStorage.setItem('proteam_user', JSON.stringify(data.user));
    closeAuthModal();
    showToast(`Welcome to Proteam Gym, ${data.user.name}! 🔥`);
    updateNavAuth();
    setTimeout(() => location.href = 'dashboard.html', 1000);
  } catch (err) {
    showToast(err.message, 'error');
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    btn.disabled = false;
  }
}

function logout() {
  localStorage.removeItem('proteam_token');
  localStorage.removeItem('proteam_user');
  showToast('Logged out successfully');
  setTimeout(() => location.href = 'index.html', 1000);
}

// ─── RENDER FUNCTIONS ─────────────────────────────────────────────────────────

function renderClassCard(c) {
  const catClass = `cat-${c.category}`;
  const catLabel = c.category.charAt(0).toUpperCase() + c.category.slice(1);
  const pct = c.max_capacity > 0 ? Math.round((c.current_enrolled / c.max_capacity) * 100) : 0;
  const full = c.current_enrolled >= c.max_capacity;

  return `
    <div class="class-card fade-up">
      <span class="class-category ${catClass}">${catLabel}</span>
      <div class="class-name">${c.name}</div>
      <div class="class-desc">${c.description || ''}</div>
      <div class="class-meta">
        <span><i class="fas fa-calendar-day"></i> ${c.day}</span>
        <span><i class="fas fa-clock"></i> ${c.time} (${c.duration} min)</span>
        <span><i class="fas fa-user-tie"></i> ${c.trainer}</span>
      </div>
      <div class="class-footer">
        <span class="capacity-text">${c.current_enrolled}/${c.max_capacity}</span>
        <div class="capacity-bar">
          <div class="capacity-fill" style="width:${pct}%;background:${pct > 80 ? 'var(--danger)' : 'var(--gradient)'}"></div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="bookClass(${c.id}, '${c.name}')" ${full ? 'disabled style="opacity:0.5"' : ''}>
          ${full ? 'Full' : 'Book'}
        </button>
      </div>
    </div>
  `;
}

function renderTrainerCard(t) {
  const stars = '★'.repeat(Math.floor(t.rating)) + (t.rating % 1 >= 0.5 ? '½' : '');
  return `
    <div class="trainer-card fade-up">
      <div class="trainer-avatar">${t.name[0]}</div>
      <h3>${t.name}</h3>
      <div class="trainer-specialization">${t.specialization}</div>
      <div class="trainer-exp">${t.experience} Experience</div>
      <div class="trainer-bio">${t.bio}</div>
      <div class="trainer-rating">
        <span class="stars">${stars}</span>
        <span style="font-size:0.85rem;color:var(--text-muted)">${t.rating}</span>
      </div>
      <div class="trainer-instagram"><i class="fab fa-instagram"></i> ${t.instagram}</div>
    </div>
  `;
}

// ─── BOOK CLASS ───────────────────────────────────────────────────────────────
async function bookClass(classId, className) {
  const token = getToken();
  if (!token) {
    showToast('Please login to book a class', 'info');
    openAuthModal('login');
    return;
  }

  try {
    const data = await apiCall('/api/classes/book', 'POST', { class_id: classId });
    showToast(data.message || `Booked: ${className}! ✅`);
    // Refresh page after booking
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── BMI CALCULATOR ───────────────────────────────────────────────────────────
function calculateBMI() {
  const weight = parseFloat(document.getElementById('bmiWeight')?.value);
  const height = parseFloat(document.getElementById('bmiHeight')?.value);

  if (!weight || !height || weight < 30 || height < 100) {
    showToast('Please enter valid weight and height', 'error');
    return;
  }

  const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
  const resultEl = document.getElementById('bmiResult');
  const valueEl = document.getElementById('bmiValue');
  const categoryEl = document.getElementById('bmiCategory');
  const adviceEl = document.getElementById('bmiAdvice');

  let category, advice, color;
  if (bmi < 18.5) {
    category = '😟 Underweight'; advice = 'Focus on strength training and a calorie surplus diet. Our coaches can help you gain healthy muscle mass.'; color = '#60A5FA';
  } else if (bmi < 25) {
    category = '✅ Normal Weight'; advice = 'Great job! Maintain your weight with regular exercise. Consider our strength training classes to build lean muscle.'; color = '#34D399';
  } else if (bmi < 30) {
    category = '⚠️ Overweight'; advice = 'Our HIIT Cardio and Zumba classes combined with nutrition guidance can help you reach your ideal weight.'; color = '#FCD34D';
  } else {
    category = '🚨 Obese'; advice = 'We strongly recommend starting with our beginner-friendly cardio classes and personalized training plan. Join today!'; color = '#F87171';
  }

  valueEl.textContent = bmi;
  valueEl.style.color = color;
  categoryEl.textContent = category;
  categoryEl.style.color = color;
  adviceEl.textContent = advice;
  resultEl.classList.add('show');
}

// ─── INTERSECTION OBSERVER FOR ANIMATIONS ────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ─── COUNT UP ANIMATION ───────────────────────────────────────────────────────
function countUp(el, target, duration = 1500) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    el.textContent = Math.round(progress * target) + (target >= 1000 ? '+' : (el.dataset.suffix || ''));
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const target = parseInt(e.target.dataset.target);
      countUp(e.target, target);
      statsObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => statsObserver.observe(el));

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  // Re-observe dynamically loaded fade-up elements
  setTimeout(() => {
    document.querySelectorAll('.fade-up:not(.visible)').forEach(el => observer.observe(el));
  }, 500);
});
