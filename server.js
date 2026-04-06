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

// ========== ДАННЫЕ ==========
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) { console.log('Ошибка загрузки:', e); }
    return { users: {}, privateChats: {}, publicRooms: { general: { messages: [], users: [] } }, channels: {} };
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

// ========== АССИСТЕНТ ==========
if (!users["assistant"]) {
    users["assistant"] = {
        username: "assistant",
        password: "assistant123",
        name: "ИИ Ассистент",
        avatar: "🤖",
        avatarType: "emoji",
        avatarData: null,
        bio: "Искусственный интеллект помощник. Напиши 'помощь' для списка команд.",
        status: "online",
        isBot: true,
        friends: [],
        banned: [],
        lastSeen: new Date()
    };
    saveData();
}

// ========== КАНАЛ ПО УМОЛЧАНИЮ ==========
if (!channels["announcements"]) {
    channels["announcements"] = {
        name: "announcements",
        title: "📢 ОБЪЯВЛЕНИЯ",
        messages: [],
        subscribers: [],
        isChannel: true,
        createdAt: new Date()
    };
    saveData();
}

setInterval(saveData, 30000);

// ========== ОТВЕТЫ АССИСТЕНТА ==========
function aiBotResponse(message, userName) {
    const msg = message.toLowerCase();
    if (msg.match(/привет|здравствуй|хай|hello|hi/)) {
        return `Привет, ${userName}! 👋 Я ИИ-помощник ATOMGRAM. Напиши "помощь" для списка команд.`;
    }
    if (msg.match(/помощь|help|что умеешь/)) {
        return `🤖 Команды:\n• Погода\n• Новости\n• Шутка\n• Время\n• Кто ты\n• Спасибо\n• Пока\n• Создай канал [название]\n• Подпишись на [канал]`;
    }
    if (msg.includes('погода')) return `🌤️ Прогноз: +18°C, солнечно ☀️`;
    if (msg.includes('новости')) return `📰 ATOMGRAM: теперь с каналами и сменой темы!`;
    if (msg.includes('шутк')) return `Почему программисты не любят природу? Слишком много багов 🐛`;
    if (msg.includes('время')) return `⏰ ${new Date().toLocaleTimeString('ru-RU')}`;
    if (msg.includes('спасиб')) return `Пожалуйста, ${userName}! 😊`;
    if (msg.includes('пока')) return `До свидания, ${userName}! 👋`;
    if (msg.includes('создай канал')) {
        const match = msg.match(/создай канал (.+)/);
        if (match) return `📢 Канал "${match[1]}" создан! Теперь другие могут на него подписаться.`;
        return `Напишите "создай канал [название]"`;
    }
    if (msg.includes('подпишись на канал')) {
        const match = msg.match(/подпишись на канал (.+)/);
        if (match) return `✅ Вы подписались на канал "${match[1]}"!`;
        return `Напишите "подпишись на канал [название]"`;
    }
    return `Напиши "помощь" чтобы узнать мои команды 🤖`;
}

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; transition: background 0.3s, color 0.3s; }
        
        /* Тёмная тема (по умолчанию) */
        body.dark { background: #0a0a0a; color: white; }
        body.light { background: #f0f0f0; color: #1a1a2e; }
        
        body.dark .sidebar { background: #1a1a2e; border-right-color: rgba(255,255,255,0.1); }
        body.light .sidebar { background: white; border-right-color: #ddd; }
        
        body.dark .chat-header { background: #1a1a2e; border-bottom-color: rgba(255,255,255,0.1); color: white; }
        body.light .chat-header { background: white; border-bottom-color: #ddd; color: #1a1a2e; }
        
        body.dark .message-content { background: #2a2a3e; color: white; }
        body.light .message-content { background: #e8e8e8; color: #1a1a2e; }
        
        body.dark .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        body.light .message.my-message .message-content { background: #667eea; color: white; }
        
        body.dark .input-area { background: #1a1a2e; border-top-color: rgba(255,255,255,0.1); }
        body.light .input-area { background: white; border-top-color: #ddd; }
        
        body.dark .input-area input { background: #2a2a3e; color: white; }
        body.light .input-area input { background: #e8e8e8; color: #1a1a2e; }
        
        body.dark .room-item, body.dark .user-item, body.dark .friend-item { color: #ccc; }
        body.light .room-item, body.light .user-item, body.light .friend-item { color: #333; }
        
        body.dark .room-item:hover, body.dark .user-item:hover, body.dark .friend-item:hover { background: rgba(102,126,234,0.2); }
        body.light .room-item:hover, body.light .user-item:hover, body.light .friend-item:hover { background: rgba(102,126,234,0.1); }
        
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
            padding: 40px;
            border-radius: 30px;
            width: 90%;
            max-width: 350px;
            text-align: center;
        }
        .auth-card h1 {
            font-size: 36px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 30px;
        }
        .auth-card input {
            width: 100%;
            padding: 14px;
            margin: 10px 0;
            border: none;
            border-radius: 25px;
            background: rgba(255,255,255,0.9);
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
            font-weight: bold;
            cursor: pointer;
        }
        .switch-btn { background: transparent !important; border: 1px solid #667eea !important; }
        .error-msg { color: #ff6b6b; margin-top: 10px; font-size: 14px; }
        .success-msg { color: #4ade80; margin-top: 10px; font-size: 14px; }
        
        #mainApp {
            display: none;
            width: 100%;
            height: 100vh;
            display: flex;
            position: relative;
        }
        .sidebar {
            position: fixed;
            left: -280px;
            top: 0;
            width: 280px;
            height: 100%;
            transition: left 0.3s ease;
            z-index: 100;
            display: flex;
            flex-direction: column;
        }
        .sidebar.open { left: 0; }
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 99;
            display: none;
        }
        .sidebar-overlay.open { display: block; }
        .sidebar-header {
            padding: 50px 20px 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }
        .avatar-emoji { font-size: 50px; background: #2a2a3e; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .avatar-img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; background: #2a2a3e; }
        .user-info-header h3 { font-size: 18px; }
        .user-info-header .username { font-size: 12px; color: #888; }
        .menu-item { padding: 15px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; }
        .menu-item:hover { background: rgba(102,126,234,0.1); }
        .section-title { padding: 15px 20px 5px 20px; font-size: 11px; color: #667eea; text-transform: uppercase; }
        .friends-list, .rooms-list, .users-list, .channels-list { padding: 10px; overflow-y: auto; max-height: 200px; }
        .friend-item, .room-item, .user-item, .channel-item { padding: 10px 15px; margin: 4px 0; border-radius: 15px; cursor: pointer; display: flex; align-items: center; gap: 10px; justify-content: space-between; }
        .friend-item:hover, .room-item:hover, .user-item:hover, .channel-item:hover { background: rgba(102,126,234,0.2); }
        .friend-item.active, .room-item.active, .user-item.active, .channel-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .friend-request {
            background: rgba(102,126,234,0.3);
            border-left: 3px solid #667eea;
        }
        .friend-actions button { margin-left: 5px; padding: 5px 10px; border-radius: 15px; border: none; cursor: pointer; }
        .accept-btn { background: #4ade80; color: white; }
        .reject-btn { background: #ff6b6b; color: white; }
        .ban-btn { background: #ff4444; color: white; }
        .user-avatar-small-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .user-avatar-small { font-size: 28px; }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; width: 100%; }
        .chat-header { padding: 15px 20px; font-weight: bold; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid; }
        .chat-header-avatar-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
        .chat-header-avatar { font-size: 36px; }
        .menu-btn { background: none; border: none; font-size: 24px; cursor: pointer; padding: 5px; }
        .theme-toggle { background: none; border: none; font-size: 20px; cursor: pointer; margin-left: auto; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; }
        .message { margin-bottom: 15px; display: flex; align-items: flex-start; gap: 10px; }
        .message-avatar-img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
        .message-avatar { font-size: 36px; min-width: 40px; text-align: center; }
        .message-bubble { flex: 1; max-width: 70%; }
        .message-content { padding: 10px 16px; border-radius: 20px; }
        .message.my-message { flex-direction: row-reverse; }
        .message-username { font-size: 11px; color: #a0a0c0; margin-bottom: 4px; cursor: pointer; }
        .message-text { font-size: 14px; word-wrap: break-word; }
        .voice-message { display: flex; align-items: center; gap: 10px; }
        .voice-message button { background: none; border: none; font-size: 20px; cursor: pointer; }
        .video-circle {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            object-fit: cover;
            cursor: pointer;
            background: #2a2a3e;
        }
        .file-attachment { background: rgba(102,126,234,0.2); padding: 10px; border-radius: 15px; display: flex; align-items: center; gap: 10px; }
        .file-attachment a { text-decoration: none; }
        .message-time { font-size: 9px; color: #888; margin-top: 4px; }
        .typing-indicator { font-size: 11px; color: #888; padding: 5px 20px; font-style: italic; }
        .input-area { display: flex; padding: 15px 20px; gap: 10px; flex-wrap: wrap; }
        .input-area input { flex: 1; padding: 12px 18px; border: none; border-radius: 25px; font-size: 16px; }
        .input-area button { padding: 12px 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; cursor: pointer; }
        .attach-btn { background: #2a2a3e !important; }
        .voice-record-btn { background: #ff6b6b !important; }
        .voice-record-btn.recording { animation: pulse 1s infinite; background: #ff4444 !important; }
        .video-record-btn { background: #ff6b6b !important; }
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
        .video-preview { width: 100%; max-width: 400px; border-radius: 50%; overflow: hidden; }
        video { width: 100%; border-radius: 50%; }
        .video-controls { margin-top: 20px; display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
        .video-controls button { padding: 15px 30px; border-radius: 40px; border: none; font-size: 16px; cursor: pointer; }
        .start-record { background: #ff6b6b; color: white; }
        .stop-record { background: #ff4444; color: white; }
        .send-video { background: #4ade80; color: white; }
        .close-video { background: #888; color: white; }
        
        .notification { position: fixed; bottom: 20px; right: 20px; background: #667eea; color: white; padding: 12px 20px; border-radius: 25px; z-index: 1000; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        
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
            border-radius: 30px;
            width: 90%;
            max-width: 400px;
            max-height: 90vh;
            overflow-y: auto;
        }
        .modal-header { padding: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; }
        .modal-header h3 { color: white; }
        .close-modal { position: absolute; right: 20px; top: 20px; background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }
        .profile-avatar-section { text-align: center; padding: 30px; }
        .profile-avatar-img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; cursor: pointer; }
        .profile-avatar-emoji { font-size: 80px; background: #2a2a3e; width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; cursor: pointer; }
        .profile-field { padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .profile-field label { display: block; font-size: 11px; color: #667eea; margin-bottom: 5px; text-transform: uppercase; }
        .profile-field input, .profile-field textarea { width: 100%; padding: 10px; background: #2a2a3e; border: none; border-radius: 15px; color: white; font-size: 16px; }
        .avatar-picker { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 15px; padding: 10px; background: #2a2a3e; border-radius: 20px; }
        .avatar-option { font-size: 35px; cursor: pointer; padding: 5px; border-radius: 50%; }
        .avatar-option:hover { background: #3a3a4e; }
        .modal-footer { padding: 20px; display: flex; gap: 10px; }
        .save-btn { flex: 1; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; cursor: pointer; }
        .upload-btn { flex: 1; padding: 14px; background: #2a2a3e; color: white; border: 1px solid #667eea; border-radius: 25px; cursor: pointer; }
        
        .create-channel { padding: 15px; border-top: 1px solid rgba(255,255,255,0.1); }
        .create-channel input { width: 100%; padding: 10px; border: none; border-radius: 20px; background: #2a2a3e; color: white; margin-bottom: 8px; }
        .create-channel button { width: 100%; padding: 10px; background: #2a2a3e; border: 1px solid #667eea; border-radius: 20px; color: #667eea; cursor: pointer; }
        
        @media (min-width: 769px) { .sidebar { position: relative; left: 0 !important; width: 280px; } .sidebar-overlay { display: none !important; } .menu-btn { display: none; } }
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
            <input type="text" id="regName" placeholder="Ваше имя">
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
            <div id="userAvatarContainer"></div>
            <div class="user-info-header">
                <h3 id="userDisplayName">Загрузка...</h3>
                <div class="username" id="userUsername">@</div>
            </div>
        </div>
        <div class="menu-item" onclick="openProfileModal()"><span>👤</span> <span>Мой профиль</span></div>
        <div class="menu-item" onclick="addFriend()"><span>➕</span> <span>Добавить друга</span></div>
        <div class="menu-item" onclick="createChannel()"><span>📢</span> <span>Создать канал</span></div>
        <div class="section-title">👥 ДРУЗЬЯ</div>
        <div class="friends-list" id="friendsList"></div>
        <div class="section-title">📢 КАНАЛЫ</div>
        <div class="channels-list" id="channelsList"></div>
        <div class="section-title">💬 ОБЩИЕ ЧАТЫ</div>
        <div class="rooms-list" id="roomsList"></div>
        <div class="section-title">🤖 БОТЫ</div>
        <div class="users-list" id="botsList"></div>
        <div class="new-room" style="padding: 15px;">
            <input type="text" id="newRoomName" placeholder="Название чата">
            <button onclick="createRoom()" style="width:100%; padding:10px; background:#2a2a3e; border:1px solid #667eea; border-radius:20px; color:#667eea; margin-top:8px;">+ Создать чат</button>
        </div>
    </div>
    <div class="chat-area">
        <div class="chat-header">
            <button class="menu-btn" onclick="toggleSidebar()">☰</button>
            <div id="chatHeaderAvatar"></div>
            <div><div id="currentChatTitle">Выберите чат</div></div>
            <button class="theme-toggle" onclick="toggleTheme()">🌙</button>
        </div>
        <div class="messages-area" id="messages"></div>
        <div class="typing-indicator" id="typingIndicator" style="display:none"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Введите сообщение...">
            <button class="attach-btn" onclick="document.getElementById('fileInput').click()">📎</button>
            <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
            <button id="voiceBtn" class="voice-record-btn" onclick="toggleRecording()">🎤</button>
            <button id="videoBtn" class="video-record-btn" onclick="startVideoRecording()">🎥</button>
            <button onclick="sendMessage()">📤</button>
        </div>
    </div>
</div>

<div id="profileModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Мой профиль</h3><button class="close-modal" onclick="closeProfileModal()">✕</button></div>
        <div class="profile-avatar-section">
            <div id="profileAvatarContainer"></div>
            <div id="avatarPicker" class="avatar-picker" style="display:none; margin-top:15px;">
                <div class="avatar-option" onclick="selectAvatar('😀')">😀</div><div class="avatar-option" onclick="selectAvatar('😎')">😎</div>
                <div class="avatar-option" onclick="selectAvatar('👨')">👨</div><div class="avatar-option" onclick="selectAvatar('👩')">👩</div>
                <div class="avatar-option" onclick="selectAvatar('🦸')">🦸</div><div class="avatar-option" onclick="selectAvatar('🐱')">🐱</div>
                <div class="avatar-option" onclick="selectAvatar('🚀')">🚀</div><div class="avatar-option" onclick="selectAvatar('💻')">💻</div>
                <div class="avatar-option" onclick="selectAvatar('🤖')">🤖</div>
            </div>
            <input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()">
        </div>
        <div class="profile-field"><label>Имя</label><input type="text" id="editName"></div>
        <div class="profile-field"><label>О себе</label><textarea id="editBio"></textarea></div>
        <div class="profile-field"><label>Новый пароль</label><input type="password" id="editPassword" placeholder="Оставьте пустым"></div>
        <div class="modal-footer">
            <button class="upload-btn" onclick="document.getElementById('avatarUpload').click()">📷 Загрузить фото</button>
            <button class="save-btn" onclick="saveProfile()">Сохранить</button>
        </div>
    </div>
</div>

<div id="videoModal" class="video-modal" style="display:none">
    <div class="video-preview"><video id="videoPreview" autoplay muted playsinline></video></div>
    <div class="video-controls">
        <button id="startRecordBtn" class="start-record" onclick="startRecording()">🔴 Запись</button>
        <button id="stopRecordBtn" class="stop-record" style="display:none" onclick="stopRecording()">⏹️ Стоп</button>
        <button id="sendVideoBtn" class="send-video" style="display:none" onclick="sendVideoCircle()">📤 Отправить</button>
        <button class="close-video" onclick="closeVideoModal()">❌ Закрыть</button>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null, currentUserData = null;
let currentChat = null, currentChatType = null, currentChatTarget = null;
let allRooms = [], allFriends = [], allBots = [], allChannels = [], friendRequests = [];
let selectedAvatar = '👤';
let mediaRecorder = null, audioChunks = [], isRecording = false;
let videoStream = null, videoRecorder = null, videoChunks = [];
let recordedVideoBlob = null;

const savedUsername = localStorage.getItem('atomgram_username');
const savedPassword = localStorage.getItem('atomgram_password');

// ========== ТЕМА ==========
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        body.classList.add('light');
        localStorage.setItem('atomgram_theme', 'light');
        document.querySelector('.theme-toggle').innerHTML = '☀️';
    } else {
        body.classList.remove('light');
        body.classList.add('dark');
        localStorage.setItem('atomgram_theme', 'dark');
        document.querySelector('.theme-toggle').innerHTML = '🌙';
    }
}
const savedTheme = localStorage.getItem('atomgram_theme');
if (savedTheme === 'light') {
    document.body.classList.remove('dark');
    document.body.classList.add('light');
    if (document.querySelector('.theme-toggle')) document.querySelector('.theme-toggle').innerHTML = '☀️';
}

// ========== КАНАЛЫ ==========
function createChannel() {
    const channelName = prompt('Введите название канала:');
    if (!channelName) return;
    socket.emit('create channel', { channelName: channelName }, (res) => {
        if (res.success) showNotification('Канал', res.message);
        else showNotification('Ошибка', res.error);
    });
}

function subscribeToChannel(channelName) {
    socket.emit('subscribe channel', { channelName: channelName });
}

function renderChannels() {
    const container = document.getElementById('channelsList');
    const ud = window.usersProfiles || {};
    container.innerHTML = allChannels.map(ch => {
        const channelData = channelsData[ch] || {};
        return '<div class="channel-item' + (currentChat === 'channel:' + ch ? ' active' : '') + '" onclick="joinChannel(\\'' + ch + '\\')">' +
            '<span>📢</span><span>' + (channelData.title || ch) + '</span>' +
            '<span style="margin-left:auto; font-size:10px;">🔊</span></div>';
    }).join('');
    if (allChannels.length === 0) container.innerHTML = '<div style="padding:10px; color:#666;">Нет каналов</div>';
}

function joinChannel(channelName) {
    currentChat = 'channel:' + channelName; currentChatType = 'channel'; currentChatTarget = channelName;
    socket.emit('joinChannel', channelName);
    document.getElementById('currentChatTitle').innerHTML = '📢 ' + channelName;
    document.getElementById('chatHeaderAvatar').innerHTML = '📢';
    renderRooms(); renderFriends(); renderBots(); renderChannels();
    closeSidebar();
}

// ========== ДРУЗЬЯ ==========
function addFriend() {
    const friendUsername = prompt('Введите username друга:');
    if (!friendUsername) return;
    socket.emit('add friend', { friendUsername: friendUsername }, (res) => {
        if (res.success) showNotification('Друг', res.message);
        else showNotification('Ошибка', res.error);
    });
}

function acceptFriendRequest(fromUser) {
    socket.emit('accept friend', { fromUser: fromUser });
}

function rejectFriendRequest(fromUser) {
    socket.emit('reject friend', { fromUser: fromUser });
}

function banUser(userToBan) {
    if (confirm(`Забанить пользователя ${userToBan}?`)) {
        socket.emit('ban user', { userToBan: userToBan });
    }
}

function renderFriends() {
    const container = document.getElementById('friendsList');
    const ud = window.usersProfiles || {};
    let html = '';
    friendRequests.forEach(req => {
        const f = ud[req] || {};
        html += '<div class="friend-item friend-request">' +
            renderAvatar(f.avatarData, f.avatarType, 'small') +
            '<span>' + (f.name || req) + '</span>' +
            '<div class="friend-actions">' +
            '<button class="accept-btn" onclick="acceptFriendRequest(\\'' + req + '\\')">✅</button>' +
            '<button class="reject-btn" onclick="rejectFriendRequest(\\'' + req + '\\')">❌</button>' +
            '</div></div>';
    });
    allFriends.forEach(friend => {
        const f = ud[friend] || {};
        html += '<div class="friend-item" onclick="startPrivateChat(\\'' + friend + '\\')">' +
            renderAvatar(f.avatarData, f.avatarType, 'small') +
            '<span>' + (f.name || friend) + '</span>' +
            '<button class="ban-btn" onclick="event.stopPropagation(); banUser(\\'' + friend + '\\')">🚫</button>' +
            '</div>';
    });
    container.innerHTML = html || '<div style="padding:10px; color:#666;">Нет друзей</div>';
}

function renderAvatar(avatarData, avatarType, size) {
    if (avatarType === 'image' && avatarData) {
        if (size === 'small') return '<img src="' + avatarData + '" class="user-avatar-small-img">';
        if (size === 'large') return '<img src="' + avatarData + '" class="profile-avatar-img">';
        return '<img src="' + avatarData + '" class="avatar-img">';
    } else {
        const emoji = avatarData || '👤';
        if (size === 'small') return '<div class="user-avatar-small">' + emoji + '</div>';
        if (size === 'large') return '<div class="profile-avatar-emoji">' + emoji + '</div>';
        return '<div class="avatar-emoji">' + emoji + '</div>';
    }
}

// ========== ВИДЕОКРУЖКИ ==========
async function startVideoRecording() {
    document.getElementById('videoModal').style.display = 'flex';
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('videoPreview').srcObject = videoStream;
    } catch(err) { alert('Нет доступа к камере'); closeVideoModal(); }
}
function startRecording() {
    videoChunks = [];
    videoRecorder = new MediaRecorder(videoStream);
    videoRecorder.ondataavailable = (e) => videoChunks.push(e.data);
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

// ========== ФАЙЛЫ ==========
function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file || !currentChat) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('file attachment', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileType: file.type, fileData: reader.result });
        document.getElementById('fileInput').value = '';
    };
    reader.readAsDataURL(file);
}

// ========== ГОЛОСОВЫЕ ==========
async function toggleRecording() {
    if (isRecording) { stopAudioRecording(); } else { startAudioRecording(); }
}
async function startAudioRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => socket.emit('voice message', { type: currentChatType, target: currentChatTarget, audio: reader.result });
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        const btn = document.getElementById('voiceBtn');
        btn.classList.add('recording');
        btn.innerHTML = '⏹️';
    } catch(err) { alert('Нет доступа к микрофону'); }
}
function stopAudioRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        const btn = document.getElementById('voiceBtn');
        btn.classList.remove('recording');
        btn.innerHTML = '🎤';
    }
}

// ========== UI ==========
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
}

function showNotification(title, body) {
    if (Notification.permission === 'granted') new Notification(title, { body });
    const notif = document.createElement('div'); notif.className = 'notification';
    notif.innerHTML = '<strong>' + title + '</strong><br>' + body;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}
if (Notification.permission === 'default') Notification.requestPermission();

let typingTimeout = null;
function sendTyping() {
    if (currentChatType === 'private' && currentChatTarget) {
        socket.emit('typing', { to: currentChatTarget });
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => socket.emit('stop typing', { to: currentChatTarget }), 1000);
    }
}

function uploadAvatar() {
    const file = document.getElementById('avatarUpload').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('upload avatar', { login: currentUser, avatarData: reader.result }, (res) => {
            if (res.success) { currentUserData = res.userData; updateProfileUI(); showNotification('Аватар', 'Фото загружено'); }
        });
    };
    reader.readAsDataURL(file);
}

function openProfileModal() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileAvatarContainer').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType, 'large');
    document.getElementById('profileModal').style.display = 'flex';
    closeSidebar();
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; document.getElementById('avatarPicker').style.display = 'none'; }
function toggleAvatarPicker() { const p = document.getElementById('avatarPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
function selectAvatar(avatar) {
    selectedAvatar = avatar;
    document.getElementById('profileAvatarContainer').innerHTML = renderAvatar(selectedAvatar, 'emoji', 'large');
    document.getElementById('avatarPicker').style.display = 'none';
}
function saveProfile() {
    const data = { login: currentUser, name: document.getElementById('editName').value.trim(), bio: document.getElementById('editBio').value.trim() };
    const newPass = document.getElementById('editPassword').value.trim();
    if (newPass) data.password = newPass;
    if (selectedAvatar !== currentUserData?.avatar) { data.avatar = selectedAvatar; data.avatarType = 'emoji'; }
    socket.emit('update profile', data, (res) => {
        if (res.success) { currentUserData = res.userData; updateProfileUI(); closeProfileModal(); showNotification('Профиль', 'Сохранено'); }
        else alert(res.error);
    });
}
function updateProfileUI() {
    document.getElementById('userDisplayName').innerText = currentUserData?.name || currentUser;
    document.getElementById('userUsername').innerText = '@' + currentUser;
    document.getElementById('userAvatarContainer').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType);
}

function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('login', { username, password }, (res) => {
        if (res.success) {
            currentUser = res.userData.username;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_username', username);
            localStorage.setItem('atomgram_password', password);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateProfileUI(); loadData();
        } else document.getElementById('authError').innerText = res.error;
    });
}
function register() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (!username || !password) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('register', { username, name, password }, (res) => {
        if (res.success) {
            document.getElementById('authError').className = 'success-msg';
            document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.';
            showLogin();
        } else { document.getElementById('authError').className = 'error-msg'; document.getElementById('authError').innerText = res.error; }
    });
}
function showRegister() { document.getElementById('authForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; document.getElementById('authError').innerText = ''; }
function showLogin() { document.getElementById('authForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; document.getElementById('authError').innerText = ''; }

if (savedUsername && savedPassword) { document.getElementById('loginUsername').value = savedUsername; document.getElementById('loginPassword').value = savedPassword; setTimeout(() => login(), 100); }

function loadData() {
    socket.emit('getRooms', (rooms) => { allRooms = rooms; renderRooms(); });
    socket.emit('getFriends', (data) => { allFriends = data.friends || []; friendRequests = data.requests || []; renderFriends(); });
    socket.emit('getUsers', (data) => { allBots = data.bots || []; renderBots(); });
    socket.emit('getChannels', (channels) => { allChannels = channels; renderChannels(); });
}
function renderRooms() {
    document.getElementById('roomsList').innerHTML = allRooms.map(room => '<div class="room-item' + (currentChat === 'room:' + room ? ' active' : '') + '" onclick="joinRoom(\\'' + room + '\\')">#' + room + '</div>').join('');
}
function renderBots() {
    const ud = window.usersProfiles || {};
    document.getElementById('botsList').innerHTML = allBots.map(bot => {
        const b = ud[bot] || {};
        return '<div class="user-item' + (currentChat === 'user:' + bot ? ' active' : '') + '" onclick="startPrivateChat(\\'' + bot + '\\")">' +
            renderAvatar(b.avatarData, b.avatarType, 'small') +
            '<span>' + (b.name || bot) + '</span>' +
            '<span style="margin-left:auto; color:#a78bfa;">🤖</span></div>';
    }).join('');
}

window.usersProfiles = {};
let channelsData = {};
socket.on('users list with profiles', (profiles) => {
    profiles.forEach(p => { window.usersProfiles[p.username] = p; });
    allBots = profiles.filter(p => p.isBot && p.username !== currentUser).map(p => p.username);
    renderBots();
});
socket.on('friends update', (data) => {
    allFriends = data.friends || [];
    friendRequests = data.requests || [];
    renderFriends();
});
socket.on('channels update', (channels) => {
    allChannels = channels;
    renderChannels();
});
socket.on('channel data update', (data) => {
    channelsData = data;
    renderChannels();
});

function joinRoom(roomName) {
    currentChat = 'room:' + roomName; currentChatType = 'room'; currentChatTarget = roomName;
    socket.emit('joinRoom', roomName);
    document.getElementById('currentChatTitle').innerHTML = '# ' + roomName;
    document.getElementById('chatHeaderAvatar').innerHTML = '📢';
    renderRooms(); renderFriends(); renderBots(); renderChannels();
    closeSidebar();
}
function startPrivateChat(userName) {
    currentChat = 'user:' + userName; currentChatType = 'private'; currentChatTarget = userName;
    socket.emit('joinPrivate', userName);
    const ud = window.usersProfiles[userName] || {};
    document.getElementById('currentChatTitle').innerHTML = '💬 ' + (ud.name || userName);
    document.getElementById('chatHeaderAvatar').innerHTML = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    renderRooms(); renderFriends(); renderBots(); renderChannels();
    closeSidebar();
}
function createRoom() {
    const newRoom = document.getElementById('newRoomName').value.trim();
    if (!newRoom) return;
    socket.emit('createRoom', newRoom, (success) => {
        if (success) { document.getElementById('newRoomName').value = ''; loadData(); setTimeout(() => joinRoom(newRoom), 500); }
        else alert('Чат существует');
    });
}
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChat) return;
    if (currentChatType === 'room') socket.emit('chat message', { type: 'room', target: currentChatTarget, text });
    else if (currentChatType === 'channel') socket.emit('channel message', { channel: currentChatTarget, text });
    else socket.emit('chat message', { type: 'private', target: currentChatTarget, text });
    input.value = '';
    if (typingTimeout) clearTimeout(typingTimeout);
    socket.emit('stop typing', { to: currentChatTarget });
}
document.getElementById('messageInput').addEventListener('input', sendTyping);
document.getElementById('messageInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

socket.on('typing', (data) => {
    if (currentChatType === 'private' && currentChatTarget === data.from) {
        const ud = window.usersProfiles[data.from] || {};
        document.getElementById('typingIndicator').innerHTML = (ud.name || data.from) + ' печатает...';
        document.getElementById('typingIndicator').style.display = 'block';
        setTimeout(() => document.getElementById('typingIndicator').style.display = 'none', 2000);
    }
});
socket.on('stop typing', () => { document.getElementById('typingIndicator').style.display = 'none'; });

socket.on('chat history', (data) => {
    if ((currentChatType === 'room' && data.type === 'room' && data.room === currentChatTarget) ||
        (currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget) ||
        (currentChatType === 'channel' && data.type === 'channel' && data.channel === currentChatTarget)) {
        document.getElementById('messages').innerHTML = '';
        data.messages.forEach(msg => addMessage(msg));
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});

socket.on('chat message', (msg) => {
    let shouldShow = false;
    if (msg.type === 'room' && currentChatType === 'room' && msg.room === currentChatTarget) shouldShow = true;
    if (msg.type === 'private' && currentChatType === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) shouldShow = true;
    if (msg.type === 'channel' && currentChatType === 'channel' && msg.channel === currentChatTarget) shouldShow = true;
    if (shouldShow) { addMessage(msg); document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight; }
    if (msg.from !== currentUser) {
        const ud = window.usersProfiles[msg.from] || {};
        const name = ud.name || msg.from;
        if (msg.type === 'private') showNotification(name, msg.text);
        else if (msg.type === 'room' && currentChatTarget !== msg.room) showNotification('Чат ' + msg.room, name + ': ' + msg.text);
        else if (msg.type === 'channel') showNotification('📢 ' + msg.channel, name + ': ' + msg.text);
    }
});

socket.on('voice message', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVoiceMessage(data);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});
socket.on('video circle', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVideoMessage(data);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});
socket.on('file attachment', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addFileMessage(data);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});

function addMessage(msg) {
    const div = document.createElement('div'); div.className = 'message';
    if (msg.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[msg.from] || {};
    const avatarHtml = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    const displayName = ud.name || msg.from;
    div.innerHTML = '<div class="message-avatar">' + avatarHtml + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(displayName) + '</div>' +
        '<div class="message-text">' + escapeHtml(msg.text) + '</div><div class="message-time">' + msg.time + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVoiceMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    const avatarHtml = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    const displayName = ud.name || data.from;
    div.innerHTML = '<div class="message-avatar">' + avatarHtml + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(displayName) + '</div>' +
        '<div class="voice-message"><button onclick="playAudio(this)" data-audio="' + data.audio + '">▶️</button><span>Голосовое</span></div>' +
        '<div class="message-time">' + data.time + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVideoMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    const avatarHtml = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    const displayName = ud.name || data.from;
    div.innerHTML = '<div class="message-avatar">' + avatarHtml + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(displayName) + '</div>' +
        '<video class="video-circle" controls loop src="' + data.video + '"></video>' +
        '<div class="message-time">' + data.time + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addFileMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    const avatarHtml = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    const displayName = ud.name || data.from;
    const icon = data.fileType.startsWith('image/') ? '🖼️' : '📄';
    div.innerHTML = '<div class="message-avatar">' + avatarHtml + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(displayName) + '</div>' +
        '<div class="file-attachment"><span>' + icon + '</span><a href="' + data.fileData + '" download="' + data.fileName + '">' + data.fileName + '</a></div>' +
        '<div class="message-time">' + data.time + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function playAudio(btn) {
    const audio = new Audio(btn.getAttribute('data-audio'));
    audio.play();
    btn.innerHTML = '⏸️';
    audio.onended = () => { btn.innerHTML = '▶️'; };
}

socket.on('rooms update', (rooms) => { allRooms = rooms; renderRooms(); });
socket.on('profile updated', (data) => {
    if (data.username === currentUser) { currentUserData = data; updateProfileUI(); }
    if (window.usersProfiles[data.username]) { window.usersProfiles[data.username] = data; renderFriends(); renderBots(); }
});

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ ==========
const usersOnline = new Map();

io.on('connection', (socket) => {
    let currentUser = null, currentRoom = null;

    socket.on('register', (data, callback) => {
        const { username, name, password } = data;
        if (users[username]) {
            callback({ success: false, error: 'Username уже занят' });
        } else {
            users[username] = {
                username: username,
                password: password,
                name: name || username,
                avatar: '👤',
                avatarType: 'emoji',
                avatarData: null,
                bio: '',
                friends: [],
                friendRequests: [],
                banned: [],
                status: 'online',
                lastSeen: new Date()
            };
            saveData();
            callback({ success: true });
            sendProfileList();
        }
    });

    socket.on('login', (data, callback) => {
        const { username, password } = data;
        if (!users[username]) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (users[username].password !== password) {
            callback({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            usersOnline.set(socket.id, currentUser);
            users[username].status = 'online';
            callback({ success: true, userData: users[username] });
            sendUserList(); sendProfileList();
            socket.emit('friends update', { friends: users[username].friends || [], requests: users[username].friendRequests || [] });
        }
    });

    socket.on('add friend', (data, callback) => {
        const { friendUsername } = data;
        if (!users[friendUsername]) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (friendUsername === currentUser) {
            callback({ success: false, error: 'Нельзя добавить себя' });
        } else if (users[currentUser].banned?.includes(friendUsername)) {
            callback({ success: false, error: 'Пользователь в чёрном списке' });
        } else {
            if (!users[friendUsername].friendRequests) users[friendUsername].friendRequests = [];
            if (users[friendUsername].friendRequests.includes(currentUser)) {
                callback({ success: false, error: 'Запрос уже отправлен' });
            } else {
                users[friendUsername].friendRequests.push(currentUser);
                saveData();
                callback({ success: true, message: 'Запрос отправлен!' });
                const friendSocket = getSocketByUsername(friendUsername);
                if (friendSocket) {
                    friendSocket.emit('friends update', { friends: users[friendUsername].friends || [], requests: users[friendUsername].friendRequests || [] });
                    friendSocket.emit('notification', { from: currentUser, message: 'отправил запрос в друзья' });
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
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests });
            const fromSocket = getSocketByUsername(fromUser);
            if (fromSocket) fromSocket.emit('friends update', { friends: users[fromUser].friends, requests: users[fromUser].friendRequests });
        }
    });

    socket.on('reject friend', (data) => {
        const { fromUser } = data;
        if (users[currentUser].friendRequests?.includes(fromUser)) {
            users[currentUser].friendRequests = users[currentUser].friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests });
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
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests });
            showNotification(currentUser, 'Пользователь ' + userToBan + ' забанен');
        }
    });

    socket.on('getFriends', (callback) => {
        if (users[currentUser]) {
            callback({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [] });
        } else {
            callback({ friends: [], requests: [] });
        }
    });

    // ========== КАНАЛЫ ==========
    socket.on('create channel', (data, callback) => {
        const { channelName } = data;
        if (channels[channelName]) {
            callback({ success: false, error: 'Канал уже существует' });
        } else {
            channels[channelName] = {
                name: channelName,
                title: channelName,
                messages: [],
                subscribers: [currentUser],
                isChannel: true,
                createdAt: new Date()
            };
            saveData();
            callback({ success: true, message: 'Канал создан!' });
            io.emit('channels update', Object.keys(channels));
            io.emit('channel data update', channels);
        }
    });

    socket.on('subscribe channel', (data) => {
        const { channelName } = data;
        if (channels[channelName] && !channels[channelName].subscribers.includes(currentUser)) {
            channels[channelName].subscribers.push(currentUser);
            saveData();
            socket.emit('notification', { message: `Вы подписались на канал ${channelName}` });
        }
    });

    socket.on('joinChannel', (channelName) => {
        if (channels[channelName]) {
            socket.emit('chat history', {
                type: 'channel',
                channel: channelName,
                messages: channels[channelName].messages || []
            });
        }
    });

    socket.on('channel message', (data) => {
        const { channel, text } = data;
        if (channels[channel]) {
            const msg = {
                id: Date.now(),
                from: currentUser,
                text: text,
                time: new Date().toLocaleTimeString(),
                type: 'channel',
                channel: channel
            };
            channels[channel].messages.push(msg);
            if (channels[channel].messages.length > 200) channels[channel].messages.shift();
            io.emit('chat message', msg);
            saveData();
        }
    });

    socket.on('getChannels', (callback) => {
        callback(Object.keys(channels));
    });

    // ========== ОСТАЛЬНЫЕ СОКЕТЫ ==========
    socket.on('upload avatar', (data, callback) => {
        const { login, avatarData } = data;
        if (users[login]) {
            users[login].avatarType = 'image';
            users[login].avatarData = avatarData;
            users[login].avatar = null;
            saveData();
            callback({ success: true, userData: users[login] });
            io.emit('profile updated', users[login]);
            sendProfileList();
        } else {
            callback({ success: false, error: 'Ошибка' });
        }
    });

    socket.on('update profile', (data, callback) => {
        if (users[data.login]) {
            if (data.name !== undefined) users[data.login].name = data.name;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.avatar !== undefined) {
                users[data.login].avatar = data.avatar;
                users[data.login].avatarType = 'emoji';
                users[data.login].avatarData = null;
            }
            if (data.password) users[data.login].password = data.password;
            saveData();
            callback({ success: true, userData: users[data.login] });
            io.emit('profile updated', users[data.login]);
            sendProfileList();
        } else callback({ success: false, error: 'Ошибка' });
    });

    socket.on('typing', (data) => { const target = getSocketByUsername(data.to); if (target) target.emit('typing', { from: currentUser }); });
    socket.on('stop typing', (data) => { const target = getSocketByUsername(data.to); if (target) target.emit('stop typing'); });

    function getSocketByUsername(username) {
        for (let [id, user] of usersOnline.entries()) if (user === username) return io.sockets.sockets.get(id);
        return null;
    }
    function sendUserList() { io.emit('users update', Array.from(usersOnline.values())); }
    function sendProfileList() { io.emit('users list with profiles', Object.keys(users).map(l => users[l])); }

    socket.on('getRooms', (cb) => cb(Object.keys(publicRooms)));
    socket.on('getUsers', (cb) => cb({ users: Array.from(usersOnline.values()), bots: Object.keys(users).filter(u => users[u].isBot) }));

    socket.on('createRoom', (roomName, cb) => {
        if (!publicRooms[roomName]) { publicRooms[roomName] = { messages: [], users: [] }; saveData(); cb(true); io.emit('rooms update', Object.keys(publicRooms)); }
        else cb(false);
    });

    socket.on('joinRoom', (roomName) => {
        if (currentRoom) socket.leave(currentRoom);
        currentRoom = roomName;
        socket.join(roomName);
        socket.emit('chat history', { type: 'room', room: roomName, messages: publicRooms[roomName]?.messages || [] });
    });

    socket.on('joinPrivate', (targetUser) => {
        currentRoom = null;
        const chatId = [currentUser, targetUser].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, targetUser] };
        socket.emit('chat history', { type: 'private', with: targetUser, messages: privateChats[chatId].messages || [] });
    });

    socket.on('chat message', (data) => {
        const { type, target, text } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), type };
        if (type === 'room') {
            msg.room = target;
            if (publicRooms[target]) { publicRooms[target].messages.push(msg); if (publicRooms[target].messages.length > 200) publicRooms[target].messages.shift(); io.to(target).emit('chat message', msg); saveData(); }
        } else {
            if (users[currentUser]?.banned?.includes(target)) return;
            msg.to = target;
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
            privateChats[chatId].messages.push(msg); if (privateChats[chatId].messages.length > 200) privateChats[chatId].messages.shift();
            io.emit('chat message', msg); saveData();
            
            if (target === 'assistant') {
                const botRes = aiBotResponse(text, users[currentUser]?.name || currentUser);
                if (botRes) {
                    setTimeout(() => {
                        const botMsg = { id: Date.now()+1, from: 'assistant', text: botRes, time: new Date().toLocaleTimeString(), type: 'private', to: currentUser };
                        const botChatId = [currentUser, 'assistant'].sort().join('_');
                        if (!privateChats[botChatId]) privateChats[botChatId] = { messages: [], users: [currentUser, 'assistant'] };
                        privateChats[botChatId].messages.push(botMsg);
                        io.emit('chat message', botMsg);
                        saveData();
                    }, 300);
                }
            }
        }
    });

    socket.on('voice message', (data) => {
        const msg = { id: Date.now(), from: currentUser, audio: data.audio, time: new Date().toLocaleTimeString(), type: data.type };
        if (data.type === 'private') {
            if (users[currentUser]?.banned?.includes(data.target)) return;
            msg.to = data.target;
            const chatId = [currentUser, data.target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, data.target] };
            privateChats[chatId].messages.push(msg); io.emit('voice message', msg); saveData();
        }
    });

    socket.on('video circle', (data) => {
        const msg = { id: Date.now(), from: currentUser, video: data.video, time: new Date().toLocaleTimeString(), type: data.type };
        if (data.type === 'private') {
            if (users[currentUser]?.banned?.includes(data.target)) return;
            msg.to = data.target;
            const chatId = [currentUser, data.target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, data.target] };
            privateChats[chatId].messages.push(msg); io.emit('video circle', msg); saveData();
        }
    });

    socket.on('file attachment', (data) => {
        const msg = { id: Date.now(), from: currentUser, fileName: data.fileName, fileType: data.fileType, fileData: data.fileData, time: new Date().toLocaleTimeString(), type: data.type };
        if (data.type === 'private') {
            if (users[currentUser]?.banned?.includes(data.target)) return;
            msg.to = data.target;
            const chatId = [currentUser, data.target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, data.target] };
            privateChats[chatId].messages.push(msg); io.emit('file attachment', msg); saveData();
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) { usersOnline.delete(socket.id); users[currentUser].status = 'away'; sendUserList(); sendProfileList(); saveData(); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ATOMGRAM запущен на порту ' + PORT);
    console.log('🤖 Ассистент: assistant / assistant123');
    console.log('📢 Каналы: кнопка "Создать канал" в меню');
    console.log('🎨 Смена темы: кнопка 🌙/☀️ в шапке чата');
});
