// --- 1. SUPABASE AYARLARI ---
// URL'nin temiz olduğundan emin oluyoruz (.trim() ile)
var URL = "https://axxcarwzuabkkgcnnwqu.supabase.co".trim();
var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw".trim();

var _supabase = window.supabase.createClient(URL, KEY);
var currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

window.onload = function() {
    if (currentUser) {
        showApp();
    }
};

// --- 2. GİRİŞ SİSTEMİ ---
async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const btn = document.getElementById('login-btn');

    if (!user || !pass) { alert("Lütfen alanları doldurun!"); return; }

    btn.innerText = "Giriş yapılıyor...";
    btn.disabled = true;

    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Site Yöneticisi' };
        loginOk();
        return;
    }

    try {
        const { data, error } = await _supabase
            .from('sakinler')
            .select('*')
            .eq('daire', user)
            .eq('sifre', pass)
            .maybeSingle();

        if (data) {
            currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
            loginOk();
        } else {
            alert("Hatalı kullanıcı adı veya şifre!");
            resetBtn(btn);
        }
    } catch (e) {
        console.error("Giriş Hatası:", e);
        alert("Bağlantı hatası oluştu!");
        resetBtn(btn);
    }
}

function loginOk() {
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
}

function resetBtn(btn) {
    btn.innerText = "Giriş Yap";
    btn.disabled = false;
}

// --- 3. UYGULAMA GÖRÜNÜMÜ (Hata Korumalı) ---
function showApp() {
    const loginScreen = document.getElementById('login-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const nameDisplay = document.getElementById('user-display-name');
    const adminStats = document.getElementById('admin-stats');

    // Elementlerin varlığını kontrol et (Hata almamak için)
    if (loginScreen) loginScreen.style.display = 'none';
    if (appWrapper) appWrapper.style.display = 'flex';
    if (nameDisplay) nameDisplay.innerText = currentUser.name;
    
    document.body.classList.remove('login-mode');

    if (currentUser.role === 'admin') {
        document.body.classList.add('is-admin');
        if (adminStats) adminStats.style.display = 'grid';
    } else {
        if (adminStats) adminStats.style.display = 'none';
    }
    
    renderMenu();
    fetchData();
}

function handleLogout() {
    sessionStorage.clear();
    location.reload();
}

// --- 4. VERİ VE MENU ---
function renderMenu() {
    const list = document.getElementById('menu-list');
    if (!list) return;
    const items = [
        { t: 'Panel', target: 'dashboard', icon: 'fa-home' },
        { t: 'Sakinler', target: 'sakinler', icon: 'fa-users', admin: true }
    ];
    list.innerHTML = items
        .filter(i => !i.admin || currentUser.role === 'admin')
        .map(i => `<li onclick="switchTab('${i.target}')"><i class="fas ${i.icon}"></i> ${i.t}</li>`)
        .join('');
}

function switchTab(target) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const targetSec = document.getElementById(target);
    if (targetSec) targetSec.classList.add('active');
}

async function fetchData() {
    try {
        const { data: s, error } = await _supabase.from('sakinler').select('*');
        if (error) throw error;
        
        const body = document.getElementById('sakinTableBody');
        if (body && s) {
            body.innerHTML = s.map(x => `
                <tr>
                    <td>${x.daire}</td>
                    <td>${x.ad}</td>
                    <td>${x.tel || '-'}</td>
                    <td class="admin-only">${currentUser.role === 'admin' ? `<button onclick="deleteSakin(${x.id})">Sil</button>` : '-'}</td>
                </tr>
            `).join('');
            
            if (currentUser.role === 'admin') {
                const kasa = s.filter(x => x.aidat_odedi).length * 500;
                const kasaEl = document.getElementById('stat-kasa');
                if (kasaEl) kasaEl.innerText = `₺${kasa}`;
            }
        }
    } catch (err) {
        console.log("Veri çekilemedi, tabloları SQL ile kurdunuz mu?", err);
    }
}

function toggleModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}
