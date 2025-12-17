// --- 1. SUPABASE BAĞLANTISI ---
const S_URL = "https://axxcarwzuabkkgcnnwqu.supabase.co".trim();
const S_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4eGNhcnd6dWFia2tnY25ud3F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5Njg5MzMsImV4cCI6MjA4MTU0NDkzM30.KtEBkJ2U14GovPEvhlV66zTwV6ujnIuVf_VJTlPtoAw".trim();

// Global değişkenler
var _supabase = window.supabase.createClient(S_URL, S_KEY);
var currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;

window.onload = function() {
    if (currentUser) showApp();
};

// --- 2. GİRİŞ SİSTEMİ ---
async function handleLogin() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const btn = document.getElementById('login-btn');

    if (!user || !pass) return alert("Bilgileri girin!");

    btn.innerText = "Giriş yapılıyor...";
    btn.disabled = true;

    // Admin statik kontrol
    if (user.toLowerCase() === 'admin' && pass === '1234') {
        currentUser = { role: 'admin', name: 'Site Yöneticisi' };
        loginSuccess();
        return;
    }

    // Sakin veritabanı kontrol
    try {
        const { data, error } = await _supabase
            .from('sakinler')
            .select('*')
            .eq('daire', user)
            .eq('sifre', pass)
            .maybeSingle();

        if (data) {
            currentUser = { role: 'resident', name: data.ad, daire: data.daire };
            loginSuccess();
        } else {
            alert("Hatalı giriş!");
            resetBtn(btn);
        }
    } catch (e) {
        alert("Bağlantı hatası!");
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

// --- 3. GÖRÜNÜM YÖNETİMİ ---
function showApp() {
    // DOM Elementlerini Güvenli Şekilde Al
    const loginScr = document.getElementById('login-screen');
    const appWrap = document.getElementById('app-wrapper');
    const nameDsp = document.getElementById('user-display-name');
    const admSts = document.getElementById('admin-stats');

    if (loginScr) loginScr.style.display = 'none';
    if (appWrap) appWrap.style.display = 'flex';
    if (nameDsp) nameDsp.innerText = currentUser.name;
    
    document.body.classList.remove('login-mode');

    // Admin ise istatistikleri göster
    if (currentUser.role === 'admin' && admSts) {
        admSts.style.display = 'flex';
    }

    fetchSakinler();
}

async function fetchSakinler() {
    const { data, error } = await _supabase.from('sakinler').select('*');
    const tbody = document.getElementById('sakinTableBody');
    if (tbody && data) {
        tbody.innerHTML = data.map(s => `
            <tr>
                <td>${s.daire}</td>
                <td>${s.ad}</td>
                <td>${currentUser.role === 'admin' ? '<button>Sil</button>' : '-'}</td>
            </tr>
        `).join('');
    }
}

function handleLogout() {
    sessionStorage.clear();
    location.reload();
}
