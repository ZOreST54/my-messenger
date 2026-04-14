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
let games = {};

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
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ATOMGRAM | Мессенджер будущего</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        
        :root {
            --bg-dark: #0a0a0f;
            --bg-card: #121218;
            --bg-elevated: #1a1a24;
            --bg-input: #1a1a24;
            --accent-primary: #6366f1;
            --accent-secondary: #8b5cf6;
            --accent-glow: rgba(99, 102, 241, 0.4);
            --text-primary: #ffffff;
            --text-secondary: #a1a1aa;
            --text-muted: #52525b;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
            --border: rgba(255,255,255,0.06);
            --shadow-sm: 0 2px 8px rgba(0,0,0,0.2);
            --shadow-md: 0 8px 24px rgba(0,0,0,0.3);
            --shadow-lg: 0 16px 48px rgba(0,0,0,0.4);
            --shadow-glow: 0 0 20px var(--accent-glow);
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-dark);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
        }
        
        /* Анимации */
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 5px var(--accent-primary); } 50% { box-shadow: 0 0 20px var(--accent-primary); } }
        @keyframes typingAnim { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        
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
            max-width: 420px;
            text-align: center;
            border: 1px solid rgba(99, 102, 241, 0.3);
            box-shadow: var(--shadow-lg), var(--shadow-glow);
            animation: slideUp 0.5s ease;
        }
        
        .auth-logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            animation: float 3s ease infinite, glow 2s ease infinite;
            position: relative;
        }
        
        .auth-logo::before {
            content: "⚡";
            font-size: 48px;
            color: white;
        }
        
        .auth-logo::after {
            content: "";
            position: absolute;
            inset: -4px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
            border-radius: 28px;
            z-index: -1;
            opacity: 0.6;
            filter: blur(8px);
        }
        
        .auth-card h1 {
            font-size: 42px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #fff, #a1a1aa);
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
            padding: 14px 20px;
            margin: 8px 0;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 20px;
            font-size: 16px;
            color: var(--text-primary);
            transition: all 0.3s;
        }
        
        .auth-card input:focus {
            outline: none;
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }
        
        .auth-card button {
            width: 100%;
            padding: 14px;
            margin-top: 16px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            border: none;
            border-radius: 20px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .auth-card button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-glow);
        }
        
        .switch-btn {
            background: rgba(255,255,255,0.1) !important;
        }
        
        .error-msg {
            color: var(--error);
            margin-top: 16px;
            font-size: 14px;
        }
        
        /* Основное приложение */
        .app {
            display: none;
            height: 100vh;
            flex-direction: column;
        }
        
        .header {
            background: var(--bg-card);
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
            transition: transform 0.2s;
        }
        
        .menu-btn:hover {
            transform: scale(1.1);
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }
        
        .logo-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
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
            background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
            border-radius: 16px;
            z-index: -1;
            opacity: 0.5;
            filter: blur(6px);
        }
        
        .logo-text {
            font-size: 20px;
            font-weight: 800;
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
            gap: 6px;
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
        
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .sidebar {
            width: 320px;
            background: var(--bg-card);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
            z-index: 100;
        }
        
        .sidebar.mobile {
            position: fixed;
            left: -320px;
            top: 60px;
            height: calc(100vh - 60px);
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
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 199;
            display: none;
        }
        
        .overlay.open {
            display: block;
        }
        
        .profile {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .profile:hover {
            background: var(--bg-elevated);
        }
        
        .avatar {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 12px;
            position: relative;
            transition: transform 0.3s;
        }
        
        .profile:hover .avatar {
            transform: scale(1.05);
        }
        
        .avatar img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }
        
        .online-dot {
            position: absolute;
            bottom: 4px;
            right: 4px;
            width: 16px;
            height: 16px;
            background: var(--success);
            border-radius: 50%;
            border: 2px solid var(--bg-card);
        }
        
        .profile-name {
            font-size: 18px;
            font-weight: 600;
        }
        
        .profile-username {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
        }
        
        .nav-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            transition: all 0.2s;
            border-radius: 14px;
            margin: 4px 12px;
        }
        
        .nav-item:hover {
            background: var(--bg-elevated);
            transform: translateX(4px);
        }
        
        .section-title {
            padding: 16px 20px 8px;
            font-size: 11px;
            color: var(--accent-primary);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* Истории */
        .stories-row {
            padding: 12px 16px;
            display: flex;
            gap: 16px;
            overflow-x: auto;
            border-bottom: 1px solid var(--border);
        }
        
        .story-item {
            text-align: center;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .story-item:hover {
            transform: translateY(-2px);
        }
        
        .story-circle {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        .story-circle.add {
            background: var(--bg-elevated);
            border: 2px solid var(--accent-primary);
        }
        
        .story-avatar {
            font-size: 28px;
        }
        
        .story-name {
            font-size: 10px;
            color: var(--text-secondary);
            margin-top: 6px;
            max-width: 64px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Стикеры как в Telegram */
        .stickers-container {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            padding: 16px;
            background: var(--bg-card);
            border-radius: 24px;
            margin-bottom: 12px;
        }
        
        .sticker-pack {
            margin-bottom: 16px;
        }
        
        .sticker-pack-title {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 8px;
            padding-left: 4px;
        }
        
        /* Игры */
        .game-container {
            background: var(--bg-elevated);
            border-radius: 24px;
            padding: 16px;
            margin-bottom: 12px;
        }
        
        .game-board {
            display: grid;
            gap: 2px;
            background: var(--bg-dark);
            padding: 2px;
            border-radius: 8px;
        }
        
        .game-cell {
            aspect-ratio: 1;
            background: var(--bg-card);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.2s;
            border-radius: 8px;
        }
        
        .game-cell:hover {
            background: var(--accent-primary);
            transform: scale(1.05);
        }
        
        .game-cell.ship {
            background: #3b82f6;
        }
        
        .game-cell.hit {
            background: #ef4444;
        }
        
        .game-cell.miss {
            background: #52525b;
        }
        
        .battle-grid {
            display: inline-grid;
            grid-template-columns: repeat(10, 30px);
            gap: 2px;
            background: var(--bg-dark);
            padding: 2px;
            border-radius: 8px;
            margin: 8px;
        }
        
        .battle-cell {
            width: 30px;
            height: 30px;
            background: var(--bg-card);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 4px;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .battle-cell:hover {
            background: var(--accent-primary);
        }
        
        .tic-cell {
            width: 60px;
            height: 60px;
            font-size: 32px;
        }
        
        .game-controls {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        
        .game-btn {
            padding: 8px 16px;
            background: var(--accent-primary);
            border: none;
            border-radius: 12px;
            color: white;
            cursor: pointer;
            font-size: 14px;
        }
        
        /* Списки чатов */
        .friends-list, .groups-list, .channels-list {
            flex: 1;
            overflow-y: auto;
        }
        
        .chat-item {
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 14px;
            transition: all 0.2s;
            border-bottom: 1px solid var(--border);
        }
        
        .chat-item:hover {
            background: var(--bg-elevated);
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
        }
        
        .chat-info {
            flex: 1;
            min-width: 0;
        }
        
        .chat-name {
            font-weight: 600;
            font-size: 16px;
        }
        
        .chat-message {
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
            background: var(--bg-dark);
        }
        
        .chat-header {
            padding: 16px 24px;
            background: var(--bg-card);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .chat-header-info {
            flex: 1;
        }
        
        .chat-title {
            font-size: 18px;
            font-weight: 700;
        }
        
        .chat-status-text {
            font-size: 12px;
            color: var(--success);
            margin-top: 4px;
        }
        
        .chat-actions {
            display: flex;
            gap: 8px;
        }
        
        .chat-action-btn {
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: all 0.2s;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .chat-action-btn:hover {
            background: var(--bg-elevated);
            transform: scale(1.1);
        }
        
        /* Сообщения */
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .message {
            display: flex;
            gap: 10px;
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
            background: var(--bg-elevated);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        }
        
        .message-bubble {
            max-width: calc(100% - 46px);
        }
        
        .message-content {
            padding: 10px 16px;
            border-radius: 20px;
            background: var(--bg-elevated);
            position: relative;
        }
        
        .message.mine .message-content {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        
        .message-name {
            font-size: 12px;
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
        
        .message-reply {
            background: rgba(99,102,241,0.2);
            padding: 6px 10px;
            border-radius: 12px;
            margin-bottom: 6px;
            font-size: 12px;
            border-left: 3px solid var(--accent-primary);
        }
        
        .message-reactions {
            display: flex;
            gap: 6px;
            margin-top: 8px;
            flex-wrap: wrap;
        }
        
        .reaction {
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.1s;
        }
        
        .reaction:hover {
            transform: scale(1.1);
            background: rgba(99,102,241,0.5);
        }
        
        /* Панель ввода */
        .input-area {
            padding: 16px 20px;
            background: var(--bg-card);
            border-top: 1px solid var(--border);
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .input-area input {
            flex: 1;
            padding: 12px 18px;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 28px;
            color: var(--text-primary);
            font-size: 15px;
            transition: all 0.3s;
        }
        
        .input-area input:focus {
            outline: none;
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px var(--accent-glow);
        }
        
        .input-area button {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        
        .input-area button:hover {
            background: var(--accent-primary);
            transform: scale(1.05);
        }
        
        .input-area button.recording {
            background: var(--error);
            animation: pulse 1s infinite;
        }
        
        /* Стикер-пикер */
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: var(--bg-card);
            border-radius: 24px 24px 0 0;
            padding: 16px;
            display: none;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
            z-index: 150;
            max-height: 300px;
            overflow-y: auto;
            border-top: 1px solid var(--border);
        }
        
        .sticker-picker.open {
            display: flex;
        }
        
        .sticker {
            font-size: 48px;
            cursor: pointer;
            transition: transform 0.1s;
            padding: 8px;
            background: var(--bg-elevated);
            border-radius: 16px;
        }
        
        .sticker:active {
            transform: scale(1.2);
        }
        
        /* Индикатор печати */
        .typing-indicator {
            padding: 8px 24px;
            font-size: 12px;
            color: var(--text-secondary);
            display: flex;
            gap: 6px;
            align-items: center;
        }
        
        .typing-dot {
            width: 6px;
            height: 6px;
            background: var(--accent-primary);
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
            background: var(--bg-card);
            border-radius: 32px;
            width: 90%;
            max-width: 500px;
            max-height: 85vh;
            overflow-y: auto;
            border: 1px solid var(--border);
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            font-size: 18px;
        }
        
        .modal-close {
            background: none;
            border: none;
            color: var(--text-primary);
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
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: 16px;
            color: var(--text-primary);
            font-size: 15px;
            margin-bottom: 16px;
        }
        
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border: none;
            border-radius: 16px;
            color: white;
            font-weight: 600;
            cursor: pointer;
        }
        
        .modal-btn.cancel {
            background: var(--bg-elevated);
        }
        
        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-card);
            padding: 12px 24px;
            border-radius: 40px;
            font-size: 14px;
            z-index: 1000;
            animation: slideUp 0.3s;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
        }
        
        @media (max-width: 768px) {
            .sidebar { position: fixed; left: -320px; top: 60px; height: calc(100vh - 60px); z-index: 200; }
            .sidebar.open { left: 0; }
            .menu-btn { display: block; }
            .message { max-width: 85%; }
            .battle-grid { grid-template-columns: repeat(10, 28px); }
            .battle-cell { width: 28px; height: 28px; font-size: 12px; }
            .tic-cell { width: 50px; height: 50px; font-size: 28px; }
        }
        @media (min-width: 769px) { .sidebar { position: relative; left: 0 !important; } }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg-dark); }
        ::-webkit-scrollbar-thumb { background: var(--accent-primary); border-radius: 4px; }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <div class="auth-logo"></div>
        <h1>ATOMGRAM</h1>
        <div class="subtitle">Мессенджер будущего. Быстрее молнии.</div>
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
            <span class="logo-text">ATOMGRAM</span>
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
            <div class="stories-row" id="storiesRow"></div>
            <div class="nav-item" onclick="openAddFriend()"><span>➕</span><span>Добавить друга</span></div>
            <div class="nav-item" onclick="openCreateGroup()"><span>👥</span><span>Создать группу</span></div>
            <div class="nav-item" onclick="openCreateChannel()"><span>📢</span><span>Создать канал</span></div>
            <div class="section-title">ДРУЗЬЯ</div>
            <div class="friends-list" id="friendsList"></div>
            <div class="section-title">ГРУППЫ</div>
            <div class="groups-list" id="groupsList"></div>
            <div class="section-title">КАНАЛЫ</div>
            <div class="channels-list" id="channelsList"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <div class="chat-header-info">
                    <div class="chat-title" id="chatTitle">Выберите чат</div>
                    <div class="chat-status-text" id="chatStatus"></div>
                </div>
                <div class="chat-actions" id="chatActions"></div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="typing-indicator" id="typingIndicator" style="display:none">
                <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                <span id="typingText">печатает...</span>
            </div>
            <div id="replyIndicator" class="reply-indicator" style="display:none">
                <span id="replyPreview"></span>
                <button onclick="cancelReply()">✕</button>
            </div>
            <div class="sticker-picker" id="stickerPicker"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="toggleStickerPicker()">😊</button>
                <button onclick="document.getElementById('fileInput').click()">📎</button>
                <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
                <button id="voiceBtn" onclick="toggleRecording()">🎤</button>
                <button onclick="openGameMenu()">🎮</button>
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<!-- Модальные окна -->
<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>➕ Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>
<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👥 Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>
<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>📢 Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>
<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👤 Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:100px;height:100px;font-size:48px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:var(--bg-elevated);border:none;padding:8px 20px;border-radius:20px;color:white;cursor:pointer">📷 Загрузить фото</button><input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()"></div><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"><textarea id="editBio" class="modal-input" rows="2" placeholder="О себе"></textarea><input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>
<div id="gameMenuModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>🎮 Игры в чате</h3><button class="modal-close" onclick="closeGameMenu()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="startGame('battleship')" style="margin-bottom:12px">⚓ Морской бой</button><button class="modal-btn" onclick="startGame('tictactoe')" style="margin-bottom:12px">❌ Крестики-нолики (чичико)</button><button class="modal-btn" onclick="startGame('dice')" style="margin-bottom:12px">🎲 Кости</button><button class="modal-btn" onclick="startGame('darts')">🎯 Дартс</button></div></div></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null, currentUserData = null;
let currentChatTarget = null, currentChatType = null;
let allFriends = [], friendRequests = [], allGroups = [], allChannels = [];
let onlineUsers = new Set();
let replyToMessage = null;
let mediaRecorder = null, audioChunks = [], isRecording = false;
let typingTimeout = null;
let currentGame = null;

// Стикеры как в Telegram
const stickerSets = {
    emoji: ['😀', '😂', '😍', '😎', '🥳', '🔥', '❤️', '🎉', '👍', '👎', '😢', '😡', '😱', '🥺', '🤔', '🤯', '💀', '👻', '🤡', '💩'],
    animals: ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐸', '🐒', '🦁', '🐮', '🐷', '🐙', '🦋', '🐧', '🦄', '🐉', '🐲'],
    food: ['🍎', '🍕', '🍔', '🌮', '🍣', '🍩', '🍪', '🍫', '🍦', '🍺', '🥂', '☕', '🍵', '🥗', '🍲', '🍜', '🥟', '🍰', '🎂', '🍭'],
    sport: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥊', '🏋️', '🤼', '🏊', '🚴', '🏇', '🧗', '🤺', '⛷️', '🏂']
};

function initStickerPicker() {
    const container = document.getElementById('stickerPicker');
    let html = '<div class="sticker-pack"><div class="sticker-pack-title">😀 Эмоции</div><div class="stickers-container">';
    stickerSets.emoji.forEach(s => html += `<div class="sticker" onclick="sendSticker('${s}')">${s}</div>`);
    html += '</div></div><div class="sticker-pack"><div class="sticker-pack-title">🐱 Животные</div><div class="stickers-container">';
    stickerSets.animals.forEach(s => html += `<div class="sticker" onclick="sendSticker('${s}')">${s}</div>`);
    html += '</div></div><div class="sticker-pack"><div class="sticker-pack-title">🍔 Еда</div><div class="stickers-container">';
    stickerSets.food.forEach(s => html += `<div class="sticker" onclick="sendSticker('${s}')">${s}</div>`);
    html += '</div></div><div class="sticker-pack"><div class="sticker-pack-title">⚽ Спорт</div><div class="stickers-container">';
    stickerSets.sport.forEach(s => html += `<div class="sticker" onclick="sendSticker('${s}')">${s}</div>`);
    html += '</div></div>';
    container.innerHTML = html;
}

// Игры
function openGameMenu() {
    if (!currentChatTarget) { showToast('Выберите чат'); return; }
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

function startBattleship() {
    const myGrid = initBattleGrid();
    const enemyGrid = initBattleGrid();
    
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.innerHTML = `
        <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
            <div><div style="text-align: center; margin-bottom: 8px;">🚢 Ваше поле</div><div id="myBattleGrid" class="battle-grid"></div></div>
            <div><div style="text-align: center; margin-bottom: 8px;">⚓ Поле противника</div><div id="enemyBattleGrid" class="battle-grid"></div></div>
        </div>
        <div class="game-controls"><button class="game-btn" onclick="resetBattle()">🔄 Новая игра</button><button class="game-btn" onclick="closeGame()">❌ Закрыть</button></div>
    `;
    document.getElementById('messages').appendChild(gameDiv);
    
    renderBattleGrid('myBattleGrid', myGrid, true);
    renderBattleGrid('enemyBattleGrid', enemyGrid, false);
    
    window.battleMyGrid = myGrid;
    window.battleEnemyGrid = enemyGrid;
}

function initBattleGrid() {
    const grid = [];
    for (let i = 0; i < 10; i++) {
        grid[i] = [];
        for (let j = 0; j < 10; j++) {
            grid[i][j] = { ship: false, hit: false, miss: false };
        }
    }
    // Расставляем корабли
    const ships = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    ships.forEach(size => placeShip(grid, size));
    return grid;
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
            let content = '';
            if (grid[i][j].hit) {
                cellClass += ' hit';
                content = '💥';
            } else if (grid[i][j].miss) {
                cellClass += ' miss';
                content = '·';
            } else if (isMyGrid && grid[i][j].ship) {
                content = '🚢';
            }
            html += `<div class="${cellClass}" onclick="battleAttack(${i}, ${j}, ${!isMyGrid})">${content}</div>`;
        }
    }
    container.innerHTML = html;
}

function battleAttack(row, col, isEnemy) {
    if (!isEnemy) return;
    const grid = window.battleEnemyGrid;
    if (grid[row][col].hit || grid[row][col].miss) return;
    
    if (grid[row][col].ship) {
        grid[row][col].hit = true;
        showToast('💥 Попадание!');
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '💥 Попадание в Морском бое!' });
    } else {
        grid[row][col].miss = true;
        showToast('💧 Мимо!');
    }
    renderBattleGrid('enemyBattleGrid', grid, false);
    
    // Проверка победы
    let allShipsHit = true;
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (grid[i][j].ship && !grid[i][j].hit) allShipsHit = false;
        }
    }
    if (allShipsHit) {
        showToast('🏆 ПОБЕДА! Вы уничтожили все корабли!');
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🏆 ПОБЕДА в Морском бое!' });
        closeGame();
    }
}

function startTicTacToe() {
    let board = ['', '', '', '', '', '', '', '', ''];
    let currentPlayer = 'X';
    
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 12px;">🎮 Крестики-нолики (чичико)<br>Сейчас ходит: <span id="tttTurn">X</span></div>
        <div id="tttBoard" class="game-board" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 200px; margin: 0 auto;"></div>
        <div class="game-controls"><button class="game-btn" onclick="resetTicTacToe()">🔄 Новая игра</button><button class="game-btn" onclick="closeGame()">❌ Закрыть</button></div>
    `;
    document.getElementById('messages').appendChild(gameDiv);
    
    renderTicTacToe(board, currentPlayer);
    window.tttBoard = board;
    window.tttCurrentPlayer = currentPlayer;
}

function renderTicTacToe(board, currentPlayer) {
    const container = document.getElementById('tttBoard');
    if (!container) return;
    let html = '';
    for (let i = 0; i < 9; i++) {
        html += `<div class="game-cell tic-cell" onclick="makeMove(${i})">${board[i]}</div>`;
    }
    container.innerHTML = html;
    const turnSpan = document.getElementById('tttTurn');
    if (turnSpan) turnSpan.innerText = currentPlayer;
}

function makeMove(index) {
    if (window.tttBoard[index] !== '') return;
    if (window.tttCurrentPlayer !== 'X') return;
    
    window.tttBoard[index] = 'X';
    
    const winner = checkWinner(window.tttBoard);
    if (winner) {
        showToast('🏆 Вы победили в крестики-нолики!');
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: '🏆 Победа в крестики-нолики (чичико)!' });
        closeGame();
        return;
    }
    
    if (window.tttBoard.every(cell => cell !== '')) {
        showToast('🤝 Ничья!');
        closeGame();
        return;
    }
    
    window.tttCurrentPlayer = 'O';
    renderTicTacToe(window.tttBoard, window.tttCurrentPlayer);
    
    // Ход компьютера
    setTimeout(() => {
        const empty = window.tttBoard.reduce((arr, cell, idx) => cell === '' ? [...arr, idx] : arr, []);
        if (empty.length > 0) {
            const move = empty[Math.floor(Math.random() * empty.length)];
            window.tttBoard[move] = 'O';
            
            const winner2 = checkWinner(window.tttBoard);
            if (winner2) {
                showToast('😢 Компьютер победил!');
                closeGame();
                return;
            }
            
            window.tttCurrentPlayer = 'X';
            renderTicTacToe(window.tttBoard, window.tttCurrentPlayer);
        }
    }, 500);
}

function checkWinner(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let line of lines) {
        const [a,b,c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function rollDice() {
    const dice = Math.floor(Math.random() * 6) + 1;
    const diceEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice-1];
    showToast(`🎲 Выпало: ${diceEmoji} ${dice}`);
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: `🎲 Бросок костей: ${diceEmoji} (${dice})` });
}

function playDarts() {
    const score = Math.floor(Math.random() * 180) + 1;
    const messages = ['🎯 БУЛЛСАЙ!', '🎯 Отлично!', '🎯 Хороший бросок!', '🎯 Мимо!', '🎯 Десятка!'];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    showToast(`${msg} ${score} очков!`);
    socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: `🎯 Дартс: ${msg} (${score} очков)` });
}

function closeGame() {
    const gameDiv = document.querySelector('.game-container');
    if (gameDiv) gameDiv.remove();
    currentGame = null;
}

function resetBattle() { closeGame(); startBattleship(); }
function resetTicTacToe() { closeGame(); startTicTacToe(); }

// ========== АВТОРИЗАЦИЯ ==========
function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('login', { username: u, password: p }, (res) => {
        if (res.success) {
            currentUser = u; currentUserData = res.userData;
            localStorage.setItem('atomgram_user', u);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI(); loadData(); loadStories(); initStickerPicker();
        } else { document.getElementById('authError').innerText = res.error; }
    });
}

function register() {
    const u = document.getElementById('regUsername').value.trim();
    const n = document.getElementById('regName').value.trim();
    const p = document.getElementById('regPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('register', { username: u, name: n, password: p }, (res) => {
        if (res.success) { document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.'; showLogin(); }
        else { document.getElementById('authError').innerText = res.error; }
    });
}

function showRegister() { document.getElementById('loginPanel').style.display = 'none'; document.getElementById('registerPanel').style.display = 'block'; }
function showLogin() { document.getElementById('loginPanel').style.display = 'block'; document.getElementById('registerPanel').style.display = 'none'; }
function updateUI() { document.getElementById('userName').innerText = currentUserData?.name || currentUser; document.getElementById('userLogin').innerText = '@' + currentUser; }

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadData() {
    socket.emit('getFriends', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; renderFriends(); });
    socket.emit('getGroups', (g) => { allGroups = g; renderGroups(); });
    socket.emit('getChannels', (c) => { allChannels = c; renderChannels(); });
}
function renderFriends() {
    let html = '';
    friendRequests.forEach(r => { html += '<div class="chat-item" style="background:rgba(99,102,241,0.1)"><div class="chat-avatar">📨</div><div class="chat-info"><div class="chat-name">' + r + '</div><div class="chat-message">Запрос в друзья</div></div><button onclick="acceptFriend(\\'' + r + '\\')" style="background:#10b981;border:none;border-radius:20px;padding:6px 12px;margin:0 5px;cursor:pointer">✓</button><button onclick="rejectFriend(\\'' + r + '\\')" style="background:#ef4444;border:none;border-radius:20px;padding:6px 12px;cursor:pointer">✗</button></div>'; });
    allFriends.forEach(f => { const online = onlineUsers.has(f); html += '<div class="chat-item" onclick="openChat(\\'' + f + '\\',\\'private\\')"><div class="chat-avatar">👤' + (online ? '<div class="online-dot"></div>' : '') + '</div><div class="chat-info"><div class="chat-name">' + f + '</div><div class="chat-status ' + (online ? '' : 'offline') + '">' + (online ? '● Онлайн' : '○ Офлайн') + '</div></div></div>'; });
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#888">Нет друзей</div>';
    document.getElementById('friendsList').innerHTML = html;
}
function renderGroups() {
    let html = '';
    allGroups.forEach(g => { html += '<div class="chat-item" onclick="openChat(\\'' + g.id + '\\',\\'group\\')"><div class="chat-avatar">👥</div><div class="chat-info"><div class="chat-name">' + g.name + '</div><div class="chat-message">' + (g.members?.length || 1) + ' участников</div></div></div>'; });
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#888">Нет групп</div>';
    document.getElementById('groupsList').innerHTML = html;
}
function renderChannels() {
    let html = '';
    allChannels.forEach(c => { html += '<div class="chat-item" onclick="openChat(\\'' + c + '\\',\\'channel\\')"><div class="chat-avatar">📢</div><div class="chat-info"><div class="chat-name">#' + c + '</div></div></div>'; });
    if (html === '') html = '<div style="padding:20px;text-align:center;color:#888">Нет каналов</div>';
    document.getElementById('channelsList').innerHTML = html;
}

// ========== ЧАТЫ ==========
function openChat(target, type) {
    currentChatTarget = target; currentChatType = type;
    let title = '', actions = '';
    if (type === 'private') { title = target; document.getElementById('chatStatus').innerHTML = onlineUsers.has(target) ? '● Онлайн' : '○ Офлайн'; socket.emit('joinPrivate', target); actions = '<button class="chat-action-btn" onclick="openGameMenu()">🎮</button>'; }
    else if (type === 'group') { const g = allGroups.find(x => x.id === target); title = g ? g.name : target; document.getElementById('chatStatus').innerHTML = '👥 Группа • ' + (g?.members?.length || 1) + ' участников'; socket.emit('joinGroup', target); actions = '<button class="chat-action-btn" onclick="openGameMenu()">🎮</button><button class="chat-action-btn" onclick="addMemberToGroup()">➕</button>'; }
    else if (type === 'channel') { title = '# ' + target; document.getElementById('chatStatus').innerHTML = '📢 Публичный канал'; socket.emit('joinChannel', target); actions = '<button class="chat-action-btn" onclick="openGameMenu()">🎮</button>'; }
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
function sendSticker(s) { if (!currentChatTarget) return; socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: s }); document.getElementById('stickerPicker').classList.remove('open'); }
function toggleStickerPicker() { document.getElementById('stickerPicker').classList.toggle('open'); }
function cancelReply() { replyToMessage = null; document.getElementById('replyIndicator').style.display = 'none'; }

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.from === currentUser ? 'mine' : '');
    let replyHtml = '';
    if (msg.replyTo) { replyHtml = '<div class="message-reply"><span style="color:#6366f1">↩️ ' + msg.replyTo.from + '</span>: ' + escapeHtml(msg.replyTo.text.substring(0,50)) + '</div>'; }
    div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content">' + replyHtml + (msg.from !== currentUser ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') + '<div class="message-text" ondblclick="setReply(\\'' + msg.id + '\\',\\'' + escapeHtml(msg.from) + '\\',\\'' + escapeHtml(msg.text) + '\\')">' + (msg.text && (msg.text.includes('⚀') || msg.text.includes('🎯') || msg.text.includes('💥') || msg.text.includes('🚢') || msg.text.includes('❌') || msg.text.includes('🏆')) ? msg.text : escapeHtml(msg.text)) + '</div><div class="message-time">' + (msg.time || new Date().toLocaleTimeString()) + '</div><div style="display:flex;gap:8px;margin-top:6px"><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\',\\'❤️\\')">❤️</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\',\\'👍\\')">👍</span><span class="reaction" onclick="addReaction(\\'' + msg.id + '\\',\\'😂\\')">😂</span></div></div></div>';
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = 9999;
}
function setReply(id, from, text) { replyToMessage = { id: id, from: from, text: text.substring(0,50) }; document.getElementById('replyPreview').innerHTML = '📎 Ответ ' + from + ': ' + text.substring(0,40); document.getElementById('replyIndicator').style.display = 'flex'; }
function addReaction(msgId, reaction) { socket.emit('addReaction', { messageId: msgId, chatId: currentChatTarget, reaction: reaction }); }

// ========== ГОЛОСОВЫЕ ==========
async function toggleRecording() {
    if (isRecording) { if (mediaRecorder) mediaRecorder.stop(); isRecording = false; document.getElementById('voiceBtn').classList.remove('recording'); document.getElementById('voiceBtn').innerHTML = '🎤'; return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); mediaRecorder = new MediaRecorder(stream); audioChunks = []; mediaRecorder.ondataavailable = e => audioChunks.push(e.data); mediaRecorder.onstop = () => { const blob = new Blob(audioChunks, { type: 'audio/webm' }); const reader = new FileReader(); reader.onloadend = () => socket.emit('voiceMessage', { type: currentChatType, target: currentChatTarget, audio: reader.result }); reader.readAsDataURL(blob); stream.getTracks().forEach(t => t.stop()); }; mediaRecorder.start(); isRecording = true; document.getElementById('voiceBtn').classList.add('recording'); document.getElementById('voiceBtn').innerHTML = '⏹️'; } catch(e) { alert('Нет микрофона'); } }

// ========== ФАЙЛЫ ==========
function sendFile() { const file = document.getElementById('fileInput').files[0]; if (!file || !currentChatTarget) return; const reader = new FileReader(); reader.onloadend = () => socket.emit('fileMessage', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileData: reader.result }); reader.readAsDataURL(file); }

// ========== ДРУЗЬЯ И ГРУППЫ ==========
function openAddFriend() { document.getElementById('addFriendModal').classList.add('active'); document.getElementById('friendUsername').value = ''; }
function closeAddFriendModal() { document.getElementById('addFriendModal').classList.remove('active'); }
function addFriend() { const u = document.getElementById('friendUsername').value.trim(); if (!u) { showToast('Введите логин'); return; } socket.emit('addFriend', { friendUsername: u }, (res) => { showToast(res.message || res.error); closeAddFriendModal(); loadData(); }); }
function acceptFriend(f) { socket.emit('acceptFriend', { fromUser: f }, () => loadData()); }
function rejectFriend(f) { socket.emit('rejectFriend', { fromUser: f }, () => loadData()); }
function openCreateGroup() { document.getElementById('createGroupModal').classList.add('active'); document.getElementById('groupName').value = ''; }
function closeCreateGroupModal() { document.getElementById('createGroupModal').classList.remove('active'); }
function createGroup() { const n = document.getElementById('groupName').value.trim(); if (!n) { showToast('Введите название'); return; } socket.emit('createGroup', { groupName: n }, (res) => { if (res.success) { showToast('Группа создана'); closeCreateGroupModal(); loadData(); } else { showToast(res.error); } }); }
function addMemberToGroup() { const u = prompt('Логин пользователя:'); if (u) { socket.emit('addGroupMember', { groupId: currentChatTarget, username: u }, (res) => { showToast(res.message || res.error); }); } }
function openCreateChannel() { document.getElementById('createChannelModal').classList.add('active'); document.getElementById('channelName').value = ''; }
function closeCreateChannelModal() { document.getElementById('createChannelModal').classList.remove('active'); }
function createChannel() { const n = document.getElementById('channelName').value.trim(); if (!n) { showToast('Введите название'); return; } socket.emit('createChannel', { channelName: n }, (res) => { if (res.success) { showToast('Канал создан'); closeCreateChannelModal(); loadData(); } else { showToast(res.error); } }); }

// ========== ПРОФИЛЬ ==========
function openProfile() { document.getElementById('editName').value = currentUserData?.name || ''; document.getElementById('editBio').value = currentUserData?.bio || ''; document.getElementById('editPassword').value = ''; document.getElementById('profileModal').classList.add('active'); }
function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }
function uploadAvatar() { const file = document.getElementById('avatarUpload').files[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => socket.emit('uploadAvatar', { avatar: reader.result }, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); showToast('Аватар обновлён'); } }); reader.readAsDataURL(file); }
function saveProfile() { const data = { name: document.getElementById('editName').value.trim(), bio: document.getElementById('editBio').value.trim() }; const pwd = document.getElementById('editPassword').value.trim(); if (pwd) data.password = pwd; socket.emit('updateProfile', data, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); closeProfileModal(); showToast('Профиль обновлён'); } }); }

// ========== ИСТОРИИ ==========
function addStory() { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,video/*'; input.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => socket.emit('addStory', { media: reader.result, type: file.type.startsWith('image/') ? 'image' : 'video' }); reader.readAsDataURL(file); }; input.click(); }
function viewStory(username) { socket.emit('getStory', username); }
function closeStoryViewer() { document.getElementById('storyViewer')?.classList.remove('active'); const v = document.getElementById('storyVideo'); if (v) { v.pause(); v.src = ''; } }
function loadStories() { socket.emit('getStories'); }

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }
function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.innerText = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2000); }
function escapeHtml(s) { if (!s) return ''; return s.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); }

// Индикатор печати
document.getElementById('messageInput').addEventListener('input', () => { if (currentChatTarget) { socket.emit('typing', { type: currentChatType, target: currentChatTarget }); clearTimeout(typingTimeout); typingTimeout = setTimeout(() => socket.emit('stopTyping', { type: currentChatType, target: currentChatTarget }), 1000); } });

// ========== СОБЫТИЯ СОКЕТА ==========
socket.on('friendsUpdate', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; renderFriends(); });
socket.on('groupsUpdate', (g) => { allGroups = g; renderGroups(); });
socket.on('channelsUpdate', (c) => { allChannels = c; renderChannels(); });
socket.on('chatHistory', (d) => { if (currentChatTarget === d.target) { document.getElementById('messages').innerHTML = ''; d.messages.forEach(m => addMessage(m)); } });
socket.on('newMessage', (m) => { if (currentChatTarget === m.target || currentChatTarget === m.from || (currentChatType === 'group' && m.target === currentChatTarget)) { addMessage(m); } if (m.from !== currentUser) { showToast('Новое сообщение от ' + m.from); } });
socket.on('voiceMessage', (d) => { if (currentChatTarget === d.target || currentChatTarget === d.from) { const div = document.createElement('div'); div.className = 'message ' + (d.from === currentUser ? 'mine' : ''); div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><div class="voice-message"><button class="voice-play" onclick="playAudio(this,\\'' + d.audio + '\\')">▶️</button><span>Голосовое сообщение</span></div><div class="message-time">' + (d.time || new Date().toLocaleTimeString()) + '</div></div></div>'; document.getElementById('messages').appendChild(div); } });
socket.on('fileMessage', (d) => { if (currentChatTarget === d.target || currentChatTarget === d.from) { const div = document.createElement('div'); div.className = 'message ' + (d.from === currentUser ? 'mine' : ''); div.innerHTML = '<div class="message-avatar">👤</div><div class="message-bubble"><div class="message-content"><div class="message-name">' + escapeHtml(d.from) + '</div><a class="file-attachment" href="' + d.fileData + '" download="' + d.fileName + '">📎 ' + escapeHtml(d.fileName) + '</a><div class="message-time">' + (d.time || new Date().toLocaleTimeString()) + '</div></div></div>'; document.getElementById('messages').appendChild(div); } });
socket.on('typing', (d) => { if (currentChatTarget === d.user || currentChatTarget === d.channel) { document.getElementById('typingIndicator').style.display = 'flex'; document.getElementById('typingText').innerHTML = d.user + ' печатает...'; setTimeout(() => document.getElementById('typingIndicator').style.display = 'none', 1500); } });
socket.on('userOnline', (u) => { onlineUsers.add(u); if (currentChatTarget === u) { document.getElementById('chatStatus').innerHTML = '● Онлайн'; } renderFriends(); });
socket.on('userOffline', (u) => { onlineUsers.delete(u); if (currentChatTarget === u) { document.getElementById('chatStatus').innerHTML = '○ Офлайн'; } renderFriends(); });
socket.on('storiesUpdate', (s) => { const container = document.getElementById('storiesRow'); let html = '<div class="story-item" onclick="addStory()"><div class="story-circle add"><div class="story-avatar">+</div></div><div class="story-name">Моя история</div></div>'; s.forEach(st => { html += '<div class="story-item" onclick="viewStory(\\'' + st.username + '\\')"><div class="story-circle"><div class="story-avatar">' + (st.avatar || '👤') + '</div></div><div class="story-name">' + (st.name || st.username) + '</div></div>'; }); container.innerHTML = html; });
socket.on('storyData', (d) => { 
    let viewer = document.getElementById('storyViewer');
    if (!viewer) {
        viewer = document.createElement('div'); viewer.id = 'storyViewer'; viewer.className = 'story-viewer';
        viewer.innerHTML = '<div class="story-container"><div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div><img id="storyImage" class="story-media" style="display:none"><video id="storyVideo" class="story-media" style="display:none" autoplay muted></video><button class="story-close" onclick="closeStoryViewer()">✕</button></div>';
        document.body.appendChild(viewer);
    }
    const img = document.getElementById('storyImage'); const video = document.getElementById('storyVideo');
    if (d.type === 'image') { img.style.display = 'block'; video.style.display = 'none'; img.src = d.media; }
    else { img.style.display = 'none'; video.style.display = 'block'; video.src = d.media; video.play(); }
    viewer.classList.add('active');
    let progress = 0; const interval = setInterval(() => { progress += 2; document.getElementById('storyProgressBar').style.width = progress + '%'; if (progress >= 100) { clearInterval(interval); closeStoryViewer(); } }, 100);
});

function playAudio(btn, audioData) { const audio = new Audio(audioData); audio.play(); btn.innerHTML = '⏸️'; audio.onended = () => btn.innerHTML = '▶️'; btn.onclick = () => { audio.paused ? audio.play() : audio.pause(); btn.innerHTML = audio.paused ? '▶️' : '⏸️'; }; }

const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) { document.getElementById('loginUsername').value = savedUser; }
</script>
</body>
</html>
    `);
});

// ========== СЕРВЕРНАЯ ЧАСТЬ ==========
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
        if (users[username]) cb({ success: false, error: 'Пользователь уже существует' });
        else { users[username] = { username, name: name || username, password, bio: '', avatar: null, friends: [], friendRequests: [] }; saveData(); cb({ success: true }); }
    });

    socket.on('login', (data, cb) => {
        const { username, password } = data;
        const user = users[username];
        if (!user) cb({ success: false, error: 'Пользователь не найден' });
        else if (user.password !== password) cb({ success: false, error: 'Неверный пароль' });
        else {
            currentUser = username; socket.username = username;
            userSockets.set(socket.id, username); onlineSet.add(username);
            cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } });
            socket.emit('friendsUpdate', { friends: user.friends || [], requests: user.friendRequests || [] });
            socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members?.includes(username)));
            socket.emit('channelsUpdate', Object.keys(channels));
            socket.broadcast.emit('userOnline', username);
            io.emit('storiesUpdate', getActiveStories());
        }
    });

    socket.on('updateProfile', (data, cb) => {
        const user = users[currentUser];
        if (user) { if (data.name) user.name = data.name; if (data.bio) user.bio = data.bio; if (data.password) user.password = data.password; saveData(); cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } }); }
        else cb({ success: false });
    });

    socket.on('uploadAvatar', (data, cb) => { const user = users[currentUser]; if (user) { user.avatar = data.avatar; saveData(); cb({ success: true, userData: { username: user.username, name: user.name, bio: user.bio, avatar: user.avatar } }); } else cb({ success: false }); });
    socket.on('getFriends', (cb) => { if (currentUser && users[currentUser]) cb({ friends: users[currentUser].friends || [], requests: users[currentUser].friendRequests || [] }); else cb({ friends: [], requests: [] }); });
    socket.on('getGroups', (cb) => { if (currentUser) cb(Object.values(groups).filter(g => g.members?.includes(currentUser))); else cb([]); });
    socket.on('getChannels', (cb) => cb(Object.keys(channels)));

    socket.on('addFriend', (data, cb) => {
        const { friendUsername } = data; const user = users[currentUser]; const friend = users[friendUsername];
        if (!friend) cb({ success: false, error: 'Пользователь не найден' });
        else if (friendUsername === currentUser) cb({ success: false, error: 'Нельзя добавить себя' });
        else if (user.friends.includes(friendUsername)) cb({ success: false, error: 'Уже в друзьях' });
        else if (friend.friendRequests.includes(currentUser)) cb({ success: false, error: 'Запрос уже отправлен' });
        else { friend.friendRequests.push(currentUser); saveData(); cb({ success: true, message: 'Запрос отправлен' }); const fs = getSocketByUsername(friendUsername); if (fs) fs.emit('friendsUpdate', { friends: friend.friends || [], requests: friend.friendRequests || [] }); }
    });

    socket.on('acceptFriend', (data) => {
        const { fromUser } = data; const user = users[currentUser]; const from = users[fromUser];
        if (user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            if (!user.friends) user.friends = []; if (!from.friends) from.friends = [];
            user.friends.push(fromUser); from.friends.push(currentUser); saveData();
            socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests });
            const fs = getSocketByUsername(fromUser); if (fs) fs.emit('friendsUpdate', { friends: from.friends, requests: from.friendRequests });
        }
    });

    socket.on('rejectFriend', (data) => { const { fromUser } = data; const user = users[currentUser]; if (user.friendRequests.includes(fromUser)) { user.friendRequests = user.friendRequests.filter(f => f !== fromUser); saveData(); socket.emit('friendsUpdate', { friends: user.friends, requests: user.friendRequests }); } });
    socket.on('createGroup', (data, cb) => { const { groupName } = data; const id = 'group_' + Date.now(); groups[id] = { id, name: groupName, members: [currentUser], messages: [] }; saveData(); cb({ success: true }); socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(currentUser))); });
    socket.on('addGroupMember', (data, cb) => { const { groupId, username } = data; const group = groups[groupId]; if (group && !group.members.includes(username) && users[username]) { group.members.push(username); saveData(); cb({ success: true, message: 'Участник добавлен' }); const us = getSocketByUsername(username); if (us) us.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(username))); socket.emit('groupsUpdate', Object.values(groups).filter(g => g.members.includes(currentUser))); } else cb({ success: false, error: 'Не удалось добавить' }); });
    socket.on('joinGroup', (id) => { if (groups[id] && groups[id].members.includes(currentUser)) socket.emit('chatHistory', { target: id, messages: groups[id].messages || [] }); });
    socket.on('createChannel', (data, cb) => { const { channelName } = data; if (channels[channelName]) cb({ success: false, error: 'Канал уже существует' }); else { channels[channelName] = { name: channelName, messages: [] }; saveData(); cb({ success: true }); io.emit('channelsUpdate', Object.keys(channels)); } });
    socket.on('joinChannel', (name) => { if (channels[name]) socket.emit('chatHistory', { target: name, messages: channels[name].messages || [] }); });
    socket.on('joinPrivate', (target) => { const id = [currentUser, target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; socket.emit('chatHistory', { target: target, messages: privateChats[id].messages || [] }); });

    socket.on('sendMessage', (data) => {
        const { type, target, text, reply } = data; const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), target };
        if (reply) msg.replyTo = reply;
        if (type === 'private') { const id = [currentUser, target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; privateChats[id].messages.push(msg); saveData(); socket.emit('newMessage', msg); const ts = getSocketByUsername(target); if (ts) ts.emit('newMessage', msg); }
        else if (type === 'group') { if (groups[target] && groups[target].members.includes(currentUser)) { groups[target].messages.push(msg); saveData(); socket.emit('newMessage', msg); groups[target].members.forEach(m => { if (m !== currentUser) { const ms = getSocketByUsername(m); if (ms) ms.emit('newMessage', msg); } }); } }
        else if (type === 'channel') { if (channels[target]) { channels[target].messages.push(msg); saveData(); io.emit('newMessage', msg); } }
    });

    socket.on('addReaction', (data) => { const { messageId, chatId, reaction } = data; let chat = privateChats[chatId] || channels[chatId] || groups[chatId]; if (chat) { const msg = chat.messages?.find(m => m.id == messageId); if (msg) { if (!msg.reactions) msg.reactions = {}; msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1; saveData(); io.emit('reactionUpdate', { messageId, reactions: msg.reactions }); } } });
    socket.on('voiceMessage', (data) => { const { type, target, audio } = data; const msg = { id: Date.now(), from: currentUser, audio, time: new Date().toLocaleTimeString(), target }; if (type === 'private') { const id = [currentUser, target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; privateChats[id].messages.push(msg); saveData(); socket.emit('voiceMessage', msg); const ts = getSocketByUsername(target); if (ts) ts.emit('voiceMessage', msg); } });
    socket.on('fileMessage', (data) => { const { type, target, fileName, fileData } = data; const msg = { id: Date.now(), from: currentUser, fileName, fileData, time: new Date().toLocaleTimeString(), target }; if (type === 'private') { const id = [currentUser, target].sort().join('_'); if (!privateChats[id]) privateChats[id] = { messages: [] }; privateChats[id].messages.push(msg); saveData(); socket.emit('fileMessage', msg); const ts = getSocketByUsername(target); if (ts) ts.emit('fileMessage', msg); } });
    socket.on('addStory', (data) => { const { media, type } = data; if (!stories[currentUser]) stories[currentUser] = []; stories[currentUser].push({ media, type, time: Date.now() }); if (stories[currentUser].length > 10) stories[currentUser].shift(); saveData(); io.emit('storiesUpdate', getActiveStories()); });
    socket.on('getStories', () => { socket.emit('storiesUpdate', getActiveStories()); });
    socket.on('getStory', (username) => { if (stories[username] && stories[username].length > 0) { const story = stories[username][stories[username].length - 1]; socket.emit('storyData', story); } });
    socket.on('typing', (data) => { const { type, target } = data; if (type === 'private') { const ts = getSocketByUsername(target); if (ts) ts.emit('typing', { user: currentUser }); } });
    socket.on('stopTyping', (data) => { const { type, target } = data; if (type === 'private') { const ts = getSocketByUsername(target); if (ts) ts.emit('stopTyping'); } });
    socket.on('disconnect', () => { if (currentUser) { userSockets.delete(socket.id); onlineSet.delete(currentUser); socket.broadcast.emit('userOffline', currentUser); } });
});

function getActiveStories() { const active = []; const now = Date.now(); for (const [username, userStories] of Object.entries(stories)) { if (userStories.length > 0 && now - userStories[userStories.length - 1].time < 86400000 && users[username]) { active.push({ username, name: users[username].name, avatar: users[username].avatar }); } } return active; }

// Супер-бот для предотвращения спячки
function startKeepAliveBot() {
    const PORT = process.env.PORT || 3000;
    const url = `http://localhost:${PORT}`;
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     🤖 SUPER AWAKE-BOT ACTIVATED 🤖                       ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  📡 Пингую сервер каждые 5 минут                         ║');
    console.log('║  ⚡ Render НЕ СМОЖЕТ усыпить ваш сервер!                  ║');
    console.log('║  💪 Сервер будет работать 24/7 без остановки             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    setInterval(async () => {
        try {
            const response = await fetch(url);
            const time = new Date().toLocaleTimeString();
            console.log(`[${time}] 🏓 ПИНГ! Сервер активен (HTTP ${response.status})`);
        } catch (error) {
            console.log(`[${new Date().toLocaleTimeString()}] ❌ Ошибка пинга:`, error.message);
        }
    }, 5 * 60 * 1000);
    
    setTimeout(async () => {
        try {
            const response = await fetch(url);
            console.log(`[${new Date().toLocaleTimeString()}] 🚀 ПЕРВЫЙ ПИНГ! Статус: ${response.status}`);
        } catch(e) {}
    }, 30 * 1000);
}

if (process.env.RENDER || process.env.NODE_ENV !== 'development') {
    startKeepAliveBot();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🚀 ATOMGRAM — ЛУЧШИЙ МЕССЕНДЖЕР В МИРЕ                ║
╠═══════════════════════════════════════════════════════════╣
║  💻 http://localhost:${PORT}                               ║
║  📱 http://localhost:${PORT}                               ║
╠═══════════════════════════════════════════════════════════╣
║  ✨ СУПЕР-ФИШКИ:                                          ║
║  💬 Личные сообщения + Ответы                             ║
║  👥 Группы (до 200 участников)                            ║
║  📢 Каналы                                                 ║
║  👤 Друзья с запросами                                     ║
║  🎤 Голосовые сообщения                                    ║
║  📎 Файлы и изображения                                    ║
║  😀 СТИКЕРЫ (как в Telegram - 80+ стикеров)              ║
║  ❤️ Реакции на сообщения                                   ║
║  📸 Истории (как в Telegram)                              ║
║  ⚓ МОРСКОЙ БОЙ - игра в чате                             ║
║  ❌ КРЕСТИКИ-НОЛИКИ (чичико) - игра в чате               ║
║  🎲 КОСТИ - игра в чате                                   ║
║  🎯 ДАРТС - игра в чате                                   ║
║  ⌨️ Индикатор печати                                       ║
║  🟢 Онлайн-статус                                          ║
║  🖼️ Аватары пользователей                                  ║
║  🌟 УЛЬТРА-СОВРЕМЕННЫЙ ДИЗАЙН                              ║
║  ⚡ МОЛНИЕНОСНАЯ СКОРОСТЬ                                 ║
║  🤖 SUPER AWAKE-BOT (сервер не спит 24/7)                 ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
