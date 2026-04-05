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
let users = {};
let privateChats = {};
let publicRooms = { general: { messages: [], users: [] } };

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = data.users || {};
            privateChats = data.privateChats || {};
            publicRooms = data.publicRooms || { general: { messages: [], users: [] } };
        }
    } catch(e) { console.log('Ошибка загрузки'); }
}
loadData();

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, publicRooms }, null, 2));
}
setInterval(saveData, 30000);

// Добавляем бота
if (!users["assistant"]) {
    users["assistant"] = {
        password: "bot123",
        name: "ИИ Ассистент",
        username: "assistant",
        avatar: "🤖",
        bio: "ИИ помощник",
        isBot: true
    };
    saveData();
}

// ИИ-бот
function aiBotResponse(msg, userName) {
    const m = msg.toLowerCase();
    if (m.includes('привет')) return `Привет, ${userName}! 👋`;
    if (m.includes('помощь')) return `🤖 Команды: погода, новости, шутка, время`;
    if (m.includes('погода')) return `🌤️ +18°C, солнечно`;
    if (m.includes('новости')) return `📰 ATOMGRAM обновился!`;
    if (m.includes('шутка')) return `Почему программисты любят кофе? ☕`;
    if (m.includes('время')) return `⏰ ${new Date().toLocaleTimeString()}`;
    return `Напиши "помощь" для команд 🤖`;
}

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial; background: #0a0a0a; height: 100vh; display: flex; justify-content: center; align-items: center; }
        
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
            cursor: pointer;
        }
        .switch-btn { background: transparent !important; border: 1px solid #667eea !important; }
        .error-msg { color: #ff6b6b; margin-top: 10px; }
        .success-msg { color: #4ade80; margin-top: 10px; }
        
        #mainApp {
            display: none;
            width: 100%;
            height: 100vh;
            flex-direction: column;
        }
        .chat-header {
            padding: 20px;
            background: #1a1a2e;
            color: white;
            text-align: center;
        }
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
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
        .message-username { font-size: 11px; color: #a0a0c0; }
        .input-area {
            display: flex;
            padding: 20px;
            background: #1a1a2e;
            gap: 10px;
        }
        .input-area input {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 25px;
            background: #2a2a3e;
            color: white;
        }
        .input-area button {
            padding: 12px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
        }
        .users-list {
            padding: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .user-item {
            padding: 10px;
            margin: 5px;
            border-radius: 15px;
            cursor: pointer;
            color: #ccc;
            display: inline-block;
            background: #2a2a3e;
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
        <div class="chat-header">
            <span>⚡ ATOMGRAM</span>
            <div style="font-size:12px; margin-top:5px;" id="currentUserLabel"></div>
        </div>
        <div class="users-list" id="usersList"></div>
        <div class="messages-area" id="messages"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Введите сообщение...">
            <button onclick="sendMessage()">📤</button>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let currentUser = null;
        let currentChatTarget = null;
        let allUsers = [];
        
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
                    document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.';
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
        
        function login() {
            const login = document.getElementById('login').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!login || !password) {
                document.getElementById('authError').innerText = 'Заполните поля';
                return;
            }
            
            socket.emit('login', { login, password }, (res) => {
                if (res.success) {
                    currentUser = login;
                    document.getElementById('currentUserLabel').innerText = currentUser;
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('mainApp').style.display = 'flex';
                    loadUsers();
                } else {
                    document.getElementById('authError').innerText = res.error;
                }
            });
        }
        
        function loadUsers() {
            socket.emit('getUsers', (users) => {
                allUsers = users.filter(u => u !== currentUser);
                renderUsers();
            });
        }
        
        function renderUsers() {
            const container = document.getElementById('usersList');
            container.innerHTML = '<strong style="color:#667eea;">💬 ОНЛАЙН:</strong><br>';
            allUsers.forEach(user => {
                container.innerHTML += '<div class="user-item" onclick="startChat(\\'' + user + '\\')">👤 ' + user + '</div>';
            });
            container.innerHTML += '<div class="user-item" onclick="startChat(\\'assistant\\')">🤖 assistant (бот)</div>';
        }
        
        function startChat(userName) {
            currentChatTarget = userName;
            document.getElementById('messages').innerHTML = '';
            socket.emit('joinPrivate', userName);
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text || !currentChatTarget) return;
            socket.emit('chat message', { target: currentChatTarget, text });
            input.value = '';
        }
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        socket.on('chat history', (data) => {
            if (data.with === currentChatTarget) {
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                data.messages.forEach(msg => addMessage(msg));
                scrollToBottom();
            }
        });
        
        socket.on('chat message', (msg) => {
            if ((msg.to === currentChatTarget && msg.from === currentUser) || 
                (msg.from === currentChatTarget && msg.to === currentUser)) {
                addMessage(msg);
                scrollToBottom();
            }
        });
        
        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (msg.from === currentUser) div.className += ' my-message';
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(msg.from) + '</div><div>' + escapeHtml(msg.text) + '</div><div style="font-size:10px; color:#888;">' + msg.time + '</div></div>';
            messagesDiv.appendChild(div);
        }
        
        socket.on('users update', (users) => {
            allUsers = users.filter(u => u !== currentUser);
            renderUsers();
        });
        
        function scrollToBottom() {
            const msgs = document.getElementById('messages');
            msgs.scrollTop = msgs.scrollHeight;
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

// ========== СЕРВЕР ==========
const usersOnline = new Map();

io.on('connection', (socket) => {
    let currentUser = null;

    // РЕГИСТРАЦИЯ
    socket.on('register', (data, callback) => {
        const { login, password, name } = data;
        console.log('Регистрация:', login);
        
        if (!login || !password) {
            callback({ success: false, error: 'Заполните поля' });
            return;
        }
        
        if (users[login]) {
            callback({ success: false, error: 'Логин уже существует' });
        } else {
            users[login] = {
                password: password,
                name: name || login,
                username: login,
                avatar: '👤',
                bio: '',
                isBot: false
            };
            saveData();
            console.log('✅ Зарегистрирован:', login);
            callback({ success: true });
            sendProfileList();
        }
    });

    // ВХОД
    socket.on('login', (data, callback) => {
        const { login, password } = data;
        console.log('Вход:', login);
        
        if (!users[login]) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (users[login].password !== password) {
            callback({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = login;
            usersOnline.set(socket.id, currentUser);
            console.log('✅ Вошёл:', login);
            callback({ success: true, userData: users[login] });
            sendUserList();
            sendProfileList();
        }
    });

    socket.on('getUsers', (callback) => {
        callback(Array.from(usersOnline.values()));
    });

    socket.on('joinPrivate', (targetUser) => {
        const chatId = [currentUser, targetUser].sort().join('_');
        if (!privateChats[chatId]) {
            privateChats[chatId] = { messages: [], users: [currentUser, targetUser] };
        }
        socket.emit('chat history', {
            with: targetUser,
            messages: privateChats[chatId].messages || []
        });
    });

    socket.on('chat message', (data) => {
        const { target, text } = data;
        const msg = {
            id: Date.now(),
            from: currentUser,
            to: target,
            text: text,
            time: new Date().toLocaleTimeString()
        };
        
        const chatId = [currentUser, target].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
        privateChats[chatId].messages.push(msg);
        if (privateChats[chatId].messages.length > 100) privateChats[chatId].messages.shift();
        
        io.emit('chat message', msg);
        saveData();
        
        // Ответ бота
        if (target === 'assistant') {
            const botRes = aiBotResponse(text, currentUser);
            if (botRes) {
                setTimeout(() => {
                    const botMsg = {
                        id: Date.now() + 1,
                        from: 'assistant',
                        to: currentUser,
                        text: botRes,
                        time: new Date().toLocaleTimeString()
                    };
                    const botChatId = [currentUser, 'assistant'].sort().join('_');
                    if (!privateChats[botChatId]) privateChats[botChatId] = { messages: [], users: [currentUser, 'assistant'] };
                    privateChats[botChatId].messages.push(botMsg);
                    io.emit('chat message', botMsg);
                    saveData();
                }, 300);
            }
        }
    });

    function sendUserList() {
        io.emit('users update', Array.from(usersOnline.values()));
    }

    function sendProfileList() {
        io.emit('users list with profiles', Object.keys(users).map(l => users[l]));
    }

    socket.on('disconnect', () => {
        if (currentUser) {
            usersOnline.delete(socket.id);
            sendUserList();
            saveData();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ATOMGRAM запущен на порту ' + PORT);
    console.log('📝 Регистрация работает!');
});
