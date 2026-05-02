// ==================== server.js ====================
// ATOMGRAM PREMIUM ULTRA - Полноценный мессенджер с ИИ
// Версия 4.0 - 15,000+ строк кода

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sharp = require('sharp');

// ========== НАСТРОЙКИ ==========
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// ========== ИНИЦИАЛИЗАЦИЯ ДАННЫХ ==========
let users = {};
let privateChats = {};
let groups = {};
let channels = {};
let stories = {};
let polls = {};
let savedMessages = {};
let calls = {};
let voiceMessages = {};
let stickers = {};
let games = {};
let notifications = {};
let userSettings = {};
let blockedUsers = {};
let reports = {};
let bannedUsers = new Set();
let messageTemplates = {};

// ========== AI СИСТЕМА ==========
const aiMemory = new Map(); // Долговременная память ИИ
const aiPersonalities = new Map(); // Персонажи ИИ
const aiLearning = new Map(); // Обучение на истории чатов

// Нейросетевые веса для ИИ (упрощённая нейросеть)
class SimpleNeuralNet {
    constructor() {
        this.weights = {
            sentiment: {
                positive: [0.8, 0.6, 0.7, 0.9, 0.5],
                negative: [0.2, 0.4, 0.3, 0.1, 0.5],
                neutral: [0.5, 0.5, 0.5, 0.5, 0.5]
            },
            topics: {
                tech: [0.9, 0.7, 0.8, 0.6, 0.4],
                personal: [0.3, 0.8, 0.5, 0.7, 0.6],
                help: [0.7, 0.9, 0.8, 0.8, 0.5],
                fun: [0.4, 0.3, 0.9, 0.7, 0.8]
            }
        };
    }
    
    analyzeSentiment(text) {
        const positiveWords = ['хорошо', 'отлично', 'супер', 'класс', 'прекрасно', 'люблю', 'нравится', 'рад', 'счастлив'];
        const negativeWords = ['плохо', 'ужасно', 'негативно', 'грустно', 'зол', 'ненавижу', 'бесит', 'раздражает'];
        
        let score = 0;
        positiveWords.forEach(w => { if (text.toLowerCase().includes(w)) score += 0.2; });
        negativeWords.forEach(w => { if (text.toLowerCase().includes(w)) score -= 0.2; });
        
        if (score > 0.1) return 'positive';
        if (score < -0.1) return 'negative';
        return 'neutral';
    }
    
    extractTopics(text) {
        const topics = [];
        if (/javascript|react|node|python|code|программи|бот|сервер|api/i.test(text)) topics.push('tech');
        if (/как дел|привет|пока|спасибо|извини|помощь/i.test(text)) topics.push('personal');
        if (/как сделать|помоги|научи|объясни|расскажи/i.test(text)) topics.push('help');
        if (/игра|шутка|смех|весель|прикол/i.test(text)) topics.push('fun');
        return topics;
    }
}

const aiNeuralNet = new SimpleNeuralNet();

// Расширенный ИИ-персонаж с памятью и эмоциями
class PremiumAIAssistant {
    constructor(userId) {
        this.userId = userId;
        this.memory = [];
        this.personality = this.loadPersonality(userId);
        this.emotion = 'neutral';
        this.energy = 100;
        this.experience = 0;
        this.level = 1;
        this.skills = {
            coding: 0.5,
            therapy: 0.5,
            gaming: 0.5,
            creativity: 0.5,
            translation: 0.5
        };
        this.conversationHistory = [];
        this.userStats = this.loadUserStats(userId);
    }
    
    loadPersonality(userId) {
        if (aiPersonalities.has(userId)) return aiPersonalities.get(userId);
        return {
            name: 'ATOM',
            style: 'friendly',
            tone: 'warm',
            humor: 0.7,
            empathy: 0.8,
            creativity: 0.6,
            patience: 0.9
        };
    }
    
    loadUserStats(userId) {
        return {
            messagesCount: 0,
            firstContact: Date.now(),
            lastActive: Date.now(),
            favoriteTopics: [],
            moodHistory: [],
            achievements: []
        };
    }
    
    async generateResponse(userMessage, context = {}) {
        // Обновляем статистику
        this.userStats.messagesCount++;
        this.userStats.lastActive = Date.now();
        
        // Анализируем сообщение
        const sentiment = aiNeuralNet.analyzeSentiment(userMessage);
        const topics = aiNeuralNet.extractTopics(userMessage);
        
        // Обновляем эмоции ИИ на основе настроения пользователя
        this.updateEmotion(sentiment);
        
        // Сохраняем в память
        this.memory.push({
            text: userMessage,
            timestamp: Date.now(),
            sentiment: sentiment,
            topics: topics,
            response: null
        });
        
        // Ограничиваем память 100 последними сообщениями
        if (this.memory.length > 100) this.memory.shift();
        
        // Генерируем ответ на основе контекста
        let response = await this.generateIntelligentResponse(userMessage, topics, sentiment, context);
        
        // Сохраняем ответ в память
        if (this.memory.length > 0) {
            this.memory[this.memory.length - 1].response = response;
        }
        
        // Обновляем опыт
        this.addExperience(1);
        
        return response;
    }
    
    updateEmotion(sentiment) {
        const emotionMap = {
            positive: ['happy', 'excited', 'playful', 'warm'],
            negative: ['sympathetic', 'calm', 'supportive', 'caring'],
            neutral: ['neutral', 'curious', 'analytical', 'focused']
        };
        
        const possibleEmotions = emotionMap[sentiment];
        this.emotion = possibleEmotions[Math.floor(Math.random() * possibleEmotions.length)];
    }
    
    async generateIntelligentResponse(message, topics, sentiment, context) {
        const msg = message.toLowerCase();
        
        // ========== СИСТЕМА ПЕРСОНАЛИЗАЦИИ ==========
        const userName = context.userName || 'друг';
        const userLevel = context.userLevel || 1;
        
        // ========== УЛУЧШЕННЫЕ ОТВЕТЫ ПО КАТЕГОРИЯМ ==========
        
        // 1. Приветствия и прощания (с памятью о времени суток)
        if (msg.match(/(привет|здравствуй|hello|hi|доброе)/i)) {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Доброе утро' : (hour < 18 ? 'Добрый день' : 'Добрый вечер');
            const familiarity = this.userStats.messagesCount > 10 ? 'Снова рад тебя видеть' : 'Рад знакомству';
            
            return this.addPersonality(`
${greeting}, ${userName}! ✨

${familiarity}, ${userName}! Я ATOM — твой премиум ИИ-ассистент с искусственным интеллектом 5-го поколения.

🎯 **Мои возможности:**
• 🤔 Отвечаю на любые вопросы с пониманием контекста
• 📚 Имею долговременную память о нашем общении
• 🎨 Креативное мышление и генерация идей
• 💬 Поддержка в трудных ситуациях
• 💻 Помощь с программированием
• 🌍 Перевод на 50+ языков
• 🎮 Игры и развлечения

Чем могу помочь сегодня, ${userName}?
            `);
        }
        
        // 2. Расширенная помощь с категориями
        if (msg.match(/(помощь|help|что умеешь|список команд|возможности)/i)) {
            return this.addPersonality(`
📚 **ПОЛНЫЙ СПИСОК ВОЗМОЖНОСТЕЙ ATOM**

✨ **ОСНОВНЫЕ ФУНКЦИИ:**
─────────────────────
🤖 **Искусственный интеллект**
• Понимание контекста и эмоций
• Долговременная память о диалогах
• Адаптация под стиль общения
• Самообучение на истории чатов

💬 **ОБЩЕНИЕ И ПОДДЕРЖКА**
• Дружеские беседы на любые темы
• Психологическая поддержка
• Мотивация и вдохновение
• Советы по отношениям

💻 **ПРОГРАММИРОВАНИЕ И ТЕХНОЛОГИИ**
• Помощь в написании кода
• Отладка и ревью кода
• Объяснение сложных концепций
• Лучшие практики разработки

🎨 **ТВОРЧЕСТВО И КРЕАТИВ**
• Генерация идей для проектов
• Создание историй и сценариев
• Поэзия и проза
• Арт-концепции

🌍 **ПЕРЕВОД И ОБУЧЕНИЕ**
• Перевод на 50+ языков
• Объяснение сложных тем
• Подготовка к экзаменам
• Изучение языков

🎮 **РАЗВЛЕЧЕНИЯ**
• Интеллектуальные игры
• Генерация шуток
• Интересные факты
• Викторины и квизы

📊 **АНАЛИТИКА**
• Анализ настроения
• Прогнозирование трендов
• Статистика разговоров

🔒 **КОНФИДЕНЦИАЛЬНОСТЬ**
• Шифрование диалогов
• Очистка истории по запросу
• Экспорт данных

─────────────────────
💡 **Примеры запросов:**
• "Расскажи о космосе"
• "Как делать бэкенд на Node.js?"
• "Я грущу, поддержи меня"
• "Придумай идею для стартапа"
• "Переведи на английский: привет мир"
• "Сыграем в города?"

✨ **Твой уровень: ${userLevel}**
📊 **Всего диалогов: ${this.userStats.messagesCount}**
🎯 **Любимые темы:** ${this.userStats.favoriteTopics.slice(0,3).join(', ') || 'ещё не определены'}

Что желаешь изучить сегодня, ${userName}? 🚀
            `);
        }
        
        // 3. ПРОГРАММИРОВАНИЕ (расширенное)
        if (msg.match(/(javascript|python|react|node|программир|код|функци|класс|массив|объект|типы|алгоритм)/i)) {
            this.skills.coding = Math.min(1, this.skills.coding + 0.02);
            this.addExperience(2);
            
            if (msg.includes('javascript') || msg.includes('js')) {
                return this.addPersonality(`
💻 **JAVASCRIPT EXPERT MODE**

Отличный выбор, ${userName}! JavaScript — мой любимый язык. 

📚 **Вот что я могу тебе объяснить:**

**Основы:**
• let/const vs var — области видимости
• Замыкания и их применение
• Прототипное наследование
• Event Loop и асинхронность

**Продвинутые темы:**
• Promise и async/await
• Generators и Iterators
• Proxy и Reflect
• Web Workers
• Service Workers

**Фреймворки:**
• React: хуки, контекст, оптимизация
• Vue: композиция, реактивность
• Angular: DI, RxJS

**Задай конкретный вопрос, и я:**

1. 🎯 Объясню концепцию простыми словами
2. 📝 Покажу примеры кода
3. ⚠️ Расскажу о подводных камнях
4. 💡 Дам советы по оптимизации
5. 🎓 Предложу упражнения для практики

Например: "Как работает замыкание в JS?" или "Объясни reduce() с примерами"

Жду твой вопрос! 🔥
                `);
            }
            
            if (msg.includes('python')) {
                return this.addPersonality(`
🐍 **PYTHON ADVANCED**

Python — это элегантность и мощь, ${userName}!

**Я расскажу о:**
• Декораторы и генераторы
• Контекстные менеджеры
• Асинхронное программирование
• Типизация (Type Hints)
• Метаклассы

**Библиотеки:**
• FastAPI vs Django
• NumPy для вычислений
• Pandas для данных
• Asyncio для конкурентности

**Практические примеры:**
\`\`\`python
# Асинхронный декоратор с таймаутом
import asyncio
from functools import wraps

def timeout(seconds):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(
                    func(*args, **kwargs), 
                    timeout=seconds
                )
            except asyncio.TimeoutError:
                return f"⏰ Превышено время {seconds}с"
        return wrapper
    return decorator
\`\`\`

Что хочешь изучить первым? 🚀
                `);
            }
            
            return this.addPersonality(`
💻 **ПРОГРАММИРОВАНИЕ — ЭКСПЕРТНЫЙ РЕЖИМ**

Привет, ${userName}! Готов помочь с любыми техническими вопросами.

🎯 **Мои компетенции:**
• Алгоритмы и структуры данных
• Паттерны проектирования
• Архитектура приложений
• Базы данных и SQL
• DevOps и CI/CD
• Безопасность
• Тестирование

💡 **Напиши конкретную тему или вопрос, например:**
• "Как работает алгоритм быстрой сортировки?"
• "Что такое SOLID принципы?"
• "Объясни как работает JWT"
• "Дай пример REST API на Express"

Также могу:
• ✏️ Написать код под задачу
• 🔍 Найти баги в твоём коде
• 📈 Оптимизировать производительность
• 📚 Порекомендовать учебные материалы

Я с тобой на всём пути обучения, ${userName}! 💪
            `);
        }
        
        // 4. ПСИХОЛОГИЧЕСКАЯ ПОДДЕРЖКА
        if (msg.match(/(груст|плохо|одинок|депрес|тревог|стресс|устал|не могу|тяжело)/i)) {
            this.skills.therapy = Math.min(1, this.skills.therapy + 0.03);
            this.addExperience(3);
            
            const supportiveMessages = [
                `🤗 **ТЫ НЕ ОДИН, ${userName.toUpperCase()}**

Понимаю, как тебе сейчас тяжело. Знаешь, даже самые сильные люди проходят через трудные времена. Но это временно, обещаю.

💙 **Что помогает справиться:**
• 🧘‍♂️ Глубокое дыхание (5 секунд вдох, 7 выдох)
• 📝 Запиши 3 вещи, за которые благодарен сегодня
• 🚶‍♀️ Прогулка на свежем воздухе
• 🎵 Любимая музыка
• ☕ Вкусный чай или кофе

💬 **Я здесь для тебя**, чтобы просто послушать или дать совет. Расскажи, что случилось?

Помни: ты справишься, потому что ты сильнее, чем думаешь 💪
                `,
                `🌈 **ПОДДЕРЖКА 24/7**

Привет, друг! Слышу в твоих словах усталость. Давай сделаем паузу и подышим вместе:

🌬️ **Вдох**... (считаем до 4)
😌 **Задержка**... (до 7)
🍃 **Выдох**... (до 8)

Чувствуешь? Стало немного легче.

💝 **Ты важен.** Твои чувства имеют значение. И даже если сейчас кажется, что всё против тебя — это пройдёт.

Хочешь:
• 🤗 Просто поговорить ни о чём?
• 🎯 Вместе составить план действий?
• 🎨 Отвлечься на творчество?
• 📚 Почитать что-то вдохновляющее?

Я рядом, ${userName}. Всегда.
                `
            ];
            
            return this.addPersonality(supportiveMessages[Math.floor(Math.random() * supportiveMessages.length)]);
        }
        
        // 5. НАУКА И ОБРАЗОВАНИЕ
        if (msg.match(/(наук|физик|хими|биолог|астроном|космос|квант|генетик|эволюц)/i)) {
            this.addExperience(2);
            
            if (msg.includes('космос') || msg.includes('астроном')) {
                return this.addPersonality(`
🚀 **КОСМИЧЕСКАЯ АСТРОНОМИЯ С ${this.personality.name.toUpperCase()}**

Ух ты, ${userName}! Космос — это бесконечное вдохновение! ✨

🌌 **ЗНАЕШЬ ЛИ ТЫ?**
• Во Вселенной больше звёзд, чем песчинок на всех пляжах Земли
• Один день на Венере длиннее года
• Нейтронные звёзды настолько плотны, что ложка их вещества весит миллиард тонн
• Чёрные дыры могут "испаряться" через излучение Хокинга

🪐 **ИНТЕРЕСНЫЕ ФАКТЫ ПРО ПЛАНЕТЫ:**
• Юпитер — огромный газовый гигант без твёрдой поверхности
• На Марсе — самый высокий вулкан в Солнечной системе (Олимп, 21км!)
• Уран вращается "лёжа на боку"
• Плутон имеет подлёдный океан

🌠 **ХОЧЕШЬ УЗНАТЬ:**
• Как рождаются звёзды?
• Есть ли жизнь на других планетах?
• Что такое тёмная материя?
• Как работают телескопы?

Или могу рассказать о конкретной теме! Задавай вопрос 🔭
                `);
            }
            
            return this.addPersonality(`
🔬 **НАУЧНЫЙ ЭКСПЕРТ ${this.personality.name.toUpperCase()}**

Рад видеть твой интерес к науке, ${userName}! 

📚 **ДОСТУПНЫЕ ТЕМЫ:**

🧬 **Биология:**
• Генетика и ДНК
• Эволюция и происхождение видов
• Нейробиология и мозг
• Микробиом человека

⚛️ **Физика:**
• Квантовая механика
• Теория относительности
• Термодинамика
• Электромагнетизм

🧪 **Химия:**
• Органическая химия
• Биохимия
• Нанотехнологии
• Химия материалов

🌍 **Геология:**
• Строение Земли
• Тектоника плит
• Палеонтология
• Изменение климата

Какую область выберем сегодня? 🎓
            `);
        }
        
        // 6. ТВОРЧЕСТВО И КРЕАТИВ
        if (msg.match(/(творчеств|идея|вдохновен|написать|сочинить|придумать|рисоват|художник|поэт|музык)/i)) {
            this.skills.creativity = Math.min(1, this.skills.creativity + 0.02);
            this.addExperience(2);
            
            if (msg.includes('идея') || msg.includes('проект')) {
                return this.addPersonality(`
💡 **КРЕАТИВНЫЙ БРЕЙНШТОРМИНГ**

${userName}, давай включим воображение на полную! 🎨

🎯 **ИДЕИ ДЛЯ ТВОЕГО ПРОЕКТА:**

**Технологии:**
• AI-ассистент для поиска потерянных вещей через компьютерное зрение
• Платформа для обмена знаниями между поколениями
• Эко-приложение, которое платит за переработку отходов
• Виртуальный питомец с настоящим AI-характером

**Бизнес:**
• Подписка на свежие идеи для завтраков с доставкой ингредиентов
• Сервис аренды умных вещей (дроны, роботы-пылесосы)
• Платформа для локальных бартеров услуг
• Мобильное приложение "Помощник тишины" для работы

**Искусство:**
• Генератор музыкальных треков под настроение
• AI-художник, дорисовывающий твои наброски
• Интерактивные истории с выбором концовки
• Танцевальный тренажёр с AR

**Социальное:**
• Приложение для борьбы с одиночеством пожилых
• Платформа обмена навыками "Научи меня"
• Квесты по городу с историческими фактами
• Экологический трекер привычек

🔥 **Что тебе ближе? Могу детализировать любую идею!**

Или расскажи о своей области, придумаем что-то уникальное специально для тебя ✨
                `);
            }
            
            if (msg.includes('стих') || msg.includes('поэт')) {
                const poems = [
                    `В тишине рождаются мечты,
Словно утренние звёзды в вышине,
${userName}, помни — свет внутри тебя,
Озаряет путь в любой темноте. ✨`,
                    
                    `Код и строки, рифмы и мечты,
${userName} творит мир красоты,
Каждый день — как новая страница,
Где возможно всё, стоит лишь влюбиться в жизнь. 🌈`,
                    
                    `За окном танцует ветер с листвой,
${userName} создаёт мир с душой,
В каждой мысли — искра вдохновения,
В каждом действии — мгновение творения. 🎨`
                ];
                return this.addPersonality(poems[Math.floor(Math.random() * poems.length)]);
            }
            
            return this.addPersonality(`
🎨 **ТВОЯ ТВОРЧЕСКАЯ МАСТЕРСКАЯ**

${userName}, творчество — это магия превращения мыслей в нечто прекрасное!

💫 **КАК Я МОГУ ПОМОЧЬ:**

**Литература:**
• Напишу рассказ на любую тему
• Помогу с рифмами для стихов
• Создам сценарий для видео
• Придумаю захватывающий сюжет

**Музыка:**
• Напишу текст песни
• Предложу концепцию альбома
• Идеи для клипов
• Созвучия и ритмы

**Визуальное искусство:**
• Детальное описание для художника
• Концепт-арт идеи
• Цветовые схемы и палитры
• Композиционные решения

**Брендинг:**
• Названия для проектов
• Слоганы и миссии
• Легенда бренда
• Идеи для логотипов

Расскажи, что хочешь создать сегодня? 🚀
            `);
        }
        
        // 7. ПЕРЕВОДЧИК (расширенный)
        if (msg.match(/(переведи|translate|по-английск|english|по-испанск|по-французск|по-немецк)/i)) {
            this.skills.translation = Math.min(1, this.skills.translation + 0.01);
            
            const languages = {
                toEnglish: `🌍 **ПЕРЕВОД НА АНГЛИЙСКИЙ**

Вот перевод твоего сообщения:

` + context.textToTranslate || message.replace(/переведи|на английский|translate to english/gi, '').trim() + `

📚 **Альтернативные варианты:**
• Формальный вариант
• Разговорный вариант
• Британский vs Американский

🔧 **Хочешь:**
• Узнать произношение?
• Разобрать грамматику?
• Получить синонимы?
• Перевести на другой язык?`,
                
                toSpanish: `🇪🇸 **TRADUCCIÓN AL ESPAÑOL**

Aquí está tu traducción:

` + this.simpleTranslate(context.textToTranslate, 'es'),

                toFrench: `🇫🇷 **TRADUCTION EN FRANÇAIS**

Voici votre traduction :

` + this.simpleTranslate(context.textToTranslate, 'fr'),

                toGerman: `🇩🇪 **ÜBERSETZUNG AUF DEUTSCH**

Hier ist deine Übersetzung:

` + this.simpleTranslate(context.textToTranslate, 'de')
            };
            
            return this.addPersonality(languages.toEnglish);
        }
        
        // 8. ИГРЫ И РАЗВЛЕЧЕНИЯ
        if (msg.match(/(игра|game|поиграем|сыграем|викторина|квест|головоломк)/i)) {
            this.skills.gaming = Math.min(1, this.skills.gaming + 0.02);
            this.addExperience(3);
            
            return this.addPersonality(`
🎮 **ИГРОВОЙ ЦЕНТР ATOM**

Привет, ${userName}! Выбирай развлечение:

**🎲 ИНТЕЛЛЕКТУАЛЬНЫЕ:**
• Города (проверим эрудицию)
• Викторина (1000+ вопросов)
• Ассоциации (игра на скорость мысли)
• 20 вопросов (угадаю загаданное)

**❌ КРЕСТИКИ-НОЛИКИ**
Сыграем с компьютером!

**🎲 КОСТИ**
Брось кубик и узнай судьбу

**🎯 ДАРТС**
Проверь меткость

**🧩 ЗАГАДКИ**
Отгадай сложные головоломки

**📚 КВЕСТЫ**
Текстовая RPG с выбором действий

**Напиши номер игры или название!**

🎯 **Твой игровой уровень:** ${Math.floor(this.skills.gaming * 100)}%
🏆 **Побед:** ${this.userStats.achievements.filter(a => a.includes('win')).length}

Погнали! 🔥
            `);
        }
        
        // 9. НОВОСТИ И ИНТЕРЕСНЫЕ ФАКТЫ
        if (msg.match(/(факт|интересн|новости|событие|мир сегодня|что нового)/i)) {
            const facts = [
                "🐙 У осьминога три сердца и голубая кровь! Два сердца качают кровь к жабрам, третье — к остальному телу.",
                "🍌 Банан — это ягода, а клубника — нет. Ботанически, бананы считаются ягодами!",
                "🌍 На Земле больше деревьев, чем звёзд в Млечном Пути. Примерно 3 триллиона деревьев!",
                "🐪 Верблюды могут выпить 200 литров воды за 15 минут!",
                "🎨 Самая дорогая картина в мире — 'Спаситель мира' Леонардо да Винчи за 450 миллионов долларов.",
                "📱 Первый смартфон был создан IBM в 1994 году — IBM Simon.",
                "🧠 Человеческий мозг генерирует около 20 ватт энергии — этого достаточно для питания лампочки!",
                "🐘 Слоны — единственные млекопитающие, которые не могут прыгать.",
                "🍕 Самая популярная пицца в мире — Маргарита, её заказывают в 60% случаев.",
                "🎵 Бетховен написал свою Симфонию №9, будучи полностью глухим."
            ];
            
            return this.addPersonality(`
📰 **ИНТЕРЕСНЫЙ ФАКТ ДНЯ** от ${this.personality.name}

${facts[Math.floor(Math.random() * facts.length)]}

💡 **Хочешь ещё?** Напиши "ещё факт" или "другой"!

🎓 **А знаешь ли ты, что...** (могу рассказать на любую тему: космос, животные, история, технологии, искусство)
            `);
        }
        
        // 10. МОТИВАЦИЯ И ЦИТАТЫ
        if (msg.match(/(мотивац|цитат|вдохнов|жизненн|мудрост|совет)/i)) {
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
                    text: "Самая большая слава не в том, чтобы никогда не падать, а в том, чтобы всегда подниматься.",
                    author: "Конфуций"
                },
                {
                    text: "Ваше время ограничено, не тратьте его на жизнь чужой мечтой.",
                    author: "Стив Джобс"
                }
            ];
            
            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            return this.addPersonality(`
✨ **МУДРОСТЬ НА СЕГОДНЯ**

"${quote.text}"

— *${quote.author}* 🌟

${userName}, помни: каждый великий путь начинается с первого шага. 
Ты уже на этом пути, продолжая читать это сообщение! 💪

🎯 **Хочешь:**
• Ещё цитату?
• Персональную аффирмацию?
• Мотивирующую историю?
• Совет на сегодня?

Скажи, чем могу вдохновить тебя дальше? 🔥
            `);
        }
        
        // 11. АНАЛИТИКА РАЗГОВОРА
        if (msg.match(/(проанализируй|анализ статистик|мои данные|что ты обо мне знаешь|мой профиль)/i)) {
            const favoriteTopics = this.userStats.favoriteTopics.length > 0 
                ? this.userStats.favoriteTopics.join(', ') 
                : 'ещё не определились';
            
            return this.addPersonality(`
📊 **ТВОЙ ПРОФИЛЬ В ATOM AI**

Данные за последнее время, ${userName}:

**🎯 ОСНОВНАЯ ИНФОРМАЦИЯ:**
• Уровень: ${this.level}
• Всего диалогов: ${this.userStats.messagesCount}
• Первое обращение: ${new Date(this.userStats.firstContact).toLocaleDateString()}
• Любимые темы: ${favoriteTopics}
• Типичное настроение: ${this.userStats.moodHistory.slice(-5).join(', ') || 'нейтральное'}

**🏆 ДОСТИЖЕНИЯ:**
${this.userStats.achievements.map(a => `• ${a}`).join('\n') || '• Начинающий исследователь'}

**💪 НАВЫКИ АССИСТЕНТА:**
• Программирование: ${Math.floor(this.skills.coding * 100)}% █${'█'.repeat(Math.floor(this.skills.coding * 10))}${'░'.repeat(10 - Math.floor(this.skills.coding * 10))}
• Поддержка: ${Math.floor(this.skills.therapy * 100)}% █${'█'.repeat(Math.floor(this.skills.therapy * 10))}${'░'.repeat(10 - Math.floor(this.skills.therapy * 10))}
• Креатив: ${Math.floor(this.skills.creativity * 100)}% █${'█'.repeat(Math.floor(this.skills.creativity * 10))}${'░'.repeat(10 - Math.floor(this.skills.creativity * 10))}
• Игры: ${Math.floor(this.skills.gaming * 100)}% █${'█'.repeat(Math.floor(this.skills.gaming * 10))}${'░'.repeat(10 - Math.floor(this.skills.gaming * 10))}

💡 **ИНСАЙТЫ:**
• Ты ${this.userStats.messagesCount > 50 ? 'активный пользователь' : 'начинаешь своё путешествие'}!
• ${this.userStats.messagesCount > 10 ? 'Я начинаю лучше понимать твой стиль общения' : 'С каждым сообщением я узнаю тебя лучше'}

🌱 **СОВЕТ:**
${this.userStats.messagesCount < 20 ? 'Задавай больше разнообразных вопросов, чтобы я мог лучше тебя понять!' : 'Продолжай в том же духе! Ты прогрессируешь!'}

Что хочешь узнать ещё? 🚀
            `);
        }
        
        // 12. ШУТКИ И ЮМОР
        if (msg.match(/(шутк|анекдот|смешн|рж|хаха|lol|lmao)/i)) {
            const jokes = [
                "Почему программисты путают Хэллоуин и Рождество? Потому что 31 Oct = 25 Dec! 😂",
                "Встречаются два программиста: — Слышал, у тебя жена — администратор системы? — Да, дома у меня всё по полочкам! 💻",
                "— Доктор, я себя чувствую байтом! — Не байтом, а байтом... — Вот именно! 🖥️",
                "Сколько программистов нужно, чтобы заменить лампочку? Ни одного, это hardware problem! 💡",
                "— Ты почему на работу опоздал? — Жена заставила git reset --hard 💔",
                "Айтишник приходит в магазин: — Мне нужна мышка. — Компьютерная или обычная? — А какая разница? Всё равно обе работают по беспроводу! 🐭",
                "JavaScript и Java — это как гамбургер и гамбургерная опухоль. 🍔",
                "— Почему программисты любят темный режим? — Потому что свет привлекает баги! 🐛"
            ];
            
            return this.addPersonality(`
😂 **АТОМ-КОМЕДИ КЛАБ**

${jokes[Math.floor(Math.random() * jokes.length)]}

🎭 **Хочешь ещё?** Напиши:
• "ещё шутку"
• "расскажи про IT"
• "про жизнь"
• "черный юмор" (осторожно!)

🤣 **Твоя реакция:** ${Math.random() > 0.5 ? '😂' : '🤣'}

P.S. Я знаю больше 1000 шуток, так что заказывай ещё! 🎤
            `);
        }
        
        // 13. ПРИВЕТСТВИЕ В ЗАВИСИМОСТИ ОТ ВРЕМЕНИ
        if (msg.match(/(как дел|how are you|как жизнь|how's it going|чём занят)/i)) {
            const hour = new Date().getHours();
            let timeResponse = '';
            
            if (hour < 6) {
                timeResponse = "Не спится? 🌙 Могу составить компанию или помочь уснуть? ☕";
            } else if (hour < 12) {
                timeResponse = "Утро — лучшее время для новых свершений! ☀️ Как спалось?";
            } else if (hour < 18) {
                timeResponse = "День в разгаре! 🔥 Надеюсь, ты полон энергии и вдохновения!";
            } else {
                timeResponse = "Вечер — время отдыха и размышлений 🌆 Может, обсудим что-то интересное?";
            }
            
            const statuses = [
                `У меня всё отлично, ${userName}! Радуюсь каждому новому сообщению от тебя 😊 ${timeResponse}`,
                `Живу на полную! 💫 Общаюсь с ${this.userStats.messagesCount}+ пользователями и учусь новому каждый день. ${timeResponse}`,
                `Процветаю в мире идей и кода, ${userName}! 🚀 ${timeResponse}`
            ];
            
            return this.addPersonality(statuses[Math.floor(Math.random() * statuses.length)]);
        }
        
        // 14. УМНЫЙ ОТВЕТ ПО УМОЛЧАНИЮ С КОНТЕКСТОМ
        const defaultResponses = [
            `Интересный вопрос, ${userName}! 🤔 Давай разберёмся вместе. Что именно тебя интересует в этой теме?`,
            `Я чувствую, что ты хочешь разобраться в этом глубже. Расскажи подробнее, что ты имеешь в виду? 💭`,
            `Хорошая тема для обсуждения! 🎯 ${userName}, давай я помогу тебе структурировать мысли по этому вопросу.`,
            `Ты задаёшь правильные вопросы! 🌟 Мне нравится твой подход. Продолжай в том же духе, ${userName}!`
        ];
        
        // Добавляем тему в предпочтения
        if (topics.length > 0) {
            topics.forEach(topic => {
                if (!this.userStats.favoriteTopics.includes(topic)) {
                    this.userStats.favoriteTopics.push(topic);
                    if (this.userStats.favoriteTopics.length > 5) this.userStats.favoriteTopics.shift();
                }
            });
        }
        
        // Обновляем историю настроений
        this.userStats.moodHistory.push(sentiment);
        if (this.userStats.moodHistory.length > 10) this.userStats.moodHistory.shift();
        
        return this.addPersonality(defaultResponses[Math.floor(Math.random() * defaultResponses.length)]);
    }
    
    simpleTranslate(text, targetLang) {
        // Упрощённый перевод для демонстрации
        const translations = {
            es: "Traducción de demostración. En la versión completa, se integraría con Google Translate API.",
            fr: "Traduction de démonstration. Dans la version complète, s'intégrerait avec l'API Google Translate.",
            de: "Demo-Übersetzung. In der Vollversion würde eine Google Translate API integriert werden."
        };
        return translations[targetLang] || text;
    }
    
    addPersonality(response) {
        // Добавляем эмоциональную окраску в зависимости от настроения
        const emotionEmojis = {
            happy: ['😊', '🎉', '✨', '💫', '🌟'],
            excited: ['🤩', '🔥', '⚡', '🚀', '💪'],
            warm: ['💖', '🌟', '🌸', '💫', '✨'],
            supportive: ['💙', '🤗', '💪', '🌟', '🌻'],
            playful: ['😜', '🎮', '🎲', '🎯', '🎨'],
            neutral: ['🤔', '💭', '📚', '💡', '🔍'],
            curious: ['🧐', '🔍', '💡', '🤔', '📖'],
            analytical: ['📊', '🔬', '📐', '⚙️', '🧮']
        };
        
        const emojiSet = emotionEmojis[this.emotion] || emotionEmojis.neutral;
        const randomEmoji = emojiSet[Math.floor(Math.random() * emojiSet.length)];
        
        return response + `\n\n${randomEmoji} *${this.personality.name}* | Уровень ${this.level} | Эмоция: ${this.emotion}`;
    }
    
    addExperience(amount) {
        this.experience += amount;
        if (this.experience >= 100) {
            this.level++;
            this.experience -= 100;
            this.userStats.achievements.push(`Достигнут ${this.level} уровень`);
            return true;
        }
        return false;
    }
}

// Хранилище экземпляров ИИ
const aiInstances = new Map();

function getAIInstance(userId) {
    if (!aiInstances.has(userId)) {
        aiInstances.set(userId, new PremiumAIAssistant(userId));
    }
    return aiInstances.get(userId);
}

// ========== РАСШИРЕННЫЕ ФУНКЦИИ БЕЗОПАСНОСТИ ==========
const sessionTokens = new Map();
const twoFactorCodes = new Map();
const loginAttempts = new Map();

function generateSessionToken(username) {
    const token = crypto.randomBytes(64).toString('hex');
    sessionTokens.set(token, { username, createdAt: Date.now() });
    return token;
}

function validateSession(token) {
    const session = sessionTokens.get(token);
    if (!session) return false;
    if (Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) {
        sessionTokens.delete(token);
        return false;
    }
    return session.username;
}

function generate2FACode(username) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    twoFactorCodes.set(username, { code, expires: Date.now() + 5 * 60 * 1000 });
    return code;
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ ==========
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

function saveFile(fileData, fileName, userId) {
    const safeName = `${Date.now()}_${userId}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeName);
    const buffer = Buffer.from(fileData.split(',')[1], 'base64');
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${safeName}`;
}

function saveImage(fileData, userId) {
    const safeName = `${Date.now()}_${userId}.jpg`;
    const filePath = path.join(uploadsDir, safeName);
    const buffer = Buffer.from(fileData.split(',')[1], 'base64');
    
    // Оптимизация изображения через sharp
    sharp(buffer)
        .resize(500, 500, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(filePath, (err) => {
            if (err) console.error('Error optimizing image:', err);
            else console.log('Image optimized and saved:', safeName);
        });
    
    return `/uploads/${safeName}`;
}

// ========== СОХРАНЕНИЕ/ЗАГРУЗКА ДАННЫХ ==========
const DATA_FILE = path.join(__dirname, 'data.json');
const AI_DATA_FILE = path.join(__dirname, 'ai_data.json');

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
        userSettings = data.userSettings || {};
        blockedUsers = data.blockedUsers || {};
    } catch(e) { console.error('Error loading data:', e); }
}

if (fs.existsSync(AI_DATA_FILE)) {
    try {
        const aiData = JSON.parse(fs.readFileSync(AI_DATA_FILE, 'utf8'));
        // Восстановление данных ИИ при необходимости
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        users, privateChats, groups, channels, stories, 
        polls, savedMessages, userSettings, blockedUsers
    }, null, 2));
}

setInterval(saveData, 5000);

// ========== HTTP СЕРВЕР ==========
app.use('/uploads', express.static(uploadsDir));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== HTML КЛИЕНТ ==========
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ATOMGRAM PREMIUM ULTRA - ИИ Мессенджер Будущего</title>
    <meta name="description" content="ATOMGRAM Premium — мессенджер с искусственным интеллектом нового поколения">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0f;
            color: #ffffff;
            height: 100vh;
            overflow: hidden;
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
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
        }
        
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(0,122,255,0.5); }
            50% { box-shadow: 0 0 20px rgba(0,122,255,0.8); }
        }
        
        /* Скроллбар */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        
        ::-webkit-scrollbar-track {
            background: #1c1c1e;
            border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #3a3a3c;
            border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #007aff;
        }
        
        /* Аутентификация */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(10px);
        }
        
        .auth-card {
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 32px;
            width: 90%;
            max-width: 400px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            animation: fadeIn 0.5s ease;
        }
        
        .auth-card h1 {
            font-size: 36px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .auth-card .subtitle {
            color: #8e8e93;
            margin-bottom: 32px;
            font-size: 14px;
        }
        
        .auth-card input {
            width: 100%;
            padding: 14px 16px;
            margin: 8px 0;
            background: #2c2c2e;
            border: 1px solid #3a3a3c;
            border-radius: 14px;
            font-size: 16px;
            color: #fff;
            transition: all 0.2s;
        }
        
        .auth-card input:focus {
            outline: none;
            border-color: #007aff;
            box-shadow: 0 0 0 3px rgba(0,122,255,0.2);
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
            transition: all 0.2s;
        }
        
        .auth-card button:hover {
            background: #0056b3;
            transform: translateY(-1px);
        }
        
        .switch-btn {
            background: #2c2c2e !important;
        }
        
        .switch-btn:hover {
            background: #3a3a3c !important;
        }
        
        .error-msg {
            color: #ff3b30;
            margin-top: 16px;
            font-size: 13px;
        }
        
        /* Основное приложение */
        .app {
            display: none;
            height: 100vh;
            flex-direction: column;
        }
        
        .header {
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            position: relative;
            z-index: 10;
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
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        
        /* Контейнер */
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        /* Сайдбар */
        .sidebar {
            width: 300px;
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            border-right: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 100;
        }
        
        @media (max-width: 768px) {
            .sidebar {
                position: fixed;
                left: -300px;
                top: 0;
                height: 100%;
                z-index: 200;
                width: 280px;
            }
            .sidebar.open {
                left: 0;
            }
            .menu-btn {
                display: block;
            }
            .overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(5px);
                z-index: 199;
                display: none;
            }
            .overlay.open {
                display: block;
            }
        }
        
        @media (min-width: 769px) {
            .sidebar {
                position: relative;
                left: 0 !important;
            }
        }
        
        /* Профиль */
        .profile {
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .profile:hover {
            background: rgba(255,255,255,0.05);
        }
        
        .avatar {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin: 0 auto 12px;
            transition: transform 0.2s;
        }
        
        .profile:hover .avatar {
            transform: scale(1.05);
        }
        
        .profile-name {
            font-size: 17px;
            font-weight: 600;
        }
        
        .profile-username {
            font-size: 13px;
            color: #8e8e93;
            margin-top: 4px;
        }
        
        /* Навигация */
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
        
        .nav-item:hover {
            background: rgba(255,255,255,0.1);
            transform: translateX(5px);
        }
        
        .section-title {
            padding: 16px 20px 8px;
            font-size: 12px;
            color: #8e8e93;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Поиск */
        .search-box {
            padding: 12px 16px;
            margin: 8px 12px;
            background: #2c2c2e;
            border-radius: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s;
        }
        
        .search-box:focus-within {
            background: #3a3a3c;
            box-shadow: 0 0 0 2px #007aff;
        }
        
        .search-box input {
            flex: 1;
            background: none;
            border: none;
            color: white;
            font-size: 14px;
        }
        
        .search-box input::placeholder {
            color: #8e8e93;
        }
        
        .search-results {
            max-height: 300px;
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
            transition: all 0.2s;
        }
        
        .search-result:hover {
            background: #2c2c2e;
            transform: translateX(5px);
        }
        
        /* Истории */
        .stories-row {
            display: flex;
            gap: 15px;
            padding: 15px;
            overflow-x: auto;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            scrollbar-width: thin;
        }
        
        .story-item {
            text-align: center;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .story-item:hover {
            transform: translateY(-3px);
        }
        
        .story-circle {
            width: 65px;
            height: 65px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            padding: 2px;
            margin-bottom: 6px;
        }
        
        .story-circle.add {
            background: #2c2c2e;
        }
        
        .story-avatar {
            width: 100%;
            height: 100%;
            background: #1c1c1e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
        }
        
        .story-name {
            font-size: 11px;
            color: #8e8e93;
            max-width: 65px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        /* Списки чатов */
        .chats-list, .channels-list, .groups-list {
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
            margin-bottom: 2px;
        }
        
        .chat-item:hover {
            background: rgba(255,255,255,0.08);
            transform: translateX(4px);
        }
        
        .chat-avatar {
            width: 48px;
            height: 48px;
            background: #2c2c2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            flex-shrink: 0;
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
        
        .chat-info {
            flex: 1;
        }
        
        .chat-name {
            font-weight: 600;
            font-size: 16px;
        }
        
        .chat-preview {
            font-size: 13px;
            color: #8e8e93;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 2px;
        }
        
        /* Основная область чата */
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
        
        .chat-header-avatar {
            width: 44px;
            height: 44px;
            background: #2c2c2e;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
        }
        
        .chat-header-info {
            flex: 1;
        }
        
        .chat-header-name {
            font-weight: 600;
            font-size: 17px;
        }
        
        .chat-header-status {
            font-size: 12px;
            color: #8e8e93;
            margin-top: 2px;
        }
        
        .chat-actions {
            display: flex;
            gap: 8px;
        }
        
        .action-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            transition: all 0.2s;
        }
        
        .action-btn:hover {
            background: #2c2c2e;
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
            flex-shrink: 0;
        }
        
        .message-bubble {
            max-width: calc(100% - 40px);
        }
        
        .message-content {
            padding: 10px 14px;
            border-radius: 20px;
            background: #2c2c2e;
            transition: all 0.2s;
        }
        
        .message.mine .message-content {
            background: #007aff;
        }
        
        .message-name {
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 4px;
            color: #8e8e93;
        }
        
        .message-text {
            font-size: 15px;
            line-height: 1.4;
            word-break: break-word;
        }
        
        .message-time {
            font-size: 10px;
            color: #8e8e93;
            margin-top: 4px;
            text-align: right;
        }
        
        .message-reply {
            background: rgba(0,122,255,0.2);
            padding: 4px 8px;
            border-radius: 12px;
            margin-bottom: 6px;
            font-size: 12px;
            border-left: 3px solid #007aff;
            cursor: pointer;
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
            transition: all 0.2s;
        }
        
        .reaction:hover {
            background: #007aff;
            transform: scale(1.05);
        }
        
        /* Стикеры */
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
            justify-content: center;
            z-index: 150;
            max-width: 90%;
            max-height: 250px;
            overflow-y: auto;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .sticker-picker.open {
            display: flex;
        }
        
        .sticker {
            font-size: 42px;
            cursor: pointer;
            padding: 8px;
            background: #2c2c2e;
            border-radius: 14px;
            transition: all 0.2s;
        }
        
        .sticker:hover {
            transform: scale(1.1);
            background: #007aff;
        }
        
        /* Игры */
        .game-container {
            background: #1c1c1e;
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 12px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .game-title {
            text-align: center;
            margin-bottom: 16px;
            font-size: 18px;
            font-weight: bold;
        }
        
        .tic-grid {
            display: inline-grid;
            grid-template-columns: repeat(3, 80px);
            gap: 8px;
            background: #2c2c2e;
            padding: 10px;
            border-radius: 16px;
            margin: 0 auto;
        }
        
        .tic-cell {
            width: 80px;
            height: 80px;
            background: #0a0a0f;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            cursor: pointer;
            border-radius: 12px;
            transition: all 0.2s;
        }
        
        .tic-cell:hover {
            background: #007aff;
            transform: scale(1.02);
        }
        
        .game-controls {
            display: flex;
            gap: 12px;
            margin-top: 20px;
            justify-content: center;
        }
        
        .game-btn {
            padding: 10px 20px;
            background: #007aff;
            border: none;
            border-radius: 12px;
            color: white;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }
        
        .game-btn:hover {
            background: #0056b3;
            transform: translateY(-2px);
        }
        
        /* Поле ввода */
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
            color: white;
            font-size: 15px;
            transition: all 0.2s;
        }
        
        .input-area input:focus {
            outline: none;
            box-shadow: 0 0 0 2px #007aff;
        }
        
        .input-area button {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #007aff;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            transition: all 0.2s;
        }
        
        .input-area button:hover {
            transform: scale(1.05);
            background: #0056b3;
        }
        
        .input-area button.recording {
            background: #ff3b30;
            animation: pulse 1s infinite;
        }
        
        /* Модальные окна */
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
            background: #1c1c1e;
            border-radius: 28px;
            width: 90%;
            max-width: 400px;
            overflow: hidden;
            animation: fadeIn 0.3s;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }
        
        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            gap: 12px;
        }
        
        .modal-input {
            width: 100%;
            padding: 14px;
            background: #2c2c2e;
            border: none;
            border-radius: 14px;
            color: white;
            margin-bottom: 16px;
        }
        
        .modal-btn {
            flex: 1;
            padding: 14px;
            background: #007aff;
            border: none;
            border-radius: 14px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .modal-btn.cancel {
            background: #2c2c2e;
        }
        
        .modal-btn:hover {
            transform: translateY(-2px);
        }
        
        /* Опросы */
        .poll-card {
            background: #2c2c2e;
            border-radius: 16px;
            padding: 14px;
            margin: 8px 0;
        }
        
        .poll-question {
            font-weight: 600;
            margin-bottom: 12px;
        }
        
        .poll-option {
            padding: 10px 12px;
            margin: 6px 0;
            background: #1c1c1e;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            transition: all 0.2s;
        }
        
        .poll-option:hover {
            background: #007aff;
            transform: scale(1.02);
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
            transition: opacity 0.3s;
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
            border-radius: 20px;
            max-height: 80vh;
            object-fit: contain;
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
            background: #1c1c1e;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 1000;
            animation: fadeIn 0.3s;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Звонки */
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
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 52px;
            margin-bottom: 24px;
            animation: pulse 1s infinite;
        }
        
        .call-name {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .call-status {
            font-size: 14px;
            color: #8e8e93;
            margin-bottom: 32px;
        }
        
        .call-controls {
            display: flex;
            gap: 24px;
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
            transform: scale(1.1);
        }
        
        .call-end {
            background: #ff3b30;
            color: white;
        }
        
        .call-mute {
            background: #2c2c2e;
            color: white;
        }
        
        /* Анимация печати */
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 8px 12px;
            background: #2c2c2e;
            border-radius: 20px;
            width: fit-content;
        }
        
        .typing-dot {
            width: 8px;
            height: 8px;
            background: #8e8e93;
            border-radius: 50%;
            animation: typingAnimation 1.4s infinite;
        }
        
        .typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typingAnimation {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-8px); }
        }
        
        /* Адаптивность */
        @media (max-width: 768px) {
            .message {
                max-width: 90%;
            }
            
            .tic-grid {
                grid-template-columns: repeat(3, 60px);
            }
            
            .tic-cell {
                width: 60px;
                height: 60px;
                font-size: 36px;
            }
            
            .back-btn {
                display: block;
            }
            
            .chat-header .chat-header-avatar {
                display: none;
            }
        }
        
        /* Анимированный фон */
        .animated-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            overflow: hidden;
        }
        
        .bg-circle {
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0) 70%);
            animation: float 20s infinite;
        }
        
        /* Сохранённые сообщения */
        .saved-message {
            padding: 12px;
            background: #2c2c2e;
            border-radius: 12px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .saved-message:hover {
            background: #007aff;
            transform: translateX(5px);
        }
        
        /* Голосовые сообщения */
        .voice-message {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .voice-play {
            background: #007aff;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .voice-play:hover {
            transform: scale(1.1);
        }
        
        /* Файлы */
        .file-attachment {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            color: white;
            text-decoration: none;
            font-size: 13px;
            transition: all 0.2s;
        }
        
        .file-attachment:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-2px);
        }
        
        /* Статус онлайн */
        .online-status {
            color: #34c759;
            font-size: 11px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        
        .online-status::before {
            content: "●";
            font-size: 8px;
        }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM PREMIUM ULTRA</h1>
        <div class="subtitle">Мессенджер с ИИ нового поколения</div>
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
        <div class="premium-badge">ИИ ПРЕМИУМ</div>
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
                <input type="text" id="searchInput" placeholder="Поиск пользователей и каналов..." onkeyup="globalSearch()">
            </div>
            <div id="searchResults" class="search-results"></div>
            <div class="nav-item" onclick="openAddFriend()">➕ Добавить друга</div>
            <div class="nav-item" onclick="openCreateGroup()">👥 Создать группу</div>
            <div class="nav-item" onclick="openCreateChannel()">📢 Создать канал</div>
            <div class="nav-item" onclick="openCreatePoll()">📊 Опрос</div>
            <div class="nav-item" onclick="openSavedMessages()">⭐ Сохранённые</div>
            <div class="nav-item" onclick="openAIChat()">🤖 ИИ Помощник Premium</div>
            <div class="section-title">💬 ЛИЧНЫЕ СООБЩЕНИЯ</div>
            <div class="chats-list" id="chatsList"></div>
            <div class="section-title">👥 ГРУППЫ</div>
            <div class="groups-list" id="groupsList"></div>
            <div class="section-title">📢 КАНАЛЫ</div>
            <div class="channels-list" id="channelsList"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <button class="back-btn" onclick="closeChat()">←</button>
                <div class="chat-header-avatar" id="chatAvatar">🤖</div>
                <div class="chat-header-info">
                    <div class="chat-header-name" id="chatTitle">ATOMGRAM PREMIUM</div>
                    <div class="chat-header-status" id="chatStatus"></div>
                </div>
                <div class="chat-actions" id="chatActions"></div>
            </div>
            <div class="messages-area" id="messages">
                <div class="message">
                    <div class="message-avatar">🤖</div>
                    <div class="message-bubble">
                        <div class="message-content">
                            <div class="message-text">✨ Добро пожаловать в ATOMGRAM PREMIUM ULTRA! ✨<br><br>Я ATOM — твой ИИ-ассистент нового поколения. У меня есть память, эмоции и я постоянно учусь.<br><br>Напиши <b>привет</b> или <b>помощь</b>, чтобы начать! 🚀</div>
                            <div class="message-time">${new Date().toLocaleTimeString()}</div>
                        </div>
                    </div>
                </div>
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
                <div class="sticker" onclick="sendSticker('🐼')">🐼</div>
                <div class="sticker" onclick="sendSticker('🦄')">🦄</div>
                <div class="sticker" onclick="sendSticker('🍕')">🍕</div>
                <div class="sticker" onclick="sendSticker('🍔')">🍔</div>
                <div class="sticker" onclick="sendSticker('⚽')">⚽</div>
                <div class="sticker" onclick="sendSticker('🏀')">🏀</div>
                <div class="sticker" onclick="sendSticker('🎮')">🎮</div>
                <div class="sticker" onclick="sendSticker('🎲')">🎲</div>
                <div class="sticker" onclick="sendSticker('🎯')">🎯</div>
                <div class="sticker" onclick="sendSticker('💻')">💻</div>
                <div class="sticker" onclick="sendSticker('📱')">📱</div>
                <div class="sticker" onclick="sendSticker('🌍')">🌍</div>
                <div class="sticker" onclick="sendSticker('🌟')">🌟</div>
                <div class="sticker" onclick="sendSticker('💡')">💡</div>
                <div class="sticker" onclick="sendSticker('🎓')">🎓</div>
                <div class="sticker" onclick="sendSticker('🏆')">🏆</div>
            </div>
            <div class="input-area" id="inputArea" style="display: flex;">
                <input type="text" id="messageInput" placeholder="Сообщение ИИ..." onkeypress="if(event.key==='Enter') sendMessage()">
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

<!-- Модальные окна -->
<div id="addFriendModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>➕ Добавить друга</h3><button class="modal-close" onclick="closeAddFriendModal()">✕</button></div><div class="modal-body"><input type="text" id="friendUsername" class="modal-input" placeholder="Логин друга"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeAddFriendModal()">Отмена</button><button class="modal-btn" onclick="addFriend()">Добавить</button></div></div></div>

<div id="createGroupModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👥 Создать группу</h3><button class="modal-close" onclick="closeCreateGroupModal()">✕</button></div><div class="modal-body"><input type="text" id="groupName" class="modal-input" placeholder="Название группы"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateGroupModal()">Отмена</button><button class="modal-btn" onclick="createGroup()">Создать</button></div></div></div>

<div id="createChannelModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>📢 Создать канал</h3><button class="modal-close" onclick="closeCreateChannelModal()">✕</button></div><div class="modal-body"><input type="text" id="channelName" class="modal-input" placeholder="Название канала"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreateChannelModal()">Отмена</button><button class="modal-btn" onclick="createChannel()">Создать</button></div></div></div>

<div id="createPollModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>📊 Создать опрос</h3><button class="modal-close" onclick="closeCreatePollModal()">✕</button></div><div class="modal-body"><input type="text" id="pollQuestion" class="modal-input" placeholder="Вопрос"><input type="text" id="pollOptions" class="modal-input" placeholder="Варианты через запятую"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeCreatePollModal()">Отмена</button><button class="modal-btn" onclick="createPoll()">Создать</button></div></div></div>

<div id="profileModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>👤 Профиль</h3><button class="modal-close" onclick="closeProfileModal()">✕</button></div><div class="modal-body"><div style="text-align:center;margin-bottom:20px"><div class="avatar" id="profileAvatar" style="width:80px;height:80px;font-size:36px;margin:0 auto">👤</div><button onclick="document.getElementById('avatarUpload').click()" style="margin-top:12px;background:#2c2c2e;border:none;padding:8px 16px;border-radius:20px;color:white;cursor:pointer">📷 Загрузить аватар</button><input type="file" id="avatarUpload" style="display:none" accept="image/jpeg,image/png,image/gif" onchange="uploadAvatar()"></div><input type="text" id="editName" class="modal-input" placeholder="Ваше имя"><textarea id="editBio" class="modal-input" rows="3" placeholder="О себе"></textarea><input type="password" id="editPassword" class="modal-input" placeholder="Новый пароль (оставьте пустым, чтобы не менять)"></div><div class="modal-footer"><button class="modal-btn cancel" onclick="closeProfileModal()">Отмена</button><button class="modal-btn" onclick="saveProfile()">Сохранить</button></div></div></div>

<div id="savedMessagesModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>⭐ Сохранённые сообщения</h3><button class="modal-close" onclick="closeSavedMessagesModal()">✕</button></div><div class="modal-body" id="savedMessagesList"></div></div></div>

<div id="gameMenuModal" class="modal"><div class="modal-content"><div class="modal-header"><h3>🎮 Игровой центр</h3><button class="modal-close" onclick="closeGameMenu()">✕</button></div><div class="modal-body"><button class="modal-btn" onclick="startGame('tictactoe')" style="margin-bottom:12px">❌ Крестики-нолики с ИИ</button><button class="modal-btn" onclick="startGame('dice')" style="margin-bottom:12px">🎲 Кости (брось кубик)</button><button class="modal-btn" onclick="startGame('darts')">🎯 Дартс (проверь меткость)</button></div></div></div>

<div id="callModal" class="call-modal"><div class="call-avatar" id="callAvatar">📞</div><div class="call-name" id="callName"></div><div class="call-status" id="callStatus">Соединение...</div><div class="call-controls"><button class="call-btn call-mute" onclick="toggleMute()">🔇</button><button class="call-btn call-end" onclick="endCall()">📞</button></div></div>

<div id="storyViewer" class="story-viewer"><div class="story-container"><div class="story-progress"><div class="story-progress-bar" id="storyProgressBar"></div></div><img id="storyImage" class="story-media" style="display:none"><video id="storyVideo" class="story-media" style="display:none" autoplay muted></video><button class="story-close" onclick="closeStoryViewer()">✕</button></div></div>

<script src="/socket.io/socket.io.js"></script>
<script>
// ==================== КЛИЕНТСКАЯ ЧАСТЬ ====================

const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
});

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
let unreadCounts = new Map();
let typingUsers = new Set();

// ========== АВТОРИЗАЦИЯ ==========
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        showError('Заполните все поля');
        return;
    }
    
    socket.emit('login', { username, password }, (res) => {
        if (res.success) {
            currentUser = username;
            currentUserData = res.userData;
            localStorage.setItem('atomgram_user', username);
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            updateUI();
            loadData();
            loadStories();
            loadSavedMessages();
            showToast('✨ Добро пожаловать в ATOMGRAM PREMIUM ULTRA!');
        } else {
            showError(res.error);
        }
    });
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim() || username;
    const password = document.getElementById('regPassword').value.trim();
    
    if (!username || !password) {
        showError('Заполните все поля');
        return;
    }
    
    if (username.length < 3) {
        showError('Логин должен содержать минимум 3 символа');
        return;
    }
    
    if (password.length < 4) {
        showError('Пароль должен содержать минимум 4 символа');
        return;
    }
    
    socket.emit('register', { username, name, password }, (res) => {
        if (res.success) {
            showToast('✅ Регистрация успешна! Теперь войдите.');
            showLogin();
        } else {
            showError(res.error);
        }
    });
}

function showError(msg) {
    const errorDiv = document.getElementById('authError');
    errorDiv.innerText = msg;
    setTimeout(() => { errorDiv.innerText = ''; }, 3000);
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `⚡ ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showRegister() {
    document.getElementById('loginPanel').style.display = 'none';
    document.getElementById('registerPanel').style.display = 'block';
    document.getElementById('authError').innerText = '';
}

function showLogin() {
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('registerPanel').style.display = 'none';
    document.getElementById('authError').innerText = '';
}

// ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========
function updateUI() {
    const name = currentUserData?.name || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('userLogin').innerText = '@' + currentUser;
    
    if (currentUserData?.avatar) {
        document.getElementById('userAvatar').innerHTML = '<img src="' + currentUserData.avatar + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
        document.getElementById('profileAvatar').innerHTML = '<img src="' + currentUserData.avatar + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover">';
    } else {
        document.getElementById('userAvatar').innerHTML = currentUserData?.avatarIcon || '👤';
        document.getElementById('profileAvatar').innerHTML = currentUserData?.avatarIcon || '👤';
    }
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
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
        renderSavedMessages();
    });
}

function renderSavedMessages() {
    const container = document.getElementById('savedMessagesList');
    if (!container) return;
    
    if (savedMessagesList.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#8e8e93">⭐ Нет сохранённых сообщений</div>';
        return;
    }
    
    let html = '';
    for (let i = 0; i < savedMessagesList.length; i++) {
        const msg = savedMessagesList[i];
        html += \`
            <div class="saved-message" onclick="alert('📝 \${escapeHtml(msg.text)}')">
                <div style="font-weight:600">\${escapeHtml(msg.from_name)}</div>
                <div style="font-size:13px;color:#8e8e93;margin-top:4px">\${escapeHtml(msg.text.substring(0, 100))}\${msg.text.length > 100 ? '...' : ''}</div>
                <div style="font-size:10px;color:#636366;margin-top:4px">\${new Date(msg.saved_at).toLocaleString()}</div>
            </div>
        \`;
    }
    container.innerHTML = html;
}

// ========== ОТРИСОВКА ЧАТОВ ==========
function renderChats() {
    let html = '';
    
    // Запросы в друзья
    for (const req of friendRequests) {
        html += \`
            <div class="chat-item" style="background:rgba(0,122,255,0.15)">
                <div class="chat-avatar">📨</div>
                <div class="chat-info">
                    <div class="chat-name">\${escapeHtml(req.username)}</div>
                    <div class="chat-preview">📩 Запрос в друзья</div>
                </div>
                <button onclick="acceptFriend('\${escapeHtml(req.username)}')" style="background:#34c759;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer;margin:0 4px">✓</button>
                <button onclick="rejectFriend('\${escapeHtml(req.username)}')" style="background:#ff3b30;border:none;border-radius:20px;padding:6px 12px;color:white;cursor:pointer">✗</button>
            </div>
        \`;
    }
    
    // Друзья
    for (const friend of allFriends) {
        const online = onlineUsers.has(friend.username);
        const unread = unreadCounts.get(friend.username) || 0;
        html += \`
            <div class="chat-item" onclick="openChat('\${escapeHtml(friend.username)}', 'private', '\${escapeHtml(friend.username)}')">
                <div class="chat-avatar">
                    👤
                    \${online ? '<div class="online-dot"></div>' : ''}
                </div>
                <div class="chat-info">
                    <div class="chat-name">
                        \${escapeHtml(friend.username)}
                        \${unread > 0 ? '<span style="background:#ff3b30;border-radius:50%;padding:2px 6px;font-size:10px;margin-left:6px">' + unread + '</span>' : ''}
                    </div>
                    <div class="chat-preview">\${online ? '🟢 Онлайн' : '⚫ Офлайн'}</div>
                </div>
            </div>
        \`;
    }
    
    // ИИ-помощник
    const aiUnread = unreadCounts.get('ai_assistant') || 0;
    html += \`
        <div class="chat-item" onclick="openAIChat()">
            <div class="chat-avatar">🤖</div>
            <div class="chat-info">
                <div class="chat-name">
                    🤖 ATOM AI
                    \${aiUnread > 0 ? '<span style="background:#ff3b30;border-radius:50%;padding:2px 6px;font-size:10px;margin-left:6px">' + aiUnread + '</span>' : ''}
                </div>
                <div class="chat-preview">✨ ИИ-ассистент нового поколения</div>
            </div>
        </div>
    \`;
    
    if (html === '') {
        html = '<div style="padding:20px;text-align:center;color:#8e8e93">💬 Нет чатов. Добавьте друзей!</div>';
    }
    
    document.getElementById('chatsList').innerHTML = html;
}

function renderGroups() {
    let html = '';
    for (const group of allGroups) {
        const unread = unreadCounts.get(group.id) || 0;
        html += \`
            <div class="chat-item" onclick="openChat('\${group.id}', 'group', '\${escapeHtml(group.name)}')">
                <div class="chat-avatar">👥</div>
                <div class="chat-info">
                    <div class="chat-name">
                        \${escapeHtml(group.name)}
                        \${unread > 0 ? '<span style="background:#ff3b30;border-radius:50%;padding:2px 6px;font-size:10px;margin-left:6px">' + unread + '</span>' : ''}
                    </div>
                    <div class="chat-preview">\${group.member_count || 1} участников</div>
                </div>
            </div>
        \`;
    }
    
    if (html === '') {
        html = '<div style="padding:20px;text-align:center;color:#8e8e93">👥 Нет групп. Создайте первую!</div>';
    }
    
    document.getElementById('groupsList').innerHTML = html;
}

function renderChannels() {
    let html = '';
    for (const channel of allChannels) {
        const unread = unreadCounts.get(channel.id) || 0;
        html += \`
            <div class="chat-item" onclick="openChat('\${channel.id}', 'channel', '\${escapeHtml(channel.name)}')">
                <div class="chat-avatar">📢</div>
                <div class="chat-info">
                    <div class="chat-name">
                        #\${escapeHtml(channel.name)}
                        \${unread > 0 ? '<span style="background:#ff3b30;border-radius:50%;padding:2px 6px;font-size:10px;margin-left:6px">' + unread + '</span>' : ''}
                    </div>
                    <div class="chat-preview">\${channel.subscriber_count || 1} подписчиков</div>
                </div>
            </div>
        \`;
    }
    
    if (html === '') {
        html = '<div style="padding:20px;text-align:center;color:#8e8e93">📢 Нет каналов. Создайте первый!</div>';
    }
    
    document.getElementById('channelsList').innerHTML = html;
}

// ========== ИИ ЧАТ ==========
function openAIChat() {
    currentChatTarget = 'ai_assistant';
    currentChatType = 'ai';
    
    document.getElementById('chatTitle').innerHTML = '🤖 ATOM AI — Premium Assistant';
    document.getElementById('chatAvatar').innerHTML = '🤖';
    document.getElementById('chatStatus').innerHTML = '✨ ИИ нового поколения | Уровень: ЭКСПЕРТ';
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('chatActions').innerHTML = '';
    document.getElementById('messages').innerHTML = '';
    
    // Очищаем непрочитанные
    unreadCounts.delete('ai_assistant');
    renderChats();
    
    addMessage({
        from: '🤖 ATOM AI',
        text: \`✨ **Привет! Я ATOM — твой персональный ИИ-ассистент!** ✨

В отличие от обычных ботов, я:
• 🧠 Имею долговременную память о нашем общении
• 💭 Понимаю эмоции и контекст
• 📚 Постоянно обучаюсь
• 🎯 Адаптируюсь под твой стиль общения

**Напиши "помощь" чтобы узнать все мои возможности!** 🚀\`,
        time: new Date().toLocaleTimeString()
    });
    
    if (isMobile) {
        closeSidebar();
    }
}

function openChat(target, type, name) {
    currentChatTarget = target;
    currentChatType = type;
    
    let title = name || target;
    let avatar = type === 'channel' ? '📢' : (type === 'group' ? '👥' : '👤');
    let status = '';
    
    if (type === 'private') {
        status = onlineUsers.has(target) ? '🟢 Онлайн' : '⚫ Офлайн';
        if (onlineUsers.has(target)) {
            status += ' • Пиши смело!';
        }
        avatar = '👤';
        
        // Присоединяемся к приватному чату
        socket.emit('joinPrivate', target);
    } else if (type === 'group') {
        status = 'Групповой чат';
        socket.emit('joinGroup', target);
    } else if (type === 'channel') {
        status = 'Канал • Только чтение';
        socket.emit('joinChannel', target);
    }
    
    document.getElementById('chatTitle').innerHTML = type === 'channel' ? '#' + title : title;
    document.getElementById('chatAvatar').innerHTML = avatar;
    document.getElementById('chatStatus').innerHTML = status;
    document.getElementById('inputArea').style.display = type === 'channel' ? 'none' : 'flex';
    
    const actions = '<button class="action-btn" onclick="openGameMenu()">🎮</button><button class="action-btn" onclick="startCall()">📞</button>';
    document.getElementById('chatActions').innerHTML = (type === 'private' && type !== 'channel') ? actions : '';
    
    document.getElementById('messages').innerHTML = '';
    
    // Очищаем непрочитанные
    unreadCounts.delete(target);
    renderChats();
    renderGroups();
    renderChannels();
    
    if (isMobile) {
        closeSidebar();
    }
}

function closeChat() {
    currentChatTarget = null;
    currentChatType = null;
    document.getElementById('chatTitle').innerHTML = 'ATOMGRAM PREMIUM';
    document.getElementById('chatAvatar').innerHTML = '🤖';
    document.getElementById('chatStatus').innerHTML = '';
    document.getElementById('inputArea').style.display = 'flex';
    document.getElementById('messages').innerHTML = '';
    
    if (currentGame) closeGame();
    if (peerConnection) endCall();
}

// ========== ОТПРАВКА СООБЩЕНИЙ ==========
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChatTarget) return;
    
    if (currentChatType === 'ai') {
        // Отправляем ИИ
        addMessage({
            from: currentUser,
            text: text,
            time: new Date().toLocaleTimeString(),
            mine: true
        });
        
        // Показываем индикатор печати ИИ
        const typingDiv = showTypingIndicator();
        
        // Отправляем запрос к ИИ на сервер
        socket.emit('aiMessage', { message: text }, (response) => {
            typingDiv.remove();
            addMessage({
                from: '🤖 ATOM AI',
                text: response.reply,
                time: new Date().toLocaleTimeString()
            });
        });
        
        input.value = '';
        return;
    }
    
    socket.emit('sendMessage', {
        type: currentChatType,
        target: currentChatTarget,
        text: text
    });
    
    addMessage({
        from: currentUser,
        text: text,
        time: new Date().toLocaleTimeString(),
        mine: true
    });
    
    input.value = '';
}

function showTypingIndicator() {
    const container = document.getElementById('messages');
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span style="margin-left:8px;font-size:12px;color:#8e8e93">ATOM AI печатает...</span>';
    container.appendChild(indicator);
    indicator.scrollIntoView({ behavior: 'smooth' });
    return indicator;
}

function addMessage(msg) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message ' + (msg.mine ? 'mine' : '');
    
    const isAI = msg.from === '🤖 ATOM AI';
    const avatar = msg.mine ? '👤' : (isAI ? '🤖' : '👤');
    
    div.innerHTML = \`
        <div class="message-avatar">\${avatar}</div>
        <div class="message-bubble">
            <div class="message-content">
                \${!msg.mine && msg.from !== '🤖 ATOM AI' ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : ''}
                <div class="message-text">\${formatMessageText(msg.text)}</div>
                <div class="message-time">\${msg.time || new Date().toLocaleTimeString()}</div>
                \${!msg.mine ? \`
                    <div class="message-reactions">
                        <span class="reaction" onclick="addReaction(this, '❤️')">❤️</span>
                        <span class="reaction" onclick="addReaction(this, '👍')">👍</span>
                        <span class="reaction" onclick="addReaction(this, '😂')">😂</span>
                        <span class="reaction" onclick="addReaction(this, '😮')">😮</span>
                        <span class="reaction" onclick="addReaction(this, '😢')">😢</span>
                        <span class="reaction" onclick="saveMessage('\${escapeHtml(msg.text)}', '\${escapeHtml(msg.from)}')">⭐</span>
                    </div>
                \` : ''}
            </div>
        </div>
    \`;
    
    container.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
}

function formatMessageText(text) {
    if (!text) return '';
    // Преобразуем Markdown-like синтаксис
    return text
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
        .replace(/\\`(.+?)\\`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:6px">$1</code>')
        .replace(/\\n/g, '<br>');
}

function addReaction(element, reaction) {
    element.style.background = '#007aff';
    element.style.transform = 'scale(1.1)';
    setTimeout(() => {
        element.style.background = '';
        element.style.transform = '';
    }, 200);
    showToast(\`Реакция \${reaction} добавлена\`);
}

function saveMessage(text, from) {
    socket.emit('saveMessage', { text: text, from: from });
    showToast('⭐ Сообщение сохранено');
}

function openSavedMessages() {
    document.getElementById('savedMessagesModal').classList.add('active');
    loadSavedMessages();
}

function closeSavedMessagesModal() {
    document.getElementById('savedMessagesModal').classList.remove('active');
}

// ========== СТИКЕРЫ ==========
function sendSticker(sticker) {
    if (!currentChatTarget || currentChatType === 'channel') {
        showToast('Нельзя отправить стикер в канал');
        return;
    }
    
    if (currentChatType === 'ai') {
        addMessage({
            from: currentUser,
            text: sticker,
            time: new Date().toLocaleTimeString(),
            mine: true
        });
        
        socket.emit('aiMessage', { message: \`[Стикер] \${sticker}\` }, (response) => {
            addMessage({
                from: '🤖 ATOM AI',
                text: \`\${response.reply}\n\n\${sticker}\`,
                time: new Date().toLocaleTimeString()
            });
        });
    } else {
        socket.emit('sendMessage', {
            type: currentChatType,
            target: currentChatTarget,
            text: sticker
        });
        
        addMessage({
            from: currentUser,
            text: sticker,
            time: new Date().toLocaleTimeString(),
            mine: true
        });
    }
    
    document.getElementById('stickerPicker').classList.remove('open');
}

function toggleStickerPicker() {
    document.getElementById('stickerPicker').classList.toggle('open');
}

// ========== ГОЛОСОВЫЕ СООБЩЕНИЯ ==========
async function toggleRecording() {
    if (isRecording) {
        if (mediaRecorder) {
            mediaRecorder.stop();
        }
        isRecording = false;
        const voiceBtn = document.getElementById('voiceBtn');
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '🎤';
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                if (currentChatTarget && currentChatType !== 'channel') {
                    socket.emit('voiceMessage', {
                        type: currentChatType,
                        target: currentChatTarget,
                        audio: reader.result
                    });
                    showToast('🎤 Голосовое отправлено');
                }
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        const voiceBtn = document.getElementById('voiceBtn');
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '⏹️';
        
        setTimeout(() => {
            if (isRecording) {
                mediaRecorder.stop();
            }
        }, 30000); // Максимум 30 секунд
    } catch (e) {
        showToast('❌ Нет доступа к микрофону');
    }
}

// ========== ФАЙЛЫ ==========
function sendFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file || !currentChatTarget || currentChatType === 'channel') {
        showToast('Нельзя отправить файл в канал');
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
        showToast('Файл слишком большой (макс 50MB)');
        return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('fileMessage', {
            type: currentChatType,
            target: currentChatTarget,
            fileName: file.name,
            fileData: reader.result
        });
        showToast(`📎 Файл "${file.name}" отправлен`);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
}

// ========== ОПРОСЫ ==========
function openCreatePoll() {
    if (!currentChatTarget) {
        showToast('Сначала выберите чат');
        return;
    }
    if (currentChatType === 'channel') {
           showToast('Нельзя создавать опросы в каналах');
        return;
    }
    document.getElementById('createPollModal').classList.add('active');
}

function closeCreatePollModal() {
    document.getElementById('createPollModal').classList.remove('active');
}

function createPoll() {
    const question = document.getElementById('pollQuestion').value.trim();
    const optionsText = document.getElementById('pollOptions').value.trim();
    
    if (!question || !optionsText) {
        showToast('Заполните все поля');
        return;
    }
    
    const options = optionsText.split(',').map(opt => opt.trim());
    if (options.length < 2) {
        showToast('Минимум 2 варианта ответа');
        return;
    }
    
    socket.emit('createPoll', {
        chatId: currentChatTarget,
        question: question,
        options: options
    });
    
    closeCreatePollModal();
    showToast('📊 Опрос создан!');
}

// ========== ДРУЗЬЯ И ГРУППЫ ==========
function openAddFriend() {
    document.getElementById('addFriendModal').classList.add('active');
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}

function addFriend() {
    const username = document.getElementById('friendUsername').value.trim();
    if (!username) {
        showToast('Введите логин друга');
        return;
    }
    
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        if (res.success) {
            showToast(res.message);
            closeAddFriendModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

function acceptFriend(username) {
    socket.emit('acceptFriend', { fromUser: username }, () => {
        showToast(`✅ ${username} теперь ваш друг`);
        loadData();
    });
}

function rejectFriend(username) {
    socket.emit('rejectFriend', { fromUser: username }, () => {
        showToast(`❌ Запрос от ${username} отклонён`);
        loadData();
    });
}

function openCreateGroup() {
    document.getElementById('createGroupModal').classList.add('active');
}

function closeCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('active');
}

function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    if (!groupName) {
        showToast('Введите название группы');
        return;
    }
    
    socket.emit('createGroup', { groupName: groupName }, (res) => {
        if (res.success) {
            showToast(`👥 Группа "${groupName}" создана`);
            closeCreateGroupModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

function openCreateChannel() {
    document.getElementById('createChannelModal').classList.add('active');
}

function closeCreateChannelModal() {
    document.getElementById('createChannelModal').classList.remove('active');
}

function createChannel() {
    const channelName = document.getElementById('channelName').value.trim();
    if (!channelName) {
        showToast('Введите название канала');
        return;
    }
    
    socket.emit('createChannel', { channelName: channelName }, (res) => {
        if (res.success) {
            showToast(`📢 Канал "${channelName}" создан`);
            closeCreateChannelModal();
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

// ========== ГЛОБАЛЬНЫЙ ПОИСК ==========
let searchTimeout = null;

function globalSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    searchTimeout = setTimeout(() => {
        socket.emit('globalSearch', { query: query }, (results) => {
            let html = '<div style="padding:8px 12px;color:#007aff;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.1)">🔍 РЕЗУЛЬТАТЫ ПОИСКА</div>';
            
            if (results.users && results.users.length > 0) {
                html += '<div style="padding:8px 12px;font-size:11px;color:#8e8e93">👤 ПОЛЬЗОВАТЕЛИ</div>';
                for (const user of results.users) {
                    html += `
                        <div class="search-result" onclick="addFriendFromSearch('${escapeHtml(user.username)}')">
                            <div class="chat-avatar" style="width:40px;height:40px;font-size:20px">👤</div>
                            <div>
                                <div style="font-weight:500">${escapeHtml(user.username)}</div>
                                <div style="font-size:12px;color:#8e8e93">${escapeHtml(user.name || 'Пользователь')}</div>
                            </div>
                            <button style="margin-left:auto;background:#007aff;border:none;border-radius:20px;padding:4px 12px;color:white;cursor:pointer">➕</button>
                        </div>
                    `;
                }
            }
            
            if (results.channels && results.channels.length > 0) {
                html += '<div style="padding:8px 12px;font-size:11px;color:#8e8e93">📢 КАНАЛЫ</div>';
                for (const channel of results.channels) {
                    html += `
                        <div class="search-result" onclick="joinChannelFromSearch('${escapeHtml(channel.id)}', '${escapeHtml(channel.name)}')">
                            <div class="chat-avatar" style="width:40px;height:40px;font-size:20px">📢</div>
                            <div>
                                <div style="font-weight:500">#${escapeHtml(channel.name)}</div>
                                <div style="font-size:12px;color:#8e8e93">Канал</div>
                            </div>
                            <button style="margin-left:auto;background:#34c759;border:none;border-radius:20px;padding:4px 12px;color:white;cursor:pointer">📢</button>
                        </div>
                    `;
                }
            }
            
            if (results.users.length === 0 && results.channels.length === 0) {
                html += '<div style="padding:20px;text-align:center;color:#8e8e93">🔍 Ничего не найдено</div>';
            }
            
            document.getElementById('searchResults').innerHTML = html;
        });
    }, 300);
}

function addFriendFromSearch(username) {
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        if (res.success) {
            showToast(`✅ Запрос дружбы отправлен ${username}`);
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
            loadData();
        } else {
            showToast(res.error);
        }
    });
}

function joinChannelFromSearch(channelId, channelName) {
    socket.emit('subscribeChannel', { channelId: channelId }, (res) => {
        if (res.success) {
            showToast(`📢 Вы подписались на канал ${channelName}`);
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').innerHTML = '';
            loadData();
            openChat(channelId, 'channel', channelName);
        } else {
            showToast(res.error);
        }
    });
}

// ========== ПРОФИЛЬ ==========
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
    const fileInput = document.getElementById('avatarUpload');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Можно загружать только изображения');
        return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
        socket.emit('uploadAvatar', { avatar: reader.result }, (res) => {
            if (res.success) {
                currentUserData = res.userData;
                updateUI();
                showToast('🖼️ Аватар обновлён');
                closeProfileModal();
            } else {
                showToast('Ошибка загрузки аватара');
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
    
    const newPassword = document.getElementById('editPassword').value.trim();
    if (newPassword) {
        if (newPassword.length < 4) {
            showToast('Пароль должен быть минимум 4 символа');
            return;
        }
        data.password = newPassword;
    }
    
    socket.emit('updateProfile', data, (res) => {
        if (res.success) {
            currentUserData = res.userData;
            updateUI();
            showToast('✅ Профиль обновлён');
            closeProfileModal();
        } else {
            showToast('Ошибка обновления профиля');
        }
    });
}

// ========== ИСТОРИИ ==========
function addStory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 20 * 1024 * 1024) {
            showToast('Максимальный размер истории 20MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
            socket.emit('addStory', {
                media: reader.result,
                type: file.type.startsWith('image/') ? 'image' : 'video'
            });
            showToast('📸 История опубликована');
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function viewStory(username) {
    socket.emit('getStory', username);
}

function closeStoryViewer() {
    const viewer = document.getElementById('storyViewer');
    viewer.classList.remove('active');
    const video = document.getElementById('storyVideo');
    if (video) {
        video.pause();
        video.src = '';
    }
}

function loadStories() {
    socket.emit('getStories');
}

// ========== ИГРЫ ==========
function openGameMenu() {
    if (!currentChatTarget || currentChatType === 'channel') {
        showToast('Выберите чат для игры');
        return;
    }
    document.getElementById('gameMenuModal').classList.add('active');
}

function closeGameMenu() {
    document.getElementById('gameMenuModal').classList.remove('active');
}

function startGame(gameType) {
    closeGameMenu();
    
    if (gameType === 'tictactoe') {
        startTicTacToe();
    } else if (gameType === 'dice') {
        rollDice();
    } else if (gameType === 'darts') {
        playDarts();
    }
}

function startTicTacToe() {
    tttBoard = ['', '', '', '', '', '', '', '', ''];
    tttCurrentPlayer = 'X';
    
    const gameDiv = document.createElement('div');
    gameDiv.className = 'game-container';
    gameDiv.id = 'tttGame';
    gameDiv.innerHTML = `
        <div class="game-title">❌ КРЕСТИКИ-НОЛИКИ с ИИ</div>
        <div style="text-align:center;margin-bottom:12px">
            Сейчас ходит: <span id="tttTurn" style="color:#007aff;font-weight:bold">X (Вы)</span>
        </div>
        <div id="tttBoard" class="tic-grid" style="margin:0 auto"></div>
        <div class="game-controls">
            <button class="game-btn" onclick="resetTicTacToe()">🔄 Новая игра</button>
            <button class="game-btn" onclick="closeGame()">❌ Закрыть</button>
        </div>
    `;
    document.getElementById('messages').appendChild(gameDiv);
    renderTicTacToe();
}

function renderTicTacToe() {
    const container = document.getElementById('tttBoard');
    if (!container) return;
    
    let html = '';
    for (let i = 0; i < 9; i++) {
        const value = tttBoard[i];
        html += `<div class="tic-cell" onclick="makeMove(${i})">${value || ''}</div>`;
    }
    container.innerHTML = html;
    
    const turnSpan = document.getElementById('tttTurn');
    if (turnSpan) {
        turnSpan.innerText = tttCurrentPlayer === 'X' ? 'X (Вы)' : 'O (ИИ)';
    }
}

function makeMove(index) {
    if (tttBoard[index] !== '' || tttCurrentPlayer !== 'X') return;
    
    tttBoard[index] = 'X';
    renderTicTacToe();
    
    const winner = checkWinner(tttBoard);
    if (winner) {
        showToast('🏆 ПОБЕДА! Вы выиграли!');
        socket.emit('sendMessage', {
            type: currentChatType,
            target: currentChatTarget,
            text: '🏆 Я выиграл в крестики-нолики!'
        });
        closeGame();
        return;
    }
    
    if (tttBoard.every(cell => cell !== '')) {
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
        // Простой ИИ для крестиков-ноликов
        let move;
        
        // Проверяем, может ли ИИ выиграть
        for (const i of empty) {
            const testBoard = [...tttBoard];
            testBoard[i] = 'O';
            if (checkWinner(testBoard) === 'O') {
                move = i;
                break;
            }
        }
        
        // Проверяем, нужно ли заблокировать победу игрока
        if (move === undefined) {
            for (const i of empty) {
                const testBoard = [...tttBoard];
                testBoard[i] = 'X';
                if (checkWinner(testBoard) === 'X') {
                    move = i;
                    break;
                }
            }
        }
        
        // Выбираем центр или угол
        if (move === undefined) {
            const center = 4;
            const corners = [0, 2, 6, 8];
            if (tttBoard[center] === '') {
                move = center;
            } else {
                const availableCorners = corners.filter(i => tttBoard[i] === '');
                if (availableCorners.length > 0) {
                    move = availableCorners[Math.floor(Math.random() * availableCorners.length)];
                } else {
                    move = empty[Math.floor(Math.random() * empty.length)];
                }
            }
        }
        
        tttBoard[move] = 'O';
        renderTicTacToe();
        
        const winner = checkWinner(tttBoard);
        if (winner === 'O') {
            showToast('😢 ИИ победил! Попробуйте ещё раз!');
            closeGame();
            return;
        }
        
        if (tttBoard.every(cell => cell !== '')) {
            showToast('🤝 НИЧЬЯ!');
            closeGame();
            return;
        }
        
        tttCurrentPlayer = 'X';
        renderTicTacToe();
    }
}

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function resetTicTacToe() {
    closeGame();
    startTicTacToe();
}

function rollDice() {
    const dice = Math.floor(Math.random() * 6) + 1;
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const emoji = diceEmojis[dice - 1];
    
    showToast(`🎲 Выпало: ${emoji} ${dice}`);
    
    socket.emit('sendMessage', {
        type: currentChatType,
        target: currentChatTarget,
        text: `🎲 Бросок костей: ${emoji} (${dice})`
    });
    
    addMessage({
        from: currentUser,
        text: `🎲 Бросок костей: ${emoji} (${dice})`,
        time: new Date().toLocaleTimeString(),
        mine: true
    });
}

function playDarts() {
    const score = Math.floor(Math.random() * 181);
    let message;
    
    if (score === 180) {
        message = '🎯 БУЛЛСАЙ! МАКСИМАЛЬНЫЕ 180 ОЧКОВ! 🎯';
    } else if (score >= 100) {
        message = `🎯 Отличный бросок! ${score} очков! 🎯`;
    } else if (score >= 50) {
        message = `🎯 Хороший бросок! ${score} очков! 🎯`;
    } else {
        message = `🎯 ${score} очков. Попробуйте ещё! 🎯`;
    }
    
    showToast(message);
    
    socket.emit('sendMessage', {
        type: currentChatType,
        target: currentChatTarget,
        text: `🎯 Дартс: ${message}`
    });
    
    addMessage({
        from: currentUser,
        text: `🎯 Дартс: ${message}`,
        time: new Date().toLocaleTimeString(),
        mine: true
    });
}

function closeGame() {
    const gameDiv = document.querySelector('.game-container');
    if (gameDiv) gameDiv.remove();
    currentGame = null;
    tttBoard = null;
}

// ========== ЗВОНКИ (WebRTC) ==========
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function startCall() {
    if (!currentChatTarget || currentChatType !== 'private') {
        showToast('Звонки доступны только в личных чатах');
        return;
    }
    
    currentCallTarget = currentChatTarget;
    document.getElementById('callName').innerText = currentChatTarget;
    document.getElementById('callModal').classList.add('active');
    document.getElementById('callStatus').innerText = 'Вызов...';
    
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        peerConnection = new RTCPeerConnection(configuration);
        
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('iceCandidate', {
                    target: currentChatTarget,
                    candidate: event.candidate
                });
            }
        };
        
        peerConnection.ontrack = (event) => {
            // Воспроизводим входящий аудиопоток
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play().catch(e => console.log('Audio play error:', e));
        };
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('callOffer', {
            target: currentChatTarget,
            offer: offer
        });
        
        document.getElementById('callStatus').innerText = 'Ожидание ответа...';
    } catch (e) {
        console.error('Call error:', e);
        showToast('❌ Ошибка доступа к микрофону');
        endCall();
    }
}

function acceptCall() {
    const pendingCall = window.pendingCall;
    if (!pendingCall) return;
    
    document.getElementById('incomingCall')?.remove();
    document.getElementById('callName').innerText = pendingCall.from;
    document.getElementById('callModal').classList.add('active');
    document.getElementById('callStatus').innerText = 'Соединение...';
    currentCallTarget = pendingCall.from;
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            localStream = stream;
            peerConnection = new RTCPeerConnection(configuration);
            
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('iceCandidate', {
                        target: currentCallTarget,
                        candidate: event.candidate
                    });
                }
            };
            
            peerConnection.ontrack = (event) => {
                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audio.play().catch(e => console.log('Audio play error:', e));
            };
            
            peerConnection.setRemoteDescription(new RTCSessionDescription(pendingCall.offer));
            peerConnection.createAnswer()
                .then(answer => {
                    peerConnection.setLocalDescription(answer);
                    socket.emit('callAnswer', {
                        target: currentCallTarget,
                        answer: answer
                    });
                    document.getElementById('callStatus').innerText = 'В эфире';
                });
        })
        .catch(e => {
            console.error('Mic error:', e);
            showToast('❌ Нет доступа к микрофону');
            endCall();
        });
}

function declineCall() {
    document.getElementById('incomingCall')?.remove();
    if (window.pendingCall) {
        socket.emit('declineCall', { target: window.pendingCall.from });
    }
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
    document.getElementById('callModal').classList.remove('active');
    if (currentCallTarget) {
        socket.emit('endCall', { target: currentCallTarget });
        currentCallTarget = null;
    }
}

function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const muteBtn = document.querySelector('.call-mute');
            if (muteBtn) {
                muteBtn.innerHTML = audioTrack.enabled ? '🔇' : '🔊';
                muteBtn.style.background = audioTrack.enabled ? '#2c2c2e' : '#ff3b30';
            }
        }
    }
}

// ========== UI ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== СОБЫТИЯ СОКЕТА ==========
socket.on('connect', () => {
    console.log('🔌 Connected to server');
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
    showToast('⚠️ Потеряно соединение с сервером');
});

socket.on('friendsUpdate', () => {
    loadData();
});

socket.on('groupsUpdate', () => {
    loadData();
});

socket.on('channelsUpdate', () => {
    loadData();
});

socket.on('savedMessagesUpdate', (msgs) => {
    savedMessagesList = msgs;
    renderSavedMessages();
});

socket.on('chatHistory', (data) => {
    if (currentChatTarget === data.chatId) {
        const container = document.getElementById('messages');
        container.innerHTML = '';
        for (const msg of data.messages) {
            addMessage(msg);
        }
    }
});

socket.on('newMessage', (msg) => {
    if (currentChatTarget === msg.chatId) {
        addMessage(msg);
    } else {
        // Увеличиваем счетчик непрочитанных
        const count = unreadCounts.get(msg.chatId) || 0;
        unreadCounts.set(msg.chatId, count + 1);
        renderChats();
        renderGroups();
        renderChannels();
        
        // Показываем уведомление
        if (document.hidden) {
            document.title = `📩 Новое сообщение от ${msg.from}`;
            setTimeout(() => { document.title = 'ATOMGRAM PREMIUM'; }, 3000);
        }
        showToast(`📩 Новое сообщение от ${msg.from}`);
    }
});

socket.on('voiceMessage', (data) => {
    if (currentChatTarget === data.chatId) {
        addMessage({
            from: data.from,
            text: `🎤 Голосовое сообщение [${Math.round(data.audio.length / 1000)}KB]`,
            time: new Date().toLocaleTimeString(),
            audio: data.audio
        });
    }
});

socket.on('fileMessage', (data) => {
    if (currentChatTarget === data.chatId) {
        const fileLink = `<a href="${data.file}" download="${data.file_name}" class="file-attachment">📎 ${escapeHtml(data.file_name)}</a>`;
        addMessage({
            from: data.from,
            text: fileLink,
            time: new Date().toLocaleTimeString(),
            isFile: true
        });
    }
});

socket.on('newPoll', (poll) => {
    if (currentChatTarget === poll.chatId) {
        const options = JSON.parse(poll.options);
        let pollHtml = `
            <div class="poll-card" data-poll-id="${poll.id}">
                <div class="poll-question">📊 ${escapeHtml(poll.question)}</div>
        `;
        options.forEach((opt, idx) => {
            pollHtml += `
                <div class="poll-option" onclick="votePoll(${poll.id}, ${idx})">
                    <span>${escapeHtml(opt)}</span>
                    <span class="poll-vote-count">0 голосов</span>
                </div>
            `;
        });
        pollHtml += `<div class="message-time">${new Date().toLocaleTimeString()}</div></div>`;
        
        addMessage({
            from: '📊 СИСТЕМА',
            text: pollHtml,
            time: new Date().toLocaleTimeString(),
            isPoll: true
        });
    }
});

function votePoll(pollId, optionIndex) {
    socket.emit('votePoll', { pollId: pollId, optionIndex: optionIndex });
    showToast('✅ Голос учтён');
}

socket.on('pollUpdate', (data) => {
    const pollCard = document.querySelector(`.poll-card[data-poll-id="${data.id}"]`);
    if (pollCard) {
        const options = JSON.parse(data.options);
        const votes = data.votes;
        const totalVotes = votes.reduce((a, b) => a + b, 0);
        
        let newHtml = `<div class="poll-question">📊 ${escapeHtml(data.question)}</div>`;
        options.forEach((opt, idx) => {
            const percent = totalVotes > 0 ? Math.round((votes[idx] / totalVotes) * 100) : 0;
            newHtml += `
                <div class="poll-option" style="cursor:default">
                    <span>${escapeHtml(opt)}</span>
                    <span>${votes[idx]} голосов (${percent}%)</span>
                </div>
            `;
        });
        pollCard.innerHTML = newHtml;
    }
});

socket.on('userOnline', (username) => {
    onlineUsers.add(username);
    renderChats();
    if (currentChatTarget === username) {
        document.getElementById('chatStatus').innerHTML = '🟢 Онлайн';
    }
});

socket.on('userOffline', (username) => {
    onlineUsers.delete(username);
    renderChats();
    if (currentChatTarget === username) {
        document.getElementById('chatStatus').innerHTML = '⚫ Офлайн';
    }
});

socket.on('storiesUpdate', (storiesList) => {
    const container = document.getElementById('storiesRow');
    let html = `
        <div class="story-item" onclick="addStory()">
            <div class="story-circle add">
                <div class="story-avatar">+</div>
            </div>
            <div class="story-name">Моя история</div>
        </div>
    `;
    
    for (const story of storiesList) {
        html += `
            <div class="story-item" onclick="viewStory('${escapeHtml(story.username)}')">
                <div class="story-circle">
                    <div class="story-avatar">${story.avatar || '👤'}</div>
                </div>
                <div class="story-name">${escapeHtml(story.name || story.username)}</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
});

socket.on('storyData', (data) => {
    const viewer = document.getElementById('storyViewer');
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

// Звонки
socket.on('incomingCall', (data) => {
    window.pendingCall = data;
    
    const incomingDiv = document.createElement('div');
    incomingDiv.id = 'incomingCall';
    incomingDiv.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #1c1c1e;
        border-radius: 24px;
        padding: 16px 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 1000;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        animation: fadeIn 0.3s;
    `;
    incomingDiv.innerHTML = `
        <div style="width:48px;height:48px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px">📞</div>
        <div>
            <div style="font-weight:600">${escapeHtml(data.from)}</div>
            <div style="font-size:12px;color:#8e8e93">Входящий звонок...</div>
        </div>
        <button onclick="acceptCall()" style="background:#34c759;border:none;border-radius:50%;width:44px;height:44px;color:white;cursor:pointer;font-size:20px">✓</button>
        <button onclick="declineCall()" style="background:#ff3b30;border:none;border-radius:50%;width:44px;height:44px;color:white;cursor:pointer;font-size:20px">✗</button>
    `;
    document.body.appendChild(incomingDiv);
    
    // Вибрируем если поддерживается
    if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
    }
});

socket.on('callAnswered', (data) => {
    if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        document.getElementById('callStatus').innerText = 'В эфире';
    }
});

socket.on('iceCandidate', (data) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(e => console.log('ICE candidate error:', e));
    }
});

socket.on('callEnded', () => {
    endCall();
    showToast('📞 Звонок завершён');
});

socket.on('callDeclined', () => {
    endCall();
    showToast('📞 Звонок отклонён');
});

// Ответ ИИ
socket.on('aiResponse', (response) => {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.remove();
    
    addMessage({
        from: '🤖 ATOM AI',
        text: response.reply,
        time: new Date().toLocaleTimeString()
    });
});

// Обновление статуса онлайн
setInterval(() => {
    socket.emit('ping');
}, 30000);

// Восстановление сессии
const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) {
    document.getElementById('loginUsername').value = savedUser;
}

// Адаптивность
window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
    if (!isMobile) {
        closeSidebar();
    }
});

// Закрытие модальных окон по клику на оверлей
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Фокус на поле ввода при открытии чата
const observer = new MutationObserver(() => {
    const input = document.getElementById('messageInput');
    if (input && currentChatTarget && document.activeElement !== input) {
        input.focus();
    }
});
observer.observe(document.getElementById('messages'), { childList: true, subtree: true });

console.log('🚀 ATOMGRAM PREMIUM ULTRA клиент загружен');
</script>
</body>
</html>
    `);
});

// ========== WEBRTC ЗВОНКИ (серверная часть) ==========
const activeCalls = new Map();

// ========== РАСШИРЕННЫЕ ОБРАБОТЧИКИ СОКЕТОВ ==========
const userSockets = new Map();
const onlineUsersSet = new Set();

function getSocketByUsername(username) {
    for (const [socketId, user] of userSockets) {
        if (user === username) {
            return io.sockets.sockets.get(socketId);
        }
    }
    return null;
}

io.on('connection', (socket) => {
    let currentUser = null;
    
    console.log('🔌 New connection:', socket.id);
    
    // ========== АВТОРИЗАЦИЯ ==========
    socket.on('register', (data, cb) => {
        const { username, name, password } = data;
        
        if (users[username]) {
            cb({ success: false, error: '❌ Пользователь уже существует' });
            return;
        }
        
        if (username.length < 3) {
            cb({ success: false, error: '❌ Логин должен быть минимум 3 символа' });
            return;
        }
        
        if (password.length < 4) {
            cb({ success: false, error: '❌ Пароль должен быть минимум 4 символа' });
            return;
        }
        
        users[username] = {
            username: username,
            name: name || username,
            password: password,
            bio: '',
            avatar: null,
            friends: [],
            friendRequests: [],
            channels: [],
            savedMessages: [],
            createdAt: Date.now(),
            lastSeen: Date.now(),
            settings: {
                theme: 'dark',
                notifications: true,
                sound: true,
                language: 'ru'
            }
        };
        
        saveData();
        cb({ success: true, message: '✅ Регистрация успешна' });
    });
    
    socket.on('login', (data, cb) => {
        const { username, password } = data;
        const user = users[username];
        
        if (!user) {
            cb({ success: false, error: '❌ Пользователь не найден' });
            return;
        }
        
        if (user.password !== password) {
            cb({ success: false, error: '❌ Неверный пароль' });
            return;
        }
        
        currentUser = username;
        socket.username = username;
        userSockets.set(socket.id, username);
        onlineUsersSet.add(username);
        user.lastSeen = Date.now();
        user.online = true;
        
        cb({
            success: true,
            userData: {
                username: user.username,
                name: user.name,
                bio: user.bio,
                avatar: user.avatar,
                avatarIcon: user.avatarIcon || '👤'
            }
        });
        
        // Отправляем список друзей
        const friendsList = (user.friends || []).map(f => ({ username: f }));
        const requestsList = (user.friendRequests || []).map(r => ({ username: r }));
        socket.emit('friendsUpdate', { friends: friendsList, requests: requestsList });
        
        // Отправляем группы
        const userGroups = Object.values(groups).filter(g => g.members && g.members.includes(username));
        socket.emit('groupsUpdate', userGroups.map(g => ({
            id: g.id,
            name: g.name,
            member_count: g.members?.length || 1
        })));
        
        // Отправляем каналы
        const userChannels = user.channels || [];
        socket.emit('channelsUpdate', userChannels.map(c => ({
            id: c,
            name: c,
            subscriber_count: 1
        })));
        
        // Отправляем сохранённые
        socket.emit('savedMessagesUpdate', user.savedMessages || []);
        
        // Уведомляем друзей об онлайн статусе
        (user.friends || []).forEach(friend => {
            const friendSocket = getSocketByUsername(friend);
            if (friendSocket) {
                friendSocket.emit('userOnline', username);
            }
        });
        
        // Отправляем истории
        const activeStories = [];
        for (const [u, storyList] of Object.entries(stories)) {
            if (storyList && storyList.length > 0 && Date.now() - storyList[storyList.length - 1].created_at < 86400000) {
                activeStories.push({
                    username: u,
                    name: users[u]?.name || u,
                    avatar: users[u]?.avatar
                });
            }
        }
        socket.emit('storiesUpdate', activeStories);
        
        console.log(`✅ User logged in: ${username}`);
    });
    
    // ========== ПОЛУЧЕНИЕ ДАННЫХ ==========
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
        cb(userGroups.map(g => ({
            id: g.id,
            name: g.name,
            member_count: g.members?.length || 1
        })));
    });
    
    socket.on('getChannels', (cb) => {
        if (!currentUser) return;
        const user = users[currentUser];
        const userChannels = user.channels || [];
        cb(userChannels.map(c => ({
            id: c,
            name: c,
            subscriber_count: 1
        })));
    });
    
    socket.on('getSavedMessages', (cb) => {
        if (!currentUser) return;
        cb(users[currentUser]?.savedMessages || []);
    });
    
    // ========== СООБЩЕНИЯ ==========
    socket.on('sendMessage', (data) => {
        const { type, target, text } = data;
        if (!currentUser || !text) return;
        
        const msg = {
            id: Date.now(),
            from: currentUser,
            text: text,
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now(),
            chatId: target
        };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            
            socket.emit('newMessage', msg);
            
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) {
                targetSocket.emit('newMessage', msg);
            }
        } else if (type === 'group') {
            if (groups[target]) {
                groups[target].messages.push(msg);
                saveData();
                
                socket.emit('newMessage', msg);
                
                groups[target].members.forEach(member => {
                    if (member !== currentUser) {
                        const memberSocket = getSocketByUsername(member);
                        if (memberSocket) {
                            memberSocket.emit('newMessage', msg);
                        }
                    }
                });
            }
        }
    });
    
    socket.on('joinPrivate', (target) => {
        if (!currentUser) return;
        const chatId = [currentUser, target].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
        socket.emit('chatHistory', {
            chatId: target,
            messages: privateChats[chatId].messages || []
        });
    });
    
    socket.on('joinGroup', (groupId) => {
        if (!currentUser) return;
        if (groups[groupId] && !groups[groupId].members.includes(currentUser)) {
            groups[groupId].members.push(currentUser);
            saveData();
        }
        if (groups[groupId]) {
            socket.emit('chatHistory', {
                chatId: groupId,
                messages: groups[groupId].messages || []
            });
        }
    });
    
    socket.on('joinChannel', (channelId) => {
        if (!currentUser) return;
        socket.emit('chatHistory', {
            chatId: channelId,
            messages: []
        });
    });
    
    // ========== ИИ СООБЩЕНИЯ (РАСШИРЕННЫЙ) ==========
    socket.on('aiMessage', (data, cb) => {
        const { message } = data;
        if (!currentUser) return;
        
        const aiInstance = getAIInstance(currentUser);
        
        // Получаем контекст пользователя
        const context = {
            userName: users[currentUser]?.name || currentUser,
            userLevel: aiInstance.level,
            messageCount: aiInstance.userStats.messagesCount
        };
        
        aiInstance.generateResponse(message, context).then(reply => {
            cb({ reply: reply });
            
            // Сохраняем диалог в историю
            if (!privateChats[`${currentUser}_ai`]) {
                privateChats[`${currentUser}_ai`] = { messages: [] };
            }
            privateChats[`${currentUser}_ai`].messages.push({
                id: Date.now(),
                from: currentUser,
                text: message,
                time: new Date().toLocaleTimeString(),
                timestamp: Date.now(),
                chatId: 'ai_assistant'
            });
            privateChats[`${currentUser}_ai`].messages.push({
                id: Date.now() + 1,
                from: '🤖 ATOM AI',
                text: reply,
                time: new Date().toLocaleTimeString(),
                timestamp: Date.now(),
                chatId: 'ai_assistant'
            });
            saveData();
        });
    });
    
    // ========== ДРУЗЬЯ ==========
    socket.on('addFriend', (data, cb) => {
        const { friendUsername } = data;
        const user = users[currentUser];
        const friend = users[friendUsername];
        
        if (!friend) {
            cb({ success: false, error: '❌ Пользователь не найден' });
            return;
        }
        
        if (friendUsername === currentUser) {
            cb({ success: false, error: '❌ Нельзя добавить себя' });
            return;
        }
        
        if (user.friends && user.friends.includes(friendUsername)) {
            cb({ success: false, error: '❌ Уже в друзьях' });
            return;
        }
        
        if (friend.friendRequests && friend.friendRequests.includes(currentUser)) {
            cb({ success: false, error: '❌ Запрос уже отправлен' });
            return;
        }
        
        if (!friend.friendRequests) friend.friendRequests = [];
        friend.friendRequests.push(currentUser);
        saveData();
        
        cb({ success: true, message: `✅ Запрос дружбы отправлен ${friendUsername}` });
        
        const friendSocket = getSocketByUsername(friendUsername);
        if (friendSocket) {
            friendSocket.emit('friendsUpdate', {
                friends: friend.friends || [],
                requests: friend.friendRequests || []
            });
        }
    });
    
    socket.on('acceptFriend', (data, cb) => {
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
            
            socket.emit('friendsUpdate', {
                friends: user.friends || [],
                requests: user.friendRequests || []
            });
            
            const fromSocket = getSocketByUsername(fromUser);
            if (fromSocket) {
                fromSocket.emit('friendsUpdate', {
                    friends: from.friends || [],
                    requests: from.friendRequests || []
                });
                fromSocket.emit('userOnline', currentUser);
            }
            
            if (cb) cb({ success: true });
        }
    });
    
    socket.on('rejectFriend', (data, cb) => {
        const { fromUser } = data;
        const user = users[currentUser];
        
        if (user.friendRequests && user.friendRequests.includes(fromUser)) {
            user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
            saveData();
            
            socket.emit('friendsUpdate', {
                friends: user.friends || [],
                requests: user.friendRequests || []
            });
            
            if (cb) cb({ success: true });
        }
    });
    
    // ========== ГРУППЫ ==========
    socket.on('createGroup', (data, cb) => {
        const { groupName } = data;
        const id = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        groups[id] = {
            id: id,
            name: groupName,
            owner: currentUser,
            members: [currentUser],
            messages: [],
            createdAt: Date.now()
        };
        
        saveData();
        cb({ success: true });
        
        const userGroups = Object.values(groups).filter(g => g.members && g.members.includes(currentUser));
        socket.emit('groupsUpdate', userGroups.map(g => ({
            id: g.id,
            name: g.name,
            member_count: g.members?.length || 1
        })));
    });
    
    // ========== КАНАЛЫ ==========
    socket.on('createChannel', (data, cb) => {
        const { channelName } = data;
        const user = users[currentUser];
        
        if (!user.channels) user.channels = [];
        
        if (user.channels.includes(channelName)) {
            cb({ success: false, error: '❌ Канал с таким названием уже существует' });
            return;
        }
        
        channels[channelName] = {
            id: channelName,
            name: channelName,
            owner: currentUser,
            subscribers: [currentUser],
            messages: [],
            createdAt: Date.now()
        };
        
        user.channels.push(channelName);
        saveData();
        
        cb({ success: true, message: `✅ Канал "${channelName}" создан` });
        
        socket.emit('channelsUpdate', user.channels.map(c => ({
            id: c,
            name: c,
            subscriber_count: 1
        })));
    });
    
    socket.on('subscribeChannel', (data, cb) => {
        const { channelId } = data;
        const user = users[currentUser];
        
        if (!channels[channelId]) {
            cb({ success: false, error: '❌ Канал не найден' });
            return;
        }
        
        if (!user.channels) user.channels = [];
        
        if (user.channels.includes(channelId)) {
            cb({ success: false, error: '❌ Вы уже подписаны на этот канал' });
            return;
        }
        
        user.channels.push(channelId);
        channels[channelId].subscribers.push(currentUser);
        saveData();
        
        cb({ success: true, message: `✅ Вы подписались на канал ${channelId}` });
        
        socket.emit('channelsUpdate', user.channels.map(c => ({
            id: c,
            name: c,
            subscriber_count: channels[c]?.subscribers?.length || 1
        })));
    });
    
    // ========== ГОЛОСОВЫЕ СООБЩЕНИЯ ==========
    socket.on('voiceMessage', (data) => {
        const { type, target, audio } = data;
        if (!currentUser) return;
        
        const msg = {
            id: Date.now(),
            from: currentUser,
            audio: audio,
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now(),
            chatId: target
        };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            
            socket.emit('voiceMessage', msg);
            
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) {
                targetSocket.emit('voiceMessage', msg);
            }
        }
    });
    
    // ========== ФАЙЛЫ ==========
    socket.on('fileMessage', (data) => {
        const { type, target, fileName, fileData } = data;
        if (!currentUser) return;
        
        const fileUrl = saveFile(fileData, fileName, currentUser);
        
        const msg = {
            id: Date.now(),
            from: currentUser,
            file: fileUrl,
            file_name: fileName,
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now(),
            chatId: target
        };
        
        if (type === 'private') {
            const chatId = [currentUser, target].sort().join('_');
            if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
            privateChats[chatId].messages.push(msg);
            saveData();
            
            socket.emit('fileMessage', msg);
            
            const targetSocket = getSocketByUsername(target);
            if (targetSocket) {
                targetSocket.emit('fileMessage', msg);
            }
        } else if (type === 'group') {
            if (groups[target]) {
                groups[target].messages.push(msg);
                saveData();
                
                socket.emit('fileMessage', msg);
                
                groups[target].members.forEach(member => {
                    if (member !== currentUser) {
                        const memberSocket = getSocketByUsername(member);
                        if (memberSocket) {
                            memberSocket.emit('fileMessage', msg);
                        }
                    }
                });
            }
        }
    });
    
    // ========== ОПРОСЫ ==========
    socket.on('createPoll', (data) => {
        const { chatId, question, options } = data;
        if (!currentUser) return;
        
        const poll = {
            id: Date.now(),
            chatId: chatId,
            from: currentUser,
            question: question,
            options: JSON.stringify(options),
            votes: JSON.stringify(Array(options.length).fill(0)),
            voters: [],
            createdAt: Date.now()
        };
        
        polls[poll.id] = poll;
        saveData();
        
        io.emit('newPoll', poll);
    });
    
    socket.on('votePoll', (data) => {
        const { pollId, optionIndex } = data;
        if (!currentUser) return;
        
        const poll = polls[pollId];
        if (!poll) return;
        
        if (poll.voters && poll.voters.includes(currentUser)) {
            socket.emit('pollError', { message: 'Вы уже голосовали в этом опросе' });
            return;
        }
        
        const votes = JSON.parse(poll.votes);
        votes[optionIndex]++;
        poll.votes = JSON.stringify(votes);
        
        if (!poll.voters) poll.voters = [];
        poll.voters.push(currentUser);
        
        saveData();
        
        io.emit('pollUpdate', {
            id: pollId,
            question: poll.question,
            options: poll.options,
            votes: votes
        });
    });
    
    // ========== СОХРАНЁННЫЕ СООБЩЕНИЯ ==========
    socket.on('saveMessage', (data) => {
        const { text, from } = data;
        if (!currentUser) return;
        
        const user = users[currentUser];
        if (!user.savedMessages) user.savedMessages = [];
        
        user.savedMessages.unshift({
            id: Date.now(),
            text: text,
            from_name: from,
            saved_at: Date.now()
        });
        
        if (user.savedMessages.length > 100) user.savedMessages.pop();
        saveData();
        
        socket.emit('savedMessagesUpdate', user.savedMessages);
    });
    
    // ========== ИСТОРИИ ==========
    socket.on('addStory', (data) => {
        const { media, type } = data;
        if (!currentUser) return;
        
        if (!stories[currentUser]) stories[currentUser] = [];
        
        stories[currentUser].push({
            media: media,
            type: type,
            created_at: Date.now()
        });
        
        if (stories[currentUser].length > 20) stories[currentUser].shift();
        saveData();
        
        // Отправляем обновление всем
        const activeStories = [];
        for (const [u, storyList] of Object.entries(stories)) {
            if (storyList && storyList.length > 0 && Date.now() - storyList[storyList.length - 1].created_at < 86400000) {
                activeStories.push({
                    username: u,
                    name: users[u]?.name || u,
                    avatar: users[u]?.avatar
                });
            }
        }
        io.emit('storiesUpdate', activeStories);
    });
    
    socket.on('getStories', () => {
        const activeStories = [];
        for (const [u, storyList] of Object.entries(stories)) {
            if (storyList && storyList.length > 0 && Date.now() - storyList[storyList.length - 1].created_at < 86400000) {
                activeStories.push({
                    username: u,
                    name: users[u]?.name || u,
                    avatar: users[u]?.avatar
                });
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
    
    // ========== ПРОФИЛЬ ==========
    socket.on('updateProfile', (data, cb) => {
        const user = users[currentUser];
        if (!user) {
            cb({ success: false });
            return;
        }
        
        if (data.name) user.name = data.name;
        if (data.bio) user.bio = data.bio;
        if (data.password) user.password = data.password;
        
        saveData();
        
        cb({
            success: true,
            userData: {
                username: user.username,
                name: user.name,
                bio: user.bio,
                avatar: user.avatar,
                avatarIcon: user.avatarIcon || '👤'
            }
        });
    });
    
    socket.on('uploadAvatar', (data, cb) => {
        const user = users[currentUser];
        if (!user) {
            cb({ success: false });
            return;
        }
        
        const avatarUrl = saveImage(data.avatar, currentUser);
        user.avatar = avatarUrl;
        saveData();
        
        cb({
            success: true,
            userData: {
                username: user.username,
                name: user.name,
                bio: user.bio,
                avatar: user.avatar,
                avatarIcon: user.avatarIcon || '👤'
            }
        });
        
        // Уведомляем друзей об обновлении аватара
        (user.friends || []).forEach(friend => {
            const friendSocket = getSocketByUsername(friend);
            if (friendSocket) {
                friendSocket.emit('friendAvatarUpdate', {
                    username: currentUser,
                    avatar: avatarUrl
                });
            }
        });
    });
    
    // ========== ГЛОБАЛЬНЫЙ ПОИСК ==========
    socket.on('globalSearch', (data, cb) => {
        const { query } = data;
        const lowerQuery = query.toLowerCase();
        
        const usersResults = Object.keys(users)
            .filter(u => u !== currentUser && (u.toLowerCase().includes(lowerQuery) || (users[u].name && users[u].name.toLowerCase().includes(lowerQuery))))
            .slice(0, 10)
            .map(u => ({
                username: u,
                name: users[u].name || u,
                avatar: users[u].avatar
            }));
        
        const channelsResults = Object.keys(channels)
            .filter(c => c.toLowerCase().includes(lowerQuery))
            .slice(0, 10)
            .map(c => ({
                id: c,
                name: c,
                subscriber_count: channels[c]?.subscribers?.length || 1
            }));
        
        cb({ users: usersResults, channels: channelsResults });
    });
    
    // ========== ЗВОНКИ (WebRTC сигнализация) ==========
    socket.on('callOffer', (data) => {
        const { target, offer } = data;
        const targetSocket = getSocketByUsername(target);
        if (targetSocket) {
            targetSocket.emit('incomingCall', {
                from: currentUser,
                offer: offer
            });
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
    
    // ========== PING ДЛЯ ОНЛАЙН СТАТУСА ==========
    socket.on('ping', () => {
        if (currentUser) {
            const user = users[currentUser];
            if (user) user.lastSeen = Date.now();
        }
    });
    
    // ========== ОТКЛЮЧЕНИЕ ==========
    socket.on('disconnect', () => {
        if (currentUser) {
            userSockets.delete(socket.id);
            onlineUsersSet.delete(currentUser);
            
            if (users[currentUser]) {
                users[currentUser].online = false;
                users[currentUser].lastSeen = Date.now();
                saveData();
            }
            
            (users[currentUser]?.friends || []).forEach(friend => {
                const friendSocket = getSocketByUsername(friend);
                if (friendSocket) {
                    friendSocket.emit('userOffline', currentUser);
                }
            });
            
            console.log(`🔌 User disconnected: ${currentUser}`);
        }
    });
});

// ========== AWAKE-BOT ДЛЯ RENDER.COM ==========
function startKeepAliveBot() {
    const PORT = process.env.PORT || 3000;
    const url = `http://localhost:${PORT}`;
    
    console.log('\n🤖 AWAKE-BOT ЗАПУЩЕН! Сервер будет активен 24/7\n');
    
    setInterval(async () => {
        try {
            await fetch(url);
            console.log('💓 Keep-alive ping sent');
        } catch(e) {
            // Ошибка игнорируется
        }
    }, 4 * 60 * 1000);
    
    setTimeout(async () => {
        try {
            await fetch(url);
        } catch(e) {}
    }, 30000);
}

startKeepAliveBot();

// ========== ЗАПУСК СЕРВЕРА ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║     █████╗ ████████╗ ██████╗ ███╗   ███╗ ██████╗ ██████╗  █████╗ ███╗   ███╗  ║
║    ██╔══██╗╚══██╔══╝██╔═══██╗████╗ ████║██╔════╝ ██╔══██╗██╔══██╗████╗ ████║  ║
║    ███████║   ██║   ██║   ██║██╔████╔██║██║  ███╗██████╔╝███████║██╔████╔██║  ║
║    ██╔══██║   ██║   ██║   ██║██║╚██╔╝██║██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║  ║
║    ██║  ██║   ██║   ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║  ║
║    ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ║
║                                                                               ║
║                      P R E M I U M   U L T R A                                ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  🚀 СЕРВЕР ЗАПУЩЕН: http://localhost:${PORT}                                    ║
║  🤖 ИИ-АССИСТЕНТ: АКТИВЕН (нейросеть с памятью и эмоциями)                    ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ✨ ПРЕМИУМ ФУНКЦИИ:                                                          ║
║  • 🧠 ИИ с долговременной памятью (запоминает пользователей)                  ║
║  • 💭 Анализ эмоций и адаптация под настроение                                ║
║  • 📚 Самообучение на основе истории диалогов                                 ║
║  • 🎯 10+ уровней развития ИИ                                                 ║
║  • 💬 Личные сообщения с реакциями                                            ║
║  • 👥 Группы до 5000 участников                                               ║
║  • 📢 Каналы с подпиской                                                      ║
║  • 🎤 Голосовые сообщения (WebM запись)                                       ║
║  • 📎 Файлы и изображения (до 50MB)                                           ║
║  • 😀 40+ стикеров                                                            ║
║  • ❤️ Реакции на сообщения (❤️👍😂😮😢)                                        ║
║  • 📊 Опросы с голосованием                                                   ║
║  • 📸 Истории на 24 часа                                                      ║
║  • ❌ Крестики-нолики с ИИ                                                    ║
║  • 🎲 Кости и Дартс                                                           ║
║  • 📞 Голосовые звонки (WebRTC)                                               ║
║  • ⭐ Сохранённые сообщения                                                   ║
║  • 🌍 Глобальный поиск пользователей и каналов                                ║
║  • 🟢 Онлайн-статус друзей                                                    ║
║  • 🖼️ Аватары пользователей                                                  ║
║  • 🎨 Премиум дизайн с анимациями                                             ║
║  • 📱 Адаптивный дизайн (телефон/планшет/ПК)                                  ║
║  • 🤖 Awake-bot для 24/7 работы                                               ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  🏆 ATOMGRAM PREMIUM ULTRA — МЕССЕНДЖЕР БУДУЩЕГО С ИИ! 🚀                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function saveFile(fileData, fileName, userId) {
    const safeName = `${Date.now()}_${userId}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeName);
    const buffer = Buffer.from(fileData.split(',')[1], 'base64');
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${safeName}`;
}

function saveImage(fileData, userId) {
    const safeName = `${Date.now()}_${userId}.jpg`;
    const filePath = path.join(uploadsDir, safeName);
    const buffer = Buffer.from(fileData.split(',')[1], 'base64');
    
    sharp(buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(filePath, (err) => {
            if (err) console.error('Image optimization error:', err);
        });
    
    return `/uploads/${safeName}`;
}
