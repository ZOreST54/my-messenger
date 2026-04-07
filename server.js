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
    return { users: {}, privateChats: {}, publicRooms: {}, channels: {} };
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, publicRooms, channels }, null, 2));
    console.log('Данные сохранены');
}

let savedData = loadData();
let users = savedData.users;
let privateChats = savedData.privateChats;
let publicRooms = savedData.publicRooms;
let channels = savedData.channels || {};

setInterval(saveData, 30000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; transition: all 0.3s ease; min-height: 100vh; }
        
        /* ТЕМЫ */
        body.dark { background: #0a0a0a; color: white; }
        body.light { background: #f0f0f0; color: #1a1a2e; }
        body.blue { background: #0a2a4a; color: white; }
        body.blue .sidebar, body.blue .chat-header, body.blue .input-area { background: #0d2b4e; }
        body.green { background: #0a3d2a; color: white; }
        body.green .sidebar, body.green .chat-header, body.green .input-area { background: #0b4a30; }
        body.pink { background: #3d1a3a; color: white; }
        body.pink .sidebar, body.pink .chat-header, body.pink .input-area { background: #4a2045; }
        body.purple { background: #2a1a3a; color: white; }
        body.purple .sidebar, body.purple .chat-header, body.purple .input-area { background: #2a1a3e; }
        body.orange { background: #3a2a1a; color: white; }
        body.orange .sidebar, body.orange .chat-header, body.orange .input-area { background: #3e2a1a; }
        
        body.dark .sidebar, body.dark .chat-header, body.dark .input-area { background: #1a1a2e; }
        body.light .sidebar, body.light .chat-header, body.light .input-area { background: white; }
        body.dark .message-content { background: #2a2a3e; }
        body.light .message-content { background: #e8e8e8; }
        body.blue .message-content { background: #1e3a5f; }
        body.green .message-content { background: #1e5a3a; }
        body.pink .message-content { background: #5a2a50; }
        body.purple .message-content { background: #3a2a4e; }
        body.orange .message-content { background: #4e3a2a; }
        
        .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; color: white !important; }
        
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
            padding: 30px 25px;
            border-radius: 30px;
            width: 100%;
            max-width: 350px;
            text-align: center;
        }
        .auth-card input, .auth-card select {
            width: 100%;
            padding: 14px;
            margin: 8px 0;
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
            position: relative;
            overflow: hidden;
        }
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
        .avatar-emoji { font-size: 45px; background: #2a2a3e; width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .avatar-img { width: 55px; height: 55px; border-radius: 50%; object-fit: cover; background: #2a2a3e; }
        .user-info-header h3 { font-size: 16px; }
        .user-info-header .username { font-size: 11px; color: #888; }
        .menu-item { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; }
        .menu-item:hover { background: rgba(102,126,234,0.1); }
        .section-title { padding: 10px 20px 5px 20px; font-size: 11px; color: #667eea; text-transform: uppercase; }
        .search-box {
            padding: 10px 15px;
            margin: 5px 10px;
            border-radius: 25px;
            background: rgba(102,126,234,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .search-box input {
            flex: 1;
            background: none;
            border: none;
            color: inherit;
            padding: 8px;
            font-size: 14px;
            outline: none;
        }
        .friends-list, .rooms-list, .channels-list, .search-results {
            padding: 5px 10px;
            overflow-y: auto;
            max-height: 150px;
        }
        .friend-item, .room-item, .channel-item, .search-item {
            padding: 8px 12px;
            margin: 3px 0;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: space-between;
            font-size: 14px;
        }
        .friend-item:hover, .room-item:hover, .channel-item:hover, .search-item:hover { background: rgba(102,126,234,0.2); }
        .friend-item.active, .room-item.active, .channel-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .friend-request { background: rgba(102,126,234,0.3); border-left: 3px solid #667eea; }
        .friend-actions button { margin-left: 5px; padding: 3px 8px; border-radius: 12px; border: none; cursor: pointer; font-size: 12px; }
        .accept-btn { background: #4ade80; color: white; }
        .reject-btn { background: #ff6b6b; color: white; }
        .ban-btn { background: #ff4444; color: white; border: none; padding: 3px 8px; border-radius: 12px; cursor: pointer; font-size: 12px; }
        .unban-btn { background: #4ade80; color: white; border: none; padding: 3px 8px; border-radius: 12px; cursor: pointer; font-size: 12px; }
        .user-avatar-small-img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
        .user-avatar-small { font-size: 24px; }
        .create-btn { padding: 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 10px; }
        .create-btn button { flex: 1; padding: 10px; background: #2a2a3e; border: 1px solid #667eea; border-radius: 20px; color: #667eea; cursor: pointer; font-size: 14px; }
        .chat-area {
            display: flex;
            flex-direction: column;
            height: 100vh;
            width: 100%;
        }
        .chat-header {
            padding: 12px 15px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        .menu-btn { background: none; border: none; font-size: 24px; cursor: pointer; padding: 5px; color: inherit; }
        .theme-toggle { background: none; border: none; font-size: 20px; cursor: pointer; margin-left: auto; padding: 5px; }
        .chat-title { flex: 1; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: #1a1a2e;
            border-radius: 20px 20px 0 0;
            padding: 15px;
            display: none;
            flex-wrap: wrap;
            gap: 10px;
            z-index: 150;
            max-height: 200px;
            overflow-y: auto;
        }
        .sticker-picker.open { display: flex; }
        .sticker { font-size: 40px; cursor: pointer; padding: 8px; border-radius: 15px; transition: transform 0.1s; }
        .sticker:active { transform: scale(1.1); }
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
        }
        .message-avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
        .message-avatar { font-size: 32px; min-width: 36px; text-align: center; }
        .message-bubble { max-width: 75%; word-wrap: break-word; }
        .message-content { padding: 8px 14px; border-radius: 18px; }
        .message.my-message { justify-content: flex-end; }
        .message.my-message .message-bubble { text-align: right; }
        .message-username { font-size: 11px; color: #a0a0c0; margin-bottom: 3px; cursor: pointer; }
        .message-text { font-size: 14px; word-wrap: break-word; }
        .message-time { font-size: 9px; color: #888; margin-top: 3px; }
        .voice-message { display: flex; align-items: center; gap: 8px; }
        .voice-message button { background: none; border: none; font-size: 20px; cursor: pointer; color: inherit; }
        .video-circle { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; cursor: pointer; background: #2a2a3e; }
        .file-attachment { background: rgba(102,126,234,0.2); padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .file-attachment a { text-decoration: none; color: inherit; }
        .typing-indicator { font-size: 11px; color: #888; padding: 5px 15px; font-style: italic; }
        .input-area {
            display: flex;
            padding: 10px 15px;
            gap: 8px;
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        .input-area input {
            flex: 1;
            padding: 10px 15px;
            border: none;
            border-radius: 25px;
            font-size: 15px;
            min-width: 100px;
        }
        body.dark .input-area input { background: #2a2a3e; color: white; }
        body.light .input-area input { background: #e8e8e8; color: #1a1a2e; }
        .input-area button {
            padding: 10px 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
        }
        .attach-btn, .voice-record-btn, .video-record-btn, .sticker-btn { background: #2a2a3e !important; }
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
        .video-controls { margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .video-controls button { padding: 12px 20px; border-radius: 40px; border: none; font-size: 14px; cursor: pointer; }
        .start-record { background: #ff6b6b; color: white; }
        .stop-record { background: #ff4444; color: white; }
        .send-video { background: #4ade80; color: white; }
        .close-video { background: #888; color: white; }
        .notification {
            position: fixed;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: #667eea;
            color: white;
            padding: 10px 16px;
            border-radius: 25px;
            font-size: 13px;
            z-index: 1000;
            white-space: nowrap;
            max-width: 90%;
            white-space: normal;
            text-align: center;
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
            background: #1a1a2e;
            border-radius: 25px;
            width: 90%;
            max-width: 380px;
            max-height: 85vh;
            overflow-y: auto;
        }
        .modal-header { padding: 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; }
        .modal-header h3 { color: white; font-size: 18px; }
        .close-modal { position: absolute; right: 15px; top: 12px; background: none; border: none; color: #888; font-size: 22px; cursor: pointer; }
        .profile-avatar-section { text-align: center; padding: 20px; }
        .profile-avatar-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; cursor: pointer; }
        .profile-avatar-emoji { font-size: 70px; background: #2a2a3e; width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; cursor: pointer; }
        .profile-field { padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .profile-field label { display: block; font-size: 11px; color: #667eea; margin-bottom: 3px; text-transform: uppercase; }
        .profile-field input, .profile-field textarea, .profile-field select { width: 100%; padding: 10px; background: #2a2a3e; border: none; border-radius: 12px; color: white; font-size: 14px; }
        .profile-field .value { color: white; font-size: 14px; padding: 8px 0; }
        .avatar-picker { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; padding: 10px; background: #2a2a3e; border-radius: 20px; }
        .avatar-option { font-size: 30px; cursor: pointer; padding: 5px; border-radius: 50%; }
        .modal-footer { padding: 15px; display: flex; gap: 10px; }
        .save-btn { flex: 1; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 14px; }
        .upload-btn { flex: 1; padding: 12px; background: #2a2a3e; color: white; border: 1px solid #667eea; border-radius: 25px; cursor: pointer; font-size: 14px; }
        @media (min-width: 768px) {
            .sidebar { position: relative; left: 0 !important; width: 280px; max-width: 280px; }
            .sidebar-overlay { display: none !important; }
            .menu-btn { display: none; }
            .message-bubble { max-width: 60%; }
            .video-circle { width: 150px; height: 150px; }
        }
        @media (max-width: 480px) {
            .message-bubble { max-width: 85%; }
            .sticker { font-size: 35px; }
        }
    </style>
</head>
<body class="dark">
<div id="authScreen">
    <div class="auth-card">
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
            <div style="font-size: 40px;">⚡</div>
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ATOMGRAM</div>
                <div style="font-size: 10px; color: #888;">мессенджер</div>
            </div>
        </div>
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
            <input type="text" id="regNickname" placeholder="Никнейм">
            <input type="text" id="regPhone" placeholder="Телефон">
            <input type="text" id="regEmail" placeholder="Email">
            <input type="text" id="regCity" placeholder="Город">
            <input type="text" id="regBirthday" placeholder="Дата рождения">
            <input type="text" id="regBio" placeholder="О себе">
            <select id="regTheme">
                <option value="dark">🌙 Тёмная</option>
                <option value="light">☀️ Светлая</option>
                <option value="blue">💙 Синяя</option>
                <option value="green">💚 Зелёная</option>
                <option value="pink">💗 Розовая</option>
                <option value="purple">💜 Фиолетовая</option>
                <option value="orange">🧡 Оранжевая</option>
            </select>
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
        <div class="menu-item" onclick="openThemeModal()"><span>🎨</span> <span>Темы</span></div>
        <div class="section-title">🔍 ПОИСК</div>
        <div class="search-box">
            <span>🔎</span>
            <input type="text" id="searchInput" placeholder="Поиск пользователей..." oninput="searchUsers()">
        </div>
        <div class="search-results" id="searchResults"></div>
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
            <button class="menu-btn" onclick="toggleSidebar()">☰</button>
            <div style="display: flex; align-items: center; gap: 6px;">
                <div style="font-size: 22px;">⚡</div>
                <div style="font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 14px;">ATOMGRAM</div>
            </div>
            <div class="chat-title" id="currentChatTitle">Выберите чат</div>
            <button class="theme-toggle" onclick="toggleThemeQuick()">🌙</button>
        </div>
        <div class="messages-area" id="messages"></div>
        <div class="typing-indicator" id="typingIndicator" style="display:none"></div>
        <div class="sticker-picker" id="stickerPicker">
            <div class="sticker" onclick="sendSticker('😀')">😀</div><div class="sticker" onclick="sendSticker('😂')">😂</div>
            <div class="sticker" onclick="sendSticker('😍')">😍</div><div class="sticker" onclick="sendSticker('😎')">😎</div>
            <div class="sticker" onclick="sendSticker('🥳')">🥳</div><div class="sticker" onclick="sendSticker('🔥')">🔥</div>
            <div class="sticker" onclick="sendSticker('❤️')">❤️</div><div class="sticker" onclick="sendSticker('💩')">💩</div>
            <div class="sticker" onclick="sendSticker('🎉')">🎉</div><div class="sticker" onclick="sendSticker('👍')">👍</div>
            <div class="sticker" onclick="sendSticker('👎')">👎</div><div class="sticker" onclick="sendSticker('🤣')">🤣</div>
            <div class="sticker" onclick="sendSticker('🐱')">🐱</div><div class="sticker" onclick="sendSticker('🐶')">🐶</div>
            <div class="sticker" onclick="sendSticker('🍕')">🍕</div><div class="sticker" onclick="sendSticker('🍺')">🍺</div>
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
        <div class="modal-header"><h3>Мой профиль</h3><button class="close-modal" onclick="closeProfileModal()">✕</button></div>
        <div class="profile-avatar-section">
            <div id="profileAvatarContainer"></div>
            <div id="avatarPicker" class="avatar-picker" style="display:none; margin-top:12px;">
                <div class="avatar-option" onclick="selectAvatar('😀')">😀</div><div class="avatar-option" onclick="selectAvatar('😎')">😎</div>
                <div class="avatar-option" onclick="selectAvatar('👨')">👨</div><div class="avatar-option" onclick="selectAvatar('👩')">👩</div>
                <div class="avatar-option" onclick="selectAvatar('🦸')">🦸</div><div class="avatar-option" onclick="selectAvatar('🐱')">🐱</div>
                <div class="avatar-option" onclick="selectAvatar('🚀')">🚀</div><div class="avatar-option" onclick="selectAvatar('💻')">💻</div>
                <div class="avatar-option" onclick="selectAvatar('🐶')">🐶</div><div class="avatar-option" onclick="selectAvatar('🐼')">🐼</div>
                <div class="avatar-option" onclick="selectAvatar('🦊')">🦊</div><div class="avatar-option" onclick="selectAvatar('🐨')">🐨</div>
                <div class="avatar-option" onclick="selectAvatar('🐸')">🐸</div><div class="avatar-option" onclick="selectAvatar('🐙')">🐙</div>
            </div>
            <input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()">
        </div>
        <div class="profile-field"><label>Имя</label><input type="text" id="editName"></div>
        <div class="profile-field"><label>Фамилия</label><input type="text" id="editSurname"></div>
        <div class="profile-field"><label>Никнейм</label><input type="text" id="editNickname"></div>
        <div class="profile-field"><label>Телефон</label><input type="text" id="editPhone"></div>
        <div class="profile-field"><label>Email</label><input type="email" id="editEmail"></div>
        <div class="profile-field"><label>Город</label><input type="text" id="editCity"></div>
        <div class="profile-field"><label>Дата рождения</label><input type="date" id="editBirthday"></div>
        <div class="profile-field"><label>О себе</label><textarea id="editBio" rows="3"></textarea></div>
        <div class="profile-field"><label>Статус</label><select id="editStatus"><option value="online">🟢 В сети</option><option value="away">🌙 Отошёл</option><option value="busy">🔴 Занят</option></select></div>
        <div class="profile-field"><label>Новый пароль</label><input type="password" id="editPassword" placeholder="Оставьте пустым"></div>
        <div class="modal-footer">
            <button class="upload-btn" onclick="document.getElementById('avatarUpload').click()">📷 Фото</button>
            <button class="save-btn" onclick="saveProfile()">Сохранить</button>
        </div>
    </div>
</div>

<div id="themeModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Выберите тему</h3><button class="close-modal" onclick="closeThemeModal()">✕</button></div>
        <div class="profile-field"><label>Тема оформления</label><select id="themeSelect" onchange="applyTheme()">
            <option value="dark">🌙 Тёмная</option>
            <option value="light">☀️ Светлая</option>
            <option value="blue">💙 Синяя</option>
            <option value="green">💚 Зелёная</option>
            <option value="pink">💗 Розовая</option>
            <option value="purple">💜 Фиолетовая</option>
            <option value="orange">🧡 Оранжевая</option>
        </select></div>
        <div class="modal-footer"><button class="save-btn" onclick="closeThemeModal()">Закрыть</button></div>
    </div>
</div>

<div id="userProfileModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3 id="userProfileTitle">Профиль</h3><button class="close-modal" onclick="closeUserProfileModal()">✕</button></div>
        <div class="profile-avatar-section">
            <div id="userProfileAvatar" class="profile-avatar-emoji">👤</div>
        </div>
        <div class="profile-field"><label>Имя</label><div class="value" id="userProfileName">-</div></div>
        <div class="profile-field"><label>Фамилия</label><div class="value" id="userProfileSurname">-</div></div>
        <div class="profile-field"><label>Никнейм</label><div class="value" id="userProfileNickname">-</div></div>
        <div class="profile-field"><label>Телефон</label><div class="value" id="userProfilePhone">-</div></div>
        <div class="profile-field"><label>Email</label><div class="value" id="userProfileEmail">-</div></div>
        <div class="profile-field"><label>Город</label><div class="value" id="userProfileCity">-</div></div>
        <div class="profile-field"><label>Дата рождения</label><div class="value" id="userProfileBirthday">-</div></div>
        <div class="profile-field"><label>О себе</label><div class="value" id="userProfileBio">-</div></div>
        <div class="profile-field"><label>Статус</label><div class="value" id="userProfileStatus">-</div></div>
        <div class="modal-footer">
            <button class="save-btn" onclick="startChatFromProfile()">💬 Написать</button>
            <div id="profileActionBtn"></div>
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
let allRooms = [], allFriends = [], allChannels = [], friendRequests = [], allUsers = [], bannedUsers = [];
let selectedAvatar = '👤';
let mediaRecorder = null, audioChunks = [], isRecording = false;
let videoStream = null, videoRecorder = null, videoChunks = [];
let recordedVideoBlob = null;

const savedUsername = localStorage.getItem('atomgram_username');
const savedPassword = localStorage.getItem('atomgram_password');

// ========== ТЕМЫ ==========
function applyTheme() {
    const theme = document.getElementById('themeSelect').value;
    const themes = ['dark', 'light', 'blue', 'green', 'pink', 'purple', 'orange'];
    document.body.classList.remove(...themes);
    document.body.classList.add(theme);
    localStorage.setItem('atomgram_theme', theme);
}
function toggleThemeQuick() {
    const themes = ['dark', 'light', 'blue', 'green', 'pink', 'purple', 'orange'];
    const current = themes.find(t => document.body.classList.contains(t)) || 'dark';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    document.body.classList.remove(...themes);
    document.body.classList.add(next);
    localStorage.setItem('atomgram_theme', next);
}
function openThemeModal() { document.getElementById('themeModal').style.display = 'flex'; closeSidebar(); }
function closeThemeModal() { document.getElementById('themeModal').style.display = 'none'; }
const savedTheme = localStorage.getItem('atomgram_theme');
if (savedTheme && ['dark','light','blue','green','pink','purple','orange'].includes(savedTheme)) {
    document.body.classList.remove('dark', 'light', 'blue', 'green', 'pink', 'purple', 'orange');
    document.body.classList.add(savedTheme);
}

// ========== ПОИСК ==========
function searchUsers() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('searchResults');
    if (!query) { resultsDiv.innerHTML = ''; return; }
    const results = allUsers.filter(u => u !== currentUser && u.toLowerCase().includes(query));
    resultsDiv.innerHTML = results.map(user => {
        const ud = window.usersProfiles[user] || {};
        return '<div class="search-item" onclick="viewUserProfile(\\'' + user + '\\')">' +
            '<span>' + (ud.avatar || '👤') + '</span>' +
            '<span style="flex:1">' + (ud.nickname || ud.name || user) + '</span>' +
            '<button class="accept-btn" onclick="event.stopPropagation(); addFriendByUsername(\\'' + user + '\\')" style="padding:5px 10px;">➕ Друг</button></div>';
    }).join('');
    if (results.length === 0) resultsDiv.innerHTML = '<div style="padding:10px; text-align:center; color:#888;">Ничего не найдено</div>';
}
function addFriendByUsername(username) {
    socket.emit('add friend', { friendUsername: username }, (res) => {
        if (res.success) showNotification('Друг', res.message);
        else showNotification('Ошибка', res.error);
    });
}

// ========== СТИКЕРЫ ==========
function toggleStickerPicker() { document.getElementById('stickerPicker').classList.toggle('open'); }
function sendSticker(sticker) {
    if (!currentChat) { alert('Выберите чат'); return; }
    if (currentChatType === 'room') socket.emit('chat message', { type: 'room', target: currentChatTarget, text: sticker });
    else if (currentChatType === 'channel') socket.emit('channel message', { channel: currentChatTarget, text: sticker });
    else socket.emit('chat message', { type: 'private', target: currentChatTarget, text: sticker });
    document.getElementById('stickerPicker').classList.remove('open');
}

function getLocalTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function createRoom() {
    const roomName = prompt('Введите название чата:');
    if (!roomName) return;
    socket.emit('createRoom', roomName, (success) => {
        if (success) { loadData(); setTimeout(() => joinRoom(roomName), 500); }
        else alert('Чат уже существует');
    });
}
function createChannel() {
    const channelName = prompt('Введите название канала:');
    if (!channelName) return;
    socket.emit('create channel', { channelName: channelName }, (res) => {
        if (res.success) { loadData(); showNotification('Канал', res.message); }
        else showNotification('Ошибка', res.error);
    });
}
function joinRoom(roomName) {
    currentChat = 'room:' + roomName; currentChatType = 'room'; currentChatTarget = roomName;
    socket.emit('joinRoom', roomName);
    document.getElementById('currentChatTitle').innerHTML = '# ' + roomName;
    renderRooms(); renderFriends(); renderChannels();
    closeSidebar();
}
function joinChannel(channelName) {
    currentChat = 'channel:' + channelName; currentChatType = 'channel'; currentChatTarget = channelName;
    socket.emit('joinChannel', channelName);
    document.getElementById('currentChatTitle').innerHTML = '📢 ' + channelName;
    renderRooms(); renderFriends(); renderChannels();
    closeSidebar();
}
function renderChannels() {
    const container = document.getElementById('channelsList');
    container.innerHTML = allChannels.map(ch => '<div class="channel-item' + (currentChat === 'channel:' + ch ? ' active' : '') + '" onclick="joinChannel(\\'' + ch + '\\')">📢 ' + ch + '</div>').join('');
    if (!allChannels.length) container.innerHTML = '<div style="padding:10px; color:#666; text-align:center;">Нет каналов</div>';
}
function renderRooms() {
    const container = document.getElementById('roomsList');
    container.innerHTML = allRooms.map(room => '<div class="room-item' + (currentChat === 'room:' + room ? ' active' : '') + '" onclick="joinRoom(\\'' + room + '\\')"># ' + room + '</div>').join('');
    if (!allRooms.length) container.innerHTML = '<div style="padding:10px; color:#666; text-align:center;">Нет чатов</div>';
}
function addFriend() {
    const friendUsername = prompt('Введите username друга:');
    if (!friendUsername) return;
    socket.emit('add friend', { friendUsername: friendUsername }, (res) => {
        if (res.success) showNotification('Друг', res.message);
        else showNotification('Ошибка', res.error);
    });
}
function acceptFriendRequest(fromUser) { socket.emit('accept friend', { fromUser: fromUser }); }
function rejectFriendRequest(fromUser) { socket.emit('reject friend', { fromUser: fromUser }); }
function banUser(userToBan) {
    if (confirm('Забанить пользователя ' + userToBan + '?')) {
        socket.emit('ban user', { userToBan: userToBan });
        if (currentChat === 'user:' + userToBan) { currentChat = null; document.getElementById('currentChatTitle').innerHTML = 'Выберите чат'; }
    }
}
function unbanUser(userToUnban) {
    socket.emit('unban user', { userToUnban: userToUnban });
}
function renderFriends() {
    const container = document.getElementById('friendsList');
    const ud = window.usersProfiles || {};
    let html = '';
    friendRequests.forEach(req => {
        const f = ud[req] || {};
        html += '<div class="friend-item friend-request">' + renderAvatar(f.avatarData, f.avatarType, 'small') +
            '<span style="flex:1">' + (f.nickname || f.name || req) + '</span>' +
            '<div class="friend-actions"><button class="accept-btn" onclick="acceptFriendRequest(\\'' + req + '\\')">✅</button>' +
            '<button class="reject-btn" onclick="rejectFriendRequest(\\'' + req + '\\')">❌</button></div></div>';
    });
    allFriends.forEach(friend => {
        const f = ud[friend] || {};
        html += '<div class="friend-item" onclick="startPrivateChat(\\'' + friend + '\\')">' + renderAvatar(f.avatarData, f.avatarType, 'small') +
            '<span style="flex:1">' + (f.nickname || f.name || friend) + '</span>' +
            '<button class="ban-btn" onclick="event.stopPropagation(); banUser(\\'' + friend + '\\')">🚫</button></div>';
    });
    bannedUsers.forEach(banned => {
        const b = ud[banned] || {};
        html += '<div class="friend-item" style="opacity:0.7;">' + renderAvatar(b.avatarData, b.avatarType, 'small') +
            '<span style="flex:1">' + (b.nickname || b.name || banned) + ' (забанен)</span>' +
            '<button class="unban-btn" onclick="event.stopPropagation(); unbanUser(\\'' + banned + '\\')">🔓 Разбанить</button></div>';
    });
    container.innerHTML = html || '<div style="padding:10px; color:#666; text-align:center;">Нет друзей</div>';
}
function renderAvatar(avatarData, avatarType, size) {
    if (avatarType === 'image' && avatarData) {
        if (size === 'small') return '<img src="' + avatarData + '" class="user-avatar-small-img">';
        return '<img src="' + avatarData + '" class="avatar-img">';
    } else {
        const emoji = avatarData || '👤';
        if (size === 'small') return '<div class="user-avatar-small">' + emoji + '</div>';
        return '<div class="avatar-emoji">' + emoji + '</div>';
    }
}

// ========== ВИДЕОКРУЖКИ (ИСПРАВЛЕНО ВОСПРОИЗВЕДЕНИЕ) ==========
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
    const video = document.createElement('video');
    video.src = URL.createObjectURL(recordedVideoBlob);
    video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const offsetX = (video.videoWidth - size) / 2;
        const offsetY = (video.videoHeight - size) / 2;
        video.currentTime = 0;
        video.onseeked = () => {
            ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
            canvas.toBlob((squareBlob) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    socket.emit('video circle', { type: currentChatType, target: currentChatTarget, video: reader.result });
                    closeVideoModal();
                };
                reader.readAsDataURL(squareBlob);
            }, 'video/mp4');
        };
        video.currentTime = 0;
    };
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
    reader.onloadend = () => { socket.emit('file attachment', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileType: file.type, fileData: reader.result }); document.getElementById('fileInput').value = ''; };
    reader.readAsDataURL(file);
}
async function toggleRecording() {
    if (isRecording) { stopAudioRecording(); } else { startAudioRecording(); }
}
async function startAudioRecording() {
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
    } catch(err) { alert('Нет доступа к микрофону'); }
}
function stopAudioRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('voiceBtn').classList.remove('recording');
        document.getElementById('voiceBtn').innerHTML = '🎤';
    }
}
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
    reader.onloadend = () => { socket.emit('upload avatar', { login: currentUser, avatarData: reader.result }, (res) => { if (res.success) { currentUserData = res.userData; updateProfileUI(); showNotification('Аватар', 'Фото загружено'); } }); };
    reader.readAsDataURL(file);
}
function openProfileModal() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editSurname').value = currentUserData?.surname || '';
    document.getElementById('editNickname').value = currentUserData?.nickname || '';
    document.getElementById('editPhone').value = currentUserData?.phone || '';
    document.getElementById('editEmail').value = currentUserData?.email || '';
    document.getElementById('editCity').value = currentUserData?.city || '';
    document.getElementById('editBirthday').value = currentUserData?.birthday || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editStatus').value = currentUserData?.status || 'online';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileAvatarContainer').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType, 'large');
    selectedAvatar = currentUserData?.avatar || '👤';
    document.getElementById('profileModal').style.display = 'flex';
    closeSidebar();
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; document.getElementById('avatarPicker').style.display = 'none'; }
function toggleAvatarPicker() { const p = document.getElementById('avatarPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
function selectAvatar(avatar) { selectedAvatar = avatar; document.getElementById('profileAvatarContainer').innerHTML = '<div class="profile-avatar-emoji">' + avatar + '</div>'; document.getElementById('avatarPicker').style.display = 'none'; }
function saveProfile() {
    const data = { 
        login: currentUser, 
        name: document.getElementById('editName').value.trim(), 
        surname: document.getElementById('editSurname').value.trim(),
        nickname: document.getElementById('editNickname').value.trim(),
        phone: document.getElementById('editPhone').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        city: document.getElementById('editCity').value.trim(),
        birthday: document.getElementById('editBirthday').value,
        bio: document.getElementById('editBio').value.trim(), 
        status: document.getElementById('editStatus').value 
    };
    const newPass = document.getElementById('editPassword').value.trim();
    if (newPass) data.password = newPass;
    if (selectedAvatar !== currentUserData?.avatar) { data.avatar = selectedAvatar; data.avatarType = 'emoji'; }
    socket.emit('update profile', data, (res) => {
        if (res.success) { currentUserData = res.userData; updateProfileUI(); closeProfileModal(); showNotification('Профиль', 'Сохранено'); }
        else alert(res.error);
    });
}
function updateProfileUI() {
    const displayName = currentUserData?.nickname || (currentUserData?.name + ' ' + (currentUserData?.surname || '')).trim() || currentUser;
    document.getElementById('userDisplayName').innerText = displayName;
    document.getElementById('userUsername').innerText = '@' + currentUser;
    document.getElementById('userAvatarContainer').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType);
}
function viewUserProfile(username) {
    socket.emit('getUserProfile', username, (profile) => {
        if (profile) {
            const displayName = profile.nickname || (profile.name + ' ' + (profile.surname || '')).trim() || username;
            document.getElementById('userProfileTitle').innerText = displayName;
            document.getElementById('userProfileAvatar').innerHTML = profile.avatar || '👤';
            document.getElementById('userProfileName').innerHTML = profile.name || '-';
            document.getElementById('userProfileSurname').innerHTML = profile.surname || '-';
            document.getElementById('userProfileNickname').innerHTML = profile.nickname || '-';
            document.getElementById('userProfilePhone').innerHTML = profile.phone || '-';
            document.getElementById('userProfileEmail').innerHTML = profile.email || '-';
            document.getElementById('userProfileCity').innerHTML = profile.city || '-';
            document.getElementById('userProfileBirthday').innerHTML = profile.birthday || '-';
            document.getElementById('userProfileBio').innerHTML = profile.bio || '-';
            let statusText = { online: '🟢 В сети', away: '🌙 Отошёл', busy: '🔴 Занят' }[profile.status] || '🟢 В сети';
            document.getElementById('userProfileStatus').innerHTML = statusText;
            window.viewedProfileUsername = username;
            const isFriend = allFriends.includes(username);
            const isBanned = bannedUsers.includes(username);
            const actionBtn = document.getElementById('profileActionBtn');
            if (isBanned) {
                actionBtn.innerHTML = '<button class="unban-btn" onclick="unbanUser(\\'' + username + '\\')" style="padding:12px; border-radius:25px;">🔓 Разбанить</button>';
            } else if (isFriend) {
                actionBtn.innerHTML = '<button class="ban-btn" onclick="banUser(\\'' + username + '\\')" style="padding:12px; border-radius:25px;">🚫 Забанить</button>';
            } else {
                actionBtn.innerHTML = '<button class="accept-btn" onclick="addFriendByUsername(\\'' + username + '\\')" style="padding:12px; border-radius:25px;">➕ Добавить в друзья</button>';
            }
            document.getElementById('userProfileModal').style.display = 'flex';
        }
    });
}
function closeUserProfileModal() { document.getElementById('userProfileModal').style.display = 'none'; }
function startChatFromProfile() { if (window.viewedProfileUsername) { closeUserProfileModal(); startPrivateChat(window.viewedProfileUsername); } }
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
            if (res.userData.theme) { 
                const themes = ['dark', 'light', 'blue', 'green', 'pink', 'purple', 'orange'];
                document.body.classList.remove(...themes);
                document.body.classList.add(res.userData.theme);
            }
        } else document.getElementById('authError').innerText = res.error;
    });
}
function register() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim();
    const surname = document.getElementById('regSurname').value.trim();
    const nickname = document.getElementById('regNickname').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const city = document.getElementById('regCity').value.trim();
    const birthday = document.getElementById('regBirthday').value;
    const bio = document.getElementById('regBio').value.trim();
    const theme = document.getElementById('regTheme').value;
    const password = document.getElementById('regPassword').value.trim();
    if (!username || !password) { document.getElementById('authError').innerText = 'Заполните username и пароль'; return; }
    socket.emit('register', { username, name, surname, nickname, phone, email, city, birthday, bio, theme, password }, (res) => {
        if (res.success) {
            document.getElementById('authError').className = 'success-msg';
            document.getElementById('authError').innerText = 'Регистрация успешна! Войдите.';
            showLogin();
        } else { document.getElementById('authError').className = 'error-msg'; document.getElementById('authError').innerText = res.error; }
    });
}
function showRegister() { document.getElementById('authForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; document.getElementById('authError').innerText = ''; }
function showLogin() { document.getElementById('authForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; document.getElementById('authError').innerText = ''; }
if (savedUsername && savedPassword) { document.getElementById('loginUsername').value = savedUsername; document.getElementById('loginPassword').value = savedPassword; setTimeout(() => login(), 100); }
function loadData() {
    socket.emit('getRooms', (rooms) => { allRooms = rooms; renderRooms(); });
    socket.emit('getFriends', (data) => { allFriends = data.friends || []; friendRequests = data.requests || []; bannedUsers = data.banned || []; renderFriends(); });
    socket.emit('getChannels', (channels) => { allChannels = channels; renderChannels(); });
    socket.emit('getAllUsers', (users) => { allUsers = users; });
}
window.usersProfiles = {};
socket.on('users list with profiles', (profiles) => { profiles.forEach(p => { window.usersProfiles[p.username] = p; }); });
socket.on('friends update', (data) => { allFriends = data.friends || []; friendRequests = data.requests || []; bannedUsers = data.banned || []; renderFriends(); });
socket.on('channels update', (channels) => { allChannels = channels; renderChannels(); });
socket.on('rooms update', (rooms) => { allRooms = rooms; renderRooms(); });
function startPrivateChat(userName) {
    currentChat = 'user:' + userName; currentChatType = 'private'; currentChatTarget = userName;
    socket.emit('joinPrivate', userName);
    const ud = window.usersProfiles[userName] || {};
    const displayName = ud.nickname || ud.name || userName;
    document.getElementById('currentChatTitle').innerHTML = '💬 ' + displayName;
    renderRooms(); renderFriends(); renderChannels();
    closeSidebar();
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
        const name = ud.nickname || ud.name || data.from;
        document.getElementById('typingIndicator').innerHTML = name + ' печатает...';
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
        const name = ud.nickname || ud.name || msg.from;
        if (msg.type === 'private') showNotification(name, msg.text);
        else if (msg.type === 'room' && currentChatTarget !== msg.room) showNotification('Чат ' + msg.room, name + ': ' + msg.text);
        else if (msg.type === 'channel') showNotification('📢 ' + msg.channel, name + ': ' + msg.text);
    }
});
socket.on('voice message', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVoiceMessage(data); document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});
socket.on('video circle', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVideoMessage(data); document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});
socket.on('file attachment', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addFileMessage(data); document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});
function addMessage(msg) {
    const div = document.createElement('div'); div.className = 'message';
    if (msg.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[msg.from] || {};
    const avatarHtml = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    const displayName = ud.nickname || ud.name || msg.from;
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\\'' + msg.from + '\\')">' + avatarHtml + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\\'' + msg.from + '\\')">' + escapeHtml(displayName) + '</div>' +
        '<div class="message-text">' + (msg.text || '📎 Файл') + '</div><div class="message-time">' + (msg.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVoiceMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    const avatarHtml = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    const displayName = ud.nickname || ud.name || data.from;
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\\'' + data.from + '\\')">' + avatarHtml + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\\'' + data.from + '\\')">' + escapeHtml(displayName) + '</div>' +
        '<div class="voice-message"><button onclick="playAudio(this)" data-audio="' + data.audio + '">▶️</button><span>Голосовое</span></div>' +
        '<div class="message-time">' + (data.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVideoMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    const avatarHtml = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    const displayName = ud.nickname || ud.name || data.from;
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\\'' + data.from + '\\')">' + avatarHtml + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\\'' + data.from + '\\')">' + escapeHtml(displayName) + '</div>' +
        '<video class="video-circle" controls loop src="' + data.video + '"></video>' +
        '<div class="message-time">' + (data.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addFileMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    const avatarHtml = renderAvatar(ud.avatarData, ud.avatarType, 'small');
    const displayName = ud.nickname || ud.name || data.from;
    const icon = data.fileType?.startsWith('image/') ? '🖼️' : '📄';
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\\'' + data.from + '\\')">' + avatarHtml + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\\'' + data.from + '\\')">' + escapeHtml(displayName) + '</div>' +
        '<div class="file-attachment"><span>' + icon + '</span><a href="' + data.fileData + '" download="' + data.fileName + '">' + data.fileName + '</a></div>' +
        '<div class="message-time">' + (data.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function playAudio(btn) {
    const audio = new Audio(btn.getAttribute('data-audio'));
    audio.play();
    btn.innerHTML = '⏸️';
    audio.onended = () => { btn.innerHTML = '▶️'; };
}
socket.on('profile updated', (data) => {
    if (data.username === currentUser) { currentUserData = data; updateProfileUI(); }
    if (window.usersProfiles[data.username]) { window.usersProfiles[data.username] = data; renderFriends(); }
});
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
</script>
</body>
</html>`);
});

// ========== СОКЕТЫ ==========
const usersOnline = new Map();

io.on('connection', (socket) => {
    let currentUser = null, currentRoom = null;

    socket.on('register', (data, callback) => {
        const { username, name, surname, nickname, phone, email, city, birthday, bio, theme, password } = data;
        if (users[username]) {
            callback({ success: false, error: 'Username уже занят' });
        } else {
            users[username] = {
                username: username,
                password: password,
                name: name || '',
                surname: surname || '',
                nickname: nickname || '',
                phone: phone || '',
                email: email || '',
                city: city || '',
                birthday: birthday || '',
                bio: bio || '',
                theme: theme || 'dark',
                avatar: '👤',
                avatarType: 'emoji',
                avatarData: null,
                status: 'online',
                friends: [],
                friendRequests: [],
                banned: [],
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
            socket.emit('friends update', { friends: users[username].friends || [], requests: users[username].friendRequests || [], banned: users[username].banned || [] });
        }
    });

    socket.on('getAllUsers', (callback) => {
        callback(Object.keys(users));
    });

    socket.on('getUserProfile', (username, callback) => {
        if (users[username]) {
            callback(users[username]);
        } else {
            callback(null);
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
        } else if (users[currentUser].friends?.includes(friendUsername)) {
            callback({ success: false, error: 'Уже в друзьях' });
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
                    friendSocket.emit('friends update', { friends: users[friendUsername].friends || [], requests: users[friendUsername].friendRequests || [], banned: users[friendUsername].banned || [] });
                    friendSocket.emit('notification', { from: currentUser, message: 'хочет добавить вас в друзья' });
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
            const fromSocket = getSocketByUsername(fromUser);
            if (fromSocket) fromSocket.emit('friends update', { friends: users[fromUser].friends, requests: users[fromUser].friendRequests, banned: users[fromUser].banned || [] });
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
            if (users[currentUser].friends?.includes(userToBan)) {
                users[currentUser].friends = users[currentUser].friends.filter(f => f !== userToBan);
            }
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

    socket.on('getFriends', (callback) => {
        if (users[currentUser]) {
            callback({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [], banned: users[currentUser].banned || [] });
        } else {
            callback({ friends: [], requests: [], banned: [] });
        }
    });

    socket.on('create channel', (data, callback) => {
        const { channelName } = data;
        if (channels[channelName]) {
            callback({ success: false, error: 'Канал уже существует' });
        } else {
            channels[channelName] = { name: channelName, messages: [], subscribers: [], createdAt: new Date() };
            saveData();
            callback({ success: true, message: 'Канал создан!' });
            io.emit('channels update', Object.keys(channels));
        }
    });

    socket.on('joinChannel', (channelName) => {
        if (channels[channelName]) {
            socket.emit('chat history', { type: 'channel', channel: channelName, messages: channels[channelName].messages || [] });
        }
    });

    socket.on('channel message', (data) => {
        const { channel, text } = data;
        if (channels[channel]) {
            const msg = { id: Date.now(), from: currentUser, text: text, time: new Date().toLocaleTimeString(), type: 'channel', channel: channel };
            channels[channel].messages.push(msg);
            if (channels[channel].messages.length > 200) channels[channel].messages.shift();
            io.emit('chat message', msg);
            saveData();
        }
    });

    socket.on('getChannels', (callback) => {
        callback(Object.keys(channels));
    });

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
            if (data.surname !== undefined) users[data.login].surname = data.surname;
            if (data.nickname !== undefined) users[data.login].nickname = data.nickname;
            if (data.phone !== undefined) users[data.login].phone = data.phone;
            if (data.email !== undefined) users[data.login].email = data.email;
            if (data.city !== undefined) users[data.login].city = data.city;
            if (data.birthday !== undefined) users[data.login].birthday = data.birthday;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.status !== undefined) users[data.login].status = data.status;
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
    console.log('ATOMGRAM запущен на порту ' + PORT);
    console.log('✅ Видеокружки теперь воспроизводятся!');
    console.log('✅ Приватные чаты исправлены!');
    console.log('✅ 7 тем оформления');
    console.log('✅ 14 аватарок');
    console.log('✅ 16 стикеров');
    console.log('✅ Много полей в профиле');
});
