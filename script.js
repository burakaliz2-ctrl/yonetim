// --- SUPABASE KONFİGÜRASYONU ---
const SUPABASE_URL = "https://hrpltsogjmbdbbpljbqw.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jy-Fxmq7gsTJ-XHZSOO5lw_JDuNx0xg"; // Key sonuna == gerekebilir, tam kopyala.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) showApp();
    setupMobileMenu();
});

// --- GİRİŞ / ÇIKIŞ ---
async function handleLogin() {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    btn.innerText = "Giriş yapılıyor...";

    if (user === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Yönetici' };
    } else {
        const { data, error } = await supabase
            .from('sakinler')
            .select('*')
            .eq('daire', user)
            .eq('sifre', pass)
            .single();

        if (data) {
            currentUser = { role: 'resident', name: data.ad, daire: data.daire, id: data.id };
        } else {
            alert("Hatalı Giriş! Lütfen bilgilerinizi kontrol edin.");
            btn.innerText = "Giriş Yap";
            return;
        }
    }
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
}

function handleLogout() {
    sessionStorage.removeItem('currentUser');
    location.reload();
}

// --- ANA UYGULAMA MANTIĞI ---
function showApp() {
    document.body.classList.remove('login-mode');
    document.body.classList.add('app-mode');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('user-display-name').innerText = currentUser.name;
    
    if(currentUser.role === 'admin') document.body.classList.add('is-admin');
    else document.body.classList.add('is-resident');

    renderMenu();
    fetchData();
}

async function fetchData() {
    const { data: sakinler } = await supabase.from('sakinler').select('*').order('daire');
    const { data: arizalar } = await supabase.from('arizalar').select('*').order('id', { ascending: false });
    const { data: duyurular } = await supabase.from('duyurular').select('*').order('id', { ascending: false });

    renderSakinler(sakinler || []);
    renderAidat(sakinler || []);
    renderAriza(arizalar || []);
    renderDuyuru(duyurular || []);
    renderStats(sakinler || []);
}

// --- RENDER FONKSİYONLARI ---
function renderSakinler(list) {
    const body = document.getElementById('sakinTableBody');
    if(!body) return;
    body.innerHTML = list.map(s => `
        <tr><td>${s.daire}</td><td>${s.ad}</td><td>${s.tel || '-'}</td>
        <td><button onclick="deleteSakin(${s.id})" class="badge bg-danger" style="border:none; cursor:pointer">Sil</button></td></tr>
    `).join('');
}

function renderAidat(list) {
    const body = document.getElementById('aidatTableBody');
    let filtered = (currentUser.role === 'admin') ? list : list.filter(s => s.daire === currentUser.daire);
    
    body.innerHTML = filtered.map(s => `
        <tr><td>${s.daire}</td><td>${s.ad}</td><td>₺500</td>
        <td><span class="badge ${s.aidat_odedi ? 'bg-success' : 'bg-danger'}">${s.aidat_odedi ? 'Ödendi' : 'Bekliyor'}</span></td>
        <td class="admin-only">${currentUser.role === 'admin' ? `<button onclick="toggleAidat(${s.id}, ${s.aidat_odedi})" class="btn-primary" style="font-size:11px">Durum Değiştir</button>` : '-'}</td></tr>
    `).join('');
}

function renderStats(list) {
    if(currentUser.role === 'admin') {
        const kasa = list.filter(s => s.aidat_odedi).length * 500;
        document.getElementById('stat-kasa').innerText = `₺${kasa}`;
        document.getElementById('stat-bekleyen').innerText = list.filter(s => !s.aidat_odedi).length;
    } else {
        const s = list.find(x => x.daire === currentUser.daire);
        document.getElementById('res-name').innerText = currentUser.name;
        document.getElementById('my-debt-status').innerHTML = s?.aidat_odedi 
            ? '<div class="alert bg-success">Ödenmemiş borcunuz bulunmamaktadır. Teşekkürler!</div>' 
            : '<div class="alert bg-danger"><strong>₺500</strong> tutarında güncel aidat borcunuz bulunmaktadır.</div>';
    }
}

// --- VERİTABANI İŞLEMLERİ (CRUD) ---
async function saveSakin() {
    const daire = document.getElementById('sakinDaire').value;
    const ad = document.getElementById('sakinAd').value;
    const tel = document.getElementById('sakinTel').value;
    if(!daire || !ad) return alert("Bilgileri doldurun!");

    await supabase.from('sakinler').insert([{ daire, ad, tel, sifre: '123' }]);
    toggleModal('sakinModal');
    fetchData();
}

async function toggleAidat(id, current) {
    await supabase.from('sakinler').update({ aidat_odedi: !current }).eq('id', id);
    fetchData();
}

async function saveAriza() {
    const baslik = document.getElementById('arizaBaslik').value;
    const detay = document.getElementById('arizaDetay').value;
    await supabase.from('arizalar').insert([{ baslik, detay, daire: currentUser.daire || 'Yönetim' }]);
    toggleModal('arizaModal');
    fetchData();
}

async function saveDuyuru() {
    const baslik = document.getElementById('duyuruBaslik').value;
    const metin = document.getElementById('duyuruMetin').value;
    await supabase.from('duyurular').insert([{ baslik, metin }]);
    toggleModal('duyuruModal');
    fetchData();
}

// --- YARDIMCI ARAÇLAR ---
function renderMenu() {
    const menu = document.getElementById('menu-list');
    let items = [
        { t: 'Panel', i: 'fa-home', target: 'dashboard' },
        { t: 'Sakinler', i: 'fa-users', target: 'sakinler', admin: true },
        { t: 'Aidat', i: 'fa-lira-sign', target: 'aidat' },
        { t: 'Arızalar', i: 'fa-wrench', target: 'ariza' },
        { t: 'Duyurular', i: 'fa-bullhorn', target: 'duyuru' }
    ];
    menu.innerHTML = items.filter(x => !x.admin || currentUser.role === 'admin').map(x => `<li><a href="#" class="nav-item" data-target="${x.target}"><i class="fas ${x.i}"></i> ${x.t}</a></li>`).join('');
    setupNavClicks();
    document.querySelector('.nav-item').click();
}

function setupNavClicks() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const target = item.dataset.target;
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            document.getElementById('current-page-title').innerText = item.innerText;
        };
    });
}

function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}

function setupMobileMenu() {
    document.getElementById('menuToggle').onclick = () => document.getElementById('sidebar').classList.toggle('active');

}
