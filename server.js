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
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR);

let users = {};
let privateChats = {};
let channels = {};
let groups = {};
let stories = {};
let savedMessages = {};
let scheduledMessages = {};
let calls = {};

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = data.users || {};
            privateChats = data.privateChats || {};
            channels = data.channels || {};
            groups = data.groups || {};
            stories = data.stories || {};
            savedMessages = data.savedMessages || {};
            scheduledMessages = data.scheduledMessages || {};
            console.log('✅ Данные загружены');
        }
    } catch (e) { console.log('Ошибка загрузки:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, channels, groups, stories, savedMessages, scheduledMessages }, null, 2));
        console.log('💾 Данные сохранены');
    } catch (e) { console.log('Ошибка сохранения:', e); }
}

loadData();
setInterval(saveData, 10000);

function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
}

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ========== HTML СТРАНИЦА ==========
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0a0a0a; color: white; height: 100vh; overflow: hidden; transition: background 0.3s; }
        body.light { background: #f0f2f5; color: #1a1a2e; }
        
        body.dark .sidebar, body.dark .chat-header, body.dark .input-area { background: #1e1e2e; }
        body.light .sidebar, body.light .chat-header, body.light .input-area { background: white; }
        body.dark .message-content { background: #2a2a3e; }
        body.light .message-content { background: #e8e8ea; color: #1a1a2e; }
        body.dark .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        body.light .message.my-message .message-content { background: #667eea; color: white; }
        
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
            padding: 20px;
        }
        .auth-card {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 40px 30px;
            border-radius: 28px;
            width: 100%;
            max-width: 360px;
            text-align: center;
        }
        .auth-card h1 {
            font-size: 32px;
            margin-bottom: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .auth-card input {
            width: 100%;
            padding: 14px 16px;
            margin: 8px 0;
            border: none;
            border-radius: 14px;
            background: rgba(255,255,255,0.95);
            font-size: 16px;
        }
        .auth-card button {
            width: 100%;
            padding: 14px;
            margin-top: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        .switch-btn { background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.3) !important; }
        .error-msg { color: #ff6b6b; margin-top: 10px; font-size: 14px; }
        
        #mainApp {
            display: none;
            width: 100%;
            height: 100vh;
            position: relative;
        }
        .sidebar {
            position: fixed;
            left: -85%;
            top: 0;
            width: 85%;
            max-width: 300px;
            height: 100%;
            transition: left 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
            z-index: 100;
            display: flex;
            flex-direction: column;
            box-shadow: 2px 0 20px rgba(0,0,0,0.3);
        }
        .sidebar.open { left: 0; }
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
        .sidebar-overlay.open { display: block; }
        
        .sidebar-header {
            padding: 60px 20px 20px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
        }
        .avatar-emoji { font-size: 48px; background: #2a2a3e; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .avatar-img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: #2a2a3e; }
        .user-info h3 { font-size: 17px; font-weight: 600; }
        .user-info .username { font-size: 12px; color: #888; margin-top: 2px; }
        .menu-item { padding: 12px 20px; cursor: pointer; display: flex; align-items: center; gap: 14px; border-radius: 12px; margin: 4px 12px; transition: background 0.2s; }
        .menu-item:hover { background: rgba(102,126,234,0.1); }
        .section-title { padding: 12px 20px 8px 20px; font-size: 11px; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .friends-list, .channels-list, .groups-list {
            padding: 4px 12px;
            overflow-y: auto;
            max-height: 180px;
        }
        .friend-item, .channel-item, .group-item {
            padding: 10px 12px;
            margin: 2px 0;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: space-between;
            font-size: 15px;
            transition: background 0.2s;
        }
        .friend-item:hover, .channel-item:hover, .group-item:hover { background: rgba(102,126,234,0.1); }
        .friend-request { background: rgba(102,126,234,0.15); border-left: 3px solid #667eea; }
        .friend-actions button { margin-left: 6px; padding: 4px 10px; border-radius: 20px; border: none; cursor: pointer; font-size: 12px; font-weight: 500; }
        .accept-btn { background: #4ade80; color: white; }
        .reject-btn { background: #ff6b6b; color: white; }
        .ban-btn { background: #ff4444; color: white; }
        .create-btn { padding: 12px; display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.08); margin: 8px 12px; }
        .create-btn button { flex: 1; padding: 10px; background: rgba(255,255,255,0.08); border: 1px solid #667eea; border-radius: 14px; color: #667eea; cursor: pointer; font-size: 14px; font-weight: 500; }
        
        .chat-area {
            display: flex;
            flex-direction: column;
            height: 100vh;
            width: 100%;
        }
        .chat-header {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
        }
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 8px;
            color: inherit;
        }
        .chat-title { flex: 1; font-size: 17px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .encryption-badge {
            font-size: 11px;
            background: #4ade80;
            color: #1a1a2e;
            padding: 4px 10px;
            border-radius: 20px;
            font-weight: 500;
        }
        .settings-btn { background: none; border: none; font-size: 20px; cursor: pointer; padding: 8px; color: inherit; }
        
        .stories-area {
            padding: 12px 16px;
            display: flex;
            gap: 12px;
            overflow-x: auto;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            flex-shrink: 0;
        }
        .story-circle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
        }
        .story-circle.add {
            background: #2a2a3e;
            border: 2px solid #667eea;
        }
        .story-circle img, .story-circle .story-avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
        }
        .story-avatar { font-size: 32px; display: flex; align-items: center; justify-content: center; }
        .story-name { font-size: 11px; text-align: center; margin-top: 4px; color: #888; }
        
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            max-width: 100%;
            animation: fadeInUp 0.25s ease;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message-avatar { font-size: 34px; min-width: 40px; text-align: center; cursor: pointer; }
        .message-bubble { max-width: 75%; word-wrap: break-word; }
        .message-content { padding: 10px 14px; border-radius: 18px; position: relative; }
        .message.my-message { justify-content: flex-end; }
        .message.my-message .message-bubble { text-align: right; }
        .message-username { font-size: 12px; font-weight: 500; color: #a0a0c0; margin-bottom: 4px; cursor: pointer; }
        .message-text { font-size: 15px; line-height: 1.4; word-wrap: break-word; }
        .encrypted-badge { font-size: 10px; opacity: 0.6; margin-left: 6px; }
        .message-time { font-size: 10px; color: #888; margin-top: 4px; }
        .message-reply {
            background: rgba(102,126,234,0.15);
            padding: 6px 10px;
            border-radius: 12px;
            margin-bottom: 6px;
            font-size: 12px;
            border-left: 3px solid #667eea;
        }
        .message-reply .reply-name { font-weight: 500; color: #667eea; }
        .message-reply .reply-text { color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .message-reactions {
            display: flex;
            gap: 6px;
            margin-top: 6px;
            flex-wrap: wrap;
        }
        .reaction {
            background: rgba(102,126,234,0.2);
            border-radius: 20px;
            padding: 2px 8px;
            font-size: 12px;
            cursor: pointer;
            transition: transform 0.1s;
        }
        .reaction:hover { transform: scale(1.1); background: rgba(102,126,234,0.4); }
        
        .poll-card {
            background: rgba(102,126,234,0.1);
            border-radius: 16px;
            padding: 12px;
            margin: 8px 0;
        }
        .poll-question { font-weight: 600; margin-bottom: 8px; }
        .poll-option {
            padding: 8px 12px;
            margin: 4px 0;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .poll-option:hover { background: rgba(102,126,234,0.3); }
        .poll-vote-count { float: right; color: #888; font-size: 12px; }
        
        .voice-message { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .voice-message button { background: none; border: none; font-size: 22px; cursor: pointer; color: inherit; padding: 4px; }
        .voice-message audio { height: 38px; border-radius: 20px; max-width: 160px; }
        .video-circle { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; cursor: pointer; background: #2a2a3e; }
        .file-attachment { background: rgba(102,126,234,0.15); padding: 8px 12px; border-radius: 14px; display: flex; align-items: center; gap: 10px; font-size: 13px; }
        .file-attachment a { color: inherit; text-decoration: none; }
        .typing-indicator { font-size: 12px; color: #888; padding: 4px 16px; font-style: italic; display: flex; gap: 4px; align-items: center; }
        .typing-dot {
            width: 6px;
            height: 6px;
            background: #667eea;
            border-radius: 50%;
            animation: typingPulse 1.4s infinite;
        }
        @keyframes typingPulse {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-4px); }
        }
        
        .reply-indicator {
            background: #1e1e2e;
            padding: 8px 16px;
            border-left: 3px solid #667eea;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
        }
        body.light .reply-indicator { background: #f0f2f5; }
        .reply-indicator button { background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 16px; }
        
        .input-area {
            display: flex;
            padding: 12px 16px;
            gap: 8px;
            flex-wrap: wrap;
            flex-shrink: 0;
            border-top: 1px solid rgba(255,255,255,0.08);
        }
        .input-area input {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 28px;
            font-size: 15px;
            min-width: 100px;
            background: rgba(255,255,255,0.08);
            color: inherit;
        }
        .input-area input::placeholder { color: #888; }
        .input-area button {
            padding: 12px 18px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 28px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
        }
        .attach-btn, .voice-record-btn, .video-record-btn, .sticker-btn, .call-btn { background: rgba(255,255,255,0.08) !important; color: inherit !important; }
        .voice-record-btn.recording { animation: pulse 1s infinite; background: #ff4444 !important; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            background: #1e1e2e;
            border-radius: 24px 24px 0 0;
            padding: 16px;
            display: none;
            flex-wrap: wrap;
            gap: 12px;
            z-index: 150;
            max-height: 200px;
            overflow-y: auto;
        }
        .sticker-picker.open { display: flex; }
        .sticker { font-size: 42px; cursor: pointer; padding: 8px; border-radius: 16px; transition: transform 0.1s; }
        .sticker:active { transform: scale(1.1); }
        
        .story-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            z-index: 3000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .story-view {
            width: 100%;
            max-width: 400px;
            position: relative;
        }
        .story-view img, .story-view video {
            width: 100%;
            border-radius: 20px;
            max-height: 80vh;
            object-fit: cover;
        }
        .story-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.5);
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            width: 40px;
            height: 40px;
            border-radius: 50%;
        }
        .story-progress {
            position: absolute;
            top: 10px;
            left: 0;
            right: 0;
            height: 3px;
            background: rgba(255,255,255,0.3);
        }
        .story-progress-bar {
            height: 100%;
            background: white;
            width: 0%;
            transition: width 0.1s linear;
        }
        
        .call-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 4000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .call-video {
            width: 100%;
            max-width: 400px;
            border-radius: 20px;
            background: #000;
        }
        .call-controls {
            margin-top: 24px;
            display: flex;
            gap: 20px;
        }
        .call-controls button {
            padding: 16px;
            border-radius: 50%;
            border: none;
            font-size: 24px;
            cursor: pointer;
        }
        .end-call-btn { background: #ff4444; color: white; }
        .mute-call-btn { background: #2a2a3e; color: white; }
        
        .video-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: black;
            z-index: 3000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .video-preview { width: 100%; max-width: 300px; border-radius: 50%; overflow: hidden; }
        video { width: 100%; border-radius: 50%; }
        .video-controls { margin-top: 24px; display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .video-controls button { padding: 12px 24px; border-radius: 40px; border: none; font-size: 14px; font-weight: 500; cursor: pointer; }
        .start-record { background: #ff6b6b; color: white; }
        .stop-record { background: #ff4444; color: white; }
        .send-video { background: #4ade80; color: white; }
        .close-video { background: #666; color: white; }
        
        .notification {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #1e1e2e;
            color: white;
            padding: 12px 20px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 1000;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
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
            background: #1e1e2e;
            border-radius: 28px;
            width: 90%;
            max-width: 400px;
            max-height: 85vh;
            overflow-y: auto;
        }
        .modal-header { padding: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); position: relative; }
        .modal-header h3 { color: inherit; font-size: 18px; }
        .close-modal { position: absolute; right: 20px; top: 18px; background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }
        .profile-avatar-section { text-align: center; padding: 24px; }
        .profile-avatar-emoji { font-size: 80px; background: #2a2a3e; width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; cursor: pointer; }
        .profile-field { padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .profile-field label { display: block; font-size: 11px; color: #667eea; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; }
        .profile-field input, .profile-field textarea, .profile-field select { width: 100%; padding: 12px; background: #2a2a3e; border: none; border-radius: 14px; color: inherit; font-size: 15px; }
        .avatar-picker { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 16px; padding: 12px; background: #2a2a3e; border-radius: 24px; }
        .avatar-option { font-size: 32px; cursor: pointer; padding: 6px; border-radius: 50%; }
        .modal-footer { padding: 20px; display: flex; gap: 12px; }
        .save-btn { flex: 1; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 28px; cursor: pointer; font-size: 15px; font-weight: 600; }
        .upload-btn { flex: 1; padding: 14px; background: #2a2a3e; color: inherit; border: 1px solid #667eea; border-radius: 28px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .delete-avatar-btn { background: #ff4444; color: white; border: none; padding: 14px; border-radius: 28px; cursor: pointer; flex: 1; font-size: 14px; font-weight: 500; }
        
        @media (min-width: 768px) {
            .sidebar { position: relative; left: 0 !important; width: 300px; }
            .sidebar-overlay { display: none !important; }
            .menu-btn { display: none; }
            .message-bubble { max-width: 60%; }
            .video-circle { width: 140px; height: 140px; }
        }
        @media (max-width: 480px) {
            .message-bubble { max-width: 85%; }
            .video-circle { width: 95px; height: 95px; }
            .sticker { font-size: 38px; }
        }
    </style>
</head>
<body class="dark">
<div id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div id="authForm">
            <input type="text" id="loginUsername" placeholder="Username">
            <input type="password" id="loginPassword" placeholder="Пароль">
            <button onclick="login()">Войти</button>
            <button class="switch-btn" onclick="showRegister()">Создать аккаунт</button>
        </div>
        <div id="registerForm" style="display:none">
            <input type="text" id="regUsername" placeholder="Username">
            <input type="text" id="regName" placeholder="Имя">
            <input type="text" id="regSurname" placeholder="Фамилия">
            <input type="password" id="regPassword" placeholder="Пароль">
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
            <div id="userAvatar"><div class="avatar-emoji">👤</div></div>
            <div class="user-info">
                <h3 id="userName">Загрузка...</h3>
                <div class="username" id="userLogin">@</div>
            </div>
        </div>
        <div class="menu-item" onclick="openProfileModal()"><span>👤</span> <span>Профиль</span></div>
        <div class="menu-item" onclick="openSettingsModal()"><span>⚙️</span> <span>Настройки</span></div>
        <div class="menu-item" onclick="openSavedMessages()"><span>⭐</span> <span>Сохранённые</span></div>
        <div class="menu-item" onclick="addFriend()"><span>➕</span> <span>Добавить друга</span></div>
        <div class="menu-item" onclick="createGroup()"><span>👥</span> <span>Создать группу</span></div>
        <div class="section-title">ДРУЗЬЯ</div>
        <div class="friends-list" id="friendsList"></div>
        <div class="section-title">ГРУППЫ</div>
        <div class="groups-list" id="groupsList"></div>
        <div class="section-title">КАНАЛЫ</div>
        <div class="channels-list" id="channelsList"></div>
        <div class="create-btn">
            <button onclick="createChannel()">+ Создать канал</button>
        </div>
    </div>
    <div class="chat-area">
        <div class="chat-header">
            <button class="menu-btn" onclick="toggleSidebar()">☰</button>
            <div style="font-weight: 700; font-size: 16px;">⚡ ATOMGRAM</div>
            <div class="chat-title" id="chatTitle">Выберите чат</div>
            <div class="encryption-badge" id="encryptionBadge" style="display:none;">🔒 E2EE</div>
            <div class="header-actions" id="headerActions"></div>
            <button class="settings-btn" onclick="openSettingsModal()">⚙️</button>
        </div>
        <div class="stories-area" id="storiesArea"></div>
        <div class="messages-area" id="messages"></div>
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
            <div class="sticker" onclick="sendSticker('🎨')">🎨</div><div class="sticker" onclick="sendSticker('💩')">💩</div>
            <div class="sticker" onclick="sendSticker('🚀')">🚀</div><div class="sticker" onclick="sendSticker('✨')">✨</div>
        </div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Сообщение...">
            <button class="sticker-btn" onclick="toggleStickerPicker()">😊</button>
            <button class="attach-btn" onclick="document.getElementById('fileInput').click()">📎</button>
            <input type="file" id="fileInput" style="display:none" onchange="sendFile()">
            <button id="voiceBtn" class="voice-record-btn" onclick="toggleRecording()">🎤</button>
            <button id="videoBtn" class="video-record-btn" onclick="startVideoRecording()">🎥</button>
            <button id="storyBtn" onclick="addStory()">📸</button>
            <button id="callBtn" class="call-btn" onclick="startCall()" style="display:none">📞</button>
            <button onclick="sendMessage()">📤</button>
        </div>
    </div>
</div>

<div id="profileModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Профиль</h3><button class="close-modal" onclick="closeProfileModal()">✕</button></div>
        <div class="profile-avatar-section">
            <div id="profileAvatar"><div class="profile-avatar-emoji">👤</div></div>
            <div id="avatarPicker" class="avatar-picker" style="display:none;">
                <div class="avatar-option" onclick="selectAvatar('😀')">😀</div><div class="avatar-option" onclick="selectAvatar('😎')">😎</div>
                <div class="avatar-option" onclick="selectAvatar('👨')">👨</div><div class="avatar-option" onclick="selectAvatar('👩')">👩</div>
                <div class="avatar-option" onclick="selectAvatar('🦸')">🦸</div><div class="avatar-option" onclick="selectAvatar('🐱')">🐱</div>
                <div class="avatar-option" onclick="selectAvatar('🐶')">🐶</div><div class="avatar-option" onclick="selectAvatar('🚀')">🚀</div>
            </div>
            <input type="file" id="avatarUpload" style="display:none" accept="image/*" onchange="uploadAvatar()">
        </div>
        <div class="profile-field"><label>Имя</label><input type="text" id="editName"></div>
        <div class="profile-field"><label>Фамилия</label><input type="text" id="editSurname"></div>
        <div class="profile-field"><label>О себе</label><textarea id="editBio" rows="2"></textarea></div>
        <div class="profile-field"><label>Новый пароль</label><input type="password" id="editPassword" placeholder="Оставьте пустым"></div>
        <div class="modal-footer">
            <button class="upload-btn" onclick="document.getElementById('avatarUpload').click()">📷 Фото</button>
            <button class="delete-avatar-btn" onclick="deleteAvatar()">🗑️ Удалить</button>
            <button class="save-btn" onclick="saveProfile()">Сохранить</button>
        </div>
    </div>
</div>

<div id="settingsModal" class="modal" style="display:none">
    <div class="modal-content">
        <div class="modal-header"><h3>Настройки</h3><button class="close-modal" onclick="closeSettingsModal()">✕</button></div>
        <div class="profile-field"><label>🌓 Тема</label><select id="themeSelect" onchange="applyTheme()"><option value="dark">Тёмная</option><option value="light">Светлая</option></select></div>
        <div class="profile-field"><label>🎨 Фон чата</label><select id="chatBgSelect" onchange="applyChatBg()"><option value="#0a0a0a">Тёмный</option><option value="#f0f2f5">Светлый</option><option value="linear-gradient(135deg, #1a4a2a 0%, #0a2a1a 100%)">Лес</option><option value="linear-gradient(135deg, #0a2a4a 0%, #001a3a 100%)">Океан</option><option value="radial-gradient(circle at 20% 30%, #1a0a3a, #0a0a1a)">Космос</option></select></div>
        <div class="profile-field"><label>💬 Мои сообщения</label><input type="color" id="myMsgColor" value="#667eea" onchange="applyMsgColor()"></div>
        <div class="profile-field"><label>💭 Чужие сообщения</label><input type="color" id="otherMsgColor" value="#2a2a3e" onchange="applyMsgColor()"></div>
        <div class="profile-field"><label>📏 Размер шрифта</label><select id="fontSizeSelect" onchange="applyFontSize()"><option value="13px">Маленький</option><option value="15px" selected>Средний</option><option value="17px">Большой</option></select></div>
        <div class="profile-field"><label>🔊 Уведомления</label><select id="soundSelect" onchange="applySound()"><option value="on">Вкл</option><option value="off">Выкл</option></select></div>
        <div class="profile-field"><label>🔕 Режим не беспокоить</label><select id="dndSelect" onchange="setDND()"><option value="off">Выкл</option><option value="on">Вкл</option></select></div>
        <div class="modal-footer"><button class="save-btn" onclick="saveSettings()">Сохранить</button></div>
    </div>
</div>

<div id="storyModal" class="story-modal" style="display:none">
    <div class="story-view">
        <div class="story-progress"><div class="story-progress-bar" id="storyProgress"></div></div>
        <img id="storyImage" style="display:none">
        <video id="storyVideo" style="display:none" autoplay muted></video>
        <button class="story-close" onclick="closeStoryModal()">✕</button>
    </div>
</div>

<div id="videoModal" class="video-modal" style="display:none">
    <div class="video-preview"><video id="videoPreview" autoplay muted playsinline></video></div>
    <div class="video-controls">
        <button id="startRecordBtn" onclick="startRecording()">🔴 Запись</button>
        <button id="stopRecordBtn" style="display:none" onclick="stopRecording()">⏹️ Стоп</button>
        <button id="sendVideoBtn" style="display:none" onclick="sendVideoCircle()">📤 Отправить</button>
        <button onclick="closeVideoModal()">❌ Закрыть</button>
    </div>
</div>

<div id="callModal" class="call-modal" style="display:none">
    <video id="remoteVideo" class="call-video" autoplay></video>
    <video id="localVideo" class="call-video" autoplay muted style="position:absolute; bottom:20px; right:20px; width:120px; height:120px; border-radius:50%; object-fit:cover;"></video>
    <div class="call-controls">
        <button class="mute-call-btn" onclick="toggleMute()">🔊</button>
        <button class="end-call-btn" onclick="endCall()">📞</button>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null, currentUserData = null;
let currentChat = null, currentChatType = null, currentChatTarget = null;
let allChannels = [], allFriends = [], friendRequests = [], bannedUsers = [], allGroups = [];
let mediaRecorder = null, audioChunks = [], isRecording = false;
let videoStream = null, videoRecorder = null, videoChunks = [];
let recordedVideoBlob = null;
let currentAudio = null;
let replyToMessage = null;
let currentStories = [];

// WebRTC для звонков
let peerConnection = null;
let localStream = null;
let isCallActive = false;

let myPrivateKey = null;
let friendsPublicKeys = {};

async function generateClientKeys() {
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
        true, ["encrypt", "decrypt"]
    );
    return keyPair;
}

async function exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
    return "-----BEGIN PUBLIC KEY-----\n" + btoa(exportedAsString).match(/.{1,64}/g).join('\n') + "\n-----END PUBLIC KEY-----";
}

async function importPublicKey(pem) {
    const binary = atob(pem.replace(/-----BEGIN PUBLIC KEY-----/, '').replace(/-----END PUBLIC KEY-----/, '').replace(/\s/g, ''));
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    return await window.crypto.subtle.importKey("spki", buffer, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}

async function encryptMessageClient(message, publicKeyPem) {
    const publicKey = await importPublicKey(publicKeyPem);
    const encoded = new TextEncoder().encode(message);
    const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encoded);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)));
}

async function decryptMessageClient(encryptedBase64, privateKey) {
    const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encrypted);
    return new TextDecoder().decode(decrypted);
}

const savedUsername = localStorage.getItem('atomgram_username');
const savedPassword = localStorage.getItem('atomgram_password');

function getLocalTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
}
function toggleStickerPicker() { document.getElementById('stickerPicker').classList.toggle('open'); }
function sendSticker(sticker) {
    if (!currentChat) { alert('Выберите чат'); return; }
    socket.emit('chat message', { type: currentChatType, target: currentChatTarget, text: sticker });
    document.getElementById('stickerPicker').classList.remove('open');
}

function renderAvatar(avatarData, avatarType, size) {
    if (avatarType === 'image' && avatarData) {
        if (size === 'large') return '<img src="' + avatarData + '" class="profile-avatar-img" style="width:120px; height:120px; border-radius:50%; object-fit:cover;">';
        return '<img src="' + avatarData + '" class="avatar-img">';
    } else {
        const emoji = avatarData || '👤';
        if (size === 'large') return '<div class="profile-avatar-emoji">' + emoji + '</div>';
        return '<div class="avatar-emoji">' + emoji + '</div>';
    }
}

// ========== ИСТОРИИ ==========
function addStory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            socket.emit('add story', { media: reader.result, type: file.type.startsWith('image/') ? 'image' : 'video' });
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function renderStories(stories) {
    const container = document.getElementById('storiesArea');
    if (!container) return;
    let html = '<div class="story-circle add" onclick="addStory()"><div class="story-avatar">+</div><div class="story-name">Моя</div></div>';
    stories.forEach(s => {
        html += `<div class="story-circle" onclick="viewStory('${s.username}')">
            <div class="story-avatar">${s.avatar || '👤'}</div>
            <div class="story-name">${s.name || s.username}</div>
        </div>`;
    });
    container.innerHTML = html;
}

function viewStory(username) {
    socket.emit('get story', username);
}

socket.on('story data', (data) => {
    if (data.media) {
        const modal = document.getElementById('storyModal');
        const img = document.getElementById('storyImage');
        const video = document.getElementById('storyVideo');
        if (data.type === 'image') {
            img.style.display = 'block';
            video.style.display = 'none';
            img.src = data.media;
        } else {
            img.style.display = 'none';
            video.style.display = 'block';
            video.src = data.media;
            video.play();
        }
        modal.style.display = 'flex';
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            document.getElementById('storyProgress').style.width = progress + '%';
            if (progress >= 100) {
                clearInterval(interval);
                closeStoryModal();
            }
        }, 100);
    }
});

function closeStoryModal() {
    document.getElementById('storyModal').style.display = 'none';
    document.getElementById('storyProgress').style.width = '0%';
    const video = document.getElementById('storyVideo');
    if (video) { video.pause(); video.src = ''; }
}

// ========== СОХРАНЁННЫЕ СООБЩЕНИЯ ==========
function openSavedMessages() {
    currentChat = 'saved';
    currentChatType = 'saved';
    currentChatTarget = 'saved';
    document.getElementById('chatTitle').innerHTML = '⭐ Сохранённые';
    document.getElementById('encryptionBadge').style.display = 'none';
    document.getElementById('headerActions').innerHTML = '';
    socket.emit('get saved messages');
}

function saveMessage(msgId, text, from) {
    socket.emit('save message', { msgId, text, from });
    showNotification('Сохранено', 'Сообщение сохранено');
}

socket.on('saved messages history', (messages) => {
    if (currentChat === 'saved') {
        const msgsDiv = document.getElementById('messages');
        msgsDiv.innerHTML = '';
        messages.forEach(m => {
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = '<div class="message-bubble"><div class="message-content"><div class="message-username">' + escape(m.from) + '</div><div class="message-text">' + escape(m.text) + '</div><div class="message-time">' + m.time + '</div></div></div>';
            msgsDiv.appendChild(div);
        });
    }
});

// ========== ОТВЕТЫ НА СООБЩЕНИЯ ==========
function setReply(msgId, from, text) {
    replyToMessage = { id: msgId, from: from, text: text.substring(0, 50) };
    document.getElementById('replyPreview').innerHTML = '📎 Ответ ' + from + ': ' + text.substring(0, 40);
    document.getElementById('replyIndicator').style.display = 'flex';
}
function cancelReply() {
    replyToMessage = null;
    document.getElementById('replyIndicator').style.display = 'none';
}

// ========== РЕАКЦИИ ==========
function addReaction(messageId, reaction) {
    socket.emit('add reaction', { messageId, chatId: currentChatTarget, reaction });
}

// ========== ОПРОСЫ ==========
function createPoll() {
    const question = prompt('Вопрос для опроса:');
    if (!question) return;
    const options = prompt('Варианты ответов (через запятую):');
    if (!options) return;
    const optionsArray = options.split(',').map(o => o.trim());
    socket.emit('create poll', { chatId: currentChatTarget, question, options: optionsArray, isAnonymous: false });
}

// ========== ГРУППЫ ==========
function createGroup() {
    const groupName = prompt('Название группы:');
    if (!groupName) return;
    const members = prompt('Участники (username через запятую):');
    const memberList = members ? members.split(',').map(m => m.trim()) : [];
    socket.emit('create group', { groupName, memberUsernames: memberList });
}

function joinGroup(groupId) {
    currentChat = 'group:' + groupId;
    currentChatType = 'group';
    currentChatTarget = groupId;
    socket.emit('join group', groupId);
    const group = allGroups.find(g => g.id === groupId);
    document.getElementById('chatTitle').innerHTML = '👥 ' + (group ? group.name : groupId);
    document.getElementById('encryptionBadge').style.display = 'none';
    renderAll();
}

// ========== ЗВОНКИ (WebRTC) ==========
async function startCall() {
    if (!currentChatTarget || currentChatType !== 'private') {
        alert('Звонки доступны только в личных чатах');
        return;
    }
    
    document.getElementById('callModal').style.display = 'flex';
    isCallActive = true;
    
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    peerConnection = new RTCPeerConnection(configuration);
    
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    document.getElementById('localVideo').srcObject = localStream;
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice candidate', { targetUserId: currentChatTarget, candidate: event.candidate });
        }
    };
    
    peerConnection.ontrack = (event) => {
        document.getElementById('remoteVideo').srcObject = event.streams[0];
    };
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('call user', { targetUserId: currentChatTarget, offer: offer });
}

function endCall() {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    isCallActive = false;
    document.getElementById('callModal').style.display = 'none';
    socket.emit('end call', currentChatTarget);
}

function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const muteBtn = document.querySelector('.mute-call-btn');
            muteBtn.innerHTML = audioTrack.enabled ? '🔊' : '🔇';
        }
    }
}

socket.on('incoming call', async (data) => {
    const accept = confirm(`📞 Входящий звонок от ${data.from}. Принять?`);
    if (accept) {
        document.getElementById('callModal').style.display = 'flex';
        isCallActive = true;
        
        const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        peerConnection = new RTCPeerConnection(configuration);
        
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        document.getElementById('localVideo').srcObject = localStream;
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice candidate', { targetUserId: data.from, candidate: event.candidate });
            }
        };
        
        peerConnection.ontrack = (event) => {
            document.getElementById('remoteVideo').srcObject = event.streams[0];
        };
        
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer call', { targetUserId: data.from, answer: answer });
    } else {
        socket.emit('end call', data.from);
    }
});

socket.on('call answered', async (data) => {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
});

socket.on('ice candidate', (data) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

socket.on('call ended', () => {
    endCall();
    showNotification('Звонок завершён', '');
});

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========
function createChannel() {
    const name = prompt('Название канала:');
    if (!name) return;
    socket.emit('create channel', { channelName: name }, (res) => { if (res.success) { loadData(); alert('Канал создан'); } else alert(res.error); });
}
function joinChannel(name) {
    currentChat = 'channel:' + name; currentChatType = 'channel'; currentChatTarget = name;
    socket.emit('joinChannel', name);
    document.getElementById('chatTitle').innerHTML = '# ' + name;
    document.getElementById('encryptionBadge').style.display = 'none';
    document.getElementById('headerActions').innerHTML = '<button class="header-btn" onclick="createPoll()"><i class="fas fa-poll"></i></button>';
    renderAll();
}
function startPrivateChat(user) {
    currentChat = 'user:' + user; currentChatType = 'private'; currentChatTarget = user;
    socket.emit('joinPrivate', user);
    document.getElementById('chatTitle').innerHTML = user;
    document.getElementById('encryptionBadge').style.display = 'inline-block';
    document.getElementById('headerActions').innerHTML = '<button class="header-btn" onclick="startCall()"><i class="fas fa-phone"></i></button><button class="header-btn" onclick="createPoll()"><i class="fas fa-poll"></i></button>';
    renderAll();
}
function renderAll() {
    const cl = document.getElementById('channelsList');
    cl.innerHTML = allChannels.map(c => '<div class="channel-item" onclick="joinChannel(\\'' + c + '\\')">📢 ' + c + '</div>').join('');
    
    const gl = document.getElementById('groupsList');
    gl.innerHTML = allGroups.map(g => '<div class="group-item" onclick="joinGroup(\\'' + g.id + '\\')">👥 ' + g.name + '</div>').join('');
    
    let fl = '';
    friendRequests.forEach(req => { fl += '<div class="friend-item friend-request"><span>👤 ' + req + '</span><div class="friend-actions"><button class="accept-btn" onclick="acceptFriend(\\'' + req + '\\')">✅</button><button class="reject-btn" onclick="rejectFriend(\\'' + req + '\\')">❌</button></div></div>'; });
    allFriends.forEach(f => { fl += '<div class="friend-item" onclick="startPrivateChat(\\'' + f + '\\')"><span>👤 ' + f + '</span><button class="ban-btn" onclick="event.stopPropagation(); banUser(\\'' + f + '\\')">🚫</button></div>'; });
    bannedUsers.forEach(b => { fl += '<div class="friend-item" style="opacity:0.6;"><span>👤 ' + b + ' (забанен)</span><button class="accept-btn" onclick="unbanUser(\\'' + b + '\\')">🔓</button></div>'; });
    document.getElementById('friendsList').innerHTML = fl || '<div style="padding:12px; text-align:center; color:#888;">Нет друзей</div>';
}
function addFriend() {
    const u = prompt('Введите username друга:');
    if (!u) return;
    socket.emit('add friend', { friendUsername: u }, (res) => { alert(res.message || res.error); });
}
function acceptFriend(from) { socket.emit('accept friend', { fromUser: from }); }
function rejectFriend(from) { socket.emit('reject friend', { fromUser: from }); }
function banUser(u) { if (confirm('Забанить пользователя ' + u + '?')) socket.emit('ban user', { userToBan: u }); }
function unbanUser(u) { socket.emit('unban user', { userToUnban: u }); }
async function sendMessage() {
    const input = document.getElementById('messageInput');
    let text = input.value.trim();
    if (!text || !currentChat) return;
    
    let encryptedText = text;
    let isEncrypted = false;
    
    if (currentChatType === 'private') {
        const friendPublicKey = friendsPublicKeys[currentChatTarget];
        if (friendPublicKey) {
            encryptedText = await encryptMessageClient(text, friendPublicKey);
            isEncrypted = true;
        }
    }
    
    const reply = replyToMessage;
    cancelReply();
    
    socket.emit('chat message', { type: currentChatType, target: currentChatTarget, text: encryptedText, encrypted: isEncrypted, reply: reply });
    input.value = '';
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
if (Notification.permission === 'default') Notification.requestPermission();

async function startVideoRecording() {
    document.getElementById('videoModal').style.display = 'flex';
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('videoPreview').srcObject = videoStream;
    } catch(e) { alert('Нет доступа к камере'); closeVideoModal(); }
}
function startRecording() {
    videoChunks = [];
    videoRecorder = new MediaRecorder(videoStream);
    videoRecorder.ondataavailable = e => videoChunks.push(e.data);
    videoRecorder.onstop = () => {
        recordedVideoBlob = new Blob(videoChunks, { type: 'video/mp4' });
        document.getElementById('sendVideoBtn').style.display = 'inline-block';
        document.getElementById('startRecordBtn').style.display = 'none';
        document.getElementById('stopRecordBtn').style.display = 'none';
    };
    videoRecorder.start();
    document.getElementById('startRecordBtn').style.display = 'none';
    document.getElementById('stopRecordBtn').style.display = 'inline-block';
}
function stopRecording() { if (videoRecorder) videoRecorder.stop(); }
function sendVideoCircle() {
    if (!recordedVideoBlob || !currentChat) { alert('Выберите чат'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('video circle', { type: currentChatType, target: currentChatTarget, video: reader.result });
        closeVideoModal();
    };
    reader.readAsDataURL(recordedVideoBlob);
}
function closeVideoModal() {
    document.getElementById('videoModal').style.display = 'none';
    if (videoStream) videoStream.getTracks().forEach(t => t.stop());
    recordedVideoBlob = null;
    document.getElementById('startRecordBtn').style.display = 'inline-block';
    document.getElementById('stopRecordBtn').style.display = 'none';
    document.getElementById('sendVideoBtn').style.display = 'none';
}

function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file || !currentChat) return;
    const reader = new FileReader();
    reader.onloadend = () => { socket.emit('file attachment', { type: currentChatType, target: currentChatTarget, fileName: file.name, fileType: file.type, fileData: reader.result }); };
    reader.readAsDataURL(file);
}

async function toggleRecording() {
    if (isRecording) { stopRecordingAudio(); } else { startRecordingAudio(); }
}
async function startRecordingAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => socket.emit('voice message', { type: currentChatType, target: currentChatTarget, audio: reader.result });
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        document.getElementById('voiceBtn').classList.add('recording');
        document.getElementById('voiceBtn').innerHTML = '⏹️';
    } catch(e) { alert('Нет доступа к микрофону'); }
}
function stopRecordingAudio() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('voiceBtn').classList.remove('recording');
        document.getElementById('voiceBtn').innerHTML = '🎤';
    }
}
function playAudio(btn) {
    if (currentAudio && !currentAudio.paused) { currentAudio.pause(); btn.innerHTML = '▶️'; }
    currentAudio = new Audio(btn.getAttribute('data-audio'));
    currentAudio.play();
    btn.innerHTML = '⏸️';
    currentAudio.onended = () => { btn.innerHTML = '▶️'; };
}

function openProfileModal() {
    document.getElementById('editName').value = currentUserData?.name || '';
    document.getElementById('editSurname').value = currentUserData?.surname || '';
    document.getElementById('editBio').value = currentUserData?.bio || '';
    document.getElementById('editPassword').value = '';
    document.getElementById('profileAvatar').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType, 'large');
    document.getElementById('profileModal').style.display = 'flex';
}
function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; document.getElementById('avatarPicker').style.display = 'none'; }
function toggleAvatarPicker() { const p = document.getElementById('avatarPicker'); p.style.display = p.style.display === 'none' ? 'flex' : 'none'; }
let selectedAvatar = '👤';
function selectAvatar(avatar) { selectedAvatar = avatar; document.getElementById('profileAvatar').innerHTML = '<div class="profile-avatar-emoji">' + avatar + '</div>'; document.getElementById('avatarPicker').style.display = 'none'; }
function uploadAvatar() {
    const file = document.getElementById('avatarUpload').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { socket.emit('upload avatar', { login: currentUser, avatarData: reader.result }, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); alert('Аватар загружен'); closeProfileModal(); } }); };
    reader.readAsDataURL(file);
}
function deleteAvatar() {
    if (confirm('Удалить фото аватара?')) {
        socket.emit('delete avatar', { login: currentUser }, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); alert('Аватар удалён'); closeProfileModal(); } });
    }
}
function saveProfile() {
    const data = { login: currentUser, name: document.getElementById('editName').value.trim(), surname: document.getElementById('editSurname').value.trim(), bio: document.getElementById('editBio').value.trim() };
    const newPass = document.getElementById('editPassword').value.trim();
    if (newPass) data.password = newPass;
    if (selectedAvatar !== currentUserData?.avatar) { data.avatar = selectedAvatar; data.avatarType = 'emoji'; }
    socket.emit('update profile', data, (res) => { if (res.success) { currentUserData = res.userData; updateUI(); closeProfileModal(); alert('Сохранено'); } else alert(res.error); });
}
function updateUI() {
    const name = (currentUserData?.name + ' ' + (currentUserData?.surname || '')).trim() || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
    document.getElementById('userAvatar').innerHTML = renderAvatar(currentUserData?.avatarData, currentUserData?.avatarType);
}

function applyTheme() {
    const theme = document.getElementById('themeSelect').value;
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
    localStorage.setItem('atomgram_theme', theme);
}
function applyChatBg() {
    const bg = document.getElementById('chatBgSelect').value;
    document.querySelector('.messages-area').style.background = bg;
    document.querySelector('.messages-area').style.backgroundSize = 'cover';
    localStorage.setItem('atomgram_chatBg', bg);
}
function applyMsgColor() {
    const myColor = document.getElementById('myMsgColor').value;
    const otherColor = document.getElementById('otherMsgColor').value;
    let style = document.getElementById('msgColorStyle');
    if (!style) { style = document.createElement('style'); style.id = 'msgColorStyle'; document.head.appendChild(style); }
    style.innerHTML = `.message.my-message .message-content { background: ${myColor} !important; }
        .message:not(.my-message) .message-content { background: ${otherColor} !important; }`;
    localStorage.setItem('atomgram_myMsgColor', myColor);
    localStorage.setItem('atomgram_otherMsgColor', otherColor);
}
function applyFontSize() {
    const size = document.getElementById('fontSizeSelect').value;
    let style = document.getElementById('fontSizeStyle');
    if (!style) { style = document.createElement('style'); style.id = 'fontSizeStyle'; document.head.appendChild(style); }
    style.innerHTML = `.message-text { font-size: ${size} !important; }`;
    localStorage.setItem('atomgram_fontSize', size);
}
function applySound() {
    const sound = document.getElementById('soundSelect').value;
    localStorage.setItem('atomgram_sound', sound);
}
function setDND() {
    const enabled = document.getElementById('dndSelect').value === 'on';
    socket.emit('set dnd', { enabled, until: enabled ? Date.now() + 3600000 : null });
}
function saveSettings() {
    applyTheme(); applyChatBg(); applyMsgColor(); applyFontSize(); applySound(); setDND();
    closeSettingsModal();
    alert('Настройки сохранены');
}
function openSettingsModal() {
    document.getElementById('themeSelect').value = document.body.classList.contains('light') ? 'light' : 'dark';
    document.getElementById('chatBgSelect').value = localStorage.getItem('atomgram_chatBg') || '#0a0a0a';
    document.getElementById('myMsgColor').value = localStorage.getItem('atomgram_myMsgColor') || '#667eea';
    document.getElementById('otherMsgColor').value = localStorage.getItem('atomgram_otherMsgColor') || '#2a2a3e';
    document.getElementById('fontSizeSelect').value = localStorage.getItem('atomgram_fontSize') || '15px';
    document.getElementById('soundSelect').value = localStorage.getItem('atomgram_sound') || 'on';
    document.getElementById('dndSelect').value = 'off';
    document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettingsModal() { document.getElementById('settingsModal').style.display = 'none'; }
function applySavedSettings() {
    const bg = localStorage.getItem('atomgram_chatBg');
    if (bg) { document.querySelector('.messages-area').style.background = bg; document.querySelector('.messages-area').style.backgroundSize = 'cover'; }
    const myColor = localStorage.getItem('atomgram_myMsgColor');
    const otherColor = localStorage.getItem('atomgram_otherMsgColor');
    if (myColor || otherColor) {
        let style = document.getElementById('msgColorStyle');
        if (!style) { style = document.createElement('style'); style.id = 'msgColorStyle'; document.head.appendChild(style); }
        style.innerHTML = `.message.my-message .message-content { background: ${myColor || '#667eea'} !important; }
            .message:not(.my-message) .message-content { background: ${otherColor || '#2a2a3e'} !important; }`;
    }
    const fontSize = localStorage.getItem('atomgram_fontSize');
    if (fontSize) {
        let style = document.getElementById('fontSizeStyle');
        if (!style) { style = document.createElement('style'); style.id = 'fontSizeStyle'; document.head.appendChild(style); }
        style.innerHTML = `.message-text { font-size: ${fontSize} !important; }`;
    }
}

function login() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('login', { username: u, password: p }, async (res) => {
        if (res.success) {
            currentUser = u;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_username', u);
            localStorage.setItem('atomgram_password', p);
            
            const keyPair = await generateClientKeys();
            const publicKeyPem = await exportPublicKey(keyPair.publicKey);
            myPrivateKey = keyPair.privateKey;
            socket.emit('save public key', { publicKey: publicKeyPem });
            
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI(); loadData();
            applySavedSettings();
            socket.emit('getPublicKeys', (keys) => { friendsPublicKeys = keys; });
            socket.emit('get stories');
        } else document.getElementById('authError').innerText = res.error;
    });
}
function register() {
    const u = document.getElementById('regUsername').value.trim();
    const n = document.getElementById('regName').value.trim();
    const s = document.getElementById('regSurname').value.trim();
    const p = document.getElementById('regPassword').value.trim();
    if (!u || !p) { document.getElementById('authError').innerText = 'Заполните поля'; return; }
    socket.emit('register', { username: u, name: n, surname: s, password: p }, (res) => {
        if (res.success) { document.getElementById('authError').innerText = '✅ Регистрация успешна! Войдите.'; showLogin(); }
        else document.getElementById('authError').innerText = res.error;
    });
}
function showRegister() { document.getElementById('authForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; document.getElementById('authError').innerText = ''; }
function showLogin() { document.getElementById('authForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; document.getElementById('authError').innerText = ''; }
if (savedUsername && savedPassword) { document.getElementById('loginUsername').value = savedUsername; document.getElementById('loginPassword').value = savedPassword; setTimeout(login, 100); }
function loadData() {
    socket.emit('getFriends', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; bannedUsers = d.banned || []; renderAll(); });
    socket.emit('getChannels', (c) => { allChannels = c; renderAll(); });
    socket.emit('getGroups', (g) => { allGroups = g; renderAll(); });
    socket.emit('get stories');
}
socket.on('friends update', (d) => { allFriends = d.friends || []; friendRequests = d.requests || []; bannedUsers = d.banned || []; renderAll(); });
socket.on('channels update', (c) => { allChannels = c; renderAll(); });
socket.on('groups update', (g) => { allGroups = g; renderAll(); });
socket.on('public keys update', (keys) => { friendsPublicKeys = keys; });
socket.on('stories update', (stories) => { renderStories(stories); });
socket.on('typing indicator', (data) => {
    if (currentChatTarget === data.user || currentChatTarget === data.channel) {
        const indicator = document.getElementById('typingIndicator');
        const textSpan = document.getElementById('typingText');
        textSpan.innerHTML = data.user + ' печатает...';
        indicator.style.display = 'flex';
        setTimeout(() => indicator.style.display = 'none', 1500);
    }
});
socket.on('chat history', async (data) => {
    if ((currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget) ||
        (currentChatType === 'channel' && data.type === 'channel' && data.channel === currentChatTarget) ||
        (currentChatType === 'group' && data.type === 'group' && data.groupId === currentChatTarget)) {
        document.getElementById('messages').innerHTML = '';
        for (const m of data.messages) {
            await addMessage(m);
        }
    }
});
socket.on('chat message', async (msg) => {
    let show = false;
    if (msg.type === 'private' && currentChatType === 'private' && (msg.to === currentChatTarget || msg.from === currentChatTarget)) show = true;
    if (msg.type === 'channel' && currentChatType === 'channel' && msg.channel === currentChatTarget) show = true;
    if (msg.type === 'group' && currentChatType === 'group' && msg.groupId === currentChatTarget) show = true;
    if (show) { await addMessage(msg); document.getElementById('messages').scrollTop = 9999; }
    if (msg.from !== currentUser && localStorage.getItem('atomgram_sound') !== 'off') {
        const audio = new Audio();
        audio.play().catch(e => console.log('Звук не воспроизведён'));
    }
});
socket.on('voice message', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVoiceMessage(data);
    }
});
socket.on('video circle', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addVideoMessage(data);
    }
});
socket.on('file attachment', (data) => {
    if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) {
        addFileMessage(data);
    }
});
socket.on('new poll', (data) => {
    if (currentChatTarget === data.chatId) {
        addPollMessage(data.poll);
    }
});
socket.on('reaction updated', (data) => {
    const messageDiv = document.querySelector(`.message[data-id="${data.messageId}"]`);
    if (messageDiv) {
        let reactionsDiv = messageDiv.querySelector('.message-reactions');
        if (!reactionsDiv) {
            reactionsDiv = document.createElement('div');
            reactionsDiv.className = 'message-reactions';
            messageDiv.querySelector('.message-content').appendChild(reactionsDiv);
        }
        reactionsDiv.innerHTML = '';
        for (const [reaction, count] of Object.entries(data.reactions)) {
            const reactionSpan = document.createElement('span');
            reactionSpan.className = 'reaction';
            reactionSpan.innerHTML = reaction + ' ' + count;
            reactionSpan.onclick = () => addReaction(data.messageId, reaction);
            reactionsDiv.appendChild(reactionSpan);
        }
    }
});

function addPollMessage(poll) {
    const div = document.createElement('div');
    div.className = 'message';
    if (poll.createdBy === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar">📊</div>' +
        '<div class="message-bubble"><div class="message-content">' +
        '<div class="poll-card">' +
        '<div class="poll-question">📊 ' + escape(poll.question) + '</div>' +
        poll.options.map((opt, idx) => '<div class="poll-option" onclick="votePoll(' + poll.id + ', ' + idx + ')">' + escape(opt.text) + '<span class="poll-vote-count">' + opt.votes.length + ' голосов</span></div>').join('') +
        '</div>' +
        '<div class="message-time">' + getLocalTime() + '</div>' +
        '</div></div>';
    document.getElementById('messages').appendChild(div);
}

function votePoll(pollId, optionIndex) {
    socket.emit('vote poll', { chatId: currentChatTarget, pollId, optionIndex });
}

async function addMessage(m) {
    const div = document.createElement('div');
    div.className = 'message';
    div.setAttribute('data-id', m.id);
    if (m.from === currentUser) div.classList.add('my-message');
    
    let messageText = m.text;
    let encryptedBadge = '';
    let replyHtml = '';
    
    if (m.replyTo) {
        replyHtml = `<div class="message-reply"><div class="reply-name">↩️ Ответ ${m.replyTo.from}</div><div class="reply-text">${escape(m.replyTo.text)}</div></div>`;
    }
    
    if (m.encrypted && m.from !== currentUser && currentChatType === 'private') {
        try {
            if (myPrivateKey) {
                messageText = await decryptMessageClient(m.text, myPrivateKey);
                encryptedBadge = '<span class="encrypted-badge">🔓</span>';
            } else {
                messageText = '🔒 Зашифрованное сообщение';
                encryptedBadge = '<span class="encrypted-badge">🔒</span>';
            }
        } catch(e) {
            messageText = '🔒 Зашифрованное сообщение';
            encryptedBadge = '<span class="encrypted-badge">🔒</span>';
        }
    } else if (m.encrypted && m.from === currentUser) {
        encryptedBadge = '<span class="encrypted-badge">🔒</span>';
    }
    
    let reactionsHtml = '';
    if (m.reactions) {
        reactionsHtml = '<div class="message-reactions">';
        for (const [reaction, count] of Object.entries(m.reactions)) {
            reactionsHtml += `<span class="reaction" onclick="addReaction('${m.id}', '${reaction}')">${reaction} ${count}</span>`;
        }
        reactionsHtml += '</div>';
    }
    
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + m.from + '\')">👤</div>' +
        '<div class="message-bubble"><div class="message-content">' + replyHtml +
        '<div class="message-username" onclick="viewUserProfile(\'' + m.from + '\')">' + escape(m.from) + '</div>' +
        '<div class="message-text" ondblclick="setReply(' + m.id + ', \'' + escape(m.from) + '\', \'' + escape(messageText) + '\')">' + escape(messageText) + encryptedBadge + '</div>' +
        reactionsHtml +
        '<div class="message-time">' + (m.time || getLocalTime()) + '</div>' +
        '<div style="display:flex; gap:8px; margin-top:4px;"><button onclick="saveMessage(' + m.id + ', \'' + escape(messageText) + '\', \'' + escape(m.from) + '\')" style="background:none; border:none; color:#888; cursor:pointer;">⭐ Сохранить</button>' +
        '<button onclick="addReaction(' + m.id + ', \'❤️\')" style="background:none; border:none; color:#888; cursor:pointer;">❤️</button>' +
        '<button onclick="addReaction(' + m.id + ', \'👍\')" style="background:none; border:none; color:#888; cursor:pointer;">👍</button>' +
        '<button onclick="addReaction(' + m.id + ', \'😂\')" style="background:none; border:none; color:#888; cursor:pointer;">😂</button></div>' +
        '</div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVoiceMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + d.from + '\')">👤</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\'' + d.from + '\')">' + escape(d.from) + '</div>' +
        '<div class="voice-message"><button onclick="playAudio(this)" data-audio="' + d.audio + '">▶️</button><span>Голосовое</span></div>' +
        '<div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addVideoMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + d.from + '\')">👤</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\'' + d.from + '\')">' + escape(d.from) + '</div>' +
        '<video class="video-circle" controls autoplay loop src="' + d.video + '"></video>' +
        '<div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function addFileMessage(d) {
    const div = document.createElement('div');
    div.className = 'message';
    if (d.from === currentUser) div.classList.add('my-message');
    const icon = d.fileType?.startsWith('image/') ? '🖼️' : '📄';
    div.innerHTML = '<div class="message-avatar" onclick="viewUserProfile(\'' + d.from + '\')">👤</div>' +
        '<div class="message-bubble"><div class="message-content"><div class="message-username" onclick="viewUserProfile(\'' + d.from + '\')">' + escape(d.from) + '</div>' +
        '<div class="file-attachment"><span>' + icon + '</span><a href="' + d.fileData + '" download="' + d.fileName + '">' + d.fileName + '</a></div>' +
        '<div class="message-time">' + (d.time || getLocalTime()) + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
}
function viewUserProfile(username) {
    socket.emit('getUserProfile', username, (profile) => {
        if (profile) {
            alert('👤 ' + (profile.name || username) + '\n📝 ' + (profile.bio || 'Нет описания'));
        }
    });
}

let typingTimeout;
document.getElementById('messageInput').addEventListener('input', () => {
    if (currentChatTarget) {
        socket.emit('typing', { type: currentChatType, target: currentChatTarget, isTyping: true });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing', { type: currentChatType, target: currentChatTarget, isTyping: false });
        }, 1000);
    }
});

function escape(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ (СЕРВЕР) ==========
const usersOnline = new Map();
const userPublicKeys = {};

function getSocketByUsername(username) {
    for (const [id, user] of usersOnline.entries()) {
        if (user === username) return io.sockets.sockets.get(id);
    }
    return null;
}

function sendProfileList() {
    io.emit('users list with profiles', Object.keys(users).map(l => users[l]));
}

function getActiveStories() {
    const activeStories = [];
    const now = Date.now();
    for (const [username, userStories] of Object.entries(stories)) {
        if (userStories && userStories.length > 0 && users[username]) {
            const latestStory = userStories[userStories.length - 1];
            if (now - latestStory.time < 86400000) {
                activeStories.push({
                    username,
                    name: users[username]?.name || username,
                    avatar: users[username]?.avatar
                });
            }
        }
    }
    return activeStories;
}

function sendStoriesToUser(socket) {
    socket.emit('stories update', getActiveStories());
}

io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('register', (data, cb) => {
        const { username, name, surname, password } = data;
        if (users[username]) cb({ success: false, error: 'Username занят' });
        else {
            users[username] = { username, password, name: name || '', surname: surname || '', bio: '', avatar: '👤', avatarType: 'emoji', avatarData: null, friends: [], friendRequests: [], banned: [] };
            saveData();
            cb({ success: true });
            sendProfileList();
        }
    });

    socket.on('login', (data, cb) => {
        const { username, password } = data;
        if (!users[username]) cb({ success: false, error: 'Пользователь не найден' });
        else if (users[username].password !== password) cb({ success: false, error: 'Неверный пароль' });
        else {
            currentUser = username;
            usersOnline.set(socket.id, username);
            cb({ success: true, userData: users[username] });
            socket.emit('friends update', { friends: users[username].friends || [], requests: users[username].friendRequests || [], banned: users[username].banned || [] });
            socket.emit('public keys update', userPublicKeys);
            socket.emit('groups update', Object.values(groups).filter(g => g.members.includes(username)));
            sendProfileList();
            sendStoriesToUser(socket);
            socket.emit('channels update', Object.keys(channels));
        }
    });

    socket.on('save public key', (data) => {
        const { publicKey } = data;
        if (currentUser && publicKey) {
            userPublicKeys[currentUser] = publicKey;
            if (users[currentUser]) users[currentUser].publicKey = publicKey;
            saveData();
            io.emit('public keys update', userPublicKeys);
        }
    });

    socket.on('getPublicKeys', (cb) => { cb(userPublicKeys); });

    // ГРУППЫ
    socket.on('create group', (data, cb) => {
        const { groupName, memberUsernames } = data;
        const groupId = 'group_' + Date.now();
        const members = [currentUser, ...(memberUsernames || [])];
        groups[groupId] = {
            id: groupId,
            name: groupName,
            members: members,
            admins: [currentUser],
            messages: [],
            createdAt: Date.now()
        };
        saveData();
        cb({ success: true, groupId });
        members.forEach(m => {
            const memberSocket = getSocketByUsername(m);
            if (memberSocket) {
                memberSocket.emit('groups update', Object.values(groups).filter(g => g.members.includes(m)));
            }
        });
    });

    socket.on('join group', (groupId, cb) => {
        if (groups[groupId]) {
            if (!groups[groupId].members.includes(currentUser)) {
                groups[groupId].members.push(currentUser);
                saveData();
            }
            socket.emit('chat history', { type: 'group', groupId, messages: groups[groupId].messages || [] });
            if (cb) cb({ success: true });
        } else if (cb) cb({ success: false });
    });

    socket.on('getGroups', (cb) => {
        cb(Object.values(groups).filter(g => g.members.includes(currentUser)));
    });

    // РЕАКЦИИ
    socket.on('add reaction', (data) => {
        const { messageId, chatId, reaction } = data;
        let chat = privateChats[chatId] || channels[chatId] || groups[chatId];
        if (chat) {
            const message = chat.messages?.find(m => m.id == messageId);
            if (message) {
                if (!message.reactions) message.reactions = {};
                message.reactions[reaction] = (message.reactions[reaction] || 0) + 1;
                saveData();
                io.emit('reaction updated', { messageId, chatId, reactions: message.reactions });
            }
        }
    });

    // ОПРОСЫ
    socket.on('create poll', (data) => {
        const { chatId, question, options, isAnonymous } = data;
        const poll = {
            id: Date.now(),
            question,
            options: options.map(opt => ({ text: opt, votes: [] })),
            isAnonymous: isAnonymous || false,
            createdBy: currentUser,
            createdAt: Date.now()
        };
        let chat = privateChats[chatId] || channels[chatId] || groups[chatId];
        if (chat) {
            if (!chat.polls) chat.polls = [];
            chat.polls.push(poll);
            saveData();
            io.emit('new poll', { chatId, poll });
        }
    });

    socket.on('vote poll', (data) => {
        const { chatId, pollId, optionIndex } = data;
        let chat = privateChats[chatId] || channels[chatId] || groups[chatId];
        if (chat && chat.polls) {
            const poll = chat.polls.find(p => p.id == pollId);
            if (poll && !poll.options[optionIndex].votes.includes(currentUser)) {
                poll.options[optionIndex].votes.push(currentUser);
                saveData();
                io.emit('poll updated', { chatId, pollId, options: poll.options });
            }
        }
    });

    // ИСТОРИИ
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

    socket.on('get stories', () => { sendStoriesToUser(socket); });
    socket.on('get story', (username) => {
        if (stories[username] && stories[username].length > 0) {
            const story = stories[username][stories[username].length - 1];
            socket.emit('story data', story);
        }
    });

    // СОХРАНЁННЫЕ
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

    // АВАТАРЫ
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
            cb({ success: true, userData: users[login] });
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
            cb({ success: true, userData: users[login] });
            io.emit('profile updated', users[login]);
            sendProfileList();
        } else cb({ success: false });
    });

    // ДРУЗЬЯ
    socket.on('add friend', (data, cb) => {
        const { friendUsername } = data;
        if (!users[friendUsername]) cb({ success: false, error: 'Пользователь не найден' });
        else if (friendUsername === currentUser) cb({ success: false, error: 'Нельзя добавить себя' });
        else if (users[currentUser].friends?.includes(friendUsername)) cb({ success: false, error: 'Уже в друзьях' });
        else {
            if (!users[friendUsername].friendRequests) users[friendUsername].friendRequests = [];
            if (users[friendUsername].friendRequests.includes(currentUser)) cb({ success: false, error: 'Запрос уже отправлен' });
            else {
                users[friendUsername].friendRequests.push(currentUser);
                saveData();
                cb({ success: true, message: '✅ Запрос в друзья отправлен!' });
                const fs = getSocketByUsername(friendUsername);
                if (fs) {
                    fs.emit('friends update', { friends: users[friendUsername].friends || [], requests: users[friendUsername].friendRequests || [], banned: users[friendUsername].banned || [] });
                    fs.emit('public keys update', userPublicKeys);
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
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
            socket.emit('public keys update', userPublicKeys);
            const fs = getSocketByUsername(fromUser);
            if (fs) {
                fs.emit('friends update', { friends: users[fromUser].friends, requests: users[fromUser].friendRequests, banned: users[fromUser].banned || [] });
                fs.emit('public keys update', userPublicKeys);
            }
        }
    });

    socket.on('reject friend', (data) => {
        const { fromUser } = data;
        if (users[currentUser].friendRequests?.includes(fromUser)) {
            users[currentUser].friendRequests = users[currentUser].friendRequests.filter(f => f !== fromUser);
            saveData();
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
        }
    });

    socket.on('ban user', (data) => {
        const { userToBan } = data;
        if (!users[currentUser].banned) users[currentUser].banned = [];
        if (!users[currentUser].banned.includes(userToBan)) {
            users[currentUser].banned.push(userToBan);
            if (users[currentUser].friends?.includes(userToBan)) users[currentUser].friends = users[currentUser].friends.filter(f => f !== userToBan);
            saveData();
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
        }
    });

    socket.on('unban user', (data) => {
        const { userToUnban } = data;
        if (users[currentUser].banned?.includes(userToUnban)) {
            users[currentUser].banned = users[currentUser].banned.filter(b => b !== userToUnban);
            saveData();
            socket.emit('friends update', { friends: users[currentUser].friends, requests: users[currentUser].friendRequests, banned: users[currentUser].banned || [] });
        }
    });

    socket.on('getFriends', (cb) => { cb({ friends: users[currentUser]?.friends || [], requests: users[currentUser]?.friendRequests || [], banned: users[currentUser]?.banned || [] }); });

    // КАНАЛЫ
    socket.on('create channel', (data, cb) => {
        const { channelName } = data;
        if (channels[channelName]) cb({ success: false, error: 'Канал уже существует' });
        else { channels[channelName] = { name: channelName, messages: [] }; saveData(); cb({ success: true, message: 'Канал создан' }); io.emit('channels update', Object.keys(channels)); }
    });
    socket.on('joinChannel', (name) => { if (channels[name]) socket.emit('chat history', { type: 'channel', channel: name, messages: channels[name].messages || [] }); });
    socket.on('getChannels', (cb) => cb(Object.keys(channels)));

    // ПРОФИЛЬ
    socket.on('update profile', (data, cb) => {
        if (users[data.login]) {
            if (data.name !== undefined) users[data.login].name = data.name;
            if (data.surname !== undefined) users[data.login].surname = data.surname;
            if (data.bio !== undefined) users[data.login].bio = data.bio;
            if (data.avatar !== undefined) { users[data.login].avatar = data.avatar; users[data.login].avatarType = 'emoji'; users[data.login].avatarData = null; }
            if (data.password) users[data.login].password = data.password;
            saveData();
            cb({ success: true, userData: users[data.login] });
            io.emit('profile updated', users[data.login]);
            sendProfileList();
        } else cb({ success: false });
    });

    socket.on('getUserProfile', (username, cb) => {
        if (users[username]) {
            cb({ name: users[username].name, surname: users[username].surname, bio: users[username].bio });
        } else cb(null);
    });

    // ЧАТЫ
    socket.on('joinPrivate', (target) => {
        const id = [currentUser, target].sort().join('_');
        if (!privateChats[id]) privateChats[id] = { messages: [] };
        socket.emit('chat history', { type: 'private', with: target, messages: privateChats[id].messages || [] });
    });

    socket.on('typing', (data) => {
        const { type, target, isTyping } = data;
        if (type === 'private') {
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) {
                targetSocket.emit('typing indicator', { user: currentUser, channel: null });
            }
        } else if (type === 'channel') {
            socket.to('channel:' + target).emit('typing indicator', { user: currentUser, channel: target });
        }
    });

    socket.on('chat message', (data) => {
        const { type, target, text, encrypted, reply } = data;
        const msg = { id: Date.now(), from: currentUser, text, time: new Date().toLocaleTimeString(), type, encrypted: encrypted || false };
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
        } else if (type === 'group') {
            msg.groupId = target;
            if (groups[target]) {
                groups[target].messages.push(msg);
                io.emit('chat message', msg);
                saveData();
            }
        }
    });

    socket.on('voice message', (data) => {
        const msg = { id: Date.now(), from: currentUser, audio: data.audio, time: new Date().toLocaleTimeString(), type: data.type };
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
        const msg = { id: Date.now(), from: currentUser, video: data.video, time: new Date().toLocaleTimeString(), type: data.type };
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
        const msg = { id: Date.now(), from: currentUser, fileName: data.fileName, fileType: data.fileType, fileData: data.fileData, time: new Date().toLocaleTimeString(), type: data.type };
        if (data.type === 'private') {
            msg.to = data.target;
            const id = [currentUser, data.target].sort().join('_');
            if (!privateChats[id]) privateChats[id] = { messages: [] };
            privateChats[id].messages.push(msg);
            io.emit('file attachment', msg);
            saveData();
        }
    });

    // ЗВОНКИ (WebRTC)
    socket.on('call user', (data) => {
        const { targetUserId, offer } = data;
        const targetSocket = getSocketByUsername(targetUserId);
        if (targetSocket) {
            targetSocket.emit('incoming call', { from: currentUser, offer });
        }
    });

    socket.on('answer call', (data) => {
        const { targetUserId, answer } = data;
        const targetSocket = getSocketByUsername(targetUserId);
        if (targetSocket) {
            targetSocket.emit('call answered', { from: currentUser, answer });
        }
    });

    socket.on('ice candidate', (data) => {
        const { targetUserId, candidate } = data;
        const targetSocket = getSocketByUsername(targetUserId);
        if (targetSocket) {
            targetSocket.emit('ice candidate', { from: currentUser, candidate });
        }
    });

    socket.on('end call', (targetUserId) => {
        const targetSocket = getSocketByUsername(targetUserId);
        if (targetSocket) {
            targetSocket.emit('call ended', currentUser);
        }
    });

    socket.on('disconnect', () => {
        if (currentUser) usersOnline.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const ip = getLocalIP();
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║        🚀 ATOMGRAM ЗАПУЩЕН             ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║  💻 http://localhost:${PORT}                  ║`);
    console.log(`║  📱 http://${ip}:${PORT}                 ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║  ✅ ВСЕ ФИШКИ TELEGRAM И MAX:            ║`);
    console.log(`║  🔐 Сквозное шифрование (E2EE)          ║`);
    console.log(`║  📸 Истории (как в Telegram)           ║`);
    console.log(`║  👥 Групповые чаты                     ║`);
    console.log(`║  📞 Голосовые и видеозвонки (WebRTC)   ║`);
    console.log(`║  ❤️ Реакции на сообщения               ║`);
    console.log(`║  📊 Опросы (Polls)                     ║`);
    console.log(`║  ⭐ Сохранённые сообщения               ║`);
    console.log(`║  💬 Ответы на сообщения (Reply)         ║`);
    console.log(`║  🎥 Видеокружки                        ║`);
    console.log(`║  🎤 Голосовые сообщения                ║`);
    console.log(`║  📎 Файлы и изображения                ║`);
    console.log(`║  👥 Друзья, каналы, чаты               ║`);
    console.log(`║  🌓 Тёмная/светлая тема                ║`);
    console.log(`║  🔕 Режим "Не беспокоить"              ║`);
    console.log(`║  ⌨️ Индикатор печати                    ║`);
    console.log(`║  📱 Адаптивный дизайн                  ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);
});
