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

const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        groups = data.groups || {};
        channels = data.channels || {};
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, groups, channels }, null, 2));
}
setInterval(saveData, 10000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ATOMGRAM 200GB | Мессенджер Будущего</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #0f0f14;
            --bg-tertiary: #1a1a24;
            --bg-elevated: #22222e;
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
            --text-muted: #52525b;
            --accent: #6366f1;
            --accent-light: #818cf8;
            --accent-dark: #4f46e5;
            --accent-glow: rgba(99, 102, 241, 0.4);
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --info: #3b82f6;
            --border: rgba(255, 255, 255, 0.06);
            --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
            --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
            --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
            --shadow-xl: 0 16px 48px rgba(0,0,0,0.6);
            --transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
            transition: var(--transition);
        }

        /* Анимации */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px var(--accent); }
            50% { box-shadow: 0 0 20px var(--accent); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes typingAnim {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
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
            animation: gradientBG 10s ease infinite;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .auth-card {
            background: rgba(18, 18, 24, 0.95);
            backdrop-filter: blur(20px);
            padding: 48px 40px;
            border-radius: 48px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-xl);
            animation: slideUp 0.5s ease;
        }
        .auth-card h1 {
            font-size: 48px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
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
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 24px;
            font-size: 16px;
            color: var(--text-primary);
            transition: var(--transition);
        }
        .auth-card input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .auth-card button {
            width: 100%;
            padding: 16px;
            margin-top: 16px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            border: none;
            border-radius: 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
        }
        .auth-card button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }
        .switch-btn {
            background: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
        }
        .error-msg {
            color: var(--error);
            margin-top: 16px;
            font-size: 14px;
        }

        /* Приложение */
        .app {
            display: none;
            height: 100vh;
            width: 100%;
            position: relative;
        }

        /* Шапка */
        .header {
            background: var(--bg-secondary);
            padding: 12px 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            border-bottom: 1px solid var(--border);
            backdrop-filter: blur(10px);
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-primary);
            display: none;
            padding: 8px;
            border-radius: 12px;
            transition: var(--transition);
        }
        .menu-btn:hover {
            background: var(--bg-tertiary);
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
            background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            animation: float 3s ease infinite;
        }
        .logo-icon::before {
            content: "⚡";
            font-size: 20px;
            color: white;
        }
        .logo-icon::after {
            content: "";
            position: absolute;
            inset: -2px;
            background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
            border-radius: 16px;
            z-index: -1;
            opacity: 0.5;
            filter: blur(6px);
        }
        .logo-text {
            background: linear-gradient(135deg, #fff, #a1a1aa);
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
        }
        .online-badge::before {
            content: '';
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            display: inline-block;
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
            background: var(--bg-secondary);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
            z-index: 100;
        }
        .sidebar.mobile {
            position: fixed;
            left: -100%;
            top: 60px;
            height: calc(100vh - 60px);
            width: 85%;
            max-width: 320px;
            box-shadow: var(--shadow-xl);
            z-index: 200;
        }
        .sidebar.mobile.open {
            left: 0;
        }
        .overlay {
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 199;
            display: none;
        }
        .overlay.open {
            display: block;
        }

        /* Профиль */
        .profile-card {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            transition: var(--transition);
        }
        .profile-card:hover {
            background: var(--bg-tertiary);
        }
        .avatar {
            width: 84px;
            height: 84px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 12px;
            position: relative;
            transition: var(--transition);
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
        .online-indicator {
            position: absolute;
            bottom: 4px;
            right: 4px;
            width: 16px;
            height: 16px;
            background: var(--success);
            border-radius: 50%;
            border: 2px solid var(--bg-secondary);
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
        .nav-menu {
            padding: 12px 12px;
            flex: 1;
            overflow-y: auto;
        }
        .nav-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 16px;
            border-radius: 14px;
            cursor: pointer;
            transition: var(--transition);
            color: var(--text-primary);
            margin-bottom: 4px;
        }
        .nav-item:hover {
            background: var(--bg-tertiary);
            transform: translateX(4px);
        }
        .nav-item i {
            width: 24px;
            font-size: 18px;
            color: var(--accent);
        }
        .section-title {
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            padding: 20px 16px 8px;
        }

        /* Поиск */
        .search-box {
            padding: 12px 16px;
            margin: 8px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .search-box input {
            flex: 1;
            background: none;
            border: none;
            color: var(--text-primary);
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
        .search-result-item {
            padding: 8px 12px;
            border-radius: 12px;
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .search-result-item:hover {
            background: var(--bg-tertiary);
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
            transition: var(--transition);
            margin-bottom: 4px;
        }
        .chat-item:hover {
            background: var(--bg-tertiary);
            transform: translateX(4px);
        }
        .chat-avatar {
            width: 52px;
            height: 52px;
            background: var(--bg-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            position: relative;
            flex-shrink: 0;
        }
        .chat-info {
            flex: 1;
            min-width: 0;
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
        .chat-status {
            font-size: 11px;
            color: var(--success);
            margin-top: 2px;
        }
        .chat-status.offline {
            color: var(--text-muted);
        }

        /* Область чата */
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: var(--bg-primary);
        }
        .chat-header {
            padding: 16px 24px;
            background: var(--bg-secondary);
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
            background: var(--bg-elevated);
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
            color: var(--text-primary);
            font-size: 20px;
            cursor: pointer;
            padding: 10px;
            border-radius: 50%;
            transition: var(--transition);
        }
        .header-action-btn:hover {
            background: var(--bg-tertiary);
            transform: scale(1.05);
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
            animation: fadeIn 0.3s ease;
        }
        .message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        .message-avatar {
            width: 36px;
            height: 36px;
            background: var(--bg-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
        }
        .message-bubble {
            max-width: calc(100% - 48px);
        }
        .message-content {
            padding: 10px 16px;
            border-radius: 20px;
            background: var(--bg-tertiary);
            position: relative;
        }
        .message.mine .message-content {
            background: linear-gradient(135deg, #6366f1, #a855f7);
        }
        .message-name {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--text-secondary);
        }
        .message-text {
            font-size: 15px;
            line-height: 1.45;
            word-break: break-word;
        }
        .message-time {
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 6px;
            text-align: right;
        }
        .message-status {
            font-size: 10px;
            margin-left: 6px;
        }
        .message-reply {
            background: rgba(99, 102, 241, 0.2);
            padding: 6px 10px;
            border-radius: 12px;
            margin-bottom: 6px;
            font-size: 12px;
            border-left: 3px solid var(--accent);
        }

        /* Реакции */
        .message-reactions {
            display: flex;
            gap: 6px;
            margin-top: 8px;
            flex-wrap: wrap;
        }
        .reaction {
            background: var(--bg-elevated);
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 12px;
            cursor: pointer;
            transition: var(--transition);
        }
        .reaction:hover {
            background: var(--accent);
            transform: scale(1.05);
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
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition);
        }
        .voice-play:hover {
            transform: scale(1.1);
        }

        /* Стикеры */
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: var(--bg-secondary);
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
            box-shadow: var(--shadow-xl);
        }
        .sticker-picker.open {
            display: flex;
        }
        .sticker {
            font-size: 48px;
            cursor: pointer;
            padding: 8px;
            border-radius: 16px;
            transition: var(--transition);
            background: var(--bg-tertiary);
        }
        .sticker:active {
            transform: scale(1.2);
        }

        /* Опросы */
        .poll-card {
            background: var(--bg-tertiary);
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
            background: var(--bg-elevated);
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: var(--transition);
        }
        .poll-option:hover {
            background: var(--accent);
            transform: scale(1.02);
        }
        .poll-vote-count {
            font-size: 12px;
            color: var(--text-secondary);
        }

        /* Игры */
        .game-container {
            background: var(--bg-secondary);
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
        .game-boards {
            display: flex;
            flex-wrap: wrap;
            gap: 24px;
            justify-content: center;
        }
        .board {
            text-align: center;
        }
        .board-title {
            margin-bottom: 8px;
            font-size: 14px;
            color: var(--text-secondary);
        }
        .battle-grid {
            display: inline-grid;
            grid-template-columns: repeat(10, 32px);
            gap: 2px;
            background: var(--bg-tertiary);
            padding: 4px;
            border-radius: 12px;
        }
        .battle-cell {
            width: 32px;
            height: 32px;
            background: var(--bg-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 6px;
            font-size: 14px;
            transition: var(--transition);
        }
        .battle-cell:hover {
            background: var(--accent);
            transform: scale(1.05);
        }
        .battle-cell.ship { background: #3b82f6; }
        .battle-cell.hit { background: var(--error); animation: shake 0.3s; }
        .battle-cell.miss { background: var(--text-muted); }
        .tic-grid {
            display: inline-grid;
            grid-template-columns: repeat(3, 80px);
            gap: 8px;
            background: var(--bg-tertiary);
            padding: 8px;
            border-radius: 16px;
        }
        .tic-cell {
            width: 80px;
            height: 80px;
            background: var(--bg-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            cursor: pointer;
            border-radius: 12px;
            transition: var(--transition);
        }
        .tic-cell:hover {
            background: var(--accent);
            transform: scale(1.05);
        }
        .game-controls {
            display: flex;
            gap: 12px;
            margin-top: 20px;
            justify-content: center;
        }
        .game-btn {
            padding: 10px 20px;
            background: var(--accent);
            border: none;
            border-radius: 12px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: var(--transition);
        }
        .game-btn:hover {
            transform: scale(1.02);
            background: var(--accent-light);
        }

        /* Панель ввода */
        .reply-indicator {
            background: var(--bg-secondary);
            padding: 8px 16px;
            border-left: 3px solid var(--accent);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            margin: 0 20px;
            border-radius: 12px;
            margin-bottom: 8px;
        }
        .input-area {
            padding: 16px 20px;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .input-area input {
            flex: 1;
            padding: 12px 18px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 28px;
            font-size: 15px;
            color: var(--text-primary);
            transition: var(--transition);
        }
        .input-area input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }
        .input-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--bg-tertiary);
            border: none;
            color: var(--text-primary);
            cursor: pointer;
            transition: var(--transition);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .input-btn:hover {
            background: var(--accent);
            transform: scale(1.05);
        }
        .input-btn.recording {
            background: var(--error);
            animation: pulse 1s infinite;
        }

        /* Индикатор печати */
        .typing-indicator {
            padding: 8px 24px;
            font-size: 13px;
            color: var(--text-secondary);
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .typing-dot {
            width: 6px;
            height: 6px;
            background: var(--accent);
            border-radius: 50%;
            animation: typingAnim 1.4s infinite;
        }

        /* Модалки */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            visibility: hidden;
            opacity: 0;
            transition: var(--transition);
        }
        .modal.active {
            visibility: visible;
            opacity: 1;
        }
        .modal-content {
            background: var(--bg-secondary);
            border-radius: 32px;
            width: 90%;
            max-width: 420px;
            max-height: 85vh;
            overflow-y: auto;
            animation: fadeIn 0.3s ease;
        }
        .modal-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            font-size: 20px;
        }
        .modal-close {
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 24px;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
        }
        .modal-body {
            padding: 24px;
        }
        .modal-footer {
            padding: 16px 24px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 12px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 14px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 16px;
            font-size: 15px;
            color: var(--text-primary);
            transition: var(--transition);
        }
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--accent);
        }
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: var(--accent);
            border: none;
            border-radius: 16px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition);
        }
        .modal-btn:hover {
            background: var(--accent-light);
            transform: translateY(-1px);
        }
        .modal-btn.cancel {
            background: var(--bg-tertiary);
            color: var(--text-primary);
        }

        /* Просмотр историй */
        .story-viewer {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            visibility: hidden;
            opacity: 0;
            transition: var(--transition);
        }
        .story-viewer.active {
            visibility: visible;
            opacity: 1;
        }
        .story-container {
            width: 100%;
            max-width: 400px;
            position: relative;
        }
        .story-media {
            width: 100%;
            border-radius: 24px;
            max-height: 80vh;
            object-fit: cover;
        }
        .story-progress {
            position: absolute;
            top: 10px;
            left: 0;
            right: 0;
            height: 3px;
            background: rgba(255,255,255,0.3);
            border-radius: 3px;
        }
        .story-progress-bar {
            height: 100%;
            background: white;
            width: 0%;
            transition: width 0.1s linear;
            border-radius: 3px;
        }
        .story-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.5);
            border: none;
            color: white;
            font-size: 24px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
        }

        /* Уведомления */
        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 1000;
            text-align: center;
            box-shadow: var(--shadow-xl);
            animation: slideUp 0.3s ease;
        }

        /* Адаптив */
        @media (min-width: 769px) {
            .sidebar {
                position: relative;
                left: 0 !important;
            }
        }
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -100%;
                top: 60px;
                height: calc(100vh - 60px);
                width: 85%;
                max-width: 300px;
                z-index: 200;
            }
            .sidebar.open {
                left: 0;
            }
            .menu-btn {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .message {
                max-width: 85%;
            }
            .battle-grid {
                grid-template-columns: repeat(10, 28px);
            }
            .battle-cell {
                width: 28px;
                height: 28px;
            }
            .tic-grid {
                grid-template-columns: repeat(3, 60px);
            }
            .tic-cell {
                width: 60px;
                height: 60px;
                font-size: 36px;
            }
        }

        /* Скроллбар */
        ::-webkit-scrollbar {
            width: 5px;
        }
        ::-webkit-scrollbar-track {
            background: var(--bg-tertiary);
            border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
            background: var(--accent);
            border-radius: 10px;
        }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM 200GB</h1>
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
        <div class="logo">
            <div class="logo-icon"></div>
            <span class="logo-text">ATOMGRAM 200GB</span>
        </div>
        <div class="online-badge">Онлайн</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile-card" onclick="openProfile()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-username" id="userLogin">@</div>
            </div>
            <div class="nav-menu">
                <div class="nav-item" onclick="openAddFriend()"><span>➕</span><span>Добавить друга</span></div>
                <div class="nav-item" onclick="openCreateGroup()"><span>👥</span><span>Создать группу</span></div>
                <div class="nav-item" onclick="openCreateChannel()"><span>📢</span><span>Создать канал</span></div>
                <div class="nav-item" onclick="openSearchModal()"><span>🔍</span><span>Поиск</span></div>
                <div class="section-title">ЧАТЫ</div>
                <div class="chats-list" id="chatsList"></div>
                <div class="section-title">КАНАЛЫ</div>
                <div class="channels-list" id="channelsList"></div>
            </div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-header-avatar" id="chatAvatar">👤</div>
                    <div class="chat-header-details">
                        <div class="chat-header-name" id="chatTitle">ATOMGRAM 200GB</div>
                        <div class="chat-header-status" id="chatStatus"></div>
                    </div>
                </div>
                <div class="chat-header-actions" id="chatActions"></div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="typing-indicator" id="typingIndicator" style="display:none">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <span>печатает...</span>
            </div>
            <div id="replyIndicator" class="reply-indicator" style="display:none">
                <span id="replyPreview"></span>
                <button onclick="cancelReply()">✕</button>
            </div>
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
<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>➕ Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><div class="form-group"><label>Логин друга</label><input type="text" id="friendUsername" class="modal-input" placeholder="Введите логин"></div></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👥 Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><div class="form-group"><label>Название группы</label><input type="text" id="groupName" class="modal-input" placeholder="Введите название"></div></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>📢 Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><div class="form-group"><label>Название канала</label><input type="text" id="channelName" class="modal-input" placeholder="Введите название"></div><div class="form-group"><label>Ссылка-приглашение</label><input type="text" id="channelLink" class="modal-input" placeholder="Ссылка для приглашения"></div></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="searchModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>🔍 Поиск</h3><button class="modal-close" onclick="closeSearchModal()">✕</button></div><div class="modal-body"><div class="form-group"><label>Поиск пользователей</label><input type="text" id="searchUserInput" class="modal-input" placeholder="Введите логин" onkeyup="searchUsers()"></div><div id="searchResults" class="search-results"></div><div class="form-group"><label>Поиск каналов (по ссылке)</label><input type="text" id="searchChannelInput" class="modal-input" placeholder="Введите ссылку канала" onkeyup="searchChannels()"></div><div id="channelSearchResults" class="search-results"></div></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👤 Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:24px"><div class="avatar" id="profileAvatar" style="width:100px;height:100px;font-size:48px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" class="modal-btn" style="margin-top:16px;background:var(--bg-tertiary);color:var(--text-primary)"><i class="fas fa-camera"></i> Загрузить фото</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><div class="form-group"><label>Имя</label><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"></div><div class="form-group"><label>О себе</label><textarea id="editBio" class="modal-input" rows="2" placeholder="Расскажите о себе..."></textarea></div><div class="form-group"><label>Новый пароль</label><input type="password" id="editPassword" class="modal-input" placeholder="Оставьте пустым"></div></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>
<div id="gameMenuModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>🎮 Игры в чате</h3><button class="modal-close" onclick="closeGameMenu()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="startGame('battleship')" style="margin-bottom:12px">⚓ Морской бой</button><button class="modal-btn" onclick="startGame('tictactoe')" style="margin-bottom:12px">❌ Крестики-нолики</button><button class="modal-btn" onclick="startGame('dice')" style="margin-bottom:12px">🎲 Кости</button><button class="modal-btn" onclick="startGame('darts')">🎯 Дартс</button></div></div></div>
<div id="storyViewer" class="story-viewer"><div class="story-container"><div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div><img id="storyImage" class="story-media" style="display:none"><video id="storyVideo" class="story-media" style="display:none" autoplay muted></video><button class="story-close" onclick="closeStoryViewer()">✕</button></div></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentUserChannels = [];
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
let battleMyGrid = null;
let battleEnemyGrid = null;
let tttBoard = null;
let tttCurrentPlayer = null;
let replyToMessage = null;

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
            currentUserChannels = res.channels || [];
            localStorage.setItem('atomgram_user', u);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
            loadChannels();
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
        renderGroups();
    });
}

function loadChannels() {
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
            '<div class="chat-avatar">👤' + (online ? '<div class="online-indicator"></div>' : '') + '</div>' +
            '<div class="chat-info"><div class="chat-name">' + f + '</div><div class="chat-status ' + (online ? '' : 'offline') + '">' + (online ? 'Онлайн' : 'Офлайн') + '</div></div>' +
        '</div>';
    }
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет чатов</div>';
    document.getElementById('chatsList').innerHTML = html;
}

function renderGroups() {
    let html = '';
    for (let i = 0; i < allGroups.length; i++) {
        const g = allGroups[i];
        html += '<div class="chat-item" onclick="openChat(\\'' + g.id + '\\', \\'group\\')">' +
            '<div class="chat-avatar">👥</div>' +
            '<div class="chat-info"><div class="chat-name">' + g.name + '</div><div class="chat-preview">' + (g.members ? g.members.length : 1) + ' участников</div></div>' +
        '</div>';
    }
    const groupsContainer = document.getElementById('groupsList');
    if (groupsContainer) groupsContainer.innerHTML = html;
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
    if (html === '') html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет каналов</div>';
    document.getElementById('channelsList').innerHTML = html;
}

function openChat(target, type, name) {
    currentChatTarget = target;
    currentChatType = type;
    let title = name || target;
    document.getElementById('chatTitle').innerHTML = title;
    document.getElementById('chatAvatar').innerHTML = type === 'channel' ? '📢' : (type === 'group' ? '👥' : '👤');
    document.getElementById('chatStatus').innerHTML = (type === 'private' && onlineUsers.has(target)) ? 'Онлайн' : '';
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('messages').innerHTML = '';
    
    if (type === 'private') {
        socket.emit('joinPrivate', target);
    } else if (type === 'group') {
        socket.emit('joinGroup', target);
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
    let text = input.value.trim();
    if (!text || !currentChatTarget) return;
    const reply = replyToMessage;
    cancelReply();
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text, reply: reply });
    input.value = '';
}

function sendSticker(s) {
    if (!currentChatTarget) return;
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: s });
    document.getElementById('stickerPicker').classList.remove('open');
}

function toggleStickerPicker() {
    document.getElementById('stickerPicker').classList.toggle('open');
}

function cancelReply() {
    replyToMessage = null;
    document.getElementById('replyIndicator').style.display = 'none';
}

function setReply(id, from, text) {
    replyToMessage = { id: id, from: from, text: text.substring(0, 50) };
    document.getElementById('replyPreview').innerHTML = '📎 Ответ ' + from + ': ' + text.substring(0, 40);
    document.getElementById('replyIndicator').style.display = 'flex';
}

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    let replyHtml = '';
    if (msg.replyTo) {
        replyHtml = '<div class="message-reply"><span style="color:#6366f1">↩️ ' + msg.replyTo.from + '</span>: ' + escapeHtml(msg.replyTo.text.substring(0, 50)) + '</div>';
    }
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
                replyHtml +
                (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') +
                '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
                reactionsHtml +
                '<div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div>' +
                '<div style="display:flex;gap:8px;margin-top:6px">' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'❤️\\')">❤️</span>' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'👍\\')">👍</span>' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😂\\')">😂</span>' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😮\\')">😮</span>' +
                    '<span class="reaction" onclick="addReaction(\\'' + msg.id + '\\', \\'😢\\')">😢</span>' +
                '</div>' +
            '</div>' +
        '</div>';
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = 9999;
}

function addReaction(msgId, reaction) {
    socket.emit('addReaction', { messageId: msgId, chatId: currentChatTarget, reaction: reaction });
}

// ПОИСК
function openSearchModal() {
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchUserInput').value = '';
    document.getElementById('searchChannelInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('channelSearchResults').innerHTML = '';
}

function closeSearchModal() {
    document.getElementById('searchModal').classList.remove('active');
}

function searchUsers() {
    const query = document.getElementById('searchUserInput').value.trim();
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    socket.emit('searchUsers', { query: query }, (results) => {
        let html = '';
        for (let i = 0; i < results.length; i++) {
            const u = results[i];
            if (u !== currentUser && !allFriends.includes(u)) {
                html += '<div class="search-result-item" onclick="openAddFriendFromSearch(\\'' + u + '\\')">' +
                    '<div class="chat-avatar" style="width:40px;height:40px;font-size:20px">👤</div>' +
                    '<div><div style="font-weight:500">' + u + '</div><div style="font-size:12px;color:var(--text-muted)">Нажмите чтобы добавить</div></div>' +
                '</div>';
            }
        }
        if (html === '') html = '<div style="padding:12px;text-align:center;color:var(--text-muted)">Пользователи не найдены</div>';
        document.getElementById('searchResults').innerHTML = html;
    });
}

function searchChannels() {
    const query = document.getElementById('searchChannelInput').value.trim();
    if (query.length < 2) {
        document.getElementById('channelSearchResults').innerHTML = '';
        return;
    }
    socket.emit('searchChannels', { link: query }, (result) => {
        if (result) {
            let html = '<div class="search-result-item" onclick="joinChannelByLink(\\'' + result.id + '\\', \\'' + result.name + '\\')">' +
                '<div class="chat-avatar" style="width:40px;height:40px;font-size:20px">📢</div>' +
                '<div><div style="font-weight:500">#' + result.name + '</div><div style="font-size:12px;color:var(--text-muted)">Нажмите чтобы присоединиться</div></div>' +
            '</div>';
            document.getElementById('channelSearchResults').innerHTML = html;
        } else {
            document.getElementById('channelSearchResults').innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted)">Канал не найден</div>';
        }
    });
}

function openAddFriendFromSearch(username) {
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        showToast(res.message || res.error);
        closeSearchModal();
        loadData();
    });
}

function joinChannelByLink(channelId, channelName) {
    socket.emit('joinChannel', channelId);
    openChat(channelId, 'channel', channelName);
    closeSearchModal();
    loadChannels();
}

// ГОЛОСОВЫЕ СООБЩЕНИЯ
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
        showToast('Нет доступа к микрофону');
    }
}

// ФАЙЛЫ
function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file || !currentChatTarget) return;
    const reader = new FileReader();
    reader.onloadend = () => socket.emit('fileMessage', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileData: reader.result });
    reader.readAsDataURL(file);
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
    currentGame = gameType;
    if (gameType === 'battleship') {
        startBattleship();
    } else if (gameType === 'tictactoe') {
        startTicTacToe();
    } else if (gameType === 'dice') {
        rollDice();
    } else if (gameType === 'darts') {
        playDarts();
    }
}

// МОРСКОЙ БОЙ
function startBattleship() {
    battleMyGrid = initBattleGrid();
    battleEnemyGrid = initEmptyGrid();
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.id = 'battleshipGame';
    gameDiv.innerHTML = '<div class="game-title">⚓ МОРСКОЙ БОЙ ⚓</div><div class="game-boards"><div class="board"><div class="board-title">🚢 Ваше поле</div><div id="myBattleGrid" class="battle-grid"></div></div><div class="board"><div class="board-title">🎯 Поле противника</div><div id="enemyBattleGrid" class="battle-grid"></div></div></div><div class="game-controls"><button class="game-btn" onclick="resetBattleship()">🔄 Новая игра</button><button class="game-btn" onclick="closeGame()">❌ Закрыть</button></div>';
    document.getElementById('messages').appendChild(gameDiv);
    renderBattleGrid('myBattleGrid', battleMyGrid, true);
    renderBattleGrid('enemyBattleGrid', battleEnemyGrid, false);
}

function initBattleGrid() {
    const grid = Array(10).fill().map(() => Array(10).fill().map(() => ({ ship: false, hit: false, miss: false })));
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    ships.forEach(size => placeShip(grid, size));
    return grid;
}

function initEmptyGrid() {
    return Array(10).fill().map(() => Array(10).fill().map(() => ({ ship: false, hit: false, miss: false })));
}

function placeShip(grid, size) {
    let placed = false;
    while (!placed) {
        const horizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        if (canPlaceShip(grid, row, col, size, horizontal)) {
            for (let i = 0; i < size; i++) {
                const r = horizontal ? row : row + i;
                const c = horizontal ? col + i : col;
                if (r < 10 && c < 10) grid[r][c].ship = true;
            }
            placed = true;
        }
    }
}

function canPlaceShip(grid, row, col, size, horizontal) {
    for (let i = 0; i < size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        if (r >= 10 || c >= 10) return false;
        if (grid[r][c].ship) return false;
    }
    return true;
}

function renderBattleGrid(containerId, grid, isMyGrid) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '';
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            let cellClass = 'battle-cell';
            if (grid[i][j].hit) cellClass += ' hit';
            else if (grid[i][j].miss) cellClass += ' miss';
            else if (isMyGrid && grid[i][j].ship) cellClass += ' ship';
            html += '<div class="' + cellClass + '" onclick="battleAttack(' + i + ',' + j + ')"></div>';
        }
    }
    container.innerHTML = html;
}

function battleAttack(row, col) {
    if (!battleEnemyGrid) return;
    if (battleEnemyGrid[row][col].hit || battleEnemyGrid[row][col].miss) return;
    if (battleEnemyGrid[row][col].ship) {
        battleEnemyGrid[row][col].hit = true;
        showToast('💥 ПОПАДАНИЕ!');
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '💥 Попадание в Морском бое!' });
        renderBattleGrid('enemyBattleGrid', battleEnemyGrid, false);
        if (checkWin(battleEnemyGrid)) {
            showToast('🏆 ПОБЕДА!');
            socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🏆 Победа в Морском бое!' });
            closeGame();
        } else {
            setTimeout(() => computerAttack(), 500);
        }
    } else {
        battleEnemyGrid[row][col].miss = true;
        showToast('💧 МИМО!');
        renderBattleGrid('enemyBattleGrid', battleEnemyGrid, false);
        setTimeout(() => computerAttack(), 500);
    }
}

function computerAttack() {
    if (!battleMyGrid) return;
    let attacked = false;
    while (!attacked) {
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        if (!battleMyGrid[row][col].hit && !battleMyGrid[row][col].miss) {
            if (battleMyGrid[row][col].ship) {
                battleMyGrid[row][col].hit = true;
                showToast('😢 Противник попал!');
                socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '💥 Противник попал в ваш корабль!' });
            } else {
                battleMyGrid[row][col].miss = true;
                showToast('😅 Противник промахнулся!');
            }
            renderBattleGrid('myBattleGrid', battleMyGrid, true);
            attacked = true;
            if (checkWin(battleMyGrid)) {
                showToast('😭 Поражение!');
                socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '😭 Поражение в Морском бое!' });
                closeGame();
            }
        }
    }
}

function checkWin(grid) {
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (grid[i][j].ship && !grid[i][j].hit) return false;
        }
    }
    return true;
}

function resetBattleship() {
    closeGame();
    startBattleship();
}

// КРЕСТИКИ-НОЛИКИ
function startTicTacToe() {
    tttBoard = ['', '', '', '', '', '', '', '', ''];
    tttCurrentPlayer = 'X';
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.id = 'tttGame';
    gameDiv.innerHTML = '<div class="game-title">❌ КРЕСТИКИ-НОЛИКИ ❌</div><div style="text-align:center;margin-bottom:12px">Сейчас ходит: <span id="tttTurn" style="color:#6366f1;font-weight:bold">X</span></div><div id="tttBoard" class="tic-grid" style="margin:0 auto"></div><div class="game-controls"><button class="game-btn" onclick="resetTicTacToe()">🔄 Новая игра</button><button class="game-btn" onclick="closeGame()">❌ Закрыть</button></div>';
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
    const winner = checkTicTacToeWinner(tttBoard);
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
        const winner = checkTicTacToeWinner(tttBoard);
        if (winner) {
            showToast('😢 Компьютер победил!');
            closeGame();
            return;
        }
        if (tttBoard.every(c => c !== '')) {
            showToast('🤝 НИЧЬЯ!');
            closeGame();
            return;
        }
        tttCurrentPlayer = 'X';
        renderTicTacToe();
    }
}

function checkTicTacToeWinner(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) {
        const [a, b, c] = line;
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
    const emoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice - 1];
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
    battleMyGrid = null;
    battleEnemyGrid = null;
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
    document.getElementById('channelLink').value = '';
}

function closeCreateChannelModal() {
    document.getElementById('createChannelModal').classList.remove('active');
}

function createChannel() {
    const n = document.getElementById('channelName').value.trim();
    const link = document.getElementById('channelLink').value.trim();
    if (!n) {
        showToast('Введите название');
        return;
    }
    socket.emit('createChannel', { channelName: n, inviteLink: link || n }, (res) => {
        if (res.success) {
            showToast('Канал создан');
            closeCreateChannelModal();
            loadChannels();
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
    const v = document.getElementById('storyVideo');
    if (v) {
        v.pause();
        v.src = '';
    }
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
    t.innerHTML = '<i class="fas fa-info-circle"></i> ' + msg;
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

// Индикатор печати
document.getElementById('messageInput').addEventListener('input', () => {
    if (currentChatTarget) {
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
socket.on('channelsUpdate', () => loadChannels());
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
    if (currentChatType === 'group' && m.target === currentChatTarget) show = true;
    if (currentChatType === 'channel' && m.target === currentChatTarget) show = true;
    if (show) {
        addMessage(m);
    }
    if (m.from !== currentUser) {
        showToast('Новое сообщение от ' + m.from);
    }
});
socket.on('voiceMessage', (d) => {
    if (currentChatTarget === d.target || currentChatTarget === d.from) {
        const div = document.createElement('div');
        div.className = 'message ' + (d.from === currentUser ? 'mine' : '');
        div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><div class="voice-message"><button class="voice-play" onclick="playAudio(this, \\'' + d.audio + '\\')">▶️</button><span>Голосовое сообщение</span></div><div class="message-time">' + (d.time || new Date().toLocaleTimeString()) + '</div></div></div>';
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
socket.on('typing', (d) => {
    if (currentChatTarget === d.user || currentChatTarget === d.channel) {
        document.getElementById('typingIndicator').style.display = 'flex';
        setTimeout(() => {
            document.getElementById('typingIndicator').style.display = 'none';
        }, 1500);
    }
});
socket.on('userOnline', (u) => {
    onlineUsers.add(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = 'Онлайн';
    }
    renderChats();
});
socket.on('userOffline', (u) => {
    onlineUsers.delete(u);
    if (currentChatTarget === u) {
        document.getElementById('chatStatus').innerHTML = '';
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
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar }, channels: user.channels || [] });
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
            const channelList = users[currentUser].channels || [];
            const channelDetails = channelList.map(ch => ({ id: ch, name: ch }));
            cb(channelDetails);
        } else {
            cb([]);
        }
    });

    socket.on('searchUsers', (data, cb) => {
        const { query } = data;
        const results = Object.keys(users).filter(u => u.toLowerCase().includes(query.toLowerCase()));
        cb(results.slice(0, 10));
    });

    socket.on('searchChannels', (data, cb) => {
        const { link } = data;
        if (channels[link]) {
            cb({ id: link, name: channels[link].name });
        } else {
            cb(null);
        }
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

    socket.on('joinGroup', (id) => {
        if (groups[id] && groups[id].members && groups[id].members.includes(currentUser)) {
            socket.emit('chatHistory', { target: id, messages: groups[id].messages || [] });
        }
    });

    socket.on('createChannel', (data, cb) => {
        const { channelName, inviteLink } = data;
        const link = inviteLink || channelName;
        if (channels[link]) {
            cb({ success: false, error: 'Канал с такой ссылкой уже существует' });
        } else {
            channels[link] = { name: channelName, owner: currentUser, members: [currentUser], messages: [] };
            saveData();
            if (!users[currentUser].channels) users[currentUser].channels = [];
            if (!users[currentUser].channels.includes(link)) {
                users[currentUser].channels.push(link);
                saveData();
            }
            cb({ success: true });
            socket.emit('channelsUpdate', users[currentUser].channels || []);
        }
    });

    socket.on('joinChannel', (channelLink) => {
        if (channels[channelLink]) {
            if (!users[currentUser].channels) users[currentUser].channels = [];
            if (!users[currentUser].channels.includes(channelLink)) {
                users[currentUser].channels.push(channelLink);
                saveData();
            }
            socket.emit('channelsUpdate', users[currentUser].channels || []);
            socket.emit('chatHistory', { target: channelLink, messages: channels[channelLink].messages || [] });
        }
    });

    socket.on('joinPrivate', (target) => {
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chatHistory', { target: target, messages: privateChats[id].messages || [] });
    });

    socket.on('sendMessage', (data) => {
        const { type, target, text, reply } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), target: target };
        if (reply) msg.replyTo = reply;
        if (type === 'private') {
            const id = [currentUser, target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            saveData();
            socket.emit('newMessage', msg);
            const ts = getSocketByUsername(target);
            if (ts) ts.emit('newMessage', msg);
        } else if (type === 'group') {
            if (groups[target] && groups[target].members && groups[target].members.includes(currentUser)) {
                groups[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
                if (groups[target].members) {
                    groups[target].members.forEach(m => {
                        if (m !== currentUser) {
                            const ms = getSocketByUsername(m);
                            if (ms) ms.emit('newMessage', msg);
                        }
                    });
                }
            }
        } else if (type === 'channel') {
            if (channels[target] && channels[target].members && channels[target].members.includes(currentUser)) {
                channels[target].messages.push(msg);
                saveData();
                socket.emit('newMessage', msg);
                if (channels[target].members) {
                    channels[target].members.forEach(m => {
                        if (m !== currentUser) {
                            const ms = getSocketByUsername(m);
                            if (ms) ms.emit('newMessage', msg);
                        }
                    });
                }
            }
        }
    });

    socket.on('addReaction', (data) => {
        const { messageId, chatId, reaction } = data;
        let chat = privateChats[chatId] || groups[chatId] || channels[chatId];
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
        } else if (type === 'channel') {
            if (channels[target] && channels[target].members) {
                channels[target].members.forEach(m => {
                    if (m !== currentUser) {
                        const ms = getSocketByUsername(m);
                        if (ms) ms.emit('typing', { user: currentUser, channel: target });
                    }
                });
            }
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
║     🚀 ATOMGRAM 200GB — МЕССЕНДЖЕР БУДУЩЕГО                ║
╠═══════════════════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                               ║
║  📱 http://localhost:${PORT}                               ║
╠═══════════════════════════════════════════════════════════╣
║  ✨ 200GB НОВЫХ ФУНКЦИЙ:                                  ║
║  🔍 ПОИСК ПОЛЬЗОВАТЕЛЕЙ И КАНАЛОВ                         ║
║  📢 ПРИВАТНЫЕ КАНАЛЫ (по ссылке-приглашению)              ║
║  💬 ЛИЧНЫЕ СООБЩЕНИЯ + ОТВЕТЫ                             ║
║  👥 ГРУППЫ (до 200 участников)                            ║
║  👤 ДРУЗЬЯ с запросами                                    ║
║  🎤 ГОЛОСОВЫЕ СООБЩЕНИЯ                                   ║
║  📎 ФАЙЛЫ И ИЗОБРАЖЕНИЯ                                   ║
║  😀 СТИКЕРЫ (40+)                                        ║
║  ❤️ РЕАКЦИИ (❤️👍😂😮😢)                                  ║
║  📸 ИСТОРИИ (как в Telegram)                             ║
║  ⚓ МОРСКОЙ БОЙ (с ИИ)                                   ║
║  ❌ КРЕСТИКИ-НОЛИКИ (чичико)                             ║
║  🎲 КОСТИ                                                ║
║  🎯 ДАРТС                                                ║
║  ⌨️ ИНДИКАТОР ПЕЧАТИ                                     ║
║  🟢 ОНЛАЙН-СТАТУС                                        ║
║  🖼️ АВАТАРЫ ПОЛЬЗОВАТЕЛЕЙ                                ║
║  🌟 УЛЬТРА-СОВРЕМЕННЫЙ ДИЗАЙН                            ║
║  🤖 AWAKE-BOT (сервер не спит 24/7)                     ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
