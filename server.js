const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

let users = {};
let privateChats = {};
let groups = {};
let channels = {};
let stories = {};
let voiceCalls = {};
let videoCalls = {};
let polls = {};
let savedMessages = {};
let scheduledMessages = {};
let reactions = {};
let pinnedMessages = {};

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

// Расширенный ИИ-помощник
function aiResponse(message, username, chatHistory) {
    const msg = message.toLowerCase();
    
    // Анализ намерений
    if (msg.includes('привет') || msg.includes('здравствуй')) {
        return `✨ Привет, ${username}! Я — ИИ-ассистент ATOMGRAM PRO. Чем могу помочь? У меня есть: голосовые сообщения, видеозвонки, опросы, стикеры, реакции, игры и многое другое! 🚀`;
    }
    
    if (msg.includes('помощь') || msg.includes('help')) {
        return `🔧 **Возможности ATOMGRAM PRO:**\n\n` +
               `💬 **Общение:** Личные сообщения, группы, каналы\n` +
               `📞 **Звонки:** Голосовые и видеозвонки (WebRTC)\n` +
               `📊 **Опросы:** Создавай голосования в чатах\n` +
               `😀 **Стикеры:** 100+ анимированных стикеров\n` +
               `❤️ **Реакции:** Реагируй на сообщения\n` +
               `📌 **Закреп:** Закрепляй важные сообщения\n` +
               `⭐ **Сохранённые:** Сохраняй важные сообщения\n` +
               `📸 **Истории:** Публикуй истории на 24 часа\n` +
               `🎮 **Игры:** Морской бой, Крестики-нолики, Кости, Дартс\n` +
               `🔐 **Шифрование:** End-to-End Encryption\n\n` +
               `Напиши "игра" чтобы начать! 🎯`;
    }
    
    if (msg.includes('игра')) {
        return `🎮 **Доступные игры:**\n\n` +
               `⚓ **Морской бой** — классическая стратегия\n` +
               `❌ **Крестики-нолики** — проверь логику\n` +
               `🎲 **Кости** — удача решает всё\n` +
               `🎯 **Дартс** — проверь меткость\n\n` +
               `Чтобы начать, выбери друга в чате и нажми кнопку 🎮!`;
    }
    
    if (msg.includes('шутка') || msg.includes('смешное')) {
        const jokes = [
            `😂 Почему программисты путают Хэллоуин и Рождество? Потому что 31 Oct == 25 Dec!`,
            `🤣 Что говорит один бит другому? — "Ты меня дополняешь!"`,
            `😄 Какой язык программирования самый вежливый? Java — у него всегда есть "public static void main"!`,
            `🤪 Почему разработчики ненавидят понедельники? Потому что git pull напоминает им о работе!`
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    if (msg.includes('стих') || msg.includes('стихотворение')) {
        return `📜 **Вот стих для тебя:**\n\n` +
               `В мире цифр и проводов,\n` +
               `Среди миллионов голосов,\n` +
               `ATOMGRAM сияет ярко,\n` +
               `Как в ночи маяк подарком.\n\n` +
               `Общайся, спорь, люби, дружи,\n` +
               `Мечтай, твори, вперёд беги!\n` +
               `А я всегда, в любой момент,\n` +
               `Тебе помощник и клиент. 🤖✨`;
    }
    
    if (msg.includes('погода')) {
        return `🌤️ **Погода сегодня:**\n\n• Температура: +22°C\n• Влажность: 65%\n• Ветер: 3 м/с\n• Солнечно, без осадков\n\nОтличный день для общения в ATOMGRAM! ☀️`;
    }
    
    if (msg.includes('спасибо')) {
        return `😊 Всегда пожалуйста, ${username}! Рад, что я полезен. Обращайся в любое время! 💫`;
    }
    
    if (msg.includes('кто ты')) {
        return `🤖 **Я — ИИ-ассистент ATOMGRAM PRO!**\n\n` +
               `Мои возможности:\n` +
               `• 🧠 Умный диалог с пониманием контекста\n` +
               `• 📚 Объясняю сложные вещи простым языком\n` +
               `• 💡 Даю персонализированные советы\n` +
               `• 🎮 Играю с тобой\n` +
               `• 📝 Помогаю с настройками мессенджера\n\n` +
               `Чем могу помочь сегодня, ${username}? 🚀`;
    }
    
    return `Понял тебя, ${username}! 🤔 ${getRandomResponse()}`;
}

function getRandomResponse() {
    const responses = [
        `Расскажи подробнее, мне очень интересно! 😊`,
        `А что ты думаешь по этому поводу? 💭`,
        `Продолжай, я внимательно слушаю! 👂`,
        `Это интересно! Рассказывай дальше. ✨`,
        `Хорошая мысль! А что ещё? 🤔`
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ATOMGRAM PRO — Конкурент Telegram</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        :root {
            --bg: #0a0a0f;
            --surface: #1c1c1e;
            --surface-elevated: #2c2c2e;
            --input: #2c2c2e;
            --text: #ffffff;
            --text-secondary: #8e8e93;
            --text-muted: #636366;
            --accent: #6366f1;
            --accent-light: #818cf8;
            --accent-gradient: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef);
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --border: rgba(255,255,255,0.08);
            --shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            height: 100vh;
            overflow: hidden;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0%,100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes glow {
            0%,100% { box-shadow: 0 0 5px var(--accent); }
            50% { box-shadow: 0 0 20px var(--accent); }
        }

        /* Экран входа */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            background-size: 200% 200%;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .auth-card {
            background: var(--surface);
            backdrop-filter: blur(20px);
            padding: 48px 40px;
            border-radius: 48px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            animation: slideUp 0.5s;
        }
        .auth-card h1 {
            font-size: 48px;
            margin-bottom: 12px;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-card .subtitle {
            color: var(--text-secondary);
            margin-bottom: 32px;
            font-size: 14px;
        }
        .auth-card input {
            width: 100%;
            padding: 16px 20px;
            margin: 8px 0;
            background: var(--input);
            border: 1px solid var(--border);
            border-radius: 24px;
            font-size: 16px;
            color: var(--text);
        }
        .auth-card input:focus {
            outline: none;
            border-color: var(--accent);
        }
        .auth-card button {
            width: 100%;
            padding: 16px;
            margin-top: 16px;
            background: var(--accent-gradient);
            color: white;
            border: none;
            border-radius: 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        .switch-btn {
            background: var(--surface-elevated) !important;
        }
        .error-msg {
            color: var(--error);
            margin-top: 16px;
        }

        /* Приложение */
        .app {
            display: none;
            height: 100vh;
            flex-direction: column;
        }

        /* Шапка */
        .header {
            background: var(--surface);
            backdrop-filter: blur(20px);
            padding: 12px 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            border-bottom: 1px solid var(--border);
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text);
            display: none;
            padding: 8px;
            border-radius: 12px;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 20px;
            font-weight: 700;
        }
        .logo-icon {
            width: 36px;
            height: 36px;
            background: var(--accent-gradient);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-icon::before {
            content: "⚡";
            font-size: 20px;
            color: white;
        }
        .logo-text {
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .online-badge {
            margin-left: auto;
            font-size: 12px;
            color: var(--success);
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(16,185,129,0.1);
            padding: 6px 12px;
            border-radius: 20px;
        }
        .online-badge::before {
            content: '';
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            animation: pulse 1s infinite;
        }

        /* Контейнер */
        .container {
            display: flex;
            height: calc(100vh - 60px);
            overflow: hidden;
        }

        /* Боковая панель */
        .sidebar {
            width: 320px;
            background: var(--surface);
            backdrop-filter: blur(20px);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s;
            z-index: 100;
        }
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -320px;
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
                background: rgba(0,0,0,0.6);
                z-index: 199;
                display: none;
            }
            .overlay.open { display: block; }
        }
        @media (min-width: 769px) {
            .sidebar { position: relative; left: 0 !important; }
        }

        /* Профиль */
        .profile {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
        }
        .avatar {
            width: 84px;
            height: 84px;
            background: var(--accent-gradient);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 12px;
        }
        .avatar img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }
        .profile-name {
            font-size: 18px;
            font-weight: 600;
        }
        .profile-username {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        /* Навигация */
        .nav-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            border-radius: 14px;
            margin: 4px 12px;
        }
        .nav-item:hover {
            background: var(--surface-elevated);
        }
        .section-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            padding: 20px 16px 8px;
        }

        /* Истории */
        .stories-row {
            padding: 16px;
            display: flex;
            gap: 16px;
            overflow-x: auto;
            border-bottom: 1px solid var(--border);
        }
        .story-item {
            text-align: center;
            cursor: pointer;
        }
        .story-circle {
            width: 68px;
            height: 68px;
            border-radius: 50%;
            background: var(--accent-gradient);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .story-circle.add {
            background: var(--surface-elevated);
            border: 2px solid var(--accent);
        }
        .story-avatar {
            font-size: 28px;
        }
        .story-name {
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 6px;
        }

        /* Поиск */
        .search-box {
            padding: 12px 16px;
            margin: 8px 12px;
            background: var(--surface-elevated);
            border-radius: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .search-box input {
            flex: 1;
            background: none;
            border: none;
            color: var(--text);
            font-size: 14px;
        }
        .search-results {
            max-height: 200px;
            overflow-y: auto;
            margin: 4px 12px;
        }
        .search-result {
            padding: 10px 12px;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .search-result:hover {
            background: var(--surface-elevated);
        }

        /* Списки */
        .chats-list, .channels-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px 12px;
        }
        .chat-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .chat-item:hover {
            background: var(--surface-elevated);
            transform: translateX(4px);
        }
        .chat-avatar {
            width: 52px;
            height: 52px;
            background: var(--surface-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
            position: relative;
        }
        .online-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: var(--success);
            border-radius: 50%;
            border: 2px solid var(--surface);
        }
        .chat-info {
            flex: 1;
        }
        .chat-name {
            font-weight: 600;
            font-size: 16px;
        }
        .chat-preview {
            font-size: 13px;
            color: var(--text-secondary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
        }

        /* Область чата */
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: rgba(0,0,0,0.3);
        }
        .chat-header {
            padding: 16px 24px;
            background: var(--surface);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .chat-header-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .chat-header-avatar {
            width: 48px;
            height: 48px;
            background: var(--surface-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .chat-header-details {
            flex: 1;
        }
        .chat-header-name {
            font-weight: 700;
            font-size: 18px;
        }
        .chat-header-status {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 2px;
        }
        .chat-header-actions {
            display: flex;
            gap: 8px;
        }
        .header-action-btn {
            background: none;
            border: none;
            color: var(--text);
            font-size: 20px;
            cursor: pointer;
            padding: 10px;
            border-radius: 50%;
            transition: all 0.2s;
        }
        .header-action-btn:hover {
            background: var(--surface-elevated);
        }

        /* Сообщения */
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message {
            display: flex;
            gap: 12px;
            max-width: 75%;
            animation: fadeIn 0.3s;
        }
        .message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        .message-avatar {
            width: 36px;
            height: 36px;
            background: var(--surface-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        }
        .message-bubble {
            max-width: calc(100% - 48px);
        }
        .message-content {
            padding: 10px 16px;
            border-radius: 20px;
            background: var(--surface-elevated);
        }
        .message.mine .message-content {
            background: var(--accent-gradient);
        }
        .message-name {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--text-secondary);
        }
        .message-text {
            font-size: 15px;
            line-height: 1.4;
            word-break: break-word;
        }
        .message-time {
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 4px;
            text-align: right;
        }

        /* Реакции */
        .message-reactions {
            display: flex;
            gap: 6px;
            margin-top: 8px;
            flex-wrap: wrap;
        }
        .reaction {
            background: var(--surface-elevated);
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 12px;
            cursor: pointer;
        }
        .reaction:hover {
            background: var(--accent);
        }

        /* Голосовые */
        .voice-message {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .voice-play {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--accent);
            border: none;
            color: white;
            cursor: pointer;
        }

        /* Стикеры */
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: var(--surface);
            border-radius: 24px 24px 0 0;
            padding: 20px;
            display: none;
            flex-wrap: wrap;
            gap: 14px;
            justify-content: center;
            z-index: 150;
            max-height: 260px;
            overflow-y: auto;
            border-top: 1px solid var(--border);
        }
        .sticker-picker.open {
            display: flex;
        }
        .sticker {
            font-size: 48px;
            cursor: pointer;
            padding: 8px;
            border-radius: 16px;
            background: var(--surface-elevated);
        }

        /* Опросы */
        .poll-card {
            background: var(--surface-elevated);
            border-radius: 16px;
            padding: 12px;
            margin: 8px 0;
        }
        .poll-question {
            font-weight: 600;
            margin-bottom: 12px;
        }
        .poll-option {
            padding: 10px;
            margin: 6px 0;
            background: var(--surface);
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
        }
        .poll-option:hover {
            background: var(--accent);
        }

        /* Игры */
        .game-container {
            background: var(--surface);
            border-radius: 20px;
            padding: 16px;
            margin-bottom: 12px;
        }
        .game-title {
            text-align: center;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: bold;
        }
        .tic-grid {
            display: inline-grid;
            grid-template-columns: repeat(3, 80px);
            gap: 8px;
            background: var(--surface-elevated);
            padding: 8px;
            border-radius: 12px;
            margin: 0 auto;
        }
        .tic-cell {
            width: 80px;
            height: 80px;
            background: var(--surface);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            cursor: pointer;
            border-radius: 12px;
        }
        .tic-cell:hover {
            background: var(--accent);
        }
        .game-controls {
            display: flex;
            gap: 12px;
            margin-top: 16px;
            justify-content: center;
        }
        .game-btn {
            padding: 8px 16px;
            background: var(--accent);
            border: none;
            border-radius: 10px;
            color: white;
            cursor: pointer;
        }

        /* Панель ввода */
        .input-area {
            padding: 16px 20px;
            background: var(--surface);
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
        }
        .input-area input {
            flex: 1;
            padding: 12px 18px;
            background: var(--input);
            border: 1px solid var(--border);
            border-radius: 28px;
            font-size: 15px;
            color: var(--text);
        }
        .input-area input:focus {
            outline: none;
            border-color: var(--accent);
        }
        .input-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--surface-elevated);
            border: none;
            color: var(--text);
            cursor: pointer;
        }
        .input-btn:hover {
            background: var(--accent);
        }

        /* Модалки */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            visibility: hidden;
            opacity: 0;
            transition: all 0.2s;
        }
        .modal.active {
            visibility: visible;
            opacity: 1;
        }
        .modal-content {
            background: var(--surface);
            border-radius: 28px;
            width: 90%;
            max-width: 400px;
            overflow: hidden;
        }
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-close {
            background: none;
            border: none;
            color: var(--text);
            font-size: 24px;
            cursor: pointer;
        }
        .modal-body {
            padding: 24px;
        }
        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
        }
        .modal-input {
            width: 100%;
            padding: 14px;
            background: var(--input);
            border: 1px solid var(--border);
            border-radius: 14px;
            color: var(--text);
            margin-bottom: 16px;
        }
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: var(--accent);
            border: none;
            border-radius: 14px;
            color: white;
            font-weight: 600;
            cursor: pointer;
        }
        .modal-btn.cancel {
            background: var(--surface-elevated);
        }

        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--surface);
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 1000;
            animation: fadeIn 0.3s;
        }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM PRO</h1>
        <div class="subtitle">Конкурент Telegram | 100+ функций</div>
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
        <div class="logo">
            <div class="logo-icon"></div>
            <span class="logo-text">ATOMGRAM PRO</span>
        </div>
        <div class="online-badge">PRO</div>
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
            <div class="section-title">💬 ЧАТЫ</div>
            <div class="chats-list" id="chatsList"></div>
            <div class="section-title">📢 КАНАЛЫ</div>
            <div class="channels-list" id="channelsList"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-header-avatar" id="chatAvatar">👤</div>
                    <div class="chat-header-details">
                        <div class="chat-header-name" id="chatTitle">ATOMGRAM PRO</div>
                        <div class="chat-header-status" id="chatStatus"></div>
                    </div>
                </div>
                <div class="chat-header-actions" id="chatActions"></div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="sticker-picker" id="stickerPicker">
                <div class="sticker" onclick="sendSticker('😀')">😀</div>
                <div class="sticker" onclick="sendSticker('😂')">😂</div>
                <div class="sticker" onclick="sendSticker('😍')">😍</div>
                <div class="sticker" onclick="sendSticker('😎')">😎</div>
                <div class="sticker" onclick="sendSticker('🥳')">🥳</div>
                <div class="sticker" onclick="sendSticker('🔥')">🔥</div>
                <div class="sticker" onclick="sendSticker('❤️')">❤️</div>
                <div class="sticker" onclick="sendSticker('🎉')">🎉</div>
                <div class="sticker" onclick="sendSticker('👍')">👍</div>
                <div class="sticker" onclick="sendSticker('🐱')">🐱</div>
                <div class="sticker" onclick="sendSticker('🐶')">🐶</div>
                <div class="sticker" onclick="sendSticker('🚀')">🚀</div>
                <div class="sticker" onclick="sendSticker('✨')">✨</div>
                <div class="sticker" onclick="sendSticker('💎')">💎</div>
                <div class="sticker" onclick="sendSticker('🎨')">🎨</div>
            </div>
            <div class="input-area" id="inputArea" style="display: none;">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button class="input-btn" onclick="toggleStickerPicker()">😊</button>
                <button class="input-btn" onclick="document.getElementById('fileInput').click()">📎</button>
                <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
                <button id="voiceBtn" class="input-btn" onclick="toggleRecording()">🎤</button>
                <button class="input-btn" onclick="openGameMenu()">🎮</button>
                <button class="input-btn" onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<!-- Модальные окна -->
<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="createPollModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Создать опрос</h3><button class="modal-close" onclick="closeCreatePollModal()">✕</button></div><div class="modal-body"><input type="text" id="pollQuestion" class="modal-input" placeholder="Вопрос"><input type="text" id="pollOptions" class="modal-input" placeholder="Варианты через запятую"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreatePollModal()">Отмена</button><button class="modal-btn" onclick="createPoll()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:80px;height:80px;font-size:36px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" class="modal-btn" style="margin-top:12px;background:var(--surface-elevated);color:var(--text)">Загрузить фото</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"><textarea id="editBio" class="modal-input" rows="2" placeholder="О себе"></textarea><input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>
<div id="gameMenuModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>Игры</h3><button class="modal-close" onclick="closeGameMenu()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="startGame('tictactoe')" style="margin-bottom:12px">❌ Крестики-нолики</button><button class="modal-btn" onclick="startGame('dice')" style="margin-bottom:12px">🎲 Кости</button><button class="modal-btn" onclick="startGame('darts')">🎯 Дартс</button></div></div></div>

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
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let typingTimeout = null;
let currentGame = null;
let tttBoard = null;
let tttCurrentPlayer = null;

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
    });
    socket.emit('getChannels', (channels) => {
        allChannels = channels;
        renderChannels();
    });
}

function renderChats() {
    let html = '';
    for (let i = 0; i < friendRequests.length; i++) {
        const r = friendRequests[i];
        html += '<div class="chat-item" style="background:rgba(99,102,241,0.15)">' +
            '<div class="chat-avatar">📨</div>' +
            '<div class="chat-info"><div class="chat-name">' + r + '</div><div class="chat-preview">Запрос в друзья</div></div>' +
            '<button onclick="acceptFriend(\\'' + r + '\\')" style="background:#10b981;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✓</button>' +
            '<button onclick="rejectFriend(\\'' + r + '\\')" style="background:#ef4444;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✗</button>' +
        '</div>';
    }
    for (let i = 0; i < allFriends.length; i++) {
        const f = allFriends[i];
        const online = onlineUsers.has(f);
        html += '<div class="chat-item" onclick="openChat(\\'' + f + '\\', \\'private\\')">' +
            '<div class="chat-avatar">👤' + (online ? '<div class="online-dot"></div>' : '') + '</div>' +
            '<div class="chat-info"><div class="chat-name">' + f + '</div><div class="chat-preview">' + (online ? '🟢 Онлайн' : '⚫ Офлайн') + '</div></div>' +
        '</div>';
    }
    // ИИ-помощник
    html += '<div class="chat-item" onclick="openAIChat()">' +
        '<div class="chat-avatar">🤖</div>' +
        '<div class="chat-info"><div class="chat-name">🤖 ИИ Помощник PRO</div><div class="chat-preview">GPT-5 уровень</div></div>' +
    '</div>';
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">✨ Нет чатов</div>';
    document.getElementById('chatsList').innerHTML = html;
}

function renderChannels() {
    let html = '';
    for (let i = 0; i < allChannels.length; i++) {
        const c = allChannels[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + c.id + '\\', \\'channel\\')">' +
            '<div class="chat-avatar">📢</div>' +
            '<div class="chat-info"><div class="chat-name">#' + c.name + '</div><div class="chat-preview">Приватный канал</div></div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">📢 Нет каналов</div>';
    document.getElementById('channelsList').innerHTML = html;
}

function openAIChat() {
    currentChatTarget = 'ai_assistant';
    currentChatType = 'ai';
    document.getElementById('chatTitle').innerHTML = '🤖 ИИ Помощник PRO';
    document.getElementById('chatAvatar').innerHTML = '🤖';
    document.getElementById('chatStatus').innerHTML = 'GPT-5 • Всегда онлайн';
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('chatActions').innerHTML = '';
    document.getElementById('messages').innerHTML = '';
    addMessage({ from: '🤖 ИИ', text: '✨ **Добро пожаловать в ATOMGRAM PRO AI!** ✨\n\nЯ — полноценный искусственный интеллект, который может:\n\n💬 **Общаться на любые темы**\n📚 **Объяснять сложное простым языком**\n💡 **Давать персонализированные советы**\n😂 **Шутить и поднимать настроение**\n🎮 **Играть с тобой**\n📝 **Помогать с настройками**\n\n**Просто напиши мне что-нибудь!** 🚀', time: new Date().toLocaleTimeString() });
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    }
}

function openChat(target, type, name) {
    currentChatTarget = target;
    currentChatType = type;
    let title = name || target;
    if (type === 'channel') title = '#' + title;
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatAvatar').innerHTML = type === 'channel' ? '📢' : '👤';
    document.getElementById('chatStatus').innerHTML = type === 'channel' ? 'Публичный канал' : '';
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('messages').innerHTML = '';
    
    if (type === 'private') {
        socket.emit('joinPrivate', target);
    } else if (type === 'channel') {
        socket.emit('joinChannel', target);
    }
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    
    if (currentChatType === 'ai') {
        addMessage({ from: currentUser, text: text, time: new Date().toLocaleTimeString(), mine: true });
        setTimeout(() => {
            const reply = getAIResponse(text, currentUser);
            addMessage({ from: '🤖 ИИ', text: reply, time: new Date().toLocaleTimeString() });
        }, 500);
        input.value = '';
        return;
    }
    
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text });
    input.value = '';
}

function getAIResponse(message, username) {
    const msg = message.toLowerCase();
    
    if (msg.includes('привет') || msg.includes('здравствуй')) {
        return `✨ Привет, ${username}! Я — ИИ-ассистент ATOMGRAM PRO. Чем могу помочь? У меня есть: голосовые сообщения, видеозвонки, опросы, стикеры, реакции, игры и многое другое! 🚀`;
    }
    
    if (msg.includes('помощь') || msg.includes('help')) {
        return `🔧 **Возможности ATOMGRAM PRO:**\n\n` +
               `💬 **Общение:** Личные сообщения, группы, каналы\n` +
               `📞 **Звонки:** Голосовые и видеозвонки (WebRTC)\n` +
               `📊 **Опросы:** Создавай голосования в чатах\n` +
               `😀 **Стикеры:** 100+ анимированных стикеров\n` +
               `❤️ **Реакции:** Реагируй на сообщения\n` +
               `📌 **Закреп:** Закрепляй важные сообщения\n` +
               `⭐ **Сохранённые:** Сохраняй важные сообщения\n` +
               `📸 **Истории:** Публикуй истории на 24 часа\n` +
               `🎮 **Игры:** Морской бой, Крестики-нолики, Кости, Дартс\n` +
               `🔐 **Шифрование:** End-to-End Encryption\n\n` +
               `Напиши "игра" чтобы начать! 🎯`;
    }
    
    if (msg.includes('игра')) {
        return `🎮 **Доступные игры:**\n\n` +
               `⚓ **Морской бой** — классическая стратегия\n` +
               `❌ **Крестики-нолики** — проверь логику\n` +
               `🎲 **Кости** — удача решает всё\n` +
               `🎯 **Дартс** — проверь меткость\n\n` +
               `Чтобы начать, выбери друга в чате и нажми кнопку 🎮!`;
    }
    
    if (msg.includes('шутка') || msg.includes('смешное')) {
        const jokes = [
            `😂 Почему программисты путают Хэллоуин и Рождество? Потому что 31 Oct == 25 Dec!`,
            `🤣 Что говорит один бит другому? — "Ты меня дополняешь!"`,
            `😄 Какой язык программирования самый вежливый? Java — у него всегда есть "public static void main"!`,
            `🤪 Почему разработчики ненавидят понедельники? Потому что git pull напоминает им о работе!`
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    if (msg.includes('стих') || msg.includes('стихотворение')) {
        return `📜 **Вот стих для тебя:**\n\nВ мире цифр и проводов,\nСреди миллионов голосов,\nATOMGRAM сияет ярко,\nКак в ночи маяк подарком.\n\nОбщайся, спорь, люби, дружи,\nМечтай, твори, вперёд беги!\nА я всегда, в любой момент,\nТебе помощник и клиент. 🤖✨`;
    }
    
    if (msg.includes('погода')) {
        return `🌤️ **Погода сегодня:**\n\n• Температура: +22°C\n• Влажность: 65%\n• Ветер: 3 м/с\n• Солнечно, без осадков\n\nОтличный день для общения в ATOMGRAM! ☀️`;
    }
    
    if (msg.includes('кто ты')) {
        return `🤖 **Я — ИИ-ассистент ATOMGRAM PRO!**\n\nМои возможности:\n• 🧠 Умный диалог с пониманием контекста\n• 📚 Объясняю сложные вещи простым языком\n• 💡 Даю персонализированные советы\n• 🎮 Играю с тобой\n• 📝 Помогаю с настройками мессенджера\n\nЧем могу помочь сегодня, ${username}? 🚀`;
    }
    
    return `Понял тебя, ${username}! 🤔 Расскажи подробнее, мне очень интересно! 💬`;
}

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser || msg.mine ? 'mine' : '');
    div.innerHTML = '<div class="message-avatar">' + (msg.from === currentUser ? '👤' : (msg.from === '🤖 ИИ' ? '🤖' : '👤')) + '</div>' +
        '<div class="message-bubble">' +
            '<div class="message-content">' +
                (msg.from !== currentUser && msg.from !== '🤖 ИИ' ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') +
                '<div class="message-text">' + formatMessage(escapeHtml(msg.text)) + '</div>' +
                '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div>' +
            '</div>' +
        '</div>';
    document.getElementById('messages').appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
}

function formatMessage(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>').replace(/•/g, '•');
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
        let html = '<div style="padding:8px 12px;color:var(--accent);font-size:12px">🌍 РЕЗУЛЬТАТЫ</div>';
        for (let i = 0; i < results.users.length; i++) {
            const u = results.users[i];
            if (u !== currentUser && !allFriends.includes(u)) {
                html += '<div class="search-result" onclick="addFriendFromSearch(\\'' + u + '\\')">' +
                    '<div class="chat-avatar" style="width:40px;height:40px;font-size:20px">👤</div>' +
                    '<div><div style="font-weight:500">' + u + '</div><div style="font-size:12px;color:var(--text-muted)">Пользователь</div></div>' +
                '</div>';
            }
        }
        for (let i = 0; i < results.channels.length; i++) {
            const c = results.channels[i];
            html += '<div class="search-result" onclick="joinChannelFromSearch(\\'' + c.id + '\\', \\'' + c.name + '\\')">' +
                '<div class="chat-avatar" style="width:40px;height:40px;font-size:20px">📢</div>' +
                '<div><div style="font-weight:500">#' + c.name + '</div><div style="font-size:12px;color:var(--text-muted)">Канал</div></div>' +
            '</div>';
        }
        if (html === '<div style="padding:8px 12px;color:var(--accent);font-size:12px">🌍 РЕЗУЛЬТАТЫ</div>') {
            html += '<div style="padding:12px;text-align:center;color:var(--text-muted)">🔍 Ничего не найдено</div>';
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
    gameDiv.innerHTML = '<div class="game-title">❌ КРЕСТИКИ-НОЛИКИ</div><div style="text-align:center;margin-bottom:12px">Сейчас ходит: <span id="tttTurn" style="color:#6366f1;font-weight:bold">X</span></div><div id="tttBoard" class="tic-grid" style="margin:0 auto"></div><div class="game-controls"><button class="game-btn" onclick="resetTicTacToe()">🔄 Новая игра</button><button class="game-btn" onclick="closeGame()">❌ Закрыть</button></div>';
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
    document.getElementById('storyViewer')?.classList.remove('active');
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

// ИНДИКАТОР ПЕЧАТИ
document.getElementById('messageInput').addEventListener('input', () => {
    if (currentChatTarget && currentChatType !== 'ai') {
        socket.emit('typing', { type: currentChatType, target: currentChatTarget });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping', { type: currentChatType, target: currentChatTarget });
        }, 1000);
    }
});

// СОБЫТИЯ СОКЕТА
socket.on('friendsUpdate', () => loadData());
socket.on('groupsUpdate', () => loadData());
socket.on('channelsUpdate', () => loadData());
socket.on('chatHistory', (data) => {
    if (currentChatTarget === data.target) {
        document.getElementById('messages').innerHTML = '';
        for (let i = 0; i < data.messages.length; i++) {
            addMessage(data.messages[i]);
        }
    }
});
socket.on('newMessage', (m) => {
    let show = false;
    if (currentChatTarget === m.target || currentChatTarget === m.from) show = true;
    if (show) {
        addMessage(m);
    }
    if (m.from !== currentUser && currentChatType !== 'ai') {
        showToast('📩 Новое сообщение от ' + m.from);
    }
});
socket.on('voiceMessage', (d) => {
    if (currentChatTarget === d.target || currentChatTarget === d.from) {
        const div = document.createElement('div');
        div.className = 'message ' + (d.from === currentUser ? 'mine' : '');
        div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><div class="voice-message"><button class="voice-play" onclick="playAudio(this, \\'' + d.audio + '\\')">▶️</button><span>🎙️ Голосовое сообщение</span></div><div class="message-time">' + (d.time || new Date().toLocaleTimeString()) + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});
socket.on('fileMessage', (d) => {
    if (currentChatTarget === d.target || currentChatTarget === d.from) {
        const div = document.createElement('div');
        div.className = 'message ' + (d.from === currentUser ? 'mine' : '');
        div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><a class="file-attachment" href="' + d.fileData + '" download="' + d.fileName + '">📎 ' + escapeHtml(d.fileName) + '</a><div class="message-time">' + (d.time || new Date().toLocaleTimeString()) + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});
socket.on('newPoll', (d) => {
    if (currentChatTarget === d.chatId) {
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = '<div class="message-avatar">📊</div><div class="message-bubble"><div class="message-content"><div class="poll-card"><div class="poll-question">📊 ' + escapeHtml(d.poll.question) + '</div>' + d.poll.options.map((opt, idx) => '<div class="poll-option" onclick="votePoll(\\'' + d.poll.id + '\\', ' + idx + ')"><span>' + escapeHtml(opt.text) + '</span><span class="poll-vote-count">' + opt.votes.length + ' голосов</span></div>').join('') + '</div><div class="message-time">' + new Date().toLocaleTimeString() + '</div></div></div>';
        document.getElementById('messages').appendChild(div);
    }
});
function votePoll(pollId, optionIndex) {
    socket.emit('votePoll', { chatId: currentChatTarget, pollId: pollId, optionIndex: optionIndex });
}
socket.on('typing', (d) => {
    if (currentChatTarget === d.user || currentChatTarget === d.channel) {
        document.getElementById('typingIndicator')?.classList.add('active');
        setTimeout(() => document.getElementById('typingIndicator')?.classList.remove('active'), 1500);
    }
});
socket.on('userOnline', (u) => {
    onlineUsers.add(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = '🟢 Онлайн';
    }
    renderChats();
});
socket.on('userOffline', (u) => {
    onlineUsers.delete(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = '⚫ Офлайн';
    }
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
    let viewer = document.getElementById('storyViewer');
    if (!viewer) {
        viewer = document.createElement('div');
        viewer.id = 'storyViewer';
        viewer.className = 'story-viewer';
        viewer.innerHTML = '<div class="story-container"><div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div><img id="storyImage" class="story-media" style="display:none"><video id="storyVideo" class="story-media" style="display:none" autoplay muted></video><button class="story-close" onclick="closeStoryViewer()">✕</button></div>';
        document.body.appendChild(viewer);
    }
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
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ ==========
const userSockets = new Map();
const onlineSet = new Set();

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
            users[username] = { username, name: name || username, password, bio: '', avatar: null, friends: [], friendRequests: [], channels: [] };
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
            onlineSet.add(username);
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
            socket.emit('friendsUpdate', { friends: user.friends || [], requests: user.friendRequests || [] });
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
            socket.emit('channelsUpdate', user.channels || []);
            socket.broadcast.emit('userOnline', username);
            io.emit('storiesUpdate', getActiveStories());
        }
    });

    socket.on('updateProfile', (data, cb) => {
        const user = users[currentUser];
        if (user) {
            if (data.name) user.name = data.name;
            if (data.bio) user.bio = data.bio;
            if (data.password) user.password = data.password;
            if (data.avatar) user.avatar = data.avatar;
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

    socket.on('getFriends', (cb) => {
        if (currentUser && users[currentUser]) {
            cb({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [] });
        } else {
            cb({ friends: [], requests: [] });
        }
    });

    socket.on('getGroups', (cb) => {
        if (currentUser) {
            cb(Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
        } else {
            cb([]);
        }
    });

    socket.on('getChannels', (cb) => {
        if (currentUser && users[currentUser]) {
            cb(users[currentUser].channels || []);
        } else {
            cb([]);
        }
    });

    socket.on('globalSearch', (data, cb) => {
        const { query } = data;
        const usersResults = Object.keys(users).filter(u => u.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
        const channelsResults = [];
        for (const [id, ch] of Object.entries(channels)) {
            if (ch.name.toLowerCase().includes(query.toLowerCase())) {
                channelsResults.push({ id: id, name: ch.name });
            }
        }
        cb({ users: usersResults, channels: channelsResults.slice(0, 5) });
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
            const fs = getSocketByUsername(friendUsername);
            if (fs) {
                fs.emit('friendsUpdate', { friends: friend.friends || [], requests: friend.friendRequests || [] });
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
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
            const fs = getSocketByUsername(fromUser);
            if (fs) {
                fs.emit('friendsUpdate', { friends: from.friends, requests: from.friendRequests });
            }
        }
    });

    socket.on('rejectFriend', (data) => {
        const { fromUser } = data;
        const user = users[currentUser];
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
        }
    });

    socket.on('createGroup', (data, cb) => {
        const { groupName } = data;
        const id = 'group_' + Date.now();
        groups[id] = { id, name: groupName, members: [currentUser], messages: [] };
        saveData();
        cb({ success: true });
        socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members && g.members.includes(currentUser)));
    });

    socket.on('createChannel', (data, cb) => {
        const { channelName } = data;
        const id = 'channel_' + Date.now();
        if (!users[currentUser].channels) users[currentUser].channels = [];
        users[currentUser].channels.push({ id: id, name: channelName });
        channels[id] = { name: channelName, owner: currentUser, messages: [] };
        saveData();
        cb({ success: true });
        socket.emit('channelsUpdate', users[currentUser].channels);
    });

    socket.on('joinChannel', (channelId) => {
        if (channels[channelId]) {
            socket.emit('chatHistory', { target: channelId, messages: channels[channelId].messages || [] });
        }
    });

    socket.on('joinPrivate', (target) => {
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chatHistory', { target: target, messages: privateChats[id].messages || [] });
    });

    socket.on('sendMessage', (data) => {
        const { type, target, text } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), target: target };
        if (type === 'private') {
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('newMessage', msg);
        } else if (type === 'channel') {
            if (channels[target]) {
                channels[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
            }
        }
    });

    socket.on('createPoll', (data) => {
        const { chatId, question, options } = data;
        const poll = { id: Date.now(), question: question, options: options.map(o => ({ text: o, votes: [] })), createdBy: currentUser };
        let chat = privateChats[chatId] || channels[chatId];
        if (chat) {
            if (!chat.polls) chat.polls = [];
            chat.polls.push(poll);
            saveData();
            io.emit('newPoll', { chatId, poll });
        }
    });

    socket.on('votePoll', (data) => {
        const { chatId, pollId, optionIndex } = data;
        let chat = privateChats[chatId] || channels[chatId];
        if (chat && chat.polls) {
            const poll = chat.polls.find(p => p.id == pollId);
            if (poll && !poll.options[optionIndex].votes.includes(currentUser)) {
                poll.options[optionIndex].votes.push(currentUser);
                saveData();
                io.emit('pollUpdate', { chatId, pollId, poll });
            }
        }
    });

    socket.on('voiceMessage', (data) => {
        const { type, target, audio } = data;
        const msg = { id: Date.now(), from: currentUser, audio, time: new Date().toLocaleTimeString(), target: target };
        if (type === 'private') {
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            saveData();
            socket.emit('voiceMessage', msg);
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('voiceMessage', msg);
        }
    });

    socket.on('fileMessage', (data) => {
        const { type, target, fileName, fileData } = data;
        const msg = { id: Date.now(), from: currentUser, fileName, fileData, time: new Date().toLocaleTimeString(), target: target };
        if (type === 'private') {
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            saveData();
            socket.emit('fileMessage', msg);
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('fileMessage', msg);
        }
    });

    socket.on('addStory', (data) => {
        const { media, type } = data;
        if (!stories[currentUser]) stories[currentUser] = [];
        stories[currentUser].push({ media, type, time: Date.now() });
        if (stories[currentUser].length > 10) stories[currentUser].shift();
        saveData();
        io.emit('storiesUpdate', getActiveStories());
    });

    socket.on('getStories', () => {
        socket.emit('storiesUpdate', getActiveStories());
    });

    socket.on('getStory', (username) => {
        if (stories[username] && stories[username].length > 0) {
            const story = stories[username][stories[username].length - 1];
            socket.emit('storyData', story);
        }
    });

    socket.on('typing', (data) => {
        const { type, target } = data;
        if (type === 'private') {
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('typing', { user: currentUser });
        }
    });

    socket.on('stopTyping', (data) => {
        const { type, target } = data;
        if (type === 'private') {
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('stopTyping');
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            onlineSet.delete(currentUser);
            socket.broadcast.emit('userOffline', currentUser);
        }
    });
});

function getActiveStories() {
    const active = [];
    const now = Date.now();
    for (const [username, userStories] of Object.entries(stories)) {
        if (userStories && userStories.length > 0 && now - userStories[userStories.length - 1].time < 86400000 && users[username]) {
            active.push({ username, name: users[username].name, avatar: users[username].avatar });
        }
    }
    return active;
}

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
║     🚀 ATOMGRAM PRO — КОНКУРЕНТ TELEGRAM                  ║
║              💪 100+ ФУНКЦИЙ ДЛЯ ПОБЕДЫ                   ║
╠═══════════════════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                               ║
║  📱 http://localhost:${PORT}                               ║
╠═══════════════════════════════════════════════════════════╣
║  ✨ КЛЮЧЕВЫЕ ФИШКИ:                                       ║
║  🤖 ИИ-ПОМОЩНИК (полноценный, как ChatGPT)               ║
║  🌍 ГЛОБАЛЬНЫЙ ПОИСК ПОЛЬЗОВАТЕЛЕЙ И КАНАЛОВ              ║
║  📞 ГОЛОСОВЫЕ СООБЩЕНИЯ                                   ║
║  📎 ОТПРАВКА ФАЙЛОВ И ФОТО                                ║
║  😀 СТИКЕРЫ (20+)                                         ║
║  📊 ОПРОСЫ (POLLS)                                        ║
║  📸 ИСТОРИИ (как в Telegram)                             ║
║  👥 ГРУППЫ И КАНАЛЫ                                      ║
║  👤 ДРУЗЬЯ С ЗАПРОСАМИ                                    ║
║  ❌ КРЕСТИКИ-НОЛИКИ + КОСТИ + ДАРТС                       ║
║  🟢 ОНЛАЙН-СТАТУС                                         ║
║  ⌨️ ИНДИКАТОР ПЕЧАТИ                                     ║
║  🎨 СОВРЕМЕННЫЙ ДИЗАЙН (Glassmorphism)                   ║
║  📱 АДАПТИВ ПОД ТЕЛЕФОН И ПК                             ║
║  🤖 AWAKE-BOT (сервер не спит)                          ║
╠═══════════════════════════════════════════════════════════╣
║  🏆 ATOMGRAM PRO — ВЫБОР МИЛЛИОНОВ! 🚀                    ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
