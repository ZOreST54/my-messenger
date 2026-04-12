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
let stories = {};
let savedMessages = {};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = data.users || {};
            privateChats = data.privateChats || {};
            channels = data.channels || {};
            stories = data.stories || {};
            savedMessages = data.savedMessages || {};
            console.log('✅ Данные загружены');
        }
    } catch (e) { console.log('Ошибка загрузки:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, stories, savedMessages }, null, 2));
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
        .voice-message { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .voice-message button { background: none; border: none; font-size: 22px; cursor: pointer; color: inherit; }
        .voice-message audio { height: 38px; border-radius: 20px; max-width: 160px; }
        .video-circle { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; cursor: pointer; background: #2a2a3e; }
        .file-attachment { background: rgba(102,126,234,0.15); padding: 8px 12px; border-radius: 14px; display: flex; align-items: center; gap: 10px; font-size: 13px; }
        .file-attachment a { color: inherit; text-decoration: none; }
        .typing-indicator { font-size: 12px; color: #888; padding: 4px 16px; font-style: italic; }
        
        .input-area { display: flex; padding: 12px 16px; gap: 8px; flex-wrap: wrap; flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.08); }
        .input-area input { flex: 1; padding: 12px 16px; border: none; border-radius: 28px; font-size: 15px; background: rgba(255,255,255,0.08); color: inherit; }
        .input-area input::placeholder { color: #888; }
        .input-area button { padding: 12px 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 28px; cursor: pointer; font-size: 16px; font-weight: 500; }
        .attach-btn, .voice-record-btn, .video-record-btn, .sticker-btn { background: rgba(255,255,255,0.08) !important; color: inherit !important; }
        .voice-record-btn.recording { animation: pulse 1s infinite; background: #ff4444 !important; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        
        .sticker-picker { position: fixed; bottom: 80px; left: 0; right: 0; background: #1e1e2e; border-radius: 24px 24px 0 0; padding: 16px; display: none; flex-wrap: wrap; gap: 12px; z-index: 150; max-height: 200px; overflow-y: auto; }
        .sticker-picker.open { display: flex; }
        .sticker { font-size: 42px; cursor: pointer; padding: 8px; border-radius: 16px; }
        .sticker:active { transform: scale(1.1); }
        
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
        .avatar-picker { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 16px; padding: 12px; background: #2a2a3e; border-radius: 24px; }
        .avatar-option { font-size: 32px; cursor: pointer; padding: 6px; border-radius: 50%; }
        .modal-footer { padding: 20px; display: flex; gap: 12px; }
        .save-btn { flex: 1; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 28px; cursor: pointer; font-size: 15px; font-weight: 600; }
        .upload-btn { flex: 1; padding: 14px; background: #2a2a3e; color: inherit; border: 1px solid #667eea; border-radius: 28px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .delete-avatar-btn { background: #ff4444; color: white; border: none; padding: 14px; border-radius: 28px; cursor: pointer; flex: 1; font-size: 14px; font-weight: 500; }
        
        .notification { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #1e1e2e; color: white; padding: 12px 20px; border-radius: 30px; font-size: 14px; z-index: 1000; text-align: center; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        
        @media (min-width: 768px) { .sidebar { position: relative; left: 0 !important; width: 300px; } .sidebar-overlay { display: none !important; } .menu-btn { display: none; } .message-bubble { max-width: 60%; } }
        @media (max-width: 480px) { .message-bubble { max-width: 85%; } .video-circle { width: 95px; height: 95px; } }
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
        <div class="menu-item" onclick="openSavedMessages()"><span>⭐</span> <span>Сохранённые</span></div>
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
        <div class="typing-indicator" id="typingIndicator" style="display:none"></div>
        <div class="sticker-picker" id="stickerPicker">
            <div class="sticker" onclick="sendSticker('😀')">😀</div><div class="sticker" onclick="sendSticker('😂')">😂</div>
            <div class="sticker" onclick="sendSticker('😍')">😍</div><div class="sticker" onclick="sendSticker('😎')">😎</div>
            <div class="sticker" onclick="sendSticker('🥳')">🥳</div><div class="sticker" onclick="sendSticker('🔥')">🔥</div>
            <div class="sticker" onclick="sendSticker('❤️')">❤️</div><div class="sticker" onclick="sendSticker('🎉')">🎉</div>
            <div class="sticker" onclick="sendSticker('👍')">👍</div><div class="sticker" onclick="sendSticker('👎')">👎</div>
            <div class="sticker" onclick="sendSticker('🐱')">🐱</div><div class="sticker" onclick="sendSticker('🐶')">🐶</div>
        </div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button class="sticker-btn" onclick="toggleStickerPicker()">😊</button>
            <button class="attach-btn" onclick="document.getElementById('fileInput').click()">📎</button>
            <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
            <button id="voiceBtn" class="voice-record-btn" onclick="toggleRecording()">🎤</button>
            <button onclick="sendMessage()">📤</button>
        </div>
    </div>
</div>

<div id="profileModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Профиль</h3><button class="close-modal" onclick="closeProfileModal()">✕</button></div>
        <div class="profile-avatar-section">
            <div id="profileAvatar"><div class="profile-avatar-emoji">👤</div></div>
            <div id="avatarPicker" class="avatar-picker" style="display:none;">
                <div class="avatar-option" onclick="selectAvatar('😀')">😀</div><div class="avatar-option" onclick="selectAvatar('😎')">😎</div>
                <div class="avatar-option" onclick="selectAvatar('👨')">👨</div><div class="avatar-option" onclick="selectAvatar('👩')">👩</div>
                <div class="avatar-option" onclick="selectAvatar('🦸')">🦸</div><div class="avatar-option" onclick="selectAvatar('🐱')">🐱</div>
                <div class="avatar-option" onclick="selectAvatar('🐶')">🐶</div><div class="avatar-option" onclick="selectAvatar('🚀')">🚀</div>
            </div>
            <input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()">
        </div>
        <div class="profile-field"><label>Имя</label><input type="text" id="editName"></div>
        <div class="profile-field"><label>Фамилия</label><input type="text" id="editSurname"></div>
        <div class="profile-field"><label>О себе</label><textarea id="editBio" rows="2"></textarea></div>
        <div class="profile-field"><label>Новый пароль</label><input type="password" id="editPassword" placeholder="Оставьте пустым"></div>
        <div class="modal-footer">
            <button class="upload-btn" onclick="document.getElementById('avatarUpload').click()">📷 Фото</button>
            <button class="delete-avatar-btn" onclick="deleteAvatar()">🗑️ Удалить</button>
            <button class="save-btn" onclick="saveProfile()">Сохранить</button>
        </div>
    </div>
</div>

<div id="settingsModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Настройки</h3><button class="close-modal" onclick="closeSettingsModal()">✕</button></div>
        <div class="profile-field"><label>🌓 Тема</label><select id="themeSelect" onchange="applyTheme()"><option value="dark">Тёмная</option><option value="light">Светлая</option></select></div>
        <div class="profile-field"><label>🎨 Фон чата</label><select id="chatBgSelect" onchange="applyChatBg()"><option value="#0a0a0a">Тёмный</option><option value="#f0f2f5">Светлый</option></select></div>
        <div class="profile-field"><label>💬 Мои сообщения</label><input type="color" id="myMsgColor" value="#667eea" onchange="applyMsgColor()"></div>
        <div class="profile-field"><label>💭 Чужие сообщения</label><input type="color" id="otherMsgColor" value="#2a2a3e" onchange="applyMsgColor()"></div>
        <div class="profile-field"><label>📏 Размер шрифта</label><select id="fontSizeSelect" onchange="applyFontSize()"><option value="13px">Маленький</option><option value="15px" selected>Средний</option><option value="17px">Большой</option></select></div>
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
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentAudio = null;

function getLocalTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
}
function toggleStickerPicker() { document.getElementById('stickerPicker').classList.toggle('open'); }
function sendSticker(sticker) {
    if (!currentChat) { alert('Выберите чат'); return; }
    socket.emit('chat message', { type: currentChatType, target: currentChatTarget, text: sticker });
    document.getElementById('stickerPicker').classList.remove('open');
}

function renderAvatar(avatarData, avatarType, size) {
    if (avatarType === 'image' && avatarData) {
        if (size === 'large') return '<img src="' + avatarData + '" style="width:120px; height:120px; border-radius:50%; object-fit:cover;">';
        return '<img src="' + avatarData + '" class="avatar-img">';
    } else {
        const emoji = avatarData || '👤';
        if (size === 'large') return '<div class="profile-avatar-emoji">' + emoji + '</div>';
        return '<div class="avatar-emoji">' + emoji + '</div>';
    }
}

function openSavedMessages() {
    currentChat = 'saved';
    currentChatType = 'saved';
    currentChatTarget = 'saved';
    document.getElementById('chatTitle').innerHTML = '⭐ Сохранённые';
    socket.emit('get saved messages');
}

socket.on('saved messages history', (messages) => {
    if (currentChat === 'saved') {
        const msgsDiv = document.getElementById('messages');
        msgsDiv.innerHTML = '';
        messages.forEach(m => {
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(m.from) + '</div><div class="message-text">' + escapeHtml(m.text) + '</div><div class="message-time">' + m.time + '</div></div></div>';
            msgsDiv.appendChild(div);
        });
    }
});

function createChannel() {
    const name = prompt('Название канала:');
    if (!name) return;
    socket.emit('create channel', { channelName: name }, (res) => { if (res.success) { loadData(); alert('Канал создан'); } else alert(res.error); });
}
function joinChannel(name) {
    currentChat = 'channel:' + name;
    currentChatType = 'channel';
    currentChatTarget = name;
    socket.emit('joinChannel', name);
    document.getElementById('chatTitle').innerHTML = '# ' + name;
    renderAll();
}
function startPrivateChat(user) {
    currentChat = 'user:' + user;
    currentChatType = 'private';
    currentChatTarget = user;
    socket.emit('joinPrivate', user);
    document.getElementById('chatTitle').innerHTML = user;
    renderAll();
}
function renderAll() {
    const cl = document.getElementById('channelsList');
    cl.innerHTML = allChannels.map(c => '<div class="channel-item" onclick="joinChannel(\\'' + c + '\\')">📢 ' + c + '</div>').join('');
    let fl = '';
    friendRequests.forEach(req => { fl += '<div class="friend-item friend-request"><span>👤 ' + req + '</span><div class="friend-actions"><button class="accept-btn" onclick="acceptFriend(\\'' + req + '\\')">✅</button><button class="reject-btn" onclick="rejectFriend(\\'' + req + '\\')">❌</button></div></div>'; });
    allFriends.forEach(f => { fl += '<div class="friend-item" onclick="startPrivateChat(\\'' + f + '\\')"><span>👤 ' + f + '</span><button class="ban-btn" onclick="event.stopPropagation(); banUser(\\'' + f + '\\')">🚫</button></div>'; });
    bannedUsers.forEach(b => { fl += '<div class="friend-item" style="opacity:0.6;"><span>👤 ' + b + ' (забанен)</span></div>'; });
    document.getElementById('friendsList').innerHTML = fl || '<div style="padding:12px; text-align:center; color:#888;">Нет друзей</div>';
}
function addFriend() {
    const u = prompt('Введите username друга:');
    if (!u) return;
    socket.emit('add friend', { friendUsername: u }, (res) => { alert(res.message || res.error); });
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

function showNotification(title, body) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerHTML = '<strong>' + title + '</strong><br>' + body;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
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
    } catch(e) { alert('Нет доступа к микрофону'); }
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
    if (currentAudio && !currentAudio.paused) { currentAudio.pause(); btn.innerHTML = '▶️'; }
    currentAudio = new Audio(btn.getAttribute('data-audio'));
    currentAudio.play();
    btn.innerHTML = '⏸️';
    currentAudio.onended = () => { btn.innerHTML = '▶️'; };
}

function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file || !currentChat) return;
    const reader = new FileReader();
    reader.onloadend = () => { socket.emit('file attachment', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileType: file.type, fileData: reader.result }); };
    reader.readAsDataURL(file);
}

function openProfileModal() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editSurname').value = currentUserData?.surname || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileAvatar').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType, 'large');
    document.getElementById('profileModal').style.display = 'flex';
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; document.getElementById('avatarPicker').style.display = 'none'; }
function toggleAvatarPicker() { const p = document.getElementById('avatarPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
let selectedAvatar = '👤';
function selectAvatar(avatar) { selectedAvatar = avatar; document.getElementById('profileAvatar').innerHTML = '<div class="profile-avatar-emoji">' + avatar + '</div>'; document.getElementById('avatarPicker').style.display = 'none'; }
function uploadAvatar() {
    const file = document.getElementById('avatarUpload').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { socket.emit('upload avatar', { login: currentUser, avatarData: reader.result }, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); alert('Аватар загружен'); closeProfileModal(); } }); };
    reader.readAsDataURL(file);
}
function deleteAvatar() {
    if (confirm('Удалить фото аватара?')) {
        socket.emit('delete avatar', { login: currentUser }, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); alert('Аватар удалён'); closeProfileModal(); } });
    }
}
function saveProfile() {
    const data = { login: currentUser, name: document.getElementById('editName').value.trim(), surname: document.getElementById('editSurname').value.trim(), bio: document.getElementById('editBio').value.trim() };
    const newPass = document.getElementById('editPassword').value.trim();
    if (newPass) data.password = newPass;
    if (selectedAvatar !== currentUserData?.avatar) { data.avatar = selectedAvatar; data.avatarType = 'emoji'; }
    socket.emit('update profile', data, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); closeProfileModal(); alert('Сохранено'); } else alert(res.error); });
}
function updateUI() {
    const name = (currentUserData?.name + ' ' + (currentUserData?.surname || '')).trim() || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
    document.getElementById('userAvatar').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType);
}

function applyTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
    localStorage.setItem('atomgram_theme', theme);
}
function applyChatBg() {
    const bg = document.getElementById('chatBgSelect').value;
    document.querySelector('.messages-area').style.background = bg;
    localStorage.setItem('atomgram_chatBg', bg);
}
function applyMsgColor() {
    const myColor = document.getElementById('myMsgColor').value;
    const otherColor = document.getElementById('otherMsgColor').value;
    let style = document.getElementById('msgColorStyle');
    if (!style) { style = document.createElement('style'); style.id = 'msgColorStyle'; document.head.appendChild(style); }
    style.innerHTML = '.message.my-message .message-content { background: ' + myColor + ' !important; } .message:not(.my-message) .message-content { background: ' + otherColor + ' !important; }';
    localStorage.setItem('atomgram_myMsgColor', myColor);
    localStorage.setItem('atomgram_otherMsgColor', otherColor);
}
function applyFontSize() {
    const size = document.getElementById('fontSizeSelect').value;
    let style = document.getElementById('fontSizeStyle');
    if (!style) { style = document.createElement('style'); style.id = 'fontSizeStyle'; document.head.appendChild(style); }
    style.innerHTML = '.message-text { font-size: ' + size + ' !important; }';
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
    document.getElementById('fontSizeSelect').value = localStorage.getItem('atomgram_fontSize') || '15px';
    document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettingsModal() { document.getElementById('settingsModal').style.display = 'none'; }
function applySavedSettings() {
    const theme = localStorage.getItem('atomgram_theme');
    if (theme) { document.body.classList.remove('dark', 'light'); document.body.classList.add(theme); }
    const bg = localStorage.getItem('atomgram_chatBg');
    if (bg) { document.querySelector('.messages-area').style.background = bg; }
    const myColor = localStorage.getItem('atomgram_myMsgColor');
    const otherColor = localStorage.getItem('atomgram_otherMsgColor');
    if (myColor || otherColor) {
        let style = document.getElementById('msgColorStyle');
        if (!style) { style = document.createElement('style'); style.id = 'msgColorStyle'; document.head.appendChild(style); }
        style.innerHTML = '.message.my-message .message-content { background: ' + (myColor || '#667eea') + ' !important; } .message:not(.my-message) .message-content { background: ' + (otherColor || '#2a2a3e') + ' !important; }';
    }
    const fontSize = localStorage.getItem('atomgram_fontSize');
    if (fontSize) {
        let style = document.getElementById('fontSizeStyle');
        if (!style) { style = document.createElement('style'); style.id = 'fontSizeStyle'; document.head.appendChild(style); }
        style.innerHTML = '.message-text { font-size: ' + fontSize + ' !important; }';
    }
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
            updateUI();
            loadData();
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

const savedUsername = localStorage.getItem('atomgram_username');
const savedPassword = localStorage.getItem('atomgram_password');
if (savedUsername && savedPassword) { document.getElementById('loginUsername').value = savedUsername; document.getElementById('loginPassword').value = savedPassword; setTimeout(login, 100); }

function loadData() {
    socket.emit('getFriends', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; bannedUsers = d.banned || []; renderAll(); });
    socket.emit('getChannels', (c) => { allChannels = c; renderAll(); });
}
socket.on('friends update', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; bannedUsers = d.banned || []; renderAll(); });
socket.on('channels update', (c) => { allChannels = c; renderAll(); });
socket.on('chat history', (data) => {
    if ((currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget) ||
        (currentChatType === 'channel' && data.type === 'channel' && data.channel === currentChatTarget)) {
        document.getElementById('messages').innerHTML = '';
        data.messages.forEach(m => addMessage(m));
    }
});
socket.on('chat message', (msg) => {
    let show = false;
    if (msg.type === 'private' && currentChatType === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) show = true;
    if (msg.type === 'channel' && currentChatType === 'channel' && msg.channel === currentChatTarget) show = true;
    if (show) { addMessage(msg); document.getElementById('messages').scrollTop = 9999; }
});
socket.on('voice message', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVoiceMessage(data);
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
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + escapeHtml(m.from) + '\')">👤</div>' +
        '<div class="message-bubble"><div class="message-content">' +
        '<div class="message-username" onclick="viewUserProfile(\'' + escapeHtml(m.from) + '\')">' + escapeHtml(m.from) + '</div>' +
        '<div class="message-text">' + escapeHtml(m.text) + '</div>' +
        '<div class="message-time">' + (m.time || getLocalTime()) + '</div>' +
        '</div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVoiceMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + escapeHtml(d.from) + '\')">👤</div>' +
        '<div class="message-bubble"><div class="message-content">' +
        '<div class="message-username" onclick="viewUserProfile(\'' + escapeHtml(d.from) + '\')">' + escapeHtml(d.from) + '</div>' +
        '<div class="voice-message"><button onclick="playAudio(this)" data-audio="' + d.audio + '">▶️</button><span>Голосовое</span></div>' +
        '<div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addFileMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    const icon = d.fileType?.startsWith('image/') ? '🖼️' : '📄';
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + escapeHtml(d.from) + '\')">👤</div>' +
        '<div class="message-bubble"><div class="message-content">' +
        '<div class="message-username" onclick="viewUserProfile(\'' + escapeHtml(d.from) + '\')">' + escapeHtml(d.from) + '</div>' +
        '<div class="file-attachment"><span>' + icon + '</span><a href="' + d.fileData + '" download="' + d.fileName + '">' + d.fileName + '</a></div>' +
        '<div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function viewUserProfile(username) {
    socket.emit('getUserProfile', username, (profile) => {
        if (profile) {
            alert('👤 ' + (profile.name || username) + '\n📝 ' + (profile.bio || 'Нет описания'));
        }
    });
}
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, function(m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }
</script>
</body>
</html>`);
});

// ========== СОКЕТЫ ==========
const usersOnline = new Map();

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('register', (data, cb) => {
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
        }
    });

    socket.on('login', (data, cb) => {
        const { username, password } = data;
        if (!users[username]) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (users[username].password !== password) {
            cb({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            usersOnline.set(socket.id, username);
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

    socket.on('upload avatar', (data, cb) => {
        const { login, avatarData } = data;
        if (users[login]) {
            const filename = login + '_' + Date.now() + '.jpg';
            const filepath = path.join(AVATAR_DIR, filename);
            const base64Data = avatarData.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filepath, base64Data, 'base64');
            users[login].avatarType = 'image';
            users[login].avatarData = '/avatars/' + filename;
            users[login].avatar = null;
            saveData();
            cb({
                success: true,
                userData: {
                    username: users[login].username,
                    name: users[login].name,
                    surname: users[login].surname,
                    bio: users[login].bio,
                    avatar: users[login].avatar,
                    avatarType: users[login].avatarType,
                    avatarData: users[login].avatarData
                }
            });
        } else cb({ success: false });
    });

    socket.on('delete avatar', (data, cb) => {
        const { login } = data;
        if (users[login]) {
            if (users[login].avatarData && users[login].avatarType === 'image') {
                const oldFile = path.join(AVATAR_DIR, path.basename(users[login].avatarData));
                if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
            }
            users[login].avatarType = 'emoji';
            users[login].avatarData = null;
            users[login].avatar = '👤';
            saveData();
            cb({
                success: true,
                userData: {
                    username: users[login].username,
                    name: users[login].name,
                    surname: users[login].surname,
                    bio: users[login].bio,
                    avatar: users[login].avatar,
                    avatarType: users[login].avatarType,
                    avatarData: users[login].avatarData
                }
            });
        } else cb({ success: false });
    });

    socket.on('update profile', (data, cb) => {
        if (users[data.login]) {
            if (data.name !== undefined) users[data.login].name = data.name;
            if (data.surname !== undefined) users[data.login].surname = data.surname;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.avatar !== undefined) {
                users[data.login].avatar = data.avatar;
                users[data.login].avatarType = 'emoji';
                users[data.login].avatarData = null;
            }
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
        } else cb({ success: false });
    });

    socket.on('getUserProfile', (username, cb) => {
        if (users[username]) {
            cb({
                name: users[username].name,
                surname: users[username].surname,
                bio: users[username].bio,
                avatar: users[username].avatar,
                avatarType: users[username].avatarType,
                avatarData: users[username].avatarData
            });
        } else cb(null);
    });

    socket.on('add friend', (data, cb) => {
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
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chat history', {
            type: 'private',
            with: target,
            messages: privateChats[id].messages || []
        });
    });

    socket.on('chat message', (data) => {
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

    socket.on('voice message', (data) => {
        const { type, target, audio } = data;
        const msg = {
            id: Date.now(),
            from: currentUser,
            audio: audio,
            time: new Date().toLocaleTimeString(),
            type: type
        };
        if (type === 'private') {
            msg.to = target;
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            io.emit('voice message', msg);
            saveData();
        }
    });

    socket.on('file attachment', (data) => {
        const { type, target, fileName, fileType, fileData } = data;
        const msg = {
            id: Date.now(),
            from: currentUser,
            fileName: fileName,
            fileType: fileType,
            fileData: fileData,
            time: new Date().toLocaleTimeString(),
            type: type
        };
        if (type === 'private') {
            msg.to = target;
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            io.emit('file attachment', msg);
            saveData();
        }
    });

    socket.on('get saved messages', () => {
        if (savedMessages[currentUser]) {
            socket.emit('saved messages history', savedMessages[currentUser]);
        } else {
            socket.emit('saved messages history', []);
        }
    });

    socket.on('save message', (data) => {
        if (!currentUser) return;
        if (!savedMessages[currentUser]) savedMessages[currentUser] = [];
        savedMessages[currentUser].push({
            id: data.msgId,
            from: data.from,
            text: data.text,
            time: new Date().toLocaleTimeString()
        });
        if (savedMessages[currentUser].length > 200) savedMessages[currentUser].shift();
        saveData();
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            usersOnline.delete(socket.id);
            console.log(`👋 ${currentUser} отключился`);
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
    console.log(`║  🎤 Голосовые сообщения                  ║`);
    console.log(`║  📎 Файлы и изображения                  ║`);
    console.log(`║  ⭐ Сохранённые сообщения                 ║`);
    console.log(`║  🌓 Тёмная/светлая тема                  ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);
});
