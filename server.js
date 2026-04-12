const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

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
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR);

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
    } catch (e) { console.log('Ошибка загрузки:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels }, null, 2));
        console.log('💾 Данные сохранены');
    } catch (e) { console.log('Ошибка сохранения:', e); }
}

loadData();
setInterval(saveData, 10000);

function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
}

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

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM - Пасхальное обновление 🐣</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: linear-gradient(135deg, #1a0a2e 0%, #2a1a3e 100%); color: white; height: 100vh; overflow: hidden; transition: all 0.3s; }
        
        /* ПАСХАЛЬНЫЕ ТЕМЫ */
        body.easter { background: linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%); color: #4a1a3a; }
        body.easter-light { background: linear-gradient(135deg, #fff9c4 0%, #fff3e0 100%); color: #5d4037; }
        body.easter-pink { background: linear-gradient(135deg, #f8bbd0 0%, #fce4ec 100%); color: #880e4f; }
        body.easter-blue { background: linear-gradient(135deg, #bbdefb 0%, #e3f2fd 100%); color: #0d47a1; }
        body.easter-green { background: linear-gradient(135deg, #c8e6c9 0%, #e8f5e9 100%); color: #1b5e20; }
        body.easter-purple { background: linear-gradient(135deg, #e1bee7 0%, #f3e5f5 100%); color: #4a148c; }
        
        body.easter .sidebar, body.easter .chat-header, body.easter .input-area { background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); }
        body.easter .message-content { background: rgba(255,255,255,0.3); color: #4a1a3a; }
        body.easter .message.my-message .message-content { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #4a1a3a; }
        
        #authScreen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
        }
        .auth-card {
            background: rgba(255,255,255,0.3);
            backdrop-filter: blur(10px);
            padding: 30px 25px;
            border-radius: 30px;
            width: 100%;
            max-width: 350px;
            text-align: center;
            border: 2px solid rgba(255,255,255,0.5);
        }
        .auth-card h1 {
            font-size: 32px;
            margin-bottom: 10px;
            color: #ff6b6b;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .auth-card input {
            width: 100%;
            padding: 14px;
            margin: 8px 0;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            background: rgba(255,255,255,0.9);
        }
        .auth-card button {
            width: 100%;
            padding: 14px;
            margin-top: 10px;
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            color: #4a1a3a;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        }
        .switch-btn { background: rgba(255,255,255,0.3) !important; border: 1px solid #ff9a9e !important; color: #4a1a3a !important; }
        .error-msg { color: #ff6b6b; margin-top: 10px; }
        
        #mainApp {
            display: none;
            width: 100%;
            height: 100vh;
            position: relative;
        }
        .sidebar {
            position: fixed;
            left: -85%;
            top: 0;
            width: 85%;
            max-width: 300px;
            height: 100%;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(15px);
            transition: left 0.3s ease;
            z-index: 100;
            display: flex;
            flex-direction: column;
            border-right: 1px solid rgba(255,255,255,0.3);
        }
        .sidebar.open { left: 0; }
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.3);
            z-index: 99;
            display: none;
        }
        .sidebar-overlay.open { display: block; }
        
        .sidebar-header {
            padding: 50px 20px 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }
        .avatar-emoji { font-size: 45px; background: rgba(255,255,255,0.3); width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .avatar-img { width: 55px; height: 55px; border-radius: 50%; object-fit: cover; background: rgba(255,255,255,0.3); }
        .user-info h3 { font-size: 16px; }
        .user-info .username { font-size: 11px; color: rgba(255,255,255,0.7); }
        .menu-item { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-radius: 15px; margin: 2px 10px; }
        .menu-item:hover { background: rgba(255,255,255,0.2); }
        .section-title { padding: 10px 20px; font-size: 11px; color: #ff9a9e; text-transform: uppercase; letter-spacing: 1px; }
        .friends-list, .channels-list {
            padding: 5px 10px;
            overflow-y: auto;
            max-height: 150px;
        }
        .friend-item, .channel-item {
            padding: 8px 12px;
            margin: 3px 0;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: space-between;
            font-size: 14px;
            background: rgba(255,255,255,0.1);
        }
        .friend-item:hover, .channel-item:hover { background: rgba(255,255,255,0.2); }
        .friend-request { background: rgba(255,154,158,0.3); border-left: 3px solid #ff9a9e; }
        .friend-actions button { margin-left: 5px; padding: 3px 8px; border-radius: 12px; border: none; cursor: pointer; font-size: 12px; }
        .accept-btn { background: #4ade80; color: white; }
        .reject-btn { background: #ff6b6b; color: white; }
        .ban-btn { background: #ff4444; color: white; }
        .create-btn { padding: 12px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.2); margin: 0 10px; }
        .create-btn button { flex: 1; padding: 10px; background: rgba(255,255,255,0.2); border: 1px solid #ff9a9e; border-radius: 20px; color: #ff9a9e; cursor: pointer; font-size: 14px; }
        
        .chat-area {
            display: flex;
            flex-direction: column;
            height: 100vh;
            width: 100%;
        }
        .chat-header {
            padding: 12px 15px;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
            color: inherit;
        }
        .chat-title { flex: 1; font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .encryption-badge {
            font-size: 10px;
            background: #ff9a9e;
            color: #4a1a3a;
            padding: 2px 8px;
            border-radius: 20px;
        }
        .settings-btn { background: none; border: none; font-size: 18px; cursor: pointer; padding: 5px; }
        
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .message {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            max-width: 100%;
            animation: fadeInUp 0.3s ease;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message-avatar { font-size: 32px; min-width: 36px; text-align: center; cursor: pointer; }
        .message-bubble { max-width: 75%; word-wrap: break-word; }
        .message-content { padding: 8px 12px; border-radius: 18px; background: rgba(255,255,255,0.2); backdrop-filter: blur(5px); }
        .message.my-message { justify-content: flex-end; }
        .message.my-message .message-content { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #4a1a3a; }
        .message-username { font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 2px; cursor: pointer; }
        .message-text { font-size: 14px; word-wrap: break-word; }
        .encrypted-badge { font-size: 9px; opacity: 0.7; margin-left: 5px; }
        .message-time { font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 3px; }
        .voice-message { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .voice-message button { background: none; border: none; font-size: 20px; cursor: pointer; color: white; }
        .voice-message audio { height: 35px; border-radius: 20px; max-width: 150px; }
        .video-circle { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; cursor: pointer; background: rgba(255,255,255,0.2); }
        .file-attachment { background: rgba(255,255,255,0.2); padding: 6px 10px; border-radius: 12px; display: flex; align-items: center; gap: 6px; font-size: 12px; }
        .file-attachment a { color: white; text-decoration: none; }
        .typing-indicator { font-size: 11px; color: rgba(255,255,255,0.6); padding: 5px 15px; font-style: italic; }
        
        .input-area {
            display: flex;
            padding: 10px 12px;
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            border-top: 1px solid rgba(255,255,255,0.2);
            gap: 6px;
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        .input-area input {
            flex: 1;
            padding: 10px 14px;
            border: none;
            border-radius: 25px;
            background: rgba(255,255,255,0.3);
            color: white;
            font-size: 14px;
            min-width: 100px;
        }
        .input-area input::placeholder { color: rgba(255,255,255,0.7); }
        .input-area button {
            padding: 10px 14px;
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            color: #4a1a3a;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        }
        .attach-btn, .voice-record-btn, .video-record-btn, .sticker-btn { background: rgba(255,255,255,0.3) !important; color: white !important; }
        .voice-record-btn.recording { animation: pulse 1s infinite; background: #ff4444 !important; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        
        .sticker-picker {
            position: fixed;
            bottom: 75px;
            left: 0;
            right: 0;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px 20px 0 0;
            padding: 12px;
            display: none;
            flex-wrap: wrap;
            gap: 8px;
            z-index: 150;
            max-height: 180px;
            overflow-y: auto;
        }
        .sticker-picker.open { display: flex; }
        .sticker { font-size: 40px; cursor: pointer; padding: 6px; border-radius: 12px; transition: transform 0.1s; }
        .sticker:active { transform: scale(1.1); }
        
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
        .video-preview { width: 100%; max-width: 280px; border-radius: 50%; overflow: hidden; }
        video { width: 100%; border-radius: 50%; }
        .video-controls { margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .video-controls button { padding: 10px 16px; border-radius: 30px; border: none; font-size: 13px; cursor: pointer; }
        .start-record { background: #ff6b6b; color: white; }
        .stop-record { background: #ff4444; color: white; }
        .send-video { background: #4ade80; color: white; }
        .close-video { background: #888; color: white; }
        
        .notification {
            position: fixed;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff9a9e;
            color: #4a1a3a;
            padding: 8px 14px;
            border-radius: 25px;
            font-size: 12px;
            z-index: 1000;
            text-align: center;
            animation: bounce 0.5s ease;
        }
        @keyframes bounce {
            0% { transform: translateX(-50%) scale(0.8); opacity: 0; }
            80% { transform: translateX(-50%) scale(1.05); }
            100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        
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
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(20px);
            border-radius: 25px;
            width: 90%;
            max-width: 380px;
            max-height: 85vh;
            overflow-y: auto;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .modal-header { padding: 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.2); position: relative; }
        .modal-header h3 { color: white; font-size: 18px; }
        .close-modal { position: absolute; right: 15px; top: 12px; background: none; border: none; color: rgba(255,255,255,0.7); font-size: 22px; cursor: pointer; }
        .profile-avatar-section { text-align: center; padding: 20px; }
        .profile-avatar-emoji { font-size: 70px; background: rgba(255,255,255,0.2); width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; cursor: pointer; }
        .profile-field { padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .profile-field label { display: block; font-size: 11px; color: #ff9a9e; margin-bottom: 3px; text-transform: uppercase; }
        .profile-field input, .profile-field textarea, .profile-field select { width: 100%; padding: 10px; background: rgba(255,255,255,0.2); border: none; border-radius: 12px; color: white; font-size: 14px; }
        .avatar-picker { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.2); border-radius: 20px; }
        .avatar-option { font-size: 30px; cursor: pointer; padding: 5px; border-radius: 50%; }
        .modal-footer { padding: 15px; display: flex; gap: 10px; }
        .save-btn { flex: 1; padding: 12px; background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #4a1a3a; border: none; border-radius: 25px; cursor: pointer; font-size: 14px; font-weight: bold; }
        .upload-btn { flex: 1; padding: 12px; background: rgba(255,255,255,0.2); color: white; border: 1px solid #ff9a9e; border-radius: 25px; cursor: pointer; font-size: 14px; }
        .delete-avatar-btn { background: #ff4444; color: white; border: none; padding: 12px; border-radius: 25px; cursor: pointer; flex: 1; font-size: 14px; }
        
        @media (min-width: 768px) {
            .sidebar { position: relative; left: 0 !important; width: 280px; }
            .sidebar-overlay { display: none !important; }
            .menu-btn { display: none; }
            .message-bubble { max-width: 60%; }
            .video-circle { width: 130px; height: 130px; }
        }
        @media (max-width: 480px) {
            .message-bubble { max-width: 85%; }
            .video-circle { width: 90px; height: 90px; }
            .sticker { font-size: 35px; }
        }
    </style>
</head>
<body class="easter">
<div id="authScreen">
    <div class="auth-card">
        <h1>🐣 ATOMGRAM</h1>
        <div style="font-size: 14px; margin-bottom: 15px;">🌸 Пасхальное обновление 🌸</div>
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
            <div id="userAvatar"><div class="avatar-emoji">🐣</div></div>
            <div class="user-info">
                <h3 id="userName">Загрузка...</h3>
                <div class="username" id="userLogin">@</div>
            </div>
        </div>
        <div class="menu-item" onclick="openProfileModal()"><span>🐰</span> <span>Профиль</span></div>
        <div class="menu-item" onclick="openSettingsModal()"><span>🌸</span> <span>Настройки</span></div>
        <div class="menu-item" onclick="addFriend()"><span>🥚</span> <span>Добавить друга</span></div>
        <div class="section-title">🐣 ДРУЗЬЯ</div>
        <div class="friends-list" id="friendsList"></div>
        <div class="section-title">📢 КАНАЛЫ</div>
        <div class="channels-list" id="channelsList"></div>
        <div class="create-btn">
            <button onclick="createChannel()">+ Канал</button>
        </div>
    </div>
    <div class="chat-area">
        <div class="chat-header">
            <button class="menu-btn" onclick="toggleSidebar()">🌸</button>
            <div style="font-weight: bold; font-size: 14px;">🐣 ATOMGRAM</div>
            <div class="chat-title" id="chatTitle">Выберите чат</div>
            <div class="encryption-badge" id="encryptionBadge" style="display:none;">🔒 E2EE</div>
            <button class="settings-btn" onclick="openSettingsModal()">⚙️</button>
        </div>
        <div class="messages-area" id="messages"></div>
        <div class="typing-indicator" id="typingIndicator" style="display:none"></div>
        <div class="sticker-picker" id="stickerPicker">
            <div class="sticker" onclick="sendSticker('🐣')">🐣</div><div class="sticker" onclick="sendSticker('🐰')">🐰</div>
            <div class="sticker" onclick="sendSticker('🥚')">🥚</div><div class="sticker" onclick="sendSticker('🌸')">🌸</div>
            <div class="sticker" onclick="sendSticker('🌷')">🌷</div><div class="sticker" onclick="sendSticker('💐')">💐</div>
            <div class="sticker" onclick="sendSticker('🐇')">🐇</div><div class="sticker" onclick="sendSticker('🍫')">🍫</div>
            <div class="sticker" onclick="sendSticker('😀')">😀</div><div class="sticker" onclick="sendSticker('😂')">😂</div>
            <div class="sticker" onclick="sendSticker('😍')">😍</div><div class="sticker" onclick="sendSticker('🔥')">🔥</div>
        </div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Сообщение...">
            <button class="sticker-btn" onclick="toggleStickerPicker()">😊</button>
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
        <div class="modal-header"><h3>🐣 Профиль</h3><button class="close-modal" onclick="closeProfileModal()">✕</button></div>
        <div class="profile-avatar-section">
            <div id="profileAvatar"><div class="profile-avatar-emoji">🐣</div></div>
            <div id="avatarPicker" class="avatar-picker" style="display:none;">
                <div class="avatar-option" onclick="selectAvatar('🐣')">🐣</div><div class="avatar-option" onclick="selectAvatar('🐰')">🐰</div>
                <div class="avatar-option" onclick="selectAvatar('🥚')">🥚</div><div class="avatar-option" onclick="selectAvatar('🌸')">🌸</div>
                <div class="avatar-option" onclick="selectAvatar('🐇')">🐇</div><div class="avatar-option" onclick="selectAvatar('🌷')">🌷</div>
                <div class="avatar-option" onclick="selectAvatar('😀')">😀</div><div class="avatar-option" onclick="selectAvatar('😎')">😎</div>
            </div>
            <input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()">
        </div>
        <div class="profile-field"><label>Имя</label><input type="text" id="editName"></div>
        <div class="profile-field"><label>Фамилия</label><input type="text" id="editSurname"></div>
        <div class="profile-field"><label>О себе</label><textarea id="editBio" rows="2" placeholder="🐣 С Пасхой! 🥚"></textarea></div>
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
        <div class="modal-header"><h3>🌸 Пасхальные настройки</h3><button class="close-modal" onclick="closeSettingsModal()">✕</button></div>
        <div class="profile-field"><label>🐣 Тема</label><select id="themeSelect" onchange="applyTheme()">
            <option value="easter">Розовая Пасха</option>
            <option value="easter-light">Светлая Пасха</option>
            <option value="easter-pink">Нежно-розовая</option>
            <option value="easter-blue">Голубая Пасха</option>
            <option value="easter-green">Зелёная Пасха</option>
            <option value="easter-purple">Сиреневая Пасха</option>
        </select></div>
        <div class="profile-field"><label>🥚 Фон чата</label><select id="chatBgSelect" onchange="applyChatBg()">
            <option value="rgba(255,255,255,0.1)">Прозрачный</option>
            <option value="linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%)">Розовый градиент</option>
            <option value="linear-gradient(135deg, #c8e6c9 0%, #e8f5e9 100%)">Зелёный градиент</option>
            <option value="linear-gradient(135deg, #bbdefb 0%, #e3f2fd 100%)">Голубой градиент</option>
        </select></div>
        <div class="profile-field"><label>💬 Мои сообщения</label><input type="color" id="myMsgColor" value="#ff9a9e" onchange="applyMsgColor()"></div>
        <div class="profile-field"><label>💭 Чужие сообщения</label><input type="color" id="otherMsgColor" value="rgba(255,255,255,0.2)" onchange="applyMsgColor()"></div>
        <div class="profile-field"><label>📏 Размер шрифта</label><select id="fontSizeSelect" onchange="applyFontSize()">
            <option value="12px">Маленький</option><option value="14px" selected>Средний</option><option value="16px">Большой</option>
        </select></div>
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
let allChannels = [], allFriends = [], friendRequests = [], bannedUsers = [];
let mediaRecorder = null, audioChunks = [], isRecording = false;
let videoStream = null, videoRecorder = null, videoChunks = [];
let recordedVideoBlob = null;
let currentAudio = null;

let myPrivateKey = null;
let friendsPublicKeys = {};

async function generateClientKeys() {
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["encrypt", "decrypt"]
    );
    return keyPair;
}

async function exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
    return "-----BEGIN PUBLIC KEY-----\n" + btoa(exportedAsString).match(/.{1,64}/g).join('\n') + "\n-----END PUBLIC KEY-----";
}

async function importPublicKey(pem) {
    const binary = atob(pem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s/g, ''));
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    return await window.crypto.subtle.importKey("spki", buffer, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}

async function encryptMessageClient(message, publicKeyPem) {
    const publicKey = await importPublicKey(publicKeyPem);
    const encoded = new TextEncoder().encode(message);
    const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encoded);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)));
}

async function decryptMessageClient(encryptedBase64, privateKey) {
    const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encrypted);
    return new TextDecoder().decode(decrypted);
}

const savedUsername = localStorage.getItem('atomgram_username');
const savedPassword = localStorage.getItem('atomgram_password');

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
        if (size === 'large') return '<img src="' + avatarData + '" class="profile-avatar-img" style="width:100px; height:100px; border-radius:50%; object-fit:cover;">';
        return '<img src="' + avatarData + '" class="avatar-img">';
    } else {
        const emoji = avatarData || '🐣';
        if (size === 'large') return '<div class="profile-avatar-emoji">' + emoji + '</div>';
        return '<div class="avatar-emoji">' + emoji + '</div>';
    }
}

function createChannel() {
    const name = prompt('Название канала:');
    if (!name) return;
    socket.emit('create channel', { channelName: name }, (res) => { if (res.success) { loadData(); alert('Канал создан'); } else alert(res.error); });
}
function joinChannel(name) {
    currentChat = 'channel:' + name; currentChatType = 'channel'; currentChatTarget = name;
    socket.emit('joinChannel', name);
    document.getElementById('chatTitle').innerHTML = '📢 ' + name;
    document.getElementById('encryptionBadge').style.display = 'none';
    renderAll();
}
function startPrivateChat(user) {
    currentChat = 'user:' + user; currentChatType = 'private'; currentChatTarget = user;
    socket.emit('joinPrivate', user);
    document.getElementById('chatTitle').innerHTML = '💬 ' + user;
    document.getElementById('encryptionBadge').style.display = 'inline-block';
    renderAll();
}
function renderAll() {
    const cl = document.getElementById('channelsList');
    cl.innerHTML = allChannels.map(c => '<div class="channel-item" onclick="joinChannel(\\'' + c + '\\')">📢 ' + c + '</div>').join('');
    let fl = '';
    friendRequests.forEach(req => { fl += '<div class="friend-item friend-request"><span>🐣 ' + req + '</span><div class="friend-actions"><button class="accept-btn" onclick="acceptFriend(\\'' + req + '\\')">✅</button><button class="reject-btn" onclick="rejectFriend(\\'' + req + '\\')">❌</button></div></div>'; });
    allFriends.forEach(f => { fl += '<div class="friend-item" onclick="startPrivateChat(\\'' + f + '\\')"><span>🐰 ' + f + '</span><button class="ban-btn" onclick="event.stopPropagation(); banUser(\\'' + f + '\\')">🚫</button></div>'; });
    bannedUsers.forEach(b => { fl += '<div class="friend-item" style="opacity:0.7;"><span>🥚 ' + b + ' (забанен)</span><button class="accept-btn" onclick="unbanUser(\\'' + b + '\\')">🔓</button></div>'; });
    document.getElementById('friendsList').innerHTML = fl || '<div style="padding:10px; text-align:center;">🌸 Нет друзей</div>';
}
function addFriend() {
    const u = prompt('Введите username друга:');
    if (!u) return;
    socket.emit('add friend', { friendUsername: u }, (res) => { alert(res.message || res.error); });
}
function acceptFriend(from) { socket.emit('accept friend', { fromUser: from }); }
function rejectFriend(from) { socket.emit('reject friend', { fromUser: from }); }
function banUser(u) { if (confirm('Забанить ' + u + '?')) socket.emit('ban user', { userToBan: u }); }
function unbanUser(u) { socket.emit('unban user', { userToUnban: u }); }
async function sendMessage() {
    const input = document.getElementById('messageInput');
    let text = input.value.trim();
    if (!text || !currentChat) return;
    
    let encryptedText = text;
    let isEncrypted = false;
    
    if (currentChatType === 'private') {
        const friendPublicKey = friendsPublicKeys[currentChatTarget];
        if (friendPublicKey) {
            encryptedText = await encryptMessageClient(text, friendPublicKey);
            isEncrypted = true;
        }
    }
    
    socket.emit('chat message', { type: currentChatType, target: currentChatTarget, text: encryptedText, encrypted: isEncrypted });
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
    if (currentAudio && !currentAudio.paused) { currentAudio.pause(); btn.innerHTML = '▶️'; }
    currentAudio = new Audio(btn.getAttribute('data-audio'));
    currentAudio.play();
    btn.innerHTML = '⏸️';
    currentAudio.onended = () => { btn.innerHTML = '▶️'; };
}

function openProfileModal() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editSurname').value = currentUserData?.surname || '';
    document.getElementById('editBio').value = currentUserData?.bio || '🐣 С Пасхой! 🥚';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileAvatar').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType, 'large');
    document.getElementById('profileModal').style.display = 'flex';
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; document.getElementById('avatarPicker').style.display = 'none'; }
function toggleAvatarPicker() { const p = document.getElementById('avatarPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
let selectedAvatar = '🐣';
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
    const themes = ['easter', 'easter-light', 'easter-pink', 'easter-blue', 'easter-green', 'easter-purple'];
    document.body.classList.remove(...themes);
    document.body.classList.add(theme);
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
    alert('🌸 Пасхальные настройки сохранены!');
}
function openSettingsModal() {
    document.getElementById('themeSelect').value = document.body.classList.contains('easter-light') ? 'easter-light' : 
        document.body.classList.contains('easter-pink') ? 'easter-pink' :
        document.body.classList.contains('easter-blue') ? 'easter-blue' :
        document.body.classList.contains('easter-green') ? 'easter-green' :
        document.body.classList.contains('easter-purple') ? 'easter-purple' : 'easter';
    document.getElementById('chatBgSelect').value = localStorage.getItem('atomgram_chatBg') || 'rgba(255,255,255,0.1)';
    document.getElementById('myMsgColor').value = localStorage.getItem('atomgram_myMsgColor') || '#ff9a9e';
    document.getElementById('otherMsgColor').value = localStorage.getItem('atomgram_otherMsgColor') || 'rgba(255,255,255,0.2)';
    document.getElementById('fontSizeSelect').value = localStorage.getItem('atomgram_fontSize') || '14px';
    document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettingsModal() { document.getElementById('settingsModal').style.display = 'none'; }
function applySavedSettings() {
    const bg = localStorage.getItem('atomgram_chatBg');
    if (bg) { document.querySelector('.messages-area').style.background = bg; document.querySelector('.messages-area').style.backgroundSize = 'cover'; }
    const myColor = localStorage.getItem('atomgram_myMsgColor');
    const otherColor = localStorage.getItem('atomgram_otherMsgColor');
    if (myColor || otherColor) {
        let style = document.getElementById('msgColorStyle');
        if (!style) { style = document.createElement('style'); style.id = 'msgColorStyle'; document.head.appendChild(style); }
        style.innerHTML = `.message.my-message .message-content { background: ${myColor || '#ff9a9e'} !important; }
            .message:not(.my-message) .message-content { background: ${otherColor || 'rgba(255,255,255,0.2)'} !important; }`;
    }
    const fontSize = localStorage.getItem('atomgram_fontSize');
    if (fontSize) {
        let style = document.getElementById('fontSizeStyle');
        if (!style) { style = document.createElement('style'); style.id = 'fontSizeStyle'; document.head.appendChild(style); }
        style.innerHTML = `.message-text { font-size: ${fontSize} !important; }`;
    }
}

function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('login', { username: u, password: p }, async (res) => {
        if (res.success) {
            currentUser = u;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_username', u);
            localStorage.setItem('atomgram_password', p);
            
            const keyPair = await generateClientKeys();
            const publicKeyPem = await exportPublicKey(keyPair.publicKey);
            myPrivateKey = keyPair.privateKey;
            socket.emit('save public key', { publicKey: publicKeyPem });
            
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI(); loadData();
            applySavedSettings();
            socket.emit('getPublicKeys', (keys) => { friendsPublicKeys = keys; });
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
    socket.emit('getFriends', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; bannedUsers = d.banned || []; renderAll(); });
    socket.emit('getChannels', (c) => { allChannels = c; renderAll(); });
}
socket.on('friends update', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; bannedUsers = d.banned || []; renderAll(); });
socket.on('channels update', (c) => { allChannels = c; renderAll(); });
socket.on('public keys update', (keys) => { friendsPublicKeys = keys; });
socket.on('chat history', async (data) => {
    if ((currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget) ||
        (currentChatType === 'channel' && data.type === 'channel' && data.channel === currentChatTarget)) {
        document.getElementById('messages').innerHTML = '';
        for (const m of data.messages) {
            await addMessage(m);
        }
    }
});
socket.on('chat message', async (msg) => {
    let show = false;
    if (msg.type === 'private' && currentChatType === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) show = true;
    if (msg.type === 'channel' && currentChatType === 'channel' && msg.channel === currentChatTarget) show = true;
    if (show) { await addMessage(msg); document.getElementById('messages').scrollTop = 9999; }
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
async function addMessage(m) {
    const div = document.createElement('div');
    div.className = 'message';
    if (m.from === currentUser) div.classList.add('my-message');
    
    let messageText = m.text;
    let encryptedBadge = '';
    
    if (m.encrypted && m.from !== currentUser && currentChatType === 'private') {
        try {
            if (myPrivateKey) {
                messageText = await decryptMessageClient(m.text, myPrivateKey);
                encryptedBadge = '<span class="encrypted-badge">🔓</span>';
            } else {
                messageText = '🔒 Зашифрованное сообщение';
                encryptedBadge = '<span class="encrypted-badge">🔒</span>';
            }
        } catch(e) {
            messageText = '🔒 Зашифрованное сообщение';
            encryptedBadge = '<span class="encrypted-badge">🔒</span>';
        }
    } else if (m.encrypted && m.from === currentUser) {
        encryptedBadge = '<span class="encrypted-badge">🔒</span>';
    }
    
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + m.from + '\')">🐣</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\'' + m.from + '\')">' + escape(m.from) + '</div>' +
        '<div class="message-text">' + escape(messageText) + encryptedBadge + '</div><div class="message-time">' + (m.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVoiceMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + d.from + '\')">🐣</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\'' + d.from + '\')">' + escape(d.from) + '</div>' +
        '<div class="voice-message"><button onclick="playAudio(this)" data-audio="' + d.audio + '">▶️</button><span>Голосовое</span></div>' +
        '<div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVideoMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + d.from + '\')">🐣</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\'' + d.from + '\')">' + escape(d.from) + '</div>' +
        '<video class="video-circle" controls autoplay loop src="' + d.video + '"></video>' +
        '<div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addFileMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    const icon = d.fileType?.startsWith('image/') ? '🖼️' : '📄';
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + d.from + '\')">🐣</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\'' + d.from + '\')">' + escape(d.from) + '</div>' +
        '<div class="file-attachment"><span>' + icon + '</span><a href="' + d.fileData + '" download="' + d.fileName + '">' + d.fileName + '</a></div>' +
        '<div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function viewUserProfile(username) {
    socket.emit('getUserProfile', username, (profile) => {
        if (profile) {
            alert('🐣 ' + (profile.name || username) + '\n🌸 ' + (profile.bio || 'С Пасхой! 🥚'));
        }
    });
}
function escape(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
</script>
</body>
</html>`);
});

// ========== СОКЕТЫ ==========
const usersOnline = new Map();
const userPublicKeys = {};

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('register', (data, cb) => {
        const { username, name, surname, password } = data;
        if (users[username]) cb({ success: false, error: 'Username занят' });
        else {
            users[username] = { username, password, name: name || '', surname: surname || '', bio: '🐣 С Пасхой! 🥚', avatar: '🐣', avatarType: 'emoji', avatarData: null, friends: [], friendRequests: [], banned: [] };
            saveData();
            cb({ success: true });
            sendProfileList();
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
            socket.emit('public keys update', userPublicKeys);
            sendProfileList();
        }
    });

    socket.on('save public key', (data) => {
        const { publicKey } = data;
        if (currentUser && publicKey) {
            userPublicKeys[currentUser] = publicKey;
            if (users[currentUser]) users[currentUser].publicKey = publicKey;
            saveData();
            io.emit('public keys update', userPublicKeys);
        }
    });

    socket.on('getPublicKeys', (cb) => { cb(userPublicKeys); });

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
            cb({ success: true, userData: users[login] });
            io.emit('profile updated', users[login]);
            sendProfileList();
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
            users[login].avatar = '🐣';
            saveData();
            cb({ success: true, userData: users[login] });
            io.emit('profile updated', users[login]);
            sendProfileList();
        } else cb({ success: false });
    });

    socket.on('add friend', (data, cb) => {
        const { friendUsername } = data;
        if (!users[friendUsername]) cb({ success: false, error: 'Пользователь не найден' });
        else if (friendUsername === currentUser) cb({ success: false, error: 'Нельзя добавить себя' });
        else if (users[currentUser].friends?.includes(friendUsername)) cb({ success: false, error: 'Уже в друзьях' });
        else {
            if (!users[friendUsername].friendRequests) users[friendUsername].friendRequests = [];
            if (users[friendUsername].friendRequests.includes(currentUser)) cb({ success: false, error: 'Запрос уже отправлен' });
            else {
                users[friendUsername].friendRequests.push(currentUser);
                saveData();
                cb({ success: true, message: '🥚 Запрос в друзья отправлен! 🐣' });
                const fs = getSocketByUsername(friendUsername);
                if (fs) {
                    fs.emit('friends update', { friends: users[friendUsername].friends || [], requests: users[friendUsername].friendRequests || [], banned: users[friendUsername].banned || [] });
                    fs.emit('public keys update', userPublicKeys);
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
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
            socket.emit('public keys update', userPublicKeys);
            const fs = getSocketByUsername(fromUser);
            if (fs) {
                fs.emit('friends update', { friends: users[fromUser].friends, requests: users[fromUser].friendRequests, banned: users[fromUser].banned || [] });
                fs.emit('public keys update', userPublicKeys);
            }
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

    socket.on('create channel', (data, cb) => {
        const { channelName } = data;
        if (channels[channelName]) cb({ success: false, error: 'Канал уже существует' });
        else { channels[channelName] = { name: channelName, messages: [] }; saveData(); cb({ success: true, message: '🌸 Канал создан! 🐣' }); io.emit('channels update', Object.keys(channels)); }
    });
    socket.on('joinChannel', (name) => { if (channels[name]) socket.emit('chat history', { type: 'channel', channel: name, messages: channels[name].messages || [] }); });
    socket.on('channel message', (data) => { const { channel, text } = data; if (channels[channel]) { const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), type: 'channel', channel }; channels[channel].messages.push(msg); io.emit('chat message', msg); saveData(); } });
    socket.on('getChannels', (cb) => cb(Object.keys(channels)));

    socket.on('update profile', (data, cb) => {
        if (users[data.login]) {
            if (data.name !== undefined) users[data.login].name = data.name;
            if (data.surname !== undefined) users[data.login].surname = data.surname;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.avatar !== undefined) { users[data.login].avatar = data.avatar; users[data.login].avatarType = 'emoji'; users[data.login].avatarData = null; }
            if (data.password) users[data.login].password = data.password;
            saveData();
            cb({ success: true, userData: users[data.login] });
            io.emit('profile updated', users[data.login]);
            sendProfileList();
        } else cb({ success: false });
    });

    socket.on('joinPrivate', (target) => { const id = [currentUser, target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; socket.emit('chat history', { type: 'private', with: target, messages: privateChats[id].messages || [] }); });
    socket.on('chat message', (data) => {
        const { type, target, text, encrypted } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), type, encrypted: encrypted || false };
        if (type === 'private') { msg.to = target; const id = [currentUser, target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; privateChats[id].messages.push(msg); io.emit('chat message', msg); saveData(); }
        else if (type === 'channel') { msg.channel = target; if (channels[target]) { channels[target].messages.push(msg); io.emit('chat message', msg); saveData(); } }
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
    function sendProfileList() { io.emit('users list with profiles', Object.keys(users).map(l => users[l])); }
    socket.on('disconnect', () => { if (currentUser) usersOnline.delete(socket.id); });
});

const PORT = process.env.PORT || 3000;
const ip = getLocalIP();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║   🐣 ATOMGRAM - ПАСХАЛЬНОЕ ОБНОВЛЕНИЕ   ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║  💻 http://localhost:${PORT}                  ║`);
    console.log(`║  📱 http://${ip}:${PORT}                 ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║  🥚 End-to-End шифрование!              ║`);
    console.log(`║  🐣 6 пасхальных тем                   ║`);
    console.log(`║  🌸 Пасхальные стикеры                  ║`);
    console.log(`║  🐰 Пасхальные аватарки                 ║`);
    console.log(`║  🎥 Видеокружки, голосовые, файлы       ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);
});
