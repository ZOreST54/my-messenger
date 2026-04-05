const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

// ========== ТЕЛЕГРАМ УВЕДОМЛЕНИЯ (ОПЦИОНАЛЬНО) ==========
const https = require('https');
const TELEGRAM_BOT_TOKEN = ''; // Вставьте ваш токен от BotFather, если хотите
const YOUR_CHAT_ID = '';       // Вставьте ваш ID от userinfobot

function sendTelegramNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || !YOUR_CHAT_ID) return;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const data = JSON.stringify({ chat_id: YOUR_CHAT_ID, text: message, parse_mode: 'HTML' });
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    req.write(data);
    req.end();
}

// ========== БАЗА ДАННЫХ ==========
const users = {};
const usersOnline = new Map();
const privateChats = {};
const publicRooms = {};

// Предустановленные данные
users["alex"] = { 
    password: "123", 
    firstName: "Алексей", 
    lastName: "Иванов",
    username: "alex",
    avatar: "😎",
    bio: "Люблю программировать и чай ☕",
    status: "online",
    lastSeen: new Date()
};
users["maria"] = { 
    password: "456", 
    firstName: "Мария", 
    lastName: "Петрова",
    username: "maria",
    avatar: "👩",
    bio: "Дизайнер и фотограф 📸",
    status: "online",
    lastSeen: new Date()
};
publicRooms["general"] = { messages: [], users: [] };

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM - Профиль как в Telegram</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #0a0a0a; height: 100vh; }
        
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
        .switch-btn {
            background: transparent !important;
            border: 1px solid #667eea !important;
        }
        .error-msg { color: #ff6b6b; margin-top: 10px; font-size: 14px; }
        
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
            transition: background 0.2s;
        }
        .sidebar-header:hover { background: rgba(102,126,234,0.1); }
        .avatar {
            font-size: 45px;
            background: #2a2a3e;
            width: 55px;
            height: 55px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .user-info-header h3 { color: white; font-size: 16px; }
        .user-info-header .username { font-size: 11px; color: #888; }
        .section-title {
            padding: 15px 20px 5px 20px;
            font-size: 11px;
            color: #667eea;
            text-transform: uppercase;
        }
        .rooms-list, .users-list {
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            max-height: 200px;
        }
        .room-item, .user-item {
            padding: 10px 15px;
            margin: 4px 0;
            border-radius: 15px;
            cursor: pointer;
            color: #ccc;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .room-item:hover, .user-item:hover { background: rgba(102,126,234,0.2); }
        .room-item.active, .user-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .user-avatar { font-size: 24px; }
        .user-status {
            font-size: 10px;
            color: #4ade80;
            margin-left: auto;
        }
        .new-room {
            padding: 15px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .new-room input {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 20px;
            background: #2a2a3e;
            color: white;
            margin-bottom: 8px;
        }
        .new-room button {
            width: 100%;
            padding: 10px;
            background: #2a2a3e;
            border: 1px solid #667eea;
            border-radius: 20px;
            color: #667eea;
            cursor: pointer;
        }
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .chat-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            color: white;
            font-weight: bold;
        }
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
        }
        .message {
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
        }
        .message-content {
            max-width: 70%;
            padding: 10px 16px;
            border-radius: 20px;
            background: #2a2a3e;
            color: white;
        }
        .message.my-message { align-items: flex-end; }
        .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .message-username { font-size: 11px; color: #a0a0c0; margin-bottom: 4px; }
        .message-text { font-size: 14px; }
        .voice-message {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .voice-message button {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
        }
        .message-time {
            font-size: 9px;
            color: #888;
            margin-top: 4px;
        }
        .input-area {
            display: flex;
            padding: 20px;
            background: #1a1a2e;
            border-top: 1px solid rgba(255,255,255,0.1);
            gap: 10px;
        }
        .input-area input {
            flex: 1;
            padding: 14px 20px;
            border: none;
            border-radius: 30px;
            background: #2a2a3e;
            color: white;
        }
        .input-area button {
            padding: 14px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 30px;
            cursor: pointer;
        }
        .voice-record-btn {
            background: #ff6b6b !important;
        }
        .voice-record-btn.recording {
            animation: pulse 1s infinite;
            background: #ff4444 !important;
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        /* Модальное окно профиля (как в Telegram) */
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
        .modal-header {
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            position: relative;
        }
        .modal-header h3 { color: white; font-size: 20px; }
        .close-modal {
            position: absolute;
            right: 20px;
            top: 20px;
            background: none;
            border: none;
            color: #888;
            font-size: 24px;
            cursor: pointer;
        }
        .profile-avatar-section {
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
        }
        .profile-avatar {
            font-size: 80px;
            background: #2a2a3e;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .profile-avatar:hover { transform: scale(1.05); }
        .avatar-picker {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
            padding: 10px;
            background: #2a2a3e;
            border-radius: 20px;
        }
        .avatar-option {
            font-size: 35px;
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
            transition: transform 0.2s;
        }
        .avatar-option:hover { transform: scale(1.1); background: #3a3a4e; }
        .profile-field {
            padding: 15px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .profile-field label {
            display: block;
            font-size: 11px;
            color: #667eea;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .profile-field input, .profile-field textarea {
            width: 100%;
            padding: 10px;
            background: #2a2a3e;
            border: none;
            border-radius: 15px;
            color: white;
            font-size: 16px;
            font-family: inherit;
        }
        .profile-field textarea { resize: none; height: 60px; }
        .profile-field .readonly {
            color: #888;
            padding: 10px;
            background: #2a2a3e;
            border-radius: 15px;
        }
        .modal-footer {
            padding: 20px;
            display: flex;
            gap: 10px;
        }
        .save-btn {
            flex: 1;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
        }
        .status-select {
            width: 100%;
            padding: 10px;
            background: #2a2a3e;
            border: none;
            border-radius: 15px;
            color: white;
            font-size: 14px;
        }
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
                <input type="text" id="login" placeholder="Логин (username)">
                <input type="password" id="password" placeholder="Пароль">
                <button onclick="login()">Войти</button>
                <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
            </div>
            <div id="registerForm" style="display:none">
                <input type="text" id="regLogin" placeholder="Логин (username)">
                <input type="password" id="regPassword" placeholder="Пароль">
                <input type="text" id="regFirstName" placeholder="Имя">
                <input type="text" id="regLastName" placeholder="Фамилия">
                <button onclick="register()">Зарегистрироваться</button>
                <button class="switch-btn" onclick="showLogin()">Назад</button>
            </div>
            <div id="authError" class="error-msg"></div>
        </div>
    </div>

    <div id="mainApp">
        <div class="sidebar">
            <div class="sidebar-header" onclick="openProfileModal()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="user-info-header">
                    <h3 id="userDisplayName">Загрузка...</h3>
                    <div class="username" id="userUsername">@</div>
                </div>
            </div>
            <div class="section-title">📢 ОБЩИЕ ЧАТЫ</div>
            <div class="rooms-list" id="roomsList"></div>
            <div class="section-title">💬 ЛИЧНЫЕ СООБЩЕНИЯ</div>
            <div class="users-list" id="usersList"></div>
            <div class="new-room">
                <input type="text" id="newRoomName" placeholder="Название чата">
                <button onclick="createRoom()">+ Создать общий чат</button>
            </div>
        </div>
        <div class="chat-area">
            <div class="chat-header" id="currentChatTitle">Выберите чат</div>
            <div class="messages-area" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Введите сообщение...">
                <button id="voiceBtn" class="voice-record-btn" onclick="toggleRecording()">🎤</button>
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>

    <!-- Модальное окно профиля -->
    <div id="profileModal" class="modal" style="display:none">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Редактировать профиль</h3>
                <button class="close-modal" onclick="closeProfileModal()">✕</button>
            </div>
            <div class="profile-avatar-section">
                <div class="profile-avatar" id="profileAvatar" onclick="toggleAvatarPicker()">👤</div>
                <div id="avatarPicker" class="avatar-picker" style="display:none">
                    <div class="avatar-option" onclick="selectAvatar('😀')">😀</div>
                    <div class="avatar-option" onclick="selectAvatar('😎')">😎</div>
                    <div class="avatar-option" onclick="selectAvatar('👨')">👨</div>
                    <div class="avatar-option" onclick="selectAvatar('👩')">👩</div>
                    <div class="avatar-option" onclick="selectAvatar('🦸')">🦸</div>
                    <div class="avatar-option" onclick="selectAvatar('🐱')">🐱</div>
                    <div class="avatar-option" onclick="selectAvatar('🚀')">🚀</div>
                    <div class="avatar-option" onclick="selectAvatar('💻')">💻</div>
                    <div class="avatar-option" onclick="selectAvatar('🎮')">🎮</div>
                    <div class="avatar-option" onclick="selectAvatar('📷')">📷</div>
                </div>
            </div>
            <div class="profile-field">
                <label>Имя</label>
                <input type="text" id="editFirstName" placeholder="Имя">
            </div>
            <div class="profile-field">
                <label>Фамилия</label>
                <input type="text" id="editLastName" placeholder="Фамилия">
            </div>
            <div class="profile-field">
                <label>Username (логин)</label>
                <div class="readonly" id="editUsername">@</div>
            </div>
            <div class="profile-field">
                <label>О себе</label>
                <textarea id="editBio" placeholder="Расскажите о себе..."></textarea>
            </div>
            <div class="profile-field">
                <label>Статус</label>
                <select id="editStatus" class="status-select">
                    <option value="online">🟢 В сети</option>
                    <option value="away">🌙 Отошёл</option>
                    <option value="busy">🔴 Занят</option>
                    <option value="invisible">⚫ Невидимка</option>
                </select>
            </div>
            <div class="profile-field">
                <label>Новый пароль (оставьте пустым, если не хотите менять)</label>
                <input type="password" id="editPassword" placeholder="Новый пароль">
            </div>
            <div class="modal-footer">
                <button class="save-btn" onclick="saveProfile()">Сохранить</button>
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
        let allRooms = [];
        let allUsers = [];
        let selectedAvatar = '👤';
        
        function showNotification(title, body) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body: body });
            }
            const notif = document.createElement('div');
            notif.className = 'notification';
            notif.innerHTML = '<strong>' + title + '</strong><br>' + body;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }
        
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Голосовые сообщения
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;
        
        async function toggleRecording() {
            if (isRecording) { stopRecording(); } 
            else { startRecording(); }
        }
        
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => sendVoiceMessage(reader.result);
                    reader.readAsDataURL(audioBlob);
                    stream.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start();
                isRecording = true;
                const btn = document.getElementById('voiceBtn');
                btn.classList.add('recording');
                btn.innerHTML = '⏹️';
            } catch(err) { alert('Нет доступа к микрофону'); }
        }
        
        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                const btn = document.getElementById('voiceBtn');
                btn.classList.remove('recording');
                btn.innerHTML = '🎤';
            }
        }
        
        function sendVoiceMessage(base64Audio) {
            if (!currentChat) { alert('Выберите чат'); return; }
            socket.emit('voice message', { type: currentChatType, target: currentChatTarget, audio: base64Audio });
        }
        
        // Профиль
        function openProfileModal() {
            document.getElementById('editFirstName').value = currentUserData?.firstName || '';
            document.getElementById('editLastName').value = currentUserData?.lastName || '';
            document.getElementById('editUsername').innerText = '@' + (currentUserData?.username || currentUser);
            document.getElementById('editBio').value = currentUserData?.bio || '';
            document.getElementById('editStatus').value = currentUserData?.status || 'online';
            document.getElementById('editPassword').value = '';
            document.getElementById('profileAvatar').innerHTML = currentUserData?.avatar || '👤';
            selectedAvatar = currentUserData?.avatar || '👤';
            document.getElementById('profileModal').style.display = 'flex';
        }
        
        function closeProfileModal() {
            document.getElementById('profileModal').style.display = 'none';
            document.getElementById('avatarPicker').style.display = 'none';
        }
        
        function toggleAvatarPicker() {
            const picker = document.getElementById('avatarPicker');
            picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
        }
        
        function selectAvatar(avatar) {
            selectedAvatar = avatar;
            document.getElementById('profileAvatar').innerHTML = avatar;
            document.getElementById('avatarPicker').style.display = 'none';
        }
        
        function saveProfile() {
            const data = {
                login: currentUser,
                firstName: document.getElementById('editFirstName').value.trim(),
                lastName: document.getElementById('editLastName').value.trim(),
                bio: document.getElementById('editBio').value.trim(),
                status: document.getElementById('editStatus').value,
                avatar: selectedAvatar
            };
            const newPassword = document.getElementById('editPassword').value.trim();
            if (newPassword) data.password = newPassword;
            
            socket.emit('update profile', data, (res) => {
                if (res.success) {
                    currentUserData = res.userData;
                    updateProfileUI();
                    closeProfileModal();
                    showNotification('Профиль', 'Данные сохранены');
                } else { alert(res.error); }
            });
        }
        
        function updateProfileUI() {
            const fullName = currentUserData?.firstName + ' ' + (currentUserData?.lastName || '');
            document.getElementById('userDisplayName').innerText = fullName.trim() || currentUserData?.username;
            document.getElementById('userUsername').innerText = '@' + (currentUserData?.username || currentUser);
            document.getElementById('userAvatar').innerHTML = currentUserData?.avatar || '👤';
        }
        
        function getStatusIcon(status) {
            switch(status) {
                case 'online': return '🟢';
                case 'away': return '🌙';
                case 'busy': return '🔴';
                default: return '⚫';
            }
        }
        
        // Авторизация
        function login() {
            const login = document.getElementById('login').value.trim();
            const password = document.getElementById('password').value.trim();
            socket.emit('login', { login, password }, (res) => {
                if (res.success) {
                    currentUser = login;
                    currentUserData = res.userData;
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('mainApp').style.display = 'flex';
                    updateProfileUI();
                    loadData();
                } else { document.getElementById('authError').innerText = res.error; }
            });
        }
        
        function register() {
            const login = document.getElementById('regLogin').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            const firstName = document.getElementById('regFirstName').value.trim();
            const lastName = document.getElementById('regLastName').value.trim();
            if (!login || !password) {
                document.getElementById('authError').innerText = 'Заполните логин и пароль';
                return;
            }
            socket.emit('register', { login, password, firstName, lastName }, (res) => {
                if (res.success) {
                    showLogin();
                    document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.';
                } else { document.getElementById('authError').innerText = res.error; }
            });
        }
        
        function showRegister() {
            document.getElementById('authForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
        }
        
        function showLogin() {
            document.getElementById('authForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
        }
        
        function loadData() {
            socket.emit('getRooms', (rooms) => {
                allRooms = rooms;
                renderRooms();
            });
            socket.emit('getUsers', (users) => {
                allUsers = users;
                renderUsers();
            });
        }
        
        function renderRooms() {
            const container = document.getElementById('roomsList');
            container.innerHTML = allRooms.map(room => 
                '<div class="room-item' + (currentChat === 'room:' + room ? ' active' : '') + '" onclick="joinRoom(\\'' + room + '\\')">#' + room + '</div>'
            ).join('');
        }
        
        function renderUsers() {
            const container = document.getElementById('usersList');
            container.innerHTML = allUsers.map(user => {
                const userData = window.userProfiles?.[user] || {};
                return '<div class="user-item' + (currentChat === 'user:' + user ? ' active' : '') + '" onclick="startPrivateChat(\\'' + user + '\\')">' +
                    '<span class="user-avatar">' + (userData.avatar || '👤') + '</span>' +
                    '<span>' + (userData.firstName ? userData.firstName + ' ' + (userData.lastName || '') : user) + '</span>' +
                    '<span class="user-status">' + getStatusIcon(userData.status) + '</span></div>';
            }).join('');
        }
        
        // Сохраняем профили пользователей
        window.userProfiles = {};
        socket.on('users list with profiles', (usersWithProfiles) => {
            usersWithProfiles.forEach(u => { window.userProfiles[u.username] = u; });
            allUsers = usersWithProfiles.map(u => u.username).filter(u => u !== currentUser);
            renderUsers();
        });
        
        function joinRoom(roomName) {
            currentChat = 'room:' + roomName;
            currentChatType = 'room';
            currentChatTarget = roomName;
            socket.emit('joinRoom', roomName);
            document.getElementById('currentChatTitle').innerHTML = '# ' + roomName;
            renderRooms(); renderUsers();
        }
        
        function startPrivateChat(userName) {
            currentChat = 'user:' + userName;
            currentChatType = 'private';
            currentChatTarget = userName;
            socket.emit('joinPrivate', userName);
            const userData = window.userProfiles[userName] || {};
            const displayName = userData.firstName ? userData.firstName + ' ' + (userData.lastName || '') : userName;
            document.getElementById('currentChatTitle').innerHTML = '💬 ' + displayName;
            renderRooms(); renderUsers();
        }
        
        function createRoom() {
            const newRoom = document.getElementById('newRoomName').value.trim();
            if (!newRoom) return;
            socket.emit('createRoom', newRoom, (success) => {
                if (success) {
                    document.getElementById('newRoomName').value = '';
                    loadData();
                    setTimeout(() => joinRoom(newRoom), 500);
                } else { alert('Чат уже существует!'); }
            });
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text || !currentChat) return;
            if (currentChatType === 'room') {
                socket.emit('chat message', { type: 'room', target: currentChatTarget, text });
            } else {
                socket.emit('chat message', { type: 'private', target: currentChatTarget, text });
            }
            input.value = '';
        }
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        socket.on('chat history', (data) => {
            if ((currentChatType === 'room' && data.type === 'room' && data.room === currentChatTarget) ||
                (currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget)) {
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                data.messages.forEach(msg => addMessage(msg));
                scrollToBottom();
            }
        });
        
        socket.on('chat message', (msg) => {
            let shouldShow = false;
            if (msg.type === 'room' && currentChatType === 'room' && msg.room === currentChatTarget) shouldShow = true;
            if (msg.type === 'private' && currentChatType === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) shouldShow = true;
            if (shouldShow) {
                addMessage(msg);
                scrollToBottom();
            }
            if (msg.from !== currentUser) {
                const userName = window.userProfiles[msg.from]?.firstName || msg.from;
                if (msg.type === 'private') showNotification(userName, msg.text);
                else if (msg.type === 'room' && currentChatTarget !== msg.room) showNotification('Чат ' + msg.room, userName + ': ' + msg.text);
            }
        });
        
        socket.on('voice message', (data) => {
            let shouldShow = false;
            if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) shouldShow = true;
            if (shouldShow) {
                addVoiceMessage(data);
                scrollToBottom();
            }
            if (data.from !== currentUser && data.type === 'private') {
                const userName = window.userProfiles[data.from]?.firstName || data.from;
                showNotification(userName, '🎤 Голосовое сообщение');
            }
        });
        
        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (msg.from === currentUser) div.className += ' my-message';
            const userName = window.userProfiles[msg.from]?.firstName || msg.from;
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(userName) + '</div><div class="message-text">' + escapeHtml(msg.text) + '</div><div class="message-time">' + msg.time + '</div></div>';
            messagesDiv.appendChild(div);
        }
        
        function addVoiceMessage(data) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (data.from === currentUser) div.className += ' my-message';
            const userName = window.userProfiles[data.from]?.firstName || data.from;
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(userName) + '</div><div class="voice-message"><button onclick="playAudio(this)" data-audio="' + data.audio + '">▶️</button><span>Голосовое сообщение</span></div><div class="message-time">' + data.time + '</div></div>';
            messagesDiv.appendChild(div);
        }
        
        function playAudio(btn) {
            const audio = new Audio(btn.getAttribute('data-audio'));
            audio.play();
            btn.innerHTML = '⏸️';
            audio.onended = () => { btn.innerHTML = '▶️'; };
        }
        
        socket.on('users update', (users) => {
            allUsers = users.filter(u => u !== currentUser);
            renderUsers();
        });
        
        socket.on('rooms update', (rooms) => {
            allRooms = rooms;
            renderRooms();
        });
        
        socket.on('profile updated', (data) => {
            if (data.username === currentUser) {
                currentUserData = data;
                updateProfileUI();
            }
            if (window.userProfiles[data.username]) {
                window.userProfiles[data.username] = data;
                renderUsers();
            }
        });
        
        function scrollToBottom() {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>
    `);
});

// ========== СЕРВЕРНАЯ ЛОГИКА ==========
io.on('connection', (socket) => {
    let currentUser = null;
    let currentRoom = null;

    socket.on('register', (data, callback) => {
        if (users[data.login]) {
            callback({ success: false, error: 'Логин уже существует' });
        } else {
            users[data.login] = { 
                password: data.password, 
                firstName: data.firstName || data.login,
                lastName: data.lastName || '',
                username: data.login,
                avatar: '👤',
                bio: '',
                status: 'online',
                lastSeen: new Date()
            };
            callback({ success: true });
        }
    });

    socket.on('login', (data, callback) => {
        if (users[data.login] && users[data.login].password === data.password) {
            currentUser = data.login;
            usersOnline.set(socket.id, currentUser);
            users[data.login].status = 'online';
            users[data.login].lastSeen = new Date();
            callback({ success: true, userData: users[data.login] });
            sendUserList();
            sendProfileList();
        } else {
            callback({ success: false, error: 'Неверный логин или пароль' });
        }
    });

    socket.on('update profile', (data, callback) => {
        if (users[data.login]) {
            if (data.firstName !== undefined) users[data.login].firstName = data.firstName;
            if (data.lastName !== undefined) users[data.login].lastName = data.lastName;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.status !== undefined) users[data.login].status = data.status;
            if (data.avatar !== undefined) users[data.login].avatar = data.avatar;
            if (data.password) users[data.login].password = data.password;
            callback({ success: true, userData: users[data.login] });
            io.emit('profile updated', users[data.login]);
            sendProfileList();
            sendTelegramNotification('✏️ ' + data.login + ' обновил профиль');
        } else {
            callback({ success: false, error: 'Пользователь не найден' });
        }
    });

    function sendUserList() {
        io.emit('users update', Array.from(usersOnline.values()));
    }

    function sendProfileList() {
        const profiles = Object.keys(users).map(login => users[login]);
        io.emit('users list with profiles', profiles);
    }

    socket.on('getRooms', (callback) => {
        callback(Object.keys(publicRooms));
    });

    socket.on('getUsers', (callback) => {
        callback(Array.from(usersOnline.values()));
    });

    socket.on('createRoom', (roomName, callback) => {
        if (!publicRooms[roomName]) {
            publicRooms[roomName] = { messages: [], users: [] };
            callback(true);
            io.emit('rooms update', Object.keys(publicRooms));
        } else {
            callback(false);
        }
    });

    socket.on('joinRoom', (roomName) => {
        if (currentRoom) socket.leave(currentRoom);
        currentRoom = roomName;
        socket.join(roomName);
        socket.emit('chat history', {
            type: 'room',
            room: roomName,
            messages: publicRooms[roomName]?.messages || []
        });
    });

    socket.on('joinPrivate', (targetUser) => {
        currentRoom = null;
        const chatId = [currentUser, targetUser].sort().join('_');
        if (!privateChats[chatId]) {
            privateChats[chatId] = { messages: [], users: [currentUser, targetUser] };
        }
        socket.emit('chat history', {
            type: 'private',
            with: targetUser,
            messages: privateChats[chatId].messages || []
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

        if (type === 'room') {
            msg.room = target;
            if (publicRooms[target]) {
                publicRooms[target].messages.push(msg);
                if (publicRooms[target].messages.length > 100) publicRooms[target].messages.shift();
                io.to(target).emit('chat message', msg);
                sendTelegramNotification(`📢 #${target}\n👤 ${currentUser}: ${text}`);
            }
        } else if (type === 'private') {
            msg.to = target;
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) {
                privateChats[chatId] = { messages: [], users: [currentUser, target] };
            }
            privateChats[chatId].messages.push(msg);
            if (privateChats[chatId].messages.length > 100) privateChats[chatId].messages.shift();
            io.emit('chat message', msg);
            sendTelegramNotification(`💬 Личное от ${currentUser} для ${target}\n📝 ${text}`);
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
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
            privateChats[chatId].messages.push(msg);
            io.emit('voice message', msg);
            sendTelegramNotification(`🎤 Голосовое от ${currentUser} для ${target}`);
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            usersOnline.delete(socket.id);
            users[currentUser].status = 'away';
            users[currentUser].lastSeen = new Date();
            sendUserList();
            sendProfileList();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ATOMGRAM с профилем как в Telegram запущен на порту ' + PORT);
    console.log('📋 Тестовые пользователи: alex/123, maria/456');
});
