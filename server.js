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

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) { console.log('Ошибка загрузки:', e); }
    return { users: {}, privateChats: {}, publicRooms: { general: { messages: [] } }, channels: {} };
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, publicRooms, channels }, null, 2));
    console.log('💾 Данные сохранены');
}

let savedData = loadData();
let users = savedData.users;
let privateChats = savedData.privateChats;
let publicRooms = savedData.publicRooms;
let channels = savedData.channels || {};

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

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #0a0a0a; color: white; height: 100vh; overflow: hidden; }
        body.light { background: #f0f0f0; color: #1a1a2e; }
        
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
        }
        .auth-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 30px;
            width: 90%;
            max-width: 350px;
            text-align: center;
        }
        .auth-card input {
            width: 100%;
            padding: 14px;
            margin: 8px 0;
            border: none;
            border-radius: 25px;
            font-size: 16px;
        }
        .auth-card button {
            width: 100%;
            padding: 14px;
            margin-top: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
        }
        .switch-btn { background: transparent !important; border: 1px solid #667eea !important; }
        .error-msg { color: #ff6b6b; margin-top: 10px; }
        
        #mainApp {
            display: none;
            width: 100%;
            height: 100vh;
            display: flex;
        }
        .sidebar {
            width: 260px;
            background: #1a1a2e;
            border-right: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
        }
        body.light .sidebar { background: white; border-right-color: #ddd; }
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }
        .avatar-emoji { font-size: 40px; background: #2a2a3e; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .user-info h3 { font-size: 16px; }
        .user-info .username { font-size: 11px; color: #888; }
        .menu-item { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; }
        .menu-item:hover { background: rgba(102,126,234,0.1); }
        .section-title { padding: 10px 20px; font-size: 11px; color: #667eea; }
        .friends-list, .rooms-list, .channels-list {
            padding: 5px 10px;
            overflow-y: auto;
            max-height: 150px;
        }
        .friend-item, .room-item, .channel-item {
            padding: 8px 12px;
            margin: 3px 0;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: space-between;
        }
        .friend-item:hover, .room-item:hover { background: rgba(102,126,234,0.2); }
        .friend-request { background: rgba(102,126,234,0.3); }
        .friend-actions button { margin-left: 5px; padding: 3px 8px; border-radius: 12px; border: none; cursor: pointer; }
        .accept-btn { background: #4ade80; color: white; }
        .reject-btn { background: #ff6b6b; color: white; }
        .ban-btn { background: #ff4444; color: white; }
        .create-btn { padding: 12px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
        .create-btn button { flex: 1; padding: 10px; background: #2a2a3e; border: 1px solid #667eea; border-radius: 20px; color: #667eea; cursor: pointer; }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; }
        .chat-header {
            padding: 15px 20px;
            background: #1a1a2e;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 15px;
        }
        body.light .chat-header { background: white; border-bottom-color: #ddd; }
        .chat-title { flex: 1; font-size: 16px; font-weight: bold; }
        .settings-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .message {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            max-width: 100%;
        }
        .message-avatar { font-size: 32px; min-width: 36px; text-align: center; }
        .message-bubble { max-width: 70%; }
        .message-content { padding: 8px 14px; border-radius: 18px; background: #2a2a3e; }
        body.light .message-content { background: #e8e8e8; color: #1a1a2e; }
        .message.my-message { justify-content: flex-end; }
        .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .message-username { font-size: 11px; color: #a0a0c0; margin-bottom: 3px; }
        .message-text { font-size: 14px; word-wrap: break-word; }
        .message-time { font-size: 9px; color: #888; margin-top: 3px; }
        .voice-message { display: flex; align-items: center; gap: 8px; }
        .voice-message button { background: none; border: none; font-size: 20px; cursor: pointer; color: white; }
        .video-circle { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; cursor: pointer; }
        .file-attachment { background: rgba(102,126,234,0.2); padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; }
        .file-attachment a { color: white; text-decoration: none; }
        .typing-indicator { font-size: 11px; color: #888; padding: 5px 15px; font-style: italic; }
        .input-area {
            display: flex;
            padding: 15px 20px;
            background: #1a1a2e;
            border-top: 1px solid rgba(255,255,255,0.1);
            gap: 8px;
        }
        body.light .input-area { background: white; border-top-color: #ddd; }
        .input-area input {
            flex: 1;
            padding: 12px 15px;
            border: none;
            border-radius: 25px;
            background: #2a2a3e;
            color: white;
            font-size: 15px;
        }
        body.light .input-area input { background: #e8e8e8; color: #1a1a2e; }
        .input-area button {
            padding: 10px 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
        }
        .voice-record-btn { background: #ff6b6b !important; }
        .voice-record-btn.recording { animation: pulse 1s infinite; background: #ff4444 !important; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        
        .video-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            z-index: 3000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .video-preview { width: 100%; max-width: 300px; border-radius: 50%; overflow: hidden; }
        video { width: 100%; border-radius: 50%; }
        .video-controls { margin-top: 20px; display: flex; gap: 10px; }
        .video-controls button { padding: 12px 20px; border-radius: 40px; border: none; font-size: 14px; cursor: pointer; }
        .start-record { background: #ff6b6b; color: white; }
        .stop-record { background: #ff4444; color: white; }
        .send-video { background: #4ade80; color: white; }
        .close-video { background: #888; color: white; }
        
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        .modal-content {
            background: #1a1a2e;
            border-radius: 25px;
            width: 90%;
            max-width: 400px;
            max-height: 85vh;
            overflow-y: auto;
        }
        .modal-header { padding: 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .modal-header h3 { color: white; }
        .close-modal { float: right; background: none; border: none; color: #888; font-size: 22px; cursor: pointer; }
        .profile-avatar-section { text-align: center; padding: 20px; }
        .profile-avatar-emoji { font-size: 70px; background: #2a2a3e; width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
        .profile-field { padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .profile-field label { display: block; font-size: 11px; color: #667eea; }
        .profile-field input, .profile-field textarea, .profile-field select { width: 100%; padding: 10px; background: #2a2a3e; border: none; border-radius: 12px; color: white; }
        .modal-footer { padding: 15px; display: flex; gap: 10px; }
        .save-btn { flex: 1; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; cursor: pointer; }
        
        @media (max-width: 768px) {
            .sidebar { display: none; }
        }
    </style>
</head>
<body>
<div id="authScreen">
    <div class="auth-card">
        <div style="font-size: 36px; margin-bottom: 20px;">⚡</div>
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
    <div class="sidebar">
        <div class="sidebar-header" onclick="openProfileModal()">
            <div id="userAvatar"><div class="avatar-emoji">👤</div></div>
            <div class="user-info">
                <h3 id="userName">Загрузка...</h3>
                <div class="username" id="userLogin">@</div>
            </div>
        </div>
        <div class="menu-item" onclick="openProfileModal()"><span>👤</span> <span>Профиль</span></div>
        <div class="menu-item" onclick="openSettingsModal()"><span>⚙️</span> <span>Настройки</span></div>
        <div class="section-title">👥 ДРУЗЬЯ</div>
        <div class="friends-list" id="friendsList"></div>
        <div class="section-title">💬 ЧАТЫ</div>
        <div class="rooms-list" id="roomsList"></div>
        <div class="section-title">📢 КАНАЛЫ</div>
        <div class="channels-list" id="channelsList"></div>
        <div class="create-btn">
            <button onclick="createRoom()">+ Чат</button>
            <button onclick="createChannel()">+ Канал</button>
        </div>
    </div>
    <div class="chat-area">
        <div class="chat-header">
            <div style="font-weight: bold;">⚡ ATOMGRAM</div>
            <div class="chat-title" id="chatTitle">Выберите чат</div>
            <button class="settings-btn" onclick="openSettingsModal()">⚙️</button>
        </div>
        <div class="messages-area" id="messages"></div>
        <div class="typing-indicator" id="typingIndicator" style="display:none"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Сообщение...">
            <button class="attach-btn" onclick="document.getElementById('fileInput').click()">📎</button>
            <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
            <button id="voiceBtn" class="voice-record-btn" onclick="toggleRecording()">🎤</button>
            <button id="videoBtn" onclick="startVideoRecording()">🎥</button>
            <button onclick="sendMessage()">📤</button>
        </div>
    </div>
</div>

<div id="profileModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Профиль</h3><button class="close-modal" onclick="closeProfileModal()">✕</button></div>
        <div class="profile-avatar-section"><div id="profileAvatar" class="profile-avatar-emoji">👤</div></div>
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
        <div class="profile-field"><label>🎨 Фон чата</label><select id="chatBgSelect" onchange="applyChatBg()"><option value="#0a0a0a">Тёмный</option><option value="#f0f0f0">Светлый</option><option value="linear-gradient(135deg, #1a4a2a 0%, #0a2a1a 100%)">Лес</option><option value="linear-gradient(135deg, #0a2a4a 0%, #001a3a 100%)">Океан</option><option value="radial-gradient(circle at 20% 30%, #1a0a3a, #0a0a1a)">Галактика</option></select></div>
        <div class="profile-field"><label>💬 Мои сообщения</label><input type="color" id="myMsgColor" value="#667eea" onchange="applyMsgColor()"></div>
        <div class="profile-field"><label>💭 Чужие сообщения</label><input type="color" id="otherMsgColor" value="#2a2a3e" onchange="applyMsgColor()"></div>
        <div class="profile-field"><label>📏 Размер шрифта</label><select id="fontSizeSelect" onchange="applyFontSize()"><option value="12px">Маленький</option><option value="14px" selected>Средний</option><option value="16px">Большой</option><option value="18px">Очень большой</option></select></div>
        <div class="modal-footer"><button class="save-btn" onclick="saveSettings()">Сохранить</button></div>
    </div>
</div>

<div id="videoModal" class="video-modal" style="display:none">
    <div class="video-preview"><video id="videoPreview" autoplay muted playsinline></video></div>
    <div class="video-controls">
        <button id="startRecordBtn" onclick="startRecording()">🔴 Запись</button>
        <button id="stopRecordBtn" style="display:none" onclick="stopRecording()">⏹️ Стоп</button>
        <button id="sendVideoBtn" style="display:none" onclick="sendVideoCircle()">📤 Отправить</button>
        <button onclick="closeVideoModal()">❌ Закрыть</button>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null, currentUserData = null;
let currentChat = null, currentChatType = null, currentChatTarget = null;
let allRooms = [], allFriends = [], allChannels = [], friendRequests = [], bannedUsers = [];
let mediaRecorder = null, audioChunks = [], isRecording = false;
let videoStream = null, videoRecorder = null, videoChunks = [];
let recordedVideoBlob = null;
let currentAudio = null;

const savedUsername = localStorage.getItem('atomgram_username');
const savedPassword = localStorage.getItem('atomgram_password');
const savedTheme = localStorage.getItem('atomgram_theme');
if (savedTheme === 'light') document.body.classList.add('light');

function applyTheme() {
    const theme = document.getElementById('themeSelect').value;
    if (theme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
    localStorage.setItem('atomgram_theme', theme);
}
function applyChatBg() {
    const bg = document.getElementById('chatBgSelect').value;
    document.querySelector('.messages-area').style.background = bg;
    document.querySelector('.messages-area').style.backgroundSize = 'cover';
    localStorage.setItem('atomgram_chatBg', bg);
}
function applyMsgColor() {
    const myColor = document.getElementById('myMsgColor').value;
    const otherColor = document.getElementById('otherMsgColor').value;
    let style = document.getElementById('msgColorStyle');
    if (!style) { style = document.createElement('style'); style.id = 'msgColorStyle'; document.head.appendChild(style); }
    style.innerHTML = `.message.my-message .message-content { background: ${myColor} !important; }
        .message:not(.my-message) .message-content { background: ${otherColor} !important; }`;
    localStorage.setItem('atomgram_myMsgColor', myColor);
    localStorage.setItem('atomgram_otherMsgColor', otherColor);
}
function applyFontSize() {
    const size = document.getElementById('fontSizeSelect').value;
    let style = document.getElementById('fontSizeStyle');
    if (!style) { style = document.createElement('style'); style.id = 'fontSizeStyle'; document.head.appendChild(style); }
    style.innerHTML = `.message-text { font-size: ${size} !important; }`;
    localStorage.setItem('atomgram_fontSize', size);
}
function saveSettings() {
    applyTheme(); applyChatBg(); applyMsgColor(); applyFontSize();
    closeSettingsModal();
    alert('Настройки сохранены');
}
function openSettingsModal() {
    document.getElementById('themeSelect').value = document.body.classList.contains('light') ? 'light' : 'dark';
    document.getElementById('chatBgSelect').value = localStorage.getItem('atomgram_chatBg') || '#0a0a0a';
    document.getElementById('myMsgColor').value = localStorage.getItem('atomgram_myMsgColor') || '#667eea';
    document.getElementById('otherMsgColor').value = localStorage.getItem('atomgram_otherMsgColor') || '#2a2a3e';
    document.getElementById('fontSizeSelect').value = localStorage.getItem('atomgram_fontSize') || '14px';
    document.getElementById('settingsModal').style.display = 'flex';
    closeSidebar();
}
function closeSettingsModal() { document.getElementById('settingsModal').style.display = 'none'; }

function getLocalTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function createRoom() {
    const name = prompt('Название чата:');
    if (!name) return;
    socket.emit('createRoom', name, (ok) => { if (ok) { loadData(); setTimeout(() => joinRoom(name), 500); } else alert('Чат есть'); });
}
function createChannel() {
    const name = prompt('Название канала:');
    if (!name) return;
    socket.emit('create channel', { channelName: name }, (res) => { if (res.success) { loadData(); alert('Канал создан'); } else alert(res.error); });
}
function joinRoom(name) {
    currentChat = 'room:' + name; currentChatType = 'room'; currentChatTarget = name;
    socket.emit('joinRoom', name);
    document.getElementById('chatTitle').innerHTML = '# ' + name;
    renderAll();
}
function joinChannel(name) {
    currentChat = 'channel:' + name; currentChatType = 'channel'; currentChatTarget = name;
    socket.emit('joinChannel', name);
    document.getElementById('chatTitle').innerHTML = '📢 ' + name;
    renderAll();
}
function renderAll() {
    const rl = document.getElementById('roomsList');
    rl.innerHTML = allRooms.map(r => '<div class="room-item" onclick="joinRoom(\\'' + r + '\\')"># ' + r + '</div>').join('');
    const cl = document.getElementById('channelsList');
    cl.innerHTML = allChannels.map(c => '<div class="channel-item" onclick="joinChannel(\\'' + c + '\\')">📢 ' + c + '</div>').join('');
    let fl = '';
    friendRequests.forEach(req => { fl += '<div class="friend-item friend-request"><span>👤 ' + req + '</span><div class="friend-actions"><button class="accept-btn" onclick="acceptFriend(\\'' + req + '\\')">✅</button><button class="reject-btn" onclick="rejectFriend(\\'' + req + '\\')">❌</button></div></div>'; });
    allFriends.forEach(f => { fl += '<div class="friend-item" onclick="startPrivateChat(\\'' + f + '\\')"><span>👤 ' + f + '</span><button class="ban-btn" onclick="event.stopPropagation(); banUser(\\'' + f + '\\')">🚫</button></div>'; });
    bannedUsers.forEach(b => { fl += '<div class="friend-item" style="opacity:0.7;"><span>👤 ' + b + ' (забанен)</span><button class="accept-btn" onclick="unbanUser(\\'' + b + '\\')">🔓</button></div>'; });
    document.getElementById('friendsList').innerHTML = fl || '<div style="padding:10px;">Нет друзей</div>';
}
function startPrivateChat(user) {
    currentChat = 'user:' + user; currentChatType = 'private'; currentChatTarget = user;
    socket.emit('joinPrivate', user);
    document.getElementById('chatTitle').innerHTML = '💬 ' + user;
    renderAll();
}
function addFriend() {
    const u = prompt('Username друга:');
    if (u) socket.emit('add friend', { friendUsername: u }, (res) => { alert(res.message || res.error); });
}
function acceptFriend(from) { socket.emit('accept friend', { fromUser: from }); }
function rejectFriend(from) { socket.emit('reject friend', { fromUser: from }); }
function banUser(u) { if (confirm('Забанить ' + u + '?')) socket.emit('ban user', { userToBan: u }); }
function unbanUser(u) { socket.emit('unban user', { userToUnban: u }); }
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChat) return;
    if (currentChatType === 'room') socket.emit('chat message', { type: 'room', target: currentChatTarget, text });
    else if (currentChatType === 'channel') socket.emit('channel message', { channel: currentChatTarget, text });
    else socket.emit('chat message', { type: 'private', target: currentChatTarget, text });
    input.value = '';
}

async function startVideoRecording() {
    document.getElementById('videoModal').style.display = 'flex';
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('videoPreview').srcObject = videoStream;
    } catch(e) { alert('Нет камеры'); closeVideoModal(); }
}
function startRecording() {
    videoChunks = [];
    videoRecorder = new MediaRecorder(videoStream);
    videoRecorder.ondataavailable = e => videoChunks.push(e.data);
    videoRecorder.onstop = () => {
        recordedVideoBlob = new Blob(videoChunks, { type: 'video/mp4' });
        document.getElementById('sendVideoBtn').style.display = 'inline-block';
        document.getElementById('startRecordBtn').style.display = 'none';
        document.getElementById('stopRecordBtn').style.display = 'none';
    };
    videoRecorder.start();
    document.getElementById('startRecordBtn').style.display = 'none';
    document.getElementById('stopRecordBtn').style.display = 'inline-block';
}
function stopRecording() { if (videoRecorder) videoRecorder.stop(); }
function sendVideoCircle() {
    if (!recordedVideoBlob || !currentChat) { alert('Выберите чат'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('video circle', { type: currentChatType, target: currentChatTarget, video: reader.result });
        closeVideoModal();
    };
    reader.readAsDataURL(recordedVideoBlob);
}
function closeVideoModal() {
    document.getElementById('videoModal').style.display = 'none';
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());
    recordedVideoBlob = null;
    document.getElementById('startRecordBtn').style.display = 'inline-block';
    document.getElementById('stopRecordBtn').style.display = 'none';
    document.getElementById('sendVideoBtn').style.display = 'none';
}

function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file || !currentChat) return;
    const reader = new FileReader();
    reader.onloadend = () => { socket.emit('file attachment', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileType: file.type, fileData: reader.result }); };
    reader.readAsDataURL(file);
}

async function toggleRecording() {
    if (isRecording) { stopRecordingAudio(); } else { startRecordingAudio(); }
}
async function startRecordingAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => socket.emit('voice message', { type: currentChatType, target: currentChatTarget, audio: reader.result });
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        document.getElementById('voiceBtn').classList.add('recording');
        document.getElementById('voiceBtn').innerHTML = '⏹️';
    } catch(e) { alert('Нет микрофона'); }
}
function stopRecordingAudio() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('voiceBtn').classList.remove('recording');
        document.getElementById('voiceBtn').innerHTML = '🎤';
    }
}
function playAudio(btn) {
    const audio = new Audio(btn.getAttribute('data-audio'));
    if (currentAudio && !currentAudio.paused) { currentAudio.pause(); btn.innerHTML = '▶️'; }
    currentAudio = audio;
    audio.play();
    btn.innerHTML = '⏸️';
    audio.onended = () => { btn.innerHTML = '▶️'; };
}

function openProfileModal() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editSurname').value = currentUserData?.surname || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileModal').style.display = 'flex';
    closeSidebar();
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; }
function saveProfile() {
    const data = { login: currentUser, name: document.getElementById('editName').value.trim(), surname: document.getElementById('editSurname').value.trim(), bio: document.getElementById('editBio').value.trim() };
    const newPass = document.getElementById('editPassword').value.trim();
    if (newPass) data.password = newPass;
    socket.emit('update profile', data, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); closeProfileModal(); alert('Сохранено'); } else alert(res.error); });
}
function updateUI() {
    const name = (currentUserData?.name + ' ' + (currentUserData?.surname || '')).trim() || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
}
function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('login', { username: u, password: p }, (res) => {
        if (res.success) {
            currentUser = u;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_username', u);
            localStorage.setItem('atomgram_password', p);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI(); loadData();
            applySavedSettings();
        } else document.getElementById('authError').innerText = res.error;
    });
}
function register() {
    const u = document.getElementById('regUsername').value.trim();
    const n = document.getElementById('regName').value.trim();
    const s = document.getElementById('regSurname').value.trim();
    const p = document.getElementById('regPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('register', { username: u, name: n, surname: s, password: p }, (res) => {
        if (res.success) { document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.'; showLogin(); }
        else document.getElementById('authError').innerText = res.error;
    });
}
function showRegister() { document.getElementById('authForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; document.getElementById('authError').innerText = ''; }
function showLogin() { document.getElementById('authForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; document.getElementById('authError').innerText = ''; }
if (savedUsername && savedPassword) { document.getElementById('loginUsername').value = savedUsername; document.getElementById('loginPassword').value = savedPassword; setTimeout(login, 100); }
function loadData() {
    socket.emit('getRooms', (r) => { allRooms = r; renderAll(); });
    socket.emit('getFriends', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; bannedUsers = d.banned || []; renderAll(); });
    socket.emit('getChannels', (c) => { allChannels = c; renderAll(); });
}
function applySavedSettings() {
    const bg = localStorage.getItem('atomgram_chatBg');
    if (bg) { document.querySelector('.messages-area').style.background = bg; document.querySelector('.messages-area').style.backgroundSize = 'cover'; }
    const myColor = localStorage.getItem('atomgram_myMsgColor');
    const otherColor = localStorage.getItem('atomgram_otherMsgColor');
    if (myColor || otherColor) {
        let style = document.getElementById('msgColorStyle');
        if (!style) { style = document.createElement('style'); style.id = 'msgColorStyle'; document.head.appendChild(style); }
        style.innerHTML = `.message.my-message .message-content { background: ${myColor || '#667eea'} !important; }
            .message:not(.my-message) .message-content { background: ${otherColor || '#2a2a3e'} !important; }`;
    }
    const fontSize = localStorage.getItem('atomgram_fontSize');
    if (fontSize) {
        let style = document.getElementById('fontSizeStyle');
        if (!style) { style = document.createElement('style'); style.id = 'fontSizeStyle'; document.head.appendChild(style); }
        style.innerHTML = `.message-text { font-size: ${fontSize} !important; }`;
    }
}
socket.on('friends update', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; bannedUsers = d.banned || []; renderAll(); });
socket.on('rooms update', (r) => { allRooms = r; renderAll(); });
socket.on('channels update', (c) => { allChannels = c; renderAll(); });
socket.on('chat history', (data) => {
    if ((currentChatType === 'room' && data.type === 'room' && data.room === currentChatTarget) ||
        (currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget) ||
        (currentChatType === 'channel' && data.type === 'channel' && data.channel === currentChatTarget)) {
        document.getElementById('messages').innerHTML = '';
        data.messages.forEach(m => addMessage(m));
    }
});
socket.on('chat message', (msg) => {
    let show = false;
    if (msg.type === 'room' && currentChatType === 'room' && msg.room === currentChatTarget) show = true;
    if (msg.type === 'private' && currentChatType === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) show = true;
    if (msg.type === 'channel' && currentChatType === 'channel' && msg.channel === currentChatTarget) show = true;
    if (show) { addMessage(msg); document.getElementById('messages').scrollTop = 9999; }
});
socket.on('voice message', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVoiceMessage(data);
    }
});
socket.on('video circle', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVideoMessage(data);
    }
});
socket.on('file attachment', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addFileMessage(data);
    }
});
function addMessage(m) {
    const div = document.createElement('div');
    div.className = 'message';
    if (m.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-username">' + escape(m.from) + '</div><div class="message-text">' + escape(m.text) + '</div><div class="message-time">' + (m.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVoiceMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-username">' + escape(d.from) + '</div><div class="voice-message"><button onclick="playAudio(this)" data-audio="' + d.audio + '">▶️</button><span>Голосовое</span></div><div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVideoMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-username">' + escape(d.from) + '</div><video class="video-circle" controls autoplay loop src="' + d.video + '"></video><div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addFileMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    const icon = d.fileType?.startsWith('image/') ? '🖼️' : '📄';
    div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-username">' + escape(d.from) + '</div><div class="file-attachment"><span>' + icon + '</span><a href="' + d.fileData + '" download="' + d.fileName + '">' + d.fileName + '</a></div><div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function escape(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
</script>
</body>
</html>`);
});

// ========== СОКЕТЫ ==========
const usersOnline = new Map();

io.on('connection', (socket) => {
    let currentUser = null, currentRoom = null;

    socket.on('register', (data, cb) => {
        const { username, name, surname, password } = data;
        if (users[username]) cb({ success: false, error: 'Username занят' });
        else {
            users[username] = { username, password, name: name || '', surname: surname || '', bio: '', avatar: '👤', avatarType: 'emoji', avatarData: null, friends: [], friendRequests: [], banned: [] };
            saveData(); cb({ success: true });
        }
    });

    socket.on('login', (data, cb) => {
        const { username, password } = data;
        if (!users[username]) cb({ success: false, error: 'Нет пользователя' });
        else if (users[username].password !== password) cb({ success: false, error: 'Неверный пароль' });
        else {
            currentUser = username;
            usersOnline.set(socket.id, username);
            cb({ success: true, userData: users[username] });
            socket.emit('friends update', { friends: users[username].friends || [], requests: users[username].friendRequests || [], banned: users[username].banned || [] });
        }
    });

    socket.on('add friend', (data, cb) => {
        const { friendUsername } = data;
        if (!users[friendUsername]) cb({ success: false, error: 'Нет пользователя' });
        else if (friendUsername === currentUser) cb({ success: false, error: 'Нельзя себя' });
        else if (users[currentUser].friends?.includes(friendUsername)) cb({ success: false, error: 'Уже друг' });
        else {
            if (!users[friendUsername].friendRequests) users[friendUsername].friendRequests = [];
            if (users[friendUsername].friendRequests.includes(currentUser)) cb({ success: false, error: 'Запрос уже есть' });
            else {
                users[friendUsername].friendRequests.push(currentUser);
                saveData();
                cb({ success: true, message: 'Запрос отправлен' });
                const fs = getSocketByUsername(friendUsername);
                if (fs) fs.emit('friends update', { friends: users[friendUsername].friends || [], requests: users[friendUsername].friendRequests || [], banned: users[friendUsername].banned || [] });
            }
        }
    });

    socket.on('accept friend', (data) => {
        const { fromUser } = data;
        if (users[currentUser].friendRequests?.includes(fromUser)) {
            users[currentUser].friendRequests = users[currentUser].friendRequests.filter(f => f !== fromUser);
            if (!users[currentUser].friends) users[currentUser].friends = [];
            if (!users[fromUser].friends) users[fromUser].friends = [];
            if (!users[currentUser].friends.includes(fromUser)) users[currentUser].friends.push(fromUser);
            if (!users[fromUser].friends.includes(currentUser)) users[fromUser].friends.push(currentUser);
            saveData();
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
            const fs = getSocketByUsername(fromUser);
            if (fs) fs.emit('friends update', { friends: users[fromUser].friends, requests: users[fromUser].friendRequests, banned: users[fromUser].banned || [] });
        }
    });

    socket.on('reject friend', (data) => {
        const { fromUser } = data;
        if (users[currentUser].friendRequests?.includes(fromUser)) {
            users[currentUser].friendRequests = users[currentUser].friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
        }
    });

    socket.on('ban user', (data) => {
        const { userToBan } = data;
        if (!users[currentUser].banned) users[currentUser].banned = [];
        if (!users[currentUser].banned.includes(userToBan)) {
            users[currentUser].banned.push(userToBan);
            if (users[currentUser].friends?.includes(userToBan)) users[currentUser].friends = users[currentUser].friends.filter(f => f !== userToBan);
            saveData();
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
        }
    });

    socket.on('unban user', (data) => {
        const { userToUnban } = data;
        if (users[currentUser].banned?.includes(userToUnban)) {
            users[currentUser].banned = users[currentUser].banned.filter(b => b !== userToUnban);
            saveData();
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
        }
    });

    socket.on('getFriends', (cb) => { cb({ friends: users[currentUser]?.friends || [], requests: users[currentUser]?.friendRequests || [], banned: users[currentUser]?.banned || [] }); });
    socket.on('getRooms', (cb) => cb(Object.keys(publicRooms)));
    socket.on('createRoom', (name, cb) => { if (!publicRooms[name]) { publicRooms[name] = { messages: [] }; saveData(); cb(true); } else cb(false); });
    socket.on('joinRoom', (name) => { if (currentRoom) socket.leave(currentRoom); currentRoom = name; socket.join(name); socket.emit('chat history', { type: 'room', room: name, messages: publicRooms[name]?.messages || [] }); });
    socket.on('joinPrivate', (target) => { currentRoom = null; const id = [currentUser, target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; socket.emit('chat history', { type: 'private', with: target, messages: privateChats[id].messages || [] }); });
    socket.on('create channel', (data, cb) => { const { channelName } = data; if (channels[channelName]) cb({ success: false, error: 'Канал есть' }); else { channels[channelName] = { name: channelName, messages: [] }; saveData(); cb({ success: true, message: 'Канал создан' }); } });
    socket.on('joinChannel', (name) => { if (channels[name]) socket.emit('chat history', { type: 'channel', channel: name, messages: channels[name].messages || [] }); });
    socket.on('channel message', (data) => { const { channel, text } = data; if (channels[channel]) { const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), type: 'channel', channel }; channels[channel].messages.push(msg); io.emit('chat message', msg); saveData(); } });
    socket.on('getChannels', (cb) => cb(Object.keys(channels)));
    socket.on('update profile', (data, cb) => { if (users[data.login]) { if (data.name) users[data.login].name = data.name; if (data.surname) users[data.login].surname = data.surname; if (data.bio) users[data.login].bio = data.bio; if (data.password) users[data.login].password = data.password; saveData(); cb({ success: true, userData: users[data.login] }); } else cb({ success: false }); });
    socket.on('chat message', (data) => {
        const { type, target, text } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), type };
        if (type === 'room') { msg.room = target; if (publicRooms[target]) { publicRooms[target].messages.push(msg); io.to(target).emit('chat message', msg); saveData(); } }
        else { msg.to = target; const id = [currentUser, target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; privateChats[id].messages.push(msg); io.emit('chat message', msg); saveData(); }
    });
    socket.on('voice message', (data) => {
        const msg = { id: Date.now(), from: currentUser, audio: data.audio, time: new Date().toLocaleTimeString(), type: data.type };
        if (data.type === 'private') { msg.to = data.target; const id = [currentUser, data.target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; privateChats[id].messages.push(msg); io.emit('voice message', msg); saveData(); }
    });
    socket.on('video circle', (data) => {
        const msg = { id: Date.now(), from: currentUser, video: data.video, time: new Date().toLocaleTimeString(), type: data.type };
        if (data.type === 'private') { msg.to = data.target; const id = [currentUser, data.target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; privateChats[id].messages.push(msg); io.emit('video circle', msg); saveData(); }
    });
    socket.on('file attachment', (data) => {
        const msg = { id: Date.now(), from: currentUser, fileName: data.fileName, fileType: data.fileType, fileData: data.fileData, time: new Date().toLocaleTimeString(), type: data.type };
        if (data.type === 'private') { msg.to = data.target; const id = [currentUser, data.target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; privateChats[id].messages.push(msg); io.emit('file attachment', msg); saveData(); }
    });

    function getSocketByUsername(u) { for (let [id, user] of usersOnline.entries()) if (user === u) return io.sockets.sockets.get(id); return null; }
    socket.on('disconnect', () => { if (currentUser) usersOnline.delete(socket.id); });
});

const PORT = process.env.PORT || 3000;
const ip = getLocalIP();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════╗`);
    console.log(`║     🚀 ATOMGRAM ЗАПУЩЕН      ║`);
    console.log(`╠════════════════════════════════╣`);
    console.log(`║  💻 http://localhost:${PORT}      ║`);
    console.log(`║  📱 http://${ip}:${PORT}     ║`);
    console.log(`╠════════════════════════════════╣`);
    console.log(`║  ✅ Всё работает!            ║`);
    console.log(`║  ✅ Видеокружки ✅            ║`);
    console.log(`║  ✅ Голосовые ✅              ║`);
    console.log(`║  ✅ Файлы ✅                  ║`);
    console.log(`║  ✅ Друзья, каналы, чаты     ║`);
    console.log(`╚════════════════════════════════╝\n`);
});
