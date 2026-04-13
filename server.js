const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

// Данные
const users = new Map();
const messages = new Map();

function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

function findSocketByUsername(username) {
    for (const [id, socket] of io.sockets.sockets) {
        if (socket.username === username) return socket;
    }
    return null;
}

// HTML страница
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM - Мессенджер</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
            background: #0a0a0f;
            color: #ffffff;
            height: 100vh;
            overflow: hidden;
        }

        /* Анимации */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        /* Экран авторизации */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .auth-card {
            background: rgba(255, 255, 255, 0.98);
            padding: 40px 32px;
            border-radius: 32px;
            width: 90%;
            max-width: 380px;
            text-align: center;
            animation: fadeIn 0.4s ease;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .auth-card h1 {
            font-size: 36px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .auth-card .subtitle {
            color: #666;
            margin-bottom: 32px;
            font-size: 14px;
        }

        .auth-card input {
            width: 100%;
            padding: 14px 16px;
            margin: 8px 0;
            border: 1px solid #e0e0e0;
            border-radius: 16px;
            font-size: 16px;
            transition: all 0.2s;
        }

        .auth-card input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102,126,234,0.2);
        }

        .auth-card button {
            width: 100%;
            padding: 14px;
            margin-top: 16px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .auth-card button:hover {
            transform: translateY(-1px);
        }

        .switch-btn {
            background: #f0f0f0 !important;
            color: #333 !important;
        }

        .error-msg {
            color: #ff4444;
            margin-top: 16px;
            font-size: 14px;
        }

        /* Основное приложение */
        .app {
            display: none;
            height: 100vh;
            background: #0a0a0f;
        }

        /* Шапка */
        .header {
            background: #1a1a1e;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid #2a2a2e;
        }

        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: white;
            display: none;
        }

        .logo {
            font-size: 20px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .online-badge {
            margin-left: auto;
            font-size: 12px;
            color: #4ade80;
        }

        /* Контейнер */
        .container {
            display: flex;
            height: calc(100vh - 60px);
        }

        /* Боковая панель */
        .sidebar {
            width: 300px;
            background: #1a1a1e;
            border-right: 1px solid #2a2a2e;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease;
        }

        .sidebar.mobile {
            position: fixed;
            left: -300px;
            top: 60px;
            height: calc(100vh - 60px);
            z-index: 200;
        }

        .sidebar.mobile.open {
            left: 0;
        }

        .overlay {
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 199;
            display: none;
        }

        .overlay.open {
            display: block;
        }

        /* Профиль */
        .profile {
            padding: 24px 20px;
            text-align: center;
            border-bottom: 1px solid #2a2a2e;
        }

        .avatar {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 12px;
        }

        .profile-name {
            font-size: 18px;
            font-weight: 600;
        }

        .profile-username {
            font-size: 12px;
            color: #888;
            margin-top: 4px;
        }

        /* Навигация */
        .nav-item {
            padding: 14px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .nav-item:hover {
            background: #2a2a2e;
        }

        .section-title {
            padding: 16px 20px 8px;
            font-size: 11px;
            color: #667eea;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .users-list, .chats-list {
            flex: 1;
            overflow-y: auto;
        }

        .user-item, .chat-item {
            padding: 12px 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: background 0.2s;
            border-bottom: 1px solid #2a2a2e;
        }

        .user-item:hover, .chat-item:hover {
            background: #2a2a2e;
        }

        .user-avatar {
            width: 40px;
            height: 40px;
            background: #2a2a2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }

        .user-info {
            flex: 1;
        }

        .user-name {
            font-weight: 500;
            font-size: 15px;
        }

        .user-status {
            font-size: 11px;
            color: #4ade80;
            margin-top: 2px;
        }

        .user-status.offline {
            color: #888;
        }

        /* Область чата */
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #0f0f14;
        }

        .chat-header {
            padding: 16px 24px;
            background: #1a1a1e;
            border-bottom: 1px solid #2a2a2e;
        }

        .chat-title {
            font-size: 18px;
            font-weight: 600;
        }

        .chat-status {
            font-size: 12px;
            color: #4ade80;
            margin-top: 4px;
        }

        /* Сообщения */
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .message {
            display: flex;
            max-width: 70%;
            animation: fadeIn 0.3s ease;
        }

        .message.mine {
            align-self: flex-end;
        }

        .message-bubble {
            padding: 10px 16px;
            border-radius: 20px;
            background: #2a2a2e;
        }

        .message.mine .message-bubble {
            background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .message-name {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
            color: #aaa;
        }

        .message-text {
            font-size: 15px;
            line-height: 1.4;
        }

        .message-time {
            font-size: 10px;
            color: #888;
            margin-top: 4px;
            text-align: right;
        }

        /* Панель ввода */
        .input-area {
            padding: 16px 24px;
            background: #1a1a1e;
            border-top: 1px solid #2a2a2e;
            display: flex;
            gap: 12px;
        }

        .input-area input {
            flex: 1;
            padding: 12px 18px;
            background: #2a2a2e;
            border: none;
            border-radius: 28px;
            color: white;
            font-size: 15px;
        }

        .input-area input:focus {
            outline: none;
        }

        .input-area button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border: none;
            border-radius: 28px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .input-area button:hover {
            transform: scale(1.02);
        }

        /* Адаптив */
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -300px;
                top: 60px;
                height: calc(100vh - 60px);
                z-index: 200;
            }
            .sidebar.open {
                left: 0;
            }
            .menu-btn {
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
    </style>
</head>
<body>

<!-- Экран авторизации -->
<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div class="subtitle">Быстрый и безопасный мессенджер</div>
        
        <div id="loginPanel">
            <input type="text" id="loginUsername" placeholder="Username">
            <input type="password" id="loginPassword" placeholder="Пароль">
            <button onclick="login()">Войти</button>
            <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
        </div>
        
        <div id="registerPanel" style="display:none">
            <input type="text" id="regUsername" placeholder="Username">
            <input type="text" id="regName" placeholder="Ваше имя">
            <input type="password" id="regPassword" placeholder="Пароль">
            <button onclick="register()">Зарегистрироваться</button>
            <button class="switch-btn" onclick="showLogin()">Назад</button>
        </div>
        
        <div id="authError" class="error-msg"></div>
    </div>
</div>

<!-- Основное приложение -->
<div class="app" id="mainApp">
    <div class="header">
        <button class="menu-btn" onclick="toggleSidebar()">☰</button>
        <div class="logo">⚡ ATOMGRAM</div>
        <div class="online-badge" id="onlineBadge">● Онлайн</div>
    </div>
    
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        
        <div class="sidebar" id="sidebar">
            <div class="profile">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-username" id="userLogin">@</div>
            </div>
            
            <div class="section-title">ДРУЗЬЯ</div>
            <div class="users-list" id="friendsList"></div>
            
            <div class="section-title">ВСЕ ПОЛЬЗОВАТЕЛИ</div>
            <div class="users-list" id="usersList"></div>
        </div>
        
        <div class="chat-area">
            <div class="chat-header">
                <div class="chat-title" id="chatTitle">Выберите чат</div>
                <div class="chat-status" id="chatStatus"></div>
            </div>
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">📤 Отправить</button>
            </div>
        </div>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
    const socket = io();
    
    let currentUser = null;
    let currentChat = null;
    let allUsers = [];
    let allFriends = [];
    
    // Авторизация
    function login() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        
        if (!username || !password) {
            document.getElementById('authError').innerText = 'Заполните все поля';
            return;
        }
        
        socket.emit('login', { username, password }, (res) => {
            if (res.success) {
                currentUser = res.userData.username;
                document.getElementById('authScreen').style.display = 'none';
                document.getElementById('mainApp').style.display = 'flex';
                document.getElementById('userName').innerText = res.userData.name;
                document.getElementById('userLogin').innerText = '@' + res.userData.username;
                allFriends = res.userData.friends || [];
                loadUsers();
            } else {
                document.getElementById('authError').innerText = res.error;
            }
        });
    }
    
    function register() {
        const username = document.getElementById('regUsername').value.trim();
        const name = document.getElementById('regName').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        
        if (!username || !password) {
            document.getElementById('authError').innerText = 'Заполните все поля';
            return;
        }
        
        socket.emit('register', { username, name, password }, (res) => {
            if (res.success) {
                document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.';
                showLogin();
            } else {
                document.getElementById('authError').innerText = res.error;
            }
        });
    }
    
    function showRegister() {
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('registerPanel').style.display = 'block';
        document.getElementById('authError').innerText = '';
    }
    
    function showLogin() {
        document.getElementById('loginPanel').style.display = 'block';
        document.getElementById('registerPanel').style.display = 'none';
        document.getElementById('authError').innerText = '';
    }
    
    function loadUsers() {
        socket.emit('get_users', (users) => {
            allUsers = users;
            renderUsers();
        });
    }
    
    function renderUsers() {
        const friendsContainer = document.getElementById('friendsList');
        const usersContainer = document.getElementById('usersList');
        
        // Рендер друзей
        let friendsHtml = '';
        allFriends.forEach(friend => {
            const user = allUsers.find(u => u.username === friend);
            friendsHtml += \`
                <div class="user-item" onclick="openChat('\${friend}')">
                    <div class="user-avatar">👤</div>
                    <div class="user-info">
                        <div class="user-name">\${user ? user.name : friend}</div>
                        <div class="user-status \${user && user.online ? '' : 'offline'}">\${user && user.online ? '● Онлайн' : '○ Офлайн'}</div>
                    </div>
                </div>
            \`;
        });
        friendsContainer.innerHTML = friendsHtml || '<div style="padding:20px; text-align:center; color:#888;">Нет друзей</div>';
        
        // Рендер всех пользователей (кроме друзей и себя)
        let usersHtml = '';
        allUsers.forEach(user => {
            if (user.username !== currentUser && !allFriends.includes(user.username)) {
                usersHtml += \`
                    <div class="user-item" onclick="addFriend('\${user.username}')">
                        <div class="user-avatar">👤</div>
                        <div class="user-info">
                            <div class="user-name">\${user.name}</div>
                            <div class="user-status \${user.online ? '' : 'offline'}">\${user.online ? '● Онлайн' : '○ Офлайн'}</div>
                        </div>
                        <button style="background:#667eea; border:none; padding:6px 12px; border-radius:20px; color:white; cursor:pointer;">➕</button>
                    </div>
                \`;
            }
        });
        usersContainer.innerHTML = usersHtml || '<div style="padding:20px; text-align:center; color:#888;">Нет пользователей</div>';
    }
    
    function openChat(username) {
        currentChat = username;
        document.getElementById('chatTitle').innerHTML = username;
        
        const user = allUsers.find(u => u.username === username);
        document.getElementById('chatStatus').innerHTML = user && user.online ? '● Онлайн' : '○ Офлайн';
        
        socket.emit('get_history', username, (history) => {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = '';
            history.forEach(msg => addMessage(msg));
        });
        
        closeSidebar();
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text || !currentChat) return;
        
        socket.emit('send_message', { to: currentChat, text: text }, (res) => {
            if (res.success) {
                input.value = '';
            }
        });
    }
    
    function addMessage(msg) {
        const messagesDiv = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
        div.innerHTML = \`
            <div class="message-bubble">
                \${msg.from !== currentUser ? '<div class="message-name">' + msg.from + '</div>' : ''}
                <div class="message-text">\${escapeHtml(msg.text)}</div>
                <div class="message-time">\${msg.time}</div>
            </div>
        \`;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function addFriend(username) {
        socket.emit('add_friend', username, (res) => {
            if (res.success) {
                allFriends.push(username);
                renderUsers();
                showToast('Друг добавлен!');
            } else {
                showToast(res.error);
            }
        });
    }
    
    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('overlay').classList.toggle('open');
    }
    
    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    }
    
    function showToast(msg) {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:#333; color:white; padding:12px 24px; border-radius:30px; z-index:1000; animation:fadeIn 0.3s ease;';
        toast.innerText = msg;
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
    
    // События от сервера
    socket.on('users_update', (users) => {
        allUsers = users;
        renderUsers();
    });
    
    socket.on('friends_update', (friends) => {
        allFriends = friends;
        renderUsers();
    });
    
    socket.on('new_message', (msg) => {
        if (currentChat === msg.from || currentChat === msg.to) {
            addMessage(msg);
        }
    });
    
    socket.on('user_online', (username) => {
        if (currentChat === username) {
            document.getElementById('chatStatus').innerHTML = '● Онлайн';
        }
        loadUsers();
    });
    
    socket.on('user_offline', (username) => {
        if (currentChat === username) {
            document.getElementById('chatStatus').innerHTML = '○ Офлайн';
        }
        loadUsers();
    });
</script>
</body>
</html>
    `);
});

// ============ СОКЕТЫ ============
const users = new Map();
const messages = new Map();

function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

function findSocketByUsername(username) {
    for (const [id, socket] of io.sockets.sockets) {
        if (socket.username === username) return socket;
    }
    return null;
}

io.on('connection', (socket) => {
    console.log('🔌 Подключился:', socket.id);
    let currentUser = null;

    // Регистрация
    socket.on('register', (data, callback) => {
        const { username, name, password } = data;
        
        if (users.has(username)) {
            callback({ success: false, error: 'Пользователь уже существует' });
        } else {
            users.set(username, {
                password: password,
                name: name || username,
                friends: [],
                online: true
            });
            console.log('✅ Зарегистрирован:', username);
            callback({ success: true });
        }
    });

    // Вход
    socket.on('login', (data, callback) => {
        const { username, password } = data;
        const user = users.get(username);
        
        if (!user) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (user.password !== password) {
            callback({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            socket.username = username;
            user.online = true;
            
            callback({
                success: true,
                userData: {
                    username: username,
                    name: user.name,
                    friends: user.friends || []
                }
            });
            
            console.log('✅ Вошёл:', username);
            
            // Отправляем список всех пользователей
            const allUsers = Array.from(users.keys())
                .filter(u => u !== username)
                .map(u => ({
                    username: u,
                    name: users.get(u).name,
                    online: users.get(u).online
                }));
            socket.emit('users_update', allUsers);
            
            socket.emit('friends_update', user.friends || []);
            
            // Уведомляем всех
            socket.broadcast.emit('user_online', username);
        }
    });

    // Получить всех пользователей
    socket.on('get_users', (callback) => {
        const allUsers = Array.from(users.keys())
            .filter(u => u !== currentUser)
            .map(u => ({
                username: u,
                name: users.get(u).name,
                online: users.get(u).online
            }));
        callback(allUsers);
    });

    // Получить историю
    socket.on('get_history', (friendUsername, callback) => {
        const chatId = getChatId(currentUser, friendUsername);
        const history = messages.get(chatId) || [];
        callback(history);
    });

    // Отправить сообщение
    socket.on('send_message', (data, callback) => {
        const { to, text } = data;
        const from = currentUser;
        
        if (!from || !to || !text.trim()) {
            callback({ success: false });
            return;
        }
        
        const msg = {
            from: from,
            to: to,
            text: text,
            time: new Date().toLocaleTimeString()
        };
        
        const chatId = getChatId(from, to);
        if (!messages.has(chatId)) {
            messages.set(chatId, []);
        }
        messages.get(chatId).push(msg);
        
        socket.emit('new_message', msg);
        
        const recipientSocket = findSocketByUsername(to);
        if (recipientSocket) {
            recipientSocket.emit('new_message', msg);
        }
        
        callback({ success: true });
    });

    // Добавить друга
    socket.on('add_friend', (friendUsername, callback) => {
        const user = users.get(currentUser);
        
        if (!users.has(friendUsername)) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (user.friends.includes(friendUsername)) {
            callback({ success: false, error: 'Уже в друзьях' });
        } else if (friendUsername === currentUser) {
            callback({ success: false, error: 'Нельзя добавить себя' });
        } else {
            user.friends.push(friendUsername);
            callback({ success: true, message: 'Друг добавлен' });
            socket.emit('friends_update', user.friends);
        }
    });

    // Отключение
    socket.on('disconnect', () => {
        if (currentUser) {
            const user = users.get(currentUser);
            if (user) user.online = false;
            console.log('👋 Отключился:', currentUser);
            socket.broadcast.emit('user_offline', currentUser);
        }
    });
});

// Запуск
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 ATOMGRAM ЗАПУЩЕН НА ${PORT} ПОРТУ      ║
╠════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                  ║
║  📱 Открой на телефоне по IP               ║
╠════════════════════════════════════════════╣
║  ✨ Функции:                               ║
║  💬 Личные сообщения                       ║
║  👥 Друзья                                ║
║  🟢 Онлайн-статус                          ║
║  📱 Адаптивный дизайн                      ║
║  💾 История сообщений                      ║
╚════════════════════════════════════════════╝
    `);
});
