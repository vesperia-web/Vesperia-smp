
// CONFIG
const SB_URL = 'https://cullffnjljejufulfhsa.supabase.co';
const SB_KEY = 'sb_publishable_X8jiwuk5Gro4AemYjIQAuA_TB5-re6I';
const sb = supabase.createClient(SB_URL, SB_KEY);

// DEFAULT ASSETS
const DEFAULT_AVATAR = 'https://i.postimg.cc/Pf4nb7xV/logo.png';

let currentUser = null;
let isAdmin = false; // Сохраняется для совместимости, но проверки теперь по currentUser.role
let userRole = 'user'; // owner, developer, admin, user
let userStatus = 'none'; // active (есть проходка), none (нет проходки)
let isUserBanned = false; // true (забанен), false (нет)
let currentTopicId = null;

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    initStars();
    initNavigation(); 
    initRealtime();
    
    // Инициализация при первой загрузке
    handleRoute(window.location.pathname);

    // 2. АВТОРИЗАЦИЯ
    try {
        const { data, error } = await sb.auth.getSession();
        if (data && data.session) {
            currentUser = data.session.user;
            await syncUserProfile(); 
            updateAuthUI();
            
            // Повторная инициализация контента, если права поменялись
            handleRoute(window.location.pathname);
        }
    } catch (e) { console.error("Auth error:", e); }

    // Делегирование события Enter
    document.addEventListener('keypress', (e) => { 
        if (e.target.id === 'commentInput' && e.key === 'Enter') submitComment(); 
    });

    // Закрытие dropdown
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

// === REALTIME (AUTO-REFRESH) ===
function initRealtime() {
    sb.channel('public:any')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'topics' }, payload => {
        // Если мы на странице форума, обновляем список тем
        if (window.location.pathname.includes('forum.html')) {
            loadTopics();
        }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, payload => {
        // Если открыт топик и комментарий относится к нему, обновляем чат
        // Либо просто перегружаем чат если ID совпадает
        if (currentTopicId && (payload.new.topic_id === currentTopicId || payload.old.topic_id === currentTopicId)) {
            // Мягкое обновление, чтобы не сбивать скролл (в идеале), но пока просто релоад
            openTopic(currentTopicId, true);
        }
    })
    .subscribe();
}

// === SPA NAVIGATION ===
function initNavigation() {
    const navLinksContainer = document.querySelector('.nav-links');
    if (!navLinksContainer) return;

    // Magic Line
    const indicator = document.createElement('div');
    indicator.classList.add('nav-indicator');
    navLinksContainer.appendChild(indicator);

    function moveIndicator(targetLink) {
        if (!targetLink) return;
        indicator.style.width = `${targetLink.offsetWidth}px`;
        indicator.style.left = `${targetLink.offsetLeft}px`;
    }

    const activeLink = document.querySelector('.nav-item.active');
    if (activeLink) moveIndicator(activeLink);

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        // Если внутренняя ссылка
        if (link.origin === window.location.origin && (link.classList.contains('nav-item') || link.getAttribute('href').endsWith('.html'))) {
            const href = link.getAttribute('href');
            // Игнорируем внешние ссылки типа discord
            if(href.startsWith('http')) return;

            e.preventDefault();

            // Обновляем меню
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            // Ищем пункт меню, соответствующий href
            const navItem = document.querySelector(`.nav-item[href="${href}"]`);
            if (navItem) {
                navItem.classList.add('active');
                moveIndicator(navItem);
            }
            
            navigateTo(href);

            // Моб. меню
            if(navLinksContainer.classList.contains('active')) navLinksContainer.classList.remove('active');
        }
    });
}

async function navigateTo(url) {
    if (url === window.location.pathname) return;

    const container = document.querySelector('.content-container');
    container.classList.add('fade-out');

    try {
        const response = await fetch(url);
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Имитация задержки для плавности
        await new Promise(r => setTimeout(r, 400));

        // Замена контента
        const newContent = doc.querySelector('.content-container').innerHTML;
        container.innerHTML = newContent;
        document.title = doc.title;
        document.body.className = doc.body.className; // Для смены фона/стилей страниц

        window.history.pushState({}, '', url);
        handleRoute(url);

        container.classList.remove('fade-out');
        window.scrollTo(0,0);

    } catch (err) {
        console.error("Nav Error:", err);
        window.location.href = url;
    }
}

function handleRoute(url) {
    if (url.includes('forum.html')) loadTopics();
    else if (url.includes('gallery.html')) loadGallery();
    else if (url.includes('staff.html')) {
        loadActiveMembers();
        // Запуск скинов для админов
        setTimeout(() => {
            initSkinViewer("skin-container-shark", "X_x_shark_x_X", false);
            initSkinViewer("skin-container-leynar", "Leynar_", false);
        }, 300);
    }
    updateAuthUI();
}

// 3D SKINS LOGIC (Moved from HTML to JS)
window.initSkinViewer = function(containerId, username, checkSkin) {
    if (typeof skinview3d === 'undefined') return;

    const container = document.getElementById(containerId);
    if(!container) return;
    
    container.innerHTML = ''; // очистка
    
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const DEFAULT_SKIN = 'https://minotar.net/skin/DripBlue_';
    const TARGET_SKIN = `https://minotar.net/skin/${username}`;
    
    const startSkin = checkSkin ? DEFAULT_SKIN : TARGET_SKIN;

    const skinViewer = new skinview3d.SkinViewer({
        canvas: document.createElement("canvas"),
        width: width,
        height: height,
        skin: startSkin
    });

    container.appendChild(skinViewer.canvas);

    skinViewer.camera.position.x = 20;
    skinViewer.camera.position.y = 15;
    skinViewer.camera.position.z = 40;
    skinViewer.zoom = 0.9;
    skinViewer.animation = new skinview3d.IdleAnimation();
    skinViewer.controls.enableRotate = true;
    skinViewer.controls.enableZoom = true;

    if (checkSkin) {
        // Проверка на лицензию (примерная)
        fetch(`https://api.ashcon.app/mojang/v2/user/${username}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && data.textures && data.textures.custom) skinViewer.loadSkin(TARGET_SKIN);
            }).catch(()=>{});
    }
}

window.onpopstate = () => { window.location.reload(); };

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
        // Запрашиваем role, status (проходка) и is_banned (бан)
        const { data } = await sb.from('users').upsert({
            id: currentUser.id,
            username: currentUser.user_metadata.full_name,
            avatar_url: currentUser.user_metadata.avatar_url
        }, { onConflict: 'id' }).select('role, status, is_banned').single();

        if (data) {
            userRole = data.role || 'user';
            if (['admin', 'owner', 'developer'].includes(userRole)) isAdmin = true;
            else isAdmin = false;

            if (data.status) userStatus = data.status;
            
            // Безопасное чтение is_banned (если колонки еще нет, будет undefined, считаем false)
            isUserBanned = data.is_banned === true; 
        }
    } catch (e) { console.error("Sync error:", e); }
}

function updateAuthUI() {
    const container = document.getElementById('authContainer');
    if (currentUser && container) {
        const meta = currentUser.user_metadata;
        const safeName = meta.full_name.split('#')[0];
        
        let badge = '';
        if (userRole === 'owner') badge = '<span style="color:#ef4444; font-size:1.2rem; margin-left:4px;">👑</span>';
        else if (userRole === 'developer') badge = '<span style="color:#2dd4bf; font-size:1.2rem; margin-left:4px;">🛠</span>';
        else if (isAdmin) badge = '<span style="color:#ef4444; font-size:1.2rem; line-height:0; margin-left:4px;">•</span>';

        container.innerHTML = `
            <div class="auth-trigger" onclick="window.toggleProfile()">
                <img src="${meta.avatar_url || DEFAULT_AVATAR}" class="auth-avatar">
                <span class="auth-name">${safeName}</span>
                ${badge}
            </div>
        `;
        createProfileDropdown(meta, safeName);
        
        document.querySelectorAll('.auth-only').forEach(btn => {
            if (btn.innerText.includes('участника') && !isAdmin) return;
            btn.style.setProperty('display', 'inline-flex', 'important');
        });
    }
}

function createProfileDropdown(meta, name) {
    const old = document.getElementById('profileDropdown');
    if (old) old.remove();

    let statusHTML = '<span class="d-val status-none">Нет</span>';
    
    // Логика отображения статуса: БАН приоритетнее, чем ПРОХОДКА
    if (isUserBanned) {
        statusHTML = '<span class="d-val status-banned">ЗАБАНЕН</span>';
    } else {
        if (userStatus === 'active') statusHTML = '<span class="d-val status-active">Активен</span>';
    }
    
    let roleName = 'PLAYER';
    if(userRole === 'owner') roleName = 'OWNER';
    if(userRole === 'developer') roleName = 'DEVELOPER';
    if(userRole === 'admin') roleName = 'ADMINISTRATOR';

    const d = new Date(currentUser.created_at);
    const dateStr = d.toLocaleDateString('ru-RU');
    
    const html = `
    <div id="profileDropdown" class="profile-dropdown">
        <div class="dropdown-header">
            <img src="${meta.avatar_url || DEFAULT_AVATAR}" class="dropdown-avatar">
            <div class="dropdown-user-info">
                <div class="dropdown-name">${name}</div>
                <div class="dropdown-role">${roleName}</div>
            </div>
        </div>
        <div class="dropdown-stats">
            <div class="d-stat">
                <div class="d-label">Статус</div>
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
    
    const navCont = document.querySelector('.nav-container');
    if(navCont) navCont.insertAdjacentHTML('beforeend', html);
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
        
        // Инициализация скина
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
        // loadActiveMembers() вызовется через Realtime или можно вызвать вручную
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
    await sb.from('active_members').update({ order_ind: targetItem.order_ind }).eq('id', currentItem.id);
    await sb.from('active_members').update({ order_ind: currentItem.order_ind }).eq('id', targetItem.id);
    loadActiveMembers();
}

// === FORUM ===
async function loadTopics() {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    
    // ИСПРАВЛЕНИЕ: Добавлен запрос поля 'id'
    const { data, error } = await sb.from('topics')
        .select('*, users(id, username, avatar_url, role, is_banned)')
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
        
        // РОЛИ
        let roleTag = '';
        if (author.role === 'owner') roleTag = '<span class="tag-owner">OWNER</span> ';
        else if (author.role === 'developer') roleTag = '<span class="tag-dev">DEV</span> ';
        else if (author.role === 'admin') roleTag = '<span class="admin-tag">ADMIN</span> ';
        
        const bannedTag = (author.is_banned === true) ? '<span class="banned-tag">BANNED</span> ' : '';
        const closedLabel = topic.is_closed ? '<span class="closed-icon"><i class="fas fa-lock"></i></span>' : '';

        return `
        <div class="post-entry ${topic.is_closed ? 'closed' : ''}" onclick="window.openTopic(${topic.id})">
            <div class="post-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${authorAva}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                    <div style="display:flex; flex-direction:column; overflow:hidden;">
                        <span class="post-title">${escapeHtml(topic.title)} ${closedLabel}</span>
                        <span class="post-meta">${roleTag}${bannedTag}${escapeHtml(authorName)} • ${new Date(topic.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="topic-actions">${actions}</div>
            </div>
            <div class="post-body">${escapeHtml(topic.description).substring(0, 120)}...</div>
        </div>
    `}).join('');
}

window.submitPost = async function() {
    await syncUserProfile(); // Обновляем статус перед проверкой
    if (!currentUser) return showToast('Нужен вход!', true);
    if (isUserBanned) return showToast('Вы забанены и не можете создавать темы!', true);
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    if (!title || !content) return showToast('Заполните поля!', true);

    const { error } = await sb.from('topics').insert([{ title, description: content, author_id: currentUser.id }]);
    if (!error) { showToast('Тема создана!'); closeModals(); } // loadTopics сработает по Realtime
    else showToast(error.message, true);
}

window.deleteTopic = async function(id) {
    if (!isAdmin) return showToast('Только для админов!', true);
    if (confirm('Удалить тему навсегда?')) { await sb.from('topics').delete().eq('id', id); }
}

window.toggleTopicStatus = async function(id, s) {
    await sb.from('topics').update({ is_closed: !s }).eq('id', id);
}

// === CHAT ===
window.openTopic = async function(topicId, isReload = false) {
    currentTopicId = topicId;
    if(!isReload) document.getElementById('topicModal').classList.add('active');
    
    const container = document.getElementById('chatContainer');
    if(!isReload) container.innerHTML = '<div class="loading-state">Загрузка...</div>';
    
    // ИСПРАВЛЕНИЕ: Добавлен запрос поля 'id'
    const { data: topic } = await sb.from('topics')
        .select('*, users(id, username, avatar_url, role, status, is_banned)')
        .eq('id', topicId).single();
    if (!topic) {
        container.innerHTML = 'Ошибка загрузки.';
        return;
    }

    document.getElementById('topicModalTitle').textContent = topic.title;
    
    const inputArea = document.querySelector('.chat-input-area');
    let closedMsg = document.getElementById('closedMsg');
    
    // ЛОГИКА ОТОБРАЖЕНИЯ ВВОДА
    // 1. Если забанен -> "Вы забанены"
    // 2. Если тема закрыта -> "Тема закрыта"
    // 3. Иначе -> инпут
    
    if (isUserBanned) {
        inputArea.style.display = 'none';
        if (!closedMsg) {
            closedMsg = document.createElement('div');
            closedMsg.id = 'closedMsg';
            closedMsg.className = 'chat-closed-msg';
            inputArea.parentNode.insertBefore(closedMsg, inputArea);
        }
        closedMsg.innerHTML = '<i class="fas fa-ban"></i> Вы забанены и не можете писать.';
        closedMsg.style.display = 'block';
    } else if (topic.is_closed) {
        inputArea.style.display = 'none';
        if (!closedMsg) {
            closedMsg = document.createElement('div');
            closedMsg.id = 'closedMsg';
            closedMsg.className = 'chat-closed-msg';
            inputArea.parentNode.insertBefore(closedMsg, inputArea);
        }
        closedMsg.innerHTML = '<i class="fas fa-lock"></i> Тема закрыта для новых ответов.';
        closedMsg.style.display = 'block';
    } else {
        inputArea.style.display = 'flex';
        if (closedMsg) closedMsg.style.display = 'none';
    }

    // ИСПРАВЛЕНИЕ: Добавлен запрос поля 'id' для комментариев
    const { data: comments } = await sb.from('comments')
        .select('*, users(id, username, avatar_url, role, status, is_banned)')
        .eq('topic_id', topicId)
        .order('created_at');
    
    let html = renderMessage(topic.users, topic.description, topic.created_at, true, topic.author_id, null);
    html += '<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">';
    
    if (comments) {
        html += comments.map(c => renderMessage(c.users, c.content, c.created_at, false, topic.author_id, c.id)).join('');
    }
    
    container.innerHTML = html;
    // Если это перезагрузка (realtime), скроллим только если были внизу, но тут для простоты скроллим всегда вниз
    if(!isReload || (container.scrollHeight - container.scrollTop === container.clientHeight)) {
        container.scrollTop = container.scrollHeight;
    }
}

function renderMessage(user, text, date, isOpPost, opId, commentId) {
    const safeUser = user || { username: 'Игрок', avatar_url: DEFAULT_AVATAR, role: 'user', id: 'unknown', is_banned: false };
    const isMe = currentUser && safeUser.id === currentUser.id;
    const isTopicAuthor = (user && user.id === opId) || isOpPost; 
    
    const isTargetBanned = safeUser.is_banned === true;

    // РОЛИ
    let roleTag = '';
    if (safeUser.role === 'owner') roleTag = '<span class="tag-owner">OWNER</span> ';
    else if (safeUser.role === 'developer') roleTag = '<span class="tag-dev">DEV</span> ';
    else if (safeUser.role === 'admin') roleTag = '<span class="admin-tag">ADMIN</span> ';
    
    const bannedTagHTML = isTargetBanned ? '<span class="banned-tag">BANNED</span> ' : '';
    const crownHTML = (isTopicAuthor && !isOpPost) ? '<i class="fas fa-crown" style="color:#fbbf24; margin-left:5px;" title="Автор темы"></i>' : '';
    
    let adminActions = '';
    if (isAdmin && safeUser.id !== 'unknown') {
        const delBtn = (commentId) ? `<button class="chat-action-btn btn-chat-del" onclick="window.deleteComment(${commentId})" title="Удалить"><i class="fas fa-trash"></i></button>` : '';
        let banBtn = '';
        if (!isMe) {
            // ИСПРАВЛЕННАЯ ЛОГИКА: Явная проверка на true
            if (isTargetBanned === true) {
                banBtn = `<button class="chat-action-btn btn-chat-unban" onclick="window.banUser('${safeUser.id}', false)" title="Разбанить"><i class="fas fa-user-check"></i></button>`;
            } else {
                banBtn = `<button class="chat-action-btn btn-chat-ban" onclick="window.banUser('${safeUser.id}', true)" title="Забанить"><i class="fas fa-gavel"></i></button>`;
            }
        }
        if (delBtn || banBtn) adminActions = `<div class="chat-admin-actions">${banBtn}${delBtn}</div>`;
    }

    const processedText = escapeHtml(text).replace(
        /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S*)?)/gi, 
        '<img src="$1" class="chat-image" onclick="window.open(\'$1\', \'_blank\')">'
    );

    return `
    <div class="msg-row ${isMe ? 'mine' : ''}">
        ${!isMe ? `<img src="${safeUser.avatar_url || DEFAULT_AVATAR}" class="msg-avatar">` : ''}
        <div class="msg-content">
            <div class="msg-header">
                ${roleTag}${bannedTagHTML} ${isMe ? 'Вы' : safeUser.username} 
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
    await syncUserProfile(); // Обновление перед отправкой
    if (!currentUser || !currentTopicId) return;
    if (isUserBanned) return showToast('Вы забанены и не можете писать!', true);

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
        // Realtime обновит чат, но можно и принудительно
    } else {
        showToast('Ошибка: ' + error.message, true);
    }
}

// === ADMIN ACTIONS ===
window.deleteComment = async function(commentId) {
    if (!isAdmin) return;
    if (confirm('Удалить этот комментарий?')) {
        const { error } = await sb.from('comments').delete().eq('id', commentId);
        if (error) showToast('Ошибка: ' + error.message, true);
    }
}

window.banUser = async function(userId, shouldBan) {
    if (!isAdmin) return;
    if (!userId || userId === 'unknown') return showToast('Ошибка ID', true);

    // Теперь меняем ТОЛЬКО is_banned. Status (проходка) остается как есть.
    const action = shouldBan ? 'забанить' : 'разбанить';
    
    if (confirm(`Вы точно хотите ${action} пользователя?`)) {
        const { error } = await sb.from('users').update({ is_banned: shouldBan }).eq('id', userId);
        if (!error) {
            showToast(`Пользователь ${shouldBan ? 'забанен' : 'разбанен'}`);
            // Обновляем текущий топик чтобы перерисовалась кнопка у сообщений этого юзера
            if (currentTopicId) openTopic(currentTopicId, true);
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
    if (!isAdmin) return;
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
