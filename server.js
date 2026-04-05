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

// ========== СОХРАНЕНИЕ ДАННЫХ ==========
const DATA_FILE = path.join(__dirname, 'data.json');

// Загрузка данных из файла
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            return data;
        }
    } catch (e) { console.log('Ошибка загрузки:', e); }
    return { users: {}, privateChats: {}, publicRooms: { general: { messages: [], users: [] } } };
}

// Сохранение данных в файл
function saveData() {
    const data = {
        users: users,
        privateChats: privateChats,
        publicRooms: publicRooms
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Данные сохранены');
}

// Загружаем данные
let savedData = loadData();
const users = savedData.users;
const privateChats = savedData.privateChats;
const publicRooms = savedData.publicRooms;

// Сохраняем каждые 30 секунд
setInterval(saveData, 30000);

// ========== МИНИ-ИИ (БОТ-ПОМОЩНИК) ==========
function aiBotResponse(message, userName) {
    const msg = message.toLowerCase();
    
    // Приветствия
    if (msg.match(/привет|здравствуй|хай|hello|hi/)) {
        return `Привет, ${userName}! 👋 Я ИИ-помощник ATOMGRAM. Чем могу помочь?`;
    }
    if (msg.match(/как дела|как ты|how are you/)) {
        return `У меня всё отлично! ${userName}, как твои дела? 😊`;
    }
    
    // Помощь
    if (msg.match(/помощь|help|что умеешь|команды/)) {
        return `🤖 *Команды ИИ-помощника:*\n
• Привет, как дела, спасибо — общение
• Погода в [городе] — прогноз
• Новости — последние новости
• Шутка — подниму настроение
• Время, дата — текущее время
• Кто ты, создатель — информация обо мне
• Спасибо, пока — вежливость`;
    }
    
    // Погода
    const weatherMatch = msg.match(/погода\s+в\s+(\w+)/i);
    if (weatherMatch || msg.includes('погода')) {
        const city = weatherMatch ? weatherMatch[1] : 'твоём городе';
        const weathers = ['солнечно', 'облачно', 'небольшой дождь', 'ясно', 'ветрено'];
        const temps = ['+15', '+18', '+22', '+10', '+25'];
        const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
        const randomTemp = temps[Math.floor(Math.random() * temps.length)];
        return `🌤️ Погода в ${city}: ${randomWeather}, ${randomTemp}°C`;
    }
    
    // Новости
    if (msg.includes('новости')) {
        const news = [
            '🚀 ATOMGRAM: новый мессенджер набирает популярность!',
            '💡 ИИ-помощник теперь доступен в ATOMGRAM',
            '📱 Обновление: голосовые сообщения и профили',
            '🌍 1000+ пользователей выбрали ATOMGRAM'
        ];
        return '📰 *Последние новости:*\n• ' + news.join('\n• ');
    }
    
    // Шутки
    if (msg.includes('шутк')) {
        const jokes = [
            'Почему программисты не любят природу? Слишком много багов 🐛',
            'Что говорит один сервер другому? "У тебя всё нормально с памятью?" 💾',
            'Сколько программистов нужно, чтобы заменить лампочку? Ни одного, это аппаратная проблема 🔧'
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    // Время и дата
    if (msg.includes('время') || msg.includes('дата')) {
        const now = new Date();
        return `📅 Сегодня ${now.toLocaleDateString('ru-RU')}\n⏰ Точное время: ${now.toLocaleTimeString('ru-RU')}`;
    }
    
    // Информация о боте
    if (msg.includes('кто ты') || msg.includes('создатель')) {
        return `🤖 Я ИИ-помощник ATOMGRAM!\nСоздан для помощи в общении.\nУмею отвечать на вопросы, давать прогноз погоды, рассказывать новости и шутить.`;
    }
    
    // Благодарности
    if (msg.includes('спасиб')) {
        return `Пожалуйста, ${userName}! Всегда рад помочь 😊`;
    }
    
    // Прощание
    if (msg.includes('пока') || msg.includes('до свидания')) {
        return `До свидания, ${userName}! Возвращайся в ATOMGRAM 👋`;
    }
    
    // Если ничего не подошло
    if (msg.length > 5) {
        return `Интересно, ${userName}! Напиши "помощь", чтобы узнать, что я умею.`;
    }
    
    return null;
}

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM - Мессенджер с ИИ</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #0a0a0a; height: 100vh; overflow: hidden; }
        
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
            font-weight: bold;
            cursor: pointer;
        }
        .switch-btn {
            background: transparent !important;
            border: 1px solid #667eea !important;
        }
        .error-msg { color: #ff6b6b; margin-top: 10px; font-size: 14px; }
        .success-msg { color: #4ade80; margin-top: 10px; font-size: 14px; }
        
        #mainApp {
            display: none;
            width: 100%;
            height: 100vh;
            display: flex;
            position: relative;
        }
        /* Боковое меню (как в Telegram) */
        .sidebar {
            position: fixed;
            left: -280px;
            top: 0;
            width: 280px;
            height: 100%;
            background: #1a1a2e;
            transition: left 0.3s ease;
            z-index: 100;
            display: flex;
            flex-direction: column;
        }
        .sidebar.open {
            left: 0;
        }
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 99;
            display: none;
        }
        .sidebar-overlay.open {
            display: block;
        }
        .sidebar-header {
            padding: 50px 20px 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .avatar {
            font-size: 50px;
            background: #2a2a3e;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .user-info-header h3 { color: white; font-size: 18px; }
        .user-info-header .username { font-size: 12px; color: #888; }
        .menu-item {
            padding: 15px 20px;
            color: #ccc;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: background 0.2s;
        }
        .menu-item:hover { background: rgba(102,126,234,0.1); }
        .menu-item span:first-child { font-size: 22px; }
        .section-title {
            padding: 15px 20px 5px 20px;
            font-size: 11px;
            color: #667eea;
            text-transform: uppercase;
        }
        .rooms-list, .users-list {
            padding: 10px;
            overflow-y: auto;
            max-height: 200px;
        }
        .room-item, .user-item {
            padding: 10px 15px;
            margin: 4px 0;
            border-radius: 15px;
            cursor: pointer;
            color: #ccc;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .room-item:hover, .user-item:hover { background: rgba(102,126,234,0.2); }
        .room-item.active, .user-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        
        /* Основная область чата */
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            width: 100%;
        }
        .chat-header {
            padding: 15px 20px;
            background: #1a1a2e;
            color: white;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .menu-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
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
            animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message-content {
            max-width: 75%;
            padding: 10px 16px;
            border-radius: 20px;
            background: #2a2a3e;
            color: white;
        }
        .message.my-message { align-items: flex-end; }
        .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .message-username { font-size: 11px; color: #a0a0c0; margin-bottom: 4px; }
        .message-text { font-size: 14px; word-wrap: break-word; }
        .voice-message {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .voice-message button {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
        }
        .message-time {
            font-size: 9px;
            color: #888;
            margin-top: 4px;
        }
        .typing-indicator {
            font-size: 11px;
            color: #888;
            padding: 5px 20px;
            font-style: italic;
        }
        .input-area {
            display: flex;
            padding: 15px 20px;
            background: #1a1a2e;
            border-top: 1px solid rgba(255,255,255,0.1);
            gap: 10px;
        }
        .input-area input {
            flex: 1;
            padding: 12px 18px;
            border: none;
            border-radius: 25px;
            background: #2a2a3e;
            color: white;
            font-size: 16px;
        }
        .input-area button {
            padding: 12px 18px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
        }
        .voice-record-btn {
            background: #ff6b6b !important;
        }
        .voice-record-btn.recording {
            animation: pulse 1s infinite;
            background: #ff4444 !important;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        .modal-content {
            background: #1a1a2e;
            border-radius: 30px;
            width: 90%;
            max-width: 400px;
            max-height: 90vh;
            overflow-y: auto;
        }
        .modal-header {
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            position: relative;
        }
        .modal-header h3 { color: white; font-size: 20px; }
        .close-modal {
            position: absolute;
            right: 20px;
            top: 20px;
            background: none;
            border: none;
            color: #888;
            font-size: 24px;
            cursor: pointer;
        }
        .profile-avatar-section {
            text-align: center;
            padding: 30px;
        }
        .profile-avatar {
            font-size: 80px;
            background: #2a2a3e;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            cursor: pointer;
        }
        .profile-field {
            padding: 15px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .profile-field label {
            display: block;
            font-size: 11px;
            color: #667eea;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .profile-field input, .profile-field textarea {
            width: 100%;
            padding: 10px;
            background: #2a2a3e;
            border: none;
            border-radius: 15px;
            color: white;
            font-size: 16px;
        }
        .profile-field textarea { resize: none; height: 60px; }
        .avatar-picker {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
            padding: 10px;
            background: #2a2a3e;
            border-radius: 20px;
        }
        .avatar-option {
            font-size: 35px;
            cursor: pointer;
            padding: 5px;
            border-radius: 50%;
        }
        .avatar-option:hover { background: #3a3a4e; }
        .modal-footer {
            padding: 20px;
        }
        .save-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 16px;
            cursor: pointer;
        }
        @media (min-width: 769px) {
            .sidebar {
                position: relative;
                left: 0 !important;
                width: 280px;
            }
            .sidebar-overlay { display: none !important; }
            .menu-btn { display: none; }
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
        <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header" onclick="openProfileModal()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="user-info-header">
                    <h3 id="userDisplayName">Загрузка...</h3>
                    <div class="username" id="userUsername">@</div>
                </div>
            </div>
            <div class="menu-item" onclick="openProfileModal()">
                <span>👤</span> <span>Мой профиль</span>
            </div>
            <div class="menu-item" onclick="createNewChat()">
                <span>💬</span> <span>Новый чат</span>
            </div>
            <div class="section-title">📢 ОБЩИЕ ЧАТЫ</div>
            <div class="rooms-list" id="roomsList"></div>
            <div class="section-title">💬 ОНЛАЙН</div>
            <div class="users-list" id="usersList"></div>
            <div class="new-room" style="padding: 15px;">
                <input type="text" id="newRoomName" placeholder="Название чата">
                <button onclick="createRoom()" style="width:100%; padding:10px; background:#2a2a3e; border:1px solid #667eea; border-radius:20px; color:#667eea; margin-top:8px;">+ Создать чат</button>
            </div>
        </div>
        <div class="chat-area">
            <div class="chat-header">
                <button class="menu-btn" onclick="toggleSidebar()">☰</button>
                <span id="currentChatTitle">Выберите чат</span>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="typing-indicator" id="typingIndicator" style="display:none"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Введите сообщение...">
                <button id="voiceBtn" class="voice-record-btn" onclick="toggleRecording()">🎤</button>
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>

    <!-- Модальное окно профиля -->
    <div id="profileModal" class="modal" style="display:none">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Мой профиль</h3>
                <button class="close-modal" onclick="closeProfileModal()">✕</button>
            </div>
            <div class="profile-avatar-section">
                <div class="profile-avatar" id="profileAvatar" onclick="toggleAvatarPicker()">👤</div>
                <div id="avatarPicker" class="avatar-picker" style="display:none">
                    <div class="avatar-option" onclick="selectAvatar('😀')">😀</div>
                    <div class="avatar-option" onclick="selectAvatar('😎')">😎</div>
                    <div class="avatar-option" onclick="selectAvatar('👨')">👨</div>
                    <div class="avatar-option" onclick="selectAvatar('👩')">👩</div>
                    <div class="avatar-option" onclick="selectAvatar('🦸')">🦸</div>
                    <div class="avatar-option" onclick="selectAvatar('🐱')">🐱</div>
                    <div class="avatar-option" onclick="selectAvatar('🚀')">🚀</div>
                    <div class="avatar-option" onclick="selectAvatar('💻')">💻</div>
                    <div class="avatar-option" onclick="selectAvatar('🤖')">🤖</div>
                </div>
            </div>
            <div class="profile-field">
                <label>Имя</label>
                <input type="text" id="editName" placeholder="Ваше имя">
            </div>
            <div class="profile-field">
                <label>О себе</label>
                <textarea id="editBio" placeholder="Расскажите о себе..."></textarea>
            </div>
            <div class="profile-field">
                <label>Новый пароль (оставьте пустым)</label>
                <input type="password" id="editPassword" placeholder="Новый пароль">
            </div>
            <div class="modal-footer">
                <button class="save-btn" onclick="saveProfile()">Сохранить</button>
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
        let allRooms = [];
        let allUsers = [];
        let selectedAvatar = '👤';
        
        // Боковое меню
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebarOverlay').classList.toggle('open');
        }
        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('open');
        }
        
        function createNewChat() {
            const userName = prompt('Введите логин пользователя для начала чата:');
            if (userName && userName !== currentUser) {
                startPrivateChat(userName);
                closeSidebar();
            } else if (userName === currentUser) {
                alert('Нельзя начать чат с самим собой');
            }
        }
        
        // Голосовые сообщения
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;
        
        async function toggleRecording() {
            if (isRecording) { stopRecording(); } 
            else { startRecording(); }
        }
        
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => sendVoiceMessage(reader.result);
                    reader.readAsDataURL(audioBlob);
                    stream.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start();
                isRecording = true;
                const btn = document.getElementById('voiceBtn');
                btn.classList.add('recording');
                btn.innerHTML = '⏹️';
            } catch(err) { alert('Нет доступа к микрофону'); }
        }
        
        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                const btn = document.getElementById('voiceBtn');
                btn.classList.remove('recording');
                btn.innerHTML = '🎤';
            }
        }
        
        function sendVoiceMessage(base64Audio) {
            if (!currentChat) { alert('Выберите чат'); return; }
            socket.emit('voice message', { type: currentChatType, target: currentChatTarget, audio: base64Audio });
        }
        
        function showNotification(title, body) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body: body });
            }
            const notif = document.createElement('div');
            notif.className = 'notification';
            notif.innerHTML = '<strong>' + title + '</strong><br>' + body;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }
        
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Индикатор печати
        let typingTimeout = null;
        function sendTyping() {
            if (currentChatType === 'private' && currentChatTarget) {
                socket.emit('typing', { to: currentChatTarget });
                if (typingTimeout) clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    socket.emit('stop typing', { to: currentChatTarget });
                }, 1000);
            }
        }
        
        // Профиль
        function openProfileModal() {
            document.getElementById('editName').value = currentUserData?.name || '';
            document.getElementById('editBio').value = currentUserData?.bio || '';
            document.getElementById('editPassword').value = '';
            document.getElementById('profileAvatar').innerHTML = currentUserData?.avatar || '👤';
            selectedAvatar = currentUserData?.avatar || '👤';
            document.getElementById('profileModal').style.display = 'flex';
            closeSidebar();
        }
        
        function closeProfileModal() {
            document.getElementById('profileModal').style.display = 'none';
            document.getElementById('avatarPicker').style.display = 'none';
        }
        
        function toggleAvatarPicker() {
            const picker = document.getElementById('avatarPicker');
            picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
        }
        
        function selectAvatar(avatar) {
            selectedAvatar = avatar;
            document.getElementById('profileAvatar').innerHTML = avatar;
            document.getElementById('avatarPicker').style.display = 'none';
        }
        
        function saveProfile() {
            const data = {
                login: currentUser,
                name: document.getElementById('editName').value.trim(),
                bio: document.getElementById('editBio').value.trim(),
                avatar: selectedAvatar
            };
            const newPassword = document.getElementById('editPassword').value.trim();
            if (newPassword) data.password = newPassword;
            
            socket.emit('update profile', data, (res) => {
                if (res.success) {
                    currentUserData = res.userData;
                    updateProfileUI();
                    closeProfileModal();
                    showNotification('Профиль', 'Данные сохранены');
                } else { alert(res.error); }
            });
        }
        
        function updateProfileUI() {
            document.getElementById('userDisplayName').innerText = currentUserData?.name || currentUser;
            document.getElementById('userUsername').innerText = '@' + currentUser;
            document.getElementById('userAvatar').innerHTML = currentUserData?.avatar || '👤';
        }
        
        // Авторизация
        function login() {
            const login = document.getElementById('login').value.trim();
            const password = document.getElementById('password').value.trim();
            if (!login || !password) {
                document.getElementById('authError').innerText = 'Заполните все поля';
                return;
            }
            socket.emit('login', { login, password }, (res) => {
                if (res.success) {
                    currentUser = login;
                    currentUserData = res.userData;
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('mainApp').style.display = 'flex';
                    updateProfileUI();
                    loadData();
                } else {
                    document.getElementById('authError').innerText = res.error;
                }
            });
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
                    document.getElementById('authError').innerText = '✅ Регистрация успешна! Теперь войдите.';
                    showLogin();
                } else {
                    document.getElementById('authError').className = 'error-msg';
                    document.getElementById('authError').innerText = res.error;
                }
            });
        }
        
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
        
        function loadData() {
            socket.emit('getRooms', (rooms) => {
                allRooms = rooms;
                renderRooms();
            });
            socket.emit('getUsers', (users) => {
                allUsers = users.filter(u => u !== currentUser);
                renderUsers();
            });
        }
        
        function renderRooms() {
            const container = document.getElementById('roomsList');
            container.innerHTML = allRooms.map(room => 
                '<div class="room-item' + (currentChat === 'room:' + room ? ' active' : '') + '" onclick="joinRoom(\\'' + room + '\\')">#' + room + '</div>'
            ).join('');
        }
        
        function renderUsers() {
            const container = document.getElementById('usersList');
            const usersData = window.usersProfiles || {};
            container.innerHTML = allUsers.map(user => {
                const userData = usersData[user] || {};
                return '<div class="user-item' + (currentChat === 'user:' + user ? ' active' : '') + '" onclick="startPrivateChat(\\'' + user + '\\')">' +
                    '<span>' + (userData.avatar || '👤') + '</span>' +
                    '<span>' + (userData.name || user) + '</span>' +
                    '<span style="margin-left:auto; font-size:10px; color:#4ade80;">🟢</span></div>';
            }).join('');
        }
        
        window.usersProfiles = {};
        socket.on('users list with profiles', (profiles) => {
            profiles.forEach(p => { window.usersProfiles[p.username] = p; });
            allUsers = profiles.filter(p => p.username !== currentUser).map(p => p.username);
            renderUsers();
        });
        
        function joinRoom(roomName) {
            currentChat = 'room:' + roomName;
            currentChatType = 'room';
            currentChatTarget = roomName;
            socket.emit('joinRoom', roomName);
            document.getElementById('currentChatTitle').innerHTML = '# ' + roomName;
            renderRooms(); renderUsers();
            closeSidebar();
        }
        
        function startPrivateChat(userName) {
            currentChat = 'user:' + userName;
            currentChatType = 'private';
            currentChatTarget = userName;
            socket.emit('joinPrivate', userName);
            const userData = window.usersProfiles[userName] || {};
            document.getElementById('currentChatTitle').innerHTML = '💬 ' + (userData.name || userName);
            renderRooms(); renderUsers();
            closeSidebar();
        }
        
        function createRoom() {
            const newRoom = document.getElementById('newRoomName').value.trim();
            if (!newRoom) return;
            socket.emit('createRoom', newRoom, (success) => {
                if (success) {
                    document.getElementById('newRoomName').value = '';
                    loadData();
                    setTimeout(() => joinRoom(newRoom), 500);
                } else { alert('Чат уже существует!'); }
            });
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text || !currentChat) return;
            if (currentChatType === 'room') {
                socket.emit('chat message', { type: 'room', target: currentChatTarget, text });
            } else {
                socket.emit('chat message', { type: 'private', target: currentChatTarget, text });
            }
            input.value = '';
            if (typingTimeout) clearTimeout(typingTimeout);
            socket.emit('stop typing', { to: currentChatTarget });
        }
        
        document.getElementById('messageInput').addEventListener('input', sendTyping);
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        socket.on('typing', (data) => {
            if (currentChatType === 'private' && currentChatTarget === data.from) {
                const userData = window.usersProfiles[data.from] || {};
                const name = userData.name || data.from;
                document.getElementById('typingIndicator').innerHTML = name + ' печатает...';
                document.getElementById('typingIndicator').style.display = 'block';
                setTimeout(() => {
                    document.getElementById('typingIndicator').style.display = 'none';
                }, 2000);
            }
        });
        
        socket.on('stop typing', () => {
            document.getElementById('typingIndicator').style.display = 'none';
        });
        
        socket.on('chat history', (data) => {
            if ((currentChatType === 'room' && data.type === 'room' && data.room === currentChatTarget) ||
                (currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget)) {
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                data.messages.forEach(msg => addMessage(msg));
                scrollToBottom();
            }
        });
        
        socket.on('chat message', (msg) => {
            let shouldShow = false;
            if (msg.type === 'room' && currentChatType === 'room' && msg.room === currentChatTarget) shouldShow = true;
            if (msg.type === 'private' && currentChatType === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) shouldShow = true;
            if (shouldShow) {
                addMessage(msg);
                scrollToBottom();
            }
            if (msg.from !== currentUser) {
                const userData = window.usersProfiles[msg.from] || {};
                const name = userData.name || msg.from;
                if (msg.type === 'private') showNotification(name, msg.text);
                else if (msg.type === 'room' && currentChatTarget !== msg.room) showNotification('Чат ' + msg.room, name + ': ' + msg.text);
            }
        });
        
        socket.on('voice message', (data) => {
            let shouldShow = false;
            if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) shouldShow = true;
            if (shouldShow) {
                addVoiceMessage(data);
                scrollToBottom();
            }
            if (data.from !== currentUser && data.type === 'private') {
                const userData = window.usersProfiles[data.from] || {};
                const name = userData.name || data.from;
                showNotification(name, '🎤 Голосовое сообщение');
            }
        });
        
        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (msg.from === currentUser) div.className += ' my-message';
            const userData = window.usersProfiles[msg.from] || {};
            const displayName = userData.name || msg.from;
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(displayName) + '</div><div class="message-text">' + escapeHtml(msg.text) + '</div><div class="message-time">' + msg.time + '</div></div>';
            messagesDiv.appendChild(div);
        }
        
        function addVoiceMessage(data) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (data.from === currentUser) div.className += ' my-message';
            const userData = window.usersProfiles[data.from] || {};
            const displayName = userData.name || data.from;
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(displayName) + '</div><div class="voice-message"><button onclick="playAudio(this)" data-audio="' + data.audio + '">▶️</button><span>Голосовое сообщение</span></div><div class="message-time">' + data.time + '</div></div>';
            messagesDiv.appendChild(div);
        }
        
        function playAudio(btn) {
            const audioBase64 = btn.getAttribute('data-audio');
            const audio = new Audio(audioBase64);
            audio.play();
            btn.innerHTML = '⏸️';
            audio.onended = () => { btn.innerHTML = '▶️'; };
        }
        
        socket.on('users update', (users) => {
            allUsers = users.filter(u => u !== currentUser);
            renderUsers();
        });
        
        socket.on('rooms update', (rooms) => {
            allRooms = rooms;
            renderRooms();
        });
        
        socket.on('profile updated', (data) => {
            if (data.username === currentUser) {
                currentUserData = data;
                updateProfileUI();
            }
            if (window.usersProfiles[data.username]) {
                window.usersProfiles[data.username] = data;
                renderUsers();
            }
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

// ========== СЕРВЕРНАЯ ЛОГИКА ==========
const usersOnline = new Map();

io.on('connection', (socket) => {
    let currentUser = null;
    let currentRoom = null;

    socket.on('register', (data, callback) => {
        const { login, password, name } = data;
        if (users[login]) {
            callback({ success: false, error: 'Пользователь уже существует' });
        } else {
            users[login] = { 
                password: password, 
                name: name || login,
                username: login,
                avatar: '👤',
                bio: '',
                status: 'online',
                lastSeen: new Date()
            };
            saveData();
            callback({ success: true });
            sendProfileList();
        }
    });

    socket.on('login', (data, callback) => {
        const { login, password } = data;
        if (!users[login]) {
            callback({ success: false, error: 'Пользователь не найден' });
        } else if (users[login].password !== password) {
            callback({ success: false, error: 'Неверный пароль' });
        } else {
            currentUser = login;
            usersOnline.set(socket.id, currentUser);
            users[login].status = 'online';
            callback({ success: true, userData: users[login] });
            sendUserList();
            sendProfileList();
        }
    });

    socket.on('update profile', (data, callback) => {
        if (users[data.login]) {
            if (data.name !== undefined) users[data.login].name = data.name;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.avatar !== undefined) users[data.login].avatar = data.avatar;
            if (data.password) users[data.login].password = data.password;
            saveData();
            callback({ success: true, userData: users[data.login] });
            io.emit('profile updated', users[data.login]);
            sendProfileList();
        } else {
            callback({ success: false, error: 'Пользователь не найден' });
        }
    });

    socket.on('typing', (data) => {
        const targetSocket = getSocketByUsername(data.to);
        if (targetSocket) targetSocket.emit('typing', { from: currentUser });
    });

    socket.on('stop typing', (data) => {
        const targetSocket = getSocketByUsername(data.to);
        if (targetSocket) targetSocket.emit('stop typing');
    });

    function getSocketByUsername(username) {
        for (let [id, user] of usersOnline.entries()) {
            if (user === username) return io.sockets.sockets.get(id);
        }
        return null;
    }

    function sendUserList() {
        io.emit('users update', Array.from(usersOnline.values()));
    }

    function sendProfileList() {
        const profiles = Object.keys(users).map(login => users[login]);
        io.emit('users list with profiles', profiles);
    }

    socket.on('getRooms', (callback) => {
        callback(Object.keys(publicRooms));
    });

    socket.on('getUsers', (callback) => {
        callback(Array.from(usersOnline.values()));
    });

    socket.on('createRoom', (roomName, callback) => {
        if (!publicRooms[roomName]) {
            publicRooms[roomName] = { messages: [], users: [] };
            saveData();
            callback(true);
            io.emit('rooms update', Object.keys(publicRooms));
        } else {
            callback(false);
        }
    });

    socket.on('joinRoom', (roomName) => {
        if (currentRoom) socket.leave(currentRoom);
        currentRoom = roomName;
        socket.join(roomName);
        socket.emit('chat history', {
            type: 'room',
            room: roomName,
            messages: publicRooms[roomName]?.messages || []
        });
    });

    socket.on('joinPrivate', (targetUser) => {
        currentRoom = null;
        const chatId = [currentUser, targetUser].sort().join('_');
        if (!privateChats[chatId]) {
            privateChats[chatId] = { messages: [], users: [currentUser, targetUser] };
            saveData();
        }
        socket.emit('chat history', {
            type: 'private',
            with: targetUser,
            messages: privateChats[chatId].messages || []
        });
    });

    socket.on('chat message', (data) => {
        const { type, target, text } = data;
        const msg = {
            id: Date.now(),
            from: currentUser,
            text: text,
            time: new Date().toLocaleTimeString(),
            type: type
        };

        if (type === 'room') {
            msg.room = target;
            if (publicRooms[target]) {
                publicRooms[target].messages.push(msg);
                if (publicRooms[target].messages.length > 200) publicRooms[target].messages.shift();
                io.to(target).emit('chat message', msg);
                saveData();
            }
        } else if (type === 'private') {
            msg.to = target;
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
            privateChats[chatId].messages.push(msg);
            if (privateChats[chatId].messages.length > 200) privateChats[chatId].messages.shift();
            io.emit('chat message', msg);
            saveData();
            
            // ИИ-ответ для бота assistant (встроенный ИИ)
            if (target === 'assistant' || currentUser === 'assistant') {
                const aiResponse = aiBotResponse(text, currentUser);
                if (aiResponse) {
                    setTimeout(() => {
                        const botMsg = {
                            id: Date.now() + 1,
                            from: 'assistant',
                            text: aiResponse,
                            time: new Date().toLocaleTimeString(),
                            type: 'private',
                            to: currentUser
                        };
                        const botChatId = [currentUser, 'assistant'].sort().join('_');
                        if (!privateChats[botChatId]) privateChats[botChatId] = { messages: [], users: [currentUser, 'assistant'] };
                        privateChats[botChatId].messages.push(botMsg);
                        io.emit('chat message', botMsg);
                        saveData();
                    }, 500);
                }
            }
        }
    });

    socket.on('voice message', (data) => {
        const { type, target, audio } = data;
        const msg = {
            id: Date.now(),
            from: currentUser,
            audio: audio,
            time: new Date().toLocaleTimeString(),
            type: type
        };
        if (type === 'private') {
            msg.to = target;
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [], users: [currentUser, target] };
            privateChats[chatId].messages.push(msg);
            io.emit('voice message', msg);
            saveData();
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            usersOnline.delete(socket.id);
            users[currentUser].status = 'away';
            sendUserList();
            sendProfileList();
            saveData();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ATOMGRAM с ИИ и сохранением запущен на порту ' + PORT);
    console.log('🤖 ИИ-помощник доступен по логину: assistant');
    console.log('📁 Данные сохраняются в data.json');
});
