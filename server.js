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

// Данные
let users = {};
let privateChats = {};
let channels = {};
let groups = {};

// Загрузка данных
const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        channels = data.channels || {};
        groups = data.groups || {};
        console.log('✅ Данные загружены');
    } catch(e) { console.log('Ошибка загрузки'); }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, groups }, null, 2));
    console.log('💾 Сохранено');
}
setInterval(saveData, 10000);

// HTML
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: white; height: 100vh; overflow: hidden; }
        
        .auth-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .auth-card { background: rgba(255,255,255,0.95); padding: 40px; border-radius: 28px; width: 90%; max-width: 350px; text-align: center; }
        .auth-card h1 { font-size: 32px; margin-bottom: 30px; color: #333; }
        .auth-card input { width: 100%; padding: 14px; margin: 8px 0; border: 1px solid #ddd; border-radius: 14px; font-size: 16px; }
        .auth-card button { width: 100%; padding: 14px; margin-top: 12px; background: #667eea; color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; }
        .switch-btn { background: #999 !important; }
        .error-msg { color: #ff4444; margin-top: 12px; }
        
        .app { display: none; height: 100vh; display: flex; flex-direction: column; }
        .header { background: #1a1a1e; padding: 15px 20px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #2a2a2e; }
        .menu-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: white; display: none; }
        .logo { font-size: 20px; font-weight: bold; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .online-badge { margin-left: auto; font-size: 12px; color: #4ade80; }
        
        .container { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 280px; background: #1a1a1e; border-right: 1px solid #2a2a2e; display: flex; flex-direction: column; transition: transform 0.3s; }
        .sidebar.mobile { position: fixed; left: -280px; top: 60px; height: calc(100vh - 60px); z-index: 200; }
        .sidebar.mobile.open { left: 0; }
        .overlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 199; display: none; }
        .overlay.open { display: block; }
        
        .profile { padding: 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2e; }
        .avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 12px; }
        .profile-name { font-size: 18px; font-weight: 600; }
        .profile-username { font-size: 12px; color: #888; margin-top: 4px; }
        
        .nav-item { padding: 14px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s; }
        .nav-item:hover { background: #2a2a2e; }
        .section-title { padding: 16px 20px 8px; font-size: 11px; color: #667eea; text-transform: uppercase; }
        .users-list, .chats-list { flex: 1; overflow-y: auto; }
        .user-item, .chat-item { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s; border-bottom: 1px solid #2a2a2e; }
        .user-item:hover, .chat-item:hover { background: #2a2a2e; }
        .user-avatar, .chat-avatar { width: 40px; height: 40px; background: #2a2a2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .user-info, .chat-info { flex: 1; }
        .user-name, .chat-name { font-weight: 500; font-size: 15px; }
        .user-status { font-size: 11px; color: #4ade80; margin-top: 2px; }
        .user-status.offline { color: #888; }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; background: #0f0f14; }
        .chat-header { padding: 16px 24px; background: #1a1a1e; border-bottom: 1px solid #2a2a2e; }
        .chat-title { font-size: 18px; font-weight: 600; }
        .chat-status { font-size: 12px; color: #4ade80; margin-top: 4px; }
        
        .messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .message { display: flex; max-width: 70%; animation: fadeIn 0.3s; }
        .message.mine { align-self: flex-end; }
        .message-bubble { padding: 10px 16px; border-radius: 20px; background: #2a2a2e; }
        .message.mine .message-bubble { background: linear-gradient(135deg, #667eea, #764ba2); }
        .message-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #aaa; }
        .message-text { font-size: 15px; line-height: 1.4; }
        .message-time { font-size: 10px; color: #888; margin-top: 4px; text-align: right; }
        
        .input-area { padding: 16px 24px; background: #1a1a1e; border-top: 1px solid #2a2a2e; display: flex; gap: 12px; }
        .input-area input { flex: 1; padding: 12px 18px; background: #2a2a2e; border: none; border-radius: 28px; color: white; font-size: 15px; }
        .input-area button { padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 28px; color: white; font-weight: 600; cursor: pointer; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        @media (max-width: 768px) {
            .sidebar { position: fixed; left: -280px; top: 60px; height: calc(100vh - 60px); z-index: 200; }
            .sidebar.open { left: 0; }
            .menu-btn { display: block; }
            .message { max-width: 85%; }
        }
        @media (min-width: 769px) { .sidebar { position: relative; left: 0 !important; } }
        
        .toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: #333; padding: 12px 24px; border-radius: 30px; font-size: 14px; z-index: 1000; animation: fadeIn 0.3s; }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div id="loginPanel">
            <input type="text" id="loginUsername" placeholder="Username">
            <input type="password" id="loginPassword" placeholder="Password">
            <button onclick="login()">Login</button>
            <button class="switch-btn" onclick="showRegister()">Create Account</button>
        </div>
        <div id="registerPanel" style="display:none">
            <input type="text" id="regUsername" placeholder="Username">
            <input type="text" id="regName" placeholder="Your name">
            <input type="password" id="regPassword" placeholder="Password">
            <button onclick="register()">Register</button>
            <button class="switch-btn" onclick="showLogin()">Back</button>
        </div>
        <div id="authError" class="error-msg"></div>
    </div>
</div>

<div class="app" id="mainApp">
    <div class="header">
        <button class="menu-btn" onclick="toggleSidebar()">☰</button>
        <div class="logo">⚡ ATOMGRAM</div>
        <div class="online-badge">● Online</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Loading...</div>
                <div class="profile-username" id="userLogin">@</div>
            </div>
            <div class="nav-item" onclick="addFriend()"><span>➕</span> <span>Add Friend</span></div>
            <div class="nav-item" onclick="createGroup()"><span>👥</span> <span>Create Group</span></div>
            <div class="section-title">FRIENDS</div>
            <div class="users-list" id="friendsList"></div>
            <div class="section-title">GROUPS</div>
            <div class="chats-list" id="groupsList"></div>
            <div class="section-title">CHANNELS</div>
            <div class="chats-list" id="channelsList"></div>
            <div class="nav-item" onclick="createChannel()"><span>📢</span> <span>Create Channel</span></div>
        </div>
        
        <div class="chat-area">
            <div class="chat-header">
                <div class="chat-title" id="chatTitle">Select a chat</div>
                <div class="chat-status" id="chatStatus"></div>
            </div>
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Message..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">Send</button>
            </div>
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
let allFriends = [];
let friendRequests = [];
let allGroups = [];
let allChannels = [];

// Auth functions
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) {
        document.getElementById('authError').innerText = 'Fill all fields';
        return;
    }
    socket.emit('login', { username, password }, (res) => {
        if (res.success) {
            currentUser = username;
            currentUserData = res.userData;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
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
        document.getElementById('authError').innerText = 'Fill all fields';
        return;
    }
    socket.emit('register', { username, name, password }, (res) => {
        if (res.success) {
            document.getElementById('authError').innerText = 'Registration successful! Please login.';
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

function updateUI() {
    document.getElementById('userName').innerText = currentUserData?.name || currentUser;
    document.getElementById('userLogin').innerText = '@' + currentUser;
}

function loadData() {
    socket.emit('getFriends', (data) => {
        allFriends = data.friends || [];
        friendRequests = data.requests || [];
        renderFriends();
    });
    socket.emit('getGroups', (groups) => {
        allGroups = groups;
        renderGroups();
    });
    socket.emit('getChannels', (channels) => {
        allChannels = channels;
        renderChannels();
    });
}

function renderFriends() {
    const container = document.getElementById('friendsList');
    let html = '';
    friendRequests.forEach(req => {
        html += '<div class="user-item" style="background:#2a2a4e;"><span>📨 ' + req + '</span><button onclick="acceptFriend(\\'' + req + '\\')" style="margin-left:10px; padding:4px 12px; background:#4ade80; border:none; border-radius:12px; cursor:pointer;">✓</button><button onclick="rejectFriend(\\'' + req + '\\')" style="margin-left:5px; padding:4px 12px; background:#ff4444; border:none; border-radius:12px; cursor:pointer;">✗</button></div>';
    });
    allFriends.forEach(friend => {
        html += '<div class="user-item" onclick="openChat(\\'' + friend + '\\', \\'private\\')"><div class="user-avatar">👤</div><div class="user-info"><div class="user-name">' + friend + '</div></div></div>';
    });
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">No friends</div>';
    container.innerHTML = html;
}

function renderGroups() {
    const container = document.getElementById('groupsList');
    let html = '';
    allGroups.forEach(group => {
        html += '<div class="chat-item" onclick="openChat(\\'' + group.id + '\\', \\'group\\')"><div class="chat-avatar">👥</div><div class="chat-info"><div class="chat-name">' + group.name + '</div></div></div>';
    });
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">No groups</div>';
    container.innerHTML = html;
}

function renderChannels() {
    const container = document.getElementById('channelsList');
    let html = '';
    allChannels.forEach(channel => {
        html += '<div class="chat-item" onclick="openChat(\\'' + channel + '\\', \\'channel\\')"><div class="chat-avatar">📢</div><div class="chat-info"><div class="chat-name">#' + channel + '</div></div></div>';
    });
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">No channels</div>';
    container.innerHTML = html;
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    let title = '';
    if (type === 'private') {
        title = target;
        socket.emit('joinPrivate', target);
    } else if (type === 'group') {
        const group = allGroups.find(g => g.id === target);
        title = group ? group.name : target;
        socket.emit('joinGroup', target);
    } else if (type === 'channel') {
        title = '# ' + target;
        socket.emit('joinChannel', target);
    }
    document.getElementById('chatTitle').innerHTML = title;
    closeSidebar();
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text });
    input.value = '';
}

function addMessage(msg) {
    const messagesDiv = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    div.innerHTML = '<div class="message-bubble">' +
        (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') +
        '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
        '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div>' +
        '</div>';
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addFriend() {
    const username = prompt('Enter username:');
    if (username) {
        socket.emit('addFriend', { friendUsername: username }, (res) => {
            showToast(res.message || res.error);
            loadData();
        });
    }
}

function acceptFriend(from) {
    socket.emit('acceptFriend', { fromUser: from }, () => loadData());
}

function rejectFriend(from) {
    socket.emit('rejectFriend', { fromUser: from }, () => loadData());
}

function createGroup() {
    const name = prompt('Group name:');
    if (name) {
        socket.emit('createGroup', { groupName: name }, (res) => {
            if (res.success) {
                showToast('Group created');
                loadData();
            } else {
                showToast(res.error);
            }
        });
    }
}

function createChannel() {
    const name = prompt('Channel name:');
    if (name) {
        socket.emit('createChannel', { channelName: name }, (res) => {
            if (res.success) {
                showToast('Channel created');
                loadData();
            } else {
                showToast(res.error);
            }
        });
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
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

// Socket events
socket.on('friendsUpdate', (data) => {
    allFriends = data.friends || [];
    friendRequests = data.requests || [];
    renderFriends();
});

socket.on('groupsUpdate', (groups) => {
    allGroups = groups;
    renderGroups();
});

socket.on('channelsUpdate', (channels) => {
    allChannels = channels;
    renderChannels();
});

socket.on('chatHistory', (data) => {
    if (currentChatTarget === data.target) {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        data.messages.forEach(msg => addMessage(msg));
    }
});

socket.on('newMessage', (msg) => {
    if (currentChatTarget === msg.target || currentChatTarget === msg.from) {
        addMessage(msg);
    }
});

socket.on('userOnline', (username) => {
    if (currentChatTarget === username) {
        document.getElementById('chatStatus').innerHTML = 'Online';
    }
});

socket.on('userOffline', (username) => {
    if (currentChatTarget === username) {
        document.getElementById('chatStatus').innerHTML = 'Offline';
    }
});
</script>
</body>
</html>
    `);
});

// ========== SOCKET HANDLERS ==========
const usersData = {};
const userSockets = new Map();

function getSocketByUsername(username) {
    for (const [id, user] of userSockets) {
        if (user === username) return io.sockets.sockets.get(id);
    }
    return null;
}

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentUser = null;

    // Register
    socket.on('register', (data, callback) => {
        const { username, name, password } = data;
        if (users[username]) {
            callback({ success: false, error: 'Username already exists' });
        } else {
            users[username] = {
                username: username,
                name: name || username,
                password: password,
                friends: [],
                friendRequests: []
            };
            saveData();
            callback({ success: true });
            console.log('Registered:', username);
        }
    });

    // Login
    socket.on('login', (data, callback) => {
        const { username, password } = data;
        const user = users[username];
        if (!user) {
            callback({ success: false, error: 'User not found' });
        } else if (user.password !== password) {
            callback({ success: false, error: 'Wrong password' });
        } else {
            currentUser = username;
            socket.username = username;
            userSockets.set(socket.id, username);
            callback({
                success: true,
                userData: {
                    username: user.username,
                    name: user.name
                }
            });
            console.log('Logged in:', username);
            
            socket.emit('friendsUpdate', {
                friends: user.friends || [],
                requests: user.friendRequests || []
            });
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(username)));
            socket.emit('channelsUpdate', Object.keys(channels));
            socket.broadcast.emit('userOnline', username);
        }
    });

    // Get friends
    socket.on('getFriends', (callback) => {
        if (currentUser && users[currentUser]) {
            callback({
                friends: users[currentUser].friends || [],
                requests: users[currentUser].friendRequests || []
            });
        } else {
            callback({ friends: [], requests: [] });
        }
    });

    // Get groups
    socket.on('getGroups', (callback) => {
        if (currentUser) {
            callback(Object.values(groups).filter(g => g.members.includes(currentUser)));
        } else {
            callback([]);
        }
    });

    // Get channels
    socket.on('getChannels', (callback) => {
        callback(Object.keys(channels));
    });

    // Add friend
    socket.on('addFriend', (data, callback) => {
        const { friendUsername } = data;
        const user = users[currentUser];
        const friend = users[friendUsername];
        
        if (!friend) {
            callback({ success: false, error: 'User not found' });
        } else if (friendUsername === currentUser) {
            callback({ success: false, error: 'Cannot add yourself' });
        } else if (user.friends.includes(friendUsername)) {
            callback({ success: false, error: 'Already friends' });
        } else if (friend.friendRequests.includes(currentUser)) {
            callback({ success: false, error: 'Request already sent' });
        } else {
            friend.friendRequests.push(currentUser);
            saveData();
            callback({ success: true, message: 'Friend request sent' });
            
            const friendSocket = getSocketByUsername(friendUsername);
            if (friendSocket) {
                friendSocket.emit('friendsUpdate', {
                    friends: friend.friends || [],
                    requests: friend.friendRequests || []
                });
            }
        }
    });

    // Accept friend
    socket.on('acceptFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        const from = users[fromUser];
        
        if (user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            if (!user.friends) user.friends = [];
            if (!from.friends) from.friends = [];
            user.friends.push(fromUser);
            from.friends.push(currentUser);
            saveData();
            
            socket.emit('friendsUpdate', {
                friends: user.friends,
                requests: user.friendRequests
            });
            
            const fromSocket = getSocketByUsername(fromUser);
            if (fromSocket) {
                fromSocket.emit('friendsUpdate', {
                    friends: from.friends,
                    requests: from.friendRequests
                });
            }
        }
    });

    // Reject friend
    socket.on('rejectFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        if (user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friendsUpdate', {
                friends: user.friends,
                requests: user.friendRequests
            });
        }
    });

    // Create group
    socket.on('createGroup', (data, callback) => {
        const { groupName } = data;
        const groupId = 'group_' + Date.now();
        groups[groupId] = {
            id: groupId,
            name: groupName,
            members: [currentUser],
            messages: []
        };
        saveData();
        callback({ success: true });
        socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(currentUser)));
    });

    // Join group
    socket.on('joinGroup', (groupId) => {
        if (groups[groupId] && groups[groupId].members.includes(currentUser)) {
            socket.emit('chatHistory', {
                target: groupId,
                messages: groups[groupId].messages || []
            });
        }
    });

    // Create channel
    socket.on('createChannel', (data, callback) => {
        const { channelName } = data;
        if (channels[channelName]) {
            callback({ success: false, error: 'Channel already exists' });
        } else {
            channels[channelName] = { name: channelName, messages: [] };
            saveData();
            callback({ success: true });
            io.emit('channelsUpdate', Object.keys(channels));
        }
    });

    // Join channel
    socket.on('joinChannel', (channelName) => {
        if (channels[channelName]) {
            socket.emit('chatHistory', {
                target: channelName,
                messages: channels[channelName].messages || []
            });
        }
    });

    // Join private chat
    socket.on('joinPrivate', (target) => {
        const chatId = [currentUser, target].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
        socket.emit('chatHistory', {
            target: target,
            messages: privateChats[chatId].messages || []
        });
    });

    // Send message
    socket.on('sendMessage', (data) => {
        const { type, target, text } = data;
        const msg = {
            from: currentUser,
            text: text,
            time: new Date().toLocaleTimeString(),
            target: target
        };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            
            socket.emit('newMessage', msg);
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) {
                targetSocket.emit('newMessage', msg);
            }
        } else if (type === 'group') {
            if (groups[target] && groups[target].members.includes(currentUser)) {
                groups[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
                groups[target].members.forEach(member => {
                    if (member !== currentUser) {
                        const memberSocket = getSocketByUsername(member);
                        if (memberSocket) {
                            memberSocket.emit('newMessage', msg);
                        }
                    }
                });
            }
        } else if (type === 'channel') {
            if (channels[target]) {
                channels[target].messages.push(msg);
                saveData();
                io.emit('newMessage', msg);
            }
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            socket.broadcast.emit('userOffline', currentUser);
            console.log('Disconnected:', currentUser);
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 ATOMGRAM STARTED ON PORT ${PORT}      ║
╠════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                 ║
╠════════════════════════════════════════════╣
║  ✨ Features:                              ║
║  💬 Private chats                          ║
║  👥 Groups                                 ║
║  📢 Channels                               ║
║  👤 Friends                                ║
║  📱 Adaptive design                        ║
╚════════════════════════════════════════════╝
    `);
});
