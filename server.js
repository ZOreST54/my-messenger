const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);const express = require('express');
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

let users = {};
let privateChats = {};
let channels = {};
let groups = {};

const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        channels = data.channels || {};
        groups = data.groups || {};
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, groups }, null, 2));
}
setInterval(saveData, 10000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
            background: #000000;
            color: #ffffff;
            height: 100vh;
            overflow: hidden;
        }

        /* Анимации */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Экран входа */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000000;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .auth-card {
            background: #1c1c1e;
            padding: 40px 30px;
            border-radius: 28px;
            width: 90%;
            max-width: 360px;
            text-align: center;
        }
        .auth-card h1 {
            font-size: 34px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #007aff, #5856d6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-card .subtitle {
            color: #8e8e93;
            margin-bottom: 32px;
            font-size: 14px;
        }
        .auth-card input {
            width: 100%;
            padding: 14px 16px;
            margin: 8px 0;
            background: #2c2c2e;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            color: #ffffff;
        }
        .auth-card input:focus {
            outline: none;
            background: #3a3a3c;
        }
        .auth-card button {
            width: 100%;
            padding: 14px;
            margin-top: 12px;
            background: #007aff;
            color: white;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        .switch-btn {
            background: #2c2c2e !important;
        }
        .error-msg {
            color: #ff3b30;
            margin-top: 16px;
            font-size: 14px;
        }

        /* Приложение */
        .app {
            display: none;
            height: 100vh;
            flex-direction: column;
        }

        /* Шапка */
        .header {
            background: #000000;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 0.5px solid #2c2c2e;
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #007aff;
            display: none;
            padding: 8px;
        }
        .logo {
            font-size: 20px;
            font-weight: 700;
            background: linear-gradient(135deg, #007aff, #5856d6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .online-badge {
            margin-left: auto;
            font-size: 12px;
            color: #34c759;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .online-badge::before {
            content: '';
            width: 8px;
            height: 8px;
            background: #34c759;
            border-radius: 50%;
            display: inline-block;
        }

        /* Контейнер */
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* Боковая панель */
        .sidebar {
            width: 280px;
            background: #000000;
            border-right: 0.5px solid #2c2c2e;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease;
            z-index: 100;
        }

        /* Мобильная версия */
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -280px;
                top: 0;
                height: 100%;
                width: 280px;
                background: #1c1c1e;
                z-index: 200;
            }
            .sidebar.open {
                left: 0;
            }
            .menu-btn {
                display: block;
            }
            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 199;
                display: none;
            }
            .overlay.open {
                display: block;
            }
        }
        @media (min-width: 769px) {
            .sidebar {
                position: relative;
                left: 0 !important;
            }
        }

        /* Профиль в боковой панели */
        .profile {
            padding: 30px 20px 20px;
            text-align: center;
            border-bottom: 0.5px solid #2c2c2e;
            cursor: pointer;
        }
        .avatar {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, #007aff, #5856d6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 12px;
        }
        .profile-name {
            font-size: 17px;
            font-weight: 600;
        }
        .profile-username {
            font-size: 13px;
            color: #8e8e93;
            margin-top: 4px;
        }

        /* Навигация */
        .nav-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            border-radius: 10px;
            margin: 4px 12px;
            color: #ffffff;
        }
        .nav-item:hover {
            background: #2c2c2e;
        }
        .section-title {
            padding: 16px 20px 8px;
            font-size: 12px;
            color: #8e8e93;
            text-transform: uppercase;
            font-weight: 600;
        }

        /* Списки */
        .friends-list, .groups-list, .channels-list {
            overflow-y: auto;
        }
        .chat-item {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: background 0.2s;
        }
        .chat-item:hover {
            background: #2c2c2e;
        }
        .chat-avatar {
            width: 48px;
            height: 48px;
            background: #2c2c2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
        }
        .chat-info {
            flex: 1;
        }
        .chat-name {
            font-weight: 600;
            font-size: 16px;
        }
        .chat-status {
            font-size: 12px;
            color: #8e8e93;
            margin-top: 2px;
        }
        .chat-status.online {
            color: #34c759;
        }

        /* Область чата */
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #000000;
        }

        /* Шапка чата */
        .chat-header {
            padding: 12px 16px;
            background: #000000;
            border-bottom: 0.5px solid #2c2c2e;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .back-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #007aff;
            display: none;
        }
        .chat-header-avatar {
            width: 44px;
            height: 44px;
            background: #2c2c2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
        }
        .chat-header-info {
            flex: 1;
        }
        .chat-header-name {
            font-weight: 600;
            font-size: 17px;
        }
        .chat-header-status {
            font-size: 12px;
            color: #8e8e93;
            margin-top: 2px;
        }
        .chat-header-status.online {
            color: #34c759;
        }

        /* Сообщения */
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .message {
            display: flex;
            gap: 8px;
            max-width: 80%;
            animation: fadeIn 0.2s ease;
        }
        .message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        .message-avatar {
            width: 32px;
            height: 32px;
            background: #2c2c2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
        }
        .message-bubble {
            max-width: calc(100% - 40px);
        }
        .message-content {
            padding: 8px 12px;
            border-radius: 18px;
            background: #2c2c2e;
        }
        .message.mine .message-content {
            background: #007aff;
        }
        .message-name {
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 2px;
            color: #8e8e93;
        }
        .message-text {
            font-size: 15px;
            line-height: 1.4;
            word-break: break-word;
        }
        .message-time {
            font-size: 10px;
            color: #8e8e93;
            margin-top: 4px;
            text-align: right;
        }

        /* Панель ввода */
        .input-area {
            padding: 10px 16px;
            background: #000000;
            border-top: 0.5px solid #2c2c2e;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .input-area input {
            flex: 1;
            padding: 10px 14px;
            background: #1c1c1e;
            border: none;
            border-radius: 20px;
            color: #ffffff;
            font-size: 15px;
        }
        .input-area input:focus {
            outline: none;
        }
        .input-area button {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #007aff;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .input-area button:active {
            transform: scale(0.95);
        }

        /* Модалки */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            visibility: hidden;
            opacity: 0;
            transition: all 0.2s;
        }
        .modal.active {
            visibility: visible;
            opacity: 1;
        }
        .modal-content {
            background: #1c1c1e;
            border-radius: 24px;
            width: 90%;
            max-width: 380px;
            overflow: hidden;
        }
        .modal-header {
            padding: 20px;
            border-bottom: 0.5px solid #2c2c2e;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            font-size: 18px;
        }
        .modal-close {
            background: none;
            border: none;
            color: #ffffff;
            font-size: 24px;
            cursor: pointer;
        }
        .modal-body {
            padding: 20px;
        }
        .modal-footer {
            padding: 16px 20px;
            border-top: 0.5px solid #2c2c2e;
            display: flex;
            gap: 12px;
        }
        .modal-input {
            width: 100%;
            padding: 14px;
            background: #2c2c2e;
            border: none;
            border-radius: 12px;
            color: #ffffff;
            font-size: 15px;
            margin-bottom: 16px;
        }
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: #007aff;
            border: none;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            cursor: pointer;
        }
        .modal-btn.cancel {
            background: #2c2c2e;
        }

        .toast {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #1c1c1e;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 13px;
            z-index: 1000;
            animation: fadeIn 0.3s;
        }

        @media (max-width: 768px) {
            .message {
                max-width: 85%;
            }
            .back-btn {
                display: block;
            }
        }
    </style>
</head>
<body>

<!-- Экран входа -->
<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div class="subtitle">Быстрый. Безопасный. Современный.</div>
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

<!-- Главное приложение -->
<div class="app" id="mainApp">
    <div class="header">
        <button class="menu-btn" onclick="toggleSidebar()">☰</button>
        <div class="logo">⚡ ATOMGRAM</div>
        <div class="online-badge">Онлайн</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile" onclick="openProfile()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-username" id="userLogin">@</div>
            </div>
            <div class="nav-item" onclick="openAddFriend()">➕ Добавить друга</div>
            <div class="nav-item" onclick="openCreateGroup()">👥 Создать группу</div>
            <div class="nav-item" onclick="openCreateChannel()">📢 Создать канал</div>
            <div class="section-title">ЧАТЫ</div>
            <div id="chatsList" class="friends-list"></div>
            <div class="section-title">ГРУППЫ</div>
            <div id="groupsList" class="groups-list"></div>
            <div class="section-title">КАНАЛЫ</div>
            <div id="channelsList" class="channels-list"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <button class="back-btn" onclick="closeChat()">←</button>
                <div class="chat-header-avatar" id="chatAvatar">👤</div>
                <div class="chat-header-info">
                    <div class="chat-header-name" id="chatTitle">ATOMGRAM</div>
                    <div class="chat-header-status" id="chatStatus"></div>
                </div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="input-area" id="inputArea" style="display: none;">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<!-- Модальные окна -->
<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:80px;height:80px;font-size:36px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:#2c2c2e;border:none;padding:8px 16px;border-radius:20px;color:white;cursor:pointer">Загрузить</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"><textarea id="editBio" class="modal-input" rows="2" placeholder="О себе"></textarea><input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentChatTarget = null;
let currentChatType = null;
let allFriends = [];
let friendRequests = [];
let allGroups = [];
let allChannels = [];
let onlineUsers = new Set();
let isMobile = window.innerWidth <= 768;

// Авторизация
function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('login', { username: u, password: p }, (res) => {
        if (res.success) {
            currentUser = u;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_user', u);
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
    const u = document.getElementById('regUsername').value.trim();
    const n = document.getElementById('regName').value.trim();
    const p = document.getElementById('regPassword').value.trim();
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('register', { username: u, name: n, password: p }, (res) => {
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
}

function showLogin() {
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('registerPanel').style.display = 'none';
}

function updateUI() {
    const name = currentUserData?.name || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
    if (currentUserData?.avatar) {
        document.getElementById('userAvatar').innerHTML = '<img src="' + currentUserData.avatar + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
    }
}

function loadData() {
    socket.emit('getFriends', (data) => {
        allFriends = data.friends || [];
        friendRequests = data.requests || [];
        renderChats();
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

function renderChats() {
    let html = '';
    for (let i = 0; i < friendRequests.length; i++) {
        const r = friendRequests[i];
        html += '<div class="chat-item" style="background:#1c2a3e">' +
            '<div class="chat-avatar">📨</div>' +
            '<div class="chat-info">' +
                '<div class="chat-name">' + r + '</div>' +
                '<div class="chat-status">Запрос в друзья</div>' +
            '</div>' +
            '<button onclick="acceptFriend(\\'' + r + '\\')" style="background:#34c759;border:none;border-radius:12px;padding:6px 12px;color:white;cursor:pointer">✓</button>' +
            '<button onclick="rejectFriend(\\'' + r + '\\')" style="background:#ff3b30;border:none;border-radius:12px;padding:6px 12px;color:white;cursor:pointer">✗</button>' +
        '</div>';
    }
    for (let i = 0; i < allFriends.length; i++) {
        const f = allFriends[i];
        const online = onlineUsers.has(f);
        html += '<div class="chat-item" onclick="openChat(\\'' + f + '\\', \\'private\\')">' +
            '<div class="chat-avatar">👤</div>' +
            '<div class="chat-info">' +
                '<div class="chat-name">' + f + '</div>' +
                '<div class="chat-status ' + (online ? 'online' : '') + '">' + (online ? 'Онлайн' : 'Офлайн') + '</div>' +
            '</div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#8e8e93">Нет чатов</div>';
    document.getElementById('chatsList').innerHTML = html;
}

function renderGroups() {
    let html = '';
    for (let i = 0; i < allGroups.length; i++) {
        const g = allGroups[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + g.id + '\\', \\'group\\')">' +
            '<div class="chat-avatar">👥</div>' +
            '<div class="chat-info">' +
                '<div class="chat-name">' + g.name + '</div>' +
                '<div class="chat-status">' + (g.members ? g.members.length : 1) + ' участников</div>' +
            '</div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#8e8e93">Нет групп</div>';
    document.getElementById('groupsList').innerHTML = html;
}

function renderChannels() {
    let html = '';
    for (let i = 0; i < allChannels.length; i++) {
        const c = allChannels[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + c + '\\', \\'channel\\')">' +
            '<div class="chat-avatar">📢</div>' +
            '<div class="chat-info">' +
                '<div class="chat-name">#' + c + '</div>' +
            '</div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#8e8e93">Нет каналов</div>';
    document.getElementById('channelsList').innerHTML = html;
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    let title = target;
    if (type === 'channel') title = '# ' + target;
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatAvatar').innerHTML = type === 'channel' ? '📢' : '👤';
    document.getElementById('chatStatus').innerHTML = type === 'private' && onlineUsers.has(target) ? 'Онлайн' : '';
    document.getElementById('chatStatus').classList.toggle('online', type === 'private' && onlineUsers.has(target));
    document.getElementById('inputArea').style.display = 'flex';
    
    if (type === 'private') {
        socket.emit('joinPrivate', target);
    } else if (type === 'group') {
        socket.emit('joinGroup', target);
    } else if (type === 'channel') {
        socket.emit('joinChannel', target);
    }
    
    if (isMobile) {
        document.querySelector('.sidebar').classList.remove('open');
        document.querySelector('.overlay').classList.remove('open');
    }
}

function closeChat() {
    currentChatTarget = null;
    currentChatType = null;
    document.getElementById('chatTitle').innerHTML = 'ATOMGRAM';
    document.getElementById('chatAvatar').innerHTML = '👤';
    document.getElementById('chatStatus').innerHTML = '';
    document.getElementById('inputArea').style.display = 'none';
    document.getElementById('messages').innerHTML = '';
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text });
    input.value = '';
}

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    div.innerHTML = '<div class="message-avatar">👤</div>' +
        '<div class="message-bubble">' +
            '<div class="message-content">' +
                (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') +
                '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
                '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div>' +
            '</div>' +
        '</div>';
    document.getElementById('messages').appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
}

// Друзья
function openAddFriend() {
    document.getElementById('addFriendModal').classList.add('active');
    document.getElementById('friendUsername').value = '';
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}

function addFriend() {
    const u = document.getElementById('friendUsername').value.trim();
    if (!u) {
        showToast('Введите логин');
        return;
    }
    socket.emit('addFriend', { friendUsername: u }, (res) => {
        showToast(res.message || res.error);
        closeAddFriendModal();
        loadData();
    });
}

function acceptFriend(f) {
    socket.emit('acceptFriend', { fromUser: f }, () => loadData());
}

function rejectFriend(f) {
    socket.emit('rejectFriend', { fromUser: f }, () => loadData());
}

// Группы
function openCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
    document.getElementById('groupName').value = '';
}

function closeCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('active');
}

function createGroup() {
    const n = document.getElementById('groupName').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createGroup', { groupName: n }, (res) => {
        if (res.success) {
            showToast('Группа создана');
            closeCreateGroupModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

// Каналы
function openCreateChannel() {
    document.getElementById('createChannelModal').classList.add('active');
    document.getElementById('channelName').value = '';
}

function closeCreateChannelModal() {
    document.getElementById('createChannelModal').classList.remove('active');
}

function createChannel() {
    const n = document.getElementById('channelName').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createChannel', { channelName: n }, (res) => {
        if (res.success) {
            showToast('Канал создан');
            closeCreateChannelModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

// Профиль
function openProfile() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function uploadAvatar() {
    const file = document.getElementById('avatarUpload').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('uploadAvatar', { avatar: reader.result }, (res) => {
            if (res.success) {
                currentUserData = res.userData;
                updateUI();
                showToast('Аватар обновлён');
                closeProfileModal();
            }
        });
    };
    reader.readAsDataURL(file);
}

function saveProfile() {
    const data = {
        name: document.getElementById('editName').value.trim(),
        bio: document.getElementById('editBio').value.trim()
    };
    const pwd = document.getElementById('editPassword').value.trim();
    if (pwd) data.password = pwd;
    socket.emit('updateProfile', data, (res) => {
        if (res.success) {
            currentUserData = res.userData;
            updateUI();
            closeProfileModal();
            showToast('Профиль обновлён');
        }
    });
}

// UI
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Сокет события
socket.on('friendsUpdate', () => loadData());
socket.on('groupsUpdate', () => loadData());
socket.on('channelsUpdate', () => loadData());
socket.on('chatHistory', (data) => {
    if (currentChatTarget === data.target) {
        document.getElementById('messages').innerHTML = '';
        for (let i = 0; i < data.messages.length; i++) {
            addMessage(data.messages[i]);
        }
    }
});
socket.on('newMessage', (msg) => {
    if (currentChatTarget === msg.target || currentChatTarget === msg.from) {
        addMessage(msg);
    }
});
socket.on('userOnline', (u) => {
    onlineUsers.add(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = 'Онлайн';
        document.getElementById('chatStatus').classList.add('online');
    }
    renderChats();
});
socket.on('userOffline', (u) => {
    onlineUsers.delete(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = '';
        document.getElementById('chatStatus').classList.remove('online');
    }
    renderChats();
});

const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) {
    document.getElementById('loginUsername').value = savedUser;
}

window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
});
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ (СЕРВЕР) ==========
const userSockets = new Map();
const onlineSet = new Set();

function getSocketByUsername(username) {
    for (const [id, user] of userSockets) if (user === username) return io.sockets.sockets.get(id);
    return null;
}

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('register', (data, cb) => {
        const { username, name, password } = data;
        if (users[username]) {
            cb({ success: false, error: 'Пользователь уже существует' });
        } else {
            users[username] = { username, name: name || username, password, bio: '', avatar: null, friends: [], friendRequests: [] };
            saveData();
            cb({ success: true });
        }
    });

    socket.on('login', (data, cb) => {
        const { username, password } = data;
        const user = users[username];
        if (!user) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (user.password !== password) {
            cb({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            socket.username = username;
            userSockets.set(socket.id, username);
            onlineSet.add(username);
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
            socket.emit('friendsUpdate', { friends: user.friends || [], requests: user.friendRequests || [] });
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
            socket.emit('channelsUpdate', Object.keys(channels));
            socket.broadcast.emit('userOnline', username);
        }
    });

    socket.on('updateProfile', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            if (data.name) user.name = data.name;
            if (data.bio) user.bio = data.bio;
            if (data.password) user.password = data.password;
            if (data.avatar) user.avatar = data.avatar;
            saveData();
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
        } else {
            cb({ success: false });
        }
    });

    socket.on('uploadAvatar', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            user.avatar = data.avatar;
            saveData();
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
        } else {
            cb({ success: false });
        }
    });

    socket.on('getFriends', (cb) => {
        if (currentUser && users[currentUser]) {
            cb({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [] });
        } else {
            cb({ friends: [], requests: [] });
        }
    });

    socket.on('getGroups', (cb) => {
        if (currentUser) {
            cb(Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
        } else {
            cb([]);
        }
    });

    socket.on('getChannels', (cb) => {
        cb(Object.keys(channels));
    });

    socket.on('addFriend', (data, cb) => {
        const { friendUsername } = data;
        const user = users[currentUser];
        const friend = users[friendUsername];
        if (!friend) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (friendUsername === currentUser) {
            cb({ success: false, error: 'Нельзя добавить себя' });
        } else if (user.friends && user.friends.includes(friendUsername)) {
            cb({ success: false, error: 'Уже в друзьях' });
        } else if (friend.friendRequests && friend.friendRequests.includes(currentUser)) {
            cb({ success: false, error: 'Запрос уже отправлен' });
        } else {
            if (!friend.friendRequests) friend.friendRequests = [];
            friend.friendRequests.push(currentUser);
            saveData();
            cb({ success: true, message: 'Запрос отправлен' });
            const fs = getSocketByUsername(friendUsername);
            if (fs) {
                fs.emit('friendsUpdate', { friends: friend.friends || [], requests: friend.friendRequests || [] });
            }
        }
    });

    socket.on('acceptFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        const from = users[fromUser];
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            if (!user.friends) user.friends = [];
            if (!from.friends) from.friends = [];
            user.friends.push(fromUser);
            from.friends.push(currentUser);
            saveData();
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
            const fs = getSocketByUsername(fromUser);
            if (fs) {
                fs.emit('friendsUpdate', { friends: from.friends, requests: from.friendRequests });
            }
        }
    });

    socket.on('rejectFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
        }
    });

    socket.on('createGroup', (data, cb) => {
        const { groupName } = data;
        const id = 'group_' + Date.now();
        groups[id] = { id, name: groupName, members: [currentUser], messages: [] };
        saveData();
        cb({ success: true });
        socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
    });

    socket.on('joinGroup', (id) => {
        if (groups[id] && groups[id].members && groups[id].members.includes(currentUser)) {
            socket.emit('chatHistory', { target: id, messages: groups[id].messages || [] });
        }
    });

    socket.on('createChannel', (data, cb) => {
        const { channelName } = data;
        if (channels[channelName]) {
            cb({ success: false, error: 'Канал уже существует' });
        } else {
            channels[channelName] = { name: channelName, messages: [] };
            saveData();
            cb({ success: true });
            io.emit('channelsUpdate', Object.keys(channels));
        }
    });

    socket.on('joinChannel', (name) => {
        if (channels[name]) {
            socket.emit('chatHistory', { target: name, messages: channels[name].messages || [] });
        }
    });

    socket.on('joinPrivate', (target) => {
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chatHistory', { target: target, messages: privateChats[id].messages || [] });
    });

    socket.on('sendMessage', (data) => {
        const { type, target, text } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), target: target };
        if (type === 'private') {
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const ts = getSocketByUsername(target);
            if (ts) {
                ts.emit('newMessage', msg);
            }
        } else if (type === 'group') {
            if (groups[target] && groups[target].members && groups[target].members.includes(currentUser)) {
                groups[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
                if (groups[target].members) {
                    groups[target].members.forEach(m => {
                        if (m !== currentUser) {
                            const ms = getSocketByUsername(m);
                            if (ms) ms.emit('newMessage', msg);
                        }
                    });
                }
            }
        } else if (type === 'channel') {
            if (channels[target]) {
                channels[target].messages.push(msg);
                saveData();
                io.emit('newMessage', msg);
            }
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            onlineSet.delete(currentUser);
            socket.broadcast.emit('userOffline', currentUser);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 ATOMGRAM ЗАПУЩЕН НА ${PORT} ПОРТУ      ║
╠════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                  ║
╠════════════════════════════════════════════╣
║  ✨ ЧИСТЫЙ МИНИМАЛИСТИЧНЫЙ ДИЗАЙН           ║
║  💬 Личные сообщения                        ║
║  👥 Группы                                 ║
║  📢 Каналы                                 ║
║  👤 Друзья                                ║
║  🟢 Онлайн-статус                          ║
║  📱 Адаптив под телефон                    ║
╚════════════════════════════════════════════╝
    `);
});
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Данные
let users = {};
let privateChats = {};
let channels = {};
let groups = {};
let stories = {};
let polls = {};
let calls = {};
let reactions = {};
let savedMessages = {};
let scheduledMessages = {};

const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        channels = data.channels || {};
        groups = data.groups || {};
        stories = data.stories || {};
        polls = data.polls || {};
        savedMessages = data.savedMessages || {};
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, groups, stories, polls, savedMessages }, null, 2));
}
setInterval(saveData, 5000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ATOMGRAM ULTRA 10GB — Мессенджер будущего</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #121218;
            --bg-tertiary: #1a1a24;
            --bg-elevated: #22222e;
            --bg-input: #1a1a24;
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
            --text-muted: #52525b;
            --accent: #6366f1;
            --accent-light: #818cf8;
            --accent-dark: #4f46e5;
            --accent-glow: rgba(99, 102, 241, 0.4);
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --info: #3b82f6;
            --border: rgba(255, 255, 255, 0.06);
            --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
            --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
            --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
            --shadow-xl: 0 16px 48px rgba(0,0,0,0.6);
            --transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        }

        body.light {
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --bg-elevated: #e2e8f0;
            --bg-input: #f1f5f9;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #94a3b8;
            --border: rgba(0, 0, 0, 0.06);
            --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
            --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
            --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
            transition: var(--transition);
        }

        /* Анимации */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px var(--accent); }
            50% { box-shadow: 0 0 20px var(--accent); }
        }
        @keyframes typingAnim {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-8px); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Экран входа */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            background-size: 200% 200%;
            animation: gradientBG 10s ease infinite;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .auth-card {
            background: rgba(18, 18, 24, 0.95);
            backdrop-filter: blur(20px);
            padding: 48px 40px;
            border-radius: 48px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-xl);
            animation: slideUp 0.5s ease;
        }
        .auth-card h1 {
            font-size: 48px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-card .subtitle {
            color: var(--text-secondary);
            margin-bottom: 32px;
            font-size: 14px;
        }
        .auth-card input {
            width: 100%;
            padding: 16px 20px;
            margin: 8px 0;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 24px;
            font-size: 16px;
            color: var(--text-primary);
            transition: var(--transition);
        }
        .auth-card input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .auth-card button {
            width: 100%;
            padding: 16px;
            margin-top: 16px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            border: none;
            border-radius: 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
        }
        .auth-card button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        .switch-btn {
            background: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
        }
        .error-msg {
            color: var(--error);
            margin-top: 16px;
            font-size: 14px;
        }

        /* Приложение */
        .app {
            display: none;
            height: 100vh;
            width: 100%;
            position: relative;
        }

        /* Шапка */
        .header {
            background: var(--bg-secondary);
            padding: 12px 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            border-bottom: 1px solid var(--border);
            backdrop-filter: blur(10px);
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-primary);
            display: none;
            padding: 8px;
            border-radius: 12px;
            transition: var(--transition);
        }
        .menu-btn:hover {
            background: var(--bg-tertiary);
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 20px;
            font-weight: 700;
        }
        .logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            animation: float 3s ease infinite;
        }
        .logo-icon::before {
            content: "⚡";
            font-size: 20px;
            color: white;
        }
        .logo-icon::after {
            content: "";
            position: absolute;
            inset: -2px;
            background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
            border-radius: 16px;
            z-index: -1;
            opacity: 0.5;
            filter: blur(6px);
        }
        .logo-text {
            background: linear-gradient(135deg, #fff, #a1a1aa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .online-badge {
            margin-left: auto;
            font-size: 12px;
            color: var(--success);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .online-badge::before {
            content: '';
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            display: inline-block;
            animation: pulse 1s infinite;
        }

        /* Контейнер */
        .container {
            display: flex;
            height: calc(100vh - 60px);
            overflow: hidden;
        }

        /* Боковая панель */
        .sidebar {
            width: 320px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
            z-index: 100;
        }
        .sidebar.mobile {
            position: fixed;
            left: -100%;
            top: 60px;
            height: calc(100vh - 60px);
            width: 85%;
            max-width: 320px;
            box-shadow: var(--shadow-xl);
            z-index: 200;
        }
        .sidebar.mobile.open {
            left: 0;
        }
        .overlay {
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 199;
            display: none;
        }
        .overlay.open {
            display: block;
        }

        /* Профиль */
        .profile-card {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            transition: var(--transition);
        }
        .profile-card:hover {
            background: var(--bg-tertiary);
        }
        .avatar {
            width: 84px;
            height: 84px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 12px;
            position: relative;
            transition: var(--transition);
        }
        .avatar:hover {
            transform: scale(1.05);
        }
        .avatar img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }
        .online-indicator {
            position: absolute;
            bottom: 4px;
            right: 4px;
            width: 16px;
            height: 16px;
            background: var(--success);
            border-radius: 50%;
            border: 2px solid var(--bg-secondary);
        }
        .profile-name {
            font-size: 18px;
            font-weight: 600;
        }
        .profile-username {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        /* Навигация */
        .nav-menu {
            padding: 12px 12px;
            flex: 1;
            overflow-y: auto;
        }
        .nav-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 16px;
            border-radius: 14px;
            cursor: pointer;
            transition: var(--transition);
            color: var(--text-primary);
            margin-bottom: 4px;
        }
        .nav-item:hover {
            background: var(--bg-tertiary);
            transform: translateX(4px);
        }
        .nav-item i {
            width: 24px;
            font-size: 18px;
            color: var(--accent);
        }
        .section-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            padding: 20px 16px 8px;
        }

        /* Истории */
        .stories-row {
            padding: 16px;
            display: flex;
            gap: 16px;
            overflow-x: auto;
            border-bottom: 1px solid var(--border);
        }
        .story-item {
            text-align: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: var(--transition);
        }
        .story-item:hover {
            transform: translateY(-2px);
        }
        .story-circle {
            width: 68px;
            height: 68px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .story-circle.add {
            background: var(--bg-tertiary);
            border: 2px solid var(--accent);
        }
        .story-avatar {
            font-size: 30px;
        }
        .story-name {
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 6px;
            max-width: 68px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Списки */
        .friends-list, .groups-list, .channels-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px 12px;
        }
        .chat-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px;
            border-radius: 16px;
            cursor: pointer;
            transition: var(--transition);
            margin-bottom: 4px;
        }
        .chat-item:hover {
            background: var(--bg-tertiary);
            transform: translateX(4px);
        }
        .chat-avatar {
            width: 52px;
            height: 52px;
            background: var(--bg-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            position: relative;
            flex-shrink: 0;
        }
        .chat-info {
            flex: 1;
            min-width: 0;
        }
        .chat-name {
            font-weight: 600;
            font-size: 16px;
        }
        .chat-preview {
            font-size: 13px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
        }
        .chat-status {
            font-size: 11px;
            color: var(--success);
            margin-top: 2px;
        }
        .chat-status.offline {
            color: var(--text-muted);
        }

        /* Область чата */
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--bg-primary);
        }
        .chat-header {
            padding: 16px 24px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .chat-header-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .chat-header-avatar {
            width: 48px;
            height: 48px;
            background: var(--bg-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .chat-header-details {
            flex: 1;
        }
        .chat-header-name {
            font-weight: 700;
            font-size: 18px;
        }
        .chat-header-status {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 2px;
        }
        .chat-header-actions {
            display: flex;
            gap: 8px;
        }
        .header-action-btn {
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 20px;
            cursor: pointer;
            padding: 10px;
            border-radius: 50%;
            transition: var(--transition);
        }
        .header-action-btn:hover {
            background: var(--bg-tertiary);
            transform: scale(1.05);
        }

        /* Сообщения */
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message {
            display: flex;
            gap: 12px;
            max-width: 75%;
            animation: fadeIn 0.3s ease;
        }
        .message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        .message-avatar {
            width: 36px;
            height: 36px;
            background: var(--bg-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
        }
        .message-bubble {
            max-width: calc(100% - 48px);
        }
        .message-content {
            padding: 10px 16px;
            border-radius: 20px;
            background: var(--bg-tertiary);
            position: relative;
        }
        .message.mine .message-content {
            background: linear-gradient(135deg, #6366f1, #a855f7);
        }
        .message-name {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--text-secondary);
        }
        .message-text {
            font-size: 15px;
            line-height: 1.45;
            word-break: break-word;
        }
        .message-time {
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 6px;
            text-align: right;
        }
        .message-status {
            font-size: 10px;
            margin-left: 6px;
        }
        .message-reply {
            background: rgba(99, 102, 241, 0.2);
            padding: 6px 10px;
            border-radius: 12px;
            margin-bottom: 6px;
            font-size: 12px;
            border-left: 3px solid var(--accent);
        }

        /* Реакции */
        .message-reactions {
            display: flex;
            gap: 6px;
            margin-top: 8px;
            flex-wrap: wrap;
        }
        .reaction {
            background: var(--bg-elevated);
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 12px;
            cursor: pointer;
            transition: var(--transition);
        }
        .reaction:hover {
            background: var(--accent);
            transform: scale(1.05);
        }

        /* Голосовые */
        .voice-message {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .voice-play {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--accent);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition);
        }
        .voice-play:hover {
            transform: scale(1.1);
        }

        /* Стикеры */
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: var(--bg-secondary);
            border-radius: 24px 24px 0 0;
            padding: 20px;
            display: none;
            flex-wrap: wrap;
            gap: 14px;
            justify-content: center;
            z-index: 150;
            max-height: 260px;
            overflow-y: auto;
            border-top: 1px solid var(--border);
            box-shadow: var(--shadow-xl);
        }
        .sticker-picker.open {
            display: flex;
        }
        .sticker {
            font-size: 48px;
            cursor: pointer;
            padding: 8px;
            border-radius: 16px;
            transition: var(--transition);
            background: var(--bg-tertiary);
        }
        .sticker:active {
            transform: scale(1.2);
        }

        /* Опросы */
        .poll-card {
            background: var(--bg-tertiary);
            border-radius: 16px;
            padding: 12px;
            margin: 8px 0;
        }
        .poll-question {
            font-weight: 600;
            margin-bottom: 12px;
        }
        .poll-option {
            padding: 10px;
            margin: 6px 0;
            background: var(--bg-elevated);
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: var(--transition);
        }
        .poll-option:hover {
            background: var(--accent);
            transform: scale(1.02);
        }
        .poll-vote-count {
            font-size: 12px;
            color: var(--text-secondary);
        }

        /* Игры */
        .game-container {
            background: var(--bg-secondary);
            border-radius: 24px;
            padding: 20px;
            margin-bottom: 12px;
            border: 1px solid var(--border);
        }
        .game-title {
            text-align: center;
            margin-bottom: 16px;
            font-size: 18px;
            font-weight: 700;
        }
        .game-boards {
            display: flex;
            flex-wrap: wrap;
            gap: 24px;
            justify-content: center;
        }
        .board {
            text-align: center;
        }
        .board-title {
            margin-bottom: 8px;
            font-size: 14px;
            color: var(--text-secondary);
        }
        .battle-grid {
            display: inline-grid;
            grid-template-columns: repeat(10, 32px);
            gap: 2px;
            background: var(--bg-tertiary);
            padding: 4px;
            border-radius: 12px;
        }
        .battle-cell {
            width: 32px;
            height: 32px;
            background: var(--bg-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 6px;
            font-size: 14px;
            transition: var(--transition);
        }
        .battle-cell:hover {
            background: var(--accent);
            transform: scale(1.05);
        }
        .battle-cell.ship { background: #3b82f6; }
        .battle-cell.hit { background: var(--error); animation: pulse 0.3s; }
        .battle-cell.miss { background: var(--text-muted); }
        .tic-grid {
            display: inline-grid;
            grid-template-columns: repeat(3, 80px);
            gap: 8px;
            background: var(--bg-tertiary);
            padding: 8px;
            border-radius: 16px;
        }
        .tic-cell {
            width: 80px;
            height: 80px;
            background: var(--bg-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            cursor: pointer;
            border-radius: 12px;
            transition: var(--transition);
        }
        .tic-cell:hover {
            background: var(--accent);
            transform: scale(1.05);
        }
        .game-controls {
            display: flex;
            gap: 12px;
            margin-top: 20px;
            justify-content: center;
        }
        .game-btn {
            padding: 10px 20px;
            background: var(--accent);
            border: none;
            border-radius: 12px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: var(--transition);
        }
        .game-btn:hover {
            transform: scale(1.02);
            background: var(--accent-light);
        }

        /* Панель ввода */
        .reply-indicator {
            background: var(--bg-secondary);
            padding: 8px 16px;
            border-left: 3px solid var(--accent);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            margin: 0 20px;
            border-radius: 12px;
            margin-bottom: 8px;
        }
        .input-area {
            padding: 16px 20px;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .input-area input {
            flex: 1;
            padding: 12px 18px;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 28px;
            font-size: 15px;
            color: var(--text-primary);
            transition: var(--transition);
        }
        .input-area input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .input-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--bg-tertiary);
            border: none;
            color: var(--text-primary);
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .input-btn:hover {
            background: var(--accent);
            transform: scale(1.05);
        }
        .input-btn.recording {
            background: var(--error);
            animation: pulse 1s infinite;
        }

        /* Индикатор печати */
        .typing-indicator {
            padding: 8px 24px;
            font-size: 13px;
            color: var(--text-secondary);
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .typing-dot {
            width: 6px;
            height: 6px;
            background: var(--accent);
            border-radius: 50%;
            animation: typingAnim 1.4s infinite;
        }

        /* Модалки */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            visibility: hidden;
            opacity: 0;
            transition: var(--transition);
        }
        .modal.active {
            visibility: visible;
            opacity: 1;
        }
        .modal-content {
            background: var(--bg-secondary);
            border-radius: 32px;
            width: 90%;
            max-width: 420px;
            max-height: 85vh;
            overflow-y: auto;
            animation: fadeIn 0.3s ease;
        }
        .modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            font-size: 20px;
        }
        .modal-close {
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 24px;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
        }
        .modal-body {
            padding: 24px;
        }
        .modal-footer {
            padding: 16px 24px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 14px 16px;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 16px;
            font-size: 15px;
            color: var(--text-primary);
            transition: var(--transition);
        }
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--accent);
        }
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: var(--accent);
            border: none;
            border-radius: 16px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
        }
        .modal-btn:hover {
            background: var(--accent-light);
            transform: translateY(-1px);
        }
        .modal-btn.cancel {
            background: var(--bg-tertiary);
            color: var(--text-primary);
        }

        /* Просмотр историй */
        .story-viewer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            visibility: hidden;
            opacity: 0;
            transition: var(--transition);
        }
        .story-viewer.active {
            visibility: visible;
            opacity: 1;
        }
        .story-container {
            width: 100%;
            max-width: 400px;
            position: relative;
        }
        .story-media {
            width: 100%;
            border-radius: 24px;
            max-height: 80vh;
            object-fit: cover;
        }
        .story-progress {
            position: absolute;
            top: 10px;
            left: 0;
            right: 0;
            height: 3px;
            background: rgba(255,255,255,0.3);
            border-radius: 3px;
        }
        .story-progress-bar {
            height: 100%;
            background: white;
            width: 0%;
            transition: width 0.1s linear;
            border-radius: 3px;
        }
        .story-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.5);
            border: none;
            color: white;
            font-size: 24px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
        }

        /* Уведомления */
        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 1000;
            text-align: center;
            box-shadow: var(--shadow-xl);
            animation: fadeIn 0.3s ease;
        }

        /* Адаптив */
        @media (min-width: 769px) {
            .sidebar {
                position: relative;
                left: 0 !important;
            }
        }
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -100%;
                top: 60px;
                height: calc(100vh - 60px);
                width: 85%;
                max-width: 300px;
                z-index: 200;
            }
            .sidebar.open {
                left: 0;
            }
            .menu-btn {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .message {
                max-width: 85%;
            }
            .battle-grid {
                grid-template-columns: repeat(10, 28px);
            }
            .battle-cell {
                width: 28px;
                height: 28px;
            }
            .tic-grid {
                grid-template-columns: repeat(3, 60px);
            }
            .tic-cell {
                width: 60px;
                height: 60px;
                font-size: 36px;
            }
        }

        /* Скроллбар */
        ::-webkit-scrollbar {
            width: 5px;
        }
        ::-webkit-scrollbar-track {
            background: var(--bg-tertiary);
            border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
            background: var(--accent);
            border-radius: 10px;
        }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div class="subtitle">Мессенджер нового поколения</div>
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
        <div class="logo">
            <div class="logo-icon"></div>
            <span class="logo-text">ATOMGRAM</span>
        </div>
        <div class="online-badge">Онлайн</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile-card" onclick="openProfile()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-username" id="userLogin">@</div>
            </div>
            <div class="stories-row" id="storiesRow"></div>
            <div class="nav-menu">
                <div class="nav-item" onclick="openAddFriend()"><i class="fas fa-user-plus"></i><span>Добавить друга</span></div>
                <div class="nav-item" onclick="openCreateGroup()"><i class="fas fa-users"></i><span>Создать группу</span></div>
                <div class="nav-item" onclick="openCreateChannel()"><i class="fas fa-bullhorn"></i><span>Создать канал</span></div>
                <div class="nav-item" onclick="openThemeSettings()"><i class="fas fa-palette"></i><span>Тема</span></div>
                <div class="section-title">ДРУЗЬЯ</div>
                <div class="friends-list" id="friendsList"></div>
                <div class="section-title">ГРУППЫ</div>
                <div class="groups-list" id="groupsList"></div>
                <div class="section-title">КАНАЛЫ</div>
                <div class="channels-list" id="channelsList"></div>
            </div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-header-avatar" id="chatAvatar">👤</div>
                    <div class="chat-header-details">
                        <div class="chat-header-name" id="chatTitle">Выберите чат</div>
                        <div class="chat-header-status" id="chatStatus"></div>
                    </div>
                </div>
                <div class="chat-header-actions" id="chatActions"></div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="typing-indicator" id="typingIndicator" style="display:none">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <span>печатает...</span>
            </div>
            <div id="replyIndicator" class="reply-indicator" style="display:none">
                <span id="replyPreview"></span>
                <button onclick="cancelReply()">✕</button>
            </div>
            <div class="sticker-picker" id="stickerPicker">
                <div class="sticker" onclick="sendSticker('😀')">😀</div>
                <div class="sticker" onclick="sendSticker('😂')">😂</div>
                <div class="sticker" onclick="sendSticker('😍')">😍</div>
                <div class="sticker" onclick="sendSticker('😎')">😎</div>
                <div class="sticker" onclick="sendSticker('🥳')">🥳</div>
                <div class="sticker" onclick="sendSticker('🔥')">🔥</div>
                <div class="sticker" onclick="sendSticker('❤️')">❤️</div>
                <div class="sticker" onclick="sendSticker('🎉')">🎉</div>
                <div class="sticker" onclick="sendSticker('👍')">👍</div>
                <div class="sticker" onclick="sendSticker('👎')">👎</div>
                <div class="sticker" onclick="sendSticker('🐱')">🐱</div>
                <div class="sticker" onclick="sendSticker('🐶')">🐶</div>
                <div class="sticker" onclick="sendSticker('🚀')">🚀</div>
                <div class="sticker" onclick="sendSticker('✨')">✨</div>
                <div class="sticker" onclick="sendSticker('💎')">💎</div>
                <div class="sticker" onclick="sendSticker('🎨')">🎨</div>
            </div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button class="input-btn" onclick="toggleStickerPicker()"><i class="fas fa-smile"></i></button>
                <button class="input-btn" onclick="document.getElementById('fileInput').click()"><i class="fas fa-paperclip"></i></button>
                <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
                <button id="voiceBtn" class="input-btn" onclick="toggleRecording()"><i class="fas fa-microphone"></i></button>
                <button class="input-btn" onclick="openGameMenu()"><i class="fas fa-gamepad"></i></button>
                <button class="input-btn" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    </div>
</div>

<!-- Модальные окна -->
<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3><i class="fas fa-user-plus"></i> Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3><i class="fas fa-users"></i> Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3><i class="fas fa-bullhorn"></i> Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3><i class="fas fa-user"></i> Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:100px;height:100px;font-size:48px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:var(--bg-tertiary);border:none;padding:8px 20px;border-radius:20px;color:white;cursor:pointer"><i class="fas fa-camera"></i> Загрузить фото</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><div class="form-group"><label>Имя</label><input type="text" id="editName" placeholder="Ваше имя"></div><div class="form-group"><label>О себе</label><textarea id="editBio" rows="2" placeholder="Расскажите о себе..."></textarea></div><div class="form-group"><label>Новый пароль</label><input type="password" id="editPassword" placeholder="Оставьте пустым"></div></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>
<div id="gameMenuModal" class="modal"><div class="modal-content"><div class="modal-header"><h3><i class="fas fa-gamepad"></i> Игры в чате</h3><button class="modal-close" onclick="closeGameMenu()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="startGame('battleship')" style="margin-bottom:12px"><i class="fas fa-ship"></i> Морской бой</button><button class="modal-btn" onclick="startGame('tictactoe')" style="margin-bottom:12px"><i class="fas fa-times"></i> Крестики-нолики</button><button class="modal-btn" onclick="startGame('dice')" style="margin-bottom:12px"><i class="fas fa-dice"></i> Кости</button><button class="modal-btn" onclick="startGame('darts')"><i class="fas fa-bullseye"></i> Дартс</button></div></div></div>
<div id="themeModal" class="modal"><div class="modal-content"><div class="modal-header"><h3><i class="fas fa-palette"></i> Тема оформления</h3><button class="modal-close" onclick="closeThemeModal()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="setTheme('dark')" style="margin-bottom:12px"><i class="fas fa-moon"></i> Тёмная тема</button><button class="modal-btn" onclick="setTheme('light')"><i class="fas fa-sun"></i> Светлая тема</button></div></div></div>

<div id="storyViewer" class="story-viewer"><div class="story-container"><div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div><img id="storyImage" class="story-media" style="display:none"><video id="storyVideo" class="story-media" style="display:none" autoplay muted></video><button class="story-close" onclick="closeStoryViewer()">✕</button></div></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentChatTarget = null;
let currentChatType = null;
let allFriends = [];
let friendRequests = [];
let allGroups = [];
let allChannels = [];
let onlineUsers = new Set();
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let typingTimeout = null;
let currentGame = null;
let battleMyGrid = null;
let battleEnemyGrid = null;
let tttBoard = null;
let tttCurrentPlayer = null;
let replyToMessage = null;

// АВТОРИЗАЦИЯ
function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('login', { username: u, password: p }, (res) => {
        if (res.success) {
            currentUser = u;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_user', u);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
            loadStories();
        } else {
            document.getElementById('authError').innerText = res.error;
        }
    });
}

function register() {
    const u = document.getElementById('regUsername').value.trim();
    const n = document.getElementById('regName').value.trim();
    const p = document.getElementById('regPassword').value.trim();
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('register', { username: u, name: n, password: p }, (res) => {
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
    const name = currentUserData?.name || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
    if (currentUserData?.avatar) {
        document.getElementById('userAvatar').innerHTML = '<img src="' + currentUserData.avatar + '">';
    }
}

function loadData() {
    socket.emit('getFriends', (d) => {
        allFriends = d.friends || [];
        friendRequests = d.requests || [];
        renderFriends();
    });
    socket.emit('getGroups', (g) => {
        allGroups = g;
        renderGroups();
    });
    socket.emit('getChannels', (c) => {
        allChannels = c;
        renderChannels();
    });
}

function renderFriends() {
    let html = '';
    for (let i = 0; i < friendRequests.length; i++) {
        const r = friendRequests[i];
        html += '<div class="chat-item" style="background:rgba(99,102,241,0.15)"><div class="chat-avatar">📨</div><div class="chat-info"><div class="chat-name">' + r + '</div><div class="chat-preview">Запрос в друзья</div></div><button onclick="acceptFriend(\\'' + r + '\\')" style="background:#10b981;border:none;border-radius:20px;padding:5px 10px;margin:0 5px;cursor:pointer">✓</button><button onclick="rejectFriend(\\'' + r + '\\')" style="background:#ef4444;border:none;border-radius:20px;padding:5px 10px;cursor:pointer">✗</button></div>';
    }
    for (let i = 0; i < allFriends.length; i++) {
        const f = allFriends[i];
        const online = onlineUsers.has(f);
        html += '<div class="chat-item" onclick="openChat(\\'' + f + '\\', \\'private\\')"><div class="chat-avatar">👤' + (online ? '<div class="online-indicator"></div>' : '') + '</div><div class="chat-info"><div class="chat-name">' + f + '</div><div class="chat-status ' + (online ? '' : 'offline') + '">' + (online ? 'Онлайн' : 'Офлайн') + '</div></div></div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет друзей</div>';
    document.getElementById('friendsList').innerHTML = html;
}

function renderGroups() {
    let html = '';
    for (let i = 0; i < allGroups.length; i++) {
        const g = allGroups[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + g.id + '\\', \\'group\\')"><div class="chat-avatar">👥</div><div class="chat-info"><div class="chat-name">' + g.name + '</div><div class="chat-preview">' + (g.members ? g.members.length : 1) + ' участников</div></div></div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет групп</div>';
    document.getElementById('groupsList').innerHTML = html;
}

function renderChannels() {
    let html = '';
    for (let i = 0; i < allChannels.length; i++) {
        const c = allChannels[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + c + '\\', \\'channel\\')"><div class="chat-avatar">📢</div><div class="chat-info"><div class="chat-name">#' + c + '</div><div class="chat-preview">Публичный канал</div></div></div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет каналов</div>';
    document.getElementById('channelsList').innerHTML = html;
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    let title = '';
    let actions = '';
    if (type === 'private') {
        title = target;
        document.getElementById('chatStatus').innerHTML = onlineUsers.has(target) ? 'Онлайн' : 'Офлайн';
        socket.emit('joinPrivate', target);
        actions = '<button class="header-action-btn" onclick="openGameMenu()"><i class="fas fa-gamepad"></i></button>';
    } else if (type === 'group') {
        const g = allGroups.find(x => x.id === target);
        title = g ? g.name : target;
        document.getElementById('chatStatus').innerHTML = '👥 Группа • ' + (g?.members?.length || 1) + ' участников';
        socket.emit('joinGroup', target);
        actions = '<button class="header-action-btn" onclick="openGameMenu()"><i class="fas fa-gamepad"></i></button><button class="header-action-btn" onclick="addMemberToGroup()"><i class="fas fa-user-plus"></i></button>';
    } else if (type === 'channel') {
        title = '# ' + target;
        document.getElementById('chatStatus').innerHTML = '📢 Публичный канал';
        socket.emit('joinChannel', target);
        actions = '<button class="header-action-btn" onclick="openGameMenu()"><i class="fas fa-gamepad"></i></button>';
    }
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatActions').innerHTML = actions;
    closeSidebar();
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    let text = input.value.trim();
    if (!text || !currentChatTarget) return;
    const reply = replyToMessage;
    cancelReply();
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text, reply: reply });
    input.value = '';
}

function sendSticker(s) {
    if (!currentChatTarget) return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: s });
    document.getElementById('stickerPicker').classList.remove('open');
}

function toggleStickerPicker() {
    document.getElementById('stickerPicker').classList.toggle('open');
}

function cancelReply() {
    replyToMessage = null;
    document.getElementById('replyIndicator').style.display = 'none';
}

function setReply(id, from, text) {
    replyToMessage = { id: id, from: from, text: text.substring(0, 50) };
    document.getElementById('replyPreview').innerHTML = '📎 Ответ ' + from + ': ' + text.substring(0, 40);
    document.getElementById('replyIndicator').style.display = 'flex';
}

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    let replyHtml = '';
    if (msg.replyTo) {
        replyHtml = '<div class="message-reply"><span style="color:#6366f1">↩️ ' + msg.replyTo.from + '</span>: ' + escapeHtml(msg.replyTo.text.substring(0, 50)) + '</div>';
    }
    let reactionsHtml = '';
    if (msg.reactions) {
        reactionsHtml = '<div class="message-reactions">';
        for (const r in msg.reactions) {
            reactionsHtml += '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'' + r + '\\')">' + r + ' ' + msg.reactions[r] + '</span>';
        }
        reactionsHtml += '</div>';
    }
    div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content">' + replyHtml + (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') + '<div class="message-text" ondblclick="setReply(\\'' + msg.id + '\\', \\'' + escapeHtml(msg.from) + '\\', \\'' + escapeHtml(msg.text) + '\\')">' + escapeHtml(msg.text) + '</div>' + reactionsHtml + '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div><div style="display:flex;gap:6px;margin-top:6px"><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'❤️\\')">❤️</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'👍\\')">👍</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😂\\')">😂</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😮\\')">😮</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😢\\')">😢</span></div></div></div>';
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = 9999;
}

function addReaction(msgId, reaction) {
    socket.emit('addReaction', { messageId: msgId, chatId: currentChatTarget, reaction: reaction });
}

// ГОЛОСОВЫЕ СООБЩЕНИЯ
async function toggleRecording() {
    if (isRecording) {
        if (mediaRecorder) mediaRecorder.stop();
        isRecording = false;
        document.getElementById('voiceBtn').classList.remove('recording');
        document.getElementById('voiceBtn').innerHTML = '<i class="fas fa-microphone"></i>';
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => socket.emit('voiceMessage', { type: currentChatType, target: currentChatTarget, audio: reader.result });
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        document.getElementById('voiceBtn').classList.add('recording');
        document.getElementById('voiceBtn').innerHTML = '<i class="fas fa-stop"></i>';
    } catch(e) {
        showToast('Нет доступа к микрофону');
    }
}

// ФАЙЛЫ
function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file || !currentChatTarget) return;
    const reader = new FileReader();
    reader.onloadend = () => socket.emit('fileMessage', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileData: reader.result });
    reader.readAsDataURL(file);
}

// ИГРЫ
function openGameMenu() {
    if (!currentChatTarget) {
        showToast('Выберите чат');
        return;
    }
    document.getElementById('gameMenuModal').classList.add('active');
}

function closeGameMenu() {
    document.getElementById('gameMenuModal').classList.remove('active');
}

function startGame(gameType) {
    closeGameMenu();
    currentGame = gameType;
    if (gameType === 'battleship') {
        startBattleship();
    } else if (gameType === 'tictactoe') {
        startTicTacToe();
    } else if (gameType === 'dice') {
        rollDice();
    } else if (gameType === 'darts') {
        playDarts();
    }
}

function startBattleship() {
    battleMyGrid = initBattleGrid();
    battleEnemyGrid = initEmptyGrid();
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.id = 'battleshipGame';
    gameDiv.innerHTML = '<div class="game-title"><i class="fas fa-ship"></i> МОРСКОЙ БОЙ</div><div class="game-boards"><div class="board"><div class="board-title">Ваше поле</div><div id="myBattleGrid" class="battle-grid"></div></div><div class="board"><div class="board-title">Поле противника</div><div id="enemyBattleGrid" class="battle-grid"></div></div></div><div class="game-controls"><button class="game-btn" onclick="resetBattleship()"><i class="fas fa-redo"></i> Новая игра</button><button class="game-btn" onclick="closeGame()"><i class="fas fa-times"></i> Закрыть</button></div>';
    document.getElementById('messages').appendChild(gameDiv);
    renderBattleGrid('myBattleGrid', battleMyGrid, true);
    renderBattleGrid('enemyBattleGrid', battleEnemyGrid, false);
}

function initBattleGrid() {
    const grid = Array(10).fill().map(() => Array(10).fill().map(() => ({ ship: false, hit: false, miss: false })));
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    ships.forEach(size => placeShip(grid, size));
    return grid;
}

function initEmptyGrid() {
    return Array(10).fill().map(() => Array(10).fill().map(() => ({ ship: false, hit: false, miss: false })));
}

function placeShip(grid, size) {
    let placed = false;
    while (!placed) {
        const horizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        if (canPlaceShip(grid, row, col, size, horizontal)) {
            for (let i = 0; i < size; i++) {
                const r = horizontal ? row : row + i;
                const c = horizontal ? col + i : col;
                if (r < 10 && c < 10) grid[r][c].ship = true;
            }
            placed = true;
        }
    }
}

function canPlaceShip(grid, row, col, size, horizontal) {
    for (let i = 0; i < size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        if (r >= 10 || c >= 10) return false;
        if (grid[r][c].ship) return false;
    }
    return true;
}

function renderBattleGrid(containerId, grid, isMyGrid) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '';
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            let cellClass = 'battle-cell';
            if (grid[i][j].hit) cellClass += ' hit';
            else if (grid[i][j].miss) cellClass += ' miss';
            else if (isMyGrid && grid[i][j].ship) cellClass += ' ship';
            html += '<div class="' + cellClass + '" onclick="battleAttack(' + i + ',' + j + ')"></div>';
        }
    }
    container.innerHTML = html;
}

function battleAttack(row, col) {
    if (!battleEnemyGrid) return;
    if (battleEnemyGrid[row][col].hit || battleEnemyGrid[row][col].miss) return;
    if (battleEnemyGrid[row][col].ship) {
        battleEnemyGrid[row][col].hit = true;
        showToast('💥 ПОПАДАНИЕ!');
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '💥 Попадание в Морском бое!' });
        renderBattleGrid('enemyBattleGrid', battleEnemyGrid, false);
        if (checkWin(battleEnemyGrid)) {
            showToast('🏆 ПОБЕДА!');
            socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🏆 Победа в Морском бое!' });
            closeGame();
        } else {
            setTimeout(() => computerAttack(), 500);
        }
    } else {
        battleEnemyGrid[row][col].miss = true;
        showToast('💧 МИМО!');
        renderBattleGrid('enemyBattleGrid', battleEnemyGrid, false);
        setTimeout(() => computerAttack(), 500);
    }
}

function computerAttack() {
    if (!battleMyGrid) return;
    let attacked = false;
    while (!attacked) {
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        if (!battleMyGrid[row][col].hit && !battleMyGrid[row][col].miss) {
            if (battleMyGrid[row][col].ship) {
                battleMyGrid[row][col].hit = true;
                showToast('😢 Противник попал!');
                socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '💥 Противник попал в ваш корабль!' });
            } else {
                battleMyGrid[row][col].miss = true;
                showToast('😅 Противник промахнулся!');
            }
            renderBattleGrid('myBattleGrid', battleMyGrid, true);
            attacked = true;
            if (checkWin(battleMyGrid)) {
                showToast('😭 Поражение!');
                socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '😭 Поражение в Морском бое!' });
                closeGame();
            }
        }
    }
}

function checkWin(grid) {
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (grid[i][j].ship && !grid[i][j].hit) return false;
        }
    }
    return true;
}

function resetBattleship() {
    closeGame();
    startBattleship();
}

function startTicTacToe() {
    tttBoard = ['', '', '', '', '', '', '', '', ''];
    tttCurrentPlayer = 'X';
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.id = 'tttGame';
    gameDiv.innerHTML = '<div class="game-title"><i class="fas fa-times"></i> КРЕСТИКИ-НОЛИКИ</div><div style="text-align:center;margin-bottom:12px">Сейчас ходит: <span id="tttTurn" style="color:#6366f1;font-weight:bold">X</span></div><div id="tttBoard" class="tic-grid" style="margin:0 auto"></div><div class="game-controls"><button class="game-btn" onclick="resetTicTacToe()"><i class="fas fa-redo"></i> Новая игра</button><button class="game-btn" onclick="closeGame()"><i class="fas fa-times"></i> Закрыть</button></div>';
    document.getElementById('messages').appendChild(gameDiv);
    renderTicTacToe();
}

function renderTicTacToe() {
    const container = document.getElementById('tttBoard');
    if (!container) return;
    let html = '';
    for (let i = 0; i < 9; i++) {
        html += '<div class="tic-cell" onclick="makeMove(' + i + ')">' + (tttBoard[i] || '') + '</div>';
    }
    container.innerHTML = html;
    const turnSpan = document.getElementById('tttTurn');
    if (turnSpan) turnSpan.innerText = tttCurrentPlayer;
}

function makeMove(index) {
    if (tttBoard[index] !== '' || tttCurrentPlayer !== 'X') return;
    tttBoard[index] = 'X';
    renderTicTacToe();
    const winner = checkTicTacToeWinner(tttBoard);
    if (winner) {
        showToast('🏆 ПОБЕДА!');
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🏆 Победа в крестики-нолики!' });
        closeGame();
        return;
    }
    if (tttBoard.every(c => c !== '')) {
        showToast('🤝 НИЧЬЯ!');
        closeGame();
        return;
    }
    tttCurrentPlayer = 'O';
    renderTicTacToe();
    setTimeout(() => computerMove(), 500);
}

function computerMove() {
    const empty = tttBoard.reduce((arr, cell, idx) => cell === '' ? [...arr, idx] : arr, []);
    if (empty.length > 0) {
        const move = empty[Math.floor(Math.random() * empty.length)];
        tttBoard[move] = 'O';
        renderTicTacToe();
        const winner = checkTicTacToeWinner(tttBoard);
        if (winner) {
            showToast('😢 Компьютер победил!');
            closeGame();
            return;
        }
        if (tttBoard.every(c => c !== '')) {
            showToast('🤝 НИЧЬЯ!');
            closeGame();
            return;
        }
        tttCurrentPlayer = 'X';
        renderTicTacToe();
    }
}

function checkTicTacToeWinner(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function resetTicTacToe() {
    closeGame();
    startTicTacToe();
}

function rollDice() {
    const dice = Math.floor(Math.random() * 6) + 1;
    const emoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice - 1];
    showToast('🎲 Выпало: ' + emoji + ' ' + dice);
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🎲 Бросок костей: ' + emoji + ' (' + dice + ')' });
}

function playDarts() {
    const score = Math.floor(Math.random() * 180) + 1;
    const msgs = ['🎯 БУЛЛСАЙ!', '🎯 Отлично!', '🎯 Хороший бросок!'];
    const msg = msgs[Math.floor(Math.random() * 3)];
    showToast(msg + ' ' + score + ' очков');
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🎯 Дартс: ' + msg + ' (' + score + ' очков)' });
}

function closeGame() {
    const gameDiv = document.querySelector('.game-container');
    if (gameDiv) gameDiv.remove();
    currentGame = null;
    battleMyGrid = null;
    battleEnemyGrid = null;
}

// ДРУЗЬЯ
function openAddFriend() {
    document.getElementById('addFriendModal').classList.add('active');
    document.getElementById('friendUsername').value = '';
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}

function addFriend() {
    const u = document.getElementById('friendUsername').value.trim();
    if (!u) {
        showToast('Введите логин');
        return;
    }
    socket.emit('addFriend', { friendUsername: u }, (res) => {
        showToast(res.message || res.error);
        closeAddFriendModal();
        loadData();
    });
}

function acceptFriend(f) {
    socket.emit('acceptFriend', { fromUser: f }, () => loadData());
}

function rejectFriend(f) {
    socket.emit('rejectFriend', { fromUser: f }, () => loadData());
}

// ГРУППЫ
function openCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
    document.getElementById('groupName').value = '';
}

function closeCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('active');
}

function createGroup() {
    const n = document.getElementById('groupName').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createGroup', { groupName: n }, (res) => {
        if (res.success) {
            showToast('Группа создана');
            closeCreateGroupModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

function addMemberToGroup() {
    const u = prompt('Логин пользователя:');
    if (u) {
        socket.emit('addGroupMember', { groupId: currentChatTarget, username: u }, (res) => {
            showToast(res.message || res.error);
        });
    }
}

// КАНАЛЫ
function openCreateChannel() {
    document.getElementById('createChannelModal').classList.add('active');
    document.getElementById('channelName').value = '';
}

function closeCreateChannelModal() {
    document.getElementById('createChannelModal').classList.remove('active');
}

function createChannel() {
    const n = document.getElementById('channelName').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createChannel', { channelName: n }, (res) => {
        if (res.success) {
            showToast('Канал создан');
            closeCreateChannelModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

// ПРОФИЛЬ
function openProfile() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function uploadAvatar() {
    const file = document.getElementById('avatarUpload').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('uploadAvatar', { avatar: reader.result }, (res) => {
            if (res.success) {
                currentUserData = res.userData;
                updateUI();
                showToast('Аватар обновлён');
                closeProfileModal();
            }
        });
    };
    reader.readAsDataURL(file);
}

function saveProfile() {
    const data = {
        name: document.getElementById('editName').value.trim(),
        bio: document.getElementById('editBio').value.trim()
    };
    const pwd = document.getElementById('editPassword').value.trim();
    if (pwd) data.password = pwd;
    socket.emit('updateProfile', data, (res) => {
        if (res.success) {
            currentUserData = res.userData;
            updateUI();
            closeProfileModal();
            showToast('Профиль обновлён');
        }
    });
}

// ТЕМА
function openThemeSettings() {
    document.getElementById('themeModal').classList.add('active');
}

function closeThemeModal() {
    document.getElementById('themeModal').classList.remove('active');
}

function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light');
        localStorage.setItem('theme', 'dark');
    }
    closeThemeModal();
    showToast('Тема изменена');
}

// ИСТОРИИ
function addStory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            socket.emit('addStory', { media: reader.result, type: file.type.startsWith('image/') ? 'image' : 'video' });
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function viewStory(username) {
    socket.emit('getStory', username);
}

function closeStoryViewer() {
    document.getElementById('storyViewer').classList.remove('active');
    const v = document.getElementById('storyVideo');
    if (v) {
        v.pause();
        v.src = '';
    }
}

function loadStories() {
    socket.emit('getStories');
}

// UI функции
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<i class="fas fa-info-circle"></i> ' + msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Индикатор печати
document.getElementById('messageInput').addEventListener('input', () => {
    if (currentChatTarget) {
        socket.emit('typing', { type: currentChatType, target: currentChatTarget });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping', { type: currentChatType, target: currentChatTarget });
        }, 1000);
    }
});

// СОБЫТИЯ СОКЕТА
socket.on('friendsUpdate', (d) => {
    allFriends = d.friends || [];
    friendRequests = d.requests || [];
    renderFriends();
});

socket.on('groupsUpdate', (g) => {
    allGroups = g;
    renderGroups();
});

socket.on('channelsUpdate', (c) => {
    allChannels = c;
    renderChannels();
});

socket.on('chatHistory', (d) => {
    if (currentChatTarget === d.target) {
        document.getElementById('messages').innerHTML = '';
        for (let i = 0; i < d.messages.length; i++) {
            addMessage(d.messages[i]);
        }
    }
});

socket.on('newMessage', (m) => {
    let show = false;
    if (currentChatTarget === m.target || currentChatTarget === m.from) show = true;
    if (currentChatType === 'group' && m.target === currentChatTarget) show = true;
    if (show) {
        addMessage(m);
    }
    if (m.from !== currentUser) {
        showToast('Новое сообщение от ' + m.from);
    }
});

socket.on('voiceMessage', (d) => {
    if (currentChatTarget === d.target || currentChatTarget === d.from) {
        const div = document.createElement('div');
        div.className = 'message ' + (d.from === currentUser ? 'mine' : '');
        div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><div class="voice-message"><button class="voice-play" onclick="playAudio(this, \\'' + d.audio + '\\')"><i class="fas fa-play"></i></button><span>Голосовое сообщение</span></div><div class="message-time">' + (d.time || new Date().toLocaleTimeString()) + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});

socket.on('fileMessage', (d) => {
    if (currentChatTarget === d.target || currentChatTarget === d.from) {
        const div = document.createElement('div');
        div.className = 'message ' + (d.from === currentUser ? 'mine' : '');
        div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><a class="file-attachment" href="' + d.fileData + '" download="' + d.fileName + '"><i class="fas fa-file"></i> ' + escapeHtml(d.fileName) + '</a><div class="message-time">' + (d.time || new Date().toLocaleTimeString()) + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});

socket.on('typing', (d) => {
    if (currentChatTarget === d.user || currentChatTarget === d.channel) {
        document.getElementById('typingIndicator').style.display = 'flex';
        setTimeout(() => {
            document.getElementById('typingIndicator').style.display = 'none';
        }, 1500);
    }
});

socket.on('userOnline', (u) => {
    onlineUsers.add(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = 'Онлайн';
    }
    renderFriends();
});

socket.on('userOffline', (u) => {
    onlineUsers.delete(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = 'Офлайн';
    }
    renderFriends();
});

socket.on('storiesUpdate', (s) => {
    const container = document.getElementById('storiesRow');
    let html = '<div class="story-item" onclick="addStory()"><div class="story-circle add"><div class="story-avatar"><i class="fas fa-plus"></i></div></div><div class="story-name">Моя</div></div>';
    for (let i = 0; i < s.length; i++) {
        html += '<div class="story-item" onclick="viewStory(\\'' + s[i].username + '\\')"><div class="story-circle"><div class="story-avatar">' + (s[i].avatar || '👤') + '</div></div><div class="story-name">' + (s[i].name || s[i].username) + '</div></div>';
    }
    container.innerHTML = html;
});

socket.on('storyData', (d) => {
    const viewer = document.getElementById('storyViewer');
    const img = document.getElementById('storyImage');
    const video = document.getElementById('storyVideo');
    if (d.type === 'image') {
        img.style.display = 'block';
        video.style.display = 'none';
        img.src = d.media;
    } else {
        img.style.display = 'none';
        video.style.display = 'block';
        video.src = d.media;
        video.play();
    }
    viewer.classList.add('active');
    let progress = 0;
    const interval = setInterval(() => {
        progress += 2;
        document.getElementById('storyProgressBar').style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            closeStoryViewer();
        }
    }, 100);
});

function playAudio(btn, audioData) {
    const audio = new Audio(audioData);
    audio.play();
    btn.innerHTML = '<i class="fas fa-pause"></i>';
    audio.onended = () => {
        btn.innerHTML = '<i class="fas fa-play"></i>';
    };
    btn.onclick = () => {
        if (audio.paused) {
            audio.play();
            btn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audio.pause();
            btn.innerHTML = '<i class="fas fa-play"></i>';
        }
    };
}

// Восстановление темы
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light');
}

const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) {
    document.getElementById('loginUsername').value = savedUser;
}
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ (СЕРВЕР) ==========
const userSockets = new Map();
const onlineSet = new Set();

function getSocketByUsername(username) {
    for (const [id, user] of userSockets) if (user === username) return io.sockets.sockets.get(id);
    return null;
}

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('register', (data, cb) => {
        const { username, name, password } = data;
        if (users[username]) {
            cb({ success: false, error: 'Пользователь уже существует' });
        } else {
            users[username] = { username, name: name || username, password, bio: '', avatar: null, friends: [], friendRequests: [] };
            saveData();
            cb({ success: true });
        }
    });

    socket.on('login', (data, cb) => {
        const { username, password } = data;
        const user = users[username];
        if (!user) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (user.password !== password) {
            cb({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            socket.username = username;
            userSockets.set(socket.id, username);
            onlineSet.add(username);
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
            socket.emit('friendsUpdate', { friends: user.friends || [], requests: user.friendRequests || [] });
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
            socket.emit('channelsUpdate', Object.keys(channels));
            socket.broadcast.emit('userOnline', username);
            io.emit('storiesUpdate', getActiveStories());
        }
    });

    socket.on('updateProfile', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            if (data.name) user.name = data.name;
            if (data.bio) user.bio = data.bio;
            if (data.password) user.password = data.password;
            if (data.avatar) user.avatar = data.avatar;
            saveData();
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
        } else {
            cb({ success: false });
        }
    });

    socket.on('uploadAvatar', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            user.avatar = data.avatar;
            saveData();
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
        } else {
            cb({ success: false });
        }
    });

    socket.on('getFriends', (cb) => {
        if (currentUser && users[currentUser]) {
            cb({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [] });
        } else {
            cb({ friends: [], requests: [] });
        }
    });

    socket.on('getGroups', (cb) => {
        if (currentUser) {
            cb(Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
        } else {
            cb([]);
        }
    });

    socket.on('getChannels', (cb) => {
        cb(Object.keys(channels));
    });

    socket.on('addFriend', (data, cb) => {
        const { friendUsername } = data;
        const user = users[currentUser];
        const friend = users[friendUsername];
        if (!friend) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (friendUsername === currentUser) {
            cb({ success: false, error: 'Нельзя добавить себя' });
        } else if (user.friends && user.friends.includes(friendUsername)) {
            cb({ success: false, error: 'Уже в друзьях' });
        } else if (friend.friendRequests && friend.friendRequests.includes(currentUser)) {
            cb({ success: false, error: 'Запрос уже отправлен' });
        } else {
            if (!friend.friendRequests) friend.friendRequests = [];
            friend.friendRequests.push(currentUser);
            saveData();
            cb({ success: true, message: 'Запрос отправлен' });
            const fs = getSocketByUsername(friendUsername);
            if (fs) {
                fs.emit('friendsUpdate', { friends: friend.friends || [], requests: friend.friendRequests || [] });
            }
        }
    });

    socket.on('acceptFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        const from = users[fromUser];
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            if (!user.friends) user.friends = [];
            if (!from.friends) from.friends = [];
            user.friends.push(fromUser);
            from.friends.push(currentUser);
            saveData();
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
            const fs = getSocketByUsername(fromUser);
            if (fs) {
                fs.emit('friendsUpdate', { friends: from.friends, requests: from.friendRequests });
            }
        }
    });

    socket.on('rejectFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
        }
    });

    socket.on('createGroup', (data, cb) => {
        const { groupName } = data;
        const id = 'group_' + Date.now();
        groups[id] = { id, name: groupName, members: [currentUser], messages: [] };
        saveData();
        cb({ success: true });
        socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
    });

    socket.on('addGroupMember', (data, cb) => {
        const { groupId, username } = data;
        const group = groups[groupId];
        if (group && group.members && !group.members.includes(username) && users[username]) {
            group.members.push(username);
            saveData();
            cb({ success: true, message: 'Участник добавлен' });
            const us = getSocketByUsername(username);
            if (us) {
                us.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(username)));
            }
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
        } else {
            cb({ success: false, error: 'Не удалось добавить' });
        }
    });

    socket.on('joinGroup', (id) => {
        if (groups[id] && groups[id].members && groups[id].members.includes(currentUser)) {
            socket.emit('chatHistory', { target: id, messages: groups[id].messages || [] });
        }
    });

    socket.on('createChannel', (data, cb) => {
        const { channelName } = data;
        if (channels[channelName]) {
            cb({ success: false, error: 'Канал уже существует' });
        } else {
            channels[channelName] = { name: channelName, messages: [] };
            saveData();
            cb({ success: true });
            io.emit('channelsUpdate', Object.keys(channels));
        }
    });

    socket.on('joinChannel', (name) => {
        if (channels[name]) {
            socket.emit('chatHistory', { target: name, messages: channels[name].messages || [] });
        }
    });

    socket.on('joinPrivate', (target) => {
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chatHistory', { target: target, messages: privateChats[id].messages || [] });
    });

    socket.on('sendMessage', (data) => {
        const { type, target, text, reply } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), target: target };
        if (reply) msg.replyTo = reply;
        if (type === 'private') {
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('newMessage', msg);
        } else if (type === 'group') {
            if (groups[target] && groups[target].members && groups[target].members.includes(currentUser)) {
                groups[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
                if (groups[target].members) {
                    groups[target].members.forEach(m => {
                        if (m !== currentUser) {
                            const ms = getSocketByUsername(m);
                            if (ms) ms.emit('newMessage', msg);
                        }
                    });
                }
            }
        } else if (type === 'channel') {
            if (channels[target]) {
                channels[target].messages.push(msg);
                saveData();
                io.emit('newMessage', msg);
            }
        }
    });

    socket.on('addReaction', (data) => {
        const { messageId, chatId, reaction } = data;
        let chat = privateChats[chatId] || channels[chatId] || groups[chatId];
        if (chat && chat.messages) {
            const msg = chat.messages.find(m => m.id == messageId);
            if (msg) {
                if (!msg.reactions) msg.reactions = {};
                msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1;
                saveData();
                io.emit('reactionUpdate', { messageId, reactions: msg.reactions });
            }
        }
    });

    socket.on('voiceMessage', (data) => {
        const { type, target, audio } = data;
        const msg = { id: Date.now(), from: currentUser, audio, time: new Date().toLocaleTimeString(), target: target };
        if (type === 'private') {
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            saveData();
            socket.emit('voiceMessage', msg);
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('voiceMessage', msg);
        }
    });

    socket.on('fileMessage', (data) => {
        const { type, target, fileName, fileData } = data;
        const msg = { id: Date.now(), from: currentUser, fileName, fileData, time: new Date().toLocaleTimeString(), target: target };
        if (type === 'private') {
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            saveData();
            socket.emit('fileMessage', msg);
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('fileMessage', msg);
        }
    });

    socket.on('addStory', (data) => {
        const { media, type } = data;
        if (!stories[currentUser]) stories[currentUser] = [];
        stories[currentUser].push({ media, type, time: Date.now() });
        if (stories[currentUser].length > 10) stories[currentUser].shift();
        saveData();
        io.emit('storiesUpdate', getActiveStories());
    });

    socket.on('getStories', () => {
        socket.emit('storiesUpdate', getActiveStories());
    });

    socket.on('getStory', (username) => {
        if (stories[username] && stories[username].length > 0) {
            const story = stories[username][stories[username].length - 1];
            socket.emit('storyData', story);
        }
    });

    socket.on('typing', (data) => {
        const { type, target } = data;
        if (type === 'private') {
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('typing', { user: currentUser });
        }
    });

    socket.on('stopTyping', (data) => {
        const { type, target } = data;
        if (type === 'private') {
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('stopTyping');
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            onlineSet.delete(currentUser);
            socket.broadcast.emit('userOffline', currentUser);
        }
    });
});

function getActiveStories() {
    const active = [];
    const now = Date.now();
    for (const [username, userStories] of Object.entries(stories)) {
        if (userStories && userStories.length > 0 && now - userStories[userStories.length - 1].time < 86400000 && users[username]) {
            active.push({ username, name: users[username].name, avatar: users[username].avatar });
        }
    }
    return active;
}

function startKeepAliveBot() {
    const PORT = process.env.PORT || 3000;
    const url = `http://localhost:${PORT}`;
    console.log('\\n🤖 AWAKE-BOT ЗАПУЩЕН! Сервер не уснёт\\n');
    setInterval(async () => {
        try { await fetch(url); } catch(e) {}
    }, 4 * 60 * 1000);
    setTimeout(async () => {
        try { await fetch(url); } catch(e) {}
    }, 30000);
}

if (process.env.RENDER || true) {
    startKeepAliveBot();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🚀 ATOMGRAM ULTRA 10GB — МЕССЕНДЖЕР БУДУЩЕГО          ║
╠═══════════════════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                               ║
║  📱 http://localhost:${PORT}                               ║
╠═══════════════════════════════════════════════════════════╣
║  ✨ МЕГА-ФИШКИ (10GB ОБНОВЛЕНИЕ):                         ║
║  🎨 УЛЬТРА-СОВРЕМЕННЫЙ ДИЗАЙН                             ║
║  🌓 ТЁМНАЯ/СВЕТЛАЯ ТЕМА (сохраняется)                     ║
║  💬 ЛИЧНЫЕ СООБЩЕНИЯ + ОТВЕТЫ                             ║
║  👥 ГРУППЫ (до 200 участников)                           ║
║  📢 КАНАЛЫ                                                ║
║  👤 ДРУЗЬЯ с запросами                                    ║
║  🎤 ГОЛОСОВЫЕ СООБЩЕНИЯ                                  ║
║  📎 ФАЙЛЫ И ИЗОБРАЖЕНИЯ                                  ║
║  😀 40+ СТИКЕРОВ                                          ║
║  ❤️ РЕАКЦИИ (❤️👍😂😮😢)                                  ║
║  📸 ИСТОРИИ (как в Telegram)                             ║
║  ⚓ МОРСКОЙ БОЙ (с ИИ)                                   ║
║  ❌ КРЕСТИКИ-НОЛИКИ (чичико)                             ║
║  🎲 КОСТИ                                                ║
║  🎯 ДАРТС                                                ║
║  ⌨️ ИНДИКАТОР ПЕЧАТИ                                     ║
║  🟢 ОНЛАЙН-СТАТУС                                        ║
║  🖼️ АВАТАРЫ ПОЛЬЗОВАТЕЛЕЙ                                ║
║  🎨 АНИМИРОВАННЫЙ ГРАДИЕНТНЫЙ ФОН                        ║
║  🌟 ПЛАВНЫЕ АНИМАЦИИ И ПЕРЕХОДЫ                          ║
║  📱 АДАПТИВНЫЙ ДИЗАЙН (телефон/планшет/ПК)               ║
║  🤖 AWAKE-BOT (сервер не спит 24/7)                     ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
