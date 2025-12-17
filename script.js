// --- YENİ SUPABASE YAPILANDIRMASI ---
const SUPABASE_URL = "https://axxcarwzuabkkgcnnwqu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

window.onload = () => {
    if (currentUser) showApp();
};

async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const btn = document.getElementById('login-btn');

    if (!user || !pass) {
        alert("Lütfen alanları doldurun!");
        return;
    }

    btn.innerText = "Bağlanıyor...";
    btn.disabled = true;

    // 1. ADMIN KONTROLÜ
    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici' };
        loginSuccess();
        return;
    }

    // 2. SAKİN KONTROLÜ
    try {
        const { data, error } = await supabase
            .from('sakinler')
            .select('*')
            .eq('daire', user)
            .eq('sifre', pass)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
            loginSuccess();
        } else {
            alert("Hatalı kullanıcı adı veya şifre!");
            resetBtn(btn);
        }
    } catch (err) {
        console.error("Giriş Hatası:", err);
        alert("Veritabanına bağlanılamadı. SQL tablolarını oluşturdunuz mu?");
        resetBtn(btn);
    }
}

function loginSuccess() {
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
}

function resetBtn(btn) {
    btn.innerText = "Giriş Yap";
    btn.disabled = false;
}

function showApp() {
    document.body.classList.remove('login-mode');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('user-display-name').innerText = currentUser.name;

    if (currentUser.role === 'admin') {
        const adminDiv = document.getElementById('admin-stats');
        if(adminDiv) adminDiv.style.display = 'block';
    }
    
    renderMenu();
    fetchData();
}

function handleLogout() {
    sessionStorage.clear();
    location.reload();
}

// Menü ve Veri çekme fonksiyonları öncekiyle aynı şekilde devam eder...
function renderMenu() {
    const menu = document.getElementById('menu-list');
    const items = [
        { t: 'Panel', target: 'dashboard', icon: 'fa-home' },
        { t: 'Sakinler', target: 'sakinler', icon: 'fa-users', admin: true },
        { t: 'Aidat', target: 'aidat', icon: 'fa-lira-sign' }
    ];
    menu.innerHTML = items
        .filter(i => !i.admin || currentUser.role === 'admin')
        .map(i => `<li onclick="switchTab('${i.target}')"><i class="fas ${i.icon}"></i> ${i.t}</li>`)
        .join('');
}

function switchTab(target) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
}

async function fetchData() {
    // Supabase'den verileri çek ve tabloları doldur
    const { data: s } = await supabase.from('sakinler').select('*');
    if(s) renderSakinler(s);
}

function renderSakinler(list) {
    const b = document.getElementById('sakinTableBody');
    if(b) b.innerHTML = list.map(x => `<tr><td>${x.daire}</td><td>${x.ad}</td></tr>`).join('');
}
