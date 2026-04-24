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
setInterval(saveData, 10000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000; color: #fff; height: 100vh; overflow: hidden; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
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
            max-width: 350px;
            text-align: center;
        }
        .auth-card h1 {
            font-size: 34px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #007aff, #5856d6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-card .subtitle { color: #8e8e93; margin-bottom: 32px; font-size: 14px; }
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
        .switch-btn { background: #2c2c2e !important; }
        .error-msg { color: #ff3b30; margin-top: 16px; }
        
        .app { display: none; height: 100vh; flex-direction: column; }
        .header {
            background: #000;
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
        .logo { font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #007aff, #5856d6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .online-badge { margin-left: auto; font-size: 12px; color: #34c759; display: flex; align-items: center; gap: 6px; }
        .online-badge::before { content: ""; width: 8px; height: 8px; background: #34c759; border-radius: 50%; display: inline-block; }
        
        .container { display: flex; flex: 1; overflow: hidden; }
        .sidebar {
            width: 280px;
            background: #000;
            border-right: 0.5px solid #2c2c2e;
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
                background: #1c1c1e;
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
        @media (min-width: 769px) { .sidebar { position: relative; left: 0 !important; } }
        
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
        .profile-name { font-size: 17px; font-weight: 600; }
        .profile-username { font-size: 13px; color: #8e8e93; margin-top: 4px; }
        
        .nav-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            border-radius: 10px;
            margin: 4px 12px;
            color: #fff;
        }
        .nav-item:hover { background: #2c2c2e; }
        .section-title {
            padding: 16px 20px 8px;
            font-size: 12px;
            color: #8e8e93;
            text-transform: uppercase;
            font-weight: 600;
        }
        
        .friends-list, .groups-list, .channels-list { overflow-y: auto; }
        .chat-item {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: background 0.2s;
        }
        .chat-item:hover { background: #2c2c2e; }
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
        .chat-info { flex: 1; }
        .chat-name { font-weight: 600; font-size: 16px; }
        .chat-status { font-size: 12px; color: #8e8e93; margin-top: 2px; }
        .chat-status.online { color: #34c759; }
        
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #000;
        }
        .chat-header {
            padding: 12px 16px;
            background: #000;
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
        .chat-header-info { flex: 1; }
        .chat-header-name { font-weight: 600; font-size: 17px; }
        .chat-header-status { font-size: 12px; color: #8e8e93; margin-top: 2px; }
        .chat-header-status.online { color: #34c759; }
        
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
        .message-bubble { max-width: calc(100% - 40px); }
        .message-content {
            padding: 8px 12px;
            border-radius: 18px;
            background: #2c2c2e;
        }
        .message.mine .message-content { background: #007aff; }
        .message-name {
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 2px;
            color: #8e8e93;
        }
        .message-text { font-size: 15px; line-height: 1.4; word-break: break-word; }
        .message-time {
            font-size: 10px;
            color: #8e8e93;
            margin-top: 4px;
            text-align: right;
        }
        
        .input-area {
            padding: 10px 16px;
            background: #000;
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
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
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
        .modal.active { visibility: visible; opacity: 1; }
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
        .modal-header h3 { font-size: 18px; }
        .modal-close {
            background: none;
            border: none;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
        }
        .modal-body { padding: 20px; }
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
        .modal-btn.cancel { background: #2c2c2e; }
        
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
            .message { max-width: 85%; }
            .back-btn { display: block; }
        }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>ATOMGRAM</h1>
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

<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:80px;height:80px;font-size:36px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:#2c2c2e;border:none;padding:8px 16px;border-radius:20px;color:white;cursor:pointer">Загрузить</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"><textarea id="editBio" class="modal-input" rows="2" placeholder="О себе"></textarea><input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>

<script src="/socket.io/socket.io.js"></script>
<script>
var socket = io();
var currentUser = null;
var currentUserData = null;
var currentChatTarget = null;
var currentChatType = null;
var allFriends = [];
var friendRequests = [];
var allGroups = [];
var allChannels = [];
var onlineUsers = new Set();
var isMobile = window.innerWidth <= 768;

function login() {
    var u = document.getElementById('loginUsername').value.trim();
    var p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('login', { username: u, password: p }, function(res) {
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
    var u = document.getElementById('regUsername').value.trim();
    var n = document.getElementById('regName').value.trim();
    var p = document.getElementById('regPassword').value.trim();
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('register', { username: u, name: n, password: p }, function(res) {
        if (res.success) {
            document.getElementById('authError').innerText = 'Регистрация успешна! Войдите.';
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
    var name = (currentUserData && currentUserData.name) ? currentUserData.name : currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
    if (currentUserData && currentUserData.avatar) {
        document.getElementById('userAvatar').innerHTML = '<img src="' + currentUserData.avatar + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
    }
}

function loadData() {
    socket.emit('getFriends', function(data) {
        allFriends = data.friends || [];
        friendRequests = data.requests || [];
        renderChats();
    });
    socket.emit('getGroups', function(groups) {
        allGroups = groups;
        renderGroups();
    });
    socket.emit('getChannels', function(channels) {
        allChannels = channels;
        renderChannels();
    });
}

function renderChats() {
    var html = '';
    for (var i = 0; i < friendRequests.length; i++) {
        var r = friendRequests[i];
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
    for (var i = 0; i < allFriends.length; i++) {
        var f = allFriends[i];
        var online = onlineUsers.has(f);
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
    var html = '';
    for (var i = 0; i < allGroups.length; i++) {
        var g = allGroups[i];
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
    var html = '';
    for (var i = 0; i < allChannels.length; i++) {
        var c = allChannels[i];
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
    var title = target;
    if (type === 'channel') title = '# ' + target;
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatAvatar').innerHTML = (type === 'channel') ? '📢' : '👤';
    var isOnline = onlineUsers.has(target);
    document.getElementById('chatStatus').innerHTML = (type === 'private' && isOnline) ? 'Онлайн' : '';
    if (type === 'private' && isOnline) {
        document.getElementById('chatStatus').classList.add('online');
    } else {
        document.getElementById('chatStatus').classList.remove('online');
    }
    document.getElementById('inputArea').style.display = 'flex';
    
    if (type === 'private') {
        socket.emit('joinPrivate', target);
    } else if (type === 'group') {
        socket.emit('joinGroup', target);
    } else if (type === 'channel') {
        socket.emit('joinChannel', target);
    }
    
    if (isMobile) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
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
    var input = document.getElementById('messageInput');
    var text = input.value.trim();
    if (!text || !currentChatTarget) return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text });
    input.value = '';
}

function addMessage(msg) {
    var div = document.createElement('div');
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

function openAddFriend() {
    document.getElementById('addFriendModal').classList.add('active');
    document.getElementById('friendUsername').value = '';
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}

function addFriend() {
    var u = document.getElementById('friendUsername').value.trim();
    if (!u) {
        showToast('Введите логин');
        return;
    }
    socket.emit('addFriend', { friendUsername: u }, function(res) {
        showToast(res.message || res.error);
        closeAddFriendModal();
        loadData();
    });
}

function acceptFriend(f) {
    socket.emit('acceptFriend', { fromUser: f }, function() { loadData(); });
}

function rejectFriend(f) {
    socket.emit('rejectFriend', { fromUser: f }, function() { loadData(); });
}

function openCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
    document.getElementById('groupName').value = '';
}

function closeCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('active');
}

function createGroup() {
    var n = document.getElementById('groupName').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createGroup', { groupName: n }, function(res) {
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
    var n = document.getElementById('channelName').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createChannel', { channelName: n }, function(res) {
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
    document.getElementById('editName').value = (currentUserData && currentUserData.name) ? currentUserData.name : '';
    document.getElementById('editBio').value = (currentUserData && currentUserData.bio) ? currentUserData.bio : '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileModal').classList.add('active');
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function uploadAvatar() {
    var file = document.getElementById('avatarUpload').files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onloadend = function() {
        socket.emit('uploadAvatar', { avatar: reader.result }, function(res) {
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
    var data = {
        name: document.getElementById('editName').value.trim(),
        bio: document.getElementById('editBio').value.trim()
    };
    var pwd = document.getElementById('editPassword').value.trim();
    if (pwd) data.password = pwd;
    socket.emit('updateProfile', data, function(res) {
        if (res.success) {
            currentUserData = res.userData;
            updateUI();
            closeProfileModal();
            showToast('Профиль обновлён');
        }
    });
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
}

function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 2000);
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

socket.on('friendsUpdate', function() { loadData(); });
socket.on('groupsUpdate', function() { loadData(); });
socket.on('channelsUpdate', function() { loadData(); });
socket.on('chatHistory', function(data) {
    if (currentChatTarget === data.target) {
        document.getElementById('messages').innerHTML = '';
        for (var i = 0; i < data.messages.length; i++) {
            addMessage(data.messages[i]);
        }
    }
});
socket.on('newMessage', function(msg) {
    if (currentChatTarget === msg.target || currentChatTarget === msg.from) {
        addMessage(msg);
    }
});
socket.on('userOnline', function(u) {
    onlineUsers.add(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = 'Онлайн';
        document.getElementById('chatStatus').classList.add('online');
    }
    renderChats();
});
socket.on('userOffline', function(u) {
    onlineUsers.delete(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = '';
        document.getElementById('chatStatus').classList.remove('online');
    }
    renderChats();
});

var savedUser = localStorage.getItem('atomgram_user');
if (savedUser) {
    document.getElementById('loginUsername').value = savedUser;
}

window.addEventListener('resize', function() {
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
