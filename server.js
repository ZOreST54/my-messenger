<!DOCTYPE html>
<html>
<head>
    <title>ATOMGRAM - Звонки</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #0a0a0a; height: 100vh; }
        
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
        
        #mainApp {
            display: none;
            width: 100%;
            height: 100vh;
            display: flex;
        }
        .sidebar {
            width: 280px;
            background: #1a1a2e;
            border-right: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
        }
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-header h3 {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .user-info { font-size: 12px; color: #888; }
        .section-title {
            padding: 15px 20px 5px 20px;
            font-size: 11px;
            color: #667eea;
            text-transform: uppercase;
        }
        .rooms-list, .users-list {
            flex: 1;
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
            justify-content: space-between;
            align-items: center;
        }
        .room-item:hover, .user-item:hover { background: rgba(102,126,234,0.2); }
        .room-item.active, .user-item.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .call-btn {
            background: none;
            border: none;
            color: #4ade80;
            font-size: 16px;
            cursor: pointer;
            padding: 5px 10px;
            border-radius: 20px;
        }
        .call-btn:hover { background: rgba(74,222,128,0.2); }
        .new-room {
            padding: 15px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .new-room input {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 20px;
            background: #2a2a3e;
            color: white;
            margin-bottom: 8px;
        }
        .new-room button {
            width: 100%;
            padding: 10px;
            background: #2a2a3e;
            border: 1px solid #667eea;
            border-radius: 20px;
            color: #667eea;
            cursor: pointer;
        }
        .chat-area {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .chat-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            color: white;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .call-controls button {
            background: #2a2a3e;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            color: white;
            margin-left: 10px;
            cursor: pointer;
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
        }
        .message-content {
            max-width: 70%;
            padding: 10px 16px;
            border-radius: 20px;
            background: #2a2a3e;
            color: white;
        }
        .message.my-message { align-items: flex-end; }
        .message.my-message .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .message-username { font-size: 11px; color: #a0a0c0; margin-bottom: 4px; }
        .message-text { font-size: 14px; }
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
        .input-area {
            display: flex;
            padding: 20px;
            background: #1a1a2e;
            border-top: 1px solid rgba(255,255,255,0.1);
            gap: 10px;
        }
        .input-area input {
            flex: 1;
            padding: 14px 20px;
            border: none;
            border-radius: 30px;
            background: #2a2a3e;
            color: white;
        }
        .input-area button {
            padding: 14px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 30px;
            cursor: pointer;
        }
        .voice-record-btn {
            background: #ff6b6b !important;
        }
        .voice-record-btn.recording {
            animation: pulse 1s infinite;
            background: #ff4444 !important;
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .call-modal {
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: #1a1a2e;
            border-radius: 20px;
            padding: 20px;
            width: 280px;
            border: 1px solid #667eea;
            z-index: 1000;
            display: none;
        }
        .call-modal h4 { color: white; margin-bottom: 15px; }
        .call-modal button {
            padding: 10px 20px;
            margin: 5px;
            border: none;
            border-radius: 20px;
            cursor: pointer;
        }
        .answer-btn { background: #4ade80; color: white; }
        .reject-btn { background: #ff6b6b; color: white; }
        .end-call-btn { background: #ff6b6b; color: white; width: 100%; margin-top: 10px; }
        @media (max-width: 768px) {
            .sidebar { display: none; }
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
                <button onclick="register()">Зарегистрироваться</button>
                <button class="switch-btn" onclick="showLogin()">Назад</button>
            </div>
            <div id="authError" class="error-msg"></div>
        </div>
    </div>

    <div id="mainApp">
        <div class="sidebar">
            <div class="sidebar-header">
                <h3>⚡ ATOMGRAM</h3>
                <div class="user-info" id="currentUser"></div>
            </div>
            <div class="section-title">📢 ОБЩИЕ ЧАТЫ</div>
            <div class="rooms-list" id="roomsList"></div>
            <div class="section-title">💬 ЛИЧНЫЕ СООБЩЕНИЯ</div>
            <div class="users-list" id="usersList"></div>
            <div class="new-room">
                <input type="text" id="newRoomName" placeholder="Название чата">
                <button onclick="createRoom()">+ Создать общий чат</button>
            </div>
        </div>
        <div class="chat-area">
            <div class="chat-header">
                <span id="currentChatTitle">Выберите чат</span>
                <div class="call-controls" id="callControls" style="display:none">
                    <button onclick="startCall()">📞 Позвонить</button>
                </div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Введите сообщение...">
                <button id="voiceBtn" class="voice-record-btn" onclick="toggleRecording()">🎤</button>
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>

    <div id="callModal" class="call-modal">
        <h4 id="callStatus">Входящий звонок...</h4>
        <div id="callButtons">
            <button class="answer-btn" onclick="answerCall()">Ответить</button>
            <button class="reject-btn" onclick="rejectCall()">Отклонить</button>
        </div>
        <button id="endCallBtn" class="end-call-btn" style="display:none" onclick="endCall()">Завершить</button>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let currentUser = null;
        let currentChat = null;
        let currentChatType = null;
        let currentChatTarget = null;
        let allRooms = [];
        let allUsers = [];
        
        // WebRTC
        let localStream = null;
        let peerConnection = null;
        let callWith = null;
        
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        // Голосовые сообщения
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;
        
        async function toggleRecording() {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
        
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64Audio = reader.result;
                        sendVoiceMessage(base64Audio);
                    };
                    reader.readAsDataURL(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
                isRecording = true;
                document.getElementById('voiceBtn').classList.add('recording');
                document.getElementById('voiceBtn').innerHTML = '⏹️';
            } catch (err) {
                console.error('Ошибка микрофона:', err);
                alert('Нет доступа к микрофону');
            }
        }
        
        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                document.getElementById('voiceBtn').classList.remove('recording');
                document.getElementById('voiceBtn').innerHTML = '🎤';
            }
        }
        
        function sendVoiceMessage(base64Audio) {
            if (!currentChat) return;
            socket.emit('voice message', {
                type: currentChatType,
                target: currentChatTarget,
                audio: base64Audio
            });
        }
        
        // Звонки
        async function startCall() {
            if (!currentChatTarget || currentChatType !== 'private') {
                alert('Выберите личный чат для звонка');
                return;
            }
            
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                peerConnection = new RTCPeerConnection(configuration);
                
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
                
                // Слушаем входящий аудиопоток
                peerConnection.ontrack = (event) => {
                    const remoteAudio = new Audio();
                    remoteAudio.srcObject = event.streams[0];
                    remoteAudio.play().catch(e => console.log('Audio play error:', e));
                };
                
                // Отправляем ICE кандидаты
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('webrtc signal', {
                            to: currentChatTarget,
                            signal: { type: 'candidate', candidate: event.candidate }
                        });
                    }
                };
                
                // Создаём offer
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                
                socket.emit('webrtc signal', {
                    to: currentChatTarget,
                    signal: { type: 'offer', offer: offer }
                });
                
                callWith = currentChatTarget;
                showCallModal('Звонок...', true);
                
            } catch (err) {
                console.error('Ошибка звонка:', err);
                alert('Не удалось начать звонок: ' + err.message);
            }
        }
        
        function answerCall() {
            document.getElementById('callButtons').style.display = 'none';
            document.getElementById('endCallBtn').style.display = 'block';
            document.getElementById('callStatus').innerText = 'Разговор...';
            
            socket.emit('call answer', { to: callWith });
        }
        
        function rejectCall() {
            socket.emit('call reject', { to: callWith });
            closeCallModal();
            if (peerConnection) peerConnection.close();
            if (localStream) localStream.getTracks().forEach(t => t.stop());
        }
        
        function endCall() {
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
            socket.emit('call end', { to: callWith });
            closeCallModal();
        }
        
        function showCallModal(message, isOutgoing = false) {
            const modal = document.getElementById('callModal');
            document.getElementById('callStatus').innerText = message;
            if (isOutgoing) {
                document.getElementById('callButtons').style.display = 'none';
                document.getElementById('endCallBtn').style.display = 'block';
            } else {
                document.getElementById('callButtons').style.display = 'block';
                document.getElementById('endCallBtn').style.display = 'none';
            }
            modal.style.display = 'block';
        }
        
        function closeCallModal() {
            document.getElementById('callModal').style.display = 'none';
        }
        
        // Авторизация
        function login() {
            const login = document.getElementById('login').value.trim();
            const password = document.getElementById('password').value.trim();
            socket.emit('login', { login, password }, (res) => {
                if (res.success) {
                    currentUser = login;
                    document.getElementById('currentUser').innerText = currentUser;
                    document.getElementById('authScreen').style.display = 'none';
                    document.getElementById('mainApp').style.display = 'flex';
                    loadData();
                } else {
                    document.getElementById('authError').innerText = res.error;
                }
            });
        }
        
        function register() {
            const login = document.getElementById('regLogin').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            socket.emit('register', { login, password }, (res) => {
                if (res.success) {
                    showLogin();
                    document.getElementById('authError').innerText = '✅ Регистрация успешна!';
                } else {
                    document.getElementById('authError').innerText = res.error;
                }
            });
        }
        
        function showRegister() {
            document.getElementById('authForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
        }
        
        function showLogin() {
            document.getElementById('authForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
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
            container.innerHTML = allUsers.map(user => 
                '<div class="user-item' + (currentChat === 'user:' + user ? ' active' : '') + '"><span onclick="startPrivateChat(\\'' + user + '\\')">👤 ' + user + '</span><button class="call-btn" onclick="callUser(\\'' + user + '\\')">📞</button></div>'
            ).join('');
        }
        
        function callUser(user) {
            currentChatTarget = user;
            currentChatType = 'private';
            startCall();
        }
        
        function joinRoom(roomName) {
            currentChat = 'room:' + roomName;
            currentChatType = 'room';
            currentChatTarget = roomName;
            socket.emit('joinRoom', roomName);
            document.getElementById('currentChatTitle').innerHTML = '# ' + roomName;
            document.getElementById('callControls').style.display = 'none';
            renderRooms();
            renderUsers();
        }
        
        function startPrivateChat(userName) {
            currentChat = 'user:' + userName;
            currentChatType = 'private';
            currentChatTarget = userName;
            socket.emit('joinPrivate', userName);
            document.getElementById('currentChatTitle').innerHTML = '💬 ' + userName;
            document.getElementById('callControls').style.display = 'block';
            renderRooms();
            renderUsers();
        }
        
        function createRoom() {
            const newRoom = document.getElementById('newRoomName').value.trim();
            if (!newRoom) return;
            socket.emit('createRoom', newRoom, (success) => {
                if (success) {
                    document.getElementById('newRoomName').value = '';
                    loadData();
                    setTimeout(() => joinRoom(newRoom), 500);
                } else {
                    alert('Чат уже существует!');
                }
            });
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text || !currentChat) return;
            
            if (currentChatType === 'room') {
                socket.emit('chat message', { type: 'room', target: currentChatTarget, text });
            } else if (currentChatType === 'private') {
                socket.emit('chat message', { type: 'private', target: currentChatTarget, text });
            }
            input.value = '';
        }
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Сокеты
        socket.on('chat history', (data) => {
            if ((currentChatType === 'room' && data.type === 'room' && data.room === currentChatTarget) ||
                (currentChatType === 'private' && data.type === 'private' && data.with === currentChatTarget)) {
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                data.messages.forEach(msg => addMessage(msg));
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
        });
        
        socket.on('voice message', (data) => {
            let shouldShow = false;
            if (data.type === 'private' && currentChatType === 'private' && (data.to === currentChatTarget || data.from === currentChatTarget)) shouldShow = true;
            if (shouldShow) {
                addVoiceMessage(data);
                scrollToBottom();
            }
        });
        
        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (msg.from === currentUser) div.className += ' my-message';
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(msg.from) + '</div><div class="message-text">' + escapeHtml(msg.text) + '</div><div class="message-time">' + msg.time + '</div></div>';
            messagesDiv.appendChild(div);
        }
        
        function addVoiceMessage(data) {
            const messagesDiv = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message';
            if (data.from === currentUser) div.className += ' my-message';
            div.innerHTML = '<div class="message-content"><div class="message-username">' + escapeHtml(data.from) + '</div><div class="voice-message"><button onclick="playAudio(this)" data-audio="' + data.audio + '">▶️</button><span>Голосовое сообщение</span></div><div class="message-time">' + data.time + '</div></div>';
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
        
        // WebRTC сигналы
        socket.on('incoming call', (data) => {
            callWith = data.from;
            showCallModal('Входящий звонок от ' + data.from);
        });
        
        socket.on('call answered', async () => {
            document.getElementById('callStatus').innerText = 'Разговор...';
            document.getElementById('callButtons').style.display = 'none';
            document.getElementById('endCallBtn').style.display = 'block';
        });
        
        socket.on('call rejected', () => {
            alert('Звонок отклонён');
            endCall();
        });
        
        socket.on('call ended', () => {
            endCall();
        });
        
        socket.on('webrtc signal', async (data) => {
            if (!peerConnection && data.signal.type === 'offer') {
                // Создаём peer connection для входящего звонка
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                peerConnection = new RTCPeerConnection(configuration);
                
                localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, localStream);
                });
                
                peerConnection.ontrack = (event) => {
                    const remoteAudio = new Audio();
                    remoteAudio.srcObject = event.streams[0];
                    remoteAudio.play().catch(e => console.log('Audio play error:', e));
                };
                
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('webrtc signal', {
                            to: callWith,
                            signal: { type: 'candidate', candidate: event.candidate }
                        });
                    }
                };
            }
            
            if (peerConnection) {
                if (data.signal.type === 'offer') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.offer));
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    socket.emit('webrtc signal', {
                        to: callWith,
                        signal: { type: 'answer', answer: answer }
                    });
                } else if (data.signal.type === 'answer') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.answer));
                } else if (data.signal.type === 'candidate') {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
                    } catch (e) {
                        console.log('ICE candidate error:', e);
                    }
                }
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
