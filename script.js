// --- KONFİGÜRASYON ---
const S_URL = "https://axxcarwzuabkkgcnnwqu.supabase.co";
const S_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw";
const _supabase = window.supabase.createClient(S_URL, S_KEY);

let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

window.onload = () => { if(currentUser) showApp(); };

// --- GİRİŞ / ÇIKIŞ ---
async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errMsg = document.getElementById('login-error-msg');
    
    errMsg.style.display = 'none';

    // 1. Admin Kontrolü (Hızlı ve Kesin)
    if(user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici' };
        return loginProcess();
    }

    // 2. Sakin Kontrolü (Supabase Sorgusu)
    try {
        const { data, error } = await _supabase.from('sakinler').select('*').eq('daire', user).eq('sifre', pass).maybeSingle();
        if(data) {
            currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
            loginProcess();
        } else {
            errMsg.style.display = 'block';
        }
    } catch (e) {
        console.error(e);
        alert("Bağlantı hatası!");
    }
}

function loginProcess() {
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
}

function handleLogout() {
    sessionStorage.clear();
    location.reload();
}

// --- PANEL YÖNETİMİ ---
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('user-display-name').innerText = currentUser.name;
    document.body.classList.remove('login-mode');

    // Yetki Sınıflandırması
    document.body.classList.remove('is-admin', 'is-resident');
    document.body.classList.add(currentUser.role === 'admin' ? 'is-admin' : 'is-resident');

    renderMenu();
    fetchData();
}

function renderMenu() {
    const list = document.getElementById('menu-list');
    const items = [
        { t: 'Panel', target: 'dashboard', icon: 'fa-chart-pie' },
        { t: 'Sakinler', target: 'sakinler', icon: 'fa-users' },
        { t: 'Ödemeler', target: 'odemeler', icon: 'fa-lira-sign' },
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

// --- VERİ İŞLEMLERİ ---
async function fetchData() {
    const { data: sak } = await _supabase.from('sakinler').select('*').order('daire');
    const { data: duy } = await _supabase.from('duyurular').select('*').order('id', {ascending:false});
    const { data: arz } = await _supabase.from('arizalar').select('*').order('id', {ascending:false});

    if(sak) {
        const viewList = (currentUser.role === 'admin') ? sak : sak.filter(x => x.daire === currentUser.daire);
        
        // Tabloları doldur
        document.getElementById('sakinTableBody').innerHTML = viewList.map(x => `
            <tr><td>${x.daire}</td><td>${x.ad}</td><td>${x.tel}</td>
            <td class="admin-only"><button onclick="deleteSakin(${x.id})">Sil</button></td></tr>
        `).join('');

        document.getElementById('aidatTableBody').innerHTML = viewList.map(x => `
            <tr><td>${x.daire}</td><td>Aralık 2025</td><td>₺1.250</td>
            <td><span class="badge ${x.aidat_odedi ? 'bg-success' : 'bg-danger'}">${x.aidat_odedi ? 'Ödendi' : 'Borç'}</span></td>
            <td class="admin-only"><button onclick="toggleAidat(${x.id}, ${x.aidat_odedi})">Güncelle</button></td></tr>
        `).join('');

        if(currentUser.role === 'admin') {
            document.getElementById('stat-kasa').innerText = `₺${sak.filter(x => x.aidat_odedi).length * 1250}`;
            document.getElementById('stat-bekleyen').innerText = sak.filter(x => !x.aidat_odedi).length;
        } else {
            const me = sak.find(x => x.daire === currentUser.daire);
            document.getElementById('res-name').innerText = me.ad;
            document.getElementById('my-status-card').innerHTML = me.aidat_odedi ? 
                '<span style="color:green">Borcunuz yoktur.</span>' : '<span style="color:red">₺1.250 Borcunuz Var!</span>';
        }
    }

    if(duy) document.getElementById('duyuruList').innerHTML = duy.map(x => `<div class="card"><h4>${x.baslik}</h4><p>${x.metin}</p></div>`).join('');
    
    if(arz && currentUser.role === 'admin') {
        document.getElementById('arizaTableBody').innerHTML = arz.map(x => `<tr><td>${x.daire}</td><td>${x.baslik}</td><td>${x.detay}</td><td>${new Date(x.tarih).toLocaleDateString()}</td></tr>`).join('');
    }
}

// --- KAYIT FONKSİYONLARI ---
async function saveAriza() {
    const b = document.getElementById('ariza-baslik').value;
    const d = document.getElementById('ariza-detay').value;
    await _supabase.from('arizalar').insert([{ daire: currentUser.daire, baslik: b, detay: d }]);
    alert("Yönetime iletildi."); fetchData();
}

async function saveSakin() {
    await _supabase.from('sakinler').insert([{ 
        daire: document.getElementById('sakinDaire').value, 
        ad: document.getElementById('sakinAd').value, 
        tel: document.getElementById('sakinTel').value, 
        sifre: '123' 
    }]);
    toggleModal('sakinModal'); fetchData();
}

async function saveDuyuru() {
    await _supabase.from('duyurular').insert([{ 
        baslik: document.getElementById('duyuruBaslik').value, 
        metin: document.getElementById('duyuruMetin').value 
    }]);
    toggleModal('duyuruModal'); fetchData();
}

async function toggleAidat(id, stat) {
    await _supabase.from('sakinler').update({ aidat_odedi: !stat }).eq('id', id);
    fetchData();
}

async function deleteSakin(id) {
    if(confirm("Emin misiniz?")) { await _supabase.from('sakinler').delete().eq('id', id); fetchData(); }
}

function toggleModal(id) { const m = document.getElementById(id); m.style.display = m.style.display === 'flex' ? 'none' : 'flex'; }
