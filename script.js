// CONFIG
const SB_URL = 'https://cullffnjljejufulfhsa.supabase.co';
const SB_KEY = 'sb_publishable_X8jiwuk5Gro4AemYjIQAuA_TB5-re6I';
const sb = supabase.createClient(SB_URL, SB_KEY);
let currentUser = null;

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    initStars();
    
    // Check Auth
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        currentUser = session.user;
        updateAuthUI();
    }

    // Determine Page
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
            <div style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.06); padding:6px 16px; border-radius:50px; border:1px solid var(--border);">
                <img src="${meta.avatar_url}" style="width:24px; height:24px; border-radius:50%; border:1px solid var(--accent);">
                <span style="font-size:0.85rem; font-weight:700;">${meta.full_name.split('#')[0]}</span>
                <button onclick="logout()" style="background:none; border:none; color:var(--red); cursor:pointer; opacity:0.7; transition:0.2s;"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `;
        
        // Show restricted buttons
        document.querySelectorAll('.auth-only').forEach(btn => {
            btn.style.setProperty('display', 'inline-flex', 'important');
        });
    }
}

// FORUM
async function loadPosts() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    
    const { data, error } = await sb.from('posts').select('*').order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Тишина... Будьте первым!</div>';
        return;
    }

    grid.innerHTML = data.map(post => `
        <div class="post-entry">
            <img src="${post.avatar_url || 'https://via.placeholder.com/50'}" class="pa-avatar">
            <div class="pa-info">
                <h4>${escapeHtml(post.title)}</h4>
                <p>${escapeHtml(post.content)}</p>
                <span class="pa-meta">@${escapeHtml(post.author_name)} • ${new Date(post.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

async function submitPost() {
    if (!currentUser) return showToast('Сначала войдите в аккаунт!', true);
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) return showToast('Заполните заголовок и сообщение!', true);

    const { error } = await sb.from('posts').insert([{
        title, content,
        author_id: currentUser.id,
        author_name: currentUser.user_metadata.full_name,
        avatar_url: currentUser.user_metadata.avatar_url
    }]);

    if (error) {
        if (error.code === '42501') showToast('Вам запрещено публиковать (Muted).', true);
        else showToast('Ошибка сервера: ' + error.message, true);
    } else {
        showToast('Тема опубликована!');
        closeModals();
        loadPosts();
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
    }
}

// GALLERY
async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    const { data, error } = await sb.from('gallery').select('*').order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Скриншотов пока нет. Загрузи свой!</div>';
        return;
    }

    grid.innerHTML = data.map(img => `
        <div class="gallery-card">
            <img src="${img.url}" onerror="this.src='https://via.placeholder.com/400?text=Broken+Link'">
            <div class="gallery-overlay">${escapeHtml(img.title || 'Vesperia SMP')}</div>
        </div>
    `).join('');
}

async function submitPhoto() {
    if (!currentUser) return showToast('Войдите в аккаунт!', true);
    const url = document.getElementById('photoUrl').value.trim();
    const desc = document.getElementById('photoDesc').value.trim();

    if (!url) return showToast('Вставьте прямую ссылку на фото!', true);

    const { error } = await sb.from('gallery').insert([{ 
        url, 
        title: desc,
        author_id: currentUser.id 
    }]);

    if (error) showToast('Ошибка: ' + error.message, true);
    else {
        showToast('Скриншот добавлен!');
        closeModals();
        loadGallery();
        document.getElementById('photoUrl').value = '';
        document.getElementById('photoDesc').value = '';
    }
}

// UTILS
function tryOpenModal(id) {
    if (!currentUser) return showToast('Сначала авторизуйтесь через Discord!', true);
    const modal = document.getElementById(id);
    if(modal) modal.classList.add('active');
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
    showToast('IP скопирован! Ждем на сервере.');
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) closeModals();
}

function initStars() {
    const canvas = document.getElementById('star-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, stars = [];
    
    const resize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        // Create falling stars
        stars = Array(150).fill().map(() => ({ 
            x: Math.random() * w, 
            y: Math.random() * h, 
            z: Math.random() * 1.5 + 0.5, // Depth/Speed factor
            size: Math.random() * 1.5
        }));
    };
    
    window.addEventListener('resize', resize);
    resize();
    
    const draw = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'white';
        
        stars.forEach(s => {
            // Move down based on depth (z)
            s.y += s.z * 0.5; 
            
            // Reset if out of screen
            if (s.y > h) {
                s.y = 0;
                s.x = Math.random() * w;
            }
            
            // Draw star with opacity based on depth
            ctx.globalAlpha = (s.z - 0.5) / 1.5; 
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        requestAnimationFrame(draw);
    };
    draw();
}
