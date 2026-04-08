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
    return { users: {}, privateChats: {}, publicRooms: {} };
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, publicRooms }, null, 2));
    console.log('Данные сохранены');
}

let savedData = loadData();
let users = savedData.users;
let privateChats = savedData.privateChats;
let publicRooms = savedData.publicRooms || {};

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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #0a0a0a; color: white; height: 100vh; overflow: hidden; }
        
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
        .auth-card h1 {
            font-size: 32px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-card input {
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
            display: flex;
        }
        .sidebar {
            width: 280px;
            background: #1a1a2e;
            border-right: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
        }
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }
        .avatar-emoji { font-size: 45px; background: #2a2a3e; width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .avatar-img { width: 55px; height: 55px; border-radius: 50%; object-fit: cover; }
        .user-info-header h3 { font-size: 16px; }
        .user-info-header .username { font-size: 11px; color: #888; }
        .menu-item { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; }
        .menu-item:hover { background: rgba(102,126,234,0.1); }
        .section-title { padding: 10px 20px 5px 20px; font-size: 11px; color: #667eea; text-transform: uppercase; }
        .friends-list, .users-list {
            padding: 5px 10px;
            overflow-y: auto;
            max-height: 200px;
        }
        .friend-item, .user-item {
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
        .friend-item:hover, .user-item:hover { background: rgba(102,126,234,0.2); }
        .friend-item.active, .user-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .friend-request { background: rgba(102,126,234,0.3); border-left: 3px solid #667eea; }
        .friend-actions button { margin-left: 5px; padding: 3px 8px; border-radius: 12px; border: none; cursor: pointer; font-size: 12px; }
        .accept-btn { background: #4ade80; color: white; }
        .reject-btn { background: #ff6b6b; color: white; }
        .ban-btn { background: #ff4444; color: white; }
        .user-avatar-small { font-size: 24px; }
        
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .chat-header {
            padding: 15px 20px;
            background: #1a1a2e;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .menu-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        .chat-title { flex: 1; font-size: 18px; font-weight: bold; }
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
        .message.my-message { justify-content: flex-end; }
        .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .message-username { font-size: 11px; color: #a0a0c0; margin-bottom: 3px; }
        .message-text { font-size: 14px; word-wrap: break-word; }
        .message-time { font-size: 9px; color: #888; margin-top: 3px; }
        .voice-message { display: flex; align-items: center; gap: 8px; }
        .voice-message button { background: none; border: none; font-size: 20px; cursor: pointer; color: white; }
        .video-circle { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; cursor: pointer; }
        .file-attachment { background: rgba(102,126,234,0.2); padding: 8px 12px; border-radius: 12px; display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .file-attachment a { color: white; text-decoration: none; }
        .typing-indicator { font-size: 11px; color: #888; padding: 5px 15px; font-style: italic; }
        .input-area {
            display: flex;
            padding: 10px 15px;
            gap: 8px;
            background: #1a1a2e;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .input-area input {
            flex: 1;
            padding: 10px 15px;
            border: none;
            border-radius: 25px;
            background: #2a2a3e;
            color: white;
            font-size: 15px;
        }
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
        .video-controls { margin-top: 20px; display: flex; gap: 10px; justify-content: center; }
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
        .profile-avatar-emoji { font-size: 70px; background: #2a2a3e; width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; cursor: pointer; }
        .profile-field { padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .profile-field label { display: block; font-size: 11px; color: #667eea; margin-bottom: 3px; text-transform: uppercase; }
        .profile-field input, .profile-field textarea { width: 100%; padding: 10px; background: #2a2a3e; border: none; border-radius: 12px; color: white; font-size: 14px; }
        .profile-field .value { color: white; font-size: 14px; padding: 8px 0; }
        .avatar-picker { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; padding: 10px; background: #2a2a3e; border-radius: 20px; }
        .avatar-option { font-size: 30px; cursor: pointer; padding: 5px; border-radius: 50%; }
        .modal-footer { padding: 15px; display: flex; gap: 10px; }
        .save-btn { flex: 1; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; cursor: pointer; }
        .upload-btn { flex: 1; padding: 12px; background: #2a2a3e; color: white; border: 1px solid #667eea; border-radius: 25px; cursor: pointer; }
        
        @media (max-width: 768px) {
            .sidebar { display: none; }
        }
    </style>
</head>
<body>
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
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header" onclick="openProfileModal()">
            <div id="userAvatarContainer" class="avatar-emoji">👤</div>
            <div class="user-info-header">
                <h3 id="userDisplayName">Загрузка...</h3>
                <div class="username" id="userUsername">@</div>
            </div>
        </div>
        <div class="menu-item" onclick="openProfileModal()"><span>👤</span> <span>Мой профиль</span></div>
        <div class="menu-item" onclick="addFriend()"><span>➕</span> <span>Добавить друга</span></div>
        <div class="section-title">👥 ДРУЗЬЯ</div>
        <div class="friends-list" id="friendsList"></div>
        <div class="section-title">💬 ВСЕ ПОЛЬЗОВАТЕЛИ</div>
        <div class="users-list" id="usersList"></div>
    </div>
    <div class="chat-area">
        <div class="chat-header">
            <button class="menu-btn" onclick="toggleSidebar()">☰</button>
            <div class="chat-title" id="currentChatTitle">Выберите чат</div>
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
            <div class="sticker" onclick="sendSticker('⚡')">⚡</div><div class="sticker" onclick="sendSticker('💀')">💀</div>
            <div class="sticker" onclick="sendSticker('👻')">👻</div><div class="sticker" onclick="sendSticker('🤖')">🤖</div>
            <div class="sticker" onclick="sendSticker('😡')">😡</div><div class="sticker" onclick="sendSticker('😭')">😭</div>
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
            <div id="profileAvatarContainer" class="profile-avatar-emoji">👤</div>
            <div id="avatarPicker" class="avatar-picker" style="display:none;">
                <div class="avatar-option" onclick="selectAvatar('😀')">😀</div><div class="avatar-option" onclick="selectAvatar('😎')">😎</div>
                <div class="avatar-option" onclick="selectAvatar('👨')">👨</div><div class="avatar-option" onclick="selectAvatar('👩')">👩</div>
                <div class="avatar-option" onclick="selectAvatar('🦸')">🦸</div><div class="avatar-option" onclick="selectAvatar('🐱')">🐱</div>
                <div class="avatar-option" onclick="selectAvatar('🐶')">🐶</div><div class="avatar-option" onclick="selectAvatar('🚀')">🚀</div>
                <div class="avatar-option" onclick="selectAvatar('🤖')">🤖</div><div class="avatar-option" onclick="selectAvatar('👾')">👾</div>
            </div>
            <input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()">
        </div>
        <div class="profile-field"><label>Имя</label><input type="text" id="editName"></div>
        <div class="profile-field"><label>О себе</label><textarea id="editBio" rows="2"></textarea></div>
        <div class="profile-field"><label>Новый пароль</label><input type="password" id="editPassword" placeholder="Оставьте пустым"></div>
        <div class="modal-footer">
            <button class="upload-btn" onclick="document.getElementById('avatarUpload').click()">📷 Фото</button>
            <button class="save-btn" onclick="saveProfile()">Сохранить</button>
        </div>
    </div>
</div>

<div id="userProfileModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3 id="userProfileTitle">Профиль</h3><button class="close-modal" onclick="closeUserProfileModal()">✕</button></div>
        <div class="profile-avatar-section">
            <div id="userProfileAvatar" class="profile-avatar-emoji">👤</div>
        </div>
        <div class="profile-field"><label>Имя</label><div class="value" id="userProfileName">-</div></div>
        <div class="profile-field"><label>О себе</label><div class="value" id="userProfileBio">-</div></div>
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
let currentChat = null, currentChatTarget = null;
let allFriends = [], allUsers = [], friendRequests = [];
let selectedAvatar = '👤';
let mediaRecorder = null, audioChunks = [], isRecording = false;
let videoStream = null, videoRecorder = null, videoChunks = [];
let recordedVideoBlob = null;

const savedUsername = localStorage.getItem('atomgram_username');
const savedPassword = localStorage.getItem('atomgram_password');

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.style.display === 'none' || getComputedStyle(sidebar).display === 'none') {
        sidebar.style.display = 'flex';
    } else {
        sidebar.style.display = 'none';
    }
}

function getLocalTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function renderAvatar(avatarData, avatarType) {
    if (avatarType === 'image' && avatarData) {
        return '<img src="' + avatarData + '" class="avatar-img">';
    } else {
        return '<div class="avatar-emoji">' + (avatarData || '👤') + '</div>';
    }
}

function updateProfileUI() {
    document.getElementById('userDisplayName').innerText = currentUserData?.name || currentUser;
    document.getElementById('userUsername').innerText = '@' + currentUser;
    document.getElementById('userAvatarContainer').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType);
}

function renderFriends() {
    const container = document.getElementById('friendsList');
    const ud = window.usersProfiles || {};
    let html = '';
    friendRequests.forEach(req => {
        const f = ud[req] || {};
        html += '<div class="friend-item friend-request">' +
            '<span>' + (f.avatar || '👤') + '</span>' +
            '<span style="flex:1">' + (f.name || req) + '</span>' +
            '<div class="friend-actions">' +
            '<button class="accept-btn" onclick="acceptFriendRequest(\\'' + req + '\\')">✅</button>' +
            '<button class="reject-btn" onclick="rejectFriendRequest(\\'' + req + '\\')">❌</button>' +
            '</div></div>';
    });
    allFriends.forEach(friend => {
        const f = ud[friend] || {};
        html += '<div class="friend-item" onclick="startPrivateChat(\\'' + friend + '\\')">' +
            '<span>' + (f.avatar || '👤') + '</span>' +
            '<span style="flex:1">' + (f.name || friend) + '</span>' +
            '<button class="ban-btn" onclick="event.stopPropagation(); banUser(\\'' + friend + '\\')">🚫</button>' +
            '</div>';
    });
    container.innerHTML = html || '<div style="padding:10px; text-align:center; color:#666;">Нет друзей</div>';
}

function renderUsers() {
    const container = document.getElementById('usersList');
    const ud = window.usersProfiles || {};
    container.innerHTML = allUsers.map(user => {
        const u = ud[user] || {};
        return '<div class="user-item" onclick="startPrivateChat(\\'' + user + '\\')">' +
            '<span>' + (u.avatar || '👤') + '</span>' +
            '<span>' + (u.name || user) + '</span>' +
            '</div>';
    }).join('');
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
        if (currentChatTarget === userToBan) {
            currentChatTarget = null;
            document.getElementById('currentChatTitle').innerHTML = 'Выберите чат';
            document.getElementById('messages').innerHTML = '';
        }
    }
}

function toggleStickerPicker() { document.getElementById('stickerPicker').classList.toggle('open'); }
function sendSticker(sticker) {
    if (!currentChatTarget) { alert('Выберите чат'); return; }
    socket.emit('chat message', { type: 'private', target: currentChatTarget, text: sticker });
    document.getElementById('stickerPicker').classList.remove('open');
}

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
    if (!recordedVideoBlob || !currentChatTarget) { alert('Выберите чат'); return; }
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
                    socket.emit('video circle', { type: 'private', target: currentChatTarget, video: reader.result });
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
    if (!file || !currentChatTarget) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('file attachment', { type: 'private', target: currentChatTarget, fileName: file.name, fileType: file.type, fileData: reader.result });
        document.getElementById('fileInput').value = '';
    };
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
            reader.onloadend = () => socket.emit('voice message', { type: 'private', target: currentChatTarget, audio: reader.result });
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
    if (currentChatTarget) {
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
    document.getElementById('profileAvatarContainer').innerHTML = currentUserData?.avatar || '👤';
    selectedAvatar = currentUserData?.avatar || '👤';
    document.getElementById('profileModal').style.display = 'flex';
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; document.getElementById('avatarPicker').style.display = 'none'; }
function toggleAvatarPicker() { const p = document.getElementById('avatarPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
function selectAvatar(avatar) { selectedAvatar = avatar; document.getElementById('profileAvatarContainer').innerHTML = avatar; document.getElementById('avatarPicker').style.display = 'none'; }
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

function viewUserProfile(username) {
    socket.emit('getUserProfile', username, (profile) => {
        if (profile) {
            document.getElementById('userProfileTitle').innerText = profile.name || username;
            document.getElementById('userProfileAvatar').innerHTML = profile.avatar || '👤';
            document.getElementById('userProfileName').innerHTML = profile.name || '-';
            document.getElementById('userProfileBio').innerHTML = profile.bio || '-';
            window.viewedProfileUsername = username;
            const isFriend = allFriends.includes(username);
            const actionBtn = document.getElementById('profileActionBtn');
            if (isFriend) {
                actionBtn.innerHTML = '<button class="ban-btn" onclick="banUser(\\'' + username + '\\')" style="padding:12px; border-radius:25px;">🚫 Забанить</button>';
            } else {
                actionBtn.innerHTML = '<button class="accept-btn" onclick="addFriendByUsername(\\'' + username + '\\')" style="padding:12px; border-radius:25px;">➕ Добавить в друзья</button>';
            }
            document.getElementById('userProfileModal').style.display = 'flex';
        }
    });
}
function addFriendByUsername(username) {
    socket.emit('add friend', { friendUsername: username }, (res) => {
        if (res.success) showNotification('Друг', res.message);
        else showNotification('Ошибка', res.error);
        closeUserProfileModal();
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
            document.getElementById('authError').innerText = 'Регистрация успешна! Войдите.';
            showLogin();
        } else { document.getElementById('authError').className = 'error-msg'; document.getElementById('authError').innerText = res.error; }
    });
}
function showRegister() { document.getElementById('authForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; document.getElementById('authError').innerText = ''; }
function showLogin() { document.getElementById('authForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; document.getElementById('authError').innerText = ''; }
if (savedUsername && savedPassword) { document.getElementById('loginUsername').value = savedUsername; document.getElementById('loginPassword').value = savedPassword; setTimeout(() => login(), 100); }

function loadData() {
    socket.emit('getFriends', (data) => { allFriends = data.friends || []; friendRequests = data.requests || []; renderFriends(); });
    socket.emit('getAllUsers', (users) => { allUsers = users.filter(u => u !== currentUser); renderUsers(); });
}

window.usersProfiles = {};
socket.on('users list with profiles', (profiles) => { profiles.forEach(p => { window.usersProfiles[p.username] = p; }); });
socket.on('friends update', (data) => { allFriends = data.friends || []; friendRequests = data.requests || []; renderFriends(); });

function startPrivateChat(userName) {
    currentChatTarget = userName;
    socket.emit('joinPrivate', userName);
    const ud = window.usersProfiles[userName] || {};
    document.getElementById('currentChatTitle').innerHTML = '💬 ' + (ud.name || userName);
    document.getElementById('messages').innerHTML = '';
    renderFriends(); renderUsers();
}
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    socket.emit('chat message', { type: 'private', target: currentChatTarget, text });
    input.value = '';
    if (typingTimeout) clearTimeout(typingTimeout);
    socket.emit('stop typing', { to: currentChatTarget });
}
document.getElementById('messageInput').addEventListener('input', sendTyping);
document.getElementById('messageInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

socket.on('typing', (data) => {
    if (currentChatTarget === data.from) {
        const ud = window.usersProfiles[data.from] || {};
        document.getElementById('typingIndicator').innerHTML = (ud.name || data.from) + ' печатает...';
        document.getElementById('typingIndicator').style.display = 'block';
        setTimeout(() => document.getElementById('typingIndicator').style.display = 'none', 2000);
    }
});
socket.on('stop typing', () => { document.getElementById('typingIndicator').style.display = 'none'; });

socket.on('chat history', (data) => {
    if (data.type === 'private' && data.with === currentChatTarget) {
        document.getElementById('messages').innerHTML = '';
        data.messages.forEach(msg => addMessage(msg));
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});

socket.on('chat message', (msg) => {
    if (msg.type === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) {
        addMessage(msg);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
    if (msg.from !== currentUser && msg.type === 'private') {
        const ud = window.usersProfiles[msg.from] || {};
        showNotification(ud.name || msg.from, msg.text);
    }
});

socket.on('voice message', (data) => {
    if (data.type === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVoiceMessage(data);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});
socket.on('video circle', (data) => {
    if (data.type === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVideoMessage(data);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});
socket.on('file attachment', (data) => {
    if (data.type === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addFileMessage(data);
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
    }
});

function addMessage(msg) {
    const div = document.createElement('div'); div.className = 'message';
    if (msg.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[msg.from] || {};
    div.innerHTML = '<div class="message-avatar">' + (ud.avatar || '👤') + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(ud.name || msg.from) + '</div>' +
        '<div class="message-text">' + escapeHtml(msg.text) + '</div><div class="message-time">' + (msg.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVoiceMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    div.innerHTML = '<div class="message-avatar">' + (ud.avatar || '👤') + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(ud.name || data.from) + '</div>' +
        '<div class="voice-message"><button onclick="playAudio(this)" data-audio="' + data.audio + '">▶️</button><span>Голосовое</span></div>' +
        '<div class="message-time">' + (data.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVideoMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    div.innerHTML = '<div class="message-avatar">' + (ud.avatar || '👤') + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(ud.name || data.from) + '</div>' +
        '<video class="video-circle" controls autoplay loop src="' + data.video + '"></video>' +
        '<div class="message-time">' + (data.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addFileMessage(data) {
    const div = document.createElement('div'); div.className = 'message';
    if (data.from === currentUser) div.className += ' my-message';
    const ud = window.usersProfiles[data.from] || {};
    const icon = data.fileType?.startsWith('image/') ? '🖼️' : '📄';
    div.innerHTML = '<div class="message-avatar">' + (ud.avatar || '👤') + '</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escapeHtml(ud.name || data.from) + '</div>' +
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
    if (window.usersProfiles[data.username]) { window.usersProfiles[data.username] = data; renderFriends(); renderUsers(); }
});
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
</script>
</body>
</html>`);
});

// ========== СОКЕТЫ ==========
const usersOnline = new Map();

io.on('connection', (socket) => {
    let currentUser = null;

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
                status: 'online'
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
            callback({ success: true, userData: users[username] });
            sendUserList(); sendProfileList();
            socket.emit('friends update', { friends: users[username].friends || [], requests: users[username].friendRequests || [] });
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
                    friendSocket.emit('friends update', { friends: users[friendUsername].friends || [], requests: users[friendUsername].friendRequests || [] });
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
        }
    });

    socket.on('getFriends', (callback) => {
        if (users[currentUser]) {
            callback({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [] });
        } else {
            callback({ friends: [], requests: [] });
        }
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

    socket.on('joinPrivate', (targetUser) => {
        const chatId = [currentUser, targetUser].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, targetUser] };
        socket.emit('chat history', { type: 'private', with: targetUser, messages: privateChats[chatId].messages || [] });
    });

    socket.on('chat message', (data) => {
        const { type, target, text } = data;
        if (type === 'private') {
            if (users[currentUser]?.banned?.includes(target)) return;
            const msg = { id: Date.now(), from: currentUser, to: target, text, time: new Date().toLocaleTimeString(), type: 'private' };
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
            privateChats[chatId].messages.push(msg);
            if (privateChats[chatId].messages.length > 200) privateChats[chatId].messages.shift();
            io.emit('chat message', msg);
            saveData();
        }
    });

    socket.on('voice message', (data) => {
        const { type, target, audio } = data;
        if (type === 'private') {
            if (users[currentUser]?.banned?.includes(target)) return;
            const msg = { id: Date.now(), from: currentUser, to: target, audio: audio, time: new Date().toLocaleTimeString(), type: 'voice' };
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
            privateChats[chatId].messages.push(msg);
            io.emit('voice message', msg);
            saveData();
        }
    });

    socket.on('video circle', (data) => {
        const { type, target, video } = data;
        if (type === 'private') {
            if (users[currentUser]?.banned?.includes(target)) return;
            const msg = { id: Date.now(), from: currentUser, to: target, video: video, time: new Date().toLocaleTimeString(), type: 'video' };
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
            privateChats[chatId].messages.push(msg);
            io.emit('video circle', msg);
            saveData();
        }
    });

    socket.on('file attachment', (data) => {
        const { type, target, fileName, fileType, fileData } = data;
        if (type === 'private') {
            if (users[currentUser]?.banned?.includes(target)) return;
            const msg = { id: Date.now(), from: currentUser, to: target, fileName, fileType, fileData, time: new Date().toLocaleTimeString(), type: 'file' };
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
            privateChats[chatId].messages.push(msg);
            io.emit('file attachment', msg);
            saveData();
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) { usersOnline.delete(socket.id); sendUserList(); saveData(); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('ATOMGRAM запущен на порту ' + PORT);
    console.log('✅ Чат работает!');
    console.log('✅ Добавление друзей через кнопку +');
    console.log('✅ 20+ стикеров');
    console.log('✅ Голосовые, кружки, файлы');
});
