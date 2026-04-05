const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Мой Мессенджер</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial; background: #e5e5e5; height: 100vh; display: flex; justify-content: center; align-items: center; }
        #loginScreen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .login-card { background: white; padding: 40px; border-radius: 20px; text-align: center; width: 90%; max-width: 350px; }
        .login-card input { width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #ddd; border-radius: 10px; font-size: 16px; }
        .login-card button { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer; }
        #chatContainer { display: none; width: 100%; max-width: 600px; height: 90vh; background: white; border-radius: 20px; flex-direction: column; overflow: hidden; }
        .chat-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; background: #f8f9fa; }
        .message { margin-bottom: 15px; }
        .message-content { display: inline-block; max-width: 70%; padding: 10px 15px; border-radius: 18px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .message.my-message { text-align: right; }
        .message.my-message .message-content { background: #667eea; color: white; }
        .message-username { font-size: 12px; font-weight: bold; color: #667eea; }
        .message-time { font-size: 10px; opacity: 0.7; margin-top: 5px; }
        .system-message { text-align: center; color: #999; font-style: italic; margin: 10px 0; }
        .input-area { display: flex; padding: 20px; background: white; border-top: 1px solid #ddd; }
        .input-area input { flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 25px; }
        .input-area button { padding: 12px 20px; margin-left: 10px; background: #667eea; color: white; border: none; border-radius: 25px; cursor: pointer; }
        .online-list { position: fixed; right: 10px; top: 60px; background: white; padding: 10px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-size: 12px; max-width: 150px; }
        .online-list h4 { margin-bottom: 5px; color: #667eea; }
        .online-list div { color: green; margin: 3px 0; }
        @media (max-width: 768px) { .online-list { display: none; } }
    </style>
</head>
<body>
    <div id="loginScreen">
        <div class="login-card">
            <h1>Мой Мессенджер</h1>
            <input type="text" id="username" placeholder="Введите ваше имя">
            <button onclick="join()">Войти</button>
        </div>
    </div>
    <div id="chatContainer">
        <div class="chat-header">📱 Мой Мессенджер</div>
        <div class="online-list" id="onlineList"><h4>Онлайн</h4><div id="usersList"></div></div>
        <div class="messages-area" id="messages"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Введите сообщение...">
            <button onclick="sendMessage()">Отправить</button>
        </div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io({
            transports: ['websocket', 'polling']
        });
        let myName = '';
        
        socket.on('connect', () => {
            console.log('✅ Подключено к серверу');
        });
        
        function join() {
            const name = document.getElementById('username').value.trim();
            if (!name) { alert('Введите имя!'); return; }
            myName = name;
            socket.emit('user join', name);
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('chatContainer').style.display = 'flex';
            document.getElementById('messageInput').focus();
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (text) {
                socket.emit('chat message', text);
                input.value = '';
            }
        }
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        socket.on('chat history', (history) => {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = '';
            history.forEach(msg => addMessage(msg));
        });
        
        socket.on('chat message', (msg) => {
            addMessage(msg);
            scrollToBottom();
        });
        
        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (msg.username === myName) div.className += ' my-message';
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(msg.username) + '</div><div class="message-text">' + escapeHtml(msg.text) + '</div><div class="message-time">' + msg.time + '</div></div>';
            messagesDiv.appendChild(div);
        }
        
        socket.on('user joined', (username) => {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'system-message';
            div.textContent = '✨ ' + username + ' присоединился ✨';
            messagesDiv.appendChild(div);
            scrollToBottom();
        });
        
        socket.on('user left', (username) => {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'system-message';
            div.textContent = '👋 ' + username + ' покинул чат';
            messagesDiv.appendChild(div);
            scrollToBottom();
        });
        
        socket.on('user list', (users) => {
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = users.map(u => '<div>🟢 ' + escapeHtml(u) + '</div>').join('');
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

const messages = [];
const users = new Map();

io.on('connection', (socket) => {
    console.log('✅ Пользователь подключился, ID:', socket.id);
    
    socket.on('user join', (username) => {
        socket.username = username;
        users.set(socket.id, username);
        socket.emit('chat history', messages);
        io.emit('user joined', username);
        io.emit('user list', Array.from(users.values()));
        console.log('👤 ' + username + ' вошёл, всего пользователей: ' + users.size);
    });
    
    socket.on('chat message', (text) => {
        const msg = {
            id: Date.now(),
            username: socket.username,
            text: text,
            time: new Date().toLocaleTimeString()
        };
        messages.push(msg);
        if (messages.length > 100) messages.shift();
        io.emit('chat message', msg);
        console.log('💬 ' + socket.username + ': ' + text);
    });
    
    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.id);
            io.emit('user left', socket.username);
            io.emit('user list', Array.from(users.values()));
            console.log('❌ ' + socket.username + ' вышел, осталось: ' + users.size);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Сервер запущен на порту ' + PORT);
});
