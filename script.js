// --- 1. SUPABASE AYARLARI ---
var S_URL = "https://axxcarwzuabkkgcnnwqu.supabase.co".trim();
var S_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw".trim();
var _supabase = window.supabase.createClient(S_URL, S_KEY);

var currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

window.onload = function() { if (currentUser) showApp(); };

// --- 2. GİRİŞ SİSTEMİ ---
async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const btn = document.getElementById('login-btn');

    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici' };
        loginOk(); return;
    }

    const { data } = await _supabase.from('sakinler').select('*').eq('daire', user).eq('sifre', pass).maybeSingle();
    if (data) {
        currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
        loginOk();
    } else { alert("Hatalı Giriş!"); }
}

function loginOk() { sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); showApp(); }
function handleLogout() { sessionStorage.clear(); location.reload(); }

// --- 3. EKRAN YÖNETİMİ ---
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('user-display-name').innerText = currentUser.name;
    document.body.classList.remove('login-mode');

    // Yetki Sınıfı Ekleme
    document.body.classList.toggle('is-admin', currentUser.role === 'admin');
    document.body.classList.toggle('is-resident', currentUser.role === 'resident');

    renderMenu();
    fetchData();
}

function renderMenu() {
    const list = document.getElementById('menu-list');
    const items = [
        { t: 'Panel', target: 'dashboard', icon: 'fa-home', role: 'all' },
        { t: 'Sakinler', target: 'sakinler', icon: 'fa-users', role: 'admin' },
        { t: 'Ödemeler', target: 'odemeler', icon: 'fa-credit-card', role: 'all' },
        { t: 'Duyurular', target: 'duyurular', icon: 'fa-bullhorn', role: 'all' },
        { t: 'Arıza Bildir', target: 'ariza', icon: 'fa-tools', role: 'all' }
    ];
    list.innerHTML = items.filter(i => i.role === 'all' || i.role === currentUser.role)
        .map(i => `<li onclick="switchTab('${i.target}')"><i class="fas ${i.icon}"></i> ${i.t}</li>`).join('');
}

function switchTab(target) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    document.getElementById('current-page-title').innerText = target.toUpperCase();
}

// --- 4. VERİ TABANI İŞLEMLERİ ---
async function fetchData() {
    const { data: s } = await _supabase.from('sakinler').select('*').order('daire');
    const { data: d } = await _supabase.from('duyurular').select('*').order('id', {ascending: false});

    if (s) {
        // Sakinler Tablosu (Sadece Admin İçin)
        document.getElementById('sakinTableBody').innerHTML = s.map(x => `
            <tr><td>${x.daire}</td><td>${x.ad}</td><td>${x.tel}</td><td><button onclick="deleteSakin(${x.id})">Sil</button></td></tr>
        `).join('');

        // Ödemeler Tablosu (Admin hepsini, Sakin sadece kendisini görür)
        const odemeList = (currentUser.role === 'admin') ? s : s.filter(x => x.daire === currentUser.daire);
        document.getElementById('aidatTableBody').innerHTML = odemeList.map(x => `
            <tr><td>${x.daire}</td><td>Aralık 2023</td><td>₺500</td>
            <td><span class="badge ${x.aidat_odedi ? 'bg-success' : 'bg-danger'}">${x.aidat_odedi ? 'Ödendi' : 'Borç'}</span></td>
            <td class="admin-only">${currentUser.role === 'admin' ? `<button onclick="toggleAidat(${x.id}, ${x.aidat_odedi})">Değiştir</button>` : '-'}</td></tr>
        `).join('');

        // Admin İstatistikleri
        if(currentUser.role === 'admin') {
            document.getElementById('stat-kasa').innerText = `₺${s.filter(x => x.aidat_odedi).length * 500}`;
            document.getElementById('stat-bekleyen').innerText = s.filter(x => !x.aidat_odedi).length;
        } else {
            const me = s.find(x => x.daire === currentUser.daire);
            document.getElementById('res-name').innerText = me.ad;
            document.getElementById('my-status-card').innerHTML = me.aidat_odedi ? 
                '<b style="color:green">Borcunuz bulunmamaktadır.</b>' : '<b style="color:red">₺500 Aidat borcunuz var!</b>';
        }
    }

    if (d) {
        document.getElementById('duyuruList').innerHTML = d.map(x => `
            <div class="card"><h4>${x.baslik}</h4><p>${x.metin}</p></div>
        `).join('');
    }
}

async function saveSakin() {
    const daire = document.getElementById('sakinDaire').value;
    const ad = document.getElementById('sakinAd').value;
    await _supabase.from('sakinler').insert([{daire, ad, tel: document.getElementById('sakinTel').value, sifre: '123'}]);
    toggleModal('sakinModal'); fetchData();
}

async function saveDuyuru() {
    await _supabase.from('duyurular').insert([{baslik: document.getElementById('duyuruBaslik').value, metin: document.getElementById('duyuruMetin').value}]);
    toggleModal('duyuruModal'); fetchData();
}

async function toggleAidat(id, stat) {
    await _supabase.from('sakinler').update({aidat_odedi: !stat}).eq('id', id);
    fetchData();
}

async function saveAriza() {
    await _supabase.from('arizalar').insert([{baslik: document.getElementById('ariza-baslik').value, detay: document.getElementById('ariza-detay').value, daire: currentUser.daire || 'Yönetim'}]);
    alert("Arıza kaydı oluşturuldu!");
}

function toggleModal(id) { const m = document.getElementById(id); m.style.display = (m.style.display === 'flex') ? 'none' : 'flex'; }
