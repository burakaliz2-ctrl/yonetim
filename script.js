// --- 1. SUPABASE YAPILANDIRMASI ---
const SUPABASE_URL = "https://hrpltsogjmbdbbpljbqw.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jy-Fxmq7gsTJ-XHZSOO5lw_JDuNx0xg";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

// Sayfa yüklendiğinde çalışacak ana kontrol
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        showApp();
    }
    setupMobileMenu();
});

// --- 2. GİRİŞ SİSTEMİ ---
async function handleLogin() {
    const userField = document.getElementById('login-username');
    const passField = document.getElementById('login-password');
    const btn = document.getElementById('login-btn');

    const user = userField.value.trim();
    const pass = passField.value.trim();

    if (!user || !pass) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    btn.innerText = "Giriş yapılıyor...";
    btn.disabled = true;

    // A. YÖNETİCİ KONTROLÜ (Veritabanına gitmez)
    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Site Yöneticisi', id: 'admin-0' };
        loginSuccess();
        return;
    }

    // B. SAKİN KONTROLÜ (Supabase üzerinden)
    try {
        const { data, error } = await supabase
            .from('sakinler')
            .select('*')
            .eq('daire', user)
            .eq('sifre', pass)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            currentUser = { 
                role: 'resident', 
                name: data.ad, 
                daire: data.daire, 
                id: data.id 
            };
            loginSuccess();
        } else {
            alert("Hatalı Daire No veya Şifre! (Örn: A-1 / 123)");
            resetLoginBtn(btn);
        }
    } catch (err) {
        console.error("Giriş Hatası:", err.message);
        alert("Veritabanı bağlantısı kurulamadı: " + err.message);
        resetLoginBtn(btn);
    }
}

function loginSuccess() {
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showApp();
}

function resetLoginBtn(btn) {
    btn.innerText = "Giriş Yap";
    btn.disabled = false;
}

function handleLogout() {
    sessionStorage.removeItem('currentUser');
    location.reload();
}

// --- 3. UYGULAMA GÖRÜNÜMÜ ---
function showApp() {
    document.body.classList.remove('login-mode');
    document.body.classList.add('app-mode');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('user-display-name').innerText = currentUser.name;

    // Role göre body sınıfı ekle
    if (currentUser.role === 'admin') {
        document.body.classList.add('is-admin');
        document.body.classList.remove('is-resident');
    } else {
        document.body.classList.add('is-resident');
        document.body.classList.remove('is-admin');
    }

    renderMenu();
    fetchAndRenderAll();
}

function renderMenu() {
    const menu = document.getElementById('menu-list');
    const items = [
        { t: 'Genel Bakış', i: 'fa-chart-pie', target: 'dashboard' },
        { t: 'Sakin Yönetimi', i: 'fa-users', target: 'sakinler', admin: true },
        { t: 'Aidat Takibi', i: 'fa-lira-sign', target: 'aidat' },
        { t: 'Arıza Bildirimi', i: 'fa-tools', target: 'ariza' },
        { t: 'Duyurular', i: 'fa-bullhorn', target: 'duyuru' }
    ];

    menu.innerHTML = items
        .filter(item => !item.admin || currentUser.role === 'admin')
        .map(item => `<li><a href="#" class="nav-item" data-target="${item.target}"><i class="fas ${item.i}"></i> ${item.t}</a></li>`)
        .join('');

    setupNavClicks();
    // İlk menü öğesini aktif et
    const firstItem = document.querySelector('.nav-item');
    if (firstItem) firstItem.click();
}

// --- 4. VERİ ÇEKME VE RENDER ---
async function fetchAndRenderAll() {
    try {
        const [sRes, aRes, dRes] = await Promise.all([
            supabase.from('sakinler').select('*').order('daire'),
            supabase.from('arizalar').select('*').order('id', { ascending: false }),
            supabase.from('duyurular').select('*').order('id', { ascending: false })
        ]);

        const sakinler = sRes.data || [];
        const arizalar = aRes.data || [];
        const duyurular = dRes.data || [];

        renderSakinlerTable(sakinler);
        renderAidatTable(sakinler);
        renderArizalar(arizalar);
        renderDuyurular(duyurular);
        renderStats(sakinler);

    } catch (err) {
        console.error("Veri çekme hatası:", err);
    }
}

function renderSakinlerTable(list) {
    const body = document.getElementById('sakinTableBody');
    if (!body) return;
    body.innerHTML = list.map(s => `
        <tr>
            <td><strong>${s.daire}</strong></td>
            <td>${s.ad}</td>
            <td>${s.tel || '-'}</td>
            <td><button onclick="deleteSakin(${s.id})" class="btn-delete"><i class="fas fa-trash"></i></button></td>
        </tr>
    `).join('');
}

function renderAidatTable(list) {
    const body = document.getElementById('aidatTableBody');
    if (!body) return;
    
    // Sakin ise sadece kendini, admin ise herkesi görür
    const displayList = (currentUser.role === 'admin') 
        ? list 
        : list.filter(s => s.daire === currentUser.daire);

    body.innerHTML = displayList.map(s => `
        <tr>
            <td>${s.daire}</td>
            <td>${s.ad}</td>
            <td>₺500</td>
            <td><span class="badge ${s.aidat_odedi ? 'bg-success' : 'bg-danger'}">${s.aidat_odedi ? 'Ödendi' : 'Bekliyor'}</span></td>
            <td class="admin-only">
                ${currentUser.role === 'admin' ? `<button onclick="toggleAidat(${s.id}, ${s.aidat_odedi})" class="btn-primary">Durum Değiştir</button>` : '-'}
            </td>
        </tr>
    `).join('');
}

function renderStats(list) {
    if (currentUser.role === 'admin') {
        const kasa = list.filter(s => s.aidat_odedi).length * 500;
        const bekleyen = list.filter(s => !s.aidat_odedi).length;
        document.getElementById('stat-kasa').innerText = `₺${kasa}`;
        document.getElementById('stat-bekleyen').innerText = bekleyen;
    } else {
        const self = list.find(s => s.daire === currentUser.daire);
        document.getElementById('res-name').innerText = currentUser.name;
        const statusBox = document.getElementById('my-debt-status');
        if (self?.aidat_odedi) {
            statusBox.innerHTML = `<div class="alert bg-success"><i class="fas fa-check-circle"></i> Ödenmemiş aidat borcunuz bulunmamaktadır.</div>`;
        } else {
            statusBox.innerHTML = `<div class="alert bg-danger"><i class="fas fa-exclamation-triangle"></i> <strong>₺500</strong> tutarında Aralık ayı borcunuz bulunmaktadır.</div>`;
        }
    }
}

function renderArizalar(list) {
    const container = document.getElementById('arizaList');
    container.innerHTML = list.map(a => `
        <div class="card card-ariza">
            <div class="card-header"><strong>${a.baslik}</strong> <small>${a.daire}</small></div>
            <p>${a.detay}</p>
        </div>
    `).join('');
}

function renderDuyurular(list) {
    const container = document.getElementById('duyuruList');
    container.innerHTML = list.map(d => `
        <div class="card">
            <h4>${d.baslik}</h4>
            <p>${d.metin}</p>
        </div>
    `).join('');
}

// --- 5. VERİTABANI İŞLEMLERİ (CRUD) ---
async function saveSakin() {
    const daire = document.getElementById('sakinDaire').value;
    const ad = document.getElementById('sakinAd').value;
    const tel = document.getElementById('sakinTel').value;

    if (!daire || !ad) return alert("Daire ve Ad zorunludur!");

    const { error } = await supabase.from('sakinler').insert([{ daire, ad, tel, sifre: '123' }]);
    if (error) alert("Hata: " + error.message);
    else {
        toggleModal('sakinModal');
        fetchAndRenderAll();
    }
}

async function toggleAidat(id, currentStatus) {
    await supabase.from('sakinler').update({ aidat_odedi: !currentStatus }).eq('id', id);
    fetchAndRenderAll();
}

async function deleteSakin(id) {
    if (confirm("Bu sakini silmek istediğinize emin misiniz?")) {
        await supabase.from('sakinler').delete().eq('id', id);
        fetchAndRenderAll();
    }
}

async function saveAriza() {
    const baslik = document.getElementById('arizaBaslik').value;
    const detay = document.getElementById('arizaDetay').value;
    await supabase.from('arizalar').insert([{ 
        baslik, 
        detay, 
        daire: currentUser.daire || 'Yönetim',
        kim: currentUser.name 
    }]);
    toggleModal('arizaModal');
    fetchAndRenderAll();
}

async function saveDuyuru() {
    const baslik = document.getElementById('duyuruBaslik').value;
    const metin = document.getElementById('duyuruMetin').value;
    await supabase.from('duyurular').insert([{ baslik, metin }]);
    toggleModal('duyuruModal');
    fetchAndRenderAll();
}

// --- 6. UI YARDIMCILARI ---
function setupNavClicks() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            document.getElementById('current-page-title').innerText = item.innerText;
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('active');
            }
        };
    });
}

function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}

function setupMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    if(toggle) {
        toggle.onclick = () => document.getElementById('sidebar').classList.toggle('active');
    }
}
