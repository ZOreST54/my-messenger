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

const DATA_FILE = path.join(__dirname, 'data.json');
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        users = data.users || {};
        privateChats = data.privateChats || {};
        channels = data.channels || {};
        groups = data.groups || {};
        stories = data.stories || {};
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, groups, stories }, null, 2));
}
setInterval(saveData, 10000);

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ATOMGRAM — Мессенджер нового поколения</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        :root {
            --bg-primary: #0f0f12;
            --bg-secondary: #18181b;
            --bg-tertiary: #1f1f24;
            --bg-elevated: #2c2c30;
            --bg-input: #1f1f24;
            --text-primary: #ffffff;
            --text-secondary: #9ca3af;
            --text-muted: #6b7280;
            --accent: #6366f1;
            --accent-light: #818cf8;
            --accent-dark: #4f46e5;
            --accent-glow: rgba(99, 102, 241, 0.3);
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --border: rgba(255, 255, 255, 0.06);
            --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
            --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
            --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
            --shadow-xl: 0 16px 48px rgba(0,0,0,0.6);
            --transition: all 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        }

        body.light {
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --bg-elevated: #e2e8f0;
            --bg-input: #f1f5f9;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --text-muted: #94a3b8;
            --border: rgba(0, 0, 0, 0.06);
            --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
            --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
            --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
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
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px var(--accent); }
            50% { box-shadow: 0 0 20px var(--accent); }
        }
        @keyframes ripple {
            0% { transform: scale(0); opacity: 0.5; }
            100% { transform: scale(4); opacity: 0; }
        }
        @keyframes typingAnim {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-8px); }
        }

        /* Экран авторизации */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0f0f12 0%, #18181b 50%, #1f1f24 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        body.light .auth-screen {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        .auth-card {
            background: var(--bg-secondary);
            backdrop-filter: blur(20px);
            padding: 48px 40px;
            border-radius: 40px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-xl);
            animation: fadeIn 0.5s ease;
        }
        .auth-card h1 {
            font-size: 42px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
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
            background: var(--bg-input);
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

        /* Главное приложение */
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
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .logo-icon::before {
            content: "⚡";
            font-size: 18px;
            color: white;
        }
        .logo-text {
            background: linear-gradient(135deg, #6366f1, #a855f7);
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

        /* Списки чатов */
        .chats-list {
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
        .chat-item.active {
            background: var(--accent);
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
        .chat-meta {
            text-align: right;
        }
        .chat-time {
            font-size: 11px;
            color: var(--text-muted);
        }
        .chat-badge {
            background: var(--accent);
            color: white;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 12px;
            margin-top: 4px;
        }

        /* Основная область чата */
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
            background: var(--accent);
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

        /* Голосовые сообщения */
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
        .voice-wave {
            display: flex;
            gap: 3px;
            align-items: center;
            height: 30px;
        }
        .voice-wave span {
            width: 3px;
            height: 100%;
            background: var(--accent);
            border-radius: 2px;
            animation: pulse 1s infinite;
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
        }
        .sticker:active {
            transform: scale(1.2);
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
        .battle-cell.hit { background: var(--error); }
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
            background: var(--bg-input);
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
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

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
            background: var(--bg-input);
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
            flex-shrink: 0;
        }
        .story-circle {
            width: 68px;
            height: 68px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .story-circle.add {
            background: var(--bg-tertiary);
            border: 2px solid var(--accent);
        }
        .story-avatar {
            font-size: 30px;
        }
        .story-name {
            font-size: 11px;
            color: var(--text-secondary);
            margin-top: 6px;
            max-width: 68px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

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
            animation: fadeIn 0.3s ease;
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
        <h1>⚡ ATOMGRAM</h1>
        <div class="subtitle">Мессенджер нового поколения</div>
        <div id="loginPanel">
            <input type="text" id="loginUsername" placeholder="Логин">
            <input type="password" id="loginPassword" placeholder="Пароль">
            <button onclick="login()">Войти</button>
            <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
        </div>
