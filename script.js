
// CONFIG
const SB_URL = 'https://cullffnjljejufulfhsa.supabase.co';
const SB_KEY = 'sb_publishable_X8jiwuk5Gro4AemYjIQAuA_TB5-re6I';
const sb = supabase.createClient(SB_URL, SB_KEY);

let currentUser = null;
let isAdmin = false;
let currentTopicId = null; // Для отслеживания открытой темы

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    initStars();
    
    // Проверка сессии
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        currentUser = session.user;
        await syncUserProfile(); 
        updateAuthUI();
    }

    // Роутинг
    const path = window.location.pathname;
    if (path.includes('forum.html')) loadTopics();
    if (path.includes('gallery.html')) loadGallery();
    
    // Enter to send comment
    const commentInput = document.getElementById('commentInput');
    if (commentInput) {
        commentInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') submitComment();
        });
    }
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

// SYNC USER & CHECK ADMIN
async function syncUserProfile() {
    if (!currentUser) return;
    try {
        const { data, error } = await sb.from('users').upsert({
            id: currentUser.id,
            username: currentUser.user_metadata.full_name,
            avatar_url: currentUser.user_metadata.avatar_url
        }).select('role').single();

        if (error) {
            console.error('Ошибка БД (Sync):', error);
            if (error.code === '42P01') {
                showToast('ОШИБКА: Таблицы не созданы (выполни SQL)', true);
            }
            return;
        }

        if (data && data.role === 'admin') {
            isAdmin = true;
        }
    } catch (e) {
        console.error('Critical Sync Error:', e);
    }
}

function updateAuthUI() {
    const container = document.getElementById('authContainer');
    if (currentUser && container) {
        const meta = currentUser.user_metadata;
        const adminBadge = isAdmin ? '<span style="background:#ef4444; color:white; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-right:5px;">ADMIN</span>' : '';

        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.08); padding:5px 15px; border-radius:50px; border:1px solid rgba(255,255,255,0.1);">
                ${adminBadge}
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

// FORUM - TOPICS LIST
async function loadTopics() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    
    const { data, error } = await sb.from('topics').select('*, users(username, avatar_url)').order('created_at', { ascending: false });

    if (error) {
        console.error('Load Topics Error:', error);
        if (error.code === '42P01') {
             grid.innerHTML = '<div style="color:red; text-align:center;">ОШИБКА: Таблицы не созданы. Выполните SQL код в Supabase.</div>';
        }
        return;
    }

    if (!data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#555;">Тем пока нет.</div>';
        return;
    }

    grid.innerHTML = data.map(topic => {
        const isOwner = currentUser && topic.author_id === currentUser.id;
        let deleteBtn = '';
        if (isAdmin || isOwner) {
            // Кнопка удаления не вызывает onclick родителя (event.stopPropagation)
            deleteBtn = `<button class="post-del-btn" onclick="event.stopPropagation(); deleteTopic(${topic.id})" title="Удалить тему"><i class="fas fa-trash"></i></button>`;
        }

        const authorName = topic.users ? topic.users.username : 'Игрок';
        const authorAva = topic.users ? topic.users.avatar_url : 'https://i.postimg.cc/Pf4nb7xV/logo.png';
        
        // Truncate logic
        let shortDesc = topic.description || '';
        if (shortDesc.length > 100) {
            shortDesc = shortDesc.substring(0, 100) + '...';
        }

        return `
        <div class="post-entry" onclick="openTopic(${topic.id})">
            <div class="post-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${authorAva}" style="width:30px; height:30px; border-radius:50%;">
                    <div style="display:flex; flex-direction:column; overflow:hidden;">
                        <span class="post-title">${escapeHtml(topic.title)}</span>
                        <span class="post-meta" style="font-size:0.75rem;">${authorName} • ${new Date(topic.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                ${deleteBtn}
            </div>
            <div class="post-body">
               ${escapeHtml(shortDesc)}
            </div>
        </div>
    `}).join('');
}

async function submitPost() {
    if (!currentUser) return showToast('Сначала войдите в аккаунт!', true);
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) return showToast('Заполните все поля!', true);
    if (title.length > 60) return showToast('Заголовок слишком длинный (макс 60)', true);

    const { error } = await sb.from('topics').insert([{
        title: title, 
        description: content,
        author_id: currentUser.id
    }]);

    if (error) {
        console.error('Post Error:', error);
        showToast('Ошибка: ' + error.message, true);
    } else {
        showToast('Тема создана!');
        closeModals();
        loadTopics();
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
    }
}

async function deleteTopic(id) {
    if (!confirm('Удалить эту тему?')) return;
    const { error } = await sb.from('topics').delete().eq('id', id);
    if (error) showToast('Ошибка: ' + error.message, true);
    else {
        showToast('Тема удалена.');
        loadTopics();
    }
}

// FORUM - TOPIC DETAILS & CHAT
async function openTopic(topicId) {
    currentTopicId = topicId;
    const modal = document.getElementById('topicModal');
    const container = document.getElementById('chatContainer');
    const titleEl = document.getElementById('topicModalTitle');
    
    modal.classList.add('active');
    container.innerHTML = '<div class="loading-state">Загрузка чата...</div>';
    
    // 1. Get Topic Details
    const { data: topic, error } = await sb.from('topics').select('*, users(*)').eq('id', topicId).single();
    
    if (error) {
        container.innerHTML = '<div style="color:red">Ошибка загрузки темы</div>';
        return;
    }

    titleEl.textContent = topic.title;

    // 2. Render OP (Original Post) as first message
    const opAva = topic.users ? topic.users.avatar_url : 'https://i.postimg.cc/Pf4nb7xV/logo.png';
    const opName = topic.users ? topic.users.username : 'Автор';
    const opIsMe = currentUser && topic.author_id === currentUser.id;
    
    // Reply logic for OP (replying to author)
    const replyOpBtn = !opIsMe ? `<button class="reply-btn" onclick="replyTo('${opName}')" title="Ответить"><i class="fas fa-reply"></i></button>` : '';

    let html = `
        <div class="msg-row ${opIsMe ? 'mine' : ''}">
            <img src="${opAva}" class="msg-avatar">
            <div class="msg-content">
                <div class="msg-header">
                    <span class="msg-author">${opName} <i class="fas fa-crown" style="color:#fbbf24; margin-left:4px;" title="Автор темы"></i></span>
                    <span>${new Date(topic.created_at).toLocaleTimeString().slice(0,5)}</span>
                    ${replyOpBtn}
                </div>
                <div class="msg-bubble" style="border-color: #fbbf24; background: rgba(251, 191, 36, 0.05);">
                    ${escapeHtml(topic.description)}
                </div>
            </div>
        </div>
        <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 10px 0;">
    `;

    // 3. Get Comments
    const { data: comments, error: commError } = await sb.from('comments')
        .select('*, users(*)')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });
        
    if (commError) {
        if (commError.code === '42P01') {
             html += '<div style="color:#666; font-size:0.8rem; text-align:center;">Чат недоступен (нет таблицы comments).</div>';
        }
    } else if (comments) {
        html += comments.map(c => {
            const isMe = currentUser && c.user_id === currentUser.id;
            const isAuthor = c.user_id === topic.author_id;
            const userAva = c.users ? c.users.avatar_url : '';
            const userName = c.users ? c.users.username : 'Unknown';
            
            const badge = isAuthor ? '<i class="fas fa-crown author-badge" title="Автор темы"></i>' : '';
            // Don't show reply button on own messages
            const replyBtn = !isMe ? `<button class="reply-btn" onclick="replyTo('${userName}')" title="Ответить"><i class="fas fa-reply"></i></button>` : '';

            return `
            <div class="msg-row ${isMe ? 'mine' : ''}">
                ${!isMe ? `<img src="${userAva}" class="msg-avatar">` : ''}
                <div class="msg-content">
                    <div class="msg-header">
                        ${isMe ? `<span>${new Date(c.created_at).toLocaleTimeString().slice(0,5)}</span> <span class="msg-author">Вы</span>` 
                               : `<span class="msg-author">${userName}${badge}</span> <span>${new Date(c.created_at).toLocaleTimeString().slice(0,5)}</span> ${replyBtn}`}
                    </div>
                    <div class="msg-bubble">
                        ${escapeHtml(c.content)}
                    </div>
                </div>
                ${isMe ? `<img src="${userAva}" class="msg-avatar">` : ''}
            </div>
            `;
        }).join('');
    }

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight; // Scroll to bottom
}

function replyTo(username) {
    const input = document.getElementById('commentInput');
    if (!input) return;
    input.value = `@${username}, ` + input.value;
    input.focus();
}

async function submitComment() {
    if (!currentUser) return showToast('Войдите, чтобы писать!', true);
    if (!currentTopicId) return;

    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    // Optimistic UI update (optional, but let's wait for DB for simplicity)
    const { error } = await sb.from('comments').insert([{
        topic_id: currentTopicId,
        user_id: currentUser.id,
        content: text
    }]);

    if (error) {
        if (error.code === '42P01') showToast('Ошибка: Нет таблицы comments (SQL)', true);
        else showToast('Ошибка: ' + error.message, true);
    } else {
        input.value = '';
        openTopic(currentTopicId); // Reload chat
    }
}


// GALLERY
async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    const { data, error } = await sb.from('gallery').select('*').order('created_at', { ascending: false });

    if (error) {
         if (error.code === '42P01') {
             grid.innerHTML = '<div style="color:red; text-align:center; grid-column:1/-1;">ОШИБКА: Таблицы не созданы.</div>';
        }
        return;
    }

    if (!data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#555; grid-column:1/-1;">Галерея пуста.</div>';
        return;
    }

    grid.innerHTML = data.map(img => {
        const isOwner = currentUser && img.author_id === currentUser.id;
        let deleteBtn = '';
        
        if (isAdmin || isOwner) {
            deleteBtn = `<button class="gallery-del-btn" onclick="deletePhoto(${img.id})" title="Удалить">&times;</button>`;
        }
        
        return `
        <div class="gallery-card">
            <img src="${img.url}" onerror="this.src='https://via.placeholder.com/400?text=Неверная+Ссылка'">
            ${deleteBtn}
            <div style="position:absolute; bottom:0; left:0; width:100%; padding:10px; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); color:white; font-size:0.85rem;">
                ${escapeHtml(img.title)}
            </div>
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
        document.getElementById('photoDesc').value = '';
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
    currentTopicId = null; // Reset chat focus
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
