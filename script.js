// CONFIG
const SB_URL = 'https://cullffnjljejufulfhsa.supabase.co';
const SB_KEY = 'sb_publishable_X8jiwuk5Gro4AemYjIQAuA_TB5-re6I';
const sb = supabase.createClient(SB_URL, SB_KEY);
let currentUser = null;

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    initStars();
    
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        currentUser = session.user;
        updateAuthUI();
    }

    const path = window.location.pathname;
    if (path.includes('forum.html')) loadPosts();
    if (path.includes('gallery.html')) loadGallery();
});

// AUTH
async function login() {
    await sb.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: window.location.href }
    });
}

async function logout() {
    await sb.auth.signOut();
    window.location.reload();
}

function updateAuthUI() {
    const container = document.getElementById('authContainer');
    if (currentUser && container) {
        const meta = currentUser.user_metadata;
        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:5px 15px; border-radius:50px; border:1px solid var(--border);">
                <img src="${meta.avatar_url}" style="width:26px; height:26px; border-radius:50%; border:1px solid var(--accent);">
                <span style="font-size:0.85rem; font-weight:700;">${meta.full_name.split('#')[0]}</span>
                <button onclick="logout()" style="background:none; border:none; color:var(--red); cursor:pointer; opacity:0.8;"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `;
        
        // Показываем кнопки "Создать тему/фото" только авторизованным
        document.querySelectorAll('.auth-only').forEach(btn => {
            btn.style.setProperty('display', 'inline-flex', 'important');
        });
    }
}

// FORUM FIX: Не отправляем avatar_url и author_name в базу, если их там нет
async function submitPost() {
    if (!currentUser) return showToast('Сначала войдите в аккаунт!', true);
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) return showToast('Заполните все поля!', true);

    // FIX: Отправляем только то, что есть в стандартной таблице posts
    const { error } = await sb.from('posts').insert([{
        title: title, 
        content: content,
        author_id: currentUser.id
    }]);

    if (error) {
        showToast('Ошибка сервера: ' + error.message, true);
    } else {
        showToast('Тема опубликована!');
        closeModals();
        loadPosts();
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
    }
}

async function loadPosts() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    
    const { data, error } = await sb.from('posts').select('*').order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Тишина... Станьте первым!</div>';
        return;
    }

    grid.innerHTML = data.map(post => `
        <div class="post-entry">
            <div style="background:#222; width:45px; height:45px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#555; border:1px solid #333;">
                <i class="fas fa-user"></i>
            </div>
            <div class="pa-info">
                <h4>${escapeHtml(post.title)}</h4>
                <p>${escapeHtml(post.content)}</p>
                <span class="pa-meta">ID Автора: ${post.author_id.slice(0, 8)}... • ${new Date(post.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

// GALLERY
async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    const { data, error } = await sb.from('gallery').select('*').order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Галерея пуста.</div>';
        return;
    }

    grid.innerHTML = data.map(img => `
        <div class="gallery-card">
            <img src="${img.url}" onerror="this.src='https://via.placeholder.com/400?text=Error'">
            <div class="gallery-overlay">${escapeHtml(img.title || 'Vesperia SMP')}</div>
        </div>
    `).join('');
}

async function submitPhoto() {
    if (!currentUser) return showToast('Войдите в аккаунт!', true);
    const url = document.getElementById('photoUrl').value.trim();
    const desc = document.getElementById('photoDesc').value.trim();

    if (!url) return showToast('Вставьте ссылку!', true);

    const { error } = await sb.from('gallery').insert([{ 
        url, 
        title: desc,
        author_id: currentUser.id 
    }]);

    if (error) showToast('Ошибка: ' + error.message, true);
    else {
        showToast('Фото добавлено!');
        closeModals();
        loadGallery();
        document.getElementById('photoUrl').value = '';
    }
}

// UI HELPERS
function tryOpenModal(id) {
    if (!currentUser) return showToast('Сначала войдите через Discord!', true);
    const m = document.getElementById(id);
    if(m) m.classList.add('active');
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = isError ? 'toast-box error show' : 'toast-box show';
    setTimeout(() => t.classList.remove('show'), 3500);
}

function copyIp() {
    navigator.clipboard.writeText('play.vesperiasmp.ru');
    showToast('IP скопирован!');
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) closeModals();
}

// WARP STARS EFFECT
function initStars() {
    const canvas = document.getElementById('star-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, stars = [];
    
    const resize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        // Warp effect: stars move from center
        stars = Array(200).fill().map(() => ({
            x: Math.random() * w - w/2,
            y: Math.random() * h - h/2,
            z: Math.random() * 2000 // depth
        }));
    };
    
    window.addEventListener('resize', resize);
    resize();
    
    const draw = () => {
        ctx.fillStyle = '#020203'; // trail effect
        ctx.fillRect(0, 0, w, h);
        
        const cx = w / 2;
        const cy = h / 2;
        
        ctx.fillStyle = 'white';
        
        stars.forEach(s => {
            s.z -= 10; // speed
            if (s.z <= 0) {
                s.z = 2000;
                s.x = Math.random() * w - cx;
                s.y = Math.random() * h - cy;
            }
            
            const k = 128.0 / s.z;
            const px = s.x * k + cx;
            const py = s.y * k + cy;
            
            if (px >= 0 && px <= w && py >= 0 && py <= h) {
                const size = (1 - s.z / 2000) * 2.5;
                ctx.globalAlpha = (1 - s.z / 2000);
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        requestAnimationFrame(draw);
    };
    draw();
}
