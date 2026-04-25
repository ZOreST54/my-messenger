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

let users = {};
let privateChats = {};
let groups = {};

const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        groups = data.groups || {};
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, groups }, null, 2));
}
setInterval(saveData, 10000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM — Мессенджер</title>
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
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Экран входа */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
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
            font-size: 32px;
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
            padding: 14px;
            margin: 8px 0;
            background: #2c2c2e;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            color: #fff;
        }
        .auth-card button {
            width: 100%;
            padding: 14px;
            margin-top: 12px;
            background: #007aff;
            color: #fff;
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
        }

        /* Приложение */
        .app {
            display: none;
            height: 100vh;
            flex-direction: column;
        }

        /* Шапка */
        .header {
            background: #1c1c1e;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid #2c2c2e;
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #007aff;
            display: none;
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
            background: #1c1c1e;
            border-right: 1px solid #2c2c2e;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s;
            z-index: 100;
        }
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -280px;
                top: 0;
                height: 100%;
                z-index: 200;
            }
            .sidebar.open { left: 0; }
            .menu-btn { display: block; }
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
            .overlay.open { display: block; }
        }
        @media (min-width: 769px) {
            .sidebar { position: relative; left: 0 !important; }
        }

        /* Профиль */
        .profile {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid #2c2c2e;
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
        }
        .nav-item:hover {
            background: #2c2c2e;
        }
        .section-title {
            padding: 16px 20px 8px;
            font-size: 12px;
            color: #8e8e93;
            text-transform: uppercase;
        }

        /* Списки чатов */
        .chats-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px 12px;
        }
        .chat-item {
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            border-radius: 14px;
            transition: all 0.2s;
        }
        .chat-item:hover {
            background: #2c2c2e;
            transform: translateX(4px);
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
            flex-shrink: 0;
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
            color: #34c759;
            margin-top: 2px;
        }
        .chat-status.offline {
            color: #8e8e93;
        }

        /* Область чата */
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #000000;
        }
        .chat-header {
            padding: 12px 16px;
            background: #1c1c1e;
            border-bottom: 1px solid #2c2c2e;
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
            animation: fadeIn 0.2s;
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
            background: #1c1c1e;
            border-top: 1px solid #2c2c2e;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .input-area input {
            flex: 1;
            padding: 10px 14px;
            background: #2c2c2e;
            border: none;
            border-radius: 20px;
            color: #fff;
            font-size: 15px;
        }
        .input-area button {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #007aff;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 18px;
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
            border-bottom: 1px solid #2c2c2e;
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
            color: #fff;
            font-size: 24px;
            cursor: pointer;
        }
        .modal-body {
            padding: 20px;
        }
        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid #2c2c2e;
            display: flex;
            gap: 12px;
        }
        .modal-input {
            width: 100%;
            padding: 14px;
            background: #2c2c2e;
            border: none;
            border-radius: 12px;
            color: #fff;
            font-size: 15px;
            margin-bottom: 16px;
        }
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: #007aff;
            border: none;
            border-radius: 12px;
            color: #fff;
            font-weight: 600;
            cursor: pointer;
        }
        .modal-btn.cancel {
            background: #2c2c2e;
        }

        /* Уведомления */
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
    </style>
</head>
<body>

<!-- Экран входа -->
<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div class="subtitle">Быстрый и безопасный мессенджер</div>
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
            <div class="section-title">ЧАТЫ</div>
            <div class="chats-list" id="chatsList"></div>
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
<div id="addFriendModal" class="modal">
    <div class="modal-content">
        <div class="modal-header"><h3>Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div>
        <div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div>
        <div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div>
    </div>
</div>

<div id="createGroupModal" class="modal">
    <div class="modal-content">
        <div class="modal-header"><h3>Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div>
        <div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div>
        <div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div>
    </div>
</div>

<div id="profileModal" class="modal">
    <div class="modal-content">
        <div class="modal-header"><h3>Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div>
        <div class="modal-body">
            <div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:80px;height:80px;font-size:36px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:#2c2c2e;border:none;padding:8px 16px;border-radius:20px;color:white;cursor:pointer">📷 Загрузить</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div>
            <input type="text" id="editName" class="modal-input" placeholder="Ваше имя">
            <textarea id="editBio" class="modal-input" rows="2" placeholder="О себе"></textarea>
            <input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль">
        </div>
        <div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentChatTarget = null;
let allFriends = [];
let friendRequests = [];
let allGroups = [];
let onlineUsers = new Set();
let isMobile = window.innerWidth <= 768;

// АВТОРИЗАЦИЯ
function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    
    console.log('Попытка входа:', u);
    socket.emit('login', { username: u, password: p }, (res) => {
        console.log('Ответ сервера:', res);
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
    
    console.log('Попытка регистрации:', u);
    socket.emit('register', { username: u, name: n, password: p }, (res) => {
        console.log('Ответ сервера:', res);
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
    });
}

function renderChats() {
    let html = '';
    for (let i = 0; i < friendRequests.length; i++) {
        const r = friendRequests[i];
        html += '<div class="chat-item" style="background:rgba(0,122,255,0.15)">' +
            '<div class="chat-avatar">📨</div>' +
            '<div class="chat-info"><div class="chat-name">' + r + '</div><div class="chat-status">Запрос в друзья</div></div>' +
            '<button onclick="acceptFriend(\\'' + r + '\\')" style="background:#34c759;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✓</button>' +
            '<button onclick="rejectFriend(\\'' + r + '\\')" style="background:#ff3b30;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✗</button>' +
        '</div>';
    }
    for (let i = 0; i < allFriends.length; i++) {
        const f = allFriends[i];
        const online = onlineUsers.has(f);
        html += '<div class="chat-item" onclick="openChat(\\'' + f + '\\')">' +
            '<div class="chat-avatar">👤' + (online ? '<div style="position:absolute;bottom:2px;right:2px;width:12px;height:12px;background:#34c759;border-radius:50%;border:2px solid #1c1c1e"></div>' : '') + '</div>' +
            '<div class="chat-info"><div class="chat-name">' + f + '</div><div class="chat-status ' + (online ? 'online' : 'offline') + '">' + (online ? 'Онлайн' : 'Офлайн') + '</div></div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#8e8e93">Нет чатов</div>';
    document.getElementById('chatsList').innerHTML = html;
}

function openChat(target) {
    currentChatTarget = target;
    document.getElementById('chatTitle').innerHTML = target;
    document.getElementById('chatAvatar').innerHTML = '👤';
    document.getElementById('chatStatus').innerHTML = onlineUsers.has(target) ? 'Онлайн' : '';
    if (onlineUsers.has(target)) {
        document.getElementById('chatStatus').classList.add('online');
    } else {
        document.getElementById('chatStatus').classList.remove('online');
    }
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('messages').innerHTML = '';
    
    socket.emit('joinPrivate', target);
    
    if (isMobile) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    }
}

function closeChat() {
    currentChatTarget = null;
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
    socket.emit('sendMessage', { target: currentChatTarget, text: text });
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

// СОБЫТИЯ СОКЕТА
socket.on('friendsUpdate', () => loadData());
socket.on('groupsUpdate', () => loadData());
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
    if (msg.from !== currentUser) {
        showToast('Новое сообщение от ' + msg.from);
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
    console.log('✅ Клиент подключился:', socket.id);
    let currentUser = null;

    // РЕГИСТРАЦИЯ
    socket.on('register', (data, cb) => {
        const { username, name, password } = data;
        console.log('📝 Регистрация:', username);
        
        if (users[username]) {
            cb({ success: false, error: 'Пользователь уже существует' });
        } else {
            users[username] = { 
                username, 
                name: name || username, 
                password: password, 
                bio: '', 
                avatar: null, 
                friends: [], 
                friendRequests: [] 
            };
            saveData();
            console.log('✅ Зарегистрирован:', username);
            cb({ success: true });
        }
    });

    // ЛОГИН
    socket.on('login', (data, cb) => {
        const { username, password } = data;
        console.log('🔑 Логин:', username);
        
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
            
            cb({ 
                success: true, 
                userData: { 
                    username: user.username, 
                    name: user.name, 
                    bio: user.bio, 
                    avatar: user.avatar 
                } 
            });
            
            console.log('✅ Вошёл:', username);
            
            socket.emit('friendsUpdate', { 
                friends: user.friends || [], 
                requests: user.friendRequests || [] 
            });
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
            socket.broadcast.emit('userOnline', username);
        }
    });

    // ОБНОВЛЕНИЕ ПРОФИЛЯ
    socket.on('updateProfile', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            if (data.name) user.name = data.name;
            if (data.bio) user.bio = data.bio;
            if (data.password) user.password = data.password;
            saveData();
            cb({ 
                success: true, 
                userData: { 
                    username: user.username, 
                    name: user.name, 
                    bio: user.bio, 
                    avatar: user.avatar 
                } 
            });
        } else {
            cb({ success: false });
        }
    });

    // ЗАГРУЗКА АВАТАРА
    socket.on('uploadAvatar', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            user.avatar = data.avatar;
            saveData();
            cb({ 
                success: true, 
                userData: { 
                    username: user.username, 
                    name: user.name, 
                    bio: user.bio, 
                    avatar: user.avatar 
                } 
            });
        } else {
            cb({ success: false });
        }
    });

    // ПОЛУЧИТЬ ДРУЗЕЙ
    socket.on('getFriends', (cb) => {
        if (currentUser && users[currentUser]) {
            cb({ 
                friends: users[currentUser].friends || [], 
                requests: users[currentUser].friendRequests || [] 
            });
        } else {
            cb({ friends: [], requests: [] });
        }
    });

    // ПОЛУЧИТЬ ГРУППЫ
    socket.on('getGroups', (cb) => {
        if (currentUser) {
            cb(Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
        } else {
            cb([]);
        }
    });

    // ДОБАВИТЬ ДРУГА
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
                fs.emit('friendsUpdate', { 
                    friends: friend.friends || [], 
                    requests: friend.friendRequests || [] 
                });
            }
        }
    });

    // ПРИНЯТЬ ДРУГА
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
            
            socket.emit('friendsUpdate', { 
                friends: user.friends, 
                requests: user.friendRequests 
            });
            
            const fs = getSocketByUsername(fromUser);
            if (fs) {
                fs.emit('friendsUpdate', { 
                    friends: from.friends, 
                    requests: from.friendRequests 
                });
            }
        }
    });

    // ОТКЛОНИТЬ ДРУГА
    socket.on('rejectFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friendsUpdate', { 
                friends: user.friends, 
                requests: user.friendRequests 
            });
        }
    });

    // СОЗДАТЬ ГРУППУ
    socket.on('createGroup', (data, cb) => {
        const { groupName } = data;
        const id = 'group_' + Date.now();
        
        groups[id] = { 
            id: id, 
            name: groupName, 
            members: [currentUser], 
            messages: [] 
        };
        saveData();
        cb({ success: true });
        socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
    });

    // ПРИСОЕДИНИТЬСЯ К ЧАТУ
    socket.on('joinPrivate', (target) => {
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chatHistory', { 
            target: target, 
            messages: privateChats[id].messages || [] 
        });
    });

    // ОТПРАВИТЬ СООБЩЕНИЕ
    socket.on('sendMessage', (data) => {
        const { target, text } = data;
        const msg = { 
            id: Date.now(), 
            from: currentUser, 
            text: text, 
            time: new Date().toLocaleTimeString(), 
            target: target 
        };
        
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        privateChats[id].messages.push(msg);
        saveData();
        
        socket.emit('newMessage', msg);
        
        const ts = getSocketByUsername(target);
        if (ts) {
            ts.emit('newMessage', msg);
        }
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            onlineSet.delete(currentUser);
            socket.broadcast.emit('userOffline', currentUser);
            console.log('👋 Отключился:', currentUser);
        }
    });
});

function startKeepAliveBot() {
    const PORT = process.env.PORT || 3000;
    const url = `http://localhost:${PORT}`;
    console.log('\n🤖 AWAKE-BOT ЗАПУЩЕН! Сервер не уснёт\n');
    setInterval(async () => { try { await fetch(url); } catch(e) {} }, 4 * 60 * 1000);
    setTimeout(async () => { try { await fetch(url); } catch(e) {} }, 30000);
}

if (process.env.RENDER || true) startKeepAliveBot();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 ATOMGRAM ЗАПУЩЕН НА ${PORT} ПОРТУ      ║
╠════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                  ║
╠════════════════════════════════════════════╣
║  ✨ ФУНКЦИИ:                               ║
║  💬 Личные сообщения                        ║
║  👥 Группы                                 ║
║  👤 Друзья                                ║
║  🖼️ Аватары                               ║
║  🟢 Онлайн-статус                          ║
║  📱 Адаптивный дизайн                      ║
║  🤖 Awake-bot (сервер не спит)             ║
╚════════════════════════════════════════════╝
    `);
});
