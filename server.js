const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// ========== ДАННЫЕ ==========
const DATA_FILE = path.join(__dirname, 'data.json');
const AVATAR_DIR = path.join(__dirname, 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

let users = {};
let privateChats = {};
let channels = {};
let savedMessages = {};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = data.users || {};
            privateChats = data.privateChats || {};
            channels = data.channels || {};
            savedMessages = data.savedMessages || {};
            console.log('✅ Данные загружены');
            console.log('👥 Пользователей:', Object.keys(users).length);
        }
    } catch (e) { console.log('Ошибка загрузки:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, savedMessages }, null, 2));
        console.log('💾 Данные сохранены');
    } catch (e) { console.log('Ошибка сохранения:', e); }
}

loadData();
setInterval(saveData, 10000);

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

app.use('/avatars', express.static(AVATAR_DIR));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ========== HTML СТРАНИЦА ==========
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: white; height: 100vh; overflow: hidden; }
        body.light { background: #f0f2f5; color: #1a1a2e; }
        body.dark .sidebar, body.dark .chat-header, body.dark .input-area { background: #1e1e2e; }
        body.light .sidebar, body.light .chat-header, body.light .input-area { background: white; }
        body.dark .message-content { background: #2a2a3e; }
        body.light .message-content { background: #e8e8ea; color: #1a1a2e; }
        body.dark .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        body.light .message.my-message .message-content { background: #667eea; color: white; }
        
        #authScreen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
        }
        .auth-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 40px 30px;
            border-radius: 28px;
            width: 100%;
            max-width: 360px;
            text-align: center;
        }
        .auth-card h1 { font-size: 32px; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .auth-card input { width: 100%; padding: 14px 16px; margin: 8px 0; border: none; border-radius: 14px; background: rgba(255,255,255,0.95); font-size: 16px; }
        .auth-card button { width: 100%; padding: 14px; margin-top: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; }
        .switch-btn { background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.3) !important; }
        .error-msg { color: #ff6b6b; margin-top: 10px; font-size: 14px; }
        
        #mainApp { display: none; width: 100%; height: 100vh; position: relative; }
        .sidebar {
            position: fixed;
            left: -85%;
            top: 0;
            width: 85%;
            max-width: 300px;
            height: 100%;
            transition: left 0.3s ease;
            z-index: 100;
            display: flex;
            flex-direction: column;
            box-shadow: 2px 0 10px rgba(0,0,0,0.3);
        }
        .sidebar.open { left: 0; }
        .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 99; display: none; }
        .sidebar-overlay.open { display: block; }
        
        .sidebar-header { padding: 60px 20px 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 14px; cursor: pointer; }
        .avatar-emoji { font-size: 48px; background: #2a2a3e; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .avatar-img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
        .user-info h3 { font-size: 17px; font-weight: 600; }
        .user-info .username { font-size: 12px; color: #888; margin-top: 2px; }
        .menu-item { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 14px; border-radius: 12px; margin: 4px 12px; }
        .menu-item:hover { background: rgba(102,126,234,0.1); }
        .section-title { padding: 12px 20px 8px 20px; font-size: 11px; color: #667eea; text-transform: uppercase; font-weight: 600; }
        .friends-list, .channels-list { padding: 4px 12px; overflow-y: auto; max-height: 180px; }
        .friend-item, .channel-item { padding: 10px 12px; margin: 2px 0; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 12px; justify-content: space-between; font-size: 15px; }
        .friend-item:hover, .channel-item:hover { background: rgba(102,126,234,0.1); }
        .friend-request { background: rgba(102,126,234,0.15); border-left: 3px solid #667eea; }
        .friend-actions button { margin-left: 6px; padding: 4px 10px; border-radius: 20px; border: none; cursor: pointer; font-size: 12px; }
        .accept-btn { background: #4ade80; color: white; }
        .reject-btn { background: #ff6b6b; color: white; }
        .ban-btn { background: #ff4444; color: white; }
        .create-btn { padding: 12px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.08); margin: 8px 12px; }
        .create-btn button { flex: 1; padding: 10px; background: rgba(255,255,255,0.08); border: 1px solid #667eea; border-radius: 14px; color: #667eea; cursor: pointer; }
        
        .chat-area { display: flex; flex-direction: column; height: 100vh; width: 100%; }
        .chat-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .menu-btn { background: none; border: none; font-size: 24px; cursor: pointer; padding: 8px; color: inherit; }
        .chat-title { flex: 1; font-size: 17px; font-weight: 600; }
        .settings-btn { background: none; border: none; font-size: 20px; cursor: pointer; padding: 8px; color: inherit; }
        
        .messages-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .message { display: flex; align-items: flex-start; gap: 10px; max-width: 100%; }
        .message-avatar { font-size: 34px; min-width: 40px; text-align: center; cursor: pointer; }
        .message-bubble { max-width: 75%; word-wrap: break-word; }
        .message-content { padding: 10px 14px; border-radius: 18px; }
        .message.my-message { justify-content: flex-end; }
        .message.my-message .message-bubble { text-align: right; }
        .message-username { font-size: 12px; font-weight: 500; color: #a0a0c0; margin-bottom: 4px; cursor: pointer; }
        .message-text { font-size: 15px; line-height: 1.4; }
        .message-time { font-size: 10px; color: #888; margin-top: 4px; }
        
        .input-area { display: flex; padding: 12px 16px; gap: 8px; flex-wrap: wrap; flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.08); }
        .input-area input { flex: 1; padding: 12px 16px; border: none; border-radius: 28px; font-size: 15px; background: rgba(255,255,255,0.08); color: inherit; }
        .input-area input::placeholder { color: #888; }
        .input-area button { padding: 12px 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 28px; cursor: pointer; font-size: 16px; font-weight: 500; }
        
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 2000; }
        .modal-content { background: #1e1e2e; border-radius: 28px; width: 90%; max-width: 400px; max-height: 85vh; overflow-y: auto; }
        .modal-header { padding: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; }
        .modal-header h3 { color: inherit; font-size: 18px; }
        .close-modal { position: absolute; right: 20px; top: 18px; background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }
        .profile-avatar-section { text-align: center; padding: 24px; }
        .profile-avatar-emoji { font-size: 80px; background: #2a2a3e; width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; cursor: pointer; }
        .profile-field { padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .profile-field label { display: block; font-size: 11px; color: #667eea; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; }
        .profile-field input, .profile-field textarea, .profile-field select { width: 100%; padding: 12px; background: #2a2a3e; border: none; border-radius: 14px; color: inherit; font-size: 15px; }
        .modal-footer { padding: 20px; display: flex; gap: 12px; }
        .save-btn { flex: 1; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 28px; cursor: pointer; font-size: 15px; font-weight: 600; }
        
        .notification { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #1e1e2e; color: white; padding: 12px 20px; border-radius: 30px; font-size: 14px; z-index: 1000; text-align: center; }
        
        @media (min-width: 768px) { .sidebar { position: relative; left: 0 !important; width: 300px; } .sidebar-overlay { display: none !important; } .menu-btn { display: none; } .message-bubble { max-width: 60%; } }
        @media (max-width: 480px) { .message-bubble { max-width: 85%; } }
    </style>
</head>
<body class="dark">
<div id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div id="authForm">
            <input type="text" id="loginUsername" placeholder="Username">
            <input type="password" id="loginPassword" placeholder="Пароль">
            <button onclick="login()">Войти</button>
            <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
        </div>
        <div id="registerForm" style="display:none">
            <input type="text" id="regUsername" placeholder="Username">
            <input type="text" id="regName" placeholder="Имя">
            <input type="text" id="regSurname" placeholder="Фамилия">
            <input type="password" id="regPassword" placeholder="Пароль">
            <button onclick="register()">Зарегистрироваться</button>
            <button class="switch-btn" onclick="showLogin()">Назад</button>
        </div>
        <div id="authError" class="error-msg"></div>
    </div>
</div>

<div id="mainApp">
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header" onclick="openProfileModal()">
            <div id="userAvatar"><div class="avatar-emoji">👤</div></div>
            <div class="user-info">
                <h3 id="userName">Загрузка...</h3>
                <div class="username" id="userLogin">@</div>
            </div>
        </div>
        <div class="menu-item" onclick="openProfileModal()"><span>👤</span> <span>Профиль</span></div>
        <div class="menu-item" onclick="openSettingsModal()"><span>⚙️</span> <span>Настройки</span></div>
        <div class="menu-item" onclick="addFriend()"><span>➕</span> <span>Добавить друга</span></div>
        <div class="section-title">ДРУЗЬЯ</div>
        <div class="friends-list" id="friendsList"></div>
        <div class="section-title">КАНАЛЫ</div>
        <div class="channels-list" id="channelsList"></div>
        <div class="create-btn"><button onclick="createChannel()">+ Создать канал</button></div>
    </div>
    <div class="chat-area">
        <div class="chat-header">
            <button class="menu-btn" onclick="toggleSidebar()">☰</button>
            <div style="font-weight: 700;">⚡ ATOMGRAM</div>
            <div class="chat-title" id="chatTitle">Выберите чат</div>
            <button class="settings-btn" onclick="openSettingsModal()">⚙️</button>
        </div>
        <div class="messages-area" id="messages"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()">📤</button>
        </div>
    </div>
</div>

<div id="profileModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Профиль</h3><button class="close-modal" onclick="closeProfileModal()">✕</button></div>
        <div class="profile-avatar-section">
            <div id="profileAvatar"><div class="profile-avatar-emoji">👤</div></div>
        </div>
        <div class="profile-field"><label>Имя</label><input type="text" id="editName"></div>
        <div class="profile-field"><label>Фамилия</label><input type="text" id="editSurname"></div>
        <div class="profile-field"><label>О себе</label><textarea id="editBio" rows="2"></textarea></div>
        <div class="profile-field"><label>Новый пароль</label><input type="password" id="editPassword" placeholder="Оставьте пустым"></div>
        <div class="modal-footer"><button class="save-btn" onclick="saveProfile()">Сохранить</button></div>
    </div>
</div>

<div id="settingsModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Настройки</h3><button class="close-modal" onclick="closeSettingsModal()">✕</button></div>
        <div class="profile-field"><label>🌓 Тема</label><select id="themeSelect" onchange="applyTheme()"><option value="dark">Тёмная</option><option value="light">Светлая</option></select></div>
        <div class="modal-footer"><button class="save-btn" onclick="saveSettings()">Сохранить</button></div>
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
let allChannels = [];
let allFriends = [];
let friendRequests = [];
let bannedUsers = [];

function getLocalTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
}

function createChannel() {
    const name = prompt('Название канала:');
    if (!name) return;
    socket.emit('create channel', { channelName: name }, (res) => { 
        if (res && res.success) { 
            loadData(); 
            alert('Канал создан'); 
        } else alert(res?.error || 'Ошибка'); 
    });
}

function joinChannel(name) {
    currentChat = 'channel:' + name;
    currentChatType = 'channel';
    currentChatTarget = name;
    socket.emit('joinChannel', name);
    document.getElementById('chatTitle').innerHTML = '# ' + name;
}

function startPrivateChat(user) {
    currentChat = 'user:' + user;
    currentChatType = 'private';
    currentChatTarget = user;
    socket.emit('joinPrivate', user);
    document.getElementById('chatTitle').innerHTML = user;
}

function renderAll() {
    const cl = document.getElementById('channelsList');
    cl.innerHTML = allChannels.map(c => '<div class="channel-item" onclick="joinChannel(\\'' + c + '\\')">📢 ' + c + '</div>').join('');
    let fl = '';
    friendRequests.forEach(req => { 
        fl += '<div class="friend-item friend-request"><span>👤 ' + req + '</span><div class="friend-actions"><button class="accept-btn" onclick="acceptFriend(\\'' + req + '\\')">✅</button><button class="reject-btn" onclick="rejectFriend(\\'' + req + '\\')">❌</button></div></div>'; 
    });
    allFriends.forEach(f => { 
        fl += '<div class="friend-item" onclick="startPrivateChat(\\'' + f + '\\')"><span>👤 ' + f + '</span><button class="ban-btn" onclick="event.stopPropagation(); banUser(\\'' + f + '\\')">🚫</button></div>'; 
    });
    bannedUsers.forEach(b => { 
        fl += '<div class="friend-item" style="opacity:0.6;"><span>👤 ' + b + ' (забанен)</span></div>'; 
    });
    document.getElementById('friendsList').innerHTML = fl || '<div style="padding:12px; text-align:center; color:#888;">Нет друзей</div>';
}

function addFriend() {
    const u = prompt('Введите username друга:');
    if (!u) return;
    socket.emit('add friend', { friendUsername: u }, (res) => { 
        alert(res?.message || res?.error || 'Ошибка'); 
    });
}

function acceptFriend(from) { socket.emit('accept friend', { fromUser: from }); }
function rejectFriend(from) { socket.emit('reject friend', { fromUser: from }); }
function banUser(u) { if (confirm('Забанить пользователя ' + u + '?')) socket.emit('ban user', { userToBan: u }); }

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChat) return;
    socket.emit('chat message', { type: currentChatType, target: currentChatTarget, text: text });
    input.value = '';
}

function openProfileModal() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editSurname').value = currentUserData?.surname || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileAvatar').innerHTML = '<div class="profile-avatar-emoji">' + (currentUserData?.avatar || '👤') + '</div>';
    document.getElementById('profileModal').style.display = 'flex';
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; }

function saveProfile() {
    const data = { 
        login: currentUser, 
        name: document.getElementById('editName').value.trim(), 
        surname: document.getElementById('editSurname').value.trim(), 
        bio: document.getElementById('editBio').value.trim() 
    };
    const newPass = document.getElementById('editPassword').value.trim();
    if (newPass) data.password = newPass;
    socket.emit('update profile', data, (res) => { 
        if (res && res.success) { 
            currentUserData = res.userData; 
            updateUI(); 
            closeProfileModal(); 
            alert('Сохранено'); 
        } else alert(res?.error || 'Ошибка'); 
    });
}

function updateUI() {
    const name = (currentUserData?.name + ' ' + (currentUserData?.surname || '')).trim() || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
    document.getElementById('userAvatar').innerHTML = '<div class="avatar-emoji">' + (currentUserData?.avatar || '👤') + '</div>';
}

function applyTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
    localStorage.setItem('atomgram_theme', theme);
}

function saveSettings() {
    applyTheme();
    closeSettingsModal();
    alert('Настройки сохранены');
}

function openSettingsModal() {
    document.getElementById('themeSelect').value = document.body.classList.contains('light') ? 'light' : 'dark';
    document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettingsModal() { document.getElementById('settingsModal').style.display = 'none'; }

function applySavedSettings() {
    const theme = localStorage.getItem('atomgram_theme');
    if (theme) { document.body.classList.remove('dark', 'light'); document.body.classList.add(theme); }
}

function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    
    console.log('Попытка входа:', u);
    socket.emit('login', { username: u, password: p }, (res) => {
        console.log('Ответ сервера:', res);
        if (res && res.success) {
            currentUser = u;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_username', u);
            localStorage.setItem('atomgram_password', p);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
            applySavedSettings();
        } else {
            document.getElementById('authError').innerText = res?.error || 'Ошибка входа';
        }
    });
}

function register() {
    const u = document.getElementById('regUsername').value.trim();
    const n = document.getElementById('regName').value.trim();
    const s = document.getElementById('regSurname').value.trim();
    const p = document.getElementById('regPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    
    console.log('Попытка регистрации:', u);
    socket.emit('register', { username: u, name: n, surname: s, password: p }, (res) => {
        console.log('Ответ сервера:', res);
        if (res && res.success) { 
            document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.'; 
            showLogin(); 
        } else {
            document.getElementById('authError').innerText = res?.error || 'Ошибка регистрации';
        }
    });
}

function showRegister() { 
    document.getElementById('authForm').style.display = 'none'; 
    document.getElementById('registerForm').style.display = 'block'; 
    document.getElementById('authError').innerText = ''; 
}
function showLogin() { 
    document.getElementById('authForm').style.display = 'block'; 
    document.getElementById('registerForm').style.display = 'none'; 
    document.getElementById('authError').innerText = ''; 
}

const savedUsername = localStorage.getItem('atomgram_username');
const savedPassword = localStorage.getItem('atomgram_password');
if (savedUsername && savedPassword) { 
    document.getElementById('loginUsername').value = savedUsername; 
    document.getElementById('loginPassword').value = savedPassword; 
    setTimeout(login, 100); 
}

function loadData() {
    socket.emit('getFriends', (d) => { 
        allFriends = d?.friends || []; 
        friendRequests = d?.requests || []; 
        bannedUsers = d?.banned || []; 
        renderAll(); 
    });
    socket.emit('getChannels', (c) => { 
        allChannels = c || []; 
        renderAll(); 
    });
}

socket.on('friends update', (d) => { 
    allFriends = d?.friends || []; 
    friendRequests = d?.requests || []; 
    bannedUsers = d?.banned || []; 
    renderAll(); 
});
socket.on('channels update', (c) => { 
    allChannels = c || []; 
    renderAll(); 
});
socket.on('chat history', (data) => {
    if ((currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget) ||
        (currentChatType === 'channel' && data.type === 'channel' && data.channel === currentChatTarget)) {
        const msgsDiv = document.getElementById('messages');
        msgsDiv.innerHTML = '';
        (data.messages || []).forEach(m => addMessage(m));
        msgsDiv.scrollTop = msgsDiv.scrollHeight;
    }
});
socket.on('chat message', (msg) => {
    let show = false;
    if (msg.type === 'private' && currentChatType === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) show = true;
    if (msg.type === 'channel' && currentChatType === 'channel' && msg.channel === currentChatTarget) show = true;
    if (show) { 
        addMessage(msg); 
        document.getElementById('messages').scrollTop = 9999; 
    }
});

function addMessage(m) {
    const div = document.createElement('div');
    div.className = 'message';
    if (m.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + escapeHtml(m.from) + '\')">👤</div>' +
        '<div class="message-bubble"><div class="message-content">' +
        '<div class="message-username" onclick="viewUserProfile(\'' + escapeHtml(m.from) + '\')">' + escapeHtml(m.from) + '</div>' +
        '<div class="message-text">' + escapeHtml(m.text || '') + '</div>' +
        '<div class="message-time">' + (m.time || getLocalTime()) + '</div>' +
        '</div></div>';
    document.getElementById('messages').appendChild(div);
}

function viewUserProfile(username) {
    socket.emit('getUserProfile', username, (profile) => {
        if (profile) {
            alert('👤 ' + (profile.name || username) + '\n📝 ' + (profile.bio || 'Нет описания'));
        }
    });
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

// Проверка соединения с сервером
socket.on('connect', () => {
    console.log('✅ Соединение с сервером установлено');
});
socket.on('connect_error', (err) => {
    console.log('❌ Ошибка соединения:', err);
    document.getElementById('authError').innerText = 'Не удалось подключиться к серверу';
});
</script>
</body>
</html>`);
});

// ========== СОКЕТЫ ==========
const usersOnline = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Новое подключение:', socket.id);
    let currentUser = null;

    socket.on('register', (data, cb) => {
        console.log('📝 Регистрация:', data.username);
        const { username, name, surname, password } = data;
        if (users[username]) {
            cb({ success: false, error: 'Username занят' });
        } else {
            users[username] = {
                username, password,
                name: name || '', surname: surname || '',
                bio: '', avatar: '👤', avatarType: 'emoji', avatarData: null,
                friends: [], friendRequests: [], banned: []
            };
            saveData();
            cb({ success: true });
            console.log('✅ Пользователь зарегистрирован:', username);
        }
    });

    socket.on('login', (data, cb) => {
        console.log('🔑 Попытка входа:', data.username);
        const { username, password } = data;
        if (!users[username]) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (users[username].password !== password) {
            cb({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            usersOnline.set(socket.id, username);
            console.log('✅ Пользователь вошёл:', username);
            cb({
                success: true,
                userData: {
                    username: users[username].username,
                    name: users[username].name,
                    surname: users[username].surname,
                    bio: users[username].bio,
                    avatar: users[username].avatar,
                    avatarType: users[username].avatarType,
                    avatarData: users[username].avatarData
                }
            });
            socket.emit('friends update', {
                friends: users[username].friends || [],
                requests: users[username].friendRequests || [],
                banned: users[username].banned || []
            });
            socket.emit('channels update', Object.keys(channels));
        }
    });

    socket.on('update profile', (data, cb) => {
        console.log('📝 Обновление профиля:', data.login);
        if (users[data.login]) {
            if (data.name !== undefined) users[data.login].name = data.name;
            if (data.surname !== undefined) users[data.login].surname = data.surname;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.password) users[data.login].password = data.password;
            saveData();
            cb({
                success: true,
                userData: {
                    username: users[data.login].username,
                    name: users[data.login].name,
                    surname: users[data.login].surname,
                    bio: users[data.login].bio,
                    avatar: users[data.login].avatar,
                    avatarType: users[data.login].avatarType,
                    avatarData: users[data.login].avatarData
                }
            });
        } else cb({ success: false, error: 'Пользователь не найден' });
    });

    socket.on('getUserProfile', (username, cb) => {
        if (users[username]) {
            cb({
                name: users[username].name,
                surname: users[username].surname,
                bio: users[username].bio,
                avatar: users[username].avatar
            });
        } else cb(null);
    });

    socket.on('add friend', (data, cb) => {
        console.log('👥 Добавление друга:', data.friendUsername, 'от', currentUser);
        const { friendUsername } = data;
        if (!users[friendUsername]) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (friendUsername === currentUser) {
            cb({ success: false, error: 'Нельзя добавить себя' });
        } else if (users[currentUser].friends?.includes(friendUsername)) {
            cb({ success: false, error: 'Уже в друзьях' });
        } else {
            if (!users[friendUsername].friendRequests) users[friendUsername].friendRequests = [];
            if (users[friendUsername].friendRequests.includes(currentUser)) {
                cb({ success: false, error: 'Запрос уже отправлен' });
            } else {
                users[friendUsername].friendRequests.push(currentUser);
                saveData();
                cb({ success: true, message: '✅ Запрос в друзья отправлен!' });
                for (let [id, user] of usersOnline.entries()) {
                    if (user === friendUsername) {
                        io.sockets.sockets.get(id)?.emit('friends update', {
                            friends: users[friendUsername].friends || [],
                            requests: users[friendUsername].friendRequests || [],
                            banned: users[friendUsername].banned || []
                        });
                        break;
                    }
                }
            }
        }
    });

    socket.on('accept friend', (data) => {
        console.log('✅ Принятие друга:', data.fromUser, 'от', currentUser);
        const { fromUser } = data;
        if (users[currentUser].friendRequests?.includes(fromUser)) {
            users[currentUser].friendRequests = users[currentUser].friendRequests.filter(f => f !== fromUser);
            if (!users[currentUser].friends) users[currentUser].friends = [];
            if (!users[fromUser].friends) users[fromUser].friends = [];
            if (!users[currentUser].friends.includes(fromUser)) users[currentUser].friends.push(fromUser);
            if (!users[fromUser].friends.includes(currentUser)) users[fromUser].friends.push(currentUser);
            saveData();
            socket.emit('friends update', {
                friends: users[currentUser].friends,
                requests: users[currentUser].friendRequests,
                banned: users[currentUser].banned || []
            });
            for (let [id, user] of usersOnline.entries()) {
                if (user === fromUser) {
                    io.sockets.sockets.get(id)?.emit('friends update', {
                        friends: users[fromUser].friends,
                        requests: users[fromUser].friendRequests,
                        banned: users[fromUser].banned || []
                    });
                    break;
                }
            }
        }
    });

    socket.on('reject friend', (data) => {
        console.log('❌ Отклонение друга:', data.fromUser, 'от', currentUser);
        const { fromUser } = data;
        if (users[currentUser].friendRequests?.includes(fromUser)) {
            users[currentUser].friendRequests = users[currentUser].friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friends update', {
                friends: users[currentUser].friends,
                requests: users[currentUser].friendRequests,
                banned: users[currentUser].banned || []
            });
        }
    });

    socket.on('ban user', (data) => {
        console.log('🚫 Бан пользователя:', data.userToBan, 'от', currentUser);
        const { userToBan } = data;
        if (!users[currentUser].banned) users[currentUser].banned = [];
        if (!users[currentUser].banned.includes(userToBan)) {
            users[currentUser].banned.push(userToBan);
            if (users[currentUser].friends?.includes(userToBan)) {
                users[currentUser].friends = users[currentUser].friends.filter(f => f !== userToBan);
            }
            saveData();
            socket.emit('friends update', {
                friends: users[currentUser].friends,
                requests: users[currentUser].friendRequests,
                banned: users[currentUser].banned || []
            });
        }
    });

    socket.on('getFriends', (cb) => {
        cb({
            friends: users[currentUser]?.friends || [],
            requests: users[currentUser]?.friendRequests || [],
            banned: users[currentUser]?.banned || []
        });
    });

    socket.on('create channel', (data, cb) => {
        console.log('📢 Создание канала:', data.channelName, 'от', currentUser);
        const { channelName } = data;
        if (channels[channelName]) {
            cb({ success: false, error: 'Канал уже существует' });
        } else {
            channels[channelName] = { name: channelName, messages: [] };
            saveData();
            cb({ success: true, message: 'Канал создан' });
            io.emit('channels update', Object.keys(channels));
        }
    });

    socket.on('joinChannel', (name) => {
        console.log('📢 Подключение к каналу:', name, 'от', currentUser);
        if (channels[name]) {
            socket.emit('chat history', {
                type: 'channel',
                channel: name,
                messages: channels[name].messages || []
            });
        }
    });

    socket.on('getChannels', (cb) => {
        cb(Object.keys(channels));
    });

    socket.on('joinPrivate', (target) => {
        console.log('💬 Личный чат:', currentUser, '<->', target);
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chat history', {
            type: 'private',
            with: target,
            messages: privateChats[id].messages || []
        });
    });

    socket.on('chat message', (data) => {
        console.log('💬 Сообщение от', currentUser, 'в', data.type, data.target);
        const { type, target, text } = data;
        const msg = {
            id: Date.now(),
            from: currentUser,
            text: text,
            time: new Date().toLocaleTimeString(),
            type: type
        };
        if (type === 'private') {
            msg.to = target;
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            io.emit('chat message', msg);
            saveData();
        } else if (type === 'channel') {
            msg.channel = target;
            if (channels[target]) {
                channels[target].messages.push(msg);
                io.emit('chat message', msg);
                saveData();
            }
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            usersOnline.delete(socket.id);
            console.log('👋 Пользователь отключился:', currentUser);
        }
    });
});

const PORT = process.env.PORT || 3000;
const ip = getLocalIP();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║        🚀 ATOMGRAM ЗАПУЩЕН             ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║  💻 http://localhost:${PORT}                  ║`);
    console.log(`║  📱 http://${ip}:${PORT}                 ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║  ✅ Функции:                              ║`);
    console.log(`║  💬 Личные сообщения                     ║`);
    console.log(`║  📢 Каналы                               ║`);
    console.log(`║  👥 Друзья                              ║`);
    console.log(`║  🌓 Тёмная/светлая тема                  ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);
});
