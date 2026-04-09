const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

// ========== БАЗА ДАННЫХ (ПУСТАЯ) ==========
const users = {};           // Никого нет, всё через регистрацию
const usersOnline = new Map();
const privateChats = {};
const publicRooms = {};

// Только один общий чат по умолчанию
publicRooms["general"] = { messages: [], users: [] };

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM - Чат</title>
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
        .user-status { font-size: 10px; margin-left: auto; }
        .status-online { color: #4ade80; }
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
            display: flex;
            align-items: center;
            gap: 10px;
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
        .message-username { font-size: 11px; color: #a0a0c0; margin-bottom: 4px; cursor: pointer; }
        .message-username:hover { text-decoration: underline; }
        .message-text { font-size: 14px; }
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
        }
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
        }
        .profile-field textarea { resize: none; height: 60px; }
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
        }
        .avatar-option:hover { background: #3a3a4e; }
        .modal-footer {
            padding: 20px;
        }
        .save-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
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
                <input type="text" id="login" placeholder="Логин">
                <input type="password" id="password" placeholder="Пароль">
                <button onclick="login()">Войти</button>
                <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
            </div>
            <div id="registerForm" style="display:none">
                <input type="text" id="regLogin" placeholder="Логин">
                <input type="password" id="regPassword" placeholder="Пароль">
                <input type="text" id="regName" placeholder="Ваше имя">
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
            <div class="section-title">💬 ОНЛАЙН</div>
            <div class="users-list" id="usersList"></div>
            <div class="new-room">
                <input type="text" id="newRoomName" placeholder="Название чата">
                <button onclick="createRoom()">+ Создать общий чат</button>
            </div>
        </div>
        <div class="chat-area">
            <div class="chat-header" id="chatHeader">
                <span id="currentChatTitle">Выберите чат</span>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Введите сообщение...">
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>

    <!-- Модальное окно профиля -->
    <div id="profileModal" class="modal" style="display:none">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Мой профиль</h3>
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
                </div>
            </div>
            <div class="profile-field">
                <label>Имя</label>
                <input type="text" id="editName" placeholder="Ваше имя">
            </div>
            <div class="profile-field">
                <label>О себе</label>
                <textarea id="editBio" placeholder="Расскажите о себе..."></textarea>
            </div>
            <div class="profile-field">
                <label>Новый пароль (оставьте пустым)</label>
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
        
        // Профиль
        function openProfileModal() {
            document.getElementById('editName').value = currentUserData?.name || '';
            document.getElementById('editBio').value = currentUserData?.bio || '';
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
                name: document.getElementById('editName').value.trim(),
                bio: document.getElementById('editBio').value.trim(),
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
            document.getElementById('userDisplayName').innerText = currentUserData?.name || currentUser;
            document.getElementById('userUsername').innerText = '@' + currentUser;
            document.getElementById('userAvatar').innerHTML = currentUserData?.avatar || '👤';
        }
        
        // Авторизация
        function login() {
            const login = document.getElementById('login').value.trim();
            const password = document.getElementById('password').value.trim();
            if (!login || !password) {
                document.getElementById('authError').innerText = 'Заполните все поля';
                return;
            }
            socket.emit('login', { login, password }, (res) => {
                if (res.success) {
                    currentUser = login;
                    currentUserData = res.userData;
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('mainApp').style.display = 'flex';
                    updateProfileUI();
                    loadData();
                } else {
                    document.getElementById('authError').innerText = res.error;
                }
            });
        }
        
        function register() {
            const login = document.getElementById('regLogin').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            const name = document.getElementById('regName').value.trim();
            if (!login || !password) {
                document.getElementById('authError').innerText = 'Заполните логин и пароль';
                return;
            }
            socket.emit('register', { login, password, name }, (res) => {
                if (res.success) {
                    document.getElementById('authError').className = 'success-msg';
                    document.getElementById('authError').innerText = '✅ Регистрация успешна! Теперь войдите.';
                    showLogin();
                    document.getElementById('regLogin').value = '';
                    document.getElementById('regPassword').value = '';
                    document.getElementById('regName').value = '';
                } else {
                    document.getElementById('authError').className = 'error-msg';
                    document.getElementById('authError').innerText = res.error;
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
        
        function loadData() {
            socket.emit('getRooms', (rooms) => {
                allRooms = rooms;
                renderRooms();
            });
            socket.emit('getUsers', (users) => {
                allUsers = users.filter(u => u !== currentUser);
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
            const usersData = window.usersProfiles || {};
            container.innerHTML = allUsers.map(user => {
                const userData = usersData[user] || {};
                return '<div class="user-item' + (currentChat === 'user:' + user ? ' active' : '') + '" onclick="startPrivateChat(\\'' + user + '\\')">' +
                    '<span class="user-avatar">' + (userData.avatar || '👤') + '</span>' +
                    '<span>' + (userData.name || user) + '</span>' +
                    '<span class="user-status status-online">🟢</span></div>';
            }).join('');
        }
        
        window.usersProfiles = {};
        socket.on('users list with profiles', (profiles) => {
            profiles.forEach(p => { window.usersProfiles[p.username] = p; });
            allUsers = profiles.filter(p => p.username !== currentUser).map(p => p.username);
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
            const userData = window.usersProfiles[userName] || {};
            document.getElementById('currentChatTitle').innerHTML = '💬 ' + (userData.name || userName);
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
                const userData = window.usersProfiles[msg.from] || {};
                const name = userData.name || msg.from;
                if (msg.type === 'private') showNotification(name, msg.text);
                else if (msg.type === 'room' && currentChatTarget !== msg.room) showNotification('Чат ' + msg.room, name + ': ' + msg.text);
            }
        });
        
        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (msg.from === currentUser) div.className += ' my-message';
            const userData = window.usersProfiles[msg.from] || {};
            const displayName = userData.name || msg.from;
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(displayName) + '</div><div class="message-text">' + escapeHtml(msg.text) + '</div><div class="message-time">' + msg.time + '</div></div>';
            messagesDiv.appendChild(div);
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
            if (window.usersProfiles[data.username]) {
                window.usersProfiles[data.username] = data;
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

    // РЕГИСТРАЦИЯ
    socket.on('register', (data, callback) => {
        const { login, password, name } = data;
        
        if (!login || !password) {
            callback({ success: false, error: 'Заполните логин и пароль' });
            return;
        }
        
        if (users[login]) {
            callback({ success: false, error: 'Пользователь с таким логином уже существует' });
        } else {
            users[login] = { 
                password: password, 
                name: name || login,
                username: login,
                avatar: '👤',
                bio: '',
                status: 'online',
                lastSeen: new Date()
            };
            console.log('✅ Новый пользователь: ' + login);
            callback({ success: true });
            sendProfileList();
        }
    });

    // ВХОД
    socket.on('login', (data, callback) => {
        const { login, password } = data;
        
        if (!users[login]) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (users[login].password !== password) {
            callback({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = login;
            usersOnline.set(socket.id, currentUser);
            users[login].status = 'online';
            users[login].lastSeen = new Date();
            console.log('🔐 Вход: ' + login);
            callback({ success: true, userData: users[login] });
            sendUserList();
            sendProfileList();
        }
    });

    // ОБНОВЛЕНИЕ ПРОФИЛЯ
    socket.on('update profile', (data, callback) => {
        if (users[data.login]) {
            if (data.name !== undefined) users[data.login].name = data.name;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.avatar !== undefined) users[data.login].avatar = data.avatar;
            if (data.password) users[data.login].password = data.password;
            callback({ success: true, userData: users[data.login] });
            io.emit('profile updated', users[data.login]);
            sendProfileList();
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
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            usersOnline.delete(socket.id);
            users[currentUser].status = 'away';
            users[currentUser].lastSeen = new Date();
            sendUserList();
            sendProfileList();
            console.log('❌ Отключение: ' + currentUser);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ATOMGRAM запущен на порту ' + PORT);
    console.log('📝 База пользователей пустая. Регистрируйтесь!');
});
