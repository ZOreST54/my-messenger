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
let onlineUsers = new Map();

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

// ========== HTML ==========
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
    <title>ATOMGRAM — Современный мессенджер</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        /* Токены темы */
        :root {
            --bg-primary: #0f0f12;
            --bg-secondary: #1c1c1e;
            --bg-tertiary: #2c2c2e;
            --bg-input: #2c2c2e;
            --text-primary: #ffffff;
            --text-secondary: #8e8e93;
            --text-muted: #636366;
            --accent: #007aff;
            --accent-hover: #0051d5;
            --accent-glow: rgba(0, 122, 255, 0.3);
            --border: rgba(255,255,255,0.08);
            --message-mine: linear-gradient(135deg, #007aff, #5856d6);
            --message-other: #1c1c1e;
            --shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        body.light {
            --bg-primary: #ffffff;
            --bg-secondary: #f8f9fa;
            --bg-tertiary: #e9ecef;
            --bg-input: #f1f3f5;
            --text-primary: #212529;
            --text-secondary: #6c757d;
            --text-muted: #adb5bd;
            --accent: #007aff;
            --border: rgba(0,0,0,0.08);
            --message-mine: linear-gradient(135deg, #007aff, #5856d6);
            --message-other: #e9ecef;
            --shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        /* Адаптивный контейнер */
        .app {
            display: flex;
            height: 100vh;
            width: 100%;
            position: relative;
        }

        /* Боковая панель (десктоп) */
        .sidebar {
            width: 320px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
            z-index: 100;
        }

        /* Мобильное меню */
        .sidebar.mobile {
            position: fixed;
            left: -100%;
            top: 0;
            height: 100%;
            width: 85%;
            max-width: 320px;
            box-shadow: var(--shadow);
        }

        .sidebar.mobile.open {
            left: 0;
        }

        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            z-index: 99;
            display: none;
        }

        .overlay.open {
            display: block;
        }

        /* Шапка профиля */
        .profile-header {
            padding: 30px 20px 20px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 16px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .profile-header:hover {
            background: var(--bg-tertiary);
        }

        .avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--accent);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 600;
            position: relative;
            overflow: hidden;
        }

        .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .online-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 14px;
            height: 14px;
            background: #34c759;
            border-radius: 50%;
            border: 2px solid var(--bg-secondary);
        }

        .profile-info h3 {
            font-size: 17px;
            font-weight: 600;
        }

        .profile-info p {
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
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            color: var(--text-primary);
            text-decoration: none;
        }

        .nav-item:hover {
            background: var(--bg-tertiary);
        }

        .nav-item i {
            width: 24px;
            font-size: 20px;
            color: var(--accent);
        }

        .section-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-muted);
            padding: 16px 16px 8px;
        }

        /* Список чатов */
        .chats-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px 12px;
        }

        .chat-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 4px;
        }

        .chat-item:hover {
            background: var(--bg-tertiary);
        }

        .chat-item.active {
            background: var(--accent);
        }

        .chat-item.active .chat-name {
            color: white;
        }

        .chat-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: var(--bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            position: relative;
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
        }

        .chat-time {
            font-size: 11px;
            color: var(--text-muted);
        }

        /* Основная область чата */
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--bg-primary);
        }

        .chat-header {
            padding: 12px 20px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .menu-toggle {
            display: none;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-primary);
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
            color: var(--text-secondary);
        }

        /* Область сообщений */
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
            gap: 8px;
            max-width: 75%;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
        }

        .message-avatar {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: var(--bg-tertiary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
        }

        .message-bubble {
            max-width: calc(100% - 42px);
        }

        .message-content {
            padding: 10px 14px;
            border-radius: 20px;
            background: var(--message-other);
            word-wrap: break-word;
        }

        .message.mine .message-content {
            background: var(--message-mine);
            color: white;
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
        }

        .message-time {
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 4px;
            text-align: right;
        }

        /* Стикеры */
        .sticker {
            font-size: 48px;
            cursor: pointer;
            transition: transform 0.1s;
        }

        .sticker:active {
            transform: scale(1.1);
        }

        /* Файлы */
        .file-attachment {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            text-decoration: none;
            color: inherit;
        }

        /* Аудио */
        .voice-message {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .voice-play {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--accent);
            border: none;
            color: white;
            cursor: pointer;
        }

        /* Панель ввода */
        .input-area {
            padding: 12px 20px;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border);
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .input-area input {
            flex: 1;
            padding: 12px 16px;
            background: var(--bg-input);
            border: none;
            border-radius: 28px;
            font-size: 15px;
            color: var(--text-primary);
        }

        .input-area input::placeholder {
            color: var(--text-muted);
        }

        .input-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--bg-tertiary);
            border: none;
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.2s;
        }

        .input-btn:hover {
            background: var(--accent);
        }

        /* Модалки */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
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
            background: var(--bg-secondary);
            border-radius: 28px;
            width: 90%;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
        }

        .modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-body {
            padding: 20px;
        }

        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
        }

        /* Адаптив */
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -100%;
                top: 0;
                height: 100%;
                width: 85%;
                max-width: 300px;
                z-index: 200;
            }

            .sidebar.open {
                left: 0;
            }

            .menu-toggle {
                display: block;
            }

            .message {
                max-width: 85%;
            }
        }

        @media (min-width: 769px) {
            .sidebar {
                position: relative;
                left: 0 !important;
            }
        }

        /* Уведомления */
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            padding: 12px 20px;
            border-radius: 30px;
            font-size: 14px;
            box-shadow: var(--shadow);
            z-index: 1000;
            animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    </style>
</head>
<body>
    <div id="authScreen" style="position: fixed; top:0; left:0; width:100%; height:100%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; z-index: 1000;">
        <div style="background: rgba(255,255,255,0.95); border-radius: 32px; padding: 40px; width: 90%; max-width: 360px; text-align: center;">
            <h1 style="font-size: 32px; margin-bottom: 30px; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ATOMGRAM</h1>
            <div id="authForm">
                <input type="text" id="loginUsername" placeholder="Username" style="width:100%; padding:14px; margin:8px 0; border:1px solid #ddd; border-radius: 16px; font-size:16px;">
                <input type="password" id="loginPassword" placeholder="Пароль" style="width:100%; padding:14px; margin:8px 0; border:1px solid #ddd; border-radius: 16px; font-size:16px;">
                <button onclick="login()" style="width:100%; padding:14px; margin-top:12px; background: linear-gradient(135deg, #667eea, #764ba2); color:white; border:none; border-radius: 16px; font-size:16px; font-weight:600; cursor:pointer;">Войти</button>
                <button onclick="showRegister()" style="width:100%; padding:14px; margin-top:8px; background:#eee; border:none; border-radius: 16px; cursor:pointer;">Создать аккаунт</button>
            </div>
            <div id="registerForm" style="display:none">
                <input type="text" id="regUsername" placeholder="Username" style="width:100%; padding:14px; margin:8px 0; border:1px solid #ddd; border-radius: 16px;">
                <input type="text" id="regName" placeholder="Имя" style="width:100%; padding:14px; margin:8px 0; border:1px solid #ddd; border-radius: 16px;">
                <input type="password" id="regPassword" placeholder="Пароль" style="width:100%; padding:14px; margin:8px 0; border:1px solid #ddd; border-radius: 16px;">
                <button onclick="register()" style="width:100%; padding:14px; margin-top:12px; background: linear-gradient(135deg, #667eea, #764ba2); color:white; border:none; border-radius: 16px; cursor:pointer;">Зарегистрироваться</button>
                <button onclick="showLogin()" style="width:100%; padding:14px; margin-top:8px; background:#eee; border:none; border-radius: 16px; cursor:pointer;">Назад</button>
            </div>
            <div id="authError" style="color:red; margin-top:16px; font-size:14px;"></div>
        </div>
    </div>

    <div class="app" id="mainApp" style="display: none;">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile-header" onclick="openProfileModal()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-info">
                    <h3 id="userName">Загрузка...</h3>
                    <p id="userStatus">онлайн</p>
                </div>
            </div>
            <div class="nav-menu">
                <div class="nav-item" onclick="openProfileModal()"><i class="fas fa-user"></i><span>Профиль</span></div>
                <div class="nav-item" onclick="openSettingsModal()"><i class="fas fa-sliders-h"></i><span>Настройки</span></div>
                <div class="nav-item" onclick="openSavedMessages()"><i class="fas fa-bookmark"></i><span>Сохранённые</span></div>
                <div class="nav-item" onclick="addFriend()"><i class="fas fa-user-plus"></i><span>Добавить друга</span></div>
                <div class="section-title">ЧАТЫ</div>
                <div id="chatsList" class="chats-list"></div>
                <div class="section-title">КАНАЛЫ</div>
                <div id="channelsList" class="chats-list"></div>
                <div class="nav-item" onclick="createChannel()"><i class="fas fa-plus-circle"></i><span>Создать канал</span></div>
            </div>
        </div>

        <div class="chat-main">
            <div class="chat-header">
                <button class="menu-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
                <div class="chat-header-info">
                    <div class="chat-header-name" id="chatTitle">Выберите чат</div>
                    <div class="chat-header-status" id="chatStatus"></div>
                </div>
                <button class="input-btn" onclick="openStickerPicker()" style="width:40px; height:40px;"><i class="fas fa-smile"></i></button>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button class="input-btn" onclick="document.getElementById('fileInput').click()"><i class="fas fa-paperclip"></i></button>
                <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
                <button class="input-btn" onclick="toggleRecording()"><i class="fas fa-microphone"></i></button>
                <button class="input-btn" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    </div>

    <div id="stickerPicker" style="display:none; position:fixed; bottom:80px; left:0; right:0; background:var(--bg-secondary); border-radius:24px 24px 0 0; padding:16px; z-index:150; flex-wrap:wrap; gap:12px; justify-content:center;">
        <div class="sticker" onclick="sendSticker('😀')">😀</div><div class="sticker" onclick="sendSticker('😂')">😂</div>
        <div class="sticker" onclick="sendSticker('😍')">😍</div><div class="sticker" onclick="sendSticker('😎')">😎</div>
        <div class="sticker" onclick="sendSticker('🥳')">🥳</div><div class="sticker" onclick="sendSticker('🔥')">🔥</div>
        <div class="sticker" onclick="sendSticker('❤️')">❤️</div><div class="sticker" onclick="sendSticker('🎉')">🎉</div>
        <div class="sticker" onclick="sendSticker('👍')">👍</div><div class="sticker" onclick="sendSticker('🐱')">🐱</div>
        <div class="sticker" onclick="sendSticker('🐶')">🐶</div><div class="sticker" onclick="sendSticker('🚀')">🚀</div>
    </div>

    <div id="profileModal" class="modal">
        <div class="modal-content">
            <div class="modal-header"><h3>Профиль</h3><button onclick="closeProfileModal()" style="background:none; border:none; font-size:24px; cursor:pointer;">✕</button></div>
            <div class="modal-body">
                <div style="text-align:center; margin-bottom:20px;">
                    <div class="avatar" id="profileAvatar" style="width:100px; height:100px; font-size:48px; margin:0 auto;">👤</div>
                    <button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px; padding:8px 16px; background:var(--accent); border:none; border-radius:20px; color:white; cursor:pointer;">Загрузить фото</button>
                    <input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()">
                </div>
                <div style="margin-bottom:16px;"><label>Имя</label><input type="text" id="editName" style="width:100%; padding:12px; background:var(--bg-tertiary); border:none; border-radius:12px; color:var(--text-primary);"></div>
                <div style="margin-bottom:16px;"><label>О себе</label><textarea id="editBio" rows="2" style="width:100%; padding:12px; background:var(--bg-tertiary); border:none; border-radius:12px; color:var(--text-primary);"></textarea></div>
                <div><label>Новый пароль</label><input type="password" id="editPassword" placeholder="Оставьте пустым" style="width:100%; padding:12px; background:var(--bg-tertiary); border:none; border-radius:12px; color:var(--text-primary);"></div>
            </div>
            <div class="modal-footer"><button onclick="saveProfile()" style="flex:1; padding:14px; background:var(--accent); border:none; border-radius:16px; color:white; cursor:pointer;">Сохранить</button></div>
        </div>
    </div>

    <div id="settingsModal" class="modal">
        <div class="modal-content">
            <div class="modal-header"><h3>Настройки</h3><button onclick="closeSettingsModal()" style="background:none; border:none; font-size:24px; cursor:pointer;">✕</button></div>
            <div class="modal-body">
                <div style="margin-bottom:16px;"><label>🌓 Тема</label><select id="themeSelect" onchange="applyTheme()" style="width:100%; padding:12px; background:var(--bg-tertiary); border:none; border-radius:12px; color:var(--text-primary);"><option value="dark">Тёмная</option><option value="light">Светлая</option></select></div>
                <div><label>💬 Цвет моих сообщений</label><input type="color" id="myMsgColor" value="#007aff" onchange="applyMsgColor()" style="width:100%; margin-top:8px;"></div>
            </div>
            <div class="modal-footer"><button onclick="saveSettings()" style="flex:1; padding:14px; background:var(--accent); border:none; border-radius:16px; color:white; cursor:pointer;">Сохранить</button></div>
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
        let allChats = [];
        let allChannels = [];
        let allFriends = [];
        let friendRequests = [];
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;

        socket.on('connect', () => console.log('✅ Подключено'));

        function login() {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            if (!username || !password) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
            socket.emit('login', { username, password }, (res) => {
                if (res.success) {
                    currentUser = username;
                    currentUserData = res.userData;
                    localStorage.setItem('atomgram_user', username);
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('mainApp').style.display = 'flex';
                    updateUI();
                    loadData();
                    applySavedSettings();
                } else document.getElementById('authError').innerText = res.error;
            });
        }

        function register() {
            const username = document.getElementById('regUsername').value.trim();
            const name = document.getElementById('regName').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            if (!username || !password) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
            socket.emit('register', { username, name, password }, (res) => {
                if (res.success) { document.getElementById('authError').innerText = '✅ Успех! Войдите.'; showLogin(); }
                else document.getElementById('authError').innerText = res.error;
            });
        }

        function showRegister() { document.getElementById('authForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; }
        function showLogin() { document.getElementById('authForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; }

        function updateUI() {
            document.getElementById('userName').innerText = currentUserData?.name || currentUser;
            document.getElementById('userAvatar').innerHTML = currentUserData?.avatar ? `<img src="${currentUserData.avatar}">` : '👤';
        }

        function loadData() {
            socket.emit('getFriends', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; renderChats(); });
            socket.emit('getChannels', (c) => { allChannels = c; renderChats(); });
            socket.emit('getChats', (chats) => { allChats = chats; renderChats(); });
        }

        function renderChats() {
            const container = document.getElementById('chatsList');
            let html = '';
            allChats.forEach(chat => {
                html += `<div class="chat-item" onclick="openChat('${chat.id}', 'private')">
                    <div class="chat-avatar">👤</div>
                    <div class="chat-info"><div class="chat-name">${chat.name}</div><div class="chat-preview">${chat.lastMsg || 'Новое сообщение'}</div></div>
                </div>`;
            });
            allFriends.forEach(friend => {
                if (!allChats.find(c => c.id === friend)) {
                    html += `<div class="chat-item" onclick="openChat('${friend}', 'private')">
                        <div class="chat-avatar">👤</div><div class="chat-info"><div class="chat-name">${friend}</div></div>
                    </div>`;
                }
            });
            const channelsContainer = document.getElementById('channelsList');
            let channelsHtml = '';
            allChannels.forEach(ch => {
                channelsHtml += `<div class="chat-item" onclick="openChat('${ch}', 'channel')">
                    <div class="chat-avatar">📢</div><div class="chat-info"><div class="chat-name">#${ch}</div></div>
                </div>`;
            });
            container.innerHTML = html || '<div style="padding:20px; text-align:center; color:var(--text-muted);">Нет чатов</div>';
            channelsContainer.innerHTML = channelsHtml || '<div style="padding:20px; text-align:center; color:var(--text-muted);">Нет каналов</div>';
        }

        function openChat(target, type) {
            currentChatTarget = target;
            currentChatType = type;
            document.getElementById('chatTitle').innerText = type === 'channel' ? '#' + target : target;
            if (type === 'private') socket.emit('joinPrivate', target);
            else socket.emit('joinChannel', target);
            closeSidebar();
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text || !currentChatTarget) return;
            socket.emit('chatMessage', { type: currentChatType, target: currentChatTarget, text });
            input.value = '';
        }

        function sendSticker(sticker) {
            if (!currentChatTarget) return;
            socket.emit('chatMessage', { type: currentChatType, target: currentChatTarget, text: sticker });
            document.getElementById('stickerPicker').style.display = 'none';
        }

        function sendFile() {
            const file = document.getElementById('fileInput').files[0];
            if (!file || !currentChatTarget) return;
            const reader = new FileReader();
            reader.onloadend = () => socket.emit('fileMessage', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileData: reader.result });
            reader.readAsDataURL(file);
        }

        async function toggleRecording() {
            if (isRecording) { stopRecording(); return; }
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
                showToast('🎙️ Запись...');
            } catch(e) { alert('Нет микрофона'); }
        }

        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
            }
        }

        function addFriend() {
            const username = prompt('Username друга:');
            if (username) socket.emit('addFriend', { friendUsername: username }, (res) => { alert(res.message || res.error); loadData(); });
        }

        function createChannel() {
            const name = prompt('Название канала:');
            if (name) socket.emit('createChannel', { channelName: name }, (res) => { if (res.success) { alert('Канал создан'); loadData(); } else alert(res.error); });
        }

        function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('open'); }
        function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }
        function openStickerPicker() { const p = document.getElementById('stickerPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
        function openProfileModal() { document.getElementById('profileModal').classList.add('active'); document.getElementById('editName').value = currentUserData?.name || ''; document.getElementById('editBio').value = currentUserData?.bio || ''; }
        function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }
        function openSettingsModal() { document.getElementById('settingsModal').classList.add('active'); }
        function closeSettingsModal() { document.getElementById('settingsModal').classList.remove('active'); }
        function openSavedMessages() { alert('⭐ Сохранённые сообщения в разработке'); }

        function uploadAvatar() {
            const file = document.getElementById('avatarUpload').files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => socket.emit('uploadAvatar', { avatar: reader.result }, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); closeProfileModal(); showToast('Аватар обновлён'); } });
            reader.readAsDataURL(file);
        }

        function saveProfile() {
            const data = { name: document.getElementById('editName').value.trim(), bio: document.getElementById('editBio').value.trim() };
            const pass = document.getElementById('editPassword').value.trim();
            if (pass) data.password = pass;
            socket.emit('updateProfile', data, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); closeProfileModal(); showToast('Сохранено'); } });
        }

        function applyTheme() { document.body.classList.toggle('light', document.getElementById('themeSelect').value === 'light'); localStorage.setItem('theme', document.getElementById('themeSelect').value); }
        function applyMsgColor() { document.documentElement.style.setProperty('--message-mine', document.getElementById('myMsgColor').value); localStorage.setItem('msgColor', document.getElementById('myMsgColor').value); }
        function saveSettings() { applyTheme(); applyMsgColor(); closeSettingsModal(); showToast('Настройки сохранены'); }
        function applySavedSettings() { const theme = localStorage.getItem('theme'); if (theme) document.body.classList.toggle('light', theme === 'light'); const color = localStorage.getItem('msgColor'); if (color) document.documentElement.style.setProperty('--message-mine', color); }

        function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2000); }

        function addMessage(msg) {
            const div = document.createElement('div');
            div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
            div.innerHTML = '<div class="message-avatar">' + (msg.from === currentUser ? '👤' : '👤') + '</div>' +
                '<div class="message-bubble"><div class="message-content">' +
                (msg.from !== currentUser ? '<div class="message-name">' + msg.from + '</div>' : '') +
                '<div class="message-text">' + (msg.text || (msg.fileName ? '<a href="' + msg.fileData + '" download>' + msg.fileName + '</a>' : (msg.audio ? '<div class="voice-message"><button class="voice-play" onclick="playAudio(this)">▶️</button><span>Голосовое</span></div>' : ''))) + '</div>' +
                '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div></div></div>';
            document.getElementById('messages').appendChild(div);
            div.scrollIntoView({ behavior: 'smooth' });
        }

        function playAudio(btn) { const audio = new Audio(btn.closest('.voice-message').getAttribute('data-audio')); audio.play(); }

        socket.on('chatHistory', (data) => { if (currentChatTarget === data.target) { document.getElementById('messages').innerHTML = ''; data.messages.forEach(m => addMessage(m)); } });
        socket.on('newMessage', (msg) => { if (currentChatTarget === msg.target || currentChatTarget === msg.from) addMessage(msg); });
        socket.on('friendsUpdate', () => loadData());
        socket.on('channelsUpdate', () => loadData());

        const savedUser = localStorage.getItem('atomgram_user');
        if (savedUser) { document.getElementById('loginUsername').value = savedUser; }
    </script>
</body>
</html>`);
});

// ========== СОКЕТЫ ==========
io.on('connection', (socket) => {
    console.log('🔌 Клиент подключился');
    let currentUser = null;

    socket.on('register', (data, cb) => {
        if (users[data.username]) cb({ success: false, error: 'Занято' });
        else {
            users[data.username] = { username: data.username, name: data.name || '', password: data.password, bio: '', avatar: null, friends: [], friendRequests: [], channels: {} };
            saveData();
            cb({ success: true });
        }
    });

    socket.on('login', (data, cb) => {
        const user = users[data.username];
        if (!user) cb({ success: false, error: 'Не найден' });
        else if (user.password !== data.password) cb({ success: false, error: 'Неверный пароль' });
        else {
            currentUser = data.username;
            socket.currentUser = currentUser;
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
            socket.emit('friendsUpdate', { friends: user.friends || [], requests: user.friendRequests || [] });
            socket.emit('channelsUpdate', Object.keys(user.channels || {}));
            socket.emit('getChats', []);
        }
    });

    socket.on('uploadAvatar', (data, cb) => {
        if (users[currentUser]) {
            const filename = currentUser + '_' + Date.now() + '.jpg';
            const filepath = path.join(AVATAR_DIR, filename);
            const base64 = data.avatar.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filepath, base64, 'base64');
            users[currentUser].avatar = '/avatars/' + filename;
            saveData();
            cb({ success: true, userData: users[currentUser] });
        } else cb({ success: false });
    });

    socket.on('updateProfile', (data, cb) => {
        if (users[currentUser]) {
            if (data.name) users[currentUser].name = data.name;
            if (data.bio) users[currentUser].bio = data.bio;
            if (data.password) users[currentUser].password = data.password;
            saveData();
            cb({ success: true, userData: users[currentUser] });
        } else cb({ success: false });
    });

    socket.on('addFriend', (data, cb) => {
        const friend = users[data.friendUsername];
        if (!friend) cb({ success: false, error: 'Не найден' });
        else if (friend.friendRequests.includes(currentUser)) cb({ success: false, error: 'Запрос уже отправлен' });
        else {
            friend.friendRequests.push(currentUser);
            saveData();
            cb({ success: true, message: 'Запрос отправлен' });
            const friendSocket = getSocketByUsername(data.friendUsername);
            if (friendSocket) friendSocket.emit('friendsUpdate', { friends: friend.friends, requests: friend.friendRequests });
        }
    });

    socket.on('getFriends', (cb) => { if (users[currentUser]) cb({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [] }); else cb({ friends: [], requests: [] }); });
    socket.on('getChannels', (cb) => { if (users[currentUser]) cb(Object.keys(users[currentUser].channels || {})); else cb([]); });
    socket.on('getChats', (cb) => cb([]));

    socket.on('createChannel', (data, cb) => {
        if (!users[currentUser].channels) users[currentUser].channels = {};
        if (users[currentUser].channels[data.channelName]) cb({ success: false, error: 'Существует' });
        else {
            users[currentUser].channels[data.channelName] = { name: data.channelName, messages: [] };
            saveData();
            cb({ success: true });
            socket.emit('channelsUpdate', Object.keys(users[currentUser].channels));
        }
    });

    socket.on('joinChannel', (name) => {
        if (users[currentUser]?.channels?.[name]) {
            socket.emit('chatHistory', { target: name, messages: users[currentUser].channels[name].messages || [] });
        }
    });

    socket.on('joinPrivate', (target) => {
        const chatId = [currentUser, target].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
        socket.emit('chatHistory', { target: target, messages: privateChats[chatId].messages || [] });
    });

    socket.on('chatMessage', (data) => {
        const msg = { from: currentUser, text: data.text, time: new Date().toLocaleTimeString(), target: data.target };
        if (data.type === 'private') {
            const chatId = [currentUser, data.target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const targetSocket = getSocketByUsername(data.target);
            if (targetSocket) targetSocket.emit('newMessage', { ...msg, target: currentUser });
        } else if (data.type === 'channel' && users[currentUser]?.channels?.[data.target]) {
            users[currentUser].channels[data.target].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            broadcastToChannel(currentUser, data.target, msg);
        }
    });

    socket.on('fileMessage', (data) => {
        const msg = { from: currentUser, fileName: data.fileName, fileData: data.fileData, time: new Date().toLocaleTimeString(), target: data.target };
        if (data.type === 'private') {
            const chatId = [currentUser, data.target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const targetSocket = getSocketByUsername(data.target);
            if (targetSocket) targetSocket.emit('newMessage', { ...msg, target: currentUser });
        }
    });

    socket.on('voiceMessage', (data) => {
        const msg = { from: currentUser, audio: data.audio, time: new Date().toLocaleTimeString(), target: data.target };
        if (data.type === 'private') {
            const chatId = [currentUser, data.target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const targetSocket = getSocketByUsername(data.target);
            if (targetSocket) targetSocket.emit('newMessage', { ...msg, target: currentUser });
        }
    });

    function getSocketByUsername(username) {
        for (let [id, sock] of io.sockets.sockets) if (sock.currentUser === username) return sock;
        return null;
    }

    function broadcastToChannel(user, channel, msg) {
        for (let [id, sock] of io.sockets.sockets) {
            if (sock.currentUser && users[sock.currentUser]?.channels?.[channel]) {
                sock.emit('newMessage', msg);
            }
        }
    }
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔═══════════════════════════════════════════╗`);
    console.log(`║     🚀 ATOMGRAM МЕССЕНДЖЕР ЗАПУЩЕН     ║`);
    console.log(`╠═══════════════════════════════════════════╣`);
    console.log(`║  💻 http://localhost:${PORT}                     ║`);
    console.log(`║  📱 http://${getLocalIP()}:${PORT}              ║`);
    console.log(`╠═══════════════════════════════════════════╣`);
    console.log(`║  ✨ Функции:                               ║`);
    console.log(`║  📱 Адаптивный дизайн                     ║`);
    console.log(`║  💬 Личные сообщения                      ║`);
    console.log(`║  📢 Каналы                                ║`);
    console.log(`║  👥 Друзья                               ║`);
    console.log(`║  🎤 Голосовые сообщения                   ║`);
    console.log(`║  📎 Файлы и фото                          ║`);
    console.log(`║  😀 Стикеры                               ║`);
    console.log(`║  🖼️ Аватары                               ║`);
    console.log(`║  🌓 Тёмная/светлая тема                   ║`);
    console.log(`║  📱 Работает на телефоне                  ║`);
    console.log(`╚═══════════════════════════════════════════╝\n`);
});
