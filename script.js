const URL = "https://axxcarwzuabkkgcnnwqu.supabase.co".trim();
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw".trim();
const _supabase = window.supabase.createClient(URL, KEY);

let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

window.onload = () => { if(currentUser) showApp(); };

async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    
    if(user === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici' };
    } else {
        const { data, error } = await _supabase.from('sakinler').select('*').eq('daire', user).eq('sifre', pass).maybeSingle();
        if(!data) return alert("Hatalı giriş!");
        currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
    }
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    document.getElementById('user-display-name').innerText = currentUser.name;
    
    // YETKİ SINIFLARINI GÜNCELLE
    document.body.classList.remove('is-admin', 'is-resident');
    document.body.classList.add(currentUser.role === 'admin' ? 'is-admin' : 'is-resident');

    renderMenu();
    fetchData();
}

function renderMenu() {
    const list = document.getElementById('menu-list');
    const items = [
        { t: 'Genel Bakış', target: 'dashboard', icon: 'fa-home' },
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

async function fetchData() {
    const { data: s } = await _supabase.from('sakinler').select('*').order('daire');
    const { data: d } = await _supabase.from('duyurular').select('*').order('id', {ascending:false});
    const { data: a } = await _supabase.from('arizalar').select('*').order('id', {ascending:false});

    // SAKİNLER & ÖDEMELER
    if(s) {
        const viewList = (currentUser.role === 'admin') ? s : s.filter(x => x.daire === currentUser.daire);
        
        document.getElementById('sakinTableBody').innerHTML = viewList.map(x => `
            <tr><td>${x.daire}</td><td>${x.ad}</td><td>${x.tel}</td>
            <td class="admin-only"><button onclick="deleteSakin(${x.id})">Sil</button></td></tr>
        `).join('');

        document.getElementById('aidatTableBody').innerHTML = viewList.map(x => `
            <tr><td>${x.daire}</td><td>Aralık 2025</td>
            <td><span class="badge ${x.aidat_odedi ? 'bg-success' : 'bg-danger'}">${x.aidat_odedi ? 'Ödendi' : 'Borç'}</span></td>
            <td class="admin-only"><button onclick="toggleAidat(${x.id}, ${x.aidat_odedi})">Değiştir</button></td></tr>
        `).join('');

        if(currentUser.role === 'admin') {
            document.getElementById('stat-kasa').innerText = `₺${s.filter(x => x.aidat_odedi).length * 1000}`;
            document.getElementById('stat-bekleyen').innerText = s.filter(x => !x.aidat_odedi).length;
        } else {
            const me = s.find(x => x.daire === currentUser.daire);
            document.getElementById('res-name').innerText = me.ad;
            document.getElementById('my-status-card').innerText = me.aidat_odedi ? "Borcunuz bulunmamaktadır." : "₺1.000 Aidat Borcunuz Var!";
        }
    }

    // DUYURULAR
    if(d) document.getElementById('duyuruList').innerHTML = d.map(x => `<div class="card"><h4>${x.baslik}</h4><p>${x.metin}</p></div>`).join('');

    // ARIZALAR
    if(a && currentUser.role === 'admin') {
        document.getElementById('arizaTableBody').innerHTML = a.map(x => `<tr><td>${x.daire}</td><td>${x.baslik}</td><td>${x.detay}</td></tr>`).join('');
    }
}

async function saveAriza() {
    const b = document.getElementById('ariza-baslik').value;
    const d = document.getElementById('ariza-detay').value;
    await _supabase.from('arizalar').insert([{ daire: currentUser.daire, baslik: b, detay: d }]);
    alert("Bildirildi!"); fetchData();
}

async function saveSakin() {
    const daire = document.getElementById('sakinDaire').value;
    const ad = document.getElementById('sakinAd').value;
    const tel = document.getElementById('sakinTel').value;
    await _supabase.from('sakinler').insert([{ daire, ad, tel, sifre: '123' }]);
    toggleModal('sakinModal'); fetchData();
}

async function saveDuyuru() {
    const b = document.getElementById('duyuruBaslik').value;
    const m = document.getElementById('duyuruMetin').value;
    await _supabase.from('duyurular').insert([{ baslik: b, metin: m }]);
    toggleModal('duyuruModal'); fetchData();
}

async function toggleAidat(id, stat) {
    await _supabase.from('sakinler').update({ aidat_odedi: !stat }).eq('id', id);
    fetchData();
}

async function deleteSakin(id) {
    if(confirm("Silinsin mi?")) { await _supabase.from('sakinler').delete().eq('id', id); fetchData(); }
}

function handleLogout() { sessionStorage.clear(); location.reload(); }
function toggleModal(id) { const m = document.getElementById(id); m.style.display = m.style.display === 'flex' ? 'none' : 'flex'; }
