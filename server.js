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

let users = {};
let privateChats = {};
let groups = {};
let channels = {};
let stories = {};
let voiceCalls = {};
let videoCalls = {};

const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        groups = data.groups || {};
        channels = data.channels || {};
        stories = data.stories || {};
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, groups, channels, stories }, null, 2));
}
setInterval(saveData, 10000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ATOMGRAM ULTIMATE | Мессенджер 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        :root {
            --bg: radial-gradient(circle at 20% 30%, #0a0a0f, #0f0f14, #1a1a2e);
            --surface: rgba(18, 18, 24, 0.8);
            --surface-elevated: rgba(28, 28, 35, 0.9);
            --input: rgba(28, 28, 35, 0.95);
            --text: #ffffff;
            --text-secondary: #a1a1aa;
            --text-muted: #52525b;
            --accent: #6366f1;
            --accent-light: #818cf8;
            --accent-gradient: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef);
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --border: rgba(255, 255, 255, 0.08);
            --shadow: 0 8px 32px rgba(0,0,0,0.4);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            height: 100vh;
            overflow: hidden;
        }

        /* АНИМАЦИИ */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0%,100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes float {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes ring {
            0% { transform: rotate(0); }
            25% { transform: rotate(10deg); }
            75% { transform: rotate(-10deg); }
            100% { transform: rotate(0); }
        }
        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* ЭКРАН ВХОДА */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            background-size: 200% 200%;
            animation: gradientBG 10s ease infinite;
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
            transition: all 0.3s;
        }
        .auth-card input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(99,102,241,0.3);
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
            transition: all 0.2s;
        }
        .auth-card button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(99,102,241,0.4);
        }
        .switch-btn {
            background: rgba(255,255,255,0.1) !important;
        }
        .error-msg {
            color: var(--error);
            margin-top: 16px;
        }

        /* ПРИЛОЖЕНИЕ */
        .app {
            display: none;
            height: 100vh;
            flex-direction: column;
        }

        /* ШАПКА */
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
        .menu-btn:hover {
            background: var(--surface-elevated);
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
            animation: float 3s ease infinite;
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

        /* КОНТЕЙНЕР */
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* БОКОВАЯ ПАНЕЛЬ */
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

        /* ПРОФИЛЬ */
        .profile {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
        }
        .profile:hover {
            background: var(--surface-elevated);
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
            transition: all 0.2s;
        }
        .avatar:hover {
            transform: scale(1.05);
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

        /* НАВИГАЦИЯ */
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
            transform: translateX(4px);
        }
        .section-title {
            padding: 16px 20px 8px;
            font-size: 12px;
            color: var(--text-secondary);
        }

        /* ПОИСК */
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
        .search-box input:focus {
            outline: none;
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

        /* СПИСКИ */
        .chats-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px 12px;
        }
        .chat-item {
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            border-radius: 16px;
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
        .chat-status {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 2px;
        }
        .chat-status.online {
            color: var(--success);
        }

        /* ОБЛАСТЬ ЧАТА */
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
        .chat-header-info {
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
        .chat-header-status.online {
            color: var(--success);
        }
        .chat-actions {
            display: flex;
            gap: 8px;
        }
        .action-btn {
            background: none;
            border: none;
            color: var(--text);
            font-size: 20px;
            cursor: pointer;
            padding: 10px;
            border-radius: 50%;
            transition: all 0.2s;
        }
        .action-btn:hover {
            background: var(--surface-elevated);
            transform: scale(1.05);
        }

        /* СООБЩЕНИЯ */
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

        /* РЕАКЦИИ */
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

        /* ПАНЕЛЬ ВВОДА */
        .input-area {
            padding: 16px 20px;
            background: var(--surface);
            backdrop-filter: blur(20px);
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
        .input-area button {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--accent-gradient);
            border: none;
            color: white;
            cursor: pointer;
        }
        .input-area button:hover {
            transform: scale(1.05);
        }

        /* ЗВОНКИ (Telegram Style) */
        .call-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            backdrop-filter: blur(20px);
            z-index: 3000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            visibility: hidden;
            opacity: 0;
            transition: all 0.3s;
        }
        .call-modal.active {
            visibility: visible;
            opacity: 1;
        }
        .call-avatar {
            width: 120px;
            height: 120px;
            background: var(--accent-gradient);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            animation: float 3s infinite;
        }
        .call-name {
            font-size: 24px;
            font-weight: 700;
            margin-top: 24px;
        }
        .call-status {
            font-size: 14px;
            color: var(--text-secondary);
            margin-top: 8px;
        }
        .call-controls {
            display: flex;
            gap: 24px;
            margin-top: 32px;
        }
        .call-btn {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            font-size: 24px;
            transition: all 0.2s;
        }
        .call-btn:hover {
            transform: scale(1.05);
        }
        .call-end {
            background: var(--error);
            color: white;
        }
        .call-mute {
            background: var(--surface-elevated);
            color: var(--text);
        }
        .call-video {
            width: 100%;
            max-width: 300px;
            border-radius: 24px;
            margin-bottom: 24px;
        }

        /* ВХОДЯЩИЙ ЗВОНОК */
        .incoming-call {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--surface);
            backdrop-filter: blur(20px);
            padding: 16px 24px;
            border-radius: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 1000;
            animation: slideUp 0.3s;
            border: 1px solid var(--border);
        }
        .incoming-call-avatar {
            width: 48px;
            height: 48px;
            background: var(--accent-gradient);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .incoming-call-info {
            flex: 1;
        }
        .incoming-call-name {
            font-weight: 600;
        }
        .incoming-call-status {
            font-size: 12px;
            color: var(--text-secondary);
        }
        .incoming-call-buttons {
            display: flex;
            gap: 12px;
        }
        .incoming-call-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            cursor: pointer;
            font-size: 20px;
        }

        /* СТИКЕРЫ */
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: var(--surface);
            backdrop-filter: blur(20px);
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
        .sticker:active {
            transform: scale(1.2);
        }

        /* ИГРЫ */
        .game-container {
            background: var(--surface);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 20px;
            margin-bottom: 12px;
            border: 1px solid var(--border);
        }
        .game-title {
            text-align: center;
            margin-bottom: 16px;
            font-size: 18px;
            font-weight: 700;
        }
        .tic-grid {
            display: inline-grid;
            grid-template-columns: repeat(3, 80px);
            gap: 8px;
            background: var(--surface-elevated);
            padding: 8px;
            border-radius: 16px;
            margin: 0 auto;
        }
        .tic-cell {
            width: 80px;
            height: 80px;
            background: var(--input);
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
            padding: 8px 20px;
            background: var(--accent);
            border: none;
            border-radius: 12px;
            color: white;
            cursor: pointer;
        }

        /* МОДАЛКИ */
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

        /* УВЕДОМЛЕНИЯ */
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
        <h1>⚡ ATOMGRAM ULTIMATE</h1>
        <div class="subtitle">Мессенджер нового поколения</div>
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
            <span class="logo-text">ATOMGRAM ULTIMATE</span>
        </div>
        <div class="online-badge">Онлайн</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile" onclick="openProfile()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-username" id="userLogin">@</div>
            </div>
            <div class="search-box">
                <span>🔍</span>
                <input type="text" id="searchInput" placeholder="Поиск..." onkeyup="searchUsers()">
            </div>
            <div id="searchResults" class="search-results"></div>
            <div class="nav-item" onclick="openAddFriend()">➕ Добавить друга</div>
            <div class="nav-item" onclick="openCreateGroup()">👥 Создать группу</div>
            <div class="nav-item" onclick="openCreateChannel()">📢 Создать канал</div>
            <div class="section-title">ЧАТЫ</div>
            <div class="chats-list" id="chatsList"></div>
            <div class="section-title">КАНАЛЫ</div>
            <div class="chats-list" id="channelsList"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <div class="chat-header-avatar" id="chatAvatar">👤</div>
                <div class="chat-header-info">
                    <div class="chat-header-name" id="chatTitle">ATOMGRAM ULTIMATE</div>
                    <div class="chat-header-status" id="chatStatus"></div>
                </div>
                <div class="chat-actions">
                    <button class="action-btn" onclick="startVoiceCall()">📞</button>
                    <button class="action-btn" onclick="startVideoCall()">🎥</button>
                    <button class="action-btn" onclick="toggleStickerPicker()">😊</button>
                    <button class="action-btn" onclick="openGameMenu()">🎮</button>
                </div>
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
                <div class="sticker" onclick="sendSticker('👎')">👎</div>
                <div class="sticker" onclick="sendSticker('🐱')">🐱</div>
                <div class="sticker" onclick="sendSticker('🐶')">🐶</div>
                <div class="sticker" onclick="sendSticker('🚀')">🚀</div>
                <div class="sticker" onclick="sendSticker('✨')">✨</div>
            </div>
            <div class="input-area" id="inputArea" style="display: none;">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<!-- МОДАЛЬНЫЕ ОКНА -->
<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>➕ Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👥 Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>📢 Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👤 Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:24px"><div class="avatar" id="profileAvatar" style="width:100px;height:100px;font-size:48px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" class="modal-btn" style="margin-top:16px;background:var(--surface-elevated);color:var(--text)"><i class="fas fa-camera"></i> Загрузить фото</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><div class="form-group"><label>Имя</label><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"></div><div class="form-group"><label>О себе</label><textarea id="editBio" class="modal-input" rows="2" placeholder="Расскажите о себе..."></textarea></div><div class="form-group"><label>Новый пароль</label><input type="password" id="editPassword" class="modal-input" placeholder="Оставьте пустым"></div></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>
<div id="gameMenuModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>🎮 Игры</h3><button class="modal-close" onclick="closeGameMenu()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="startGame('tictactoe')" style="margin-bottom:12px">❌ Крестики-нолики</button><button class="modal-btn" onclick="startGame('dice')" style="margin-bottom:12px">🎲 Кости</button><button class="modal-btn" onclick="startGame('darts')">🎯 Дартс</button></div></div></div>

<!-- ЗВОНКИ -->
<div id="callModal" class="call-modal">
    <div class="call-avatar" id="callAvatar">👤</div>
    <div class="call-name" id="callName"></div>
    <div class="call-status" id="callStatus">Соединение...</div>
    <div class="call-controls">
        <button class="call-btn call-mute" onclick="toggleMute()">🔇</button>
        <button class="call-btn call-end" onclick="endCall()">📞</button>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentChatTarget = null;
let allFriends = [];
let friendRequests = [];
let allGroups = [];
let allChannels = [];
let onlineUsers = new Set();
let isMobile = window.innerWidth <= 768;
let currentGame = null;
let tttBoard = null;
let tttCurrentPlayer = null;
let currentCall = null;
let localStream = null;
let peerConnection = null;

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
        document.getElementById('profileAvatar').innerHTML = '<img src="' + currentUserData.avatar + '" style="width:100px;height:100px;border-radius:50%;object-fit:cover">';
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
            '<div class="chat-info"><div class="chat-name">' + r + '</div><div class="chat-status">Запрос в друзья</div></div>' +
            '<button onclick="acceptFriend(\\'' + r + '\\')" style="background:#10b981;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✓</button>' +
            '<button onclick="rejectFriend(\\'' + r + '\\')" style="background:#ef4444;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✗</button>' +
        '</div>';
    }
    for (let i = 0; i < allFriends.length; i++) {
        const f = allFriends[i];
        const online = onlineUsers.has(f);
        html += '<div class="chat-item" onclick="openChat(\\'' + f + '\\')">' +
            '<div class="chat-avatar">👤' + (online ? '<div class="online-dot"></div>' : '') + '</div>' +
            '<div class="chat-info"><div class="chat-name">' + f + '</div><div class="chat-status ' + (online ? 'online' : '') + '">' + (online ? 'Онлайн' : 'Офлайн') + '</div></div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет чатов</div>';
    document.getElementById('chatsList').innerHTML = html;
}

function renderChannels() {
    let html = '';
    for (let i = 0; i < allChannels.length; i++) {
        const c = allChannels[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + c.id + '\\')">' +
            '<div class="chat-avatar">📢</div>' +
            '<div class="chat-info"><div class="chat-name">#' + c.name + '</div><div class="chat-status">Канал</div></div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет каналов</div>';
    document.getElementById('channelsList').innerHTML = html;
}

function openChat(target) {
    currentChatTarget = target;
    document.getElementById('chatTitle').innerHTML = target;
    document.getElementById('chatAvatar').innerHTML = '👤';
    document.getElementById('chatStatus').innerHTML = onlineUsers.has(target) ? 'Онлайн' : '';
    if (onlineUsers.has(target)) document.getElementById('chatStatus').classList.add('online');
    document.getElementById('inputArea').style.display = 'flex';
    socket.emit('joinChat', target);
    if (isMobile) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('open');
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    socket.emit('sendMessage', { target: currentChatTarget, text: text });
    input.value = '';
}

function sendSticker(s) {
    if (!currentChatTarget) return;
    socket.emit('sendMessage', { target: currentChatTarget, text: s });
    document.getElementById('stickerPicker').classList.remove('open');
}

function toggleStickerPicker() {
    document.getElementById('stickerPicker').classList.toggle('open');
}

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    let reactionsHtml = '';
    if (msg.reactions) {
        reactionsHtml = '<div class="message-reactions">';
        for (const r in msg.reactions) {
            reactionsHtml += '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'' + r + '\\')">' + r + ' ' + msg.reactions[r] + '</span>';
        }
        reactionsHtml += '</div>';
    }
    div.innerHTML = '<div class="message-avatar">👤</div>' +
        '<div class="message-bubble">' +
            '<div class="message-content">' +
                (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') +
                '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
                reactionsHtml +
                '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div>' +
                '<div style="display:flex;gap:8px;margin-top:6px">' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'❤️\\')">❤️</span>' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'👍\\')">👍</span>' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😂\\')">😂</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    document.getElementById('messages').appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
}

function addReaction(msgId, reaction) {
    socket.emit('addReaction', { messageId: msgId, chatId: currentChatTarget, reaction: reaction });
}

// ПОИСК
function searchUsers() {
    const query = document.getElementById('searchInput').value.trim();
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    socket.emit('searchUsers', { query: query }, (results) => {
        let html = '';
        for (let i = 0; i < results.length; i++) {
            const u = results[i];
            if (u !== currentUser && !allFriends.includes(u)) {
                html += '<div class="search-result" onclick="addFriendFromSearch(\\'' + u + '\\')">' +
                    '<div class="chat-avatar" style="width:40px;height:40px;font-size:20px">👤</div>' +
                    '<div><div style="font-weight:500">' + u + '</div><div style="font-size:12px;color:var(--text-muted)">Нажмите чтобы добавить</div></div>' +
                '</div>';
            }
        }
        if (html === '') html = '<div style="padding:12px;text-align:center;color:var(--text-muted)">Пользователи не найдены</div>';
        document.getElementById('searchResults').innerHTML = html;
    });
}

function addFriendFromSearch(username) {
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        showToast(res.message || res.error);
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('searchInput').value = '';
        loadData();
    });
}

// ЗВОНКИ (Telegram Style)
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

async function startVoiceCall() {
    if (!currentChatTarget) {
        showToast('Выберите чат');
        return;
    }
    document.getElementById('callName').innerText = currentChatTarget;
    document.getElementById('callModal').classList.add('active');
    document.getElementById('callStatus').innerText = 'Вызов...';
    
    socket.emit('callUser', { target: currentChatTarget, type: 'voice' });
    
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
}

async function startVideoCall() {
    if (!currentChatTarget) {
        showToast('Выберите чат');
        return;
    }
    document.getElementById('callName').innerText = currentChatTarget;
    document.getElementById('callModal').classList.add('active');
    document.getElementById('callStatus').innerText = 'Видеовызов...';
    
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const videoElement = document.createElement('video');
    videoElement.srcObject = localStream;
    videoElement.autoplay = true;
    videoElement.style.width = '100%';
    videoElement.style.maxWidth = '300px';
    videoElement.style.borderRadius = '24px';
    videoElement.style.marginBottom = '24px';
    document.querySelector('.call-modal .call-avatar').style.display = 'none';
    document.querySelector('.call-modal').insertBefore(videoElement, document.querySelector('.call-name'));
    
    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('iceCandidate', { target: currentChatTarget, candidate: event.candidate });
        }
    };
    
    peerConnection.ontrack = (event) => {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        remoteVideo.style.width = '100%';
        remoteVideo.style.maxWidth = '300px';
        remoteVideo.style.borderRadius = '24px';
        remoteVideo.style.marginBottom = '24px';
        document.querySelector('.call-modal').insertBefore(remoteVideo, document.querySelector('.call-name'));
    };
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('callOffer', { target: currentChatTarget, offer: offer });
}

function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        audioTrack.enabled = !audioTrack.enabled;
        const muteBtn = document.querySelector('.call-mute');
        muteBtn.innerHTML = audioTrack.enabled ? '🔇' : '🔊';
    }
}

function endCall() {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    document.getElementById('callModal').classList.remove('active');
    socket.emit('endCall', { target: currentChatTarget });
    const videos = document.querySelectorAll('.call-modal video');
    videos.forEach(v => v.remove());
    document.querySelector('.call-modal .call-avatar').style.display = 'flex';
}

socket.on('incomingCall', (data) => {
    const incomingDiv = document.createElement('div');
    incomingDiv.className = 'incoming-call';
    incomingDiv.id = 'incomingCall';
    incomingDiv.innerHTML = '
        <div class="incoming-call-avatar">📞</div>
        <div class="incoming-call-info">
            <div class="incoming-call-name">' + data.from + '</div>
            <div class="incoming-call-status">Входящий ' + (data.type === 'video' ? 'видеозвонок' : 'звонок') + '</div>
        </div>
        <div class="incoming-call-buttons">
            <button class="incoming-call-btn" style="background:#10b981;color:white" onclick="acceptCall()">✓</button>
            <button class="incoming-call-btn" style="background:#ef4444;color:white" onclick="declineCall()">✗</button>
        </div>
    ';
    document.body.appendChild(incomingDiv);
    window.pendingCall = data;
});

async function acceptCall() {
    document.getElementById('incomingCall')?.remove();
    document.getElementById('callName').innerText = window.pendingCall.from;
    document.getElementById('callModal').classList.add('active');
    document.getElementById('callStatus').innerText = 'Соединение...';
    
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (window.pendingCall.type === 'video') {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const videoElement = document.createElement('video');
        videoElement.srcObject = localStream;
        videoElement.autoplay = true;
        videoElement.style.width = '100%';
        videoElement.style.maxWidth = '300px';
        videoElement.style.borderRadius = '24px';
        videoElement.style.marginBottom = '24px';
        document.querySelector('.call-modal .call-avatar').style.display = 'none';
        document.querySelector('.call-modal').insertBefore(videoElement, document.querySelector('.call-name'));
    }
    
    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('iceCandidate', { target: window.pendingCall.from, candidate: event.candidate });
        }
    };
    
    peerConnection.ontrack = (event) => {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        remoteVideo.style.width = '100%';
        remoteVideo.style.maxWidth = '300px';
        remoteVideo.style.borderRadius = '24px';
        remoteVideo.style.marginBottom = '24px';
        document.querySelector('.call-modal').insertBefore(remoteVideo, document.querySelector('.call-name'));
    };
    
    await peerConnection.setRemoteDescription(new RTCSessionDescription(window.pendingCall.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('callAnswer', { target: window.pendingCall.from, answer: answer });
}

function declineCall() {
    document.getElementById('incomingCall')?.remove();
    socket.emit('declineCall', { target: window.pendingCall.from });
}

socket.on('callAnswered', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    document.getElementById('callStatus').innerText = 'В эфире';
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
            showToast('Группа создана');
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
            showToast('Канал создан');
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
                showToast('Аватар обновлён');
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
            showToast('Профиль обновлён');
        }
    });
}

// ИГРЫ
function openGameMenu() {
    if (!currentChatTarget) {
        showToast('Выберите чат');
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
        socket.emit('sendMessage', { target: currentChatTarget, text: '🏆 Победа в крестики-нолики!' });
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
function resetTicTacToe() { closeGame(); startTicTacToe(); }
function rollDice() {
    const dice = Math.floor(Math.random() * 6) + 1;
    const emoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice-1];
    showToast('🎲 Выпало: ' + emoji + ' ' + dice);
    socket.emit('sendMessage', { target: currentChatTarget, text: '🎲 Бросок костей: ' + emoji + ' (' + dice + ')' });
}
function playDarts() {
    const score = Math.floor(Math.random() * 180) + 1;
    const msgs = ['🎯 БУЛЛСАЙ!', '🎯 Отлично!', '🎯 Хороший бросок!'];
    const msg = msgs[Math.floor(Math.random() * 3)];
    showToast(msg + ' ' + score + ' очков');
    socket.emit('sendMessage', { target: currentChatTarget, text: '🎯 Дартс: ' + msg + ' (' + score + ' очков)' });
}
function closeGame() {
    const gameDiv = document.querySelector('.game-container');
    if (gameDiv) gameDiv.remove();
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
    t.innerText = msg;
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
socket.on('chatHistory', (data) => {
    if (currentChatTarget === data.target) {
        document.getElementById('messages').innerHTML = '';
        for (let i = 0; i < data.messages.length; i++) {
            addMessage(data.messages[i]);
        }
    }
});
socket.on('newMessage', (msg) => {
    if (currentChatTarget === msg.target || currentChatTarget === msg.from) {
        addMessage(msg);
    }
    if (msg.from !== currentUser) {
        showToast('Новое сообщение от ' + msg.from);
    }
});
socket.on('userOnline', (u) => {
    onlineUsers.add(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = 'Онлайн';
        document.getElementById('chatStatus').classList.add('online');
    }
    renderChats();
});
socket.on('userOffline', (u) => {
    onlineUsers.delete(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = '';
        document.getElementById('chatStatus').classList.remove('online');
    }
    renderChats();
});

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

    socket.on('searchUsers', (data, cb) => {
        const { query } = data;
        const results = Object.keys(users).filter(u => u.toLowerCase().includes(query.toLowerCase()));
        cb(results.slice(0, 10));
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
            cb({ success: true, message: 'Запрос отправлен' });
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
        saveData();
        cb({ success: true });
        socket.emit('channelsUpdate', users[currentUser].channels);
    });

    socket.on('joinChat', (target) => {
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chatHistory', { target: target, messages: privateChats[id].messages || [] });
    });

    socket.on('sendMessage', (data) => {
        const { target, text } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), target: target };
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        privateChats[id].messages.push(msg);
        saveData();
        socket.emit('newMessage', msg);
        const ts = getSocketByUsername(target);
        if (ts) ts.emit('newMessage', msg);
    });

    socket.on('addReaction', (data) => {
        const { messageId, chatId, reaction } = data;
        let chat = privateChats[chatId];
        if (chat && chat.messages) {
            const msg = chat.messages.find(m => m.id == messageId);
            if (msg) {
                if (!msg.reactions) msg.reactions = {};
                msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1;
                saveData();
                io.emit('reactionUpdate', { messageId, reactions: msg.reactions });
            }
        }
    });

    // ЗВОНКИ
    socket.on('callUser', (data) => {
        const { target, type } = data;
        const targetSocket = getSocketByUsername(target);
        if (targetSocket) {
            targetSocket.emit('incomingCall', { from: currentUser, type: type });
        }
    });

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
            onlineSet.delete(currentUser);
            socket.broadcast.emit('userOffline', currentUser);
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
║     🚀 ATOMGRAM ULTIMATE — ЛУЧШИЙ МЕССЕНДЖЕР 2026         ║
╠═══════════════════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                               ║
║  📱 http://localhost:${PORT}                               ║
╠═══════════════════════════════════════════════════════════╣
║  ✨ ВСЕ ФИШКИ TELEGRAM + VK:                              ║
║  📞 ГОЛОСОВЫЕ ЗВОНКИ (WebRTC)                            ║
║  🎥 ВИДЕОЗВОНКИ (WebRTC)                                 ║
║  💬 ЛИЧНЫЕ СООБЩЕНИЯ + РЕАКЦИИ                           ║
║  👥 ГРУППЫ                                                ║
║  📢 КАНАЛЫ                                                ║
║  👤 ДРУЗЬЯ                                                ║
║  🔍 ПОИСК ПОЛЬЗОВАТЕЛЕЙ                                  ║
║  😀 СТИКЕРЫ (20+)                                        ║
║  ❌ КРЕСТИКИ-НОЛИКИ                                       ║
║  🎲 КОСТИ + ДАРТС                                         ║
║  🎨 ULTRA-СОВРЕМЕННЫЙ ДИЗАЙН                             ║
║  📱 АДАПТИВ ПОД ТЕЛЕФОН                                  ║
║  🤖 AWAKE-BOT (сервер не спит)                          ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
