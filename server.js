const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #0a0a0a; height: 100vh; display: flex; justify-content: center; align-items: center; }
        
        /* Экран входа */
        #loginScreen {
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
        .login-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 30px;
            text-align: center;
            width: 90%;
            max-width: 350px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .login-card h1 {
            font-size: 32px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 30px;
        }
        .login-card input {
            width: 100%;
            padding: 14px;
            margin: 10px 0;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            background: rgba(255,255,255,0.9);
            text-align: left;
            direction: ltr;
        }
        .login-card button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
        }
        
        /* Чат */
        #chatContainer {
            display: none;
            width: 100%;
            max-width: 800px;
            height: 95vh;
            background: #1e1e2e;
            border-radius: 30px;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .chat-header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .chat-header span {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
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
            word-wrap: break-word;
            text-align: left;
            direction: ltr;
        }
        .message.my-message {
            align-items: flex-end;
        }
        .message.my-message .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .message-username {
            font-size: 12px;
            font-weight: bold;
            color: #a0a0c0;
            margin-bottom: 4px;
        }
        .message-text {
            font-size: 15px;
            line-height: 1.4;
            text-align: left;
            direction: ltr;
        }
        .message-time {
            font-size: 10px;
            color: #888;
            margin-top: 4px;
            text-align: right;
        }
        .system-message {
            text-align: center;
            color: #888;
            font-style: italic;
            font-size: 12px;
            margin: 10px 0;
        }
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
            font-size: 15px;
            background: #2a2a3e;
            color: white;
            text-align: left;
            direction: ltr;
        }
        .input-area input::placeholder {
            color: #888;
        }
        .input-area button {
            padding: 14px 28px;
            margin-left: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 30px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
        }
        .online-list {
            position: fixed;
            right: 20px;
            top: 100px;
            background: #1a1a2e;
            padding: 15px;
            border-radius: 20px;
            border: 1px solid rgba(255,255,255,0.1);
            min-width: 150px;
            font-size: 13px;
        }
        .online-list h4 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .online-list div {
            color: #4ade80;
            margin: 5px 0;
            padding: 5px;
        }
        @media (max-width: 768px) {
            .online-list { display: none; }
        }
    </style>
</head>
<body>
    <div id="loginScreen">
        <div class="login-card">
            <h1>⚡ ATOMGRAM</h1>
            <input type="text" id="username" placeholder="Введите ваше имя" autocomplete="off">
            <button onclick="join()">Войти</button>
        </div>
    </div>
    
    <div id="chatContainer">
        <div class="chat-header">
            ⚡ <span>ATOMGRAM</span>
        </div>
        <div class="online-list" id="onlineList">
            <h4>📱 Онлайн</h4>
            <div id="usersList"></div>
        </div>
        <div class="messages-area" id="messages"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Введите сообщение..." autocomplete="off">
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
            console.log('✅ Подключено к ATOMGRAM');
        });
        
        function join() {
            const name = document.getElementById('username').value.trim();
            if (!name) {
                alert('Введите имя!');
                return;
            }
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
    console.log('✅ Пользователь подключился к ATOMGRAM');
    
    socket.on('user join', (username) => {
        socket.username = username;
        users.set(socket.id, username);
        socket.emit('chat history', messages);
        io.emit('user joined', username);
        io.emit('user list', Array.from(users.values()));
        console.log('👤 ' + username + ' вошёл в ATOMGRAM');
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
            console.log('❌ ' + socket.username + ' покинул ATOMGRAM');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ATOMGRAM запущен на порту ' + PORT);
});
