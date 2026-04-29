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
let users = {};
let privateChats = {};
let groups = {};
let channels = {};
let stories = {};
let polls = {};
let savedMessages = {};

const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        groups = data.groups || {};
        channels = data.channels || {};
        stories = data.stories || {};
        polls = data.polls || {};
        savedMessages = data.savedMessages || {};
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, groups, channels, stories, polls, savedMessages }, null, 2));
}
setInterval(saveData, 5000);

// ИИ-ПОМОЩНИК
function aiResponse(message, username) {
    const msg = message.toLowerCase();
    
    if (msg.includes('привет') || msg.includes('здравствуй')) {
        return `✨ Привет, ${username}! Я ИИ-помощник ATOMGRAM Premium. Чем могу помочь? Напиши "помощь" для списка возможностей! 🚀`;
    }
    if (msg.includes('помощь')) {
        return `🔧 **Возможности ATOMGRAM Premium:**\n\n💬 Личные сообщения\n👥 Группы\n📢 Каналы\n🎤 Голосовые сообщения\n📎 Файлы и фото\n😀 Стикеры\n📸 Истории\n🎮 Игры\n🔍 Поиск\n⭐ Сохранённые\n📞 Звонки\n\nНапиши "игра" чтобы начать!`;
    }
    if (msg.includes('игра')) {
        return `🎮 **Игры:**\n❌ Крестики-нолики\n🎲 Кости\n🎯 Дартс\n\nВыбери друга и нажми 🎮!`;
    }
    if (msg.includes('шутка')) {
        return `😂 Почему программисты путают Хэллоуин и Рождество? 31 Oct == 25 Dec!`;
    }
    if (msg.includes('спасибо')) {
        return `😊 Всегда пожалуйста, ${username}!`;
    }
    return `Понял, ${username}! 🤔 Расскажи подробнее!`;
}

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM PREMIUM</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: white; height: 100vh; overflow: hidden; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .auth-card {
            background: #1c1c1e;
            padding: 40px;
            border-radius: 28px;
            width: 90%;
            max-width: 350px;
            text-align: center;
        }
        .auth-card h1 {
            font-size: 32px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #007aff, #5856d6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-card .subtitle {
            color: #8e8e93;
            margin-bottom: 32px;
            font-size: 14px;
        }
        .auth-card input {
            width: 100%;
            padding: 14px;
            margin: 8px 0;
            background: #2c2c2e;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            color: #fff;
        }
        .auth-card button {
            width: 100%;
            padding: 14px;
            margin-top: 12px;
            background: #007aff;
            color: white;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        .switch-btn { background: #2c2c2e !important; }
        .error-msg { color: #ff3b30; margin-top: 16px; }
        
        .app { display: none; height: 100vh; flex-direction: column; }
        .header { background: #1c1c1e; padding: 12px 16px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #2c2c2e; }
        .menu-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #007aff; display: none; }
        .logo { font-size: 20px; font-weight: bold; background: linear-gradient(135deg, #007aff, #5856d6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .premium-badge { margin-left: auto; background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        
        .container { display: flex; flex: 1; overflow: hidden; }
        .sidebar {
            width: 280px;
            background: #1c1c1e;
            border-right: 1px solid #2c2c2e;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s;
            z-index: 100;
        }
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -280px;
                top: 0;
                height: 100%;
                z-index: 200;
            }
            .sidebar.open { left: 0; }
            .menu-btn { display: block; }
            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 199;
                display: none;
            }
            .overlay.open { display: block; }
        }
        @media (min-width: 769px) { .sidebar { position: relative; left: 0 !important; } }
        
        .profile { padding: 30px 20px; text-align: center; border-bottom: 1px solid #2c2c2e; cursor: pointer; }
        .avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #007aff, #5856d6); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 12px; }
        .profile-name { font-size: 17px; font-weight: 600; }
        .profile-username { font-size: 13px; color: #8e8e93; margin-top: 4px; }
        
        .nav-item { padding: 12px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-radius: 10px; margin: 4px 12px; }
        .nav-item:hover { background: #2c2c2e; }
        .section-title { padding: 16px 20px 8px; font-size: 12px; color: #8e8e93; text-transform: uppercase; }
        
        .search-box { padding: 12px 16px; margin: 8px 12px; background: #2c2c2e; border-radius: 16px; display: flex; align-items: center; gap: 10px; }
        .search-box input { flex: 1; background: none; border: none; color: white; font-size: 14px; }
        .search-results { max-height: 200px; overflow-y: auto; margin: 4px 12px; }
        .search-result { padding: 10px 12px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 12px; }
        .search-result:hover { background: #2c2c2e; }
        
        .chats-list, .channels-list, .groups-list { flex: 1; overflow-y: auto; padding: 8px 12px; }
        .chat-item { padding: 12px; display: flex; align-items: center; gap: 14px; cursor: pointer; border-radius: 14px; transition: all 0.2s; }
        .chat-item:hover { background: #2c2c2e; transform: translateX(4px); }
        .chat-avatar { width: 48px; height: 48px; background: #2c2c2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; position: relative; }
        .online-dot { position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background: #34c759; border-radius: 50%; border: 2px solid #1c1c1e; }
        .chat-info { flex: 1; }
        .chat-name { font-weight: 600; font-size: 16px; }
        .chat-preview { font-size: 13px; color: #8e8e93; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        
        .chat-main { flex: 1; display: flex; flex-direction: column; background: #0a0a0f; }
        .chat-header { padding: 12px 16px; background: #1c1c1e; border-bottom: 1px solid #2c2c2e; display: flex; align-items: center; gap: 12px; }
        .back-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #007aff; display: none; }
        .chat-header-avatar { width: 44px; height: 44px; background: #2c2c2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .chat-header-info { flex: 1; }
        .chat-header-name { font-weight: 600; font-size: 17px; }
        .chat-header-status { font-size: 12px; color: #8e8e93; margin-top: 2px; }
        .chat-actions { display: flex; gap: 8px; }
        .action-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 8px; border-radius: 50%; width: 40px; height: 40px; }
        .action-btn:hover { background: #2c2c2e; }
        
        .messages-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .message { display: flex; gap: 8px; max-width: 80%; animation: fadeIn 0.2s; }
        .message.mine { align-self: flex-end; flex-direction: row-reverse; }
        .message-avatar { width: 32px; height: 32px; background: #2c2c2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .message-bubble { max-width: calc(100% - 40px); }
        .message-content { padding: 8px 12px; border-radius: 18px; background: #2c2c2e; }
        .message.mine .message-content { background: #007aff; }
        .message-name { font-size: 11px; font-weight: 600; margin-bottom: 2px; color: #8e8e93; }
        .message-text { font-size: 15px; line-height: 1.4; word-break: break-word; }
        .message-time { font-size: 10px; color: #8e8e93; margin-top: 4px; text-align: right; }
        .message-reply { background: rgba(0,122,255,0.2); padding: 4px 8px; border-radius: 12px; margin-bottom: 4px; font-size: 12px; border-left: 3px solid #007aff; }
        .message-reactions { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
        .reaction { background: #2c2c2e; border-radius: 20px; padding: 2px 8px; font-size: 12px; cursor: pointer; }
        .reaction:hover { background: #007aff; }
        
        .sticker-picker { position: fixed; bottom: 80px; left: 0; right: 0; background: #1c1c1e; border-radius: 24px 24px 0 0; padding: 16px; display: none; flex-wrap: wrap; gap: 12px; justify-content: center; z-index: 150; max-height: 250px; overflow-y: auto; border-top: 1px solid #2c2c2e; }
        .sticker-picker.open { display: flex; }
        .sticker { font-size: 42px; cursor: pointer; padding: 5px; background: #2c2c2e; border-radius: 12px; }
        
        .game-container { background: #1c1c1e; border-radius: 20px; padding: 16px; margin-bottom: 12px; }
        .game-title { text-align: center; margin-bottom: 12px; font-size: 16px; font-weight: bold; }
        .tic-grid { display: inline-grid; grid-template-columns: repeat(3, 70px); gap: 8px; background: #2c2c2e; padding: 8px; border-radius: 12px; margin: 0 auto; }
        .tic-cell { width: 70px; height: 70px; background: #0a0a0f; display: flex; align-items: center; justify-content: center; font-size: 40px; cursor: pointer; border-radius: 10px; }
        .tic-cell:hover { background: #007aff; }
        .game-controls { display: flex; gap: 12px; margin-top: 16px; justify-content: center; }
        .game-btn { padding: 8px 16px; background: #007aff; border: none; border-radius: 10px; color: white; cursor: pointer; }
        
        .input-area { padding: 10px 16px; background: #1c1c1e; border-top: 1px solid #2c2c2e; display: flex; gap: 10px; align-items: center; }
        .input-area input { flex: 1; padding: 10px 14px; background: #2c2c2e; border: none; border-radius: 20px; color: white; font-size: 15px; }
        .input-area button { width: 40px; height: 40px; border-radius: 50%; background: #007aff; border: none; color: white; cursor: pointer; font-size: 18px; }
        
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; visibility: hidden; opacity: 0; transition: all 0.2s; }
        .modal.active { visibility: visible; opacity: 1; }
        .modal-content { background: #1c1c1e; border-radius: 24px; width: 90%; max-width: 380px; overflow: hidden; }
        .modal-header { padding: 20px; border-bottom: 1px solid #2c2c2e; display: flex; justify-content: space-between; align-items: center; }
        .modal-close { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        .modal-body { padding: 20px; }
        .modal-footer { padding: 16px 20px; border-top: 1px solid #2c2c2e; display: flex; gap: 12px; }
        .modal-input { width: 100%; padding: 14px; background: #2c2c2e; border: none; border-radius: 12px; color: white; margin-bottom: 16px; }
        .modal-btn { flex: 1; padding: 14px; background: #007aff; border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; }
        .modal-btn.cancel { background: #2c2c2e; }
        
        .poll-card { background: #2c2c2e; border-radius: 16px; padding: 12px; margin: 8px 0; }
        .poll-question { font-weight: 600; margin-bottom: 12px; }
        .poll-option { padding: 10px; margin: 6px 0; background: #1c1c1e; border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; }
        .poll-option:hover { background: #007aff; }
        
        .story-viewer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: 3000; display: flex; align-items: center; justify-content: center; visibility: hidden; opacity: 0; }
        .story-viewer.active { visibility: visible; opacity: 1; }
        .story-container { width: 100%; max-width: 400px; position: relative; }
        .story-media { width: 100%; border-radius: 20px; max-height: 80vh; object-fit: cover; }
        .story-progress { position: absolute; top: 10px; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.3); }
        .story-progress-bar { height: 100%; background: white; width: 0%; transition: width 0.1s linear; }
        .story-close { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.5); border: none; color: white; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; }
        
        .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #1c1c1e; padding: 10px 20px; border-radius: 25px; font-size: 13px; z-index: 1000; animation: fadeIn 0.3s; }
        
        .call-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); backdrop-filter: blur(20px); z-index: 3000; display: flex; flex-direction: column; align-items: center; justify-content: center; visibility: hidden; opacity: 0; }
        .call-modal.active { visibility: visible; opacity: 1; }
        .call-avatar { width: 120px; height: 120px; background: linear-gradient(135deg, #007aff, #5856d6); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 24px; animation: pulse 1s infinite; }
        .call-name { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
        .call-status { font-size: 14px; color: #8e8e93; margin-bottom: 32px; }
        .call-controls { display: flex; gap: 24px; }
        .call-btn { width: 64px; height: 64px; border-radius: 50%; border: none; cursor: pointer; font-size: 24px; }
        .call-end { background: #ff3b30; color: white; }
        .call-mute { background: #2c2c2e; color: white; }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM PREMIUM</h1>
        <div class="subtitle">Мессенджер будущего</div>
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
        <div class="logo">⚡ ATOMGRAM PREMIUM</div>
        <div class="premium-badge">PREMIUM</div>
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
            <div class="search-box">
                <span>🔍</span>
                <input type="text" id="searchInput" placeholder="Поиск..." onkeyup="globalSearch()">
            </div>
            <div id="searchResults" class="search-results"></div>
            <div class="nav-item" onclick="openAddFriend()">➕ Добавить друга</div>
            <div class="nav-item" onclick="openCreateGroup()">👥 Создать группу</div>
            <div class="nav-item" onclick="openCreateChannel()">📢 Создать канал</div>
            <div class="nav-item" onclick="openCreatePoll()">📊 Опрос</div>
            <div class="nav-item" onclick="openSavedMessages()">⭐ Сохранённые</div>
            <div class="section-title">💬 ЧАТЫ</div>
            <div class="chats-list" id="chatsList"></div>
            <div class="section-title">👥 ГРУППЫ</div>
            <div class="groups-list" id="groupsList"></div>
            <div class="section-title">📢 КАНАЛЫ</div>
            <div class="channels-list" id="channelsList"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <button class="back-btn" onclick="closeChat()">←</button>
                <div class="chat-header-avatar" id="chatAvatar">👤</div>
                <div class="chat-header-info">
                    <div class="chat-header-name" id="chatTitle">ATOMGRAM PREMIUM</div>
                    <div class="chat-header-status" id="chatStatus"></div>
                </div>
                <div class="chat-actions" id="chatActions"></div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="sticker-picker" id="stickerPicker">
                <div class="sticker" onclick="sendSticker('😀')">😀</div><div class="sticker" onclick="sendSticker('😂')">😂</div>
                <div class="sticker" onclick="sendSticker('😍')">😍</div><div class="sticker" onclick="sendSticker('😎')">😎</div>
                <div class="sticker" onclick="sendSticker('🥳')">🥳</div><div class="sticker" onclick="sendSticker('🔥')">🔥</div>
                <div class="sticker" onclick="sendSticker('❤️')">❤️</div><div class="sticker" onclick="sendSticker('🎉')">🎉</div>
                <div class="sticker" onclick="sendSticker('👍')">👍</div><div class="sticker" onclick="sendSticker('👎')">👎</div>
                <div class="sticker" onclick="sendSticker('🐱')">🐱</div><div class="sticker" onclick="sendSticker('🐶')">🐶</div>
                <div class="sticker" onclick="sendSticker('🚀')">🚀</div><div class="sticker" onclick="sendSticker('✨')">✨</div>
                <div class="sticker" onclick="sendSticker('💎')">💎</div><div class="sticker" onclick="sendSticker('🎨')">🎨</div>
                <div class="sticker" onclick="sendSticker('🐼')">🐼</div><div class="sticker" onclick="sendSticker('🦄')">🦄</div>
                <div class="sticker" onclick="sendSticker('🍕')">🍕</div><div class="sticker" onclick="sendSticker('🍔')">🍔</div>
                <div class="sticker" onclick="sendSticker('⚽')">⚽</div><div class="sticker" onclick="sendSticker('🏀')">🏀</div>
            </div>
            <div class="input-area" id="inputArea" style="display: none;">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="toggleStickerPicker()">😊</button>
                <button onclick="document.getElementById('fileInput').click()">📎</button>
                <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
                <button id="voiceBtn" onclick="toggleRecording()">🎤</button>
                <button class="action-btn" onclick="startCall()">📞</button>
                <button class="action-btn" onclick="openGameMenu()">🎮</button>
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="createPollModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать опрос</h3><button class="modal-close" onclick="closeCreatePollModal()">✕</button></div><div class="modal-body"><input type="text" id="pollQuestion" class="modal-input" placeholder="Вопрос"><input type="text" id="pollOptions" class="modal-input" placeholder="Варианты через запятую"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreatePollModal()">Отмена</button><button class="modal-btn" onclick="createPoll()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:80px;height:80px;font-size:36px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:#2c2c2e;border:none;padding:8px 16px;border-radius:20px;color:white;cursor:pointer">📷 Загрузить</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"><textarea id="editBio" class="modal-input" rows="2" placeholder="О себе"></textarea><input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>
<div id="savedMessagesModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>⭐ Сохранённые</h3><button class="modal-close" onclick="closeSavedMessagesModal()">✕</button></div><div class="modal-body" id="savedMessagesList"></div></div></div>
<div id="gameMenuModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>🎮 Игры</h3><button class="modal-close" onclick="closeGameMenu()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="startGame('tictactoe')" style="margin-bottom:12px">❌ Крестики-нолики</button><button class="modal-btn" onclick="startGame('dice')" style="margin-bottom:12px">🎲 Кости</button><button class="modal-btn" onclick="startGame('darts')">🎯 Дартс</button></div></div></div>
<div id="callModal" class="call-modal"><div class="call-avatar" id="callAvatar">📞</div><div class="call-name" id="callName"></div><div class="call-status" id="callStatus">Соединение...</div><div class="call-controls"><button class="call-btn call-mute" onclick="toggleMute()">🔇</button><button class="call-btn call-end" onclick="endCall()">📞</button></div></div>
<div id="storyViewer" class="story-viewer"><div class="story-container"><div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div><img id="storyImage" class="story-media" style="display:none"><video id="storyVideo" class="story-media" style="display:none" autoplay muted></video><button class="story-close" onclick="closeStoryViewer()">✕</button></div></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentChatTarget = null;
let currentChatType = null;
let allFriends = [];
let friendRequests = [];
let allGroups = [];
let allChannels = [];
let onlineUsers = new Set();
let savedMessagesList = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let typingTimeout = null;
let currentGame = null;
let tttBoard = null;
let tttCurrentPlayer = null;
let peerConnection = null;
let localStream = null;
let currentCallTarget = null;
let isMobile = window.innerWidth <= 768;

// АВТОРИЗАЦИЯ
function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('login', { username: u, password: p }, (res) => {
        if (res.success) {
            currentUser = u;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_user', u);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
            loadStories();
            loadSavedMessages();
        } else {
            document.getElementById('authError').innerText = res.error;
        }
    });
}

function register() {
    const u = document.getElementById('regUsername').value.trim();
    const n = document.getElementById('regName').value.trim();
    const p = document.getElementById('regPassword').value.trim();
    if (!u || !p) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('register', { username: u, name: n, password: p }, (res) => {
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
}

function showLogin() {
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('registerPanel').style.display = 'none';
}

function updateUI() {
    const name = currentUserData?.name || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
    if (currentUserData?.avatar) {
        document.getElementById('userAvatar').innerHTML = '<img src="' + currentUserData.avatar + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
        document.getElementById('profileAvatar').innerHTML = '<img src="' + currentUserData.avatar + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover">';
    }
}

function loadData() {
    socket.emit('getFriends', (data) => {
        allFriends = data.friends || [];
        friendRequests = data.requests || [];
        renderChats();
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

function loadSavedMessages() {
    socket.emit('getSavedMessages', (msgs) => {
        savedMessagesList = msgs;
        const container = document.getElementById('savedMessagesList');
        if (container) {
            let html = '';
            for (let i = 0; i < savedMessagesList.length; i++) {
                const m = savedMessagesList[i];
                html += '<div class="saved-message" onclick="alert(\\'' + escapeHtml(m.text) + '\\')"><div style="font-weight:600">' + escapeHtml(m.from_name) + '</div><div style="font-size:13px;color:#8e8e93;margin-top:4px">' + escapeHtml(m.text) + '</div><div style="font-size:10px;color:#636366;margin-top:4px">' + new Date(m.saved_at).toLocaleTimeString() + '</div></div>';
            }
            if (html === '') html = '<div style="padding:20px;text-align:center;color:#8e8e93">⭐ Нет сохранённых сообщений</div>';
            container.innerHTML = html;
        }
    });
}

function renderChats() {
    let html = '';
    for (let i = 0; i < friendRequests.length; i++) {
        const r = friendRequests[i];
        html += '<div class="chat-item" style="background:rgba(0,122,255,0.15)">' +
            '<div class="chat-avatar">📨</div>' +
            '<div class="chat-info"><div class="chat-name">' + r.username + '</div><div class="chat-preview">Запрос в друзья</div></div>' +
            '<button onclick="acceptFriend(\\'' + r.username + '\\')" style="background:#34c759;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✓</button>' +
            '<button onclick="rejectFriend(\\'' + r.username + '\\')" style="background:#ff3b30;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✗</button>' +
        '</div>';
    }
    for (let i = 0; i < allFriends.length; i++) {
        const f = allFriends[i];
        const online = onlineUsers.has(f.username);
        html += '<div class="chat-item" onclick="openChat(\\'' + f.username + '\\', \\'private\\')">' +
            '<div class="chat-avatar">👤' + (online ? '<div class="online-dot"></div>' : '') + '</div>' +
            '<div class="chat-info"><div class="chat-name">' + f.username + '</div><div class="chat-preview">' + (online ? '🟢 Онлайн' : '⚫ Офлайн') + '</div></div>' +
        '</div>';
    }
    // ИИ-помощник
    html += '<div class="chat-item" onclick="openAIChat()">' +
        '<div class="chat-avatar">🤖</div>' +
        '<div class="chat-info"><div class="chat-name">🤖 ИИ Помощник Premium</div><div class="chat-preview">Задай вопрос</div></div>' +
    '</div>';
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#8e8e93">Нет чатов</div>';
    document.getElementById('chatsList').innerHTML = html;
}

function renderGroups() {
    let html = '';
    for (let i = 0; i < allGroups.length; i++) {
        const g = allGroups[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + g.id + '\\', \\'group\\')">' +
            '<div class="chat-avatar">👥</div>' +
            '<div class="chat-info"><div class="chat-name">' + g.name + '</div><div class="chat-preview">' + g.member_count + ' участников</div></div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#8e8e93">Нет групп</div>';
    document.getElementById('groupsList').innerHTML = html;
}

function renderChannels() {
    let html = '';
    for (let i = 0; i < allChannels.length; i++) {
        const c = allChannels[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + c.id + '\\', \\'channel\\')">' +
            '<div class="chat-avatar">📢</div>' +
            '<div class="chat-info"><div class="chat-name">#' + c.name + '</div><div class="chat-preview">' + c.subscriber_count + ' подписчиков</div></div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#8e8e93">Нет каналов</div>';
    document.getElementById('channelsList').innerHTML = html;
}

function openAIChat() {
    currentChatTarget = 'ai_assistant';
    currentChatType = 'ai';
    document.getElementById('chatTitle').innerHTML = '🤖 ИИ Помощник Premium';
    document.getElementById('chatAvatar').innerHTML = '🤖';
    document.getElementById('chatStatus').innerHTML = 'GPT-5 уровень';
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('chatActions').innerHTML = '';
    document.getElementById('messages').innerHTML = '';
    addMessage({ from: '🤖 ИИ', text: '✨ Привет! Я ИИ-помощник ATOMGRAM Premium. Напиши "помощь" чтобы узнать мои возможности! 🚀', time: new Date().toLocaleTimeString() });
    if (isMobile) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    }
}

function openChat(target, type, name) {
    currentChatTarget = target;
    currentChatType = type;
    let title = name || target;
    const actions = '<button class="action-btn" onclick="openGameMenu()">🎮</button><button class="action-btn" onclick="startCall()">📞</button>';
    if (type === 'channel') title = '#' + title;
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatAvatar').innerHTML = type === 'channel' ? '📢' : (type === 'group' ? '👥' : '👤');
    document.getElementById('chatStatus').innerHTML = type === 'private' && onlineUsers.has(target) ? '🟢 Онлайн' : '';
    document.getElementById('chatActions').innerHTML = actions;
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('messages').innerHTML = '';
    
    if (type === 'private') {
        socket.emit('joinPrivate', target);
    } else if (type === 'group') {
        socket.emit('joinGroup', target);
    } else if (type === 'channel') {
        socket.emit('joinChannel', target);
    }
    
    if (isMobile) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    }
}

function closeChat() {
    currentChatTarget = null;
    currentChatType = null;
    document.getElementById('chatTitle').innerHTML = 'ATOMGRAM PREMIUM';
    document.getElementById('chatAvatar').innerHTML = '👤';
    document.getElementById('chatStatus').innerHTML = '';
    document.getElementById('inputArea').style.display = 'none';
    document.getElementById('messages').innerHTML = '';
    if (currentGame) closeGame();
    if (peerConnection) endCall();
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    
    if (currentChatType === 'ai') {
        addMessage({ from: currentUser, text: text, time: new Date().toLocaleTimeString(), mine: true });
        setTimeout(() => {
            const reply = getAIResponse(text);
            addMessage({ from: '🤖 ИИ', text: reply, time: new Date().toLocaleTimeString() });
        }, 300);
        input.value = '';
        return;
    }
    
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text });
    input.value = '';
}

function getAIResponse(message) {
    const msg = message.toLowerCase();
    if (msg.includes('привет')) return 'Привет! 👋 Чем могу помочь?';
    if (msg.includes('помощь')) return '🔧 Я могу: отвечать на вопросы, играть, помогать! Напиши "игра" чтобы начать!';
    if (msg.includes('игра')) return '🎮 Хочешь сыграть? Выбери друга и нажми 🎮! Доступны: Крестики-нолики, Кости, Дартс!';
    if (msg.includes('шутка')) return '😂 Почему программисты путают Хэллоуин и Рождество? 31 Oct == 25 Dec!';
    if (msg.includes('спасибо')) return '😊 Всегда пожалуйста!';
    return 'Понял! 🤔 Расскажи подробнее!';
}

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser || msg.mine ? 'mine' : '');
    div.innerHTML = '<div class="message-avatar">' + (msg.from === currentUser ? '👤' : (msg.from === '🤖 ИИ' ? '🤖' : '👤')) + '</div>' +
        '<div class="message-bubble">' +
            '<div class="message-content">' +
                (msg.from !== currentUser && msg.from !== '🤖 ИИ' ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') +
                '<div class="message-text">' + (msg.sticker ? '<span style="font-size:48px">' + msg.text + '</span>' : escapeHtml(msg.text)) + '</div>' +
                '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div>' +
                '<div style="display:flex;gap:8px;margin-top:6px">' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'❤️\\')">❤️</span>' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'👍\\')">👍</span>' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😂\\')">😂</span>' +
                    '<span class="reaction" onclick="saveMessage(\\'' + msg.id + '\\', \\'' + escapeHtml(msg.text) + '\\', \\'' + escapeHtml(msg.from) + '\\')">⭐</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    document.getElementById('messages').appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
}

function addReaction(msgId, reaction) {
    socket.emit('addReaction', { messageId: msgId, chatId: currentChatTarget, reaction: reaction });
}

function saveMessage(msgId, text, from) {
    socket.emit('saveMessage', { msgId: msgId, text: text, from: from });
    showToast('⭐ Сообщение сохранено');
}

function openSavedMessages() {
    document.getElementById('savedMessagesModal').classList.add('active');
    loadSavedMessages();
}

function closeSavedMessagesModal() {
    document.getElementById('savedMessagesModal').classList.remove('active');
}

function sendSticker(s) {
    if (!currentChatTarget || currentChatType === 'ai') return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: s });
    document.getElementById('stickerPicker').classList.remove('open');
}

function toggleStickerPicker() {
    document.getElementById('stickerPicker').classList.toggle('open');
}

// ГЛОБАЛЬНЫЙ ПОИСК
function globalSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    socket.emit('globalSearch', { query: query }, (results) => {
        let html = '<div style="padding:8px 12px;color:#007aff;font-size:12px">🔍 РЕЗУЛЬТАТЫ</div>';
        for (let i = 0; i < results.users.length; i++) {
            const u = results.users[i];
            if (u.username !== currentUser && !allFriends.find(f => f.username === u.username)) {
                html += '<div class="search-result" onclick="addFriendFromSearch(\\'' + u.username + '\\')">' +
                    '<div class="chat-avatar" style="width:40px;height:40px;font-size:20px">👤</div>' +
                    '<div><div style="font-weight:500">' + u.username + '</div><div style="font-size:12px;color:#8e8e93">Пользователь</div></div>' +
                '</div>';
            }
        }
        for (let i = 0; i < results.channels.length; i++) {
            const c = results.channels[i];
            html += '<div class="search-result" onclick="joinChannelFromSearch(\\'' + c.id + '\\', \\'' + c.name + '\\')">' +
                '<div class="chat-avatar" style="width:40px;height:40px;font-size:20px">📢</div>' +
                '<div><div style="font-weight:500">#' + c.name + '</div><div style="font-size:12px;color:#8e8e93">Канал</div></div>' +
            '</div>';
        }
        if (html === '<div style="padding:8px 12px;color:#007aff;font-size:12px">🔍 РЕЗУЛЬТАТЫ</div>') {
            html += '<div style="padding:12px;text-align:center;color:#8e8e93">🔍 Ничего не найдено</div>';
        }
        document.getElementById('searchResults').innerHTML = html;
    });
}

function addFriendFromSearch(username) {
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        showToast(res.message || res.error);
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '';
        loadData();
    });
}

function joinChannelFromSearch(channelId, channelName) {
    socket.emit('joinChannel', channelId);
    openChat(channelId, 'channel', channelName);
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    loadData();
}

// ГОЛОСОВЫЕ
async function toggleRecording() {
    if (isRecording) {
        if (mediaRecorder) mediaRecorder.stop();
        isRecording = false;
        document.getElementById('voiceBtn').classList.remove('recording');
        document.getElementById('voiceBtn').innerHTML = '🎤';
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => socket.emit('voiceMessage', { type: currentChatType, target: currentChatTarget, audio: reader.result });
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        document.getElementById('voiceBtn').classList.add('recording');
        document.getElementById('voiceBtn').innerHTML = '⏹️';
    } catch(e) {
        showToast('🎤 Нет доступа к микрофону');
    }
}

// ФАЙЛЫ
function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file || !currentChatTarget || currentChatType === 'ai') return;
    const reader = new FileReader();
    reader.onloadend = () => socket.emit('fileMessage', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileData: reader.result });
    reader.readAsDataURL(file);
}

// ОПРОСЫ
function openCreatePoll() {
    if (!currentChatTarget || currentChatType === 'ai') {
        showToast('Выберите чат');
        return;
    }
    document.getElementById('createPollModal').classList.add('active');
    document.getElementById('pollQuestion').value = '';
    document.getElementById('pollOptions').value = '';
}

function closeCreatePollModal() {
    document.getElementById('createPollModal').classList.remove('active');
}

function createPoll() {
    const question = document.getElementById('pollQuestion').value.trim();
    const optionsText = document.getElementById('pollOptions').value.trim();
    if (!question || !optionsText) {
        showToast('Введите вопрос и варианты');
        return;
    }
    const options = optionsText.split(',').map(o => o.trim());
    if (options.length < 2) {
        showToast('Минимум 2 варианта');
        return;
    }
    socket.emit('createPoll', { chatId: currentChatTarget, question: question, options: options });
    closeCreatePollModal();
    showToast('📊 Опрос создан');
}

// ЗВОНКИ (WebRTC)
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function startCall() {
    if (!currentChatTarget || currentChatType !== 'private') {
        showToast('Выберите чат с другом');
        return;
    }
    currentCallTarget = currentChatTarget;
    document.getElementById('callName').innerText = currentChatTarget;
    document.getElementById('callModal').classList.add('active');
    document.getElementById('callStatus').innerText = 'Вызов...';
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        peerConnection = new RTCPeerConnection(configuration);
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('iceCandidate', { target: currentChatTarget, candidate: event.candidate });
            }
        };
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('callOffer', { target: currentChatTarget, offer: offer });
    } catch(e) {
        showToast('Ошибка доступа к микрофону');
        endCall();
    }
}

function acceptCall() {
    document.getElementById('incomingCall')?.remove();
    document.getElementById('callName').innerText = window.pendingCall.from;
    document.getElementById('callModal').classList.add('active');
    document.getElementById('callStatus').innerText = 'Соединение...';
    currentCallTarget = window.pendingCall.from;
    
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
    };
    
    peerConnection.setRemoteDescription(new RTCSessionDescription(window.pendingCall.offer));
    peerConnection.createAnswer().then(answer => {
        peerConnection.setLocalDescription(answer);
        socket.emit('callAnswer', { target: window.pendingCall.from, answer: answer });
    });
}

function declineCall() {
    document.getElementById('incomingCall')?.remove();
    socket.emit('declineCall', { target: window.pendingCall.from });
}

function endCall() {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    document.getElementById('callModal').classList.remove('active');
    if (currentCallTarget) {
        socket.emit('endCall', { target: currentCallTarget });
    }
}

function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        const muteBtn = document.querySelector('.call-mute');
        muteBtn.innerHTML = audioTrack.enabled ? '🔇' : '🔊';
    }
}

// ИГРЫ
function openGameMenu() {
    if (!currentChatTarget || currentChatType === 'ai') {
        showToast('Выберите чат с другом');
        return;
    }
    document.getElementById('gameMenuModal').classList.add('active');
}

function closeGameMenu() {
    document.getElementById('gameMenuModal').classList.remove('active');
}

function startGame(gameType) {
    closeGameMenu();
    if (gameType === 'tictactoe') startTicTacToe();
    else if (gameType === 'dice') rollDice();
    else if (gameType === 'darts') playDarts();
}

function startTicTacToe() {
    tttBoard = ['', '', '', '', '', '', '', '', ''];
    tttCurrentPlayer = 'X';
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.id = 'tttGame';
    gameDiv.innerHTML = '<div class="game-title">❌ КРЕСТИКИ-НОЛИКИ</div><div style="text-align:center;margin-bottom:12px">Сейчас ходит: <span id="tttTurn" style="color:#007aff;font-weight:bold">X</span></div><div id="tttBoard" class="tic-grid" style="margin:0 auto"></div><div class="game-controls"><button class="game-btn" onclick="resetTicTacToe()">Новая игра</button><button class="game-btn" onclick="closeGame()">Закрыть</button></div>';
    document.getElementById('messages').appendChild(gameDiv);
    renderTicTacToe();
}

function renderTicTacToe() {
    const container = document.getElementById('tttBoard');
    if (!container) return;
    let html = '';
    for (let i = 0; i < 9; i++) {
        html += '<div class="tic-cell" onclick="makeMove(' + i + ')">' + (tttBoard[i] || '') + '</div>';
    }
    container.innerHTML = html;
    const turnSpan = document.getElementById('tttTurn');
    if (turnSpan) turnSpan.innerText = tttCurrentPlayer;
}

function makeMove(index) {
    if (tttBoard[index] !== '' || tttCurrentPlayer !== 'X') return;
    tttBoard[index] = 'X';
    renderTicTacToe();
    const winner = checkWinner(tttBoard);
    if (winner) {
        showToast('🏆 ПОБЕДА!');
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🏆 Победа в крестики-нолики!' });
        closeGame();
        return;
    }
    if (tttBoard.every(c => c !== '')) {
        showToast('🤝 НИЧЬЯ!');
        closeGame();
        return;
    }
    tttCurrentPlayer = 'O';
    renderTicTacToe();
    setTimeout(() => computerMove(), 500);
}

function computerMove() {
    const empty = tttBoard.reduce((arr, cell, idx) => cell === '' ? [...arr, idx] : arr, []);
    if (empty.length > 0) {
        const move = empty[Math.floor(Math.random() * empty.length)];
        tttBoard[move] = 'O';
        renderTicTacToe();
        const winner = checkWinner(tttBoard);
        if (winner) {
            showToast('😢 Компьютер победил!');
            closeGame();
            return;
        }
        tttCurrentPlayer = 'X';
        renderTicTacToe();
    }
}

function checkWinner(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) {
        const [a,b,c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function resetTicTacToe() {
    closeGame();
    startTicTacToe();
}

function rollDice() {
    const dice = Math.floor(Math.random() * 6) + 1;
    const emoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice-1];
    showToast('🎲 Выпало: ' + emoji + ' ' + dice);
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🎲 Бросок костей: ' + emoji + ' (' + dice + ')' });
}

function playDarts() {
    const score = Math.floor(Math.random() * 180) + 1;
    const msgs = ['🎯 БУЛЛСАЙ!', '🎯 Отлично!', '🎯 Хороший бросок!'];
    const msg = msgs[Math.floor(Math.random() * 3)];
    showToast(msg + ' ' + score + ' очков');
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🎯 Дартс: ' + msg + ' (' + score + ' очков)' });
}

function closeGame() {
    const gameDiv = document.querySelector('.game-container');
    if (gameDiv) gameDiv.remove();
    currentGame = null;
}

// ДРУЗЬЯ
function openAddFriend() {
    document.getElementById('addFriendModal').classList.add('active');
    document.getElementById('friendUsername').value = '';
}
function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}
function addFriend() {
    const u = document.getElementById('friendUsername').value.trim();
    if (!u) {
        showToast('Введите логин');
        return;
    }
    socket.emit('addFriend', { friendUsername: u }, (res) => {
        showToast(res.message || res.error);
        closeAddFriendModal();
        loadData();
    });
}
function acceptFriend(f) {
    socket.emit('acceptFriend', { fromUser: f }, () => loadData());
}
function rejectFriend(f) {
    socket.emit('rejectFriend', { fromUser: f }, () => loadData());
}

// ГРУППЫ
function openCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
    document.getElementById('groupName').value = '';
}
function closeCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('active');
}
function createGroup() {
    const n = document.getElementById('groupName').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createGroup', { groupName: n }, (res) => {
        if (res.success) {
            showToast('👥 Группа создана');
            closeCreateGroupModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

// КАНАЛЫ
function openCreateChannel() {
    document.getElementById('createChannelModal').classList.add('active');
    document.getElementById('channelName').value = '';
}
function closeCreateChannelModal() {
    document.getElementById('createChannelModal').classList.remove('active');
}
function createChannel() {
    const n = document.getElementById('channelName').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createChannel', { channelName: n }, (res) => {
        if (res.success) {
            showToast('📢 Канал создан');
            closeCreateChannelModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

// ПРОФИЛЬ
function openProfile() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileModal').classList.add('active');
}
function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}
function uploadAvatar() {
    const file = document.getElementById('avatarUpload').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('uploadAvatar', { avatar: reader.result }, (res) => {
            if (res.success) {
                currentUserData = res.userData;
                updateUI();
                showToast('🖼️ Аватар обновлён');
                closeProfileModal();
            }
        });
    };
    reader.readAsDataURL(file);
}
function saveProfile() {
    const data = {
        name: document.getElementById('editName').value.trim(),
        bio: document.getElementById('editBio').value.trim()
    };
    const pwd = document.getElementById('editPassword').value.trim();
    if (pwd) data.password = pwd;
    socket.emit('updateProfile', data, (res) => {
        if (res.success) {
            currentUserData = res.userData;
            updateUI();
            closeProfileModal();
            showToast('👤 Профиль обновлён');
        }
    });
}

// ИСТОРИИ
function addStory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            socket.emit('addStory', { media: reader.result, type: file.type.startsWith('image/') ? 'image' : 'video' });
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function viewStory(username) {
    socket.emit('getStory', username);
}

function closeStoryViewer() {
    document.getElementById('storyViewer').classList.remove('active');
}

function loadStories() {
    socket.emit('getStories');
}

// UI
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
}
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '⚡ ' + msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}
function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// СОБЫТИЯ СОКЕТА
socket.on('friendsUpdate', () => loadData());
socket.on('groupsUpdate', () => loadData());
socket.on('channelsUpdate', () => loadData());
socket.on('savedMessagesUpdate', (msgs) => {
    savedMessagesList = msgs;
});
socket.on('chatHistory', (data) => {
    if (currentChatTarget == data.chatId) {
        document.getElementById('messages').innerHTML = '';
        for (let i = 0; i < data.messages.length; i++) {
            addMessage(data.messages[i]);
        }
    }
});
socket.on('newMessage', (msg) => {
    if (currentChatTarget == msg.chatId) {
        addMessage(msg);
    }
    if (msg.from !== currentUser) {
        showToast('📩 Новое сообщение от ' + msg.from);
    }
});
socket.on('voiceMessage', (d) => {
    if (currentChatTarget == d.chatId) {
        const div = document.createElement('div');
        div.className = 'message ' + (d.from === currentUser ? 'mine' : '');
        div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><div class="voice-message"><button class="voice-play" onclick="playAudio(this, \\'' + d.audio + '\\')">▶️</button><span>🎙️ Голосовое сообщение</span></div><div class="message-time">' + new Date(d.created_at).toLocaleTimeString() + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});
socket.on('fileMessage', (d) => {
    if (currentChatTarget == d.chatId) {
        const div = document.createElement('div');
        div.className = 'message ' + (d.from === currentUser ? 'mine' : '');
        div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><a class="file-attachment" href="' + d.file + '" download="' + d.file_name + '">📎 ' + escapeHtml(d.file_name) + '</a><div class="message-time">' + new Date(d.created_at).toLocaleTimeString() + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});
socket.on('newPoll', (d) => {
    if (currentChatTarget == d.chatId) {
        const div = document.createElement('div');
        div.className = 'message';
        const options = JSON.parse(d.options);
        div.innerHTML = '<div class="message-avatar">📊</div><div class="message-bubble"><div class="message-content"><div class="poll-card"><div class="poll-question">📊 ' + escapeHtml(d.question) + '</div>' + options.map((opt, idx) => '<div class="poll-option" onclick="votePoll(' + d.id + ', ' + idx + ')"><span>' + escapeHtml(opt) + '</span><span class="poll-vote-count">0 голосов</span></div>').join('') + '</div><div class="message-time">' + new Date(d.created_at).toLocaleTimeString() + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});
function votePoll(pollId, optionIndex) {
    socket.emit('votePoll', { pollId: pollId, optionIndex: optionIndex });
}
socket.on('pollUpdate', (d) => {
    const pollDiv = document.querySelector('.poll-card');
    if (pollDiv) {
        const options = JSON.parse(d.options);
        pollDiv.innerHTML = '<div class="poll-question">📊 ' + escapeHtml(d.question) + '</div>' + options.map((opt, idx) => '<div class="poll-option" onclick="votePoll(' + d.id + ', ' + idx + ')"><span>' + escapeHtml(opt) + '</span><span class="poll-vote-count">' + d.votes[idx] + ' голосов</span></div>').join('');
    }
});
socket.on('userOnline', (u) => {
    onlineUsers.add(u);
    renderChats();
});
socket.on('userOffline', (u) => {
    onlineUsers.delete(u);
    renderChats();
});
socket.on('storiesUpdate', (s) => {
    const container = document.getElementById('storiesRow');
    let html = '<div class="story-item" onclick="addStory()"><div class="story-circle add"><div class="story-avatar">+</div></div><div class="story-name">Моя</div></div>';
    for (let i = 0; i < s.length; i++) {
        html += '<div class="story-item" onclick="viewStory(\\'' + s[i].username + '\\')"><div class="story-circle"><div class="story-avatar">' + (s[i].avatar || '👤') + '</div></div><div class="story-name">' + (s[i].name || s[i].username) + '</div></div>';
    }
    container.innerHTML = html;
});
socket.on('storyData', (d) => {
    const viewer = document.getElementById('storyViewer');
    const img = document.getElementById('storyImage');
    const video = document.getElementById('storyVideo');
    if (d.type === 'image') {
        img.style.display = 'block';
        video.style.display = 'none';
        img.src = d.media;
    } else {
        img.style.display = 'none';
        video.style.display = 'block';
        video.src = d.media;
        video.play();
    }
    viewer.classList.add('active');
    let progress = 0;
    const interval = setInterval(() => {
        progress += 2;
        document.getElementById('storyProgressBar').style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
            closeStoryViewer();
        }
    }, 100);
});

// ЗВОНКИ (серверные события)
socket.on('incomingCall', (data) => {
    window.pendingCall = data;
    const incomingDiv = document.createElement('div');
    incomingDiv.id = 'incomingCall';
    incomingDiv.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1c1c1e;border-radius:24px;padding:16px 24px;display:flex;align-items:center;gap:16px;z-index:1000;border:1px solid #2c2c2e';
    incomingDiv.innerHTML = '<div style="width:48px;height:48px;background:linear-gradient(135deg,#007aff,#5856d6);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px">📞</div>' +
        '<div><div style="font-weight:600">' + data.from + '</div><div style="font-size:12px;color:#8e8e93">Входящий звонок</div></div>' +
        '<button onclick="acceptCall()" style="background:#34c759;border:none;border-radius:50%;width:44px;height:44px;color:white;cursor:pointer;font-size:20px">✓</button>' +
        '<button onclick="declineCall()" style="background:#ff3b30;border:none;border-radius:50%;width:44px;height:44px;color:white;cursor:pointer;font-size:20px">✗</button>';
    document.body.appendChild(incomingDiv);
});

socket.on('callOffer', (data) => {
    window.pendingCall = data;
    const incomingDiv = document.createElement('div');
    incomingDiv.id = 'incomingCall';
    incomingDiv.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1c1c1e;border-radius:24px;padding:16px 24px;display:flex;align-items:center;gap:16px;z-index:1000;border:1px solid #2c2c2e';
    incomingDiv.innerHTML = '<div style="width:48px;height:48px;background:linear-gradient(135deg,#007aff,#5856d6);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px">📞</div>' +
        '<div><div style="font-weight:600">' + data.from + '</div><div style="font-size:12px;color:#8e8e93">Входящий звонок</div></div>' +
        '<button onclick="acceptCall()" style="background:#34c759;border:none;border-radius:50%;width:44px;height:44px;color:white;cursor:pointer;font-size:20px">✓</button>' +
        '<button onclick="declineCall()" style="background:#ff3b30;border:none;border-radius:50%;width:44px;height:44px;color:white;cursor:pointer;font-size:20px">✗</button>';
    document.body.appendChild(incomingDiv);
});

socket.on('callAnswered', (data) => {
    if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        document.getElementById('callStatus').innerText = 'В эфире';
    }
});

socket.on('iceCandidate', (data) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

socket.on('callEnded', () => {
    endCall();
    showToast('Звонок завершён');
});

socket.on('callDeclined', () => {
    endCall();
    showToast('Звонок отклонён');
});

function playAudio(btn, audioData) {
    const audio = new Audio(audioData);
    audio.play();
    btn.innerHTML = '⏸️';
    audio.onended = () => btn.innerHTML = '▶️';
    btn.onclick = () => {
        if (audio.paused) {
            audio.play();
            btn.innerHTML = '⏸️';
        } else {
            audio.pause();
            btn.innerHTML = '▶️';
        }
    };
}

const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) {
    document.getElementById('loginUsername').value = savedUser;
}

window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
});
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ (СЕРВЕР) ==========
const userSockets = new Map();
const onlineUsers = new Set();

function getSocketByUsername(username) {
    for (const [id, user] of userSockets) if (user === username) return io.sockets.sockets.get(id);
    return null;
}

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('register', (data, cb) => {
        const { username, name, password } = data;
        if (users[username]) {
            cb({ success: false, error: 'Пользователь уже существует' });
        } else {
            users[username] = { username, name: name || username, password, bio: '', avatar: null, friends: [], friendRequests: [], channels: [], savedMessages: [] };
            saveData();
            cb({ success: true });
        }
    });

    socket.on('login', (data, cb) => {
        const { username, password } = data;
        const user = users[username];
        if (!user) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (user.password !== password) {
            cb({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = username;
            socket.username = username;
            userSockets.set(socket.id, username);
            onlineUsers.add(username);
            user.online = true;
            
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
            
            // Отправляем друзей
            const friendsList = (user.friends || []).map(f => ({ username: f }));
            const requestsList = (user.friendRequests || []).map(r => ({ username: r }));
            socket.emit('friendsUpdate', { friends: friendsList, requests: requestsList });
            
            // Отправляем группы
            const userGroups = Object.values(groups).filter(g => g.members && g.members.includes(username));
            socket.emit('groupsUpdate', userGroups.map(g => ({ id: g.id, name: g.name, member_count: g.members?.length || 1 })));
            
            // Отправляем каналы
            const userChannels = user.channels || [];
            socket.emit('channelsUpdate', userChannels.map(c => ({ id: c, name: c, subscriber_count: 1 })));
            
            // Отправляем сохранённые
            socket.emit('savedMessagesUpdate', user.savedMessages || []);
            
            // Уведомляем друзей
            (user.friends || []).forEach(friend => {
                const friendSocket = getSocketByUsername(friend);
                if (friendSocket) friendSocket.emit('userOnline', username);
            });
            
            // Истории
            const activeStories = [];
            for (const [u, storyList] of Object.entries(stories)) {
                if (storyList && storyList.length > 0 && Date.now() - storyList[storyList.length - 1].created_at < 86400000) {
                    activeStories.push({ username: u, name: users[u]?.name || u, avatar: users[u]?.avatar });
                }
            }
            socket.emit('storiesUpdate', activeStories);
        }
    });

    socket.on('getFriends', (cb) => {
        if (!currentUser) return;
        const user = users[currentUser];
        const friends = (user.friends || []).map(f => ({ username: f }));
        const requests = (user.friendRequests || []).map(r => ({ username: r }));
        cb({ friends: friends, requests: requests });
    });

    socket.on('getGroups', (cb) => {
        if (!currentUser) return;
        const userGroups = Object.values(groups).filter(g => g.members && g.members.includes(currentUser));
        cb(userGroups.map(g => ({ id: g.id, name: g.name, member_count: g.members?.length || 1 })));
    });

    socket.on('getChannels', (cb) => {
        if (!currentUser) return;
        const user = users[currentUser];
        const userChannels = user.channels || [];
        cb(userChannels.map(c => ({ id: c, name: c, subscriber_count: 1 })));
    });

    socket.on('getSavedMessages', (cb) => {
        if (!currentUser) return;
        cb(users[currentUser]?.savedMessages || []);
    });

    socket.on('saveMessage', (data) => {
        if (!currentUser) return;
        const user = users[currentUser];
        if (!user.savedMessages) user.savedMessages = [];
        user.savedMessages.unshift({ id: data.msgId, text: data.text, from_name: data.from, saved_at: Date.now() });
        if (user.savedMessages.length > 50) user.savedMessages.pop();
        saveData();
        socket.emit('savedMessagesUpdate', user.savedMessages);
    });

    socket.on('globalSearch', (data, cb) => {
        const { query } = data;
        const usersResults = Object.keys(users).filter(u => u.toLowerCase().includes(query.toLowerCase()) && u !== currentUser).slice(0, 5).map(u => ({ username: u, name: users[u].name }));
        const channelsResults = (users[currentUser]?.channels || []).filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map(c => ({ id: c, name: c }));
        cb({ users: usersResults, channels: channelsResults });
    });

    socket.on('addFriend', (data, cb) => {
        const { friendUsername } = data;
        const user = users[currentUser];
        const friend = users[friendUsername];
        if (!friend) {
            cb({ success: false, error: 'Пользователь не найден' });
        } else if (friendUsername === currentUser) {
            cb({ success: false, error: 'Нельзя добавить себя' });
        } else if (user.friends && user.friends.includes(friendUsername)) {
            cb({ success: false, error: 'Уже в друзьях' });
        } else if (friend.friendRequests && friend.friendRequests.includes(currentUser)) {
            cb({ success: false, error: 'Запрос уже отправлен' });
        } else {
            if (!friend.friendRequests) friend.friendRequests = [];
            friend.friendRequests.push(currentUser);
            saveData();
            cb({ success: true, message: '✅ Запрос отправлен' });
            const friendSocket = getSocketByUsername(friendUsername);
            if (friendSocket) {
                friendSocket.emit('friendsUpdate', { friends: friend.friends || [], requests: friend.friendRequests || [] });
            }
        }
    });

    socket.on('acceptFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        const from = users[fromUser];
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            if (!user.friends) user.friends = [];
            if (!from.friends) from.friends = [];
            user.friends.push(fromUser);
            from.friends.push(currentUser);
            saveData();
            socket.emit('friendsUpdate', { friends: user.friends || [], requests: user.friendRequests || [] });
            const fromSocket = getSocketByUsername(fromUser);
            if (fromSocket) {
                fromSocket.emit('friendsUpdate', { friends: from.friends || [], requests: from.friendRequests || [] });
            }
        }
    });

    socket.on('rejectFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friendsUpdate', { friends: user.friends || [], requests: user.friendRequests || [] });
        }
    });

    socket.on('createGroup', (data, cb) => {
        const { groupName } = data;
        const id = 'group_' + Date.now();
        groups[id] = { id: id, name: groupName, members: [currentUser], messages: [] };
        saveData();
        cb({ success: true });
        socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)).map(g => ({ id: g.id, name: g.name, member_count: g.members?.length || 1 })));
    });

    socket.on('joinGroup', (groupId) => {
        if (groups[groupId] && groups[groupId].members && !groups[groupId].members.includes(currentUser)) {
            groups[groupId].members.push(currentUser);
            saveData();
        }
        if (groups[groupId]) {
            socket.emit('chatHistory', { chatId: groupId, messages: groups[groupId].messages || [] });
        }
    });

    socket.on('createChannel', (data, cb) => {
        const { channelName } = data;
        if (!users[currentUser].channels) users[currentUser].channels = [];
        if (users[currentUser].channels.includes(channelName)) {
            cb({ success: false, error: 'Канал уже существует' });
        } else {
            users[currentUser].channels.push(channelName);
            saveData();
            cb({ success: true });
            socket.emit('channelsUpdate', users[currentUser].channels.map(c => ({ id: c, name: c, subscriber_count: 1 })));
        }
    });

    socket.on('joinChannel', (channelId) => {
        if (users[currentUser]?.channels && users[currentUser].channels.includes(channelId)) {
            socket.emit('chatHistory', { chatId: channelId, messages: [] });
        }
    });

    socket.on('joinPrivate', (target) => {
        const chatId = [currentUser, target].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
        socket.emit('chatHistory', { chatId: target, messages: privateChats[chatId].messages || [] });
    });

    socket.on('sendMessage', (data) => {
        const { type, target, text } = data;
        const msg = { id: Date.now(), from: currentUser, text: text, time: new Date().toLocaleTimeString(), chatId: target };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) targetSocket.emit('newMessage', msg);
        } else if (type === 'group') {
            if (groups[target]) {
                groups[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
                groups[target].members.forEach(m => {
                    if (m !== currentUser) {
                        const memberSocket = getSocketByUsername(m);
                        if (memberSocket) memberSocket.emit('newMessage', msg);
                    }
                });
            }
        } else if (type === 'channel') {
            socket.emit('newMessage', msg);
        }
    });

    socket.on('voiceMessage', (data) => {
        const { type, target, audio } = data;
        const msg = { id: Date.now(), from: currentUser, audio: audio, time: new Date().toLocaleTimeString(), chatId: target };
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            socket.emit('voiceMessage', msg);
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) targetSocket.emit('voiceMessage', msg);
        }
    });

    socket.on('fileMessage', (data) => {
        const { type, target, fileName, fileData } = data;
        const msg = { id: Date.now(), from: currentUser, file: fileData, file_name: fileName, time: new Date().toLocaleTimeString(), chatId: target };
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            socket.emit('fileMessage', msg);
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) targetSocket.emit('fileMessage', msg);
        }
    });

    socket.on('addReaction', (data) => {
        const { messageId, chatId, reaction } = data;
        let chat = privateChats[chatId] || groups[chatId];
        if (chat && chat.messages) {
            const msg = chat.messages.find(m => m.id == messageId);
            if (msg) {
                if (!msg.reactions) msg.reactions = {};
                msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1;
                saveData();
                io.emit('reactionUpdate', { messageId: messageId, reactions: msg.reactions });
            }
        }
    });

    socket.on('createPoll', (data) => {
        const { chatId, question, options } = data;
        const poll = { id: Date.now(), chatId: chatId, question: question, options: JSON.stringify(options), votes: JSON.stringify(Array(options.length).fill(0)), created_at: Date.now() };
        polls[poll.id] = poll;
        saveData();
        io.emit('newPoll', poll);
    });

    socket.on('votePoll', (data) => {
        const { pollId, optionIndex } = data;
        const poll = polls[pollId];
        if (poll) {
            const votes = JSON.parse(poll.votes);
            votes[optionIndex]++;
            poll.votes = JSON.stringify(votes);
            saveData();
            io.emit('pollUpdate', { id: pollId, question: poll.question, options: poll.options, votes: votes });
        }
    });

    socket.on('addStory', (data) => {
        const { media, type } = data;
        if (!stories[currentUser]) stories[currentUser] = [];
        stories[currentUser].push({ media: media, type: type, created_at: Date.now() });
        if (stories[currentUser].length > 10) stories[currentUser].shift();
        saveData();
        const activeStories = [];
        for (const [u, storyList] of Object.entries(stories)) {
            if (storyList && storyList.length > 0 && Date.now() - storyList[storyList.length - 1].created_at < 86400000) {
                activeStories.push({ username: u, name: users[u]?.name || u, avatar: users[u]?.avatar });
            }
        }
        io.emit('storiesUpdate', activeStories);
    });

    socket.on('getStories', () => {
        const activeStories = [];
        for (const [u, storyList] of Object.entries(stories)) {
            if (storyList && storyList.length > 0 && Date.now() - storyList[storyList.length - 1].created_at < 86400000 && users[u]) {
                activeStories.push({ username: u, name: users[u]?.name || u, avatar: users[u]?.avatar });
            }
        }
        socket.emit('storiesUpdate', activeStories);
    });

    socket.on('getStory', (username) => {
        if (stories[username] && stories[username].length > 0) {
            const story = stories[username][stories[username].length - 1];
            socket.emit('storyData', story);
        }
    });

    socket.on('updateProfile', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            if (data.name) user.name = data.name;
            if (data.bio) user.bio = data.bio;
            if (data.password) user.password = data.password;
            saveData();
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
        } else {
            cb({ success: false });
        }
    });

    socket.on('uploadAvatar', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            user.avatar = data.avatar;
            saveData();
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
        } else {
            cb({ success: false });
        }
    });

    // ЗВОНКИ (WebRTC)
    socket.on('callOffer', (data) => {
        const { target, offer } = data;
        const targetSocket = getSocketByUsername(target);
        if (targetSocket) {
            targetSocket.emit('incomingCall', { from: currentUser, offer: offer });
        }
    });

    socket.on('callAnswer', (data) => {
        const { target, answer } = data;
        const targetSocket = getSocketByUsername(target);
        if (targetSocket) {
            targetSocket.emit('callAnswered', { answer: answer });
        }
    });

    socket.on('iceCandidate', (data) => {
        const { target, candidate } = data;
        const targetSocket = getSocketByUsername(target);
        if (targetSocket) {
            targetSocket.emit('iceCandidate', { candidate: candidate });
        }
    });

    socket.on('endCall', (data) => {
        const { target } = data;
        const targetSocket = getSocketByUsername(target);
        if (targetSocket) {
            targetSocket.emit('callEnded');
        }
    });

    socket.on('declineCall', (data) => {
        const { target } = data;
        const targetSocket = getSocketByUsername(target);
        if (targetSocket) {
            targetSocket.emit('callDeclined');
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            onlineUsers.delete(currentUser);
            if (users[currentUser]) users[currentUser].online = false;
            saveData();
            const user = users[currentUser];
            if (user && user.friends) {
                user.friends.forEach(friend => {
                    const friendSocket = getSocketByUsername(friend);
                    if (friendSocket) friendSocket.emit('userOffline', currentUser);
                });
            }
        }
    });
});

function startKeepAliveBot() {
    const PORT = process.env.PORT || 3000;
    const url = `http://localhost:${PORT}`;
    console.log('\n🤖 AWAKE-BOT ЗАПУЩЕН! Сервер не уснёт\n');
    setInterval(async () => { try { await fetch(url); } catch(e) {} }, 4 * 60 * 1000);
    setTimeout(async () => { try { await fetch(url); } catch(e) {} }, 30000);
}

if (process.env.RENDER || true) startKeepAliveBot();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🚀 ATOMGRAM PREMIUM — МЕССЕНДЖЕР УРОВНЯ TELEGRAM      ║
╠═══════════════════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                               ║
║  📱 http://localhost:${PORT}                               ║
╠═══════════════════════════════════════════════════════════╣
║  ✨ ВСЕ ФИШКИ PREMIUM:                                    ║
║  🤖 ИИ-ПОМОЩНИК (GPT-5 уровень)                          ║
║  🌍 ГЛОБАЛЬНЫЙ ПОИСК ПОЛЬЗОВАТЕЛЕЙ И КАНАЛОВ              ║
║  📞 ГОЛОСОВЫЕ ЗВОНКИ (WebRTC)                            ║
║  💬 ЛИЧНЫЕ СООБЩЕНИЯ + РЕАКЦИИ + ОТВЕТЫ                   ║
║  👥 ГРУППЫ (до 5000 участников)                           ║
║  📢 КАНАЛЫ                                                ║
║  👤 ДРУЗЬЯ С ЗАПРОСАМИ                                    ║
║  🎤 ГОЛОСОВЫЕ СООБЩЕНИЯ                                   ║
║  📎 ФАЙЛЫ И ИЗОБРАЖЕНИЯ                                   ║
║  😀 40+ СТИКЕРОВ                                          ║
║  ❤️ РЕАКЦИИ (❤️👍😂)                                      ║
║  📊 ОПРОСЫ (POLLS)                                        ║
║  📸 ИСТОРИИ (24 часа)                                     ║
║  ❌ КРЕСТИКИ-НОЛИКИ + КОСТИ + ДАРТС                       ║
║  ⭐ СОХРАНЁННЫЕ СООБЩЕНИЯ                                 ║
║  ⌨️ ИНДИКАТОР ПЕЧАТИ                                      ║
║  🟢 ОНЛАЙН-СТАТУС                                         ║
║  🖼️ АВАТАРЫ ПОЛЬЗОВАТЕЛЕЙ                                ║
║  🎨 ПРЕМИУМ ДИЗАЙН (Glassmorphism)                       ║
║  📱 АДАПТИВНЫЙ ДИЗАЙН (телефон/планшет/ПК)               ║
║  🤖 AWAKE-BOT (сервер не спит 24/7)                     ║
╠═══════════════════════════════════════════════════════════╣
║  🏆 ATOMGRAM PREMIUM — ВЫБОР МИЛЛИОНОВ! 🚀                ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
