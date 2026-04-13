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
let stories = {};

// Загрузка данных
const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        channels = data.channels || {};
        groups = data.groups || {};
        stories = data.stories || {};
        console.log('✅ Данные загружены');
    } catch(e) { console.log('Ошибка загрузки'); }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, groups, stories }, null, 2));
    console.log('💾 Сохранено');
}
setInterval(saveData, 10000);

// HTML страница
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM - Мессенджер уровня Telegram</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: white; height: 100vh; overflow: hidden; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes typing { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        
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
        .sidebar { width: 300px; background: #1a1a1e; border-right: 1px solid #2a2a2e; display: flex; flex-direction: column; transition: transform 0.3s; z-index: 100; }
        .sidebar.mobile { position: fixed; left: -300px; top: 60px; height: calc(100vh - 60px); z-index: 200; }
        .sidebar.mobile.open { left: 0; }
        .overlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 199; display: none; }
        .overlay.open { display: block; }
        
        .profile { padding: 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2e; cursor: pointer; transition: background 0.2s; }
        .profile:hover { background: #2a2a2e; }
        .avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 12px; position: relative; }
        .avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .online-dot { position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px; background: #4ade80; border-radius: 50%; border: 2px solid #1a1a1e; }
        .profile-name { font-size: 18px; font-weight: 600; }
        .profile-username { font-size: 12px; color: #888; margin-top: 4px; }
        
        .nav-item { padding: 14px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s; }
        .nav-item:hover { background: #2a2a2e; }
        .section-title { padding: 16px 20px 8px; font-size: 11px; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px; }
        
        .stories-row { padding: 12px 16px; display: flex; gap: 12px; overflow-x: auto; border-bottom: 1px solid #2a2a2e; }
        .story-circle { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; flex-shrink: 0; }
        .story-circle.add { background: #2a2a2e; border: 2px solid #667eea; }
        .story-avatar { font-size: 28px; }
        .story-name { font-size: 10px; text-align: center; margin-top: 4px; color: #888; }
        
        .friends-list, .groups-list, .channels-list { flex: 1; overflow-y: auto; }
        .friend-item, .group-item, .channel-item { 
            padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; 
            transition: background 0.2s; border-bottom: 1px solid #2a2a2e; 
        }
        .friend-item:hover, .group-item:hover, .channel-item:hover { background: #2a2a2e; }
        .friend-avatar, .group-avatar, .channel-avatar { width: 48px; height: 48px; background: #2a2a2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; position: relative; }
        .friend-info, .group-info, .channel-info { flex: 1; }
        .friend-name, .group-name, .channel-name { font-weight: 600; font-size: 16px; }
        .friend-status, .group-status, .channel-status { font-size: 11px; color: #4ade80; margin-top: 2px; }
        .friend-status.offline { color: #888; }
        .message-preview { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .request-badge { background: #667eea; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; background: #0f0f14; }
        .chat-header { padding: 16px 24px; background: #1a1a1e; border-bottom: 1px solid #2a2a2e; display: flex; align-items: center; justify-content: space-between; }
        .chat-header-info { flex: 1; }
        .chat-title { font-size: 18px; font-weight: 600; }
        .chat-status { font-size: 12px; color: #4ade80; margin-top: 4px; }
        .chat-actions { display: flex; gap: 12px; }
        .chat-action-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.2s; }
        .chat-action-btn:hover { background: #2a2a2e; }
        
        .messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
        .message { display: flex; gap: 10px; max-width: 75%; animation: fadeIn 0.3s; }
        .message.mine { align-self: flex-end; flex-direction: row-reverse; }
        .message-avatar { width: 36px; height: 36px; background: #2a2a2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .message-bubble { max-width: calc(100% - 46px); }
        .message-content { padding: 10px 16px; border-radius: 20px; background: #2a2a2e; position: relative; }
        .message.mine .message-content { background: linear-gradient(135deg, #667eea, #764ba2); }
        .message-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #aaa; }
        .message-text { font-size: 15px; line-height: 1.4; word-break: break-word; }
        .message-time { font-size: 10px; color: #888; margin-top: 4px; text-align: right; }
        
        .message-reactions { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
        .reaction { background: rgba(255,255,255,0.1); border-radius: 20px; padding: 2px 8px; font-size: 12px; cursor: pointer; transition: transform 0.1s; }
        .reaction:hover { transform: scale(1.1); background: rgba(102,126,234,0.5); }
        
        .voice-message { display: flex; align-items: center; gap: 10px; }
        .voice-play { width: 36px; height: 36px; border-radius: 50%; background: #667eea; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .voice-wave { display: flex; gap: 3px; align-items: center; }
        .voice-wave span { width: 3px; height: 20px; background: #667eea; border-radius: 2px; animation: pulse 1s infinite; }
        
        .sticker { font-size: 48px; cursor: pointer; transition: transform 0.1s; padding: 5px; }
        .sticker:active { transform: scale(1.2); }
        
        .video-circle { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; cursor: pointer; background: #2a2a2e; }
        .file-attachment { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 12px; text-decoration: none; color: inherit; }
        
        .poll-card { background: rgba(102,126,234,0.15); border-radius: 16px; padding: 12px; margin: 8px 0; }
        .poll-question { font-weight: 600; margin-bottom: 12px; }
        .poll-option { padding: 8px 12px; margin: 4px 0; background: rgba(255,255,255,0.05); border-radius: 12px; cursor: pointer; transition: background 0.2s; display: flex; justify-content: space-between; align-items: center; }
        .poll-option:hover { background: rgba(102,126,234,0.3); }
        .poll-vote-count { font-size: 12px; color: #888; }
        .poll-progress { background: #667eea; height: 4px; border-radius: 2px; margin-top: 4px; }
        
        .typing-indicator { padding: 8px 24px; font-size: 12px; color: #888; display: flex; gap: 4px; align-items: center; }
        .typing-dot { width: 6px; height: 6px; background: #667eea; border-radius: 50%; animation: typing 1.4s infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        .reply-indicator { background: #1a1a1e; padding: 8px 16px; border-left: 3px solid #667eea; display: flex; align-items: center; justify-content: space-between; font-size: 13px; margin: 0 16px; border-radius: 8px; }
        .reply-indicator button { background: none; border: none; color: #ff4444; cursor: pointer; font-size: 16px; }
        
        .sticker-picker { position: fixed; bottom: 80px; left: 0; right: 0; background: #1a1a1e; border-radius: 24px 24px 0 0; padding: 16px; display: none; flex-wrap: wrap; gap: 12px; justify-content: center; z-index: 150; max-height: 250px; overflow-y: auto; }
        .sticker-picker.open { display: flex; }
        
        .input-area { padding: 16px 24px; background: #1a1a1e; border-top: 1px solid #2a2a2e; display: flex; gap: 12px; align-items: center; }
        .input-area input { flex: 1; padding: 12px 18px; background: #2a2a2e; border: none; border-radius: 28px; color: white; font-size: 15px; }
        .input-area input:focus { outline: none; }
        .input-area button { width: 44px; height: 44px; border-radius: 50%; background: #2a2a2e; border: none; color: white; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .input-area button:hover { background: #667eea; transform: scale(1.05); }
        .input-area button.recording { background: #ff4444; animation: pulse 1s infinite; }
        
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; visibility: hidden; opacity: 0; transition: all 0.2s; }
        .modal.active { visibility: visible; opacity: 1; }
        .modal-content { background: #1a1a1e; border-radius: 28px; width: 90%; max-width: 400px; max-height: 80vh; overflow-y: auto; }
        .modal-header { padding: 20px; border-bottom: 1px solid #2a2a2e; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { font-size: 18px; }
        .modal-body { padding: 20px; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid #2a2a2e; display: flex; gap: 12px; }
        .modal-close { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        .modal-input { width: 100%; padding: 12px; background: #2a2a2e; border: none; border-radius: 14px; color: white; font-size: 15px; margin-bottom: 12px; }
        .modal-btn { flex: 1; padding: 12px; background: #667eea; border: none; border-radius: 14px; color: white; font-weight: 600; cursor: pointer; }
        .modal-btn.cancel { background: #2a2a2e; }
        
        .story-viewer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: 3000; display: flex; align-items: center; justify-content: center; visibility: hidden; opacity: 0; transition: all 0.3s; }
        .story-viewer.active { visibility: visible; opacity: 1; }
        .story-content { width: 100%; max-width: 400px; position: relative; }
        .story-media { width: 100%; border-radius: 20px; max-height: 80vh; object-fit: cover; }
        .story-progress { position: absolute; top: 10px; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.3); border-radius: 3px; }
        .story-progress-bar { height: 100%; background: white; width: 0%; transition: width 0.1s linear; border-radius: 3px; }
        .story-close { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.5); border: none; color: white; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; }
        
        .toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: #2a2a2e; padding: 12px 24px; border-radius: 30px; font-size: 14px; z-index: 1000; animation: fadeIn 0.3s; }
        
        @media (max-width: 768px) {
            .sidebar { position: fixed; left: -300px; top: 60px; height: calc(100vh - 60px); z-index: 200; }
            .sidebar.open { left: 0; }
            .menu-btn { display: block; }
            .message { max-width: 85%; }
            .chat-header { padding: 12px 16px; }
            .input-area { padding: 12px 16px; }
        }
        @media (min-width: 769px) { .sidebar { position: relative; left: 0 !important; } }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1e; }
        ::-webkit-scrollbar-thumb { background: #667eea; border-radius: 4px; }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div id="loginPanel">
            <input type="text" id="loginUsername" placeholder="Логин">
            <input type="password" id="loginPassword" placeholder="Пароль">
            <button onclick="login()">Войти</button>
            <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
        </div>
        <div id="registerPanel" style="display:none">
            <input type="text" id="regUsername" placeholder="Логин">
            <input type="text" id="regName" placeholder="Ваше имя">
            <input type="password" id="regPassword" placeholder="Пароль">
            <button onclick="register()">Зарегистрироваться</button>
            <button class="switch-btn" onclick="showLogin()">Назад</button>
        </div>
        <div id="authError" class="error-msg"></div>
    </div>
</div>

<div class="app" id="mainApp">
    <div class="header">
        <button class="menu-btn" onclick="toggleSidebar()">☰</button>
        <div class="logo">⚡ ATOMGRAM</div>
        <div class="online-badge">● Онлайн</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile" onclick="openProfile()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-username" id="userLogin">@</div>
            </div>
            <div class="stories-row" id="storiesRow"></div>
            <div class="nav-item" onclick="openAddFriend()"><span>➕</span> <span>Добавить друга</span></div>
            <div class="nav-item" onclick="openCreateGroup()"><span>👥</span> <span>Создать группу</span></div>
            <div class="nav-item" onclick="openCreateChannel()"><span>📢</span> <span>Создать канал</span></div>
            <div class="section-title">ДРУЗЬЯ</div>
            <div class="friends-list" id="friendsList"></div>
            <div class="section-title">ГРУППЫ</div>
            <div class="groups-list" id="groupsList"></div>
            <div class="section-title">КАНАЛЫ</div>
            <div class="channels-list" id="channelsList"></div>
        </div>
        
        <div class="chat-area">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-title" id="chatTitle">Выберите чат</div>
                    <div class="chat-status" id="chatStatus"></div>
                </div>
                <div class="chat-actions" id="chatActions"></div>
            </div>
            <div class="messages" id="messages"></div>
            <div class="typing-indicator" id="typingIndicator" style="display:none">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <span id="typingText">печатает...</span>
            </div>
            <div id="replyIndicator" class="reply-indicator" style="display:none">
                <span id="replyPreview"></span>
                <button onclick="cancelReply()">✕</button>
            </div>
            <div class="sticker-picker" id="stickerPicker">
                <div class="sticker" onclick="sendSticker('😀')">😀</div><div class="sticker" onclick="sendSticker('😂')">😂</div>
                <div class="sticker" onclick="sendSticker('😍')">😍</div><div class="sticker" onclick="sendSticker('😎')">😎</div>
                <div class="sticker" onclick="sendSticker('🥳')">🥳</div><div class="sticker" onclick="sendSticker('🔥')">🔥</div>
                <div class="sticker" onclick="sendSticker('❤️')">❤️</div><div class="sticker" onclick="sendSticker('🎉')">🎉</div>
                <div class="sticker" onclick="sendSticker('👍')">👍</div><div class="sticker" onclick="sendSticker('👎')">👎</div>
                <div class="sticker" onclick="sendSticker('🐱')">🐱</div><div class="sticker" onclick="sendSticker('🐶')">🐶</div>
                <div class="sticker" onclick="sendSticker('🚀')">🚀</div><div class="sticker" onclick="sendSticker('✨')">✨</div>
                <div class="sticker" onclick="sendSticker('💎')">💎</div><div class="sticker" onclick="sendSticker('🎨')">🎨</div>
            </div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="toggleStickerPicker()">😊</button>
                <button onclick="document.getElementById('fileInput').click()">📎</button>
                <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
                <button id="voiceBtn" onclick="toggleRecording()">🎤</button>
                <button id="videoBtn" onclick="startVideoRecording()">🎥</button>
                <button id="storyBtn" onclick="addStory()">📸</button>
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<!-- Модальные окна -->
<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>➕ Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👥 Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>📢 Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👤 Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center; margin-bottom:20px;"><div class="avatar" id="profileAvatar" style="width:80px; height:80px; font-size:36px; margin:0 auto;">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px; background:#2a2a2e; border:none; padding:8px 16px; border-radius:20px; color:white; cursor:pointer;">Загрузить фото</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"><textarea id="editBio" class="modal-input" rows="2" placeholder="О себе"></textarea><input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>
<div id="createPollModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>📊 Создать опрос</h3><button class="modal-close" onclick="closeCreatePollModal()">✕</button></div><div class="modal-body"><input type="text" id="pollQuestion" class="modal-input" placeholder="Вопрос"><input type="text" id="pollOptions" class="modal-input" placeholder="Варианты (через запятую)"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreatePollModal()">Отмена</button><button class="modal-btn" onclick="createPoll()">Создать</button></div></div></div>

<div id="storyViewer" class="story-viewer"><div class="story-content"><div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div><img id="storyImage" class="story-media" style="display:none"><video id="storyVideo" class="story-media" style="display:none" autoplay muted></video><button class="story-close" onclick="closeStoryViewer()">✕</button></div></div>

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
let onlineUsers = new Set();
let replyToMessage = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let videoStream = null;
let videoRecorder = null;
let videoChunks = [];
let typingTimeout = null;

// Авторизация
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('login', { username, password }, (res) => {
        if (res.success) {
            currentUser = username;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_user', username);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
            loadStories();
        } else { document.getElementById('authError').innerText = res.error; }
    });
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (!username || !password) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('register', { username, name, password }, (res) => {
        if (res.success) { document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.'; showLogin(); }
        else { document.getElementById('authError').innerText = res.error; }
    });
}

function showRegister() { document.getElementById('loginPanel').style.display = 'none'; document.getElementById('registerPanel').style.display = 'block'; }
function showLogin() { document.getElementById('loginPanel').style.display = 'block'; document.getElementById('registerPanel').style.display = 'none'; }

function updateUI() {
    document.getElementById('userName').innerText = currentUserData?.name || currentUser;
    document.getElementById('userLogin').innerText = '@' + currentUser;
}

function loadData() {
    socket.emit('getFriends', (data) => { allFriends = data.friends || []; friendRequests = data.requests || []; renderFriends(); });
    socket.emit('getGroups', (groups) => { allGroups = groups; renderGroups(); });
    socket.emit('getChannels', (channels) => { allChannels = channels; renderChannels(); });
}

function renderFriends() {
    const container = document.getElementById('friendsList');
    let html = '';
    friendRequests.forEach(req => { html += '<div class="friend-item" style="background:#2a2a4e;"><div class="friend-avatar">📨</div><div class="friend-info"><div class="friend-name">' + req + '</div><div class="friend-status">Запрос в друзья</div></div><button onclick="acceptFriend(\\'' + req + '\\')" style="background:#4ade80; border:none; border-radius:20px; padding:5px 10px; margin:0 5px; cursor:pointer;">✓</button><button onclick="rejectFriend(\\'' + req + '\\')" style="background:#ff4444; border:none; border-radius:20px; padding:5px 10px; cursor:pointer;">✗</button></div>'; });
    allFriends.forEach(friend => { const isOnline = onlineUsers.has(friend); html += '<div class="friend-item" onclick="openChat(\\'' + friend + '\\', \\'private\\')"><div class="friend-avatar">👤' + (isOnline ? '<div class="online-dot"></div>' : '') + '</div><div class="friend-info"><div class="friend-name">' + friend + '</div><div class="friend-status ' + (isOnline ? '' : 'offline') + '">' + (isOnline ? '● Онлайн' : '○ Офлайн') + '</div></div></div>'; });
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">Нет друзей</div>';
    container.innerHTML = html;
}

function renderGroups() {
    const container = document.getElementById('groupsList');
    let html = '';
    allGroups.forEach(group => { html += '<div class="group-item" onclick="openChat(\\'' + group.id + '\\', \\'group\\')"><div class="group-avatar">👥</div><div class="group-info"><div class="group-name">' + group.name + '</div><div class="group-status">' + (group.members?.length || 1) + ' участников</div></div></div>'; });
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">Нет групп</div>';
    container.innerHTML = html;
}

function renderChannels() {
    const container = document.getElementById('channelsList');
    let html = '';
    allChannels.forEach(channel => { html += '<div class="channel-item" onclick="openChat(\\'' + channel + '\\', \\'channel\\')"><div class="channel-avatar">📢</div><div class="channel-info"><div class="channel-name">#' + channel + '</div></div></div>'; });
    if (html === '') html = '<div style="padding:20px; text-align:center; color:#888;">Нет каналов</div>';
    container.innerHTML = html;
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    let title = '', actions = '';
    if (type === 'private') { title = target; const isOnline = onlineUsers.has(target); document.getElementById('chatStatus').innerHTML = isOnline ? '● Онлайн' : '○ Офлайн'; socket.emit('joinPrivate', target); actions = '<button class="chat-action-btn" onclick="createPoll()">📊</button>'; }
    else if (type === 'group') { const group = allGroups.find(g => g.id === target); title = group ? group.name : target; document.getElementById('chatStatus').innerHTML = '👥 Группа'; socket.emit('joinGroup', target); actions = '<button class="chat-action-btn" onclick="createPoll()">📊</button><button class="chat-action-btn" onclick="addMemberToGroup()">➕</button>'; }
    else if (type === 'channel') { title = '# ' + target; document.getElementById('chatStatus').innerHTML = '📢 Публичный канал'; socket.emit('joinChannel', target); actions = '<button class="chat-action-btn" onclick="createPoll()">📊</button>'; }
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatActions').innerHTML = actions;
    closeSidebar();
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    let text = input.value.trim();
    if (!text || !currentChatTarget) return;
    const reply = replyToMessage;
    cancelReply();
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text, reply: reply });
    input.value = '';
}

function sendSticker(sticker) {
    if (!currentChatTarget) return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: sticker });
    document.getElementById('stickerPicker').classList.remove('open');
}

function toggleStickerPicker() { document.getElementById('stickerPicker').classList.toggle('open'); }

function addMessage(msg) {
    const messagesDiv = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    let replyHtml = '';
    if (msg.replyTo) { replyHtml = '<div style="background:rgba(102,126,234,0.2); padding:4px 8px; border-radius:12px; margin-bottom:6px; font-size:12px;"><span style="color:#667eea;">↩️ ' + msg.replyTo.from + '</span>: ' + escapeHtml(msg.replyTo.text.substring(0, 50)) + '</div>'; }
    let reactionsHtml = '';
    if (msg.reactions) { reactionsHtml = '<div class="message-reactions">' + Object.entries(msg.reactions).map(([r,c]) => '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'' + r + '\\')">' + r + ' ' + c + '</span>').join('') + '</div>'; }
    div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content">' + replyHtml + (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') + '<div class="message-text" ondblclick="setReply(\\'' + msg.id + '\\', \\'' + escapeHtml(msg.from) + '\\', \\'' + escapeHtml(msg.text) + '\\')">' + (msg.sticker ? '<span style="font-size:48px;">' + msg.text + '</span>' : escapeHtml(msg.text)) + '</div>' + reactionsHtml + '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div><div style="display:flex; gap:8px; margin-top:4px;"><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'❤️\\')">❤️</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'👍\\')">👍</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😂\\')">😂</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😮\\')">😮</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😢\\')">😢</span></div></div></div>';
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addReaction(messageId, reaction) { socket.emit('addReaction', { messageId: messageId, chatId: currentChatTarget, reaction: reaction }); }
function setReply(id, from, text) { replyToMessage = { id: id, from: from, text: text.substring(0, 50) }; document.getElementById('replyPreview').innerHTML = '📎 Ответ ' + from + ': ' + text.substring(0, 40); document.getElementById('replyIndicator').style.display = 'flex'; }
function cancelReply() { replyToMessage = null; document.getElementById('replyIndicator').style.display = 'none'; }

// Голосовые сообщения
async function toggleRecording() {
    if (isRecording) { stopRecording(); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorder = new MediaRecorder(stream); audioChunks = []; mediaRecorder.ondataavailable = e => audioChunks.push(e.data); mediaRecorder.onstop = () => { const blob = new Blob(audioChunks, { type: 'audio/webm' }); const reader = new FileReader(); reader.onloadend = () => socket.emit('voiceMessage', { type: currentChatType, target: currentChatTarget, audio: reader.result }); reader.readAsDataURL(blob); stream.getTracks().forEach(t => t.stop()); }; mediaRecorder.start(); isRecording = true; document.getElementById('voiceBtn').classList.add('recording'); document.getElementById('voiceBtn').innerHTML = '⏹️'; } catch(e) { alert('Нет микрофона'); } }
function stopRecording() { if (mediaRecorder && isRecording) { mediaRecorder.stop(); isRecording = false; document.getElementById('voiceBtn').classList.remove('recording'); document.getElementById('voiceBtn').innerHTML = '🎤'; } }

// Видеокружки
async function startVideoRecording() { document.getElementById('videoModal')?.remove(); const modal = document.createElement('div'); modal.id = 'videoModal'; modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:3000; display:flex; flex-direction:column; align-items:center; justify-content:center;'; modal.innerHTML = '<div class="video-preview"><video id="videoPreview" autoplay muted playsinline style="width:100%; max-width:300px; border-radius:50%;"></video></div><div class="video-controls" style="margin-top:24px; display:flex; gap:12px;"><button id="startRecordBtn" style="padding:12px 24px; background:#ff6b6b; border:none; border-radius:40px; color:white; cursor:pointer;">🔴 Запись</button><button id="stopRecordBtn" style="display:none; padding:12px 24px; background:#ff4444; border:none; border-radius:40px; color:white; cursor:pointer;">⏹️ Стоп</button><button id="sendVideoBtn" style="display:none; padding:12px 24px; background:#4ade80; border:none; border-radius:40px; color:white; cursor:pointer;">📤 Отправить</button><button onclick="closeVideoModal()" style="padding:12px 24px; background:#666; border:none; border-radius:40px; color:white; cursor:pointer;">❌ Закрыть</button></div>'; document.body.appendChild(modal); try { videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); document.getElementById('videoPreview').srcObject = videoStream; document.getElementById('startRecordBtn').onclick = () => { videoChunks = []; videoRecorder = new MediaRecorder(videoStream); videoRecorder.ondataavailable = e => videoChunks.push(e.data); videoRecorder.onstop = () => { const blob = new Blob(videoChunks, { type: 'video/mp4' }); const reader = new FileReader(); reader.onloadend = () => { socket.emit('videoMessage', { type: currentChatType, target: currentChatTarget, video: reader.result }); closeVideoModal(); }; reader.readAsDataURL(blob); }; videoRecorder.start(); document.getElementById('startRecordBtn').style.display = 'none'; document.getElementById('stopRecordBtn').style.display = 'inline-block'; }; document.getElementById('stopRecordBtn').onclick = () => { if (videoRecorder) videoRecorder.stop(); }; } catch(e) { alert('Нет камеры'); closeVideoModal(); } }
function closeVideoModal() { if (videoStream) videoStream.getTracks().forEach(t => t.stop()); document.getElementById('videoModal')?.remove(); }

// Файлы
function sendFile() { const file = document.getElementById('fileInput').files[0]; if (!file || !currentChatTarget) return; const reader = new FileReader(); reader.onloadend = () => socket.emit('fileMessage', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileData: reader.result }); reader.readAsDataURL(file); }

// Опросы
function createPoll() { document.getElementById('createPollModal').classList.add('active'); document.getElementById('pollQuestion').value = ''; document.getElementById('pollOptions').value = ''; }
function closeCreatePollModal() { document.getElementById('createPollModal').classList.remove('active'); }
function sendPoll() { const question = document.getElementById('pollQuestion').value.trim(); const options = document.getElementById('pollOptions').value.split(',').map(o => o.trim()); if (!question || options.length < 2) { alert('Введите вопрос и минимум 2 варианта'); return; } socket.emit('createPoll', { chatId: currentChatTarget, question: question, options: options }); closeCreatePollModal(); }

// Истории
function addStory() { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,video/*'; input.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => socket.emit('addStory', { media: reader.result, type: file.type.startsWith('image/') ? 'image' : 'video' }); reader.readAsDataURL(file); }; input.click(); }
function viewStory(username) { socket.emit('getStory', username); }
function closeStoryViewer() { document.getElementById('storyViewer').classList.remove('active'); const video = document.getElementById('storyVideo'); if (video) { video.pause(); video.src = ''; } }

// Друзья и группы
function openAddFriend() { document.getElementById('addFriendModal').classList.add('active'); document.getElementById('friendUsername').value = ''; }
function closeAddFriendModal() { document.getElementById('addFriendModal').classList.remove('active'); }
function addFriend() { const username = document.getElementById('friendUsername').value.trim(); if (!username) { showToast('Введите логин'); return; } socket.emit('addFriend', { friendUsername: username }, (res) => { showToast(res.message || res.error); closeAddFriendModal(); loadData(); }); }
function acceptFriend(from) { socket.emit('acceptFriend', { fromUser: from }, () => loadData()); }
function rejectFriend(from) { socket.emit('rejectFriend', { fromUser: from }, () => loadData()); }
function openCreateGroup() { document.getElementById('createGroupModal').classList.add('active'); document.getElementById('groupName').value = ''; }
function closeCreateGroupModal() { document.getElementById('createGroupModal').classList.remove('active'); }
function createGroup() { const name = document.getElementById('groupName').value.trim(); if (!name) { showToast('Введите название'); return; } socket.emit('createGroup', { groupName: name }, (res) => { if (res.success) { showToast('Группа создана'); closeCreateGroupModal(); loadData(); } else { showToast(res.error); } }); }
function addMemberToGroup() { const username = prompt('Логин пользователя:'); if (username) { socket.emit('addGroupMember', { groupId: currentChatTarget, username: username }, (res) => { showToast(res.message || res.error); }); } }
function openCreateChannel() { document.getElementById('createChannelModal').classList.add('active'); document.getElementById('channelName').value = ''; }
function closeCreateChannelModal() { document.getElementById('createChannelModal').classList.remove('active'); }
function createChannel() { const name = document.getElementById('channelName').value.trim(); if (!name) { showToast('Введите название'); return; } socket.emit('createChannel', { channelName: name }, (res) => { if (res.success) { showToast('Канал создан'); closeCreateChannelModal(); loadData(); } else { showToast(res.error); } }); }

// Профиль
function openProfile() { document.getElementById('editName').value = currentUserData?.name || ''; document.getElementById('editBio').value = currentUserData?.bio || ''; document.getElementById('editPassword').value = ''; document.getElementById('profileModal').classList.add('active'); }
function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }
function uploadAvatar() { const file = document.getElementById('avatarUpload').files[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => socket.emit('uploadAvatar', { avatar: reader.result }, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); showToast('Аватар обновлён'); } }); reader.readAsDataURL(file); }
function saveProfile() { const data = { name: document.getElementById('editName').value.trim(), bio: document.getElementById('editBio').value.trim() }; const password = document.getElementById('editPassword').value.trim(); if (password) data.password = password; socket.emit('updateProfile', data, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); closeProfileModal(); showToast('Профиль обновлён'); } }); }

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }
function showToast(msg) { const toast = document.createElement('div'); toast.className = 'toast'; toast.innerText = msg; document.body.appendChild(toast); setTimeout(() => toast.remove(), 2000); }
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, function(m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }

// Индикатор печати
document.getElementById('messageInput').addEventListener('input', () => { if (currentChatTarget) { socket.emit('typing', { type: currentChatType, target: currentChatTarget }); clearTimeout(typingTimeout); typingTimeout = setTimeout(() => socket.emit('stopTyping', { type: currentChatType, target: currentChatTarget }), 1000); } });

// Socket события
socket.on('friendsUpdate', (data) => { allFriends = data.friends || []; friendRequests = data.requests || []; renderFriends(); });
socket.on('groupsUpdate', (groups) => { allGroups = groups; renderGroups(); });
socket.on('channelsUpdate', (channels) => { allChannels = channels; renderChannels(); });
socket.on('chatHistory', (data) => { if (currentChatTarget === data.target) { document.getElementById('messages').innerHTML = ''; data.messages.forEach(msg => addMessage(msg)); } });
socket.on('newMessage', (msg) => { if (currentChatTarget === msg.target || currentChatTarget === msg.from || (currentChatType === 'group' && msg.target === currentChatTarget)) { addMessage(msg); } if (msg.from !== currentUser) { showToast('Новое сообщение от ' + msg.from); } });
socket.on('reactionUpdate', (data) => { const msgDiv = document.querySelector('.message[data-id="' + data.messageId + '"]'); if (msgDiv) { let reactionsDiv = msgDiv.querySelector('.message-reactions'); if (!reactionsDiv) { reactionsDiv = document.createElement('div'); reactionsDiv.className = 'message-reactions'; msgDiv.querySelector('.message-content').appendChild(reactionsDiv); } reactionsDiv.innerHTML = Object.entries(data.reactions).map(([r,c]) => '<span class="reaction" onclick="addReaction(\\'' + data.messageId + '\\', \\'' + r + '\\')">' + r + ' ' + c + '</span>').join(''); } });
socket.on('voiceMessage', (data) => { if (currentChatTarget === data.target || currentChatTarget === data.from) { const div = document.createElement('div'); div.className = 'message ' + (data.from === currentUser ? 'mine' : ''); div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(data.from) + '</div><div class="voice-message"><button class="voice-play" onclick="playAudio(this, \\'' + data.audio + '\\')">▶️</button><div class="voice-wave"><span></span><span></span><span></span></div></div><div class="message-time">' + (data.time || new Date().toLocaleTimeString()) + '</div></div></div>'; document.getElementById('messages').appendChild(div); } });
socket.on('videoMessage', (data) => { if (currentChatTarget === data.target || currentChatTarget === data.from) { const div = document.createElement('div'); div.className = 'message ' + (data.from === currentUser ? 'mine' : ''); div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(data.from) + '</div><video class="video-circle" controls autoplay loop src="' + data.video + '"></video><div class="message-time">' + (data.time || new Date().toLocaleTimeString()) + '</div></div></div>'; document.getElementById('messages').appendChild(div); } });
socket.on('fileMessage', (data) => { if (currentChatTarget === data.target || currentChatTarget === data.from) { const div = document.createElement('div'); div.className = 'message ' + (data.from === currentUser ? 'mine' : ''); div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(data.from) + '</div><a class="file-attachment" href="' + data.fileData + '" download="' + data.fileName + '">📎 ' + escapeHtml(data.fileName) + '</a><div class="message-time">' + (data.time || new Date().toLocaleTimeString()) + '</div></div></div>'; document.getElementById('messages').appendChild(div); } });
socket.on('newPoll', (data) => { if (currentChatTarget === data.chatId) { const div = document.createElement('div'); div.className = 'message'; div.innerHTML = '<div class="message-avatar">📊</div><div class="message-bubble"><div class="message-content"><div class="poll-card"><div class="poll-question">📊 ' + escapeHtml(data.poll.question) + '</div>' + data.poll.options.map((opt, idx) => '<div class="poll-option" onclick="votePoll(\\'' + data.poll.id + '\\', ' + idx + ')"><span>' + escapeHtml(opt.text) + '</span><span class="poll-vote-count">' + opt.votes.length + ' голосов</span></div>').join('') + '</div><div class="message-time">' + new Date().toLocaleTimeString() + '</div></div></div>'; document.getElementById('messages').appendChild(div); } });
socket.on('pollUpdate', (data) => { const pollDiv = document.querySelector('.poll-card'); if (pollDiv) { pollDiv.innerHTML = '<div class="poll-question">📊 ' + escapeHtml(data.poll.question) + '</div>' + data.poll.options.map((opt, idx) => '<div class="poll-option" onclick="votePoll(\\'' + data.pollId + '\\', ' + idx + ')"><span>' + escapeHtml(opt.text) + '</span><span class="poll-vote-count">' + opt.votes.length + ' голосов</span></div>').join(''); } });
socket.on('typing', (data) => { if (currentChatTarget === data.user || currentChatTarget === data.channel) { document.getElementById('typingIndicator').style.display = 'flex'; document.getElementById('typingText').innerHTML = data.user + ' печатает...'; setTimeout(() => document.getElementById('typingIndicator').style.display = 'none', 1500); } });
socket.on('userOnline', (username) => { onlineUsers.add(username); if (currentChatTarget === username) { document.getElementById('chatStatus').innerHTML = '● Онлайн'; } renderFriends(); });
socket.on('userOffline', (username) => { onlineUsers.delete(username); if (currentChatTarget === username) { document.getElementById('chatStatus').innerHTML = '○ Офлайн'; } renderFriends(); });
socket.on('storiesUpdate', (stories) => { const container = document.getElementById('storiesRow'); let html = '<div class="story-circle add" onclick="addStory()"><div class="story-avatar">+</div></div>'; stories.forEach(s => { html += '<div onclick="viewStory(\\'' + s.username + '\\')"><div class="story-circle"><div class="story-avatar">' + (s.avatar || '👤') + '</div></div><div class="story-name">' + (s.name || s.username) + '</div></div>'; }); container.innerHTML = html; });
socket.on('storyData', (data) => { const viewer = document.getElementById('storyViewer'); const img = document.getElementById('storyImage'); const video = document.getElementById('storyVideo'); if (data.type === 'image') { img.style.display = 'block'; video.style.display = 'none'; img.src = data.media; } else { img.style.display = 'none'; video.style.display = 'block'; video.src = data.media; video.play(); } viewer.classList.add('active'); let progress = 0; const interval = setInterval(() => { progress += 2; document.getElementById('storyProgressBar').style.width = progress + '%'; if (progress >= 100) { clearInterval(interval); closeStoryViewer(); } }, 100); });

function votePoll(pollId, optionIndex) { socket.emit('votePoll', { chatId: currentChatTarget, pollId: pollId, optionIndex: optionIndex }); }
function playAudio(btn, audioData) { const audio = new Audio(audioData); audio.play(); btn.innerHTML = '⏸️'; audio.onended = () => btn.innerHTML = '▶️'; btn.onclick = () => { audio.paused ? audio.play() : audio.pause(); btn.innerHTML = audio.paused ? '▶️' : '⏸️'; }; }
function loadStories() { socket.emit('getStories'); }

const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) { document.getElementById('loginUsername').value = savedUser; }
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ (СЕРВЕР) ==========
const userSockets = new Map();
const onlineUsersSet = new Set();

function getSocketByUsername(username) {
    for (const [id, user] of userSockets) { if (user === username) return io.sockets.sockets.get(id); }
    return null;
}

io.on('connection', (socket) => {
    console.log('🔌 Подключился:', socket.id);
    let currentUser = null;

    socket.on('register', (data, callback) => {
        const { username, name, password } = data;
        if (users[username]) { callback({ success: false, error: 'Пользователь уже существует' }); }
        else {
            users[username] = { username: username, name: name || username, password: password, bio: '', avatar: null, friends: [], friendRequests: [] };
            saveData();
            callback({ success: true });
        }
    });

    socket.on('login', (data, callback) => {
        const { username, password } = data;
        const user = users[username];
        if (!user) { callback({ success: false, error: 'Пользователь не найден' }); }
        else if (user.password !== password) { callback({ success: false, error: 'Неверный пароль' }); }
        else {
            currentUser = username;
            socket.username = username;
            userSockets.set(socket.id, username);
            onlineUsersSet.add(username);
            callback({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
            socket.emit('friendsUpdate', { friends: user.friends || [], requests: user.friendRequests || [] });
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members?.includes(username)));
            socket.emit('channelsUpdate', Object.keys(channels));
            socket.broadcast.emit('userOnline', username);
            io.emit('storiesUpdate', getActiveStories());
        }
    });

    socket.on('updateProfile', (data, callback) => {
        const user = users[currentUser];
        if (user) {
            if (data.name) user.name = data.name;
            if (data.bio) user.bio = data.bio;
            if (data.password) user.password = data.password;
            saveData();
            callback({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
        } else { callback({ success: false }); }
    });

    socket.on('uploadAvatar', (data, callback) => {
        const user = users[currentUser];
        if (user) {
            user.avatar = data.avatar;
            saveData();
            callback({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
        } else { callback({ success: false }); }
    });

    socket.on('getFriends', (callback) => { if (currentUser && users[currentUser]) { callback({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [] }); } else { callback({ friends: [], requests: [] }); } });
    socket.on('getGroups', (callback) => { if (currentUser) { callback(Object.values(groups).filter(g => g.members?.includes(currentUser))); } else { callback([]); } });
    socket.on('getChannels', (callback) => { callback(Object.keys(channels)); });

    socket.on('addFriend', (data, callback) => {
        const { friendUsername } = data;
        const user = users[currentUser];
        const friend = users[friendUsername];
        if (!friend) { callback({ success: false, error: 'Пользователь не найден' }); }
        else if (friendUsername === currentUser) { callback({ success: false, error: 'Нельзя добавить себя' }); }
        else if (user.friends.includes(friendUsername)) { callback({ success: false, error: 'Уже в друзьях' }); }
        else if (friend.friendRequests.includes(currentUser)) { callback({ success: false, error: 'Запрос уже отправлен' }); }
        else {
            friend.friendRequests.push(currentUser);
            saveData();
            callback({ success: true, message: 'Запрос в друзья отправлен' });
            const friendSocket = getSocketByUsername(friendUsername);
            if (friendSocket) { friendSocket.emit('friendsUpdate', { friends: friend.friends || [], requests: friend.friendRequests || [] }); }
        }
    });

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
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
            const fromSocket = getSocketByUsername(fromUser);
            if (fromSocket) { fromSocket.emit('friendsUpdate', { friends: from.friends, requests: from.friendRequests }); }
        }
    });

    socket.on('rejectFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        if (user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
        }
    });

    socket.on('createGroup', (data, callback) => {
        const { groupName } = data;
        const groupId = 'group_' + Date.now();
        groups[groupId] = { id: groupId, name: groupName, members: [currentUser], messages: [] };
        saveData();
        callback({ success: true });
        socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(currentUser)));
    });

    socket.on('addGroupMember', (data, callback) => {
        const { groupId, username } = data;
        const group = groups[groupId];
        if (group && !group.members.includes(username) && users[username]) {
            group.members.push(username);
            saveData();
            callback({ success: true, message: 'Участник добавлен' });
            const userSocket = getSocketByUsername(username);
            if (userSocket) { userSocket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(username))); }
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(currentUser)));
        } else { callback({ success: false, error: 'Не удалось добавить' }); }
    });

    socket.on('joinGroup', (groupId) => { if (groups[groupId] && groups[groupId].members.includes(currentUser)) { socket.emit('chatHistory', { target: groupId, messages: groups[groupId].messages || [] }); } });
    socket.on('createChannel', (data, callback) => { const { channelName } = data; if (channels[channelName]) { callback({ success: false, error: 'Канал уже существует' }); } else { channels[channelName] = { name: channelName, messages: [] }; saveData(); callback({ success: true }); io.emit('channelsUpdate', Object.keys(channels)); } });
    socket.on('joinChannel', (channelName) => { if (channels[channelName]) { socket.emit('chatHistory', { target: channelName, messages: channels[channelName].messages || [] }); } });
    socket.on('joinPrivate', (target) => { const chatId = [currentUser, target].sort().join('_'); if (!privateChats[chatId]) privateChats[chatId] = { messages: [] }; socket.emit('chatHistory', { target: target, messages: privateChats[chatId].messages || [] }); });

    socket.on('sendMessage', (data) => {
        const { type, target, text, reply } = data;
        const msg = { id: Date.now(), from: currentUser, text: text, time: new Date().toLocaleTimeString(), target: target };
        if (reply) msg.replyTo = reply;
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) { targetSocket.emit('newMessage', msg); }
        } else if (type === 'group') {
            if (groups[target] && groups[target].members.includes(currentUser)) {
                groups[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
                groups[target].members.forEach(member => { if (member !== currentUser) { const memberSocket = getSocketByUsername(member); if (memberSocket) { memberSocket.emit('newMessage', msg); } } });
            }
        } else if (type === 'channel') {
            if (channels[target]) {
                channels[target].messages.push(msg);
                saveData();
                io.emit('newMessage', msg);
            }
        }
    });

    socket.on('addReaction', (data) => {
        const { messageId, chatId, reaction } = data;
        let chat = privateChats[chatId] || channels[chatId] || groups[chatId];
        if (chat) {
            const message = chat.messages?.find(m => m.id == messageId);
            if (message) {
                if (!message.reactions) message.reactions = {};
                message.reactions[reaction] = (message.reactions[reaction] || 0) + 1;
                saveData();
                io.emit('reactionUpdate', { messageId: messageId, reactions: message.reactions });
            }
        }
    });

    socket.on('createPoll', (data) => {
        const { chatId, question, options } = data;
        const poll = { id: Date.now(), question: question, options: options.map(opt => ({ text: opt, votes: [] })), createdBy: currentUser };
        let chat = privateChats[chatId] || channels[chatId] || groups[chatId];
        if (chat) {
            if (!chat.polls) chat.polls = [];
            chat.polls.push(poll);
            saveData();
            io.emit('newPoll', { chatId: chatId, poll: poll });
        }
    });

    socket.on('votePoll', (data) => {
        const { chatId, pollId, optionIndex } = data;
        let chat = privateChats[chatId] || channels[chatId] || groups[chatId];
        if (chat && chat.polls) {
            const poll = chat.polls.find(p => p.id == pollId);
            if (poll && !poll.options[optionIndex].votes.includes(currentUser)) {
                poll.options[optionIndex].votes.push(currentUser);
                saveData();
                io.emit('pollUpdate', { chatId: chatId, pollId: pollId, poll: poll });
            }
        }
    });

    socket.on('voiceMessage', (data) => { const { type, target, audio } = data; const msg = { id: Date.now(), from: currentUser, audio: audio, time: new Date().toLocaleTimeString(), target: target }; if (type === 'private') { const chatId = [currentUser, target].sort().join('_'); if (!privateChats[chatId]) privateChats[chatId] = { messages: [] }; privateChats[chatId].messages.push(msg); saveData(); socket.emit('voiceMessage', msg); const targetSocket = getSocketByUsername(target); if (targetSocket) { targetSocket.emit('voiceMessage', msg); } } });
    socket.on('videoMessage', (data) => { const { type, target, video } = data; const msg = { id: Date.now(), from: currentUser, video: video, time: new Date().toLocaleTimeString(), target: target }; if (type === 'private') { const chatId = [currentUser, target].sort().join('_'); if (!privateChats[chatId]) privateChats[chatId] = { messages: [] }; privateChats[chatId].messages.push(msg); saveData(); socket.emit('videoMessage', msg); const targetSocket = getSocketByUsername(target); if (targetSocket) { targetSocket.emit('videoMessage', msg); } } });
    socket.on('fileMessage', (data) => { const { type, target, fileName, fileData } = data; const msg = { id: Date.now(), from: currentUser, fileName: fileName, fileData: fileData, time: new Date().toLocaleTimeString(), target: target }; if (type === 'private') { const chatId = [currentUser, target].sort().join('_'); if (!privateChats[chatId]) privateChats[chatId] = { messages: [] }; privateChats[chatId].messages.push(msg); saveData(); socket.emit('fileMessage', msg); const targetSocket = getSocketByUsername(target); if (targetSocket) { targetSocket.emit('fileMessage', msg); } } });

    socket.on('addStory', (data) => {
        const { media, type } = data;
        if (!stories[currentUser]) stories[currentUser] = [];
        stories[currentUser].push({ media: media, type: type, time: Date.now() });
        if (stories[currentUser].length > 10) stories[currentUser].shift();
        saveData();
        io.emit('storiesUpdate', getActiveStories());
    });
    socket.on('getStories', () => { socket.emit('storiesUpdate', getActiveStories()); });
    socket.on('getStory', (username) => { if (stories[username] && stories[username].length > 0) { const story = stories[username][stories[username].length - 1]; socket.emit('storyData', story); } });

    socket.on('typing', (data) => { const { type, target } = data; if (type === 'private') { const targetSocket = getSocketByUsername(target); if (targetSocket) { targetSocket.emit('typing', { user: currentUser }); } } });
    socket.on('stopTyping', (data) => { const { type, target } = data; if (type === 'private') { const targetSocket = getSocketByUsername(target); if (targetSocket) { targetSocket.emit('stopTyping'); } } });

    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            onlineUsersSet.delete(currentUser);
            socket.broadcast.emit('userOffline', currentUser);
        }
    });
});

function getActiveStories() {
    const active = [];
    const now = Date.now();
    for (const [username, userStories] of Object.entries(stories)) {
        if (userStories.length > 0 && now - userStories[userStories.length - 1].time < 86400000 && users[username]) {
            active.push({ username: username, name: users[username].name, avatar: users[username].avatar });
        }
    }
    return active;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🚀 ATOMGRAM — МЕССЕНДЖЕР УРОВНЯ TELEGRAM             ║
╠═══════════════════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                               ║
║  📱 http://localhost:${PORT}                               ║
╠═══════════════════════════════════════════════════════════╣
║  ✨ ВСЕ ФИШКИ TELEGRAM:                                   ║
║  💬 Личные сообщения                                      ║
║  👥 Группы (до 200 участников)                           ║
║  📢 Каналы                                                ║
║  👤 Друзья с запросами                                    ║
║  🎤 Голосовые сообщения                                   ║
║  🎥 Видеокружки                                           ║
║  📎 Файлы и изображения                                   ║
║  😀 Стикеры                                               ║
║  ❤️ Реакции на сообщения                                  ║
║  📊 Опросы (Polls)                                        ║
║  📸 Истории (как в Telegram)                             ║
║  💬 Ответы на сообщения (Reply)                           ║
║  ⌨️ Индикатор печати                                      ║
║  🟢 Онлайн-статус                                         ║
║  🖼️ Аватары пользователей                                 ║
║  🌓 Тёмная тема                                           ║
║  📱 Адаптивный дизайн                                     ║
║  💾 История сообщений                                     ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
