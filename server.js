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

// Данные
const DATA_FILE = path.join(__dirname, 'data.json');
const AVATAR_DIR = path.join(__dirname, 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

let users = {};
let privateChats = {};
let channels = {};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = data.users || {};
            privateChats = data.privateChats || {};
            channels = data.channels || {};
            console.log('✅ Данные загружены');
        }
    } catch(e) { console.log('Ошибка загрузки:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels }, null, 2));
    } catch(e) { console.log('Ошибка сохранения:', e); }
}

loadData();
setInterval(saveData, 10000);

app.use('/avatars', express.static(AVATAR_DIR));
app.use(express.json({ limit: '50mb' }));

// HTML страница
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
    <title>ATOMGRAM — Мессенджер будущего</title>
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
            --bg-secondary: #14141a;
            --bg-tertiary: #1c1c24;
            --bg-input: #1c1c24;
            --bg-hover: #2a2a35;
            --text-primary: #ffffff;
            --text-secondary: #a0a0b0;
            --text-muted: #6b6b7a;
            --accent: #5e5ce0;
            --accent-light: #7c7ae8;
            --accent-glow: rgba(94, 92, 224, 0.3);
            --success: #20d180;
            --error: #ff4757;
            --border: rgba(255,255,255,0.06);
            --shadow: 0 8px 32px rgba(0,0,0,0.4);
            --transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        }

        body.light {
            --bg-primary: #ffffff;
            --bg-secondary: #f8f9fa;
            --bg-tertiary: #f1f3f5;
            --bg-input: #e9ecef;
            --bg-hover: #e9ecef;
            --text-primary: #212529;
            --text-secondary: #6c757d;
            --text-muted: #adb5bd;
            --accent: #5e5ce0;
            --border: rgba(0,0,0,0.06);
            --shadow: 0 8px 32px rgba(0,0,0,0.08);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
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
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
        }

        /* Экран входа */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            animation: fadeIn 0.5s ease;
        }

        .auth-card {
            background: var(--bg-secondary);
            backdrop-filter: blur(20px);
            padding: 40px 32px;
            border-radius: 32px;
            width: 90%;
            max-width: 400px;
            text-align: center;
            box-shadow: var(--shadow);
            border: 1px solid var(--border);
        }

        .auth-card h1 {
            font-size: 36px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #5e5ce0, #a05ce0);
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
            padding: 14px 18px;
            margin: 8px 0;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 16px;
            font-size: 15px;
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
            padding: 14px;
            margin-top: 16px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
        }

        .auth-card button:hover {
            background: var(--accent-light);
            transform: translateY(-1px);
        }

        .switch-btn {
            background: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
        }

        .error-msg {
            color: var(--error);
            margin-top: 16px;
            font-size: 13px;
        }

        /* Главное приложение */
        .app {
            display: flex;
            height: 100vh;
            width: 100%;
            position: relative;
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
            top: 0;
            height: 100%;
            width: 85%;
            max-width: 300px;
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
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 99;
            display: none;
        }

        .overlay.open {
            display: block;
        }

        /* Профиль */
        .profile-card {
            padding: 32px 20px 24px;
            text-align: center;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            transition: var(--transition);
        }

        .profile-card:hover {
            background: var(--bg-hover);
        }

        .avatar {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--accent), var(--accent-light));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 12px;
            position: relative;
            transition: var(--transition);
        }

        .avatar img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }

        .online-badge {
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
            font-size: 17px;
            font-weight: 600;
        }

        .profile-status {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        /* Навигация */
        .nav {
            padding: 16px 12px;
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
        }

        .nav-item:hover {
            background: var(--bg-hover);
        }

        .nav-item i {
            width: 24px;
            font-size: 18px;
            color: var(--accent);
        }

        .section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            padding: 20px 16px 8px;
        }

        /* Список чатов */
        .chat-list {
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
            background: var(--bg-hover);
        }

        .chat-item.active {
            background: var(--accent);
        }

        .chat-avatar {
            width: 52px;
            height: 52px;
            background: var(--bg-tertiary);
            border-radius: 50%;
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
            padding: 16px 24px;
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
            font-weight: 700;
            font-size: 18px;
        }

        .chat-header-status {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 2px;
        }

        .header-actions {
            display: flex;
            gap: 12px;
        }

        .header-btn {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-primary);
            padding: 8px;
            border-radius: 50%;
            transition: var(--transition);
        }

        .header-btn:hover {
            background: var(--bg-hover);
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
            gap: 10px;
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
            background: var(--bg-tertiary);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
        }

        .message-bubble {
            max-width: calc(100% - 46px);
        }

        .message-content {
            padding: 10px 16px;
            border-radius: 20px;
            background: var(--bg-tertiary);
            word-wrap: break-word;
        }

        .message.mine .message-content {
            background: var(--accent);
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

        .message-status {
            font-size: 10px;
            margin-left: 8px;
        }

        /* Индикатор печати */
        .typing-indicator {
            padding: 8px 20px;
            font-size: 12px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .typing-dot {
            width: 6px;
            height: 6px;
            background: var(--accent);
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }

        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        /* Панель ввода */
        .input-area {
            padding: 16px 24px;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .input-area input {
            flex: 1;
            padding: 12px 20px;
            background: var(--bg-input);
            border: none;
            border-radius: 28px;
            font-size: 15px;
            color: var(--text-primary);
            transition: var(--transition);
        }

        .input-area input:focus {
            outline: none;
            background: var(--bg-hover);
        }

        .input-btn {
            width: 46px;
            height: 46px;
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

        /* Стикеры */
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: var(--bg-secondary);
            border-radius: 28px 28px 0 0;
            padding: 20px;
            display: none;
            flex-wrap: wrap;
            gap: 16px;
            justify-content: center;
            z-index: 150;
            max-height: 250px;
            overflow-y: auto;
            box-shadow: var(--shadow);
        }

        .sticker-picker.open {
            display: flex;
        }

        .sticker {
            font-size: 48px;
            cursor: pointer;
            transition: transform 0.1s;
            padding: 8px;
        }

        .sticker:active {
            transform: scale(1.2);
        }

        /* Модалки */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
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
            padding: 12px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 14px;
            font-size: 15px;
            color: var(--text-primary);
            transition: var(--transition);
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--accent);
        }

        .btn-primary {
            padding: 12px 24px;
            background: var(--accent);
            border: none;
            border-radius: 16px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
        }

        .btn-primary:hover {
            background: var(--accent-light);
            transform: translateY(-1px);
        }

        .btn-secondary {
            padding: 12px 24px;
            background: var(--bg-tertiary);
            border: none;
            border-radius: 16px;
            color: var(--text-primary);
            cursor: pointer;
            transition: var(--transition);
        }

        /* Уведомления */
        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            padding: 12px 24px;
            border-radius: 40px;
            font-size: 14px;
            box-shadow: var(--shadow);
            z-index: 1000;
            animation: fadeIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
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

            .chat-header {
                padding: 12px 16px;
            }

            .input-area {
                padding: 12px 16px;
            }
        }

        @media (min-width: 769px) {
            .sidebar {
                position: relative;
                left: 0 !important;
            }
        }

        /* Скроллбар */
        ::-webkit-scrollbar {
            width: 4px;
        }

        ::-webkit-scrollbar-track {
            background: var(--bg-tertiary);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--accent);
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div id="authScreen" class="auth-screen">
        <div class="auth-card">
            <h1>⚡ ATOMGRAM</h1>
            <div class="subtitle">Быстрый. Безопасный. Современный.</div>
            <div id="loginPanel">
                <input type="text" id="loginUsername" placeholder="Username">
                <input type="password" id="loginPassword" placeholder="Пароль">
                <button onclick="login()">Войти</button>
                <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
            </div>
            <div id="registerPanel" style="display:none">
                <input type="text" id="regUsername" placeholder="Username">
                <input type="text" id="regName" placeholder="Имя">
                <input type="password" id="regPassword" placeholder="Пароль">
                <button onclick="register()">Зарегистрироваться</button>
                <button class="switch-btn" onclick="showLogin()">Назад</button>
            </div>
            <div id="authError" class="error-msg"></div>
        </div>
    </div>

    <div class="app" id="mainApp" style="display: none">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile-card" onclick="openProfileModal()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-status" id="userStatus">онлайн</div>
            </div>
            <div class="nav">
                <div class="nav-item" onclick="openProfileModal()">
                    <i class="fas fa-user"></i><span>Мой профиль</span>
                </div>
                <div class="nav-item" onclick="openSettingsModal()">
                    <i class="fas fa-sliders-h"></i><span>Настройки</span>
                </div>
                <div class="nav-item" onclick="openSavedMessages()">
                    <i class="fas fa-bookmark"></i><span>Сохранённые</span>
                </div>
                <div class="nav-item" onclick="addFriend()">
                    <i class="fas fa-user-plus"></i><span>Добавить друга</span>
                </div>
                <div class="section-title">ЧАТЫ</div>
                <div id="chatsList" class="chat-list"></div>
                <div class="section-title">КАНАЛЫ</div>
                <div id="channelsList" class="chat-list"></div>
                <div class="nav-item" onclick="createChannel()">
                    <i class="fas fa-plus-circle"></i><span>Создать канал</span>
                </div>
            </div>
        </div>

        <div class="chat-main">
            <div class="chat-header">
                <button class="menu-toggle" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
                <div class="chat-header-info">
                    <div class="chat-header-name" id="chatTitle">ATOMGRAM</div>
                    <div class="chat-header-status" id="chatStatus">Выберите чат</div>
                </div>
                <div class="header-actions">
                    <button class="header-btn" onclick="openStickerPicker()"><i class="fas fa-smile"></i></button>
                    <button class="header-btn" onclick="document.getElementById('fileInput').click()"><i class="fas fa-paperclip"></i></button>
                </div>
                <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="typing-indicator" id="typingIndicator" style="display: none;">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <span id="typingText">печатает...</span>
            </div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button class="input-btn" onclick="toggleRecording()"><i class="fas fa-microphone"></i></button>
                <button class="input-btn" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    </div>

    <div id="stickerPicker" class="sticker-picker">
        <div class="sticker" onclick="sendSticker('😀')">😀</div>
        <div class="sticker" onclick="sendSticker('😂')">😂</div>
        <div class="sticker" onclick="sendSticker('😍')">😍</div>
        <div class="sticker" onclick="sendSticker('😎')">😎</div>
        <div class="sticker" onclick="sendSticker('🥳')">🥳</div>
        <div class="sticker" onclick="sendSticker('🔥')">🔥</div>
        <div class="sticker" onclick="sendSticker('❤️')">❤️</div>
        <div class="sticker" onclick="sendSticker('🎉')">🎉</div>
        <div class="sticker" onclick="sendSticker('👍')">👍</div>
        <div class="sticker" onclick="sendSticker('🐱')">🐱</div>
        <div class="sticker" onclick="sendSticker('🐶')">🐶</div>
        <div class="sticker" onclick="sendSticker('🚀')">🚀</div>
        <div class="sticker" onclick="sendSticker('✨')">✨</div>
        <div class="sticker" onclick="sendSticker('💎')">💎</div>
    </div>

    <div id="profileModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Профиль</h3>
                <button onclick="closeProfileModal()" style="background:none; border:none; font-size:24px; cursor:pointer; color:var(--text-primary);">✕</button>
            </div>
            <div class="modal-body">
                <div style="text-align:center; margin-bottom:24px;">
                    <div class="avatar" id="profileAvatar" style="width:100px; height:100px; font-size:48px; margin:0 auto;">👤</div>
                    <button onclick="document.getElementById('avatarUpload').click()" style="margin-top:16px; padding:8px 20px; background:var(--accent); border:none; border-radius:20px; color:white; cursor:pointer;">Загрузить фото</button>
                    <input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()">
                </div>
                <div class="form-group">
                    <label>Имя</label>
                    <input type="text" id="editName" placeholder="Ваше имя">
                </div>
                <div class="form-group">
                    <label>О себе</label>
                    <textarea id="editBio" rows="3" placeholder="Расскажите о себе..."></textarea>
                </div>
                <div class="form-group">
                    <label>Новый пароль</label>
                    <input type="password" id="editPassword" placeholder="Оставьте пустым">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeProfileModal()">Отмена</button>
                <button class="btn-primary" onclick="saveProfile()">Сохранить</button>
            </div>
        </div>
    </div>

    <div id="settingsModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Настройки</h3>
                <button onclick="closeSettingsModal()" style="background:none; border:none; font-size:24px; cursor:pointer; color:var(--text-primary);">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>🌓 Тема оформления</label>
                    <select id="themeSelect" onchange="applyTheme()">
                        <option value="dark">Тёмная</option>
                        <option value="light">Светлая</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>🎨 Цвет моих сообщений</label>
                    <input type="color" id="myMsgColor" value="#5e5ce0" onchange="applyMsgColor()">
                </div>
                <div class="form-group">
                    <label>🔔 Уведомления</label>
                    <select id="notifySelect">
                        <option value="on">Включены</option>
                        <option value="off">Выключены</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary" onclick="saveSettings()">Сохранить</button>
            </div>
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
        let typingTimeout = null;

        socket.on('connect', () => {
            console.log('✅ Подключено к серверу');
            showToast('Подключено', 'success');
        });

        // Авторизация
        function login() {
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            if (!username || !password) {
                showError('Заполните все поля');
                return;
            }
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
                    showToast(`Добро пожаловать, ${username}!`, 'success');
                } else {
                    showError(res.error);
                }
            });
        }

        function register() {
            const username = document.getElementById('regUsername').value.trim();
            const name = document.getElementById('regName').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            if (!username || !password) {
                showError('Заполните все поля');
                return;
            }
            socket.emit('register', { username, name, password }, (res) => {
                if (res.success) {
                    showToast('Регистрация успешна!', 'success');
                    showLogin();
                } else {
                    showError(res.error);
                }
            });
        }

        function showRegister() {
            document.getElementById('loginPanel').style.display = 'none';
            document.getElementById('registerPanel').style.display = 'block';
            document.getElementById('authError').innerHTML = '';
        }

        function showLogin() {
            document.getElementById('loginPanel').style.display = 'block';
            document.getElementById('registerPanel').style.display = 'none';
            document.getElementById('authError').innerHTML = '';
        }

        function showError(msg) {
            document.getElementById('authError').innerHTML = msg;
        }

        function updateUI() {
            document.getElementById('userName').innerHTML = currentUserData?.name || currentUser;
            document.getElementById('userAvatar').innerHTML = currentUserData?.avatar ? `<img src="${currentUserData.avatar}">` : '👤';
        }

        function loadData() {
            socket.emit('getFriends', (data) => {
                allFriends = data.friends || [];
                friendRequests = data.requests || [];
                renderChats();
            });
            socket.emit('getChannels', (channels) => {
                allChannels = channels;
                renderChats();
            });
        }

        function renderChats() {
            const container = document.getElementById('chatsList');
            let html = '';
            
            allFriends.forEach(friend => {
                html += `<div class="chat-item" onclick="openChat('${friend}', 'private')">
                    <div class="chat-avatar">👤</div>
                    <div class="chat-info">
                        <div class="chat-name">${friend}</div>
                        <div class="chat-preview">Нажмите для чата</div>
                    </div>
                </div>`;
            });
            
            const channelsContainer = document.getElementById('channelsList');
            let channelsHtml = '';
            allChannels.forEach(ch => {
                channelsHtml += `<div class="chat-item" onclick="openChat('${ch}', 'channel')">
                    <div class="chat-avatar">📢</div>
                    <div class="chat-info">
                        <div class="chat-name">#${ch}</div>
                        <div class="chat-preview">Канал</div>
                    </div>
                </div>`;
            });
            
            container.innerHTML = html || '<div style="padding:20px; text-align:center; color:var(--text-muted);">Нет чатов</div>';
            channelsContainer.innerHTML = channelsHtml || '<div style="padding:20px; text-align:center; color:var(--text-muted);">Нет каналов</div>';
        }

        function openChat(target, type) {
            currentChatTarget = target;
            currentChatType = type;
            document.getElementById('chatTitle').innerHTML = type === 'channel' ? '#' + target : target;
            document.getElementById('chatStatus').innerHTML = 'онлайн';
            
            if (type === 'private') {
                socket.emit('joinPrivate', target);
            } else {
                socket.emit('joinChannel', target);
            }
            closeSidebar();
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text || !currentChatTarget) return;
            
            socket.emit('chatMessage', {
                type: currentChatType,
                target: currentChatTarget,
                text: text
            });
            input.value = '';
            
            // Отправка индикатора печати
            socket.emit('typing', {
                type: currentChatType,
                target: currentChatTarget,
                isTyping: false
            });
        }

        function sendSticker(sticker) {
            if (!currentChatTarget) return;
            socket.emit('chatMessage', {
                type: currentChatType,
                target: currentChatTarget,
                text: sticker
            });
            document.getElementById('stickerPicker').classList.remove('open');
        }

        function sendFile() {
            const file = document.getElementById('fileInput').files[0];
            if (!file || !currentChatTarget) return;
            
            const reader = new FileReader();
            reader.onloadend = () => {
                socket.emit('fileMessage', {
                    type: currentChatType,
                    target: currentChatTarget,
                    fileName: file.name,
                    fileData: reader.result
                });
                showToast('Файл отправлен', 'success');
            };
            reader.readAsDataURL(file);
        }

        async function toggleRecording() {
            if (isRecording) {
                stopRecording();
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
                    reader.onloadend = () => {
                        socket.emit('voiceMessage', {
                            type: currentChatType,
                            target: currentChatTarget,
                            audio: reader.result
                        });
                    };
                    reader.readAsDataURL(blob);
                    stream.getTracks().forEach(t => t.stop());
                };
                
                mediaRecorder.start();
                isRecording = true;
                showToast('🎙️ Запись... Нажмите ещё раз для отправки', 'info');
            } catch(e) {
                showToast('Нет доступа к микрофону', 'error');
            }
        }

        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
            }
        }

        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
            
            div.innerHTML = `
                <div class="message-avatar">${msg.from === currentUser ? '👤' : '👤'}</div>
                <div class="message-bubble">
                    <div class="message-content">
                        ${msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : ''}
                        <div class="message-text">${msg.fileName ? '<i class="fas fa-file"></i> <a href="' + msg.fileData + '" download style="color:inherit;">' + escapeHtml(msg.fileName) + '</a>' : escapeHtml(msg.text || '')}</div>
                        <div class="message-time">${msg.time || new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
            
            messagesDiv.appendChild(div);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addFriend() {
            const username = prompt('Введите username друга:');
            if (username) {
                socket.emit('addFriend', { friendUsername: username }, (res) => {
                    showToast(res.message || res.error, res.success ? 'success' : 'error');
                    loadData();
                });
            }
        }

        function createChannel() {
            const name = prompt('Название канала:');
            if (name) {
                socket.emit('createChannel', { channelName: name }, (res) => {
                    if (res.success) {
                        showToast('Канал создан', 'success');
                        loadData();
                    } else {
                        showToast(res.error, 'error');
                    }
                });
            }
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('overlay').classList.toggle('open');
        }

        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('overlay').classList.remove('open');
        }

        function openStickerPicker() {
            document.getElementById('stickerPicker').classList.toggle('open');
        }

        function openProfileModal() {
            document.getElementById('editName').value = currentUserData?.name || '';
            document.getElementById('editBio').value = currentUserData?.bio || '';
            document.getElementById('profileModal').classList.add('active');
        }

        function closeProfileModal() {
            document.getElementById('profileModal').classList.remove('active');
        }

        function openSettingsModal() {
            document.getElementById('settingsModal').classList.add('active');
        }

        function closeSettingsModal() {
            document.getElementById('settingsModal').classList.remove('active');
        }

        function openSavedMessages() {
            showToast('Сохранённые сообщения в разработке', 'info');
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
                        closeProfileModal();
                        showToast('Аватар обновлён', 'success');
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
            const password = document.getElementById('editPassword').value.trim();
            if (password) data.password = password;
            
            socket.emit('updateProfile', data, (res) => {
                if (res.success) {
                    currentUserData = res.userData;
                    updateUI();
                    closeProfileModal();
                    showToast('Профиль обновлён', 'success');
                }
            });
        }

        function applyTheme() {
            const theme = document.getElementById('themeSelect').value;
            if (theme === 'light') {
                document.body.classList.add('light');
            } else {
                document.body.classList.remove('light');
            }
            localStorage.setItem('atomgram_theme', theme);
        }

        function applyMsgColor() {
            const color = document.getElementById('myMsgColor').value;
            document.documentElement.style.setProperty('--accent', color);
            localStorage.setItem('atomgram_msgColor', color);
        }

        function saveSettings() {
            applyTheme();
            applyMsgColor();
            closeSettingsModal();
            showToast('Настройки сохранены', 'success');
        }

        function applySavedSettings() {
            const theme = localStorage.getItem('atomgram_theme');
            if (theme === 'light') document.body.classList.add('light');
            
            const color = localStorage.getItem('atomgram_msgColor');
            if (color) document.documentElement.style.setProperty('--accent', color);
        }

        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
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

        // Обработка печати
        let typingTimer;
        document.getElementById('messageInput').addEventListener('input', () => {
            if (!currentChatTarget) return;
            
            socket.emit('typing', {
                type: currentChatType,
                target: currentChatTarget,
                isTyping: true
            });
            
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                socket.emit('typing', {
                    type: currentChatType,
                    target: currentChatTarget,
                    isTyping: false
                });
            }, 1000);
        });

        // События от сервера
        socket.on('friendsUpdate', (data) => {
            allFriends = data.friends || [];
            friendRequests = data.requests || [];
            renderChats();
        });

        socket.on('channelsUpdate', (channels) => {
            allChannels = channels;
            renderChats();
        });

        socket.on('chatHistory', (data) => {
            if (currentChatTarget === data.target) {
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                data.messages.forEach(msg => addMessage(msg));
            }
        });

        socket.on('newMessage', (msg) => {
            if (currentChatTarget === msg.target || currentChatTarget === msg.from) {
                addMessage(msg);
            }
            if (msg.from !== currentUser && localStorage.getItem('atomgram_notify') !== 'off') {
                showToast(`Новое сообщение от ${msg.from}`, 'info');
            }
        });

        socket.on('userTyping', (data) => {
            if (currentChatTarget === data.user || currentChatTarget === data.channel) {
                const indicator = document.getElementById('typingIndicator');
                const textSpan = document.getElementById('typingText');
                textSpan.innerHTML = `${data.user} печатает...`;
                indicator.style.display = 'flex';
                setTimeout(() => {
                    indicator.style.display = 'none';
                }, 1500);
            }
        });

        // Автовход
        const savedUser = localStorage.getItem('atomgram_user');
        if (savedUser) {
            document.getElementById('loginUsername').value = savedUser;
        }
    </script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ ==========
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Новое подключение:', socket.id);
    let currentUser = null;

    // Регистрация
    socket.on('register', (data, callback) => {
        const { username, name, password } = data;
        if (users[username]) {
            callback({ success: false, error: 'Пользователь уже существует' });
        } else {
            users[username] = {
                username,
                name: name || '',
                password,
                bio: '',
                avatar: null,
                friends: [],
                friendRequests: [],
                channels: {}
            };
            saveData();
            callback({ success: true });
            console.log('✅ Зарегистрирован:', username);
        }
    });

    // Логин
    socket.on('login', (data, callback) => {
        const { username, password } = data;
        const user = users[username];
        
        if (!user) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (user.password !== password) {
            callback({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            socket.currentUser = username;
            onlineUsers.set(socket.id, username);
            
            callback({
                success: true,
                userData: {
                    username: user.username,
                    name: user.name,
                    bio: user.bio,
                    avatar: user.avatar
                }
            });
            
            socket.emit('friendsUpdate', {
                friends: user.friends || [],
                requests: user.friendRequests || []
            });
            socket.emit('channelsUpdate', Object.keys(user.channels || {}));
            console.log('✅ Вошёл:', username);
        }
    });

    // Загрузка аватара
    socket.on('uploadAvatar', (data, callback) => {
        if (users[currentUser]) {
            const filename = currentUser + '_' + Date.now() + '.jpg';
            const filepath = path.join(AVATAR_DIR, filename);
            const base64 = data.avatar.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filepath, base64, 'base64');
            users[currentUser].avatar = '/avatars/' + filename;
            saveData();
            callback({
                success: true,
                userData: {
                    username: users[currentUser].username,
                    name: users[currentUser].name,
                    bio: users[currentUser].bio,
                    avatar: users[currentUser].avatar
                }
            });
        } else {
            callback({ success: false });
        }
    });

    // Обновление профиля
    socket.on('updateProfile', (data, callback) => {
        if (users[currentUser]) {
            if (data.name) users[currentUser].name = data.name;
            if (data.bio) users[currentUser].bio = data.bio;
            if (data.password) users[currentUser].password = data.password;
            saveData();
            callback({
                success: true,
                userData: {
                    username: users[currentUser].username,
                    name: users[currentUser].name,
                    bio: users[currentUser].bio,
                    avatar: users[currentUser].avatar
                }
            });
        } else {
            callback({ success: false });
        }
    });

    // Получить друзей
    socket.on('getFriends', (callback) => {
        if (currentUser && users[currentUser]) {
            callback({
                friends: users[currentUser].friends || [],
                requests: users[currentUser].friendRequests || []
            });
        } else {
            callback({ friends: [], requests: [] });
        }
    });

    // Получить каналы
    socket.on('getChannels', (callback) => {
        if (currentUser && users[currentUser]) {
            callback(Object.keys(users[currentUser].channels || {}));
        } else {
            callback([]);
        }
    });

    // Добавить друга
    socket.on('addFriend', (data, callback) => {
        const { friendUsername } = data;
        if (!users[friendUsername]) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (friendUsername === currentUser) {
            callback({ success: false, error: 'Нельзя добавить себя' });
        } else if (users[currentUser].friends?.includes(friendUsername)) {
            callback({ success: false, error: 'Уже в друзьях' });
        } else if (users[friendUsername].friendRequests?.includes(currentUser)) {
            callback({ success: false, error: 'Запрос уже отправлен' });
        } else {
            if (!users[friendUsername].friendRequests) users[friendUsername].friendRequests = [];
            users[friendUsername].friendRequests.push(currentUser);
            saveData();
            callback({ success: true, message: 'Запрос в друзья отправлен' });
            
            // Уведомить друга
            for (let [id, sock] of io.sockets.sockets) {
                if (sock.currentUser === friendUsername) {
                    sock.emit('friendsUpdate', {
                        friends: users[friendUsername].friends || [],
                        requests: users[friendUsername].friendRequests || []
                    });
                    break;
                }
            }
        }
    });

    // Создать канал
    socket.on('createChannel', (data, callback) => {
        const { channelName } = data;
        if (!users[currentUser].channels) users[currentUser].channels = {};
        if (users[currentUser].channels[channelName]) {
            callback({ success: false, error: 'Канал уже существует' });
        } else {
            users[currentUser].channels[channelName] = { name: channelName, messages: [] };
            saveData();
            callback({ success: true });
            socket.emit('channelsUpdate', Object.keys(users[currentUser].channels));
        }
    });

    // Присоединиться к каналу
    socket.on('joinChannel', (channelName) => {
        if (users[currentUser]?.channels?.[channelName]) {
            socket.emit('chatHistory', {
                target: channelName,
                messages: users[currentUser].channels[channelName].messages || []
            });
        }
    });

    // Личный чат
    socket.on('joinPrivate', (target) => {
        const chatId = [currentUser, target].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
        socket.emit('chatHistory', {
            target: target,
            messages: privateChats[chatId].messages || []
        });
    });

    // Отправить сообщение
    socket.on('chatMessage', (data) => {
        const { type, target, text } = data;
        const msg = {
            from: currentUser,
            text: text,
            time: new Date().toLocaleTimeString(),
            target: target
        };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            
            socket.emit('newMessage', msg);
            
            for (let [id, sock] of io.sockets.sockets) {
                if (sock.currentUser === target) {
                    sock.emit('newMessage', msg);
                    break;
                }
            }
        } else if (type === 'channel') {
            if (users[currentUser]?.channels?.[target]) {
                users[currentUser].channels[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
            }
        }
    });

    // Отправить файл
    socket.on('fileMessage', (data) => {
        const { type, target, fileName, fileData } = data;
        const msg = {
            from: currentUser,
            fileName: fileName,
            fileData: fileData,
            time: new Date().toLocaleTimeString(),
            target: target
        };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            
            socket.emit('newMessage', msg);
            
            for (let [id, sock] of io.sockets.sockets) {
                if (sock.currentUser === target) {
                    sock.emit('newMessage', msg);
                    break;
                }
            }
        }
    });

    // Голосовое сообщение
    socket.on('voiceMessage', (data) => {
        const { type, target, audio } = data;
        const msg = {
            from: currentUser,
            audio: audio,
            time: new Date().toLocaleTimeString(),
            target: target,
            text: '🎤 Голосовое сообщение'
        };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            
            socket.emit('newMessage', msg);
            
            for (let [id, sock] of io.sockets.sockets) {
                if (sock.currentUser === target) {
                    sock.emit('newMessage', msg);
                    break;
                }
            }
        }
    });

    // Индикатор печати
    socket.on('typing', (data) => {
        const { type, target, isTyping } = data;
        if (type === 'private') {
            for (let [id, sock] of io.sockets.sockets) {
                if (sock.currentUser === target) {
                    sock.emit('userTyping', { user: currentUser, channel: null });
                    break;
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('👋 Отключился:', currentUser || socket.id);
        onlineUsers.delete(socket.id);
    });
});

const PORT = 3000;
const ip = getLocalIP();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🚀 ATOMGRAM — МЕССЕНДЖЕР УРОВНЯ TELEGRAM             ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║     💻 http://localhost:${PORT}                              ║
║     📱 http://${ip}:${PORT}                                   ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║     ✨ ВОЗМОЖНОСТИ:                                       ║
║                                                           ║
║     📱 АДАПТИВНЫЙ ДИЗАЙН (Телефон/Планшет/ПК)            ║
║     💬 ЛИЧНЫЕ СООБЩЕНИЯ                                  ║
║     📢 КАНАЛЫ                                            ║
║     👥 ДРУЗЬЯ И ЗАПРОСЫ                                  ║
║     🎤 ГОЛОСОВЫЕ СООБЩЕНИЯ                               ║
║     📎 ФАЙЛЫ И ИЗОБРАЖЕНИЯ                               ║
║     😀 СТИКЕРЫ                                           ║
║     🖼️ АВАТАРЫ                                           ║
║     🌓 ТЁМНАЯ/СВЕТЛАЯ ТЕМА                               ║
║     ⌨️ ИНДИКАТОР ПЕЧАТИ                                  ║
║     🔔 УВЕДОМЛЕНИЯ                                       ║
║     ⚡ МОЛНИЕНОСНАЯ СКОРОСТЬ                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}
