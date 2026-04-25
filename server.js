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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ATOMGRAM — Мессенджер Будущего</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        :root {
            --bg: radial-gradient(circle at 20% 30%, #0f0c29, #1a1a2e, #24243e);
            --surface: rgba(28, 28, 30, 0.7);
            --surface-elevated: rgba(40, 40, 45, 0.8);
            --input: rgba(28, 28, 30, 0.9);
            --text: #ffffff;
            --text-secondary: #a1a1aa;
            --text-muted: #52525b;
            --accent: #6366f1;
            --accent-light: #818cf8;
            --accent-gradient: linear-gradient(135deg, #6366f1, #a855f7);
            --success: #10b981;
            --error: #ef4444;
            --border: rgba(255,255,255,0.08);
            --shadow: 0 8px 32px rgba(0,0,0,0.3);
            --glass: rgba(255,255,255,0.03);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            height: 100vh;
            overflow: hidden;
        }

        /* Анимации */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
            0%,100% { box-shadow: 0 0 5px rgba(99,102,241,0.5); }
            50% { box-shadow: 0 0 20px rgba(99,102,241,0.8); }
        }
        @keyframes float {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes pulse {
            0%,100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Экран входа */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--bg);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .auth-card {
            background: var(--surface);
            backdrop-filter: blur(20px);
            padding: 48px 40px;
            border-radius: 48px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            animation: slideUp 0.5s;
        }
        .auth-card h1 {
            font-size: 48px;
            margin-bottom: 12px;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -1px;
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
            background: var(--input);
            border: 1px solid var(--border);
            border-radius: 24px;
            font-size: 16px;
            color: var(--text);
            transition: all 0.3s;
        }
        .auth-card input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
        }
        .auth-card button {
            width: 100%;
            padding: 16px;
            margin-top: 16px;
            background: var(--accent-gradient);
            color: white;
            border: none;
            border-radius: 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .auth-card button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(99,102,241,0.4);
        }
        .switch-btn {
            background: rgba(255,255,255,0.1) !important;
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
            flex-direction: column;
        }

        /* Шапка */
        .header {
            background: var(--surface);
            backdrop-filter: blur(20px);
            padding: 12px 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            border-bottom: 1px solid var(--border);
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text);
            display: none;
            padding: 8px;
            border-radius: 12px;
            transition: all 0.2s;
        }
        .menu-btn:hover {
            background: var(--glass);
        }
        .logo {
            font-size: 20px;
            font-weight: 700;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }
        .online-badge {
            margin-left: auto;
            font-size: 12px;
            color: var(--success);
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(16,185,129,0.1);
            padding: 6px 12px;
            border-radius: 20px;
        }
        .online-badge::before {
            content: '';
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            animation: pulse 1s infinite;
        }

        /* Контейнер */
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* Боковая панель */
        .sidebar {
            width: 320px;
            background: var(--surface);
            backdrop-filter: blur(20px);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s;
            z-index: 100;
        }
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -320px;
                top: 60px;
                height: calc(100vh - 60px);
                z-index: 200;
            }
            .sidebar.open { left: 0; }
            .menu-btn { display: block; }
            .overlay {
                position: fixed;
                top: 60px;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(4px);
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
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            transition: all 0.2s;
        }
        .profile:hover {
            background: var(--glass);
        }
        .avatar {
            width: 80px;
            height: 80px;
            background: var(--accent-gradient);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 12px;
            transition: all 0.3s;
            animation: float 3s ease infinite;
        }
        .avatar:hover {
            transform: scale(1.05);
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
        .nav-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            border-radius: 12px;
            margin: 4px 12px;
            transition: all 0.2s;
        }
        .nav-item:hover {
            background: var(--glass);
            transform: translateX(4px);
        }
        .section-title {
            padding: 16px 20px 8px;
            font-size: 12px;
            color: var(--text-secondary);
            letter-spacing: 0.5px;
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
            background: var(--glass);
            transform: translateX(4px);
        }
        .chat-avatar {
            width: 52px;
            height: 52px;
            background: var(--surface-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
            position: relative;
        }
        .online-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: var(--success);
            border-radius: 50%;
            border: 2px solid var(--surface);
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
            color: var(--text-secondary);
            margin-top: 2px;
        }
        .chat-status.online {
            color: var(--success);
        }

        /* Область чата */
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: rgba(0,0,0,0.3);
        }
        .chat-header {
            padding: 16px 24px;
            background: var(--surface);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .chat-header-avatar {
            width: 48px;
            height: 48px;
            background: var(--surface-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .chat-header-info {
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
        .chat-header-status.online {
            color: var(--success);
        }

        /* Сообщения */
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .message {
            display: flex;
            gap: 12px;
            max-width: 75%;
            animation: fadeIn 0.3s;
        }
        .message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        .message-avatar {
            width: 36px;
            height: 36px;
            background: var(--surface-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        }
        .message-bubble {
            max-width: calc(100% - 48px);
        }
        .message-content {
            padding: 10px 16px;
            border-radius: 20px;
            background: var(--surface-elevated);
            backdrop-filter: blur(10px);
        }
        .message.mine .message-content {
            background: var(--accent-gradient);
        }
        .message-name {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--text-secondary);
        }
        .message-text {
            font-size: 15px;
            line-height: 1.4;
            word-break: break-word;
        }
        .message-time {
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 4px;
            text-align: right;
        }

        /* Панель ввода */
        .input-area {
            padding: 16px 20px;
            background: var(--surface);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
        }
        .input-area input {
            flex: 1;
            padding: 12px 18px;
            background: var(--input);
            border: 1px solid var(--border);
            border-radius: 28px;
            font-size: 15px;
            color: var(--text);
            transition: all 0.3s;
        }
        .input-area input:focus {
            outline: none;
            border-color: var(--accent);
        }
        .input-area button {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--accent-gradient);
            border: none;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
        }
        .input-area button:hover {
            transform: scale(1.05);
        }

        /* Модалки */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(12px);
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
            background: var(--surface);
            backdrop-filter: blur(20px);
            border-radius: 28px;
            width: 90%;
            max-width: 400px;
            overflow: hidden;
            border: 1px solid var(--border);
        }
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-close {
            background: none;
            border: none;
            color: var(--text);
            font-size: 24px;
            cursor: pointer;
        }
        .modal-body {
            padding: 24px;
        }
        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
        }
        .modal-input {
            width: 100%;
            padding: 14px;
            background: var(--input);
            border: 1px solid var(--border);
            border-radius: 14px;
            color: var(--text);
            margin-bottom: 16px;
        }
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: var(--accent-gradient);
            border: none;
            border-radius: 14px;
            color: white;
            font-weight: 600;
            cursor: pointer;
        }
        .modal-btn.cancel {
            background: var(--surface-elevated);
        }

        /* Уведомления */
        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--surface);
            backdrop-filter: blur(20px);
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 1000;
            animation: fadeIn 0.3s;
            border: 1px solid var(--border);
        }

        /* Скроллбар */
        ::-webkit-scrollbar {
            width: 4px;
        }
        ::-webkit-scrollbar-track {
            background: var(--surface);
        }
        ::-webkit-scrollbar-thumb {
            background: var(--accent);
            border-radius: 4px;
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
        <div class="logo">ATOMGRAM</div>
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
            <div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:80px;height:80px;font-size:36px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:rgba(255,255,255,0.1);border:none;padding:8px 16px;border-radius:20px;color:white;cursor:pointer">Загрузить фото</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div>
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
let currentChatType = null;
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
        document.getElementById('profileAvatar').innerHTML = '<img src="' + currentUserData.avatar + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover">';
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
}

function renderChats() {
    let html = '';
    for (let i = 0; i < friendRequests.length; i++) {
        const r = friendRequests[i];
        html += '<div class="chat-item" style="background:rgba(99,102,241,0.15)">' +
            '<div class="chat-avatar">📨</div>' +
            '<div class="chat-info"><div class="chat-name">' + r + '</div><div class="chat-status">Запрос в друзья</div></div>' +
            '<button onclick="acceptFriend(\\'' + r + '\\')" style="background:#10b981;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✓</button>' +
            '<button onclick="rejectFriend(\\'' + r + '\\')" style="background:#ef4444;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✗</button>' +
        '</div>';
    }
    for (let i = 0; i < allFriends.length; i++) {
        const f = allFriends[i];
        const online = onlineUsers.has(f);
        html += '<div class="chat-item" onclick="openChat(\\'' + f + '\\', \\'private\\')">' +
            '<div class="chat-avatar">👤' + (online ? '<div class="online-dot"></div>' : '') + '</div>' +
            '<div class="chat-info"><div class="chat-name">' + f + '</div><div class="chat-status ' + (online ? 'online' : '') + '">' + (online ? 'Онлайн' : 'Офлайн') + '</div></div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет чатов</div>';
    document.getElementById('chatsList').innerHTML = html;
}

function renderGroups() {
    let html = '';
    for (let i = 0; i < allGroups.length; i++) {
        const g = allGroups[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + g.id + '\\', \\'group\\')">' +
            '<div class="chat-avatar">👥</div>' +
            '<div class="chat-info"><div class="chat-name">' + g.name + '</div><div class="chat-status">' + (g.members ? g.members.length : 1) + ' участников</div></div>' +
        '</div>';
    }
    const groupsContainer = document.getElementById('groupsList');
    if (groupsContainer) groupsContainer.innerHTML = html;
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    let title = target;
    if (type === 'group') {
        const g = allGroups.find(x => x.id === target);
        title = g ? g.name : target;
    }
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatAvatar').innerHTML = type === 'group' ? '👥' : '👤';
    const isOnline = type === 'private' && onlineUsers.has(target);
    document.getElementById('chatStatus').innerHTML = isOnline ? 'Онлайн' : '';
    if (isOnline) {
        document.getElementById('chatStatus').classList.add('online');
    } else {
        document.getElementById('chatStatus').classList.remove('online');
    }
    document.getElementById('inputArea').style.display = 'flex';
    
    if (type === 'private') {
        socket.emit('joinPrivate', target);
    } else if (type === 'group') {
        socket.emit('joinGroup', target);
    }
    
    if (isMobile) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    }
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

// ========== СОКЕТЫ ==========
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
╔═══════════════════════════════════════════════════════════╗
║     ✨ ATOMGRAM — НОВЫЙ ИНТЕРФЕЙС ✨                       ║
╠═══════════════════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                               ║
║  📱 http://localhost:${PORT}                               ║
╠═══════════════════════════════════════════════════════════╣
║  🎨 Glassmorphism дизайн                                  ║
║  🌈 Градиенты и анимации                                   ║
║  💬 Личные сообщения                                       ║
║  👥 Группы                                                 ║
║  👤 Друзья                                                ║
║  🖼️ Аватары                                               ║
║  🟢 Онлайн-статус                                         ║
║  📱 Адаптив                                                ║
║  🤖 Awake-bot                                              ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
