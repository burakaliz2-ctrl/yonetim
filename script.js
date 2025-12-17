// --- 1. SUPABASE AYARLARI ---
var URL = "https://axxcarwzuabkkgcnnwqu.supabase.co";
var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw";
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

    if (!user || !pass) { alert("Boş alan bırakmayın!"); return; }

    btn.innerText = "Bağlanıyor...";
    btn.disabled = true;

    // A. Admin Girişi
    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici' };
        loginOk();
        return;
    }

    // B. Sakin Girişi
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
            alert("Hatalı bilgiler!");
            resetLoginBtn(btn);
        }
    } catch (e) {
        alert("Bağlantı hatası!");
        resetLoginBtn(btn);
    }
}

function loginOk() {
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
}

function resetLoginBtn(btn) {
    btn.innerText = "Giriş Yap";
    btn.disabled = false;
}

function handleLogout() {
    sessionStorage.clear();
    location.reload();
}

// --- 3. UYGULAMA MANTIĞI ---
function showApp() {
    document.body.classList.remove('login-mode');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('user-display-name').innerText = currentUser.name;

    if (currentUser.role === 'admin') {
        document.getElementById('admin-stats').style.display = 'grid';
        document.body.classList.add('is-admin');
    }
    
    renderMenu();
    fetchData();
}

function renderMenu() {
    const list = document.getElementById('menu-list');
    const items = [
        { t: 'Panel', target: 'dashboard', icon: 'fa-home' },
        { t: 'Sakinler', target: 'sakinler', icon: 'fa-users' }
    ];
    list.innerHTML = items.map(i => `<li onclick="switchTab('${i.target}')"><i class="fas ${i.icon}"></i> ${i.t}</li>`).join('');
}

function switchTab(target) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
}

async function fetchData() {
    const { data: s } = await _supabase.from('sakinler').select('*');
    if(s) {
        document.getElementById('sakinTableBody').innerHTML = s.map(x => `
            <tr><td>${x.daire}</td><td>${x.ad}</td><td>${x.tel || '-'}</td>
            <td class="admin-only"><button onclick="deleteSakin(${x.id})">Sil</button></td></tr>
        `).join('');
        
        if (currentUser.role === 'admin') {
            const kasa = s.filter(x => x.aidat_odedi).length * 500;
            document.getElementById('stat-kasa').innerText = `₺${kasa}`;
        }
    }
}

async function saveSakin() {
    const daire = document.getElementById('sakinDaire').value;
    const ad = document.getElementById('sakinAd').value;
    await _supabase.from('sakinler').insert([{daire, ad, sifre:'123'}]);
    toggleModal('sakinModal');
    fetchData();
}

function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}
