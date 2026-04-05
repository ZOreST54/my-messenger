const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

app.use(express.static('public'));

const messages = [];
const users = new Map();

io.on('connection', (socket) => {
    console.log('✅ Подключение');
    
    socket.on('user join', (username) => {
        socket.username = username;
        users.set(socket.id, username);
        socket.emit('chat history', messages);
        io.emit('user joined', username);
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
    });
    
    socket.on('disconnect', () => {
        if (socket.username) {
            users.delete(socket.id);
            io.emit('user left', socket.username);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер на порту ${PORT}`);
});
