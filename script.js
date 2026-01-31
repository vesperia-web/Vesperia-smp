
// CONFIG
const SB_URL = 'https://cullffnjljejufulfhsa.supabase.co';
const SB_KEY = 'sb_publishable_X8jiwuk5Gro4AemYjIQAuA_TB5-re6I';
const sb = supabase.createClient(SB_URL, SB_KEY);

// DEFAULT ASSETS
const DEFAULT_AVATAR = 'https://i.postimg.cc/Pf4nb7xV/logo.png';

// GLOBAL STATE
let currentUser = null;
let userRole = 'user'; // admin, owner, developer, user
let isAdmin = false;   // true если admin/owner/developer
let userStatus = 'none';
let isUserBanned = false;
let currentTopicId = null;

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    initStars();
    initNavigation();
    
    // 1. Проверяем авторизацию
    await checkSession();

    // 2. Загружаем контент текущей страницы
    handleRoute(window.location.pathname);

    // 3. ЗАПУСК АВТО-ОБНОВЛЕНИЯ (7 секунд)
    setInterval(() => {
        // Если открыто модальное окно чата
        if (currentTopicId && document.getElementById('topicModal').classList.contains('active')) {
            openTopic(currentTopicId, true); // true = тихое обновление без скролла
        } 
        // Если мы на странице форума (и не в чате)
        else if (window.location.pathname.includes('forum.html')) {
            loadTopics();
        }
        // Если мы на странице команды (обновляем список участников)
        else if (window.location.pathname.includes('staff.html')) {
            loadActiveMembers(true); // true = тихое обновление
        }
    }, 7000);

    // Обработчик Enter для чата
    document.addEventListener('keypress', (e) => { 
        if (e.target.id === 'commentInput' && e.key === 'Enter') submitComment(); 
    });
});

async function checkSession() {
    try {
        const { data } = await sb.auth.getSession();
        if (data && data.session) {
            currentUser = data.session.user;
            await syncUserProfile();
        }
    } catch (e) { console.error(e); }
    updateAuthUI();
}

async function syncUserProfile() {
    if (!currentUser) return;
    try {
        const { data } = await sb.from('users').upsert({
            id: currentUser.id,
            username: currentUser.user_metadata.full_name,
            avatar_url: currentUser.user_metadata.avatar_url
        }, { onConflict: 'id' }).select('role, status, is_banned').single();

        if (data) {
            userRole = data.role || 'user';
            // Уравниваем права: Owner и Dev имеют права Admin
            if (['admin', 'owner', 'developer'].includes(userRole)) {
                isAdmin = true;
            } else {
                isAdmin = false;
            }
            userStatus = data.status;
            isUserBanned = data.is_banned === true;
        }
    } catch (e) { console.error("Sync error:", e); }
}

// === NAVIGATION (SPA) ===
function initNavigation() {
    const links = document.querySelectorAll('.nav-item');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            navigateTo(href);
        });
    });
    
    // Magic Line Indicator
    const navLinksContainer = document.querySelector('.nav-links');
    const indicator = document.createElement('div');
    indicator.classList.add('nav-indicator');
    if(navLinksContainer) navLinksContainer.appendChild(indicator);

    window.updateNavIndicator = () => {
        const active = document.querySelector('.nav-item.active');
        if (active && indicator) {
            indicator.style.width = `${active.offsetWidth}px`;
            indicator.style.left = `${active.offsetLeft}px`;
        }
    };
    
    // Закрытие меню при клике вне
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

    window.onpopstate = () => handleRoute(window.location.pathname);
}

async function navigateTo(url) {
    if (url === window.location.pathname) return;
    window.history.pushState({}, '', url);
    
    // Обновляем активный класс в меню
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-item[href="${url}"]`);
    if(activeLink) activeLink.classList.add('active');
    if(window.updateNavIndicator) window.updateNavIndicator();

    const container = document.querySelector('.content-container');
    container.classList.add('fade-out');
    
    await new Promise(r => setTimeout(r, 300)); // Анимация

    try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        container.innerHTML = doc.querySelector('.content-container').innerHTML;
        document.title = doc.title;
        document.body.className = doc.body.className;

        handleRoute(url);
    } catch (e) {
        console.error(e);
        window.location.reload(); // Фолбек
    }
    
    container.classList.remove('fade-out');
    window.scrollTo(0,0);
}

function handleRoute(url) {
    if (url.includes('forum.html')) {
        loadTopics();
    } else if (url.includes('gallery.html')) {
        loadGallery();
    } else if (url.includes('staff.html')) {
        loadActiveMembers();
        // Даем время DOM прогрузиться перед рендером 3D
        setTimeout(() => {
            initSkinViewer("skin-container-shark", "X_x_shark_x_X", false);
            initSkinViewer("skin-container-leynar", "Leynar_", false);
        }, 300);
    }
    
    // Всегда обновляем UI авторизации при смене страницы
    updateAuthUI();
    if(window.updateNavIndicator) window.updateNavIndicator();
}

// === FORUM ===
async function loadTopics() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;

    // Запрашиваем топики + данные авторов
    const { data, error } = await sb.from('topics')
        .select('*, users(id, username, avatar_url, role, is_banned)')
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#555;">Тем пока нет.</div>';
        return;
    }

    // Сохраняем текущий HTML, чтобы не мерцать если данные те же (упрощенно - просто перерисовываем)
    // Для идеала можно добавить проверку хеша данных, но для 7 сек пойдет перезапись
    grid.innerHTML = data.map(topic => {
        const isOwner = currentUser && topic.author_id === currentUser.id;
        const author = topic.users || {};
        
        // Права на действия: Админ (любой из 3 ролей) или Автор
        const canManage = isAdmin || isOwner;

        let actions = '';
        if (isAdmin) {
            actions += `<button class="post-btn delete" onclick="event.stopPropagation(); window.deleteTopic(${topic.id})"><i class="fas fa-trash"></i></button>`;
        }
        if (canManage) {
            const isClosed = topic.is_closed === true;
            const icon = isClosed ? 'fa-lock-open' : 'fa-lock';
            actions += `<button class="post-btn lock" onclick="event.stopPropagation(); window.toggleTopicStatus(${topic.id}, ${isClosed})"><i class="fas ${icon}"></i></button>`;
        }

        return `
        <div class="post-entry ${topic.is_closed ? 'closed' : ''}" onclick="window.openTopic(${topic.id})">
            <div class="post-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${author.avatar_url || DEFAULT_AVATAR}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    <div style="display:flex; flex-direction:column; overflow:hidden;">
                        <span class="post-title">
                            ${escapeHtml(topic.title)} 
                            ${topic.is_closed ? '<span class="closed-icon"><i class="fas fa-lock"></i></span>' : ''}
                        </span>
                        <span class="post-meta">
                            ${getRoleBadge(author.role)}
                            ${author.is_banned ? '<span class="banned-tag">BANNED</span> ' : ''}
                            ${escapeHtml(author.username || '...')} • ${new Date(topic.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div class="topic-actions">${actions}</div>
            </div>
            <div class="post-body">${escapeHtml(topic.description).substring(0, 120)}...</div>
        </div>
    `}).join('');
}

// === CHAT ===
window.openTopic = async function(topicId, isUpdate = false) {
    currentTopicId = topicId;
    if (!isUpdate) {
        document.getElementById('topicModal').classList.add('active');
        document.getElementById('chatContainer').innerHTML = '<div class="loading-state">Загрузка...</div>';
    }

    const { data: topic } = await sb.from('topics')
        .select('*, users(id, username, avatar_url, role, status, is_banned)')
        .eq('id', topicId).single();

    if (!topic) return;
    
    if (!isUpdate) document.getElementById('topicModalTitle').textContent = topic.title;

    // Настройка поля ввода (бан / закрыто)
    updateChatInputState(topic);

    const { data: comments } = await sb.from('comments')
        .select('*, users(id, username, avatar_url, role, status, is_banned)')
        .eq('topic_id', topicId)
        .order('created_at');

    let html = renderMessage(topic.users, topic.description, topic.created_at, true, topic.author_id, null);
    html += '<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">';
    if (comments) {
        html += comments.map(c => renderMessage(c.users, c.content, c.created_at, false, topic.author_id, c.id)).join('');
    }

    const container = document.getElementById('chatContainer');
    // Чтобы скролл не дергался при обновлении
    const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    
    container.innerHTML = html;

    if (!isUpdate || wasAtBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

function updateChatInputState(topic) {
    const inputArea = document.querySelector('.chat-input-area');
    let closedMsg = document.getElementById('closedMsg');

    // Удаляем старое сообщение если есть
    if (closedMsg) closedMsg.remove();
    closedMsg = document.createElement('div');
    closedMsg.id = 'closedMsg';
    closedMsg.className = 'chat-closed-msg';
    
    // 1. Если пользователь забанен
    if (isUserBanned) {
        inputArea.style.display = 'none';
        closedMsg.innerHTML = '<i class="fas fa-ban"></i> Вы забанены.';
        inputArea.parentNode.insertBefore(closedMsg, inputArea);
    } 
    // 2. Если тема закрыта
    else if (topic.is_closed) {
        inputArea.style.display = 'none';
        closedMsg.innerHTML = '<i class="fas fa-lock"></i> Тема закрыта.';
        inputArea.parentNode.insertBefore(closedMsg, inputArea);
    } 
    // 3. Все ок
    else {
        inputArea.style.display = 'flex';
    }
}

function renderMessage(user, text, date, isOpPost, opId, commentId) {
    const u = user || { username: 'Неизвестный', avatar_url: DEFAULT_AVATAR, role: 'user', id: 'unknown' };
    const isMe = currentUser && u.id === currentUser.id;
    const isAuthor = (u.id === opId) || isOpPost;
    
    // Админские кнопки видят только Админы, Владельцы, Девы (абсолютно равные права)
    let adminBtns = '';
    if (isAdmin && u.id !== 'unknown') {
        const del = commentId ? `<button class="chat-action-btn btn-chat-del" onclick="window.deleteComment(${commentId})"><i class="fas fa-trash"></i></button>` : '';
        let ban = '';
        if (!isMe) { // Нельзя забанить себя
             if (u.is_banned) {
                 ban = `<button class="chat-action-btn btn-chat-unban" onclick="window.banUser('${u.id}', false)"><i class="fas fa-user-check"></i></button>`;
             } else {
                 ban = `<button class="chat-action-btn btn-chat-ban" onclick="window.banUser('${u.id}', true)"><i class="fas fa-gavel"></i></button>`;
             }
        }
        adminBtns = `<div class="chat-admin-actions">${ban}${del}</div>`;
    }

    // Обработка текста (ссылки на картинки)
    const safeText = escapeHtml(text).replace(
        /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi, 
        '<img src="$1" class="chat-image" onclick="window.open(\'$1\', \'_blank\')">'
    );

    return `
    <div class="msg-row ${isMe ? 'mine' : ''}">
        ${!isMe ? `<img src="${u.avatar_url || DEFAULT_AVATAR}" class="msg-avatar">` : ''}
        <div class="msg-content">
            <div class="msg-header">
                ${getRoleBadge(u.role)}
                ${u.is_banned ? '<span class="banned-tag">BANNED</span>' : ''}
                <span class="msg-author">${escapeHtml(u.username)}</span>
                ${isAuthor && !isOpPost ? '<i class="fas fa-crown" style="color:#fbbf24; margin-left:4px;" title="Автор темы"></i>' : ''}
                <span style="opacity:0.5; margin-left:6px;">${new Date(date).toLocaleTimeString().slice(0,5)}</span>
                ${adminBtns}
            </div>
            <div class="msg-bubble" ${isOpPost ? 'style="border:1px solid rgba(251,191,36,0.3); background:rgba(251,191,36,0.05);"' : ''}>
                ${safeText}
            </div>
        </div>
    </div>`;
}

// === ACTIONS ===
window.submitPost = async function() {
    await syncUserProfile(); // Обновляем инфу перед действием
    if (!currentUser) return showToast('Войдите в аккаунт!', true);
    if (isUserBanned) return showToast('Вы забанены!', true);

    const title = document.getElementById('postTitle').value.trim();
    const desc = document.getElementById('postContent').value.trim();
    if(!title || !desc) return showToast('Заполните все поля!', true);

    const { error } = await sb.from('topics').insert([{ title, description: desc, author_id: currentUser.id }]);
    if(!error) {
        showToast('Тема создана!');
        closeModals();
        loadTopics();
    } else {
        showToast('Ошибка: ' + error.message, true);
    }
}

window.submitComment = async function() {
    await syncUserProfile();
    if (!currentUser) return;
    if (isUserBanned) return showToast('Вы забанены!', true);

    const input = document.getElementById('commentInput');
    const val = input.value.trim();
    if(!val) return;

    const { error } = await sb.from('comments').insert([{ 
        topic_id: currentTopicId, 
        user_id: currentUser.id, 
        content: val 
    }]);

    if (!error) {
        input.value = '';
        openTopic(currentTopicId, true); // Сразу обновляем
    } else {
        showToast('Ошибка: ' + error.message, true);
    }
}

window.banUser = async function(uid, state) {
    if (!isAdmin) return;
    if (confirm(`Вы уверены?`)) {
        await sb.from('users').update({ is_banned: state }).eq('id', uid);
        showToast(state ? 'Пользователь забанен' : 'Пользователь разбанен');
        if(currentTopicId) openTopic(currentTopicId, true);
        loadTopics(); // Если мы в списке тем, чтобы обновились теги
    }
}

window.deleteTopic = async function(id) {
    if(!isAdmin) return;
    if(confirm('Удалить тему навсегда?')) {
        await sb.from('topics').delete().eq('id', id);
        loadTopics();
    }
}

window.deleteComment = async function(id) {
    if(!isAdmin) return;
    if(confirm('Удалить сообщение?')) {
        await sb.from('comments').delete().eq('id', id);
        openTopic(currentTopicId, true);
    }
}

window.toggleTopicStatus = async function(id, isClosed) {
    // Владелец темы тоже может закрывать (проверяется в loadTopics, тут проверяем права)
    // Для простоты, в базе есть RLS, но тут добавим проверку currentUser
    // Но так как id владельца темы здесь не передан, полагаемся на Supabase RLS или isAdmin
    await sb.from('topics').update({ is_closed: !isClosed }).eq('id', id);
    loadTopics();
}

// === STAFF & MEMBERS ===
window.loadActiveMembers = async function(isSilent = false) {
    const grid = document.getElementById('activeMembersGrid');
    if (!grid) return;

    const { data } = await sb.from('active_members').select('*').order('order_ind');
    if(!data || data.length === 0) {
        if(isAdmin && !isSilent) grid.innerHTML = '<div style="grid-column:1/-1; text-align:center;">Пусто.</div>';
        return;
    }
    
    // Если тихое обновление и кол-во не изменилось, можно пропустить (но для скинов лучше перерисовать осторожно)
    // Чтобы скины не мигали каждые 7 сек, проверяем, изменился ли контент
    const currentHTML = grid.innerHTML;
    const newHTML = data.map((m, i) => {
        const uid = `skin-dyn-${m.id}`;
        let controls = '';
        if(isAdmin) {
             controls = `<div class="staff-admin-controls">
                <button class="staff-control-btn delete" onclick="window.deleteMember(${m.id})"><i class="fas fa-trash"></i></button>
             </div>`;
        }
        return `
        <div class="staff-card">
            ${controls}
            <div class="model-wrapper" id="${uid}"></div>
            <div class="staff-info">
                <div class="staff-name">${escapeHtml(m.username)}</div>
                <div class="staff-role role-active">Участник</div>
                <div class="staff-desc">${escapeHtml(m.description)}</div>
            </div>
        </div>`;
    }).join('');

    // Очень простая проверка изменений по длине строки, чтобы не мигать скинами зря
    if (currentHTML.length !== newHTML.length || !isSilent) {
        grid.innerHTML = newHTML;
        // Запускаем рендер скинов для каждого
        setTimeout(() => {
            data.forEach(m => {
                initSkinViewer(`skin-dyn-${m.id}`, m.username, true);
            });
        }, 50);
    }
}

window.submitActiveMember = async function() {
    if(!isAdmin) return;
    const nick = document.getElementById('memberNick').value;
    const desc = document.getElementById('memberDesc').value;
    if(!nick) return;
    
    await sb.from('active_members').insert([{ username: nick, description: desc, order_ind: 99 }]);
    closeModals();
    loadActiveMembers();
}

window.deleteMember = async function(id) {
    if(!isAdmin) return;
    if(confirm('Удалить?')) {
        await sb.from('active_members').delete().eq('id', id);
        loadActiveMembers();
    }
}

// === GALLERY ===
async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    const { data } = await sb.from('gallery').select('*').order('created_at', {ascending: false});
    if(!data) return;
    
    grid.innerHTML = data.map(img => `
        <div class="gallery-card">
            <img src="${img.url}" onerror="this.src='${DEFAULT_AVATAR}'">
            ${isAdmin ? `<button class="gallery-del-btn" onclick="window.deletePhoto(${img.id})">&times;</button>` : ''}
            <div style="position:absolute; bottom:0; left:0; width:100%; padding:10px; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent); color:white; font-size:0.8rem;">${escapeHtml(img.title)}</div>
        </div>
    `).join('');
}

window.submitPhoto = async function() {
    const url = document.getElementById('photoUrl').value;
    const desc = document.getElementById('photoDesc').value;
    if(url) {
        await sb.from('gallery').insert([{ url, title: desc, author_id: currentUser.id }]);
        closeModals();
        loadGallery();
    }
}

window.deletePhoto = async function(id) {
    if(isAdmin && confirm('Удалить фото?')) {
        await sb.from('gallery').delete().eq('id', id);
        loadGallery();
    }
}

// === UTILS ===
function updateAuthUI() {
    const box = document.getElementById('authContainer');
    if (!currentUser || !box) return;
    
    const meta = currentUser.user_metadata;
    const name = meta.full_name.split('#')[0];
    
    // Красивые иконки для UI профиля
    let badge = '';
    if (userRole === 'owner') badge = '<i class="fas fa-crown" style="color:#ef4444; font-size:0.8rem;"></i>';
    else if (userRole === 'developer') badge = '<i class="fas fa-code" style="color:#22d3ee; font-size:0.8rem;"></i>';
    else if (userRole === 'admin') badge = '<i class="fas fa-shield-alt" style="color:#fbbf24; font-size:0.8rem;"></i>';

    box.innerHTML = `
        <div class="auth-trigger" onclick="window.toggleProfile()">
            <img src="${meta.avatar_url || DEFAULT_AVATAR}" class="auth-avatar">
            <span class="auth-name">${name}</span>
            <span style="margin-left:6px; display:flex; align-items:center;">${badge}</span>
        </div>
    `;
    
    createProfileDropdown(meta, name);

    // Показываем кнопки "Только для авторизованных"
    document.querySelectorAll('.auth-only').forEach(el => el.style.setProperty('display', 'inline-flex', 'important'));
}

function createProfileDropdown(meta, name) {
    const old = document.getElementById('profileDropdown');
    if(old) old.remove();

    let rName = 'ИГРОК';
    if(userRole === 'owner') rName = 'ВЛАДЕЛЕЦ';
    if(userRole === 'developer') rName = 'РАЗРАБОТЧИК';
    if(userRole === 'admin') rName = 'АДМИН';

    const statusHtml = isUserBanned 
        ? '<span class="d-val status-banned">BANNED</span>' 
        : (userStatus === 'active' ? '<span class="d-val status-active">Активен</span>' : '<span class="d-val status-none">Нет</span>');

    const html = `
    <div id="profileDropdown" class="profile-dropdown">
        <div class="dropdown-header">
            <img src="${meta.avatar_url || DEFAULT_AVATAR}" class="dropdown-avatar">
            <div class="dropdown-user-info">
                <div class="dropdown-name">${name}</div>
                <div class="dropdown-role">${rName}</div>
            </div>
        </div>
        <div class="dropdown-stats">
            <div class="d-stat"><div class="d-label">Статус</div>${statusHtml}</div>
            <div style="width:1px; background:rgba(255,255,255,0.1)"></div>
            <div class="d-stat"><div class="d-label">Регистрация</div><div class="d-val" style="font-size:0.75rem">${new Date(currentUser.created_at).toLocaleDateString()}</div></div>
        </div>
        <button class="dropdown-btn logout" onclick="window.logout()"><i class="fas fa-sign-out-alt"></i> Выйти</button>
    </div>`;

    document.querySelector('.nav-container').insertAdjacentHTML('beforeend', html);
}

function getRoleBadge(role) {
    if (role === 'owner') return '<span class="role-badge badge-owner"><i class="fas fa-crown"></i> OWNER</span>';
    if (role === 'developer') return '<span class="role-badge badge-dev"><i class="fas fa-code"></i> DEV</span>';
    if (role === 'admin') return '<span class="role-badge badge-admin"><i class="fas fa-shield-alt"></i> ADMIN</span>';
    return '';
}

// Global Helpers
window.login = async () => await sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.href } });
window.logout = async () => { await sb.auth.signOut(); window.location.reload(); };
window.toggleProfile = () => {
    const dd = document.getElementById('profileDropdown');
    if(dd) dd.classList.toggle('show');
    document.querySelector('.auth-trigger').classList.toggle('active');
};
window.closeModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    const dd = document.getElementById('profileDropdown');
    if(dd) dd.classList.remove('show');
};
window.tryOpenModal = (id) => {
    if(!currentUser) return showToast('Нужна авторизация!', true);
    // Для добавления участника - проверка прав
    if(id === 'addMemberModal' && !isAdmin) return showToast('Нет прав!', true);
    
    document.getElementById(id).classList.add('active');
};
window.showToast = (msg, err) => {
    const t = document.getElementById('toast');
    t.innerText = msg; t.className = `toast-box ${err?'error':''} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
};
window.copyIp = () => { navigator.clipboard.writeText('play.vesperiasmp.ru'); showToast('IP скопирован!'); };
function escapeHtml(t) { return t ? t.replace(/&/g, "&amp;").replace(/</g, "&lt;") : ''; }

// 3D Skin Helper
window.initSkinViewer = function(elemId, nick, check) {
    // Небольшая защита от отсутствия библиотеки (если скрипт еще грузится)
    if(typeof skinview3d === 'undefined') {
        setTimeout(() => window.initSkinViewer(elemId, nick, check), 500);
        return;
    }
    const el = document.getElementById(elemId);
    if(!el) return;
    el.innerHTML = ''; // Clear prev
    
    const viewer = new skinview3d.SkinViewer({
        canvas: document.createElement("canvas"),
        width: el.offsetWidth,
        height: el.offsetHeight,
        skin: `https://minotar.net/skin/${nick}`
    });
    el.appendChild(viewer.canvas);
    viewer.camera.position.set(20, 15, 40);
    viewer.zoom = 0.9;
    viewer.animation = new skinview3d.IdleAnimation();
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
};

// Canvas Stars
function initStars() {
    const c = document.getElementById('star-canvas');
    if(!c) return;
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
