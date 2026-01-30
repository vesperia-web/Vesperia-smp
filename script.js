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
    if (path.includes('forum.html')) loadTopics();
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
            <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.08); padding:5px 15px; border-radius:50px; border:1px solid rgba(255,255,255,0.1);">
                <img src="${meta.avatar_url}" style="width:26px; height:26px; border-radius:50%;">
                <span style="font-size:0.85rem; font-weight:700;">${meta.full_name.split('#')[0]}</span>
                <button onclick="logout()" style="background:none; border:none; color:#ef4444; cursor:pointer; opacity:0.8;"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `;
        document.querySelectorAll('.auth-only').forEach(btn => {
            btn.style.setProperty('display', 'inline-flex', 'important');
        });
    }
}

// FORUM: FIX FK CONSTRAINT ERROR
async function submitPost() {
    if (!currentUser) return showToast('Сначала войдите в аккаунт!', true);
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) return showToast('Заполните все поля!', true);

    // FIX: Пытаемся синхронизировать юзера, если его нет в публичной таблице
    // Таблица обычно называется 'users' или 'profiles'. Попробуем 'users'.
    // Если таблицы нет, этот шаг упадет тихо, и мы попробуем создать тему.
    try {
        const { error: userError } = await sb.from('users').upsert({
            id: currentUser.id,
            username: currentUser.user_metadata.full_name,
            avatar_url: currentUser.user_metadata.avatar_url
        });
    } catch (e) {
        console.log('Skipping user sync (table might not exist)');
    }

    const { error } = await sb.from('topics').insert([{
        title: title, 
        description: content, // Предполагаем поле description для текста
        author_id: currentUser.id
    }]);

    if (error) {
        // Улучшенное сообщение об ошибке
        if (error.code === '23503') { // Foreign Key Violation
            showToast('Ошибка: Ваш профиль не найден в базе данных сервера. Сообщите администратору.', true);
        } else {
            showToast('Ошибка базы: ' + error.message, true);
        }
    } else {
        showToast('Тема создана успешно!');
        closeModals();
        loadTopics();
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
    }
}

async function loadTopics() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    
    const { data, error } = await sb.from('topics').select('*').order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#555;">Тем пока нет. Станьте первым!</div>';
        return;
    }

    grid.innerHTML = data.map(topic => `
        <div class="post-entry">
            <div class="post-header">
                <span class="post-title">${escapeHtml(topic.title)}</span>
                <span class="post-meta">${new Date(topic.created_at).toLocaleDateString()}</span>
            </div>
            <div class="post-body">
               ${topic.description ? escapeHtml(topic.description) : 'Нет содержания...'}
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
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#555;">Галерея пуста.</div>';
        return;
    }

    grid.innerHTML = data.map(img => {
        let deleteBtn = '';
        if (currentUser && img.author_id === currentUser.id) {
            deleteBtn = `<button class="gallery-del-btn" onclick="deletePhoto(${img.id})" title="Удалить">&times;</button>`;
        }
        
        return `
        <div class="gallery-card">
            <img src="${img.url}" onerror="this.src='https://via.placeholder.com/400?text=Error'">
            ${deleteBtn}
        </div>
        `;
    }).join('');
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

async function deletePhoto(id) {
    if (!confirm('Удалить фото?')) return;
    const { error } = await sb.from('gallery').delete().eq('id', id);
    if (error) showToast('Ошибка удаления: ' + error.message, true);
    else {
        showToast('Удалено.');
        loadGallery();
    }
}

// HELPERS
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

function initStars() {
    const canvas = document.getElementById('star-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, stars = [];
    
    const resize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        stars = Array(120).fill().map(() => ({
            x: Math.random() * w,
            y: Math.random() * h,
            size: Math.random() * 1.5,
            speed: Math.random() * 0.15 + 0.05,
            alpha: Math.random()
        }));
    };
    
    window.addEventListener('resize', resize);
    resize();
    
    const draw = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'white';
        stars.forEach(s => {
            s.y += s.speed;
            if (s.y > h) s.y = 0;
            s.alpha += (Math.random() - 0.5) * 0.05;
            if (s.alpha < 0.3) s.alpha = 0.3;
            if (s.alpha > 0.8) s.alpha = 0.8;
            
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(draw);
    };
    draw();
}
