const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Раздаём статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Для всех остальных запросов отдаём index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const messages = [];
const users = new Map();

io.on('connection', (socket) => {
    console.log('✅ Пользователь подключился');
    
    socket.on('user join', (username) => {
        socket.username = username;
        users.set(socket.id, username);
        socket.emit('chat history', messages);
        io.emit('user joined', username);
        console.log(`👤 ${username} вошёл в чат`);
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
        console.log(`💬 ${socket.username}: ${text}`);
    });
    
    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.id);
            io.emit('user left', socket.username);
            console.log(`❌ ${socket.username} покинул чат`);
        }
    });
});

// ГЛАВНОЕ: слушаем порт из переменной окружения PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер мессенджера запущен на порту ${PORT}`);
});
