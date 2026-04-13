const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

// Данные
let users = {};
let privateChats = {};
let channels = {};
let groups = {};

// Загрузка данных
const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        channels = data.channels || {};
        groups = data.groups || {};
        console.log('✅ Данные загружены');
    } catch(e) { console.log('Ошибка загрузки'); }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, groups }, null, 2));
    console.log('💾 Сохранено');
}
setInterval(saveData, 10000);

// HTML страница
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM - Мессенджер</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: white; height: 100vh; overflow: hidden; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .auth-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .auth-card { background: rgba(255,255,255,0.95); padding: 40px; border-radius: 28px; width: 90%; max-width: 350px; text-align: center; }
        .auth-card h1 { font-size: 32px; margin-bottom: 30px; color: #333; }
        .auth-card input { width: 100%; padding: 14px; margin: 8px 0; border: 1px solid #ddd; border-radius: 14px; font-size: 16px; }
        .auth-card button { width: 100%; padding: 14px; margin-top: 12px; background: #667eea; color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; }
        .switch-btn { background: #999 !important; }
        .error-msg { color: #ff4444; margin-top: 12px; }
        
        .app { display: none; height: 100vh; display: flex; flex-direction: column; }
        .header { background: #1a1a1e; padding: 15px 20px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #2a2a2e; }
        .menu-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: white; display: none; }
        .logo { font-size: 20px; font-weight: bold; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .online-badge { margin-left: auto; font-size: 12px; color: #4ade80; }
        
        .container { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 300px; background: #1a1a1e; border-right: 1px solid #2a2a2e; display: flex; flex-direction: column; transition: transform 0.3s; }
        .sidebar.mobile { position: fixed; left: -300px; top: 60px; height: calc(100vh - 60px); z-index: 200; }
        .sidebar.mobile.open { left: 0; }
        .overlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 199; display: none; }
        .overlay.open { display: block; }
        
        .profile { padding: 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2e; cursor: pointer; }
        .profile:hover { background: #2a2a2e; }
        .avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 12px; }
        .profile-name { font-size: 18px; font-weight: 600; }
        .profile-username { font-size: 12px; color: #888; margin-top: 4px; }
        
        .nav-item { padding: 14px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s; }
        .nav-item:hover { background: #2a2a2e; }
        .section-title { padding: 16px 20px 8px; font-size: 11px; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .friends-list, .groups-list, .channels-list { flex: 1; overflow-y: auto; }
        .friend-item, .group-item, .channel-item { 
            padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; 
            transition: background 0.2s; border-bottom: 1px solid #2a2a2e; 
        }
        .friend-item:hover, .group-item:hover, .channel-item:hover { background: #2a2a2e; }
        .friend-avatar, .group-avatar, .channel-avatar { width: 40px; height: 40px; background: #2a2a2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .friend-info, .group-info, .channel-info { flex: 1; }
        .friend-name, .group-name, .channel-name { font-weight: 500; font-size: 15px; }
        .friend-status { font-size: 11px; color: #4ade80; margin-top: 2px; }
        .friend-status.offline { color: #888; }
        .request-badge { background: #667eea; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; background: #0f0f14; }
        .chat-header { padding: 16px 24px; background: #1a1a1e; border-bottom: 1px solid #2a2a2e; display: flex; align-items: center; justify-content: space-between; }
        .chat-title { font-size: 18px; font-weight: 600; }
        .chat-status { font-size: 12px; color: #4ade80; margin-top: 4px; }
        .chat-actions { display: flex; gap: 12px; }
        .chat-action-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px; border-radius: 50%; }
        .chat-action-btn:hover { background: #2a2a2e; }
        
        .messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .message { display: flex; max-width: 70%; animation: fadeIn 0.3s; }
        .message.mine { align-self: flex-end; }
        .message-bubble { padding: 10px 16px; border-radius: 20px; background: #2a2a2e; }
        .message.mine .message-bubble { background: linear-gradient(135deg, #667eea, #764ba2); }
        .message-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #aaa; }
        .message-text { font-size: 15px; line-height: 1.4; word-break: break-word; }
        .message-time { font-size: 10px; color: #888; margin-top: 4px; text-align: right; }
        
        .input-area { padding: 16px 24px; background: #1a1a1e; border-top: 1px solid #2a2a2e; display: flex; gap: 12px; }
        .input-area input { flex: 1; padding: 12px 18px; background: #2a2a2e; border: none; border-radius: 28px; color: white; font-size: 15px; }
        .input-area input:focus { outline: none; }
        .input-area button { padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 28px; color: white; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
        .input-area button:hover { transform: scale(1.02); }
        
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; visibility: hidden; opacity: 0; transition: all 0.2s; }
        .modal.active { visibility: visible; opacity: 1; }
        .modal-content { background: #1a1a1e; border-radius: 28px; width: 90%; max-width: 400px; max-height: 80vh; overflow-y: auto; }
        .modal-header { padding: 20px; border-bottom: 1px solid #2a2a2e; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { font-size: 18px; }
        .modal-body { padding: 20px; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid #2a2a2e; display: flex; gap: 12px; }
        .modal-close { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        .modal-input { width: 100%; padding: 12px; background: #2a2a2e; border: none; border-radius: 14px; color: white; font-size: 15px; margin-bottom: 12px; }
        .modal-btn { flex: 1; padding: 12px; background: #667eea; border: none; border-radius: 14px; color: white; font-weight: 600; cursor: pointer; }
        .modal-btn.cancel { background: #2a2a2e; }
        
        .toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: #2a2a2e; padding: 12px 24px; border-radius: 30px; font-size: 14px; z-index: 1000; animation: fadeIn 0.3s; }
        
        @media (max-width: 768px) {
            .sidebar { position: fixed; left: -300px; top: 60px; height: calc(100vh - 60px); z-index: 200; }
            .sidebar.open { left: 0; }
            .menu-btn { display: block; }
            .message { max-width: 85%; }
        }
        @media (min-width: 769px) { .sidebar { position: relative; left: 0 !important; } }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1e; }
        ::-webkit-scrollbar-thumb { background: #667eea; border-radius: 4px; }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div id="loginPanel">
            <input type="text" id="loginUsername" placeholder="Логин">
            <input type="password" id="loginPassword" placeholder="Пароль">
            <button onclick="login()">Войти</button>
            <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
        </div>
        <div id="registerPanel" style="display:none">
            <input type="text" id="regUsername" placeholder="Логин">
            <input type="text" id="regName" placeholder="Ваше имя">
            <input type="password" id="regPassword" placeholder="Пароль">
            <button onclick="register()">Зарегистрироваться</button>
            <button class="switch-btn" onclick="showLogin()">Назад</button>
        </div>
        <div id="authError" class="error-msg"></div>
    </div>
</div>

<div class="app" id="mainApp">
    <div class="header">
        <button class="menu-btn" onclick="toggleSidebar()">☰</button>
        <div class="logo">⚡ ATOMGRAM</div>
        <div class="online-badge">● Онлайн</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile" onclick="openProfile()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-username" id="userLogin">@</div>
            </div>
            <div class="nav-item" onclick="openAddFriend()">
                <span>➕</span> <span>Добавить друга</span>
            </div>
            <div class="nav-item" onclick="openCreateGroup()">
                <span>👥</span> <span>Создать группу</span>
            </div>
            <div class="nav-item" onclick="openCreateChannel()">
                <span>📢</span> <span>Создать канал</span>
            </div>
            <div class="section-title">ДРУЗЬЯ</div>
            <div class="friends-list" id="friendsList"></div>
            <div class="section-title">ГРУППЫ</div>
            <div class="groups-list" id="groupsList"></div>
            <div class="section-title">КАНАЛЫ</div>
            <div class="channels-list" id="channelsList"></div>
        </div>
        
        <div class="chat-area">
            <div class="chat-header">
                <div>
                    <div class="chat-title" id="chatTitle">Выберите чат</div>
                    <div class="chat-status" id="chatStatus"></div>
                </div>
                <div class="chat-actions" id="chatActions"></div>
            </div>
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">📤 Отправить</button>
            </div>
        </div>
    </div>
</div>

<!-- Модальные окна -->
<div id="addFriendModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>➕ Добавить друга</h3>
            <button class="modal-close" onclick="closeAddFriendModal()">✕</button>
        </div>
        <div class="modal-body">
            <input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга">
        </div>
        <div class="modal-footer">
            <button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button>
            <button class="modal-btn" onclick="addFriend()">Добавить</button>
        </div>
    </div>
</div>

<div id="createGroupModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>👥 Создать группу</h3>
            <button class="modal-close" onclick="closeCreateGroupModal()">✕</button>
        </div>
        <div class="modal-body">
            <input type="text" id="groupName" class="modal-input" placeholder="Название группы">
        </div>
        <div class="modal-footer">
            <button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button>
            <button class="modal-btn" onclick="createGroup()">Создать</button>
        </div>
    </div>
</div>

<div id="createChannelModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>📢 Создать канал</h3>
            <button class="modal-close" onclick="closeCreateChannelModal()">✕</button>
        </div>
        <div class="modal-body">
            <input type="text" id="channelName" class="modal-input" placeholder="Название канала">
        </div>
        <div class="modal-footer">
            <button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button>
            <button class="modal-btn" onclick="createChannel()">Создать</button>
        </div>
    </div>
</div>

<div id="profileModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>👤 Профиль</h3>
            <button class="modal-close" onclick="closeProfileModal()">✕</button>
        </div>
        <div class="modal-body">
            <div style="text-align:center; margin-bottom:20px;">
                <div class="avatar" id="profileAvatar" style="width:80px; height:80px; font-size:36px; margin:0 auto;">👤</div>
            </div>
            <input type="text" id="editName" class="modal-input" placeholder="Ваше имя">
            <input type="text" id="editBio" class="modal-input" placeholder="О себе">
            <input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль">
        </div>
        <div class="modal-footer">
            <button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button>
            <button class="modal-btn" onclick="saveProfile()">Сохранить</button>
        </div>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentChat = null;
let currentChatType = null;
let currentChatTarget = null;
let allFriends = [];
let friendRequests = [];
let allGroups = [];
let allChannels = [];
let onlineUsers = new Set();

// Авторизация
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) {
        document.getElementById('authError').innerText = 'Заполните все поля';
        return;
    }
    socket.emit('login', { username, password }, (res) => {
        if (res.success) {
            currentUser = username;
            currentUserData = res.userData;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
        } else {
            document.getElementById('authError').innerText = res.error;
        }
    });
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (!username || !password) {
        document.getElementById('authError').innerText = 'Заполните все поля';
        return;
    }
    socket.emit('register', { username, name, password }, (res) => {
        if (res.success) {
            document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.';
            showLogin();
        } else {
            document.getElementById('authError').innerText = res.error;
        }
    });
}

function showRegister() {
    document.getElementById('loginPanel').style.display = 'none';
    document.getElementById('registerPanel').style.display = 'block';
    document.getElementById('authError').innerText = '';
}

function showLogin() {
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('registerPanel').style.display = 'none';
    document.getElementById('authError').innerText = '';
}

function updateUI() {
    document.getElementById('userName').innerText = currentUserData?.name || currentUser;
    document.getElementById('userLogin').innerText = '@' + currentUser;
}

function loadData() {
    socket.emit('getFriends', (data) => {
        allFriends = data.friends || [];
        friendRequests = data.requests || [];
        renderFriends();
    });
    socket.emit('getGroups', (groups) => {
        allGroups = groups;
        renderGroups();
    });
    socket.emit('getChannels', (channels) => {
        allChannels = channels;
        renderChannels();
    });
}

function renderFriends() {
    const container = document.getElementById('friendsList');
    let html = '';
    
    friendRequests.forEach(req => {
        html += '<div class="friend-item" style="background:#2a2a4e;">' +
            '<div class="friend-avatar">📨</div>' +
            '<div class="friend-info">' +
                '<div class="friend-name">' + req + '</div>' +
                '<div class="friend-status">Запрос в друзья</div>' +
            '</div>' +
            '<button onclick="acceptFriend(\\'' + req + '\\')" style="background:#4ade80; border:none; border-radius:20px; padding:5px 10px; margin:0 5px; cursor:pointer;">✓</button>' +
            '<button onclick="rejectFriend(\\'' + req + '\\')" style="background:#ff4444; border:none; border-radius:20px; padding:5px 10px; cursor:pointer;">✗</button>' +
        '</div>';
    });
    
    allFriends.forEach(friend => {
        const isOnline = onlineUsers.has(friend);
        html += '<div class="friend-item" onclick="openChat(\\'' + friend + '\\', \\'private\\')">' +
            '<div class="friend-avatar">👤</div>' +
            '<div class="friend-info">' +
                '<div class="friend-name">' + friend + '</div>' +
                '<div class="friend-status ' + (isOnline ? '' : 'offline') + '">' + (isOnline ? '● Онлайн' : '○ Офлайн') + '</div>' +
            '</div>' +
        '</div>';
    });
    
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">Нет друзей</div>';
    container.innerHTML = html;
}

function renderGroups() {
    const container = document.getElementById('groupsList');
    let html = '';
    allGroups.forEach(group => {
        html += '<div class="group-item" onclick="openChat(\\'' + group.id + '\\', \\'group\\')">' +
            '<div class="group-avatar">👥</div>' +
            '<div class="group-info">' +
                '<div class="group-name">' + group.name + '</div>' +
                '<div class="friend-status">' + (group.members?.length || 1) + ' участников</div>' +
            '</div>' +
        '</div>';
    });
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">Нет групп</div>';
    container.innerHTML = html;
}

function renderChannels() {
    const container = document.getElementById('channelsList');
    let html = '';
    allChannels.forEach(channel => {
        html += '<div class="channel-item" onclick="openChat(\\'' + channel + '\\', \\'channel\\')">' +
            '<div class="channel-avatar">📢</div>' +
            '<div class="channel-info">' +
                '<div class="channel-name">#' + channel + '</div>' +
            '</div>' +
        '</div>';
    });
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">Нет каналов</div>';
    container.innerHTML = html;
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    let title = '';
    let actions = '';
    
    if (type === 'private') {
        title = target;
        const isOnline = onlineUsers.has(target);
        document.getElementById('chatStatus').innerHTML = isOnline ? '● Онлайн' : '○ Офлайн';
        socket.emit('joinPrivate', target);
    } else if (type === 'group') {
        const group = allGroups.find(g => g.id === target);
        title = group ? group.name : target;
        document.getElementById('chatStatus').innerHTML = '👥 Группа';
        socket.emit('joinGroup', target);
        actions = '<button class="chat-action-btn" onclick="addMemberToGroup()">➕</button>';
    } else if (type === 'channel') {
        title = '# ' + target;
        document.getElementById('chatStatus').innerHTML = '📢 Публичный канал';
        socket.emit('joinChannel', target);
    }
    
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatActions').innerHTML = actions;
    closeSidebar();
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text });
    input.value = '';
}

function addMessage(msg) {
    const messagesDiv = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    div.innerHTML = '<div class="message-bubble">' +
        (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') +
        '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
        '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div>' +
        '</div>';
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Модальные окна
function openAddFriend() {
    document.getElementById('addFriendModal').classList.add('active');
    document.getElementById('friendUsername').value = '';
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}

function addFriend() {
    const username = document.getElementById('friendUsername').value.trim();
    if (!username) {
        showToast('Введите логин друга');
        return;
    }
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        showToast(res.message || res.error);
        closeAddFriendModal();
        loadData();
    });
}

function acceptFriend(from) {
    socket.emit('acceptFriend', { fromUser: from }, () => loadData());
}

function rejectFriend(from) {
    socket.emit('rejectFriend', { fromUser: from }, () => loadData());
}

function openCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
    document.getElementById('groupName').value = '';
}

function closeCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('active');
}

function createGroup() {
    const name = document.getElementById('groupName').value.trim();
    if (!name) {
        showToast('Введите название группы');
        return;
    }
    socket.emit('createGroup', { groupName: name }, (res) => {
        if (res.success) {
            showToast('Группа создана');
            closeCreateGroupModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

function openCreateChannel() {
    document.getElementById('createChannelModal').classList.add('active');
    document.getElementById('channelName').value = '';
}

function closeCreateChannelModal() {
    document.getElementById('createChannelModal').classList.remove('active');
}

function createChannel() {
    const name = document.getElementById('channelName').value.trim();
    if (!name) {
        showToast('Введите название канала');
        return;
    }
    socket.emit('createChannel', { channelName: name }, (res) => {
        if (res.success) {
            showToast('Канал создан');
            closeCreateChannelModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

function openProfile() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function saveProfile() {
    const data = {
        name: document.getElementById('editName').value.trim(),
        bio: document.getElementById('editBio').value.trim()
    };
    const password = document.getElementById('editPassword').value.trim();
    if (password) data.password = password;
    socket.emit('updateProfile', data, (res) => {
        if (res.success) {
            currentUserData = res.userData;
            updateUI();
            closeProfileModal();
            showToast('Профиль обновлён');
        }
    });
}

function addMemberToGroup() {
    const username = prompt('Введите логин пользователя для добавления в группу:');
    if (username) {
        socket.emit('addGroupMember', { groupId: currentChatTarget, username: username }, (res) => {
            showToast(res.message || res.error);
        });
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Socket события
socket.on('friendsUpdate', (data) => {
    allFriends = data.friends || [];
    friendRequests = data.requests || [];
    renderFriends();
});

socket.on('groupsUpdate', (groups) => {
    allGroups = groups;
    renderGroups();
});

socket.on('channelsUpdate', (channels) => {
    allChannels = channels;
    renderChannels();
});

socket.on('chatHistory', (data) => {
    if (currentChatTarget === data.target) {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        data.messages.forEach(msg => addMessage(msg));
    }
});

socket.on('newMessage', (msg) => {
    if (currentChatTarget === msg.target || currentChatTarget === msg.from || 
        (currentChatType === 'group' && msg.target === currentChatTarget)) {
        addMessage(msg);
    }
});

socket.on('userOnline', (username) => {
    onlineUsers.add(username);
    if (currentChatTarget === username) {
        document.getElementById('chatStatus').innerHTML = '● Онлайн';
    }
    renderFriends();
});

socket.on('userOffline', (username) => {
    onlineUsers.delete(username);
    if (currentChatTarget === username) {
        document.getElementById('chatStatus').innerHTML = '○ Офлайн';
    }
    renderFriends();
});

// Автовход если есть сохранённые данные
const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) {
    document.getElementById('loginUsername').value = savedUser;
}
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ ==========
const userSockets = new Map();
const onlineUsersSet = new Set();

function getSocketByUsername(username) {
    for (const [id, user] of userSockets) {
        if (user === username) return io.sockets.sockets.get(id);
    }
    return null;
}

io.on('connection', (socket) => {
    console.log('🔌 Подключился:', socket.id);
    let currentUser = null;

    // Регистрация
    socket.on('register', (data, callback) => {
        const { username, name, password } = data;
        if (users[username]) {
            callback({ success: false, error: 'Пользователь уже существует' });
        } else {
            users[username] = {
                username: username,
                name: name || username,
                password: password,
                bio: '',
                friends: [],
                friendRequests: []
            };
            saveData();
            callback({ success: true });
            console.log('✅ Зарегистрирован:', username);
        }
    });

    // Вход
    socket.on('login', (data, callback) => {
        const { username, password } = data;
        const user = users[username];
        if (!user) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (user.password !== password) {
            callback({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            socket.username = username;
            userSockets.set(socket.id, username);
            onlineUsersSet.add(username);
            
            callback({
                success: true,
                userData: {
                    username: user.username,
                    name: user.name,
                    bio: user.bio
                }
            });
            
            console.log('✅ Вошёл:', username);
            
            socket.emit('friendsUpdate', {
                friends: user.friends || [],
                requests: user.friendRequests || []
            });
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(username)));
            socket.emit('channelsUpdate', Object.keys(channels));
            socket.broadcast.emit('userOnline', username);
        }
    });

    // Обновление профиля
    socket.on('updateProfile', (data, callback) => {
        const user = users[currentUser];
        if (user) {
            if (data.name) user.name = data.name;
            if (data.bio) user.bio = data.bio;
            if (data.password) user.password = data.password;
            saveData();
            callback({
                success: true,
                userData: {
                    username: user.username,
                    name: user.name,
                    bio: user.bio
                }
            });
        } else {
            callback({ success: false });
        }
    });

    // Получить друзей
    socket.on('getFriends', (callback) => {
        if (currentUser && users[currentUser]) {
            callback({
                friends: users[currentUser].friends || [],
                requests: users[currentUser].friendRequests || []
            });
        } else {
            callback({ friends: [], requests: [] });
        }
    });

    // Получить группы
    socket.on('getGroups', (callback) => {
        if (currentUser) {
            callback(Object.values(groups).filter(g => g.members?.includes(currentUser)));
        } else {
            callback([]);
        }
    });

    // Получить каналы
    socket.on('getChannels', (callback) => {
        callback(Object.keys(channels));
    });

    // Добавить друга
    socket.on('addFriend', (data, callback) => {
        const { friendUsername } = data;
        const user = users[currentUser];
        const friend = users[friendUsername];
        
        if (!friend) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (friendUsername === currentUser) {
            callback({ success: false, error: 'Нельзя добавить себя' });
        } else if (user.friends.includes(friendUsername)) {
            callback({ success: false, error: 'Уже в друзьях' });
        } else if (friend.friendRequests.includes(currentUser)) {
            callback({ success: false, error: 'Запрос уже отправлен' });
        } else {
            friend.friendRequests.push(currentUser);
            saveData();
            callback({ success: true, message: 'Запрос в друзья отправлен' });
            
            const friendSocket = getSocketByUsername(friendUsername);
            if (friendSocket) {
                friendSocket.emit('friendsUpdate', {
                    friends: friend.friends || [],
                    requests: friend.friendRequests || []
                });
            }
        }
    });

    // Принять друга
    socket.on('acceptFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        const from = users[fromUser];
        
        if (user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            if (!user.friends) user.friends = [];
            if (!from.friends) from.friends = [];
            user.friends.push(fromUser);
            from.friends.push(currentUser);
            saveData();
            
            socket.emit('friendsUpdate', {
                friends: user.friends,
                requests: user.friendRequests
            });
            
            const fromSocket = getSocketByUsername(fromUser);
            if (fromSocket) {
                fromSocket.emit('friendsUpdate', {
                    friends: from.friends,
                    requests: from.friendRequests
                });
            }
        }
    });

    // Отклонить друга
    socket.on('rejectFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        if (user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friendsUpdate', {
                friends: user.friends,
                requests: user.friendRequests
            });
        }
    });

    // Создать группу
    socket.on('createGroup', (data, callback) => {
        const { groupName } = data;
        const groupId = 'group_' + Date.now();
        groups[groupId] = {
            id: groupId,
            name: groupName,
            members: [currentUser],
            messages: []
        };
        saveData();
        callback({ success: true });
        socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(currentUser)));
    });

    // Добавить участника в группу
    socket.on('addGroupMember', (data, callback) => {
        const { groupId, username } = data;
        const group = groups[groupId];
        if (group && !group.members.includes(username)) {
            group.members.push(username);
            saveData();
            callback({ success: true, message: 'Участник добавлен' });
            
            const userSocket = getSocketByUsername(username);
            if (userSocket) {
                userSocket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(username)));
            }
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(currentUser)));
        } else {
            callback({ success: false, error: 'Не удалось добавить' });
        }
    });

    // Присоединиться к группе
    socket.on('joinGroup', (groupId) => {
        if (groups[groupId] && groups[groupId].members.includes(currentUser)) {
            socket.emit('chatHistory', {
                target: groupId,
                messages: groups[groupId].messages || []
            });
        }
    });

    // Создать канал
    socket.on('createChannel', (data, callback) => {
        const { channelName } = data;
        if (channels[channelName]) {
            callback({ success: false, error: 'Канал уже существует' });
        } else {
            channels[channelName] = { name: channelName, messages: [] };
            saveData();
            callback({ success: true });
            io.emit('channelsUpdate', Object.keys(channels));
        }
    });

    // Присоединиться к каналу
    socket.on('joinChannel', (channelName) => {
        if (channels[channelName]) {
            socket.emit('chatHistory', {
                target: channelName,
                messages: channels[channelName].messages || []
            });
        }
    });

    // Присоединиться к личному чату
    socket.on('joinPrivate', (target) => {
        const chatId = [currentUser, target].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
        socket.emit('chatHistory', {
            target: target,
            messages: privateChats[chatId].messages || []
        });
    });

    // Отправить сообщение
    socket.on('sendMessage', (data) => {
        const { type, target, text } = data;
        const msg = {
            from: currentUser,
            text: text,
            time: new Date().toLocaleTimeString(),
            target: target
        };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            
            socket.emit('newMessage', msg);
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) {
                targetSocket.emit('newMessage', msg);
            }
        } else if (type === 'group') {
            if (groups[target] && groups[target].members.includes(currentUser)) {
                groups[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
                groups[target].members.forEach(member => {
                    if (member !== currentUser) {
                        const memberSocket = getSocketByUsername(member);
                        if (memberSocket) {
                            memberSocket.emit('newMessage', msg);
                        }
                    }
                });
            }
        } else if (type === 'channel') {
            if (channels[target]) {
                channels[target].messages.push(msg);
                saveData();
                io.emit('newMessage', msg);
            }
        }
    });

    // Отключение
    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            onlineUsersSet.delete(currentUser);
            socket.broadcast.emit('userOffline', currentUser);
            console.log('👋 Отключился:', currentUser);
        }
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 ATOMGRAM ЗАПУЩЕН НА ${PORT} ПОРТУ      ║
╠════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                  ║
║  📱 http://localhost:${PORT}                  ║
╠════════════════════════════════════════════╣
║  ✨ Функции Telegram:                      ║
║  💬 Личные сообщения                       ║
║  👥 Группы (до 200 человек)               ║
║  📢 Каналы                                 ║
║  👤 Друзья с запросами                     ║
║  🟢 Онлайн-статус                          ║
║  📱 Адаптивный дизайн                      ║
║  💾 История сообщений                      ║
║  🎨 Настройки профиля                      ║
╚════════════════════════════════════════════╝
    `);
});
