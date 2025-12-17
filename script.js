// --- 1. SUPABASE KONFİGÜRASYONU ---
var URL = "https://axxcarwzuabkkgcnnwqu.supabase.co".trim();
var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw".trim();
var _supabase = window.supabase.createClient(URL, KEY);

var currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

window.onload = function() { if (currentUser) showApp(); };

// --- 2. GİRİŞ İŞLEMLERİ ---
async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    
    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici' };
        loginSuccess(); return;
    }

    const { data } = await _supabase.from('sakinler').select('*').eq('daire', user).eq('sifre', pass).maybeSingle();
    if (data) {
        currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
        loginSuccess();
    } else { alert("Giriş bilgileri hatalı!"); }
}

function loginSuccess() { sessionStorage.setItem('currentUser', JSON.stringify(currentUser)); showApp(); }
function handleLogout() { sessionStorage.clear(); location.reload(); }

// --- 3. PANEL YÖNETİMİ VE GEÇİŞLER ---
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('user-display-name').innerText = currentUser.name;
    document.body.classList.remove('login-mode');

    // Yetki Sınıfları
    document.body.classList.toggle('is-admin', currentUser.role === 'admin');
    document.body.classList.toggle('is-resident', currentUser.role === 'resident');

    renderMenu();
    fetchData();
}

function renderMenu() {
    const list = document.getElementById('menu-list');
    const items = [
        { t: 'Panel', target: 'dashboard', icon: 'fa-home' },
        { t: 'Sakinler', target: 'sakinler', icon: 'fa-users' },
        { t: 'Ödemeler', target: 'odemeler', icon: 'fa-credit-card' },
        { t: 'Duyurular', target: 'duyurular', icon: 'fa-bullhorn' },
        { t: 'Arızalar', target: 'ariza', icon: 'fa-wrench' }
    ];
    list.innerHTML = items.map(i => `<li onclick="switchTab('${i.target}', '${i.t}')"><i class="fas ${i.icon}"></i> ${i.t}</li>`).join('');
}

function switchTab(target, title) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    document.getElementById('current-page-title').innerText = title;
}

// --- 4. VERİ ÇEKME ---
async function fetchData() {
    const { data: s } = await _supabase.from('sakinler').select('*').order('daire');
    const { data: d } = await _supabase.from('duyurular').select('*').order('id', {ascending: false});
    const { data: a } = await _supabase.from('arizalar').select('*').order('id', {ascending: false});

    if (s) {
        const filteredS = (currentUser.role === 'admin') ? s : s.filter(x => x.daire === currentUser.daire);
        
        // Tablo Doldurma (Sakin & Ödeme)
        document.getElementById('sakinTableBody').innerHTML = filteredS.map(x => `
            <tr><td>${x.daire}</td><td>${x.ad}</td><td>${x.tel}</td>
            <td class="admin-only"><button onclick="deleteSakin(${x.id})">Sil</button></td></tr>
        `).join('');

        document.getElementById('aidatTableBody').innerHTML = filteredS.map(x => `
            <tr><td>${x.daire}</td><td>Aralık 2025</td><td>₺1.250</td>
            <td><span class="badge ${x.aidat_odedi ? 'bg-success' : 'bg-danger'}">${x.aidat_odedi ? 'Ödendi' : 'Borç'}</span></td>
            <td class="admin-only"><button onclick="toggleAidat(${x.id}, ${x.aidat_odedi})">Değiştir</button></td></tr>
        `).join('');

        if(currentUser.role === 'admin') {
            document.getElementById('stat-kasa').innerText = `₺${s.filter(x => x.aidat_odedi).length * 1250}`;
            document.getElementById('stat-bekleyen').innerText = s.filter(x => !x.aidat_odedi).length;
        } else {
            const me = s.find(x => x.daire === currentUser.daire);
            document.getElementById('res-name').innerText = me.ad;
            document.getElementById('my-status-card').innerHTML = me.aidat_odedi ? '<b style="color:green">Borcunuz yoktur.</b>' : '<b style="color:red">₺1.250 Borcunuz Var!</b>';
        }
    }

    if (d) {
        document.getElementById('duyuruList').innerHTML = d.map(x => `
            <div class="card" style="flex-direction:column; align-items:flex-start;"><h4>${x.baslik}</h4><p>${x.metin}</p></div>
        `).join('');
    }

    if (a && currentUser.role === 'admin') {
        document.getElementById('arizaTableBody').innerHTML = a.map(x => `
            <tr><td><b>${x.daire}</b></td><td>${x.baslik}</td><td>${x.detay}</td><td>${new Date(x.tarih).toLocaleDateString()}</td></tr>
        `).join('');
    }
}

// --- 5. KAYIT İŞLEMLERİ ---
async function saveAriza() {
    const b = document.getElementById('ariza-baslik').value;
    const d = document.getElementById('ariza-detay').value;
    if(!b || !d) return alert("Eksik bilgi!");
    await _supabase.from('arizalar').insert([{ baslik: b, detay: d, daire: currentUser.daire || 'Yönetim' }]);
    alert("Bildirim iletildi.");
    fetchData();
}

async function saveSakin() {
    await _supabase.from('sakinler').insert([{ daire: document.getElementById('sakinDaire').value, ad: document.getElementById('sakinAd').value, tel: document.getElementById('sakinTel').value, sifre: '123' }]);
    toggleModal('sakinModal'); fetchData();
}

async function saveDuyuru() {
    await _supabase.from('duyurular').insert([{ baslik: document.getElementById('duyuruBaslik').value, metin: document.getElementById('duyuruMetin').value }]);
    toggleModal('duyuruModal'); fetchData();
}

async function toggleAidat(id, stat) {
    await _supabase.from('sakinler').update({aidat_odedi: !stat}).eq('id', id);
    fetchData();
}

function toggleModal(id) { const m = document.getElementById(id); m.style.display = (m.style.display === 'flex') ? 'none' : 'flex'; }
