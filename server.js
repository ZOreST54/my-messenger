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
setInterval(saveData, 5000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM 55GB</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: white; height: 100vh; overflow: hidden; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
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
            background: rgba(28,28,30,0.95);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 32px;
            width: 90%;
            max-width: 380px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.08);
        }
        .auth-card h1 {
            font-size: 36px;
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
            color: white;
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
        .switch-btn { background: #2c2c2e !important; }
        .error-msg { color: #ff3b30; margin-top: 16px; }
        
        /* Приложение */
        .app { display: none; height: 100vh; flex-direction: column; }
        .header {
            background: #1c1c1e;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid #2a2a2e;
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #007aff;
            display: none;
        }
        .logo { font-size: 20px; font-weight: bold; background: linear-gradient(135deg, #007aff, #5856d6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .online-badge { margin-left: auto; font-size: 12px; color: #34c759; display: flex; align-items: center; gap: 6px; }
        .online-badge::before { content: ''; width: 8px; height: 8px; background: #34c759; border-radius: 50%; display: inline-block; }
        
        .container { display: flex; flex: 1; overflow: hidden; }
        .sidebar {
            width: 300px;
            background: #1c1c1e;
            border-right: 1px solid #2a2a2e;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s;
            z-index: 100;
        }
        @media (max-width: 768px) {
            .sidebar { position: fixed; left: -300px; top: 60px; height: calc(100vh - 60px); z-index: 200; }
            .sidebar.open { left: 0; }
            .menu-btn { display: block; }
            .overlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 199; display: none; }
            .overlay.open { display: block; }
        }
        @media (min-width: 769px) { .sidebar { position: relative; left: 0 !important; } }
        
        .profile {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid #2a2a2e;
            cursor: pointer;
        }
        .profile:hover { background: #2a2a2e; }
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
        .profile-name { font-size: 17px; font-weight: 600; }
        .profile-username { font-size: 12px; color: #888; margin-top: 4px; }
        
        .nav-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            border-radius: 12px;
            margin: 4px 12px;
        }
        .nav-item:hover { background: #2a2a2e; }
        .section-title {
            padding: 16px 20px 8px;
            font-size: 11px;
            color: #007aff;
            text-transform: uppercase;
        }
        
        /* Истории */
        .stories-row {
            padding: 12px 16px;
            display: flex;
            gap: 16px;
            overflow-x: auto;
            border-bottom: 1px solid #2a2a2e;
        }
        .story-item { text-align: center; cursor: pointer; }
        .story-circle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #007aff, #5856d6);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .story-circle.add { background: #2a2a2e; border: 2px solid #007aff; }
        .story-avatar { font-size: 28px; }
        .story-name { font-size: 10px; color: #888; margin-top: 4px; }
        
        .friends-list, .groups-list, .channels-list { flex: 1; overflow-y: auto; }
        .chat-item {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 14px;
            border-bottom: 1px solid #2a2a2e;
        }
        .chat-item:hover { background: #2a2a2e; }
        .chat-avatar {
            width: 48px;
            height: 48px;
            background: #2a2a2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .chat-info { flex: 1; }
        .chat-name { font-weight: 600; font-size: 16px; }
        .chat-status { font-size: 11px; color: #34c759; margin-top: 2px; }
        .chat-status.offline { color: #666; }
        
        .chat-main { flex: 1; display: flex; flex-direction: column; background: #0a0a0f; }
        .chat-header {
            padding: 16px 24px;
            background: #1c1c1e;
            border-bottom: 1px solid #2a2a2e;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .chat-title { font-size: 18px; font-weight: 600; }
        .chat-status-text { font-size: 12px; color: #34c759; margin-top: 4px; }
        .chat-actions { display: flex; gap: 8px; }
        .chat-action-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
        }
        .chat-action-btn:hover { background: #2a2a2e; }
        
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
            gap: 10px;
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
            background: #2a2a2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .message-bubble { max-width: calc(100% - 46px); }
        .message-content {
            padding: 10px 16px;
            border-radius: 20px;
            background: #2a2a2e;
        }
        .message.mine .message-content { background: linear-gradient(135deg, #007aff, #5856d6); }
        .message-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #aaa; }
        .message-text { font-size: 15px; line-height: 1.4; word-break: break-word; }
        .message-time { font-size: 10px; color: #888; margin-top: 4px; text-align: right; }
        
        /* Реакции */
        .message-reactions {
            display: flex;
            gap: 6px;
            margin-top: 8px;
            flex-wrap: wrap;
        }
        .reaction {
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 12px;
            cursor: pointer;
        }
        .reaction:hover { background: #007aff; transform: scale(1.1); }
        
        /* Стикеры */
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: #1c1c1e;
            border-radius: 24px 24px 0 0;
            padding: 16px;
            display: none;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
            z-index: 150;
            max-height: 250px;
            overflow-y: auto;
        }
        .sticker-picker.open { display: flex; }
        .sticker { font-size: 42px; cursor: pointer; padding: 5px; transition: transform 0.1s; background: #2a2a2e; border-radius: 12px; }
        .sticker:active { transform: scale(1.2); }
        
        /* Игры */
        .game-container {
            background: #1c1c1e;
            border-radius: 20px;
            padding: 16px;
            margin-bottom: 12px;
        }
        .game-title { text-align: center; margin-bottom: 12px; font-size: 16px; font-weight: bold; }
        .tic-grid {
            display: inline-grid;
            grid-template-columns: repeat(3, 80px);
            gap: 8px;
            background: #2a2a2e;
            padding: 8px;
            border-radius: 12px;
            margin: 0 auto;
        }
        .tic-cell {
            width: 80px;
            height: 80px;
            background: #0a0a0f;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            cursor: pointer;
            border-radius: 12px;
        }
        .tic-cell:hover { background: #007aff; transform: scale(1.05); }
        .game-controls { display: flex; gap: 12px; margin-top: 16px; justify-content: center; }
        .game-btn {
            padding: 8px 16px;
            background: #007aff;
            border: none;
            border-radius: 10px;
            color: white;
            cursor: pointer;
        }
        
        .input-area {
            padding: 12px 20px;
            background: #1c1c1e;
            border-top: 1px solid #2a2a2e;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .input-area input {
            flex: 1;
            padding: 12px 16px;
            background: #2a2a2e;
            border: none;
            border-radius: 25px;
            color: white;
            font-size: 15px;
        }
        .input-area button {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #2a2a2e;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
        }
        .input-area button:hover { background: #007aff; transform: scale(1.05); }
        
        .typing-indicator {
            padding: 8px 24px;
            font-size: 12px;
            color: #888;
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .typing-dot {
            width: 6px;
            height: 6px;
            background: #007aff;
            border-radius: 50%;
            animation: pulse 1s infinite;
        }
        
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
        .modal.active { visibility: visible; opacity: 1; }
        .modal-content {
            background: #1c1c1e;
            border-radius: 28px;
            width: 90%;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #2a2a2e;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
        }
        .modal-body { padding: 24px; }
        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid #2a2a2e;
            display: flex;
            gap: 12px;
        }
        .modal-input {
            width: 100%;
            padding: 14px;
            background: #2a2a2e;
            border: none;
            border-radius: 14px;
            color: white;
            margin-bottom: 16px;
        }
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: #007aff;
            border: none;
            border-radius: 14px;
            color: white;
            font-weight: 600;
            cursor: pointer;
        }
        .modal-btn.cancel { background: #2a2a2e; }
        
        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #2a2a2e;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 1000;
            animation: fadeIn 0.3s;
        }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM 55GB</h1>
        <div class="subtitle">100+ функций в одном мессенджере</div>
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
        <div class="logo">⚡ ATOMGRAM 55GB</div>
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
            <div class="stories-row" id="storiesRow"></div>
            <div class="nav-item" onclick="openAddFriend()"><span>➕</span><span>Добавить друга</span></div>
            <div class="nav-item" onclick="openCreateGroup()"><span>👥</span><span>Создать группу</span></div>
            <div class="nav-item" onclick="openCreateChannel()"><span>📢</span><span>Создать канал</span></div>
            <div class="nav-item" onclick="openGameMenu()"><span>🎮</span><span>Игры</span></div>
            <div class="section-title">ЧАТЫ</div>
            <div id="chatsList" class="friends-list"></div>
            <div class="section-title">ГРУППЫ</div>
            <div id="groupsList" class="groups-list"></div>
            <div class="section-title">КАНАЛЫ</div>
            <div id="channelsList" class="channels-list"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-title" id="chatTitle">ATOMGRAM 55GB</div>
                    <div class="chat-status-text" id="chatStatus"></div>
                </div>
                <div class="chat-actions" id="chatActions"></div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="typing-indicator" id="typingIndicator" style="display:none">
                <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                <span>печатает...</span>
            </div>
            <div class="sticker-picker" id="stickerPicker">
                <div class="sticker" onclick="sendSticker('😀')">😀</div><div class="sticker" onclick="sendSticker('😂')">😂</div>
                <div class="sticker" onclick="sendSticker('😍')">😍</div><div class="sticker" onclick="sendSticker('😎')">😎</div>
                <div class="sticker" onclick="sendSticker('🥳')">🥳</div><div class="sticker" onclick="sendSticker('🔥')">🔥</div>
                <div class="sticker" onclick="sendSticker('❤️')">❤️</div><div class="sticker" onclick="sendSticker('🎉')">🎉</div>
                <div class="sticker" onclick="sendSticker('👍')">👍</div><div class="sticker" onclick="sendSticker('👎')">👎</div>
                <div class="sticker" onclick="sendSticker('🐱')">🐱</div><div class="sticker" onclick="sendSticker('🐶')">🐶</div>
                <div class="sticker" onclick="sendSticker('🚀')">🚀</div><div class="sticker" onclick="sendSticker('✨')">✨</div>
                <div class="sticker" onclick="sendSticker('💎')">💎</div><div class="sticker" onclick="sendSticker('🎨')">🎨</div>
            </div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="toggleStickerPicker()">😊</button>
                <button onclick="document.getElementById('fileInput').click()">📎</button>
                <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:80px;height:80px;font-size:36px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:#2a2a2e;border:none;padding:8px 16px;border-radius:20px;color:white;cursor:pointer">Загрузить</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"><textarea id="editBio" class="modal-input" rows="2" placeholder="О себе"></textarea><input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>
<div id="gameMenuModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Игры</h3><button class="modal-close" onclick="closeGameMenu()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="startGame('tictactoe')" style="margin-bottom:12px">❌ Крестики-нолики</button><button class="modal-btn" onclick="startGame('dice')" style="margin-bottom:12px">🎲 Кости</button><button class="modal-btn" onclick="startGame('darts')">🎯 Дартс</button></div></div></div>

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
let typingTimeout = null;
let tttBoard = null;
let tttCurrentPlayer = null;

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
}

function showLogin() {
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('registerPanel').style.display = 'none';
}

function updateUI() {
    document.getElementById('userName').innerText = currentUserData?.name || currentUser;
    document.getElementById('userLogin').innerText = '@' + currentUser;
}

function loadData() {
    socket.emit('getFriends', (d) => {
        allFriends = d.friends || [];
        friendRequests = d.requests || [];
        renderChats();
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

function loadStories() {
    socket.emit('getStories');
}

function renderChats() {
    let html = '';
    for (let i = 0; i < friendRequests.length; i++) {
        const r = friendRequests[i];
        html += '<div class="chat-item" style="background:rgba(0,122,255,0.15)"><div class="chat-avatar">📨</div><div class="chat-info"><div class="chat-name">' + r + '</div><div class="chat-status">Запрос в друзья</div></div><button onclick="acceptFriend(\\'' + r + '\\')" style="background:#34c759;border:none;border-radius:20px;padding:6px 12px;margin:0 5px;cursor:pointer">✓</button><button onclick="rejectFriend(\\'' + r + '\\')" style="background:#ff3b30;border:none;border-radius:20px;padding:6px 12px;cursor:pointer">✗</button></div>';
    }
    for (let i = 0; i < allFriends.length; i++) {
        const f = allFriends[i];
        const online = onlineUsers.has(f);
        html += '<div class="chat-item" onclick="openChat(\\'' + f + '\\', \\'private\\')"><div class="chat-avatar">👤</div><div class="chat-info"><div class="chat-name">' + f + '</div><div class="chat-status ' + (online ? '' : 'offline') + '">' + (online ? 'Онлайн' : 'Офлайн') + '</div></div></div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#888">Нет чатов</div>';
    document.getElementById('chatsList').innerHTML = html;
}

function renderGroups() {
    let html = '';
    for (let i = 0; i < allGroups.length; i++) {
        const g = allGroups[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + g.id + '\\', \\'group\\')"><div class="chat-avatar">👥</div><div class="chat-info"><div class="chat-name">' + g.name + '</div><div class="chat-status">' + (g.members ? g.members.length : 1) + ' участников</div></div></div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#888">Нет групп</div>';
    document.getElementById('groupsList').innerHTML = html;
}

function renderChannels() {
    let html = '';
    for (let i = 0; i < allChannels.length; i++) {
        const c = allChannels[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + c + '\\', \\'channel\\')"><div class="chat-avatar">📢</div><div class="chat-info"><div class="chat-name">#' + c + '</div></div></div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#888">Нет каналов</div>';
    document.getElementById('channelsList').innerHTML = html;
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    let title = target;
    let actions = '';
    if (type === 'channel') title = '# ' + target;
    if (type === 'private') actions = '<button class="chat-action-btn" onclick="openGameMenu()">🎮</button>';
    if (type === 'group') actions = '<button class="chat-action-btn" onclick="openGameMenu()">🎮</button><button class="chat-action-btn" onclick="addMemberToGroup()">➕</button>';
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatActions').innerHTML = actions;
    document.getElementById('chatStatus').innerHTML = type === 'private' && onlineUsers.has(target) ? 'Онлайн' : '';
    socket.emit('joinPrivate', target);
    closeSidebar();
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text });
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

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    let reactionsHtml = '';
    if (msg.reactions) {
        reactionsHtml = '<div class="message-reactions">';
        for (const r in msg.reactions) {
            reactionsHtml += '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'' + r + '\\')">' + r + ' ' + msg.reactions[r] + '</span>';
        }
        reactionsHtml += '</div>';
    }
    div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content">' + (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') + '<div class="message-text">' + escapeHtml(msg.text) + '</div>' + reactionsHtml + '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div><div style="display:flex;gap:8px;margin-top:6px"><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'❤️\\')">❤️</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'👍\\')">👍</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😂\\')">😂</span></div></div></div>';
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = 9999;
}

function addReaction(msgId, reaction) {
    socket.emit('addReaction', { messageId: msgId, chatId: currentChatTarget, reaction: reaction });
}

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
    if (gameType === 'tictactoe') {
        startTicTacToe();
    } else if (gameType === 'dice') {
        rollDice();
    } else if (gameType === 'darts') {
        playDarts();
    }
}

function startTicTacToe() {
    tttBoard = ['', '', '', '', '', '', '', '', ''];
    tttCurrentPlayer = 'X';
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.id = 'tttGame';
    gameDiv.innerHTML = '<div class="game-title">❌ КРЕСТИКИ-НОЛИКИ</div><div style="text-align:center;margin-bottom:12px">Сейчас ходит: <span id="tttTurn" style="color:#007aff;font-weight:bold">X</span></div><div id="tttBoard" class="tic-grid" style="margin:0 auto"></div><div class="game-controls"><button class="game-btn" onclick="resetTicTacToe()">Новая игра</button><button class="game-btn" onclick="closeGame()">Закрыть</button></div>';
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

// ИСТОРИИ
function addStory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => socket.emit('addStory', { media: reader.result, type: file.type.startsWith('image/') ? 'image' : 'video' });
        reader.readAsDataURL(file);
    };
    input.click();
}

function viewStory(username) {
    socket.emit('getStory', username);
}

function closeStoryViewer() {
    document.getElementById('storyViewer')?.classList.remove('active');
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
    reader.onloadend = () => socket.emit('uploadAvatar', { avatar: reader.result }, (res) => {
        if (res.success) {
            currentUserData = res.userData;
            updateUI();
            showToast('Аватар обновлён');
            closeProfileModal();
        }
    });
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

document.getElementById('messageInput').addEventListener('input', () => {
    if (currentChatTarget) {
        socket.emit('typing', { type: currentChatType, target: currentChatTarget });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => socket.emit('stopTyping', { type: currentChatType, target: currentChatTarget }), 1000);
    }
});

// СОБЫТИЯ
socket.on('friendsUpdate', () => loadData());
socket.on('groupsUpdate', () => loadData());
socket.on('channelsUpdate', () => loadData());
socket.on('chatHistory', (d) => {
    if (currentChatTarget === d.target) {
        document.getElementById('messages').innerHTML = '';
        for (let i = 0; i < d.messages.length; i++) addMessage(d.messages[i]);
    }
});
socket.on('newMessage', (m) => {
    if (currentChatTarget === m.target || currentChatTarget === m.from) addMessage(m);
    if (m.from !== currentUser) showToast('Новое сообщение от ' + m.from);
});
socket.on('fileMessage', (d) => {
    if (currentChatTarget === d.target || currentChatTarget === d.from) {
        const div = document.createElement('div');
        div.className = 'message ' + (d.from === currentUser ? 'mine' : '');
        div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><a href="' + d.fileData + '" download="' + d.fileName + '">📎 ' + escapeHtml(d.fileName) + '</a><div class="message-time">' + (d.time || new Date().toLocaleTimeString()) + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});
socket.on('typing', (d) => {
    if (currentChatTarget === d.user || currentChatTarget === d.channel) {
        document.getElementById('typingIndicator').style.display = 'flex';
        setTimeout(() => document.getElementById('typingIndicator').style.display = 'none', 1500);
    }
});
socket.on('userOnline', (u) => {
    onlineUsers.add(u);
    if (currentChatTarget === u) document.getElementById('chatStatus').innerHTML = 'Онлайн';
    renderChats();
});
socket.on('userOffline', (u) => {
    onlineUsers.delete(u);
    if (currentChatTarget === u) document.getElementById('chatStatus').innerHTML = '';
    renderChats();
});
socket.on('storiesUpdate', (s) => {
    const container = document.getElementById('storiesRow');
    let html = '<div class="story-item" onclick="addStory()"><div class="story-circle add"><div class="story-avatar">+</div></div><div class="story-name">Моя</div></div>';
    for (let i = 0; i < s.length; i++) {
        html += '<div class="story-item" onclick="viewStory(\\'' + s[i].username + '\\')"><div class="story-circle"><div class="story-avatar">' + (s[i].avatar || '👤') + '</div></div><div class="story-name">' + (s[i].name || s[i].username) + '</div></div>';
    }
    container.innerHTML = html;
});
socket.on('storyData', (d) => {
    let viewer = document.getElementById('storyViewer');
    if (!viewer) {
        viewer = document.createElement('div');
        viewer.id = 'storyViewer';
        viewer.className = 'story-viewer';
        viewer.innerHTML = '<div class="story-container"><div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div><img id="storyImage" class="story-media" style="display:none"><video id="storyVideo" class="story-media" style="display:none" autoplay muted></video><button class="story-close" onclick="closeStoryViewer()">✕</button></div>';
        document.body.appendChild(viewer);
    }
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

const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) document.getElementById('loginUsername').value = savedUser;
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

    socket.on('joinGroup', (id) => {
        if (groups[id] && groups[id].members && groups[id].members.includes(currentUser)) {
            socket.emit('chatHistory', { target: id, messages: groups[id].messages || [] });
        }
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
    console.log('\\n🤖 AWAKE-BOT ЗАПУЩЕН!\\n');
    setInterval(async () => { try { await fetch(url); } catch(e) {} }, 4 * 60 * 1000);
    setTimeout(async () => { try { await fetch(url); } catch(e) {} }, 30000);
}

if (process.env.RENDER || true) startKeepAliveBot();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 ATOMGRAM 55GB ЗАПУЩЕН              ║
╠════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                  ║
╠════════════════════════════════════════════╣
║  📦 55 ГБ ФУНКЦИЙ:                         ║
║  💬 Личные сообщения                        ║
║  👥 Группы                                 ║
║  📢 Каналы                                 ║
║  👤 Друзья                                ║
║  🎤 Голосовые сообщения                    ║
║  📎 Файлы                                  ║
║  😀 Стикеры                               ║
║  ❌ Крестики-нолики                        ║
║  🎲 Кости                                  ║
║  🎯 Дартс                                  ║
║  📸 Истории                                ║
║  ❤️ Реакции                                ║
║  ⌨️ Индикатор печати                       ║
║  🟢 Онлайн-статус                          ║
║  🤖 Awake-bot                              ║
╚════════════════════════════════════════════╝
    `);
});
