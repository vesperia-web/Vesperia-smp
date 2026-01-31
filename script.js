
// CONFIG
const SB_URL = 'https://cullffnjljejufulfhsa.supabase.co';
const SB_KEY = 'sb_publishable_X8jiwuk5Gro4AemYjIQAuA_TB5-re6I';
const sb = supabase.createClient(SB_URL, SB_KEY);

// DEFAULT ASSETS
const DEFAULT_AVATAR = 'https://i.postimg.cc/Pf4nb7xV/logo.png';
// СПИСОК НИКОВ АДМИНОВ (DISCORD username в нижнем регистре)
const ADMIN_NICKS = ['_shark2011', 'r_leynar'];

let currentUser = null;
let isAdmin = false;
let userStatus = 'none'; // active, banned, none
let currentTopicId = null;

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    initStars();
    
    // 1. ЗАГРУЗКА КОНТЕНТА
    const isForum = document.getElementById('postsGrid');
    const isGallery = document.getElementById('galleryGrid');
    const isActiveMembers = document.getElementById('activeMembersGrid');

    if (isForum) loadTopics();
    if (isGallery) loadGallery();
    if (isActiveMembers) loadActiveMembers();

    // 2. АВТОРИЗАЦИЯ
    try {
        const { data, error } = await sb.auth.getSession();
        if (data && data.session) {
            currentUser = data.session.user;
            await syncUserProfile(); 
            updateAuthUI();
            
            // Перезагрузка контента (чтобы появились кнопки админа)
            if (isForum) loadTopics(); 
            if (isGallery) loadGallery();
            if (isActiveMembers) loadActiveMembers();
        }
    } catch (e) { console.error("Auth error:", e); }

    // Обработчик Enter для комментариев
    const commentInput = document.getElementById('commentInput');
    if (commentInput) {
        commentInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitComment(); });
    }

    // Закрытие dropdown при клике вне
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('profileDropdown');
        const trigger = document.querySelector('.auth-trigger');
        if (dropdown && dropdown.classList.contains('show')) {
            if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
                dropdown.classList.remove('show');
                if(trigger) trigger.classList.remove('active');
            }
        }
    });
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
        const discordName = (currentUser.user_metadata.full_name || '').toLowerCase();
        
        // Проверка по хардкоду (Discord ники)
        if (ADMIN_NICKS.some(nick => discordName.includes(nick))) {
            isAdmin = true;
        }

        const { data } = await sb.from('users').upsert({
            id: currentUser.id,
            username: currentUser.user_metadata.full_name,
            avatar_url: currentUser.user_metadata.avatar_url
        }, { onConflict: 'id' }).select('role, status').single();

        if (data) {
            // Проверка по базе данных (если роль выдана там)
            if (data.role === 'admin') isAdmin = true;
            if (data.status) userStatus = data.status;
        }
    } catch (e) { console.error("Sync error:", e); }
}

function updateAuthUI() {
    const container = document.getElementById('authContainer');
    if (currentUser && container) {
        const meta = currentUser.user_metadata;
        const safeName = meta.full_name.split('#')[0];
        const adminDot = isAdmin ? '<span style="color:#ef4444; font-size:1.2rem; line-height:0; margin-left:4px;">•</span>' : '';
        
        container.innerHTML = `
            <div class="auth-trigger" onclick="window.toggleProfile()">
                <img src="${meta.avatar_url || DEFAULT_AVATAR}" class="auth-avatar">
                <span class="auth-name">${safeName}</span>
                ${adminDot}
            </div>
        `;
        
        // Создаем выпадающее меню
        createProfileDropdown(meta, safeName);
        
        // Показываем кнопки "auth-only"
        document.querySelectorAll('.auth-only').forEach(btn => {
            if (btn.innerText.includes('участника')) {
                if (isAdmin) btn.style.setProperty('display', 'inline-flex', 'important');
            } 
            else if (btn.innerText.includes('тему') || btn.innerText.includes('фото')) {
                btn.style.setProperty('display', 'inline-flex', 'important');
            }
        });
    }
}

function createProfileDropdown(meta, name) {
    // Удаляем старое меню если есть
    const old = document.getElementById('profileDropdown');
    if (old) old.remove();

    // Определяем статус
    let statusHTML = '<span class="d-val status-none">Нет</span>';
    if (userStatus === 'active') statusHTML = '<span class="d-val status-active">Активен</span>';
    if (userStatus === 'banned') statusHTML = '<span class="d-val status-banned">Забанен</span>';
    
    // Дата регистрации
    const d = new Date(currentUser.created_at);
    const dateStr = d.toLocaleDateString('ru-RU');
    
    const html = `
    <div id="profileDropdown" class="profile-dropdown">
        <div class="dropdown-header">
            <img src="${meta.avatar_url || DEFAULT_AVATAR}" class="dropdown-avatar">
            <div class="dropdown-user-info">
                <div class="dropdown-name">${name}</div>
                <div class="dropdown-role">${isAdmin ? 'ADMINISTRATOR' : 'PLAYER'}</div>
            </div>
        </div>
        <div class="dropdown-stats">
            <div class="d-stat">
                <div class="d-label">Проходка</div>
                ${statusHTML}
            </div>
            <div style="width:1px; background:rgba(255,255,255,0.1);"></div>
            <div class="d-stat">
                <div class="d-label">Регистрация</div>
                <div class="d-val" style="font-family:monospace; font-size:0.75rem;">${dateStr}</div>
            </div>
        </div>
        <button class="dropdown-btn logout" onclick="window.logout()"><i class="fas fa-sign-out-alt"></i> Выйти</button>
    </div>
    `;
    
    // Вставляем в навигацию или в body (но лучше в nav для позиционирования)
    // Т.к. nav-container имеет position: relative
    document.querySelector('.nav-container').insertAdjacentHTML('beforeend', html);
}

window.toggleProfile = function() {
    const dropdown = document.getElementById('profileDropdown');
    const trigger = document.querySelector('.auth-trigger');
    if (dropdown) {
        dropdown.classList.toggle('show');
        if(trigger) trigger.classList.toggle('active');
    }
}

// === ACTIVE MEMBERS LOGIC ===
let cachedMembers = [];

window.loadActiveMembers = async function() {
    const grid = document.getElementById('activeMembersGrid');
    if (!grid) return;

    const { data, error } = await sb.from('active_members').select('*').order('order_ind', { ascending: true });

    if (error || !data || data.length === 0) {
        if (isAdmin) {
             grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#555;">Список пуст. Добавьте участников.</div>';
        } else {
             grid.innerHTML = '';
        }
        return;
    }

    cachedMembers = data;
    grid.innerHTML = ''; 

    data.forEach((member, index) => {
        const uniqueId = `skin-dyn-${member.id}`;
        
        let adminControls = '';
        if (isAdmin) {
            adminControls = `
            <div class="staff-admin-controls">
                ${index > 0 ? `<button class="staff-control-btn" onclick="moveMember(${index}, -1)"><i class="fas fa-chevron-left"></i></button>` : ''}
                ${index < data.length - 1 ? `<button class="staff-control-btn" onclick="moveMember(${index}, 1)"><i class="fas fa-chevron-right"></i></button>` : ''}
                <button class="staff-control-btn delete" onclick="deleteMember(${member.id})"><i class="fas fa-trash"></i></button>
            </div>
            `;
        }

        const cardHTML = `
            <div class="staff-card">
                ${adminControls}
                <div class="model-wrapper" id="${uniqueId}"></div>
                <div class="staff-info">
                    <div class="staff-name">${escapeHtml(member.username)}</div>
                    <div class="staff-role role-active">Участник</div>
                    <div class="staff-desc">${escapeHtml(member.description || '')}</div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
        
        if (window.initSkinViewer) {
            setTimeout(() => window.initSkinViewer(uniqueId, member.username, true), 100);
        }
    });
}

window.submitActiveMember = async function() {
    if (!isAdmin) return showToast('Доступ запрещен!', true);
    
    const nick = document.getElementById('memberNick').value.trim();
    const desc = document.getElementById('memberDesc').value.trim();
    
    if (!nick) return showToast('Введите ник!', true);

    const { data: maxData } = await sb.from('active_members').select('order_ind').order('order_ind', { ascending: false }).limit(1);
    const nextOrder = (maxData && maxData.length > 0) ? maxData[0].order_ind + 1 : 1;

    const { error } = await sb.from('active_members').insert([{ username: nick, description: desc, order_ind: nextOrder }]);

    if (!error) {
        showToast('Участник добавлен!');
        closeModals();
        loadActiveMembers();
        document.getElementById('memberNick').value = '';
        document.getElementById('memberDesc').value = '';
    } else {
        showToast('Ошибка базы: ' + error.message, true);
    }
}

window.deleteMember = async function(id) {
    if (!isAdmin) return;
    if (!confirm('Удалить участника?')) return;
    await sb.from('active_members').delete().eq('id', id);
    loadActiveMembers();
}

window.moveMember = async function(currentIndex, direction) {
    if (!isAdmin) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= cachedMembers.length) return;

    const currentItem = cachedMembers[currentIndex];
    const targetItem = cachedMembers[targetIndex];

    const order1 = currentItem.order_ind;
    const order2 = targetItem.order_ind;

    await sb.from('active_members').update({ order_ind: order2 }).eq('id', currentItem.id);
    await sb.from('active_members').update({ order_ind: order1 }).eq('id', targetItem.id);

    loadActiveMembers();
}

// === FORUM ===
async function loadTopics() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    
    const { data, error } = await sb.from('topics')
        .select('*, users(username, avatar_url, role)')
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#555;">Тем пока нет.</div>';
        return;
    }

    grid.innerHTML = data.map(topic => {
        const isOwner = currentUser && topic.author_id === currentUser.id;
        
        let actions = '';
        if (isAdmin) {
            actions += `<button class="post-btn delete" onclick="event.stopPropagation(); window.deleteTopic(${topic.id})"><i class="fas fa-trash"></i></button>`;
        }
        if (isAdmin || isOwner) {
            const isClosed = topic.is_closed === true;
            const icon = isClosed ? 'fa-lock-open' : 'fa-lock';
            actions += `<button class="post-btn lock" onclick="event.stopPropagation(); window.toggleTopicStatus(${topic.id}, ${isClosed})"><i class="fas ${icon}"></i></button>`;
        }

        const author = topic.users || {};
        const authorName = author.username || 'Неизвестный';
        const authorAva = author.avatar_url || DEFAULT_AVATAR;
        
        const authorNameLower = authorName.toLowerCase();
        const isHardcodedAdmin = ADMIN_NICKS.some(nick => authorNameLower.includes(nick));
        const adminTag = (author.role === 'admin' || isHardcodedAdmin) ? '<span class="admin-tag">ADMIN</span> ' : '';
        const closedLabel = topic.is_closed ? '<span class="closed-icon"><i class="fas fa-lock"></i></span>' : '';

        return `
        <div class="post-entry ${topic.is_closed ? 'closed' : ''}" onclick="window.openTopic(${topic.id})">
            <div class="post-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${authorAva}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    <div style="display:flex; flex-direction:column; overflow:hidden;">
                        <span class="post-title">${escapeHtml(topic.title)} ${closedLabel}</span>
                        <span class="post-meta">${adminTag}${escapeHtml(authorName)} • ${new Date(topic.created_at).toLocaleDateString()}</span>
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
    if (userStatus === 'banned') return showToast('Вам запрещено создавать темы!', true);
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    if (!title || !content) return showToast('Заполните поля!', true);

    const { error } = await sb.from('topics').insert([{ title, description: content, author_id: currentUser.id }]);
    if (!error) { showToast('Тема создана!'); closeModals(); loadTopics(); }
    else showToast(error.message, true);
}

window.deleteTopic = async function(id) {
    if (!isAdmin) return showToast('Только для админов!', true);
    if (confirm('Удалить тему навсегда?')) { await sb.from('topics').delete().eq('id', id); loadTopics(); }
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
    if (!topic) {
        container.innerHTML = 'Ошибка загрузки.';
        return;
    }

    document.getElementById('topicModalTitle').textContent = topic.title;
    
    const inputArea = document.querySelector('.chat-input-area');
    let closedMsg = document.getElementById('closedMsg');
    
    if (topic.is_closed) {
        inputArea.style.display = 'none';
        if (!closedMsg) {
            closedMsg = document.createElement('div');
            closedMsg.id = 'closedMsg';
            closedMsg.className = 'chat-closed-msg';
            closedMsg.innerHTML = '<i class="fas fa-lock"></i> Тема закрыта для новых ответов.';
            inputArea.parentNode.insertBefore(closedMsg, inputArea);
        }
        closedMsg.style.display = 'block';
    } else {
        inputArea.style.display = 'flex';
        if (closedMsg) closedMsg.style.display = 'none';
    }

    const { data: comments } = await sb.from('comments')
        .select('*, users(username, avatar_url, role, status)')
        .eq('topic_id', topicId)
        .order('created_at');
    
    // Рендер главного поста
    let html = renderMessage(topic.users, topic.description, topic.created_at, true, topic.author_id, null);
    html += '<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">';
    
    if (comments) {
        html += comments.map(c => renderMessage(c.users, c.content, c.created_at, false, topic.author_id, c.id)).join('');
    }
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function renderMessage(user, text, date, isOpPost, opId, commentId) {
    const safeUser = user || { username: 'Игрок', avatar_url: DEFAULT_AVATAR, role: 'user', id: 'unknown', status: 'none' };
    
    const isMe = currentUser && safeUser.id === currentUser.id;
    const isTopicAuthor = (user && user.id === opId) || isOpPost; 
    
    const avatar = safeUser.avatar_url || DEFAULT_AVATAR;
    const name = safeUser.username || 'Игрок';

    const nameLower = name.toLowerCase();
    const isHardcodedAdmin = ADMIN_NICKS.some(nick => nameLower.includes(nick));
    const isAdminUser = safeUser.role === 'admin' || isHardcodedAdmin;
    const isBanned = safeUser.status === 'banned';

    const adminTagHTML = isAdminUser ? '<span class="admin-tag">ADMIN</span> ' : '';
    const bannedTagHTML = isBanned ? '<span class="banned-tag">BANNED</span> ' : '';
    const crownHTML = (isTopicAuthor && !isOpPost) ? '<i class="fas fa-crown" style="color:#fbbf24; margin-left:5px;" title="Автор темы"></i>' : '';
    
    // КНОПКИ АДМИНА
    let adminActions = '';
    
    // ЛОГИКА: Админ может удалять любые сообщения и банить любых игроков (кроме себя)
    // Раньше была проверка && !isAdminUser, теперь мы ее убрали, чтобы можно было банить и других админов
    if (isAdmin) {
        // Удалить
        const delBtn = (commentId) ? `<button class="chat-action-btn btn-chat-del" onclick="window.deleteComment(${commentId})" title="Удалить сообщение"><i class="fas fa-trash"></i></button>` : '';
        
        // Забанить (можно всех, кроме себя)
        let banBtn = '';
        if (!isMe) {
            const banBtnText = isBanned ? '<i class="fas fa-user-check"></i>' : '<i class="fas fa-gavel"></i>';
            const banBtnTitle = isBanned ? 'Разбанить' : 'Забанить';
            banBtn = `<button class="chat-action-btn btn-chat-ban" onclick="window.banUser('${safeUser.id}', ${!isBanned})" title="${banBtnTitle}">${banBtnText}</button>`;
        }
        
        if (delBtn || banBtn) {
            adminActions = `<div class="chat-admin-actions">${banBtn}${delBtn}</div>`;
        }
    }

    const processedText = escapeHtml(text).replace(
        /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi, 
        '<img src="$1" class="chat-image" onclick="window.open(\'$1\', \'_blank\')">'
    );

    return `
    <div class="msg-row ${isMe ? 'mine' : ''}">
        ${!isMe ? `<img src="${avatar}" class="msg-avatar">` : ''}
        <div class="msg-content">
            <div class="msg-header">
                ${adminTagHTML}${bannedTagHTML} ${isMe ? 'Вы' : name} 
                ${crownHTML}
                <span style="opacity:0.5; font-size:0.7em; margin-left:5px">${new Date(date).toLocaleTimeString().slice(0,5)}</span>
                ${adminActions}
            </div>
            <div class="msg-bubble" ${isOpPost ? 'style="border-color:#fbbf24; background:rgba(251,191,36,0.05);"' : ''}>
                ${processedText}
            </div>
        </div>
    </div>`;
}

window.submitComment = async function() {
    if (!currentUser || !currentTopicId) return;
    if (userStatus === 'banned') return showToast('Вам запрещено писать!', true);

    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    const { error } = await sb.from('comments').insert([{ 
        topic_id: currentTopicId, 
        user_id: currentUser.id, 
        content: text 
    }]);

    if (!error) { 
        input.value = ''; 
        window.openTopic(currentTopicId); 
    } else {
        showToast('Ошибка: ' + error.message, true);
    }
}

// === ADMIN MODERATION FUNCTIONS ===
window.deleteComment = async function(commentId) {
    if (!isAdmin) return;
    if (confirm('Удалить этот комментарий?')) {
        const { error } = await sb.from('comments').delete().eq('id', commentId);
        if (!error) {
            showToast('Комментарий удален');
            window.openTopic(currentTopicId); 
        } else {
            showToast('Ошибка: ' + error.message, true);
        }
    }
}

window.banUser = async function(userId, shouldBan) {
    if (!isAdmin) return;
    const action = shouldBan ? 'забанить' : 'разбанить';
    const status = shouldBan ? 'banned' : 'active';
    
    if (confirm(`Вы точно хотите ${action} пользователя?`)) {
        const { error } = await sb.from('users').update({ status: status }).eq('id', userId);
        if (!error) {
            showToast(`Пользователь ${shouldBan ? 'забанен' : 'разбанен'}`);
            window.openTopic(currentTopicId); 
        } else {
            showToast('Ошибка: ' + error.message, true);
        }
    }
}

// === GALLERY ===
async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    const { data } = await sb.from('gallery').select('*').order('created_at', { ascending: false });
    if (!data || !data.length) { grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#555;">Галерея пуста.</div>'; return; }
    
    grid.innerHTML = data.map(img => `
        <div class="gallery-card">
            <img src="${img.url}" onerror="this.src='${DEFAULT_AVATAR}'">
            ${isAdmin ? `<button class="gallery-del-btn" onclick="window.deletePhoto(${img.id})">&times;</button>` : ''}
            <div style="position:absolute; bottom:0; left:0; width:100%; padding:10px; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); color:white; font-size:0.8rem;">${escapeHtml(img.title)}</div>
        </div>
    `).join('');
}

window.submitPhoto = async function() {
    const url = document.getElementById('photoUrl').value.trim();
    const title = document.getElementById('photoDesc').value.trim();
    if (url) await sb.from('gallery').insert([{ url, title, author_id: currentUser.id }]);
    closeModals(); loadGallery();
}

window.deletePhoto = async function(id) { 
    if (!isAdmin) return; // ЗАЩИТА
    if(confirm('Удалить фото?')) { await sb.from('gallery').delete().eq('id', id); loadGallery(); } 
}

// UTILS
window.closeModals = function() { 
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')); 
    const dropdown = document.getElementById('profileDropdown');
    if(dropdown) dropdown.classList.remove('show');
}
window.tryOpenModal = function(id) { 
    if (!currentUser) return showToast('Сначала войдите!', true);
    
    // ДОП. ЗАЩИТА: Если открываем окно добавления участника
    if (id === 'addMemberModal' && !isAdmin) return showToast('Только для админов!', true);

    document.getElementById(id).classList.add('active'); 
}
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
