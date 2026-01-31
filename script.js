
// CONFIG
const SB_URL = 'https://cullffnjljejufulfhsa.supabase.co';
const SB_KEY = 'sb_publishable_X8jiwuk5Gro4AemYjIQAuA_TB5-re6I';
const sb = supabase.createClient(SB_URL, SB_KEY);

let currentUser = null;
let isAdmin = false;
let userStatus = 'none'; // active, banned, none
let currentTopicId = null;

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    initStars();
    createProfileModal(); 
    
    // 1. ЗАГРУЗКА КОНТЕНТА
    const isForum = document.getElementById('postsGrid');
    const isGallery = document.getElementById('galleryGrid');

    if (isForum) loadTopics();
    if (isGallery) loadGallery();

    // 2. АВТОРИЗАЦИЯ
    try {
        const { data, error } = await sb.auth.getSession();
        if (data && data.session) {
            currentUser = data.session.user;
            await syncUserProfile(); 
            updateAuthUI();
            
            // Перезагрузка для админ-кнопок
            if (isForum) loadTopics(); 
            if (isGallery) loadGallery();
        }
    } catch (e) { console.error("Auth error:", e); }

    const commentInput = document.getElementById('commentInput');
    if (commentInput) {
        commentInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitComment(); });
    }
});

// DELCARE GLOBAL FUNCTIONS
window.login = async function() {
    await sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.href } });
}

window.logout = async function() {
    await sb.auth.signOut();
    window.location.reload();
}

async function syncUserProfile() {
    if (!currentUser) return;
    try {
        const { data } = await sb.from('users').upsert({
            id: currentUser.id,
            username: currentUser.user_metadata.full_name,
            avatar_url: currentUser.user_metadata.avatar_url
        }).select('role, status').single();

        if (data) {
            if (data.role === 'admin') isAdmin = true;
            if (data.status) userStatus = data.status;
        }
    } catch (e) {}
}

function updateAuthUI() {
    const container = document.getElementById('authContainer');
    if (currentUser && container) {
        const meta = currentUser.user_metadata;
        const safeName = meta.full_name.split('#')[0];
        // Кликабельный профиль
        container.innerHTML = `
            <div class="auth-trigger" onclick="window.openProfile()">
                <img src="${meta.avatar_url}" class="auth-avatar">
                <span class="auth-name">${safeName}</span>
                ${isAdmin ? '<span style="color:#ef4444; font-size:1.2rem; line-height:0;">•</span>' : ''}
            </div>
        `;
        document.querySelectorAll('.auth-only').forEach(btn => {
            if (isAdmin || btn.innerText.includes('тему')) btn.style.setProperty('display', 'inline-flex', 'important');
        });
    }
}

// === PROFILE SYSTEM ===
function createProfileModal() {
    if (document.getElementById('profileModal')) return;
    const modalHTML = `
    <div id="profileModal" class="modal-overlay">
        <div class="modal-card">
            <div class="profile-header">
                <img src="" id="profAvatar" class="profile-avatar-xl">
                <div id="profName" class="profile-name">Username</div>
                <div id="profRole" class="profile-role">Player</div>
                <button class="close-btn" onclick="window.closeModals()" style="position:absolute; top:20px; right:20px; color:white;">&times;</button>
            </div>
            <div class="profile-stats">
                <div class="stat-box">
                    <div class="stat-label">Статус Проходки</div>
                    <div class="stat-value" id="profStatus">Загрузка...</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">ID Аккаунта</div>
                    <div class="stat-value" style="font-size:0.7rem; font-family:monospace;" id="profId">...</div>
                </div>
            </div>
            <div class="profile-actions">
                <button class="btn btn-logout" onclick="window.logout()"><i class="fas fa-sign-out-alt"></i> Выйти из аккаунта</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.openProfile = function() {
    if (!currentUser) return;
    
    // Если по какой-то причине модалки нет, создаем заново
    if (!document.getElementById('profileModal')) createProfileModal();
    
    const modal = document.getElementById('profileModal');
    const avatar = document.getElementById('profAvatar');
    const name = document.getElementById('profName');
    const role = document.getElementById('profRole');
    const id = document.getElementById('profId');
    const statusEl = document.getElementById('profStatus');

    if (avatar) avatar.src = currentUser.user_metadata.avatar_url;
    if (name) name.textContent = currentUser.user_metadata.full_name;
    if (role) role.textContent = isAdmin ? 'Administrator' : 'Player';
    if (id) id.textContent = currentUser.id.slice(0, 13) + '...';
    
    if (statusEl) {
        if (userStatus === 'active') {
            statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Активен';
            statusEl.className = 'stat-value status-active';
        } else if (userStatus === 'banned') {
            statusEl.innerHTML = '<i class="fas fa-ban"></i> Забанен';
            statusEl.className = 'stat-value status-banned';
        } else {
            statusEl.innerHTML = '<i class="fas fa-times-circle"></i> Нет';
            statusEl.className = 'stat-value status-none';
        }
    }
    
    modal.classList.add('active');
}

// === FORUM ===
async function loadTopics() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    
    const { data, error } = await sb.from('topics')
        .select('*, users(username, avatar_url, role)')
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#555;">Тем пока нет или ошибка загрузки.</div>';
        return;
    }

    grid.innerHTML = data.map(topic => {
        const isOwner = currentUser && topic.author_id === currentUser.id;
        let actions = '';
        if (isAdmin) actions += `<button class="post-btn delete" onclick="event.stopPropagation(); window.deleteTopic(${topic.id})"><i class="fas fa-trash"></i></button>`;
        if (isAdmin || isOwner) {
            const isClosed = topic.is_closed === true;
            actions += `<button class="post-btn lock" onclick="event.stopPropagation(); window.toggleTopicStatus(${topic.id}, ${isClosed})"><i class="fas ${isClosed ? 'fa-lock-open' : 'fa-lock'}"></i></button>`;
        }

        const author = topic.users || { username: 'Неизвестный', avatar_url: '', role: 'user' };
        const adminTag = author.role === 'admin' ? '<span class="admin-tag">ADMIN</span>' : '';
        const closedLabel = topic.is_closed ? '<span class="closed-icon"><i class="fas fa-lock"></i></span>' : '';

        return `
        <div class="post-entry ${topic.is_closed ? 'closed' : ''}" onclick="window.openTopic(${topic.id})">
            <div class="post-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${author.avatar_url || 'https://i.postimg.cc/Pf4nb7xV/logo.png'}" style="width:32px; height:32px; border-radius:50%;">
                    <div style="display:flex; flex-direction:column; overflow:hidden;">
                        <span class="post-title">${escapeHtml(topic.title)} ${closedLabel}</span>
                        <span class="post-meta">${author.username}${adminTag} • ${new Date(topic.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="topic-actions">${actions}</div>
            </div>
            <div class="post-body">${escapeHtml(topic.description).substring(0, 120)}...</div>
        </div>
    `}).join('');
}

window.submitPost = async function() {
    if (!currentUser) return showToast('Нужен вход!', true);
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    if (!title || !content) return showToast('Заполните поля!', true);

    const { error } = await sb.from('topics').insert([{ title, description: content, author_id: currentUser.id }]);
    if (!error) { showToast('Тема создана!'); closeModals(); loadTopics(); }
}

window.deleteTopic = async function(id) {
    if (confirm('Удалить?')) { await sb.from('topics').delete().eq('id', id); loadTopics(); }
}
window.toggleTopicStatus = async function(id, s) {
    await sb.from('topics').update({ is_closed: !s }).eq('id', id); loadTopics();
}

// === CHAT ===
window.openTopic = async function(topicId) {
    currentTopicId = topicId;
    document.getElementById('topicModal').classList.add('active');
    const container = document.getElementById('chatContainer');
    container.innerHTML = '<div class="loading-state">Загрузка...</div>';
    
    const { data: topic } = await sb.from('topics').select('*, users(*)').eq('id', topicId).single();
    if (!topic) return;

    document.getElementById('topicModalTitle').textContent = topic.title;
    
    // Закрыто?
    const inputArea = document.querySelector('.chat-input-area');
    const closedMsg = document.getElementById('closedMsg') || document.createElement('div');
    closedMsg.id = 'closedMsg'; closedMsg.className = 'chat-closed-msg'; closedMsg.innerHTML = '<i class="fas fa-lock"></i> Тема закрыта';
    if(topic.is_closed) { 
        inputArea.style.display = 'none'; 
        if(!closedMsg.parentNode) inputArea.parentNode.appendChild(closedMsg);
        closedMsg.style.display = 'block';
    } else { 
        inputArea.style.display = 'flex'; 
        closedMsg.style.display = 'none';
    }

    const { data: comments } = await sb.from('comments').select('*, users(*)').eq('topic_id', topicId).order('created_at');
    
    let html = renderMessage(topic.users, topic.description, topic.created_at, true); // OP
    html += '<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">';
    if (comments) html += comments.map(c => renderMessage(c.users, c.content, c.created_at, false, topic.author_id)).join('');
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function renderMessage(user, text, date, isOp, opId) {
    user = user || { username: 'User', avatar_url: '', role: 'user' };
    const isMe = currentUser && user.id === currentUser.id;
    const isTopicAuthor = user.id === opId || isOp;
    
    return `
    <div class="msg-row ${isMe ? 'mine' : ''}">
        ${!isMe ? `<img src="${user.avatar_url}" class="msg-avatar">` : ''}
        <div class="msg-content">
            <div class="msg-header">
                ${isMe ? 'Вы' : user.username} 
                ${user.role === 'admin' ? '<span class="admin-tag">ADMIN</span>' : ''}
                ${isTopicAuthor && !isOp ? '<i class="fas fa-crown" style="color:gold"></i>' : ''}
                <span style="opacity:0.5; font-size:0.7em; margin-left:5px">${new Date(date).toLocaleTimeString().slice(0,5)}</span>
            </div>
            <div class="msg-bubble" ${isOp ? 'style="border-color:#fbbf24; background:rgba(251,191,36,0.05);"' : ''}>
                ${escapeHtml(text).replace(/(https?:\/\/\S+\.(?:png|jpg|webp))/gi, '<img src="$1" class="chat-image">')}
            </div>
        </div>
    </div>`;
}

window.submitComment = async function() {
    if (!currentUser || !currentTopicId) return;
    const input = document.getElementById('commentInput');
    const { error } = await sb.from('comments').insert([{ topic_id: currentTopicId, user_id: currentUser.id, content: input.value }]);
    if (!error) { input.value = ''; window.openTopic(currentTopicId); }
}

// === GALLERY ===
async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    const { data } = await sb.from('gallery').select('*').order('created_at', { ascending: false });
    if (!data || !data.length) { grid.innerHTML = 'Пусто.'; return; }
    
    grid.innerHTML = data.map(img => `
        <div class="gallery-card">
            <img src="${img.url}">
            ${isAdmin ? `<button class="gallery-del-btn" onclick="window.deletePhoto(${img.id})">&times;</button>` : ''}
            <div style="position:absolute; bottom:0; left:0; width:100%; padding:10px; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); color:white; font-size:0.8rem;">${escapeHtml(img.title)}</div>
        </div>
    `).join('');
}
window.submitPhoto = async function() {
    const url = document.getElementById('photoUrl').value;
    const title = document.getElementById('photoDesc').value;
    if (url) await sb.from('gallery').insert([{ url, title, author_id: currentUser.id }]);
    closeModals(); loadGallery();
}
window.deletePhoto = async function(id) { if(confirm('Удалить?')) { await sb.from('gallery').delete().eq('id', id); loadGallery(); } }

// UTILS
window.closeModals = function() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); }
window.tryOpenModal = function(id) { document.getElementById(id).classList.add('active'); }
window.showToast = function(msg, isError) { 
    const t = document.getElementById('toast'); 
    t.innerText = msg; t.className = 'toast-box ' + (isError ? 'error show' : 'show'); 
    setTimeout(() => t.classList.remove('show'), 3000); 
}
window.copyIp = function() { navigator.clipboard.writeText('play.vesperiasmp.ru'); showToast('IP скопирован!'); }
function escapeHtml(t) { return t ? t.replace(/&/g, "&amp;").replace(/</g, "&lt;") : ''; }
window.onclick = (e) => { if (e.target.classList.contains('modal-overlay')) closeModals(); }

function initStars() {
    const c = document.getElementById('star-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    let w = c.width = window.innerWidth, h = c.height = window.innerHeight;
    const stars = Array(80).fill().map(() => ({x:Math.random()*w, y:Math.random()*h, s:Math.random()*1.5}));
    function draw() {
        ctx.clearRect(0,0,w,h); ctx.fillStyle='white';
        stars.forEach(st => { 
            st.y += 0.05; if(st.y>h) st.y=0; 
            ctx.globalAlpha=Math.random()*0.5+0.2; 
            ctx.beginPath(); ctx.arc(st.x,st.y,st.s,0,6.28); ctx.fill(); 
        });
        requestAnimationFrame(draw);
    }
    draw();
}
