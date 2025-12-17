// --- 1. SUPABASE KONFİGÜRASYONU ---
var S_URL = "https://axxcarwzuabkkgcnnwqu.supabase.co".trim();
var S_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw".trim();

var _supabase = window.supabase.createClient(S_URL, S_KEY);
var currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

window.onload = function() {
    if (currentUser) showApp();
};

// --- 2. GİRİŞ VE ÇIKIŞ ---
async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const btn = document.getElementById('login-btn');

    if (!user || !pass) { alert("Lütfen giriş bilgilerini yazın."); return; }

    btn.innerText = "Giriş yapılıyor...";
    btn.disabled = true;

    // A. ÖNCE ADMIN KONTROLÜ
    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici', id: 'admin-mode' };
        loginSuccess();
        return;
    }

    // B. SAKİN KONTROLÜ
    try {
        const { data, error } = await _supabase
            .from('sakinler')
            .select('*')
            .eq('daire', user)
            .eq('sifre', pass)
            .maybeSingle();

        if (data) {
            currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
            loginSuccess();
        } else {
            alert("Hatalı kullanıcı adı veya şifre!");
            resetBtn(btn);
        }
    } catch (e) {
        alert("Bağlantı hatası: " + e.message);
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

function handleLogout() {
    sessionStorage.clear();
    location.reload();
}

// --- 3. UYGULAMA GÖRÜNÜMÜ ---
function showApp() {
    const loginScr = document.getElementById('login-screen');
    const appWrap = document.getElementById('app-wrapper');
    const nameDsp = document.getElementById('user-display-name');
    const admSts = document.getElementById('admin-stats');
    const resWlc = document.getElementById('resident-welcome');

    if (loginScr) loginScr.style.display = 'none';
    if (appWrap) appWrap.style.display = 'flex';
    if (nameDsp) nameDsp.innerText = currentUser.name;
    document.body.classList.remove('login-mode');

    if (currentUser.role === 'admin') {
        if (admSts) admSts.style.display = 'grid';
        if (resWlc) resWlc.style.display = 'none';
        document.body.classList.add('is-admin');
    } else {
        if (admSts) admSts.style.display = 'none';
        if (resWlc) resWlc.style.display = 'block';
        document.getElementById('res-name').innerText = currentUser.name;
    }

    renderMenu();
    fetchData();
}

function renderMenu() {
    const list = document.getElementById('menu-list');
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
    document.getElementById(target).classList.add('active');
}

// --- 4. VERİ İŞLEMLERİ ---
async function fetchData() {
    const { data: s } = await _supabase.from('sakinler').select('*').order('daire');
    const body = document.getElementById('sakinTableBody');
    if (body && s) {
        body.innerHTML = s.map(x => `
            <tr>
                <td>${x.daire}</td>
                <td>${x.ad}</td>
                <td>${x.tel || '-'}</td>
                <td>${currentUser.role === 'admin' ? `<button onclick="deleteSakin(${x.id})">Sil</button>` : '-'}</td>
            </tr>
        `).join('');

        if (currentUser.role === 'admin') {
            const kasa = s.filter(x => x.aidat_odedi).length * 500;
            document.getElementById('stat-kasa').innerText = `₺${kasa}`;
            document.getElementById('stat-bekleyen').innerText = s.filter(x => !x.aidat_odedi).length;
        }
    }
}

async function saveSakin() {
    const daire = document.getElementById('sakinDaire').value;
    const ad = document.getElementById('sakinAd').value;
    const tel = document.getElementById('sakinTel').value;
    await _supabase.from('sakinler').insert([{daire, ad, tel, sifre:'123'}]);
    toggleModal('sakinModal');
    fetchData();
}

async function deleteSakin(id) {
    if(confirm("Silmek istediğinize emin misiniz?")) {
        await _supabase.from('sakinler').delete().eq('id', id);
        fetchData();
    }
}

function toggleModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}
