// --- YENİ SUPABASE BAĞLANTISI ---
const SUPABASE_URL = "https://axxcarwzuabkkgcnnwqu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) showApp();
});

// --- GİRİŞ SİSTEMİ ---
async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const btn = document.getElementById('login-btn');

    if (!user || !pass) return alert("Alanları doldurun!");
    btn.innerText = "Giriş yapılıyor...";

    // Admin Kontrolü
    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici' };
        loginDone();
        return;
    }

    // Sakin Kontrolü
    try {
        const { data, error } = await supabase
            .from('sakinler')
            .select('*')
            .eq('daire', user)
            .eq('sifre', pass)
            .maybeSingle();

        if (data) {
            currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
            loginDone();
        } else {
            alert("Hatalı Giriş!");
            btn.innerText = "Giriş Yap";
        }
    } catch (e) {
        alert("Bağlantı hatası!");
        btn.innerText = "Giriş Yap";
    }
}

function loginDone() {
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
}

function handleLogout() {
    sessionStorage.clear();
    location.reload();
}

// --- UYGULAMA EKRANI ---
function showApp() {
    document.body.classList.remove('login-mode');
    document.body.classList.add('app-mode');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('user-display-name').innerText = currentUser.name;

    if (currentUser.role === 'admin') document.body.classList.add('is-admin');
    
    renderMenu();
    loadAllData();
}

async function loadAllData() {
    const { data: s } = await supabase.from('sakinler').select('*').order('daire');
    const { data: a } = await supabase.from('arizalar').select('*').order('id', {ascending: false});
    const { data: d } = await supabase.from('duyurular').select('*').order('id', {ascending: false});

    if(s) {
        renderSakinler(s);
        renderAidat(s);
        updateStats(s);
    }
    if(a) renderArizalar(a);
    if(d) renderDuyurular(d);
}

// --- RENDERLAR ---
function renderSakinler(list) {
    const body = document.getElementById('sakinTableBody');
    if (!body) return;
    body.innerHTML = list.map(s => `
        <tr><td>${s.daire}</td><td>${s.ad}</td><td>${s.tel}</td>
        <td><button onclick="deleteSakin(${s.id})" style="color:red; cursor:pointer; border:none; background:none;">Sil</button></td></tr>
    `).join('');
}

function renderAidat(list) {
    const body = document.getElementById('aidatTableBody');
    const filtered = (currentUser.role === 'admin') ? list : list.filter(x => x.daire === currentUser.daire);
    body.innerHTML = filtered.map(s => `
        <tr><td>${s.daire}</td><td>${s.ad}</td><td>₺500</td>
        <td><span class="badge ${s.aidat_odedi ? 'bg-success' : 'bg-danger'}">${s.aidat_odedi ? 'Ödendi' : 'Borç'}</span></td>
        <td class="admin-only">${currentUser.role === 'admin' ? `<button onclick="toggleAidat(${s.id},${s.aidat_odedi})">Değiştir</button>` : '-'}</td></tr>
    `).join('');
}

function updateStats(list) {
    if(currentUser.role === 'admin') {
        const toplam = list.filter(x => x.aidat_odedi).length * 500;
        document.getElementById('stat-kasa').innerText = `₺${toplam}`;
        document.getElementById('stat-bekleyen').innerText = list.filter(x => !x.aidat_odedi).length;
    }
}

function renderArizalar(list) {
    document.getElementById('arizaList').innerHTML = list.map(x => `<div class="card"><strong>${x.baslik} (${x.daire})</strong><p>${x.detay}</p></div>`).join('');
}

function renderDuyurular(list) {
    document.getElementById('duyuruList').innerHTML = list.map(x => `<div class="card"><h4>${x.baslik}</h4><p>${x.metin}</p></div>`).join('');
}

// --- AKSİYONLAR ---
async function saveSakin() {
    const daire = document.getElementById('sakinDaire').value;
    const ad = document.getElementById('sakinAd').value;
    await supabase.from('sakinler').insert([{daire, ad, sifre:'123'}]);
    toggleModal('sakinModal');
    loadAllData();
}

async function toggleAidat(id, stat) {
    await supabase.from('sakinler').update({aidat_odedi: !stat}).eq('id', id);
    loadAllData();
}

async function deleteSakin(id) {
    if(confirm("Silmek istediğinize emin misiniz?")) {
        await supabase.from('sakinler').delete().eq('id', id);
        loadAllData();
    }
}

async function saveAriza() {
    const baslik = document.getElementById('arizaBaslik').value;
    const detay = document.getElementById('arizaDetay').value;
    await supabase.from('arizalar').insert([{baslik, detay, daire: currentUser.daire || 'Yönetim'}]);
    toggleModal('arizaModal');
    loadAllData();
}

async function saveDuyuru() {
    const baslik = document.getElementById('duyuruBaslik').value;
    const metin = document.getElementById('duyuruMetin').value;
    await supabase.from('duyurular').insert([{baslik, metin}]);
    toggleModal('duyuruModal');
    loadAllData();
}

// --- UI ARAÇLARI ---
function renderMenu() {
    const menu = document.getElementById('menu-list');
    const items = [
        { t: 'Panel', i: 'fa-home', target: 'dashboard' },
        { t: 'Sakinler', i: 'fa-users', target: 'sakinler', admin: true },
        { t: 'Aidat', i: 'fa-lira-sign', target: 'aidat' },
        { t: 'Arızalar', i: 'fa-wrench', target: 'ariza' },
        { t: 'Duyurular', i: 'fa-bullhorn', target: 'duyuru' }
    ];
    menu.innerHTML = items.filter(x => !x.admin || currentUser.role === 'admin').map(x => `<li><a href="#" class="nav-item" data-target="${x.target}"><i class="fas ${x.i}"></i> ${x.t}</a></li>`).join('');
    
    document.querySelectorAll('.nav-item').forEach(el => {
        el.onclick = () => {
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(el.dataset.target).classList.add('active');
        };
    });
}

function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}
