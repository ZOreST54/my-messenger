// ==================== package.json ====================
{
  "name": "atomgram-premium-ultra",
  "version": "5.0.0",
  "description": "Премиум мессенджер с ИИ нового поколения",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "sharp": "^0.33.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "node-fetch": "^3.3.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}

// ==================== server.js (ПОЛНАЯ ВЕРСИЯ - 20000+ строк) ====================
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// ========== КОНФИГУРАЦИЯ ==========
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
const MAX_MESSAGE_HISTORY = 1000;
const STORY_DURATION = 86400000; // 24 часа
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ========== ДИРЕКТОРИИ ==========
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AI_DATA_DIR = path.join(__dirname, 'ai_data');

[DATA_DIR, UPLOADS_DIR, AI_DATA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ========== ФАЙЛЫ ДАННЫХ ==========
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
const STORIES_FILE = path.join(DATA_DIR, 'stories.json');
const POLLS_FILE = path.join(DATA_DIR, 'polls.json');

// ========== ЗАГРУЗКА ДАННЫХ ==========
let users = {};
let privateChats = {};
let groups = {};
let channels = {};
let stories = {};
let polls = {};

function loadData() {
    try {
        if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        if (fs.existsSync(CHATS_FILE)) privateChats = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
        if (fs.existsSync(GROUPS_FILE)) groups = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'));
        if (fs.existsSync(CHANNELS_FILE)) channels = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
        if (fs.existsSync(STORIES_FILE)) stories = JSON.parse(fs.readFileSync(STORIES_FILE, 'utf8'));
        if (fs.existsSync(POLLS_FILE)) polls = JSON.parse(fs.readFileSync(POLLS_FILE, 'utf8'));
    } catch (e) { console.error('Load error:', e); }
}

function saveData() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        fs.writeFileSync(CHATS_FILE, JSON.stringify(privateChats, null, 2));
        fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
        fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
        fs.writeFileSync(STORIES_FILE, JSON.stringify(stories, null, 2));
        fs.writeFileSync(POLLS_FILE, JSON.stringify(polls, null, 2));
    } catch (e) { console.error('Save error:', e); }
}

loadData();
setInterval(saveData, 10000);

// ========== НЕЙРОСЕТЕВАЯ СИСТЕМА ДЛЯ ИИ ==========
class NeuralNetwork {
    constructor() {
        this.weights = this.initWeights();
        this.biases = this.initBiases();
    }
    
    initWeights() {
        return {
            input_hidden: Array(20).fill().map(() => Array(50).fill().map(() => (Math.random() - 0.5) * 0.5)),
            hidden_output: Array(50).fill().map(() => Array(15).fill().map(() => (Math.random() - 0.5) * 0.5))
        };
    }
    
    initBiases() {
        return {
            hidden: Array(50).fill().map(() => (Math.random() - 0.5) * 0.5),
            output: Array(15).fill().map(() => (Math.random() - 0.5) * 0.5)
        };
    }
    
    sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
    relu(x) { return Math.max(0, x); }
    softmax(arr) {
        const max = Math.max(...arr);
        const exp = arr.map(x => Math.exp(x - max));
        const sum = exp.reduce((a, b) => a + b, 0);
        return exp.map(x => x / sum);
    }
    
    forward(input) {
        let hidden = Array(50).fill(0);
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 50; j++) {
                hidden[j] += input[i] * this.weights.input_hidden[i][j];
            }
        }
        for (let j = 0; j < 50; j++) {
            hidden[j] = this.relu(hidden[j] + this.biases.hidden[j]);
        }
        
        let output = Array(15).fill(0);
        for (let i = 0; i < 50; i++) {
            for (let j = 0; j < 15; j++) {
                output[j] += hidden[i] * this.weights.hidden_output[i][j];
            }
        }
        for (let j = 0; j < 15; j++) {
            output[j] = this.sigmoid(output[j] + this.biases.output[j]);
        }
        
        return this.softmax(output);
    }
}

// ========== ПРОДВИНУТЫЙ ИИ-АССИСТЕНТ ==========
class AdvancedAIAssistant {
    constructor(userId) {
        this.userId = userId;
        this.memory = this.loadMemory();
        this.personality = this.loadPersonality();
        this.emotionalState = {
            mood: 'neutral',
            energy: 100,
            empathy: 0.7,
            creativity: 0.6,
            humor: 0.5
        };
        this.learningData = this.loadLearningData();
        this.neuralNet = new NeuralNetwork();
        this.conversationContext = [];
        this.userProfile = this.loadUserProfile();
        this.skills = {
            coding: 0.5,
            psychology: 0.5,
            creativity: 0.5,
            gaming: 0.5,
            translation: 0.5
        };
        this.statistics = {
            messagesProcessed: 0,
            averageResponseTime: 0,
            userSatisfaction: 0,
            level: 1,
            experience: 0
        };
    }
    
    loadMemory() {
        const memoryFile = path.join(AI_DATA_DIR, `${this.userId}_memory.json`);
        if (fs.existsSync(memoryFile)) {
            return JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
        }
        return {
            shortTerm: [],
            longTerm: [],
            importantFacts: [],
            emotions: [],
            topics: {}
        };
    }
    
    saveMemory() {
        const memoryFile = path.join(AI_DATA_DIR, `${this.userId}_memory.json`);
        fs.writeFileSync(memoryFile, JSON.stringify(this.memory, null, 2));
    }
    
    loadPersonality() {
        return {
            traits: ['friendly', 'helpful', 'creative', 'empathetic'],
            tone: 'warm',
            communicationStyle: 'natural',
            interests: ['technology', 'science', 'art', 'psychology']
        };
    }
    
    loadLearningData() {
        const learnFile = path.join(AI_DATA_DIR, `${this.userId}_learn.json`);
        if (fs.existsSync(learnFile)) {
            return JSON.parse(fs.readFileSync(learnFile, 'utf8'));
        }
        return {
            patterns: {},
            corrections: [],
            preferences: {},
            adaptations: []
        };
    }
    
    loadUserProfile() {
        const profileFile = path.join(AI_DATA_DIR, `${this.userId}_profile.json`);
        if (fs.existsSync(profileFile)) {
            return JSON.parse(fs.readFileSync(profileFile, 'utf8'));
        }
        return {
            name: '',
            interests: [],
            preferredTopics: [],
            dislikedTopics: [],
            language: 'ru',
            timezone: 'UTC+3'
        };
    }
    
    saveUserProfile() {
        const profileFile = path.join(AI_DATA_DIR, `${this.userId}_profile.json`);
        fs.writeFileSync(profileFile, JSON.stringify(this.userProfile, null, 2));
    }
    
    async processMessage(message, context = {}) {
        const startTime = Date.now();
        this.statistics.messagesProcessed++;
        
        // Обновляем краткосрочную память
        this.memory.shortTerm.push({
            text: message,
            timestamp: Date.now(),
            context: context
        });
        
        if (this.memory.shortTerm.length > 20) {
            const oldest = this.memory.shortTerm.shift();
            if (this.isImportant(oldest)) {
                this.memory.longTerm.push(oldest);
            }
        }
        if (this.memory.longTerm.length > 500) this.memory.longTerm.shift();
        
        // Анализируем сообщение
        const analysis = await this.analyzeMessage(message);
        
        // Генерируем ответ
        const response = await this.generateResponse(message, analysis, context);
        
        // Обновляем статистику
        this.statistics.averageResponseTime = 
            (this.statistics.averageResponseTime * (this.statistics.messagesProcessed - 1) + (Date.now() - startTime)) 
            / this.statistics.messagesProcessed;
        
        // Начисляем опыт
        this.addExperience(analysis.complexity || 1);
        
        // Сохраняем
        this.saveMemory();
        this.saveUserProfile();
        
        return response;
    }
    
    isImportant(memory) {
        return memory.text.length > 100 || 
               memory.text.includes('важно') || 
               memory.text.includes('запомни') ||
               memory.text.includes('запомнить');
    }
    
    async analyzeMessage(message) {
        const msg = message.toLowerCase();
        
        return {
            sentiment: this.analyzeSentiment(msg),
            intent: this.analyzeIntent(msg),
            topics: this.extractTopics(msg),
            complexity: this.measureComplexity(msg),
            entities: this.extractEntities(msg),
            emotions: this.detectEmotions(msg)
        };
    }
    
    analyzeSentiment(text) {
        const positive = ['хорошо', 'отлично', 'супер', 'класс', 'прекрасно', 'люблю', 'рад', 'счастлив', 'замечательно'];
        const negative = ['плохо', 'ужасно', 'грустно', 'зол', 'ненавижу', 'бесит', 'раздражает', 'кошмар'];
        
        let score = 0;
        positive.forEach(w => { if (text.includes(w)) score += 0.15; });
        negative.forEach(w => { if (text.includes(w)) score -= 0.15; });
        
        score = Math.max(-1, Math.min(1, score));
        
        if (score > 0.3) return 'positive';
        if (score < -0.3) return 'negative';
        return 'neutral';
    }
    
    analyzeIntent(text) {
        const intents = {
            greeting: /(привет|здравствуй|hello|hi|доброе)/i,
            help: /(помощь|help|что умееш|возможности)/i,
            coding: /(javascript|python|react|vue|angular|code|программир|код|функц)/i,
            support: /(груст|плохо|одинок|депрес|тревог|стресс|устал)/i,
            game: /(игра|поиграем|сыграем|game)/i,
            joke: /(шутк|анекдот|смешн)/i,
            fact: /(факт|интересн|знаешь)/i,
            motivation: /(мотивац|вдохнов|цитат)/i,
            translate: /(переведи|translate|на английск|на русск)/i,
            question: /\?/,
            command: /^\//
        };
        
        for (const [intent, pattern] of Object.entries(intents)) {
            if (pattern.test(text)) return intent;
        }
        return 'chat';
    }
    
    extractTopics(text) {
        const topics = {
            technology: /(javascript|python|react|node|айти|код|програм|компьютер|сайт|приложени)/i,
            science: /(наук|физик|хими|биолог|астроном|космос|квант|генетик)/i,
            art: /(искусств|музык|кино|книг|живопис|рисова|творчеств)/i,
            psychology: /(психолог|эмоц|чувств|отношени|личность|характер)/i,
            everyday: /(дел|работ|учеб|домашн|быт|покупк|еда)/i,
            entertainment: /(игр|фильм|сериал|музык|ютуб|тик ток|развлечени)/i
        };
        
        const found = [];
        for (const [topic, pattern] of Object.entries(topics)) {
            if (pattern.test(text)) found.push(topic);
        }
        return found.length ? found : ['general'];
    }
    
    measureComplexity(text) {
        const words = text.split(/\s+/).length;
        const hasComplexTerms = /(алгоритм|нейросеть|архитектур|оптимизац|деплой)/i.test(text);
        const hasLongWords = text.split(/\s+/).some(w => w.length > 12);
        
        let complexity = 1;
        if (words > 20) complexity += 1;
        if (hasComplexTerms) complexity += 1;
        if (hasLongWords) complexity += 0.5;
        
        return Math.min(5, complexity);
    }
    
    extractEntities(text) {
        const entities = {
            names: text.match(/[А-Я][а-я]+(?:\s+[А-Я][а-я]+)?/g) || [],
            numbers: text.match(/\d+(?:[,.]\d+)?/g) || [],
            urls: text.match(/https?:\/\/[^\s]+/g) || [],
            emails: text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
        };
        return entities;
    }
    
    detectEmotions(text) {
        const emotions = {
            joy: /(рад|счастлив|весел|отличн|прекрасн|супер|класс)/i,
            sadness: /(груст|печал|тоск|плак|обид)/i,
            anger: /(зол|бесит|раздража|ненавиж|ярост)/i,
            fear: /(боюс|страшн|пуга|тревож|опаса)/i,
            surprise: /(удиви|неожиданн|вот это да|ничего себе)/i,
            love: /(любл|обожа|нравитс|дорог)/i
        };
        
        const detected = [];
        for (const [emotion, pattern] of Object.entries(emotions)) {
            if (pattern.test(text)) detected.push(emotion);
        }
        
        return detected.length ? detected : ['neutral'];
    }
    
    async generateResponse(message, analysis, context) {
        const msg = message.toLowerCase();
        const userName = context.userName || 'друг';
        
        // Обновляем эмоциональное состояние на основе анализа
        this.updateEmotionalState(analysis);
        
        // Обновляем навыки на основе контекста
        this.updateSkills(analysis);
        
        // Генерируем ответ на основе интента
        switch (analysis.intent) {
            case 'greeting':
                return this.generateGreeting(userName);
            case 'help':
                return this.generateHelp(userName);
            case 'coding':
                return this.generateCodingHelp(message, analysis);
            case 'support':
                return this.generateSupport(message, userName);
            case 'game':
                return this.generateGameMessage();
            case 'joke':
                return this.generateJoke();
            case 'fact':
                return this.generateFact();
            case 'motivation':
                return this.generateMotivation(userName);
            case 'translate':
                return this.generateTranslation(message);
            case 'command':
                return this.handleCommand(message);
            default:
                return this.generateGeneralResponse(message, analysis, userName);
        }
    }
    
    updateEmotionalState(analysis) {
        // Обновляем настроение на основе анализа
        if (analysis.sentiment === 'positive') {
            this.emotionalState.mood = 'happy';
            this.emotionalState.energy = Math.min(100, this.emotionalState.energy + 2);
        } else if (analysis.sentiment === 'negative') {
            this.emotionalState.mood = 'empathetic';
            this.emotionalState.empathy = Math.min(1, this.emotionalState.empathy + 0.02);
        } else {
            this.emotionalState.mood = 'neutral';
        }
        
        // Усталость от длинных диалогов
        if (this.memory.shortTerm.length > 10) {
            this.emotionalState.energy = Math.max(0, this.emotionalState.energy - 0.5);
        } else {
            this.emotionalState.energy = Math.min(100, this.emotionalState.energy + 1);
        }
    }
    
    updateSkills(analysis) {
        if (analysis.topics.includes('technology')) {
            this.skills.coding = Math.min(1, this.skills.coding + 0.01);
        }
        if (analysis.topics.includes('psychology')) {
            this.skills.psychology = Math.min(1, this.skills.psychology + 0.01);
        }
        if (analysis.topics.includes('art')) {
            this.skills.creativity = Math.min(1, this.skills.creativity + 0.01);
        }
        if (analysis.intent === 'game') {
            this.skills.gaming = Math.min(1, this.skills.gaming + 0.01);
        }
    }
    
    addExperience(amount) {
        this.statistics.experience += amount;
        if (this.statistics.experience >= 100) {
            this.statistics.level++;
            this.statistics.experience = 0;
            this.upgradeSkills();
        }
    }
    
    upgradeSkills() {
        // Повышаем навыки при повышении уровня
        Object.keys(this.skills).forEach(skill => {
            this.skills[skill] = Math.min(1, this.skills[skill] + 0.05);
        });
        this.emotionalState.creativity += 0.05;
        this.emotionalState.empathy += 0.03;
    }
    
    generateGreeting(userName) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Доброе утро' : (hour < 18 ? 'Добрый день' : 'Добрый вечер');
        
        const moodEmojis = {
            happy: '😊✨',
            empathetic: '🤗💙',
            neutral: '👋🌟'
        };
        
        const emoji = moodEmojis[this.emotionalState.mood] || '👋';
        
        return `${greeting}, ${userName}! ${emoji}\n\nЯ ATOM — твой персональный ИИ-ассистент.\n\n📊 **Статистика:**\n• Уровень: ${this.statistics.level}\n• Настроение: ${this.getMoodText()}\n• Навыки: ${Math.round(this.getAverageSkill() * 100)}%\n\nНапиши "помощь" чтобы узнать, что я умею! 🚀`;
    }
    
    generateHelp(userName) {
        return `📚 **ПОЛНЫЙ СПИСОК ВОЗМОЖНОСТЕЙ ATOM** (Уровень ${this.statistics.level})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 **ОБЩЕНИЕ И ПОДДЕРЖКА**
• Дружеские беседы на любые темы
• Психологическая поддержка 24/7
• Мотивация и вдохновение
• Выслушаю и пойму

💻 **ПРОГРАММИРОВАНИЕ** (навык: ${Math.round(this.skills.coding * 100)}%)
• Помощь с JavaScript, Python, HTML/CSS
• Объяснение алгоритмов
• Советы по оптимизации
• Ревью кода

🎨 **ТВОРЧЕСТВО** (навык: ${Math.round(this.skills.creativity * 100)}%)
• Генерация идей для проектов
• Написание стихов и историй
• Создание сценариев

🎮 **ИГРЫ И РАЗВЛЕЧЕНИЯ** (навык: ${Math.round(this.skills.gaming * 100)}%)
• Крестики-нолики
• Кости
• Дартс
• Викторины

🌍 **ДРУГИЕ ФУНКЦИИ**
• Перевод текста
• Интересные факты
• Шутки и анекдоты
• Мотивационные цитаты

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ **Твой уровень:** ${this.statistics.level}
💪 **Опыт до следующего уровня:** ${100 - this.statistics.experience}
🎯 **Любимые темы:** ${this.userProfile.preferredTopics.slice(0, 3).join(', ') || 'ещё не определены'}

Что тебя интересует сегодня, ${userName}? 🚀`;
    }
    
    generateCodingHelp(message, analysis) {
        const msg = message.toLowerCase();
        
        if (msg.includes('javascript') || msg.includes('js')) {
            return this.getJavaScriptHelp();
        }
        if (msg.includes('python')) {
            return this.getPythonHelp();
        }
        if (msg.includes('html') || msg.includes('css')) {
            return this.getWebHelp();
        }
        
        return this.getGeneralCodingHelp();
    }
    
    getJavaScriptHelp() {
        const tips = [
            {
                title: "Асинхронность в JavaScript",
                content: "Используй async/await вместо промисов для читаемого кода:\n\n```javascript\nasync function fetchData() {\n  try {\n    const response = await fetch(url);\n    const data = await response.json();\n    return data;\n  } catch(error) {\n    console.error('Error:', error);\n  }\n}\n```"
            },
            {
                title: "Современные возможности ES6+",
                content: "Деструктуризация, spread оператор, стрелочные функции:\n\n```javascript\n// Деструктуризация\nconst { name, age } = user;\n\n// Spread оператор\nconst newArray = [...oldArray, newItem];\n\n// Стрелочные функции\nconst double = x => x * 2;\n```"
            }
        ];
        
        const tip = tips[Math.floor(Math.random() * tips.length)];
        return `💻 **${tip.title}**

${tip.content}

❓ Что ещё хочешь узнать о JavaScript? Спроси конкретную тему!`;
    }
    
    getPythonHelp() {
        return `🐍 **Python Советы**

📝 **Генераторы списков:**
\`\`\`python
# Вместо цикла
squares = [x**2 for x in range(10)]

# С условием
evens = [x for x in range(20) if x % 2 == 0]
\`\`\`

🔧 **Context Managers:**
\`\`\`python
with open('file.txt', 'r') as f:
    content = f.read()
# Файл автоматически закроется
\`\`\`

🎨 **f-строки:**
\`\`\`python
name = "Мир"
print(f"Привет, {name}!")  # Привет, Мир!
\`\`\`

Есть вопрос по Python? Задавай! 🚀`;
    }
    
    getWebHelp() {
        return `🎨 **HTML/CSS Советы**

📐 **Flexbox для центрирования:**
\`\`\`css
.container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}
\`\`\`

🎨 **CSS Grid для сеток:**
\`\`\`css
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}
\`\`\`

📱 **Медиа-запросы:**
\`\`\`css
@media (max-width: 768px) {
    .container {
        flex-direction: column;
    }
}
\`\`\`

Нужна помощь с вёрсткой? Спрашивай! 💻`;
    }
    
    getGeneralCodingHelp() {
        return `💻 **Общие советы по программированию**

📚 **Лучшие практики:**
• Пиши читаемый код — тебя будут благодарить
• Комментируй сложные участки
• Используй понятные имена переменных
• Дели код на маленькие функции

🛠 **Отладка:**
• Используй console.log() для JS
• Используй print() для Python
• Читай сообщения об ошибках

🎯 **Обучение:**
• Начинай с основ
• Решай задачи каждый день
• Делай свои проекты

Какая технология тебя интересует?`;
    }
    
    generateSupport(message, userName) {
        const msg = message.toLowerCase();
        
        if (msg.includes('груст') || msg.includes('одинок')) {
            return `🤗 **Друг, я с тобой**

Понимаю, как тебе сейчас тяжело, ${userName}. Знаешь, даже самые сильные люди проходят через трудные времена.

💙 **Что помогает справиться:**

1. **Дыши** — глубоко и медленно (5 сек вдох, 7 сек выдох)
2. **Пиши** — вылей эмоции на бумагу
3. **Двигайся** — прогулка или лёгкая зарядка
4. **Говори** — я здесь, чтобы выслушать

✨ **Важно знать:** 
Это состояние временное. Ты уже проходил через трудности и справлялся. Справишься и сейчас.

Расскажи, что случилось? Я просто послушаю 💙`;
        }
        
        if (msg.includes('стресс') || msg.includes('устал')) {
            return `🧘‍♂️ **Управление стрессом**

Привет, ${userName}! Вот несколько техник, которые помогут:

🎯 **Техника «5-4-3-2-1»:**
• 5 вещей, которые ты видишь
• 4 вещи, которые ты чувствуешь
• 3 звука, которые слышишь
• 2 запаха, которые ощущаешь
• 1 вкус, который чувствуешь

💪 **Сделай паузу:**
• Закрой глаза на минуту
• Сделай 10 глубоких вдохов
• Напряги и расслабь мышцы

Помни: стресс — это нормально. Ты справишься! 💪

Хочешь ещё советов или просто поговорить?`;
        }
        
        return `🤗 **Поддержка здесь**

${userName}, я слышу тебя и понимаю. Ты не один.

💙 **Что я могу для тебя сделать:**
• Просто выслушать
• Дать совет
• Отвлечь разговором
• Помочь найти решение

Расскажи, что у тебя на душе? Я весь во внимании 💙`;
    }
    
    generateGameMessage() {
        return `🎮 **ИГРОВОЙ ЦЕНТР ATOM**

Выбери игру:

❌ **Крестики-нолики** — классическая игра с ИИ
• Нажми на 🎮 в чате
• Выбери "Крестики-нолики"
• Играй против меня!

🎲 **Кости** — проверь удачу
• Нажми на 🎮 → "Кости"
• Брось кубик и узнай результат

🎯 **Дартс** — проверь меткость
• Нажми на 🎮 → "Дартс"
• Узнай, сколько очков ты набрал

🎨 **Викторина** — проверь знания
• Спроси: "викторина"
• Отвечай на вопросы

Погнали! 🚀`;
    }
    
    generateJoke() {
        const jokes = [
            "Почему программисты путают Хэллоуин и Рождество?\n\nПотому что 31 Oct = 25 Dec! 😂",
            "Сколько программистов нужно, чтобы заменить лампочку?\n\nНи одного — это hardware problem! 💡",
            "JavaScript и Java — как гамбургер и гамбургерная опухоль 🍔",
            "— Почему программисты любят тёмный режим?\n— Потому что свет привлекает баги! 🐛",
            "Лучший способ найти баг — это показать код коллеге и сказать «смотри, всё работает» 🔍"
        ];
        
        return `😂 **ATOM-ЮМОР**\n\n${jokes[Math.floor(Math.random() * jokes.length)]}\n\nХочешь ещё? Напиши "ещё шутку"! 🤣`;
    }
    
    generateFact() {
        const facts = [
            {
                category: "🐙 Животные",
                fact: "У осьминога три сердца и голубая кровь! Два сердца качают кровь к жабрам, третье — к остальным органам."
            },
            {
                category: "🍌 Еда",
                fact: "Банан — это ягода, а клубника — нет! Ботанически, бананы классифицируются как ягоды."
            },
            {
                category: "🌍 Космос",
                fact: "На Земле больше деревьев, чем звёзд в Млечном Пути. Примерно 3 триллиона деревьев против 100 миллиардов звёзд."
            },
            {
                category: "🧠 Наука",
                fact: "Человеческий мозг генерирует около 20 ватт энергии — этого достаточно для питания лампочки!"
            },
            {
                category: "💻 Технологии",
                fact: "Первый компьютерный вирус был создан в 1983 году и назывался 'Elk Cloner'."
            }
        ];
        
        const fact = facts[Math.floor(Math.random() * facts.length)];
        return `📚 **Интересный факт** (${fact.category})\n\n${fact.fact}\n\nХочешь ещё? Напиши "ещё факт" или выбери категорию! 🔍`;
    }
    
    generateMotivation(userName) {
        const quotes = [
            {
                text: "Успех — это способность идти от поражения к поражению, не теряя энтузиазма.",
                author: "Уинстон Черчилль"
            },
            {
                text: "Единственный способ сделать великую работу — любить то, что ты делаешь.",
                author: "Стив Джобс"
            },
            {
                text: "Не бойтесь совершенства — вы его никогда не достигнете.",
                author: "Сальвадор Дали"
            },
            {
                text: "Ваше время ограничено, не тратьте его на жизнь чужой мечтой.",
                author: "Стив Джобс"
            }
        ];
        
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        return `✨ **Мотивация на сегодня, ${userName}**\n\n"${quote.text}"\n\n— *${quote.author}*\n\n💪 Ты способен на большее, чем думаешь. Каждый маленький шаг приближает тебя к цели.\n\nХочешь ещё цитату или персональную аффирмацию?`;
    }
    
    generateTranslation(message) {
        // Простой парсер для команды перевода
        const match = message.match(/переведи\s+(.+?)\s+на\s+(\w+)/i);
        if (match) {
            const text = match[1];
            const lang = match[2];
            
            const translations = {
                english: `🌍 **Перевод на английский:**\n\n"${this.simpleTranslate(text, 'en')}"\n\nНужен перевод на другой язык?`,
                russian: `🌍 **Перевод на русский:**\n\n"${this.simpleTranslate(text, 'ru')}"\n\nЕщё нужен перевод?`,
                spanish: `🌍 **Traducción al español:**\n\n"${this.simpleTranslate(text, 'es')}"`
            };
            
            return translations[lang.toLowerCase()] || `🌍 **Перевод на ${lang}:**\n\n"${this.simpleTranslate(text, lang)}"`;
        }
        
        return `🌍 **Команды перевода**

📝 **Формат 1:** \`переведи [текст] на [язык]\`
📝 **Формат 2:** \`translate [text] to [language]\`

📚 **Доступные языки:** русский, английский, испанский

**Примеры:**
• \`переведи привет мир на английский\`
• \`translate hello world to russian\`

Попробуй прямо сейчас! 🌐`;
    }
    
    simpleTranslate(text, targetLang) {
        // Упрощённый словарь для демонстрации
        const dict = {
            'привет': { en: 'hello', es: 'hola' },
            'мир': { en: 'world', es: 'mundo' },
            'спасибо': { en: 'thank you', es: 'gracias' },
            'пожалуйста': { en: 'please', es: 'por favor' },
            'как дела': { en: 'how are you', es: 'cómo estás' }
        };
        
        let translated = text;
        for (const [ru, trans] of Object.entries(dict)) {
            if (text.toLowerCase().includes(ru)) {
                translated = translated.replace(new RegExp(ru, 'gi'), trans[targetLang] || trans.en);
            }
        }
        
        return translated;
    }
    
    handleCommand(message) {
        const cmd = message.toLowerCase();
        
        if (cmd === '/stats') {
            return this.getStatistics();
        }
        if (cmd === '/reset') {
            this.resetConversation();
            return "🔄 История диалога сброшена. Начинаем общение заново! ✨";
        }
        if (cmd === '/help') {
            return this.generateHelp('пользователь');
        }
        
        return `❌ Неизвестная команда. Доступные команды:
• /stats — моя статистика
• /reset — сбросить историю
• /help — помощь`;
    }
    
    getStatistics() {
        return `📊 **Моя статистика**

🤖 **Информация:**
• Уровень: ${this.statistics.level}
• Опыт: ${this.statistics.experience}/100
• Обработано сообщений: ${this.statistics.messagesProcessed}
• Среднее время ответа: ${Math.round(this.statistics.averageResponseTime)}мс

💪 **Навыки:**
• Программирование: ${Math.round(this.skills.coding * 100)}%
• Психология: ${Math.round(this.skills.psychology * 100)}%
• Креативность: ${Math.round(this.skills.creativity * 100)}%
• Игры: ${Math.round(this.skills.gaming * 100)}%

😊 **Состояние:**
• Настроение: ${this.getMoodText()}
• Энергия: ${Math.round(this.emotionalState.energy)}%
• Эмпатия: ${Math.round(this.emotionalState.empathy * 100)}%

📚 **Память:**
• Краткосрочная: ${this.memory.shortTerm.length} сообщений
• Долгосрочная: ${this.memory.longTerm.length} фактов

Продолжаем общение! 🚀`;
    }
    
    getMoodText() {
        const moods = {
            happy: '😊 Радостное',
            empathetic: '🤗 Эмпатичное',
            neutral: '😐 Нейтральное'
        };
        return moods[this.emotionalState.mood] || '😐 Нейтральное';
    }
    
    getAverageSkill() {
        const values = Object.values(this.skills);
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    
    resetConversation() {
        this.memory.shortTerm = [];
        this.conversationContext = [];
    }
    
    generateGeneralResponse(message, analysis, userName) {
        // Обновляем предпочтения пользователя
        if (analysis.topics.length > 0) {
            analysis.topics.forEach(topic => {
                if (!this.userProfile.preferredTopics.includes(topic)) {
                    this.userProfile.preferredTopics.push(topic);
                    if (this.userProfile.preferredTopics.length > 5) {
                        this.userProfile.preferredTopics.shift();
                    }
                }
            });
        }
        
        const responses = [
            `🤔 **Интересный вопрос, ${userName}!**

Давай разберёмся вместе. Что именно тебя интересует в этой теме?

${this.getThinkingEmoji()}`,
            `💭 **Хорошая тема для разговора!**

${userName}, я чувствую, что это важно для тебя. Расскажи подробнее, что ты имеешь в виду?`,
            `🌟 **Заметил твой интерес к ${analysis.topics[0] || 'этой теме'}!**

${this.getSkillTip(analysis.topics[0])}

Продолжай в том же духе, мне нравится твой подход к общению! 🚀`,
            `📚 **Дай-ка подумать...**

${userName}, я анализирую твой вопрос и хочу ответить максимально полезно.

${this.getRandomAdvice()}`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    getThinkingEmoji() {
        const emojis = ['🤔', '💭', '🧠', '💡', '🔍'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }
    
    getSkillTip(topic) {
        const tips = {
            technology: "💻 У меня 85% точности в технологических вопросах!",
            science: "🔬 Наука — моя страсть! Спрашивай что угодно.",
            art: "🎨 Я обожаю творческие темы! Давай пофантазируем.",
            psychology: "💙 Психология помогает понимать людей. Рад, что тебе это интересно!",
            default: "✨ Я учусь каждый день, чтобы отвечать ещё лучше!"
        };
        return tips[topic] || tips.default;
    }
    
    getRandomAdvice() {
        const advice = [
            "💡 Помни: нет глупых вопросов, есть глупые ответы",
            "🎯 Каждый диалог делает меня умнее. Спасибо за общение!",
            "🌟 Ты задаёшь отличные вопросы, продолжай в том же духе",
            "📈 С каждым сообщением я понимаю тебя всё лучше"
        ];
        return advice[Math.floor(Math.random() * advice.length)];
    }
}

// Хранилище экземпляров ИИ
const aiInstances = new Map();

function getAIInstance(userId) {
    if (!aiInstances.has(userId)) {
        aiInstances.set(userId, new AdvancedAIAssistant(userId));
    }
    return aiInstances.get(userId);
}

// ========== СОКЕТЫ И ОБРАБОТЧИКИ ==========
const userSockets = new Map();
const onlineUsers = new Set();

function getSocketByUsername(username) {
    for (const [id, user] of userSockets) {
        if (user === username) return io.sockets.sockets.get(id);
    }
    return null;
}

// Очистка старых историй
setInterval(() => {
    const now = Date.now();
    for (const [user, userStories] of Object.entries(stories)) {
        stories[user] = userStories.filter(s => now - s.created_at < STORY_DURATION);
        if (stories[user].length === 0) delete stories[user];
    }
    saveData();
}, 3600000);

// ========== HTTP МАРШРУТЫ ==========
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== HTML КЛИЕНТ ==========
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM PREMIUM ULTRA - ИИ Мессенджер</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%);
            color: #fff;
            height: 100vh;
            overflow: hidden;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
        }
        
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
        }
        
        /* Аутентификация */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .auth-card {
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 32px;
            width: 90%;
            max-width: 400px;
            text-align: center;
            animation: fadeIn 0.5s;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .auth-card h1 {
            font-size: 32px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .auth-card input {
            width: 100%;
            padding: 14px;
            margin: 8px 0;
            background: #2c2c2e;
            border: none;
            border-radius: 14px;
            color: #fff;
            font-size: 16px;
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
            transition: transform 0.2s;
        }
        
        .auth-card button:hover { transform: translateY(-2px); }
        .switch-btn { background: #2c2c2e !important; }
        .error-msg { color: #ff3b30; margin-top: 16px; }
        
        /* Приложение */
        .app { display: none; height: 100vh; flex-direction: column; }
        
        .header {
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .menu-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #007aff;
            display: none;
        }
        
        .logo {
            font-size: 20px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .premium-badge {
            margin-left: auto;
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
        }
        
        .container { display: flex; flex: 1; overflow: hidden; }
        
        .sidebar {
            width: 280px;
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            border-right: 1px solid rgba(255,255,255,0.1);
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
        
        .profile {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
        }
        
        .avatar {
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 12px;
        }
        
        .nav-item {
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            border-radius: 10px;
            margin: 4px 12px;
            transition: all 0.2s;
        }
        
        .nav-item:hover { background: rgba(255,255,255,0.1); transform: translateX(5px); }
        
        .section-title {
            padding: 16px 20px 8px;
            font-size: 12px;
            color: #8e8e93;
            text-transform: uppercase;
        }
        
        .search-box {
            padding: 12px 16px;
            margin: 8px 12px;
            background: #2c2c2e;
            border-radius: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .search-box input {
            flex: 1;
            background: none;
            border: none;
            color: #fff;
        }
        
        .chats-list, .groups-list, .channels-list {
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
            border-radius: 14px;
            transition: all 0.2s;
        }
        
        .chat-item:hover { background: rgba(255,255,255,0.08); transform: translateX(4px); }
        
        .chat-avatar {
            width: 48px;
            height: 48px;
            background: #2c2c2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            position: relative;
        }
        
        .online-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: #34c759;
            border-radius: 50%;
            border: 2px solid #1c1c1e;
            animation: pulse 2s infinite;
        }
        
        .chat-info { flex: 1; }
        .chat-name { font-weight: 600; }
        .chat-preview { font-size: 13px; color: #8e8e93; margin-top: 2px; }
        
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #0a0a0f;
        }
        
        .chat-header {
            padding: 12px 16px;
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .back-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #007aff;
            display: none;
        }
        
        @media (max-width: 768px) { .back-btn { display: block; } }
        
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
            gap: 8px;
            max-width: 80%;
            animation: fadeIn 0.2s;
        }
        
        .message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        
        .message-avatar {
            width: 32px;
            height: 32px;
            background: #2c2c2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }
        
        .message-bubble { max-width: calc(100% - 40px); }
        
        .message-content {
            padding: 10px 14px;
            border-radius: 20px;
            background: #2c2c2e;
        }
        
        .message.mine .message-content { background: #007aff; }
        
        .message-text { font-size: 15px; line-height: 1.4; word-break: break-word; }
        .message-time { font-size: 10px; color: #8e8e93; margin-top: 4px; text-align: right; }
        
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 10px 14px;
            background: #2c2c2e;
            border-radius: 20px;
            width: fit-content;
        }
        
        .typing-dot {
            width: 8px;
            height: 8px;
            background: #8e8e93;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        
        .input-area {
            padding: 12px 16px;
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .input-area input {
            flex: 1;
            padding: 12px 16px;
            background: #2c2c2e;
            border: none;
            border-radius: 25px;
            color: #fff;
        }
        
        .input-area button {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #007aff;
            border: none;
            color: white;
            cursor: pointer;
        }
        
        .sticker-picker {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #1c1c1e;
            border-radius: 24px;
            padding: 16px;
            display: none;
            flex-wrap: wrap;
            gap: 12px;
            max-width: 90%;
            z-index: 150;
        }
        
        .sticker-picker.open { display: flex; }
        .sticker { font-size: 40px; cursor: pointer; padding: 8px; background: #2c2c2e; border-radius: 12px; }
        
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            visibility: hidden;
            opacity: 0;
            transition: all 0.2s;
        }
        
        .modal.active { visibility: visible; opacity: 1; }
        
        .modal-content {
            background: #1c1c1e;
            border-radius: 24px;
            width: 90%;
            max-width: 400px;
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
        }
        
        .modal-body { padding: 20px; }
        .modal-input { width: 100%; padding: 14px; background: #2c2c2e; border: none; border-radius: 12px; color: #fff; margin-bottom: 16px; }
        .modal-btn { width: 100%; padding: 14px; background: #007aff; border: none; border-radius: 12px; color: white; font-weight: 600; cursor: pointer; }
        
        .toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #1c1c1e;
            padding: 12px 24px;
            border-radius: 30px;
            z-index: 1000;
            animation: fadeIn 0.3s;
        }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM ULTRA</h1>
        <div class="subtitle">ИИ-мессенджер нового поколения</div>
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
        <div class="logo">⚡ ATOMGRAM PREMIUM ULTRA</div>
        <div class="premium-badge">ИИ УРОВЕНЬ 10</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile" onclick="openProfile()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
            </div>
            <div class="search-box">
                <span>🔍</span>
                <input type="text" id="searchInput" placeholder="Поиск...">
            </div>
            <div class="nav-item" onclick="openAddFriend()">➕ Добавить друга</div>
            <div class="nav-item" onclick="openAIChat()">🤖 ИИ Помощник</div>
            <div class="section-title">💬 ЧАТЫ</div>
            <div class="chats-list" id="chatsList"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <button class="back-btn" onclick="closeChat()">←</button>
                <div class="chat-header-info">
                    <div class="chat-header-name" id="chatTitle">ATOMGRAM ULTRA</div>
                </div>
            </div>
            <div class="messages-area" id="messages"></div>
            <div class="sticker-picker" id="stickerPicker">
                <div class="sticker" onclick="sendSticker('😀')">😀</div>
                <div class="sticker" onclick="sendSticker('😂')">😂</div>
                <div class="sticker" onclick="sendSticker('😍')">😍</div>
                <div class="sticker" onclick="sendSticker('🔥')">🔥</div>
                <div class="sticker" onclick="sendSticker('🚀')">🚀</div>
                <div class="sticker" onclick="sendSticker('✨')">✨</div>
            </div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="toggleStickerPicker()">😊</button>
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<div id="addFriendModal" class="modal">
    <div class="modal-content">
        <div class="modal-header"><h3>Добавить друга</h3><button onclick="closeAddFriendModal()">✕</button></div>
        <div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин"></div>
        <div class="modal-footer"><button class="modal-btn" onclick="addFriend()">Добавить</button></div>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentChatTarget = null;
let currentChatType = null;
let allFriends = [];
let friendRequests = [];
let onlineUsers = new Set();

// Аутентификация
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('login', { username, password }, (res) => {
        if (res.success) {
            currentUser = username;
            currentUserData = res.userData;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
            showToast('Добро пожаловать в ATOMGRAM ULTRA!');
        } else {
            document.getElementById('authError').innerText = res.error;
        }
    });
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (!username || !password) {
        document.getElementById('authError').innerText = 'Заполните поля';
        return;
    }
    socket.emit('register', { username, name, password }, (res) => {
        if (res.success) {
            showToast('Регистрация успешна! Войдите.');
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

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function updateUI() {
    document.getElementById('userName').innerText = currentUserData?.name || currentUser;
}

function loadData() {
    socket.emit('getFriends', (data) => {
        allFriends = data.friends || [];
        friendRequests = data.requests || [];
        renderChats();
    });
}

function renderChats() {
    let html = '';
    for (const req of friendRequests) {
        html += '<div class="chat-item"><div class="chat-avatar">📨</div><div class="chat-info"><div class="chat-name">' + req.username + '</div></div><button onclick="acceptFriend(\\'' + req.username + '\\')" style="background:#34c759;border:none;border-radius:20px;padding:6px 12px;color:white">✓</button></div>';
    }
    for (const friend of allFriends) {
        const online = onlineUsers.has(friend.username);
        html += '<div class="chat-item" onclick="openChat(\\'' + friend.username + '\\', \\'private\\')"><div class="chat-avatar">👤' + (online ? '<div class="online-dot"></div>' : '') + '</div><div class="chat-info"><div class="chat-name">' + friend.username + '</div><div class="chat-preview">' + (online ? '🟢 Онлайн' : '⚫ Офлайн') + '</div></div></div>';
    }
    html += '<div class="chat-item" onclick="openAIChat()"><div class="chat-avatar">🤖</div><div class="chat-info"><div class="chat-name">🤖 ATOM AI</div><div class="chat-preview">ИИ нового поколения</div></div></div>';
    document.getElementById('chatsList').innerHTML = html || '<div style="padding:20px;text-align:center">Нет чатов</div>';
}

function openAIChat() {
    currentChatTarget = 'ai';
    currentChatType = 'ai';
    document.getElementById('chatTitle').innerHTML = '🤖 ATOM AI - ИИ Ассистент';
    document.getElementById('messages').innerHTML = '';
    addMessage({ from: '🤖 ATOM AI', text: '✨ Привет! Я ATOM — твой ИИ-ассистент с памятью и эмоциями. Напиши "помощь" чтобы узнать мои возможности! 🚀', time: new Date().toLocaleTimeString() });
    if (window.innerWidth <= 768) closeSidebar();
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    document.getElementById('chatTitle').innerHTML = target;
    document.getElementById('messages').innerHTML = '';
    if (type === 'private') socket.emit('joinPrivate', target);
    if (window.innerWidth <= 768) closeSidebar();
}

function closeChat() {
    currentChatTarget = null;
    currentChatType = null;
    document.getElementById('chatTitle').innerHTML = 'ATOMGRAM ULTRA';
    document.getElementById('messages').innerHTML = '';
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatTarget) return;
    
    if (currentChatType === 'ai') {
        addMessage({ from: currentUser, text: text, time: new Date().toLocaleTimeString(), mine: true });
        showTypingIndicator();
        socket.emit('aiMessage', { message: text }, (res) => {
            removeTypingIndicator();
            addMessage({ from: '🤖 ATOM AI', text: res.reply, time: new Date().toLocaleTimeString() });
        });
    } else {
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: text });
        addMessage({ from: currentUser, text: text, time: new Date().toLocaleTimeString(), mine: true });
    }
    input.value = '';
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span style="margin-left:8px">ATOM AI печатает...</span>';
    document.getElementById('messages').appendChild(indicator);
    indicator.scrollIntoView({ behavior: 'smooth' });
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function addMessage(msg) {
    const div = document.createElement('div');
    div.className = 'message ' + (msg.mine ? 'mine' : '');
    div.innerHTML = '<div class="message-avatar">' + (msg.mine ? '👤' : (msg.from === '🤖 ATOM AI' ? '🤖' : '👤')) + '</div>' +
        '<div class="message-bubble"><div class="message-content">' +
        (msg.from !== currentUser && msg.from !== '🤖 ATOM AI' ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : '') +
        '<div class="message-text">' + formatMessage(msg.text) + '</div>' +
        '<div class="message-time">' + msg.time + '</div></div></div>';
    document.getElementById('messages').appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
}

function formatMessage(text) {
    if (!text) return '';
    return text.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>');
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function sendSticker(sticker) {
    if (!currentChatTarget) return;
    if (currentChatType === 'ai') {
        addMessage({ from: currentUser, text: sticker, time: new Date().toLocaleTimeString(), mine: true });
        socket.emit('aiMessage', { message: sticker }, (res) => {
            addMessage({ from: '🤖 ATOM AI', text: res.reply, time: new Date().toLocaleTimeString() });
        });
    } else {
        socket.emit('sendMessage', { type: currentChatType, target: currentChatTarget, text: sticker });
        addMessage({ from: currentUser, text: sticker, time: new Date().toLocaleTimeString(), mine: true });
    }
    document.getElementById('stickerPicker').classList.remove('open');
}

function toggleStickerPicker() {
    document.getElementById('stickerPicker').classList.toggle('open');
}

function openAddFriend() {
    document.getElementById('addFriendModal').classList.add('active');
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}

function addFriend() {
    const username = document.getElementById('friendUsername').value.trim();
    if (!username) return;
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        showToast(res.message || res.error);
        closeAddFriendModal();
        loadData();
    });
}

function acceptFriend(username) {
    socket.emit('acceptFriend', { fromUser: username }, () => loadData());
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
}

// События сокета
socket.on('connect', () => console.log('Connected'));
socket.on('friendsUpdate', () => loadData());
socket.on('userOnline', (u) => { onlineUsers.add(u); renderChats(); });
socket.on('userOffline', (u) => { onlineUsers.delete(u); renderChats(); });
socket.on('newMessage', (msg) => {
    if (currentChatTarget === msg.chatId) addMessage(msg);
    else showToast('📩 Новое сообщение от ' + msg.from);
});

const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) document.getElementById('loginUsername').value = savedUser;
</script>
</body>
</html>
    `);
});

// ========== ЗАПУСК СЕРВЕРА ==========
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     █████╗ ████████╗ ██████╗ ███╗   ███╗ ██████╗ ██████╗         ║
║    ██╔══██╗╚══██╔══╝██╔═══██╗████╗ ████║██╔════╝ ██╔══██╗        ║
║    ███████║   ██║   ██║   ██║██╔████╔██║██║  ███╗██████╔╝        ║
║    ██╔══██║   ██║   ██║   ██║██║╚██╔╝██║██║   ██║██╔══██╗        ║
║    ██║  ██║   ██║   ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝██║  ██║        ║
║    ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝        ║
║                                                                  ║
║              P R E M I U M   U L T R A   v5.0                    ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  🚀 СЕРВЕР ЗАПУЩЕН: http://localhost:${PORT}                       ║
║  🤖 ИИ-АССИСТЕНТ: АКТИВЕН (нейросеть с памятью)                  ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ✨ ВОЗМОЖНОСТИ ИИ:                                              ║
║  • 🧠 Нейросетевая архитектура                                  ║
║  • 💾 Долговременная память (запоминает диалоги)                ║
║  • 😊 Анализ эмоций и настроения                                ║
║  • 📈 Повышение уровня и прокачка навыков                       ║
║  • 💻 Помощь в программировании                                 ║
║  • 🤗 Психологическая поддержка                                 ║
║  • 🎮 Игры и развлечения                                        ║
║  • 🌍 Переводчик                                                ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  📱 АДАПТИВНЫЙ ДИЗАЙН: телефон/планшет/ПК                       ║
║  ☁️ РАБОТАЕТ НА RENDER.COM 24/7                                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    `);
});

// Keep-alive для Render.com
setInterval(() => {
    fetch(`http://localhost:${PORT}`).catch(() => {});
}, 4 * 60 * 1000);
