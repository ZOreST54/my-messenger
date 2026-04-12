const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// ========== ДАННЫЕ ==========
const DATA_FILE = path.join(__dirname, 'data.json');
const AVATAR_DIR = path.join(__dirname, 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

let users = {};
let privateChats = {};
let channels = {};
let stories = {};
let savedMessages = {};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = data.users || {};
            privateChats = data.privateChats || {};
            channels = data.channels || {};
            stories = data.stories || {};
            savedMessages = data.savedMessages || {};
            console.log('✅ Данные загружены');
        }
    } catch (e) { console.log('Ошибка загрузки:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, stories, savedMessages }, null, 2));
        console.log('💾 Данные сохранены');
    } catch (e) { console.log('Ошибка сохранения:', e); }
}

loadData();
setInterval(saveData, 10000);

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

app.use('/avatars', express.static(AVATAR_DIR));

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
const usersOnline = new Map();
const userPublicKeys = {};

function getSocketByUsername(username) {
    for (let [id, user] of usersOnline.entries()) {
        if (user === username) return io.sockets.sockets.get(id);
    }
    return null;
}

function sendProfileList() {
    const profiles = Object.keys(users).map(login => ({
        username: login,
        name: users[login].name,
        surname: users[login].surname,
        avatar: users[login].avatar,
        avatarType: users[login].avatarType,
        avatarData: users[login].avatarData
    }));
    io.emit('users list with profiles', profiles);
}

function getActiveStories() {
    const activeStories = [];
    const now = Date.now();
    for (const [username, userStories] of Object.entries(stories)) {
        if (userStories && userStories.length > 0 && users[username]) {
            const latestStory = userStories[userStories.length - 1];
            if (now - latestStory.time < 86400000) { // 24 часа
                activeStories.push({
                    username,
                    name: users[username]?.name || username,
                    avatar: users[username]?.avatar,
                    avatarType: users[username]?.avatarType,
                    avatarData: users[username]?.avatarData
                });
            }
        }
    }
    return activeStories;
}

function sendStoriesToUser(socket) {
    socket.emit('stories update', getActiveStories());
}

// ========== СОКЕТЫ ==========
io.on('connection', (socket) => {
    let currentUser = null;

    // Регистрация
    socket.on('register', (data, cb) => {
        const { username, name, surname, password } = data;
        if (users[username]) {
            cb({ success: false, error: 'Username занят' });
        } else {
            users[username] = {
                username,
                password,
                name: name || '',
                surname: surname || '',
                bio: '',
                avatar: '👤',
                avatarType: 'emoji',
                avatarData: null,
                friends: [],
                friendRequests: [],
                banned: []
            };
            saveData();
            cb({ success: true });
            sendProfileList();
        }
    });

    // Логин
    socket.on('login', (data, cb) => {
        const { username, password } = data;
        if (!users[username]) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (users[username].password !== password) {
            cb({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            usersOnline.set(socket.id, username);
            cb({
                success: true,
                userData: {
                    username: users[username].username,
                    name: users[username].name,
                    surname: users[username].surname,
                    bio: users[username].bio,
                    avatar: users[username].avatar,
                    avatarType: users[username].avatarType,
                    avatarData: users[username].avatarData
                }
            });
            socket.emit('friends update', {
                friends: users[username].friends || [],
                requests: users[username].friendRequests || [],
                banned: users[username].banned || []
            });
            socket.emit('public keys update', userPublicKeys);
            sendProfileList();
            sendStoriesToUser(socket);
            socket.emit('channels update', Object.keys(channels));
        }
    });

    // Сохранение публичного ключа
    socket.on('save public key', (data) => {
        const { publicKey } = data;
        if (currentUser && publicKey) {
            userPublicKeys[currentUser] = publicKey;
            if (users[currentUser]) users[currentUser].publicKey = publicKey;
            saveData();
            io.emit('public keys update', userPublicKeys);
        }
    });

    socket.on('getPublicKeys', (cb) => {
        cb(userPublicKeys);
    });

    // ========== ИСТОРИИ ==========
    socket.on('add story', (data) => {
        if (!currentUser) return;
        if (!stories[currentUser]) stories[currentUser] = [];
        stories[currentUser].push({
            media: data.media,
            type: data.type,
            time: Date.now()
        });
        if (stories[currentUser].length > 10) stories[currentUser].shift();
        saveData();
        io.emit('stories update', getActiveStories());
    });

    socket.on('get stories', () => {
        sendStoriesToUser(socket);
    });

    socket.on('get story', (username) => {
        if (stories[username] && stories[username].length > 0) {
            const story = stories[username][stories[username].length - 1];
            socket.emit('story data', story);
        }
    });

    // ========== СОХРАНЁННЫЕ СООБЩЕНИЯ ==========
    socket.on('save message', (data) => {
        if (!currentUser) return;
        if (!savedMessages[currentUser]) savedMessages[currentUser] = [];
        savedMessages[currentUser].push({
            id: data.msgId,
            from: data.from,
            text: data.text,
            time: new Date().toLocaleTimeString()
        });
        if (savedMessages[currentUser].length > 200) savedMessages[currentUser].shift();
        saveData();
    });

    socket.on('get saved messages', () => {
        if (savedMessages[currentUser]) {
            socket.emit('saved messages history', savedMessages[currentUser]);
        } else {
            socket.emit('saved messages history', []);
        }
    });

    // ========== АВАТАРЫ ==========
    socket.on('upload avatar', (data, cb) => {
        const { login, avatarData } = data;
        if (users[login]) {
            const filename = login + '_' + Date.now() + '.jpg';
            const filepath = path.join(AVATAR_DIR, filename);
            const base64Data = avatarData.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filepath, base64Data, 'base64');
            users[login].avatarType = 'image';
            users[login].avatarData = '/avatars/' + filename;
            users[login].avatar = null;
            saveData();
            cb({
                success: true,
                userData: {
                    username: users[login].username,
                    name: users[login].name,
                    surname: users[login].surname,
                    bio: users[login].bio,
                    avatar: users[login].avatar,
                    avatarType: users[login].avatarType,
                    avatarData: users[login].avatarData
                }
            });
            io.emit('profile updated', users[login]);
            sendProfileList();
        } else cb({ success: false });
    });

    socket.on('delete avatar', (data, cb) => {
        const { login } = data;
        if (users[login]) {
            if (users[login].avatarData && users[login].avatarType === 'image') {
                const oldFile = path.join(AVATAR_DIR, path.basename(users[login].avatarData));
                if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
            }
            users[login].avatarType = 'emoji';
            users[login].avatarData = null;
            users[login].avatar = '👤';
            saveData();
            cb({
                success: true,
                userData: {
                    username: users[login].username,
                    name: users[login].name,
                    surname: users[login].surname,
                    bio: users[login].bio,
                    avatar: users[login].avatar,
                    avatarType: users[login].avatarType,
                    avatarData: users[login].avatarData
                }
            });
            io.emit('profile updated', users[login]);
            sendProfileList();
        } else cb({ success: false });
    });

    // ========== ДРУЗЬЯ ==========
    socket.on('add friend', (data, cb) => {
        const { friendUsername } = data;
        if (!users[friendUsername]) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (friendUsername === currentUser) {
            cb({ success: false, error: 'Нельзя добавить себя' });
        } else if (users[currentUser].friends?.includes(friendUsername)) {
            cb({ success: false, error: 'Уже в друзьях' });
        } else {
            if (!users[friendUsername].friendRequests) users[friendUsername].friendRequests = [];
            if (users[friendUsername].friendRequests.includes(currentUser)) {
                cb({ success: false, error: 'Запрос уже отправлен' });
            } else {
                users[friendUsername].friendRequests.push(currentUser);
                saveData();
                cb({ success: true, message: '✅ Запрос в друзья отправлен!' });
                const friendSocket = getSocketByUsername(friendUsername);
                if (friendSocket) {
                    friendSocket.emit('friends update', {
                        friends: users[friendUsername].friends || [],
                        requests: users[friendUsername].friendRequests || [],
                        banned: users[friendUsername].banned || []
                    });
                    friendSocket.emit('public keys update', userPublicKeys);
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
            socket.emit('friends update', {
                friends: users[currentUser].friends,
                requests: users[currentUser].friendRequests,
                banned: users[currentUser].banned || []
            });
            socket.emit('public keys update', userPublicKeys);
            const friendSocket = getSocketByUsername(fromUser);
            if (friendSocket) {
                friendSocket.emit('friends update', {
                    friends: users[fromUser].friends,
                    requests: users[fromUser].friendRequests,
                    banned: users[fromUser].banned || []
                });
                friendSocket.emit('public keys update', userPublicKeys);
            }
        }
    });

    socket.on('reject friend', (data) => {
        const { fromUser } = data;
        if (users[currentUser].friendRequests?.includes(fromUser)) {
            users[currentUser].friendRequests = users[currentUser].friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friends update', {
                friends: users[currentUser].friends,
                requests: users[currentUser].friendRequests,
                banned: users[currentUser].banned || []
            });
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
            socket.emit('friends update', {
                friends: users[currentUser].friends,
                requests: users[currentUser].friendRequests,
                banned: users[currentUser].banned || []
            });
        }
    });

    socket.on('unban user', (data) => {
        const { userToUnban } = data;
        if (users[currentUser].banned?.includes(userToUnban)) {
            users[currentUser].banned = users[currentUser].banned.filter(b => b !== userToUnban);
            saveData();
            socket.emit('friends update', {
                friends: users[currentUser].friends,
                requests: users[currentUser].friendRequests,
                banned: users[currentUser].banned || []
            });
        }
    });

    socket.on('getFriends', (cb) => {
        cb({
            friends: users[currentUser]?.friends || [],
            requests: users[currentUser]?.friendRequests || [],
            banned: users[currentUser]?.banned || []
        });
    });

    // ========== КАНАЛЫ ==========
    socket.on('create channel', (data, cb) => {
        const { channelName } = data;
        if (channels[channelName]) {
            cb({ success: false, error: 'Канал уже существует' });
        } else {
            channels[channelName] = { name: channelName, messages: [] };
            saveData();
            cb({ success: true, message: 'Канал создан' });
            io.emit('channels update', Object.keys(channels));
        }
    });

    socket.on('joinChannel', (name) => {
        if (channels[name]) {
            socket.emit('chat history', {
                type: 'channel',
                channel: name,
                messages: channels[name].messages || []
            });
        }
    });

    socket.on('getChannels', (cb) => {
        cb(Object.keys(channels));
    });

    // ========== ПРОФИЛЬ ==========
    socket.on('update profile', (data, cb) => {
        if (users[data.login]) {
            if (data.name !== undefined) users[data.login].name = data.name;
            if (data.surname !== undefined) users[data.login].surname = data.surname;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.avatar !== undefined) {
                users[data.login].avatar = data.avatar;
                users[data.login].avatarType = 'emoji';
                users[data.login].avatarData = null;
            }
            if (data.password) users[data.login].password = data.password;
            saveData();
            cb({
                success: true,
                userData: {
                    username: users[data.login].username,
                    name: users[data.login].name,
                    surname: users[data.login].surname,
                    bio: users[data.login].bio,
                    avatar: users[data.login].avatar,
                    avatarType: users[data.login].avatarType,
                    avatarData: users[data.login].avatarData
                }
            });
            io.emit('profile updated', users[data.login]);
            sendProfileList();
        } else cb({ success: false });
    });

    socket.on('getUserProfile', (username, cb) => {
        if (users[username]) {
            cb({
                name: users[username].name,
                surname: users[username].surname,
                bio: users[username].bio,
                avatar: users[username].avatar,
                avatarType: users[username].avatarType,
                avatarData: users[username].avatarData
            });
        } else cb(null);
    });

    // ========== ЧАТЫ ==========
    socket.on('joinPrivate', (target) => {
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chat history', {
            type: 'private',
            with: target,
            messages: privateChats[id].messages || []
        });
    });

    socket.on('chat message', (data) => {
        const { type, target, text, encrypted, reply } = data;
        const msg = {
            id: Date.now(),
            from: currentUser,
            text,
            time: new Date().toLocaleTimeString(),
            type,
            encrypted: encrypted || false
        };
        if (reply) msg.replyTo = reply;

        if (type === 'private') {
            msg.to = target;
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            io.emit('chat message', msg);
            saveData();
        } else if (type === 'channel') {
            msg.channel = target;
            if (channels[target]) {
                channels[target].messages.push(msg);
                io.emit('chat message', msg);
                saveData();
            }
        }
    });

    socket.on('voice message', (data) => {
        const msg = {
            id: Date.now(),
            from: currentUser,
            audio: data.audio,
            time: new Date().toLocaleTimeString(),
            type: data.type
        };
        if (data.type === 'private') {
            msg.to = data.target;
            const id = [currentUser, data.target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            io.emit('voice message', msg);
            saveData();
        }
    });

    socket.on('video circle', (data) => {
        const msg = {
            id: Date.now(),
            from: currentUser,
            video: data.video,
            time: new Date().toLocaleTimeString(),
            type: data.type
        };
        if (data.type === 'private') {
            msg.to = data.target;
            const id = [currentUser, data.target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            io.emit('video circle', msg);
            saveData();
        }
    });

    socket.on('file attachment', (data) => {
        const msg = {
            id: Date.now(),
            from: currentUser,
            fileName: data.fileName,
            fileType: data.fileType,
            fileData: data.fileData,
            time: new Date().toLocaleTimeString(),
            type: data.type
        };
        if (data.type === 'private') {
            msg.to = data.target;
            const id = [currentUser, data.target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            io.emit('file attachment', msg);
            saveData();
        }
    });

    // Отключение
    socket.on('disconnect', () => {
        if (currentUser) {
            usersOnline.delete(socket.id);
            console.log(`👋 ${currentUser} отключился`);
        }
    });
});

// ========== ЗАПУСК ==========
const PORT = process.env.PORT || 3000;
const ip = getLocalIP();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║        🚀 ATOMGRAM ЗАПУЩЕН             ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║  💻 http://localhost:${PORT}                  ║`);
    console.log(`║  📱 http://${ip}:${PORT}                 ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║  ✅ Все фишки Telegram:                  ║`);
    console.log(`║  🔐 Сквозное шифрование (E2EE)          ║`);
    console.log(`║  📸 Истории (как в Telegram)           ║`);
    console.log(`║  ⭐ Сохранённые сообщения               ║`);
    console.log(`║  💬 Ответы на сообщения (Reply)         ║`);
    console.log(`║  🎥 Видеокружки                        ║`);
    console.log(`║  🎤 Голосовые сообщения                ║`);
    console.log(`║  📎 Файлы и изображения                ║`);
    console.log(`║  👥 Друзья, каналы, чаты               ║`);
    console.log(`║  🌓 Тёмная/светлая тема                ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);
});
