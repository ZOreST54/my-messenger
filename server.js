const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

// ========== БАЗА ДАННЫХ ==========
const users = {};           // { "логин": "пароль" }
const usersOnline = new Map(); // socket.id -> логин
const privateChats = {};    // { "user1_user2": { messages: [], users: [] } }
const publicRooms = {};     // { "название": { messages: [], users: [] } }

// Предустановленные данные
users["alex"] = "123";
users["maria"] = "456";
users["john"] = "789";
publicRooms["general"] = { messages: [], users: [] };
publicRooms["games"] = { messages: [], users: [] };

// ========== ВСЕ HTML ==========
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM - Личные чаты</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #0a0a0a; height: 100vh; }
        
        /* Авторизация */
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
            margin-top: 15px !important;
        }
        .error-msg { color: #ff6b6b; margin-top: 10px; font-size: 14px; }
        
        /* Основное приложение */
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
        }
        .sidebar-header h3 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .user-info { font-size: 12px; color: #888; }
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
            transition: all 0.2s;
        }
        .room-item:hover, .user-item:hover { background: rgba(102,126,234,0.2); }
        .room-item.active, .user-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
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
        .message-time { font-size: 9px; color: #888; margin-top: 4px; }
        .input-area {
            display: flex;
            padding: 20px;
            background: #1a1a2e;
            border-top: 1px solid rgba(255,255,255,0.1);
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
            padding: 14px 28px;
            margin-left: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 30px;
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
                <button onclick="register()">Зарегистрироваться</button>
                <button class="switch-btn" onclick="showLogin()">Назад</button>
            </div>
            <div id="authError" class="error-msg"></div>
        </div>
    </div>

    <div id="mainApp">
        <div class="sidebar">
            <div class="sidebar-header">
                <h3>⚡ ATOMGRAM</h3>
                <div class="user-info" id="currentUser"></div>
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
                <button onclick="sendMessage()">Отправить</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let currentUser = null;
        let currentChat = null;     // может быть "room:название" или "user:имя"
        let currentChatType = null;
        let allRooms = [];
        let allUsers = [];

        // Авторизация
        function login() {
            const login = document.getElementById('login').value.trim();
            const password = document.getElementById('password').value.trim();
            socket.emit('login', { login, password }, (res) => {
                if (res.success) {
                    currentUser = login;
                    document.getElementById('currentUser').innerText = currentUser;
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('mainApp').style.display = 'flex';
                    loadData();
                } else {
                    document.getElementById('authError').innerText = res.error;
                }
            });
        }

        function register() {
            const login = document.getElementById('regLogin').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            socket.emit('register', { login, password }, (res) => {
                if (res.success) {
                    showLogin();
                    document.getElementById('authError').innerText = '✅ Регистрация успешна!';
                } else {
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
            container.innerHTML = allUsers.map(user => 
                '<div class="user-item' + (currentChat === 'user:' + user ? ' active' : '') + '" onclick="startPrivateChat(\\'' + user + '\\')">👤 ' + user + '</div>'
            ).join('');
        }

        function joinRoom(roomName) {
            currentChat = 'room:' + roomName;
            currentChatType = 'room';
            socket.emit('joinRoom', roomName);
            document.getElementById('currentChatTitle').innerHTML = '# ' + roomName;
            renderRooms();
            renderUsers();
        }

        function startPrivateChat(userName) {
            currentChat = 'user:' + userName;
            currentChatType = 'private';
            socket.emit('joinPrivate', userName);
            document.getElementById('currentChatTitle').innerHTML = '💬 Личный чат с ' + userName;
            renderRooms();
            renderUsers();
        }

        function createRoom() {
            const newRoom = document.getElementById('newRoomName').value.trim();
            if (!newRoom) return;
            socket.emit('createRoom', newRoom, (success) => {
                if (success) {
                    document.getElementById('newRoomName').value = '';
                    loadData();
                    setTimeout(() => joinRoom(newRoom), 500);
                } else {
                    alert('Чат уже существует!');
                }
            });
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text || !currentChat) return;
            
            if (currentChatType === 'room') {
                const room = currentChat.replace('room:', '');
                socket.emit('chat message', { type: 'room', target: room, text });
            } else if (currentChatType === 'private') {
                const targetUser = currentChat.replace('user:', '');
                socket.emit('chat message', { type: 'private', target: targetUser, text });
            }
            input.value = '';
        }

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Получение истории
        socket.on('chat history', (data) => {
            if ((currentChatType === 'room' && data.type === 'room' && 'room:' + data.room === currentChat) ||
                (currentChatType === 'private' && data.type === 'private' && 'user:' + data.with === currentChat)) {
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                data.messages.forEach(msg => addMessage(msg));
            }
        });

        // Новое сообщение
        socket.on('chat message', (msg) => {
            let shouldShow = false;
            if (msg.type === 'room' && currentChatType === 'room' && 'room:' + msg.room === currentChat) shouldShow = true;
            if (msg.type === 'private' && currentChatType === 'private') {
                if (currentChat === 'user:' + msg.to || currentChat === 'user:' + msg.from) shouldShow = true;
            }
            if (shouldShow) {
                addMessage(msg);
                scrollToBottom();
            }
        });

        // Обновление списка пользователей
        socket.on('users update', (users) => {
            allUsers = users.filter(u => u !== currentUser);
            renderUsers();
        });

        socket.on('rooms update', (rooms) => {
            allRooms = rooms;
            renderRooms();
        });

        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (msg.from === currentUser) div.className += ' my-message';
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(msg.from) + '</div><div class="message-text">' + escapeHtml(msg.text) + '</div><div class="message-time">' + msg.time + '</div></div>';
            messagesDiv.appendChild(div);
        }

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
    let currentPrivateWith = null;

    // Регистрация
    socket.on('register', (data, callback) => {
        if (users[data.login]) {
            callback({ success: false, error: 'Логин уже существует' });
        } else {
            users[data.login] = data.password;
            callback({ success: true });
        }
    });

    // Вход
    socket.on('login', (data, callback) => {
        if (users[data.login] && users[data.login] === data.password) {
            currentUser = data.login;
            usersOnline.set(socket.id, currentUser);
            callback({ success: true });
            io.emit('users update', Array.from(usersOnline.values()));
        } else {
            callback({ success: false, error: 'Неверный логин или пароль' });
        }
    });

    // Получить список общих чатов
    socket.on('getRooms', (callback) => {
        callback(Object.keys(publicRooms));
    });

    // Получить список онлайн пользователей
    socket.on('getUsers', (callback) => {
        callback(Array.from(usersOnline.values()));
    });

    // Создать общий чат
    socket.on('createRoom', (roomName, callback) => {
        if (!publicRooms[roomName]) {
            publicRooms[roomName] = { messages: [], users: [] };
            callback(true);
            io.emit('rooms update', Object.keys(publicRooms));
        } else {
            callback(false);
        }
    });

    // Войти в общий чат
    socket.on('joinRoom', (roomName) => {
        if (currentRoom) {
            socket.leave(currentRoom);
        }
        currentRoom = roomName;
        currentPrivateWith = null;
        socket.join(roomName);
        socket.emit('chat history', {
            type: 'room',
            room: roomName,
            messages: publicRooms[roomName]?.messages || []
        });
    });

    // Начать личный чат
    socket.on('joinPrivate', (targetUser) => {
        currentPrivateWith = targetUser;
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

    // Отправка сообщения
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
            msg.from = currentUser;
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) {
                privateChats[chatId] = { messages: [], users: [currentUser, target] };
            }
            privateChats[chatId].messages.push(msg);
            if (privateChats[chatId].messages.length > 100) privateChats[chatId].messages.shift();
            
            // Отправить обоим участникам
            io.emit('chat message', msg);
        }
    });

    // Отключение
    socket.on('disconnect', () => {
        if (currentUser) {
            usersOnline.delete(socket.id);
            io.emit('users update', Array.from(usersOnline.values()));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ATOMGRAM с личными чатами запущен на порту ' + PORT);
});
