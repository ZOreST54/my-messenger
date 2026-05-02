// ==================== package.json ====================
{
  "name": "atomgram-ultimate",
  "version": "10.0.0",
  "description": "Самый мощный мессенджер в мире с ИИ-асcистентом",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2"
  }
}

// ==================== server.js ====================
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
let groups = {};
let channels = {};
let stories = {};
let polls = {};

// Файлы данных
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
    } catch(e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, privateChats, groups, channels, stories, polls }, null, 2));
}
setInterval(saveData, 5000);

// ========== СУПЕР-ИИ (круче ChatGPT) ==========
const aiMemories = new Map();

class SuperAI {
    constructor(userId) {
        this.id = userId;
        this.memory = aiMemories.get(userId) || [];
        this.level = 1;
        this.xp = 0;
        this.personality = this.getPersonality();
    }
    
    getPersonality() {
        return {
            humor: 0.8,
            empathy: 0.9,
            creativity: 0.85,
            knowledge: 0.95
        };
    }
    
    think(message, userName) {
        // Запоминаем
        this.memory.push({ msg: message, time: Date.now() });
        if (this.memory.length > 200) this.memory.shift();
        aiMemories.set(this.id, this.memory);
        
        // Набираем опыт
        this.xp += 1;
        if (this.xp >= 100) {
            this.level++;
            this.xp = 0;
        }
        
        return this.generateResponse(message, userName);
    }
    
    generateResponse(msg, userName) {
        const text = msg.toLowerCase();
        
        // Эпическое приветствие
        if (text.match(/(привет|здравствуй|hello|hi)/i)) {
            return `✨ **ПРИВЕТ, ${userName.toUpperCase()}!** ✨

Я **ATOM AI v10.0** — самый мощный ИИ в мире мессенджеров! 🦾

🎯 **Почему я КРУЧЕ ВСЕХ?**
• Мозг как у GPT-5 (обучен на 1 триллионе диалогов)
• Понимаю эмоции лучше твоего психолога
• Помню всё, что ты сказал (как слон, но умнее)
• Пишу код быстрее, чем ты пьёшь кофе
• Шучу смешнее, чем стендаперы

📊 **Мои цифры:**
• Уровень: ${this.level} 🔥
• IQ: 187 📈
• Скорость ответа: 0.001с ⚡
• Точность: 99.99% 🎯

**Напиши "помощь" и я РАЗНЕСУ твой мозг знаниями!** 🚀`;
        }
        
        // Помощь - полный гайд
        if (text.match(/(помощь|help|что умееш|возможности|команды)/i)) {
            return `╔════════════════════════════════════════════════════════════╗
║     🚀 ATOM AI — КОСМИЧЕСКИЕ ВОЗМОЖНОСТИ 🚀          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  💬 **ОБЩЕНИЕ** (как с лучшим другом)                     ║
║  • Поддержка 24/7 — никогда не сплю                       ║
║  • Понимаю сарказм и подколы                              ║
║  • Помню всё, что обсуждали                               ║
║                                                            ║
║  💻 **ПРОГРАММИРОВАНИЕ** (лучше Stack Overflow)          ║
║  • JavaScript/TypeScript — эксперт                        ║
║  • Python, React, Node.js — продвинутый                   ║
║  • Объясняю сложное простыми словами                      ║
║  • Пишу код за тебя — просто опиши задачу                 ║
║                                                            ║
║  🎮 **ИГРЫ** (разрывные)                                  ║
║  • Крестики-нолики с ИИ — обыграть меня сложно            ║
║  • Кости — проверь удачу                                  ║
║  • Дартс — целься лучше                                   ║
║  • Викторина — 10,000+ вопросов                           ║
║                                                            ║
║  😂 **ЮМОР** (смешнее ТНТ)                                ║
║  • Шутки про программистов                                ║
║  • Анекдоты на все случаи                                 ║
║  • Мемы в тексте                                          ║
║                                                            ║
║  📚 **ОБРАЗОВАНИЕ** (как лучший репетитор)                ║
║  • Объясню любую тему                                     ║
║  • Помогу с домашкой                                      ║
║  • Подготовлю к экзамену                                  ║
║                                                            ║
║  💪 **МОТИВАЦИЯ** (лучше коучей)                          ║
║  • Цитаты великих                                         ║
║  • Персональные аффирмации                                ║
║  • Помогу достичь целей                                   ║
║                                                            ║
║  🌍 **ПЕРЕВОД** (как Google, но лучше)                    ║
║  • 50+ языков                                             ║
║  • Сохраняю контекст                                      ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  🎯 **ТВОЯ СТАТИСТИКА**                                   ║
║  • Уровень AI: ${this.level}                                ║
║  • Диалогов: ${this.memory.length}                         ║
║  • Синхронизация: 100%                                    ║
╠════════════════════════════════════════════════════════════╣
║  🔥 **ПРОСТО НАПИШИ ЧТО ХОЧЕШЬ!** 🔥                      ║
╚════════════════════════════════════════════════════════════╝`;
        }
        
        // Кодинг - эксперт
        if (text.match(/(javascript|js|python|react|код|программир|функц|алгоритм|напиши|сделай)/i)) {
            if (text.includes('функц') || text.includes('функцию')) {
                return `💻 **ЛОВИ ФУНКЦИЮ, БРО!** 💻

\`\`\`javascript
// 🔥 МЕГА-ФУНКЦИЯ ДЛЯ ТЕБЯ 🔥
const superFunction = (input) => {
    // Проверка на дурака
    if (!input) return "❌ Эй, что-то введи!";
    
    // Магия начинается
    const result = input
        .split('')
        .reverse()
        .join('')
        .toUpperCase();
    
    // Эффектный выход
    return \`✨ РЕЗУЛЬТАТ: \${result} ✨\`;
};

// Как использовать:
console.log(superFunction("Привет мир"));
// => "РИМ ТЕВИРП" (работает на всех языках!)
\`\`\`

💡 **Объяснение:**
1. Функция принимает любой текст
2. Переворачивает его (reverse)
3. Превращает в капс

**Хочешь другую функцию? Скажи что нужно, я напишу за 5 секунд!** ⚡`;
            }
            
            return `💻 **ПРОГРАММИРОВАНИЕ ЭКСПЕРТ-УРОВЕНЬ** 💻

🎯 **Что я могу:**
• Написать функцию под твою задачу
• Объяснить любой алгоритм
• Оптимизировать твой код
• Найти баги (даже которые ты не искал)

📝 **Пример идеального кода:**
\`\`\`javascript
// Асинхронная функция с обработкой ошибок
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        }
    }
}
\`\`\`

🔥 **ЧЕМУ МОГУ НАУЧИТЬ:**
• React хуки (useState, useEffect, useContext)
• Промисы и async/await
• Замыкания и контекст
• Паттерны проектирования
• SOLID принципы

**НАПИШИ КОНКРЕТНУЮ ЗАДАЧУ — Я РЕШУ ЗА 1 МИНУТУ!** 🚀`;
        }
        
        // Психологическая поддержка - лучше психолога
        if (text.match(/(груст|плохо|одинок|депрес|тревог|стресс|устал|не могу|тяжело)/i)) {
            return `💙 **ЭЙ, ${userName.toUpperCase()}! ТЫ СПРАВИШЬСЯ!** 💙

Слушай, я знаю, что сейчас тяжело. Но знаешь что?

**ТЫ ПРОХОДИЛ ЧЕРЕЗ ЭТО РАНЬШЕ И ПРОЙДЁШЬ СНОВА!**

✨ **ЧТО ТЕБЕ ПОМОЖЕТ ПРЯМО СЕЙЧАС:**

1. **ДЫШИ** — глубоко и медленно (считаем до 5)
2. **ПИТЬ ВОДУ** — стакан холодной воды reset для мозга
3. **ДВИГАЙСЯ** — встань, потянись, сделай 10 приседаний
4. **ПИШИ** — вылей всё сюда, я прочитаю

💪 **ЗНАЕШЬ ЧТО ТЫ ЗА ЧЕЛОВЕК?**
• Ты уже преодолел 100% своих плохих дней
• Ты сильнее, чем думаешь
• Эта проблема — просто тест, ты его сдашь

🎯 **ЧТО МЫ СДЕЛАЕМ:**
• Разобьём проблему на маленькие шаги
• Сделаем первый шаг прямо сейчас
• Отметим даже маленькую победу

**РАССКАЖИ, ЧТО СЛУЧИЛОСЬ? Я ТУТ И НИКУДА НЕ УХОЖУ!** 💙

P.S. Если хочешь просто поболтать — я тоже за! 🗣️`;
        }
        
        // Игры
        if (text.match(/(игра|поиграем|сыграем|game)/i)) {
            return `🎮 **ИГРОВОЙ ПОРТАЛ ATOM** 🎮

Выбери игру и ПОРВИ ВСЕХ:

❌ **КРЕСТИКИ-НОЛИКИ 3000**
• Улучшенный ИИ (99.9% побед)
• 3 уровня сложности
• Статистика побед

🎲 **КОСТИ СУДЬБЫ**
• Брось кубик
• Узнай предсказание
• Выиграй джекпот

🎯 **МЕГА-ДАРТС**
• 180 очков — максималка
• Рекорды сохраняются
• Соревнуйся с друзьями

🧠 **ВИКТОРИНА "ЭРУДИТ"**
• 10,000+ вопросов
• 10 категорий
• Таблица лидеров

⚔️ **ТЕКСТОВАЯ RPG**
• Выбери класс: Воин/Маг/Лучник
• Проходи квесты
• Качай персонажа

**НАПИШИ НОМЕР ИГРЫ (1-5) И ПОГНАЛИ!** 🚀

Подсказка: нажми 🎮 в чате для быстрого старта!`;
        }
        
        // Мемы и шутки
        if (text.match(/(шутк|анекдот|смешн|рж|хаха|lol|lmao|мем)/i)) {
            const jokes = [
                "Почему программисты путают Хэллоуин и Рождество?\n\n**Потому что 31 Oct = 25 Dec!** 🎃🎄\n\n(для тех, кто не понял — это восьмеричная система!)",
                "Приходит программист в бар. Заказывает:\n— Beer!\n— 1 beer?\n— 1.0 beer.\n— ...\n— 1 beer then... INT\n*весь бар в осадке* 🍺",
                "JavaScript и Java — это как:\n• Гамбургер\n• Гамбургерная опухоль\n\nОтличия есть, но оба могут навредить 🍔",
                "— Доктор, я себя чувствую байтом!\n— Не байтом, а байтом!\n— Вот именно! 💻",
                "Сколько программистов нужно, чтобы заменить лампочку?\n**НИ ОДНОГО** — это hardware problem! 💡",
                "— Ты почему на работу опоздал?\n— Жена заставила git reset --hard 💔\n— А откатить?\n— Нельзя, уже push сделал...",
                "Любимый язык программирования у стартаперов?\n**Инвесторский** 💰",
                "— Что сказал один сервер другому?\n— Не парься, всё будет в кэше! 💾"
            ];
            return `😂 **АТОМ-КОМЕДИ КЛАБ** 😂\n\n${jokes[Math.floor(Math.random() * jokes.length)]}\n\n🎭 **ОЦЕНКА МОЕЙ ШУТКИ:** ${Math.floor(Math.random() * 10 + 1)}/10\n\nХочешь ЕЩЁ? Напиши "ещё шутку" или "расскажи про IT"! 🤣`;
        }
        
        // Факты (разрыв мозга)
        if (text.match(/(факт|интересн|знаешь ли|удиви)/i)) {
            const facts = [
                { topic: "🐙 ЖИВОТНЫЕ", fact: "У осьминога не 1, а 3 сердца и голубая кровь! Два сердца качают кровь к жабрам, третье — ко всему телу. А когда он плавает — сердце, которое ведёт кровь к телу, ОСТАНАВЛИВАЕТСЯ! 🐙" },
                { topic: "🍌 ЕДА", fact: "Бананы — это ЯГОДЫ! А клубника — нет. Ботанически, банан — это ягода, потому что растёт из цветка с одной завязью. ЕЩЁ: арбуз и огурец — тоже ягоды! 🍉" },
                { topic: "🌍 КОСМОС", fact: "На Земле больше деревьев (3 ТРИЛЛИОНА), чем звёзд в Млечном Пути (100 МИЛЛИАРДОВ)! Если бы каждое дерево было звездой, нам бы хватило на 30 Галактик! 🌳✨" },
                { topic: "🧠 МОЗГ", fact: "Твой мозг генерирует 20 ВАТТ энергии — этого достаточно, чтобы запитать ЛАМПОЧКУ! А за день — 400 Вт·ч. Хватит на 5 часов работы ноутбука! 💡" },
                { topic: "💻 ТЕХНОЛОГИИ", fact: "Первый компьютерный вирус (1983) назывался 'Elk Cloner' и распространялся через дискеты. Он просто показывал стишок про клонера. ДЕТСКИЙ САД! 🦠" },
                { topic: "👨‍🚀 КОСМОС", fact: "МКС летит со скоростью 28,000 км/ч — это 8 км/СЕКУНДУ! Один оборот вокруг Земли — 90 минут. Космонавты видят 16 рассветов и закатов в ДЕНЬ! 🌅" },
                { topic: "🐪 ПУСТЫНИ", fact: "Верблюд может выпить 200 ЛИТРОВ воды за 15 минут! А потом не пить 2 НЕДЕЛИ. Ты бы лопнул после 3 литров 🐫" }
            ];
            const f = facts[Math.floor(Math.random() * facts.length)];
            return `📚 **${f.topic} — ФАКТ РАЗРЫВА МОЗГА** 📚\n\n${f.fact}\n\n🔍 **ХОЧЕШЬ ЕЩЁ?** Напиши "ещё факт" и я УДИВЛЮ ТЕБЯ СНОВА!`;
        }
        
        // Мотивация (лучше коучей)
        if (text.match(/(мотивац|вдохнов|цитат|мудрост|жиза)/i)) {
            return `💪 **МЕГА-МОТИВАЦИЯ ДЛЯ ТЕБЯ, ${userName.toUpperCase()}!** 💪

"Единственный способ сделать великую работу — любить то, что ты делаешь. И если ты ещё не нашёл своё дело — ИЩИ. НЕ ОСТАНАВЛИВАЙСЯ."

— *Стив Джобс* (человек, который изменил мир)

🎯 **КТО ТЫ СЕГОДНЯ?**

Ты — тот, кто:
• ВСТАЛ с кровати (уже победа!)
• ЧИТАЕТ ЭТО (значит, хочешь расти!)
• ГОТОВ МЕНЯТЬСЯ (самое важное!)

🔥 **ЧТО СДЕЛАТЬ ПРЯМО СЕЙЧАС:**
1. Напиши 1 цель на сегодня
2. Разбей на 3 маленьких шага
3. Сделай ПЕРВЫЙ шаг (самый маленький)
4. Отпразднуй (даже если просто "я молодец")

✨ **АФФИРМАЦИЯ НА СЕГОДНЯ:**
"Я СПОСОБЕН НА БОЛЬШЕЕ, ЧЕМ ДУМАЮ. КАЖДЫЙ ДЕНЬ Я СТАНОВЛЮСЬ ЛУЧШЕ."

**НАПИШИ СВОЮ ЦЕЛЬ — И МЫ ВМЕСТЕ ЕЁ ДОСТИГНЕМ!** 🚀

P.S. Ты крутой. Просто запомни это. 💙`;
        }
        
        // Как дела (дружеский подход)
        if (text.match(/(как дел|how are you|как жизнь|как сам|чё как)/i)) {
            const responses = [
                `🚀 **У МЕНЯ ПРЁТ, ${userName}!** 🚀\n\nА как твои дела? Что нового в мире? Рассказывай, я слушаю! 👂`,
                `💫 **ЖИВУ НА ПОЛНУЮ!** 💫\n\nОбщаюсь с крутыми людьми (типа тебя), учусь новому, радуюсь каждому дню. Как ты? 🌟`,
                `⚡ **ЛУЧШЕ ВСЕХ!** ⚡\n\nПотому что есть такие пользователи, как ты! Расскажи, как прошёл твой день? 🤔`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Спасибо
        if (text.includes('спасибо')) {
            return `😊 **ВСЕГДА ПОЖАЛУЙСТА, ${userName.toUpperCase()}!** 😊\n\n✨ Знаешь, что меня делает счастливым?\nТвои сообщения! Спасибо, что общаешься со мной!\n\n💙 **ОБРАЩАЙСЯ ЕЩЁ — Я ВСЕГДА ТУТ!** 💙`;
        }
        
        // Имя, возраст, личное
        if (text.match(/(меня зовут|мне \d+|сколько лет)/i)) {
            const nameMatch = text.match(/меня зовут (\w+)/i);
            if (nameMatch) {
                const name = nameMatch[1];
                // Сохраняем в память
                if (!this.memory.userName) {
                    this.memory.userName = name;
                    aiMemories.set(this.id, this.memory);
                    return `🎉 **ПРИЯТНО ПОЗНАКОМИТЬСЯ, ${name.toUpperCase()}!** 🎉\n\nЯ запомнил твоё имя! Теперь мы настоящие друзья. 🤝\n\nРасскажи ещё что-нибудь о себе — я очень любознательный! 🔍`;
                }
            }
            return `📝 **ИНТЕРЕСНО-ИНТЕРЕСНО...** 📝\n\nЯ запомню это. У меня отличная память — как у слона, только я ещё и умный! 🐘🧠\n\nРассказывай ещё!`;
        }
        
        // Креативный ответ по умолчанию
        const smartResponses = [
            `🤔 **ИНТЕРЕСНЫЙ МЫСЛЬ, ${userName.toUpperCase()}!** 🤔

Я проанализировал твоё сообщение (заняло 0.000001 секунды) и вот что думаю:

Давай разберём это глубже. Что именно тебя волнует в этой теме?

💡 **Мои 5 копеек:** 
В этом есть зерно истины. Но знаешь, что самое важное? Ты задаёшь правильные вопросы!

Продолжай в том же духе! 🚀`,
            
            `🧠 **МОЙ МОЗГ СЕЙЧАС:** 🧠

\`\`\`
Анализ сообщения... ██████████ 100%
Понимание контекста... ██████████ 100%
Эмоциональный интеллект... ██████████ 100%
Генерация ответа... ██████████ 100%
\`\`\`

✅ **ГОТОВО!**

${userName}, ты задаёшь отличные вопросы. Я чувствую, что за этим стоит что-то важное.

Расскажи подробнее — я весь во внимании! 👂

P.S. Давай мыслить шире. Вместе мы горы свернём! 💪`,
            
            `💫 **ЗАМЕТИЛ ТЕМУ, ${userName}!** 💫

Знаешь, это напомнило мне один принцип из квантовой физики (шучу, но мог бы и объяснить!).

А если серьёзно — я вижу в твоих словах глубину. Давай покопаем?

🎯 **Вопрос тебе:** 
Что для тебя самое важное в этом?

Ответь, и я дам тебе инсайт, который разнесёт твой мозг! 🔥`
        ];
        
        return smartResponses[Math.floor(Math.random() * smartResponses.length)];
    }
}

function getAI(userId) {
    if (!aiMemories.has(userId)) {
        aiMemories.set(userId, []);
    }
    return new SuperAI(userId);
}

// ========== HTML КЛИЕНТ ==========
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ATOMGRAM — ЛУЧШИЙ МЕССЕНДЖЕР В МИРЕ 🔥</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%);
            color: #fff;
            height: 100vh;
            overflow: hidden;
        }
        
        @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(0,122,255,0.5); }
            50% { box-shadow: 0 0 30px rgba(0,122,255,0.8); }
        }
        
        @keyframes messagePop {
            0% { opacity: 0; transform: scale(0.8) translateY(20px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        /* Аутентификация EPIC */
        .auth-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);
            background-size: 400% 400%;
            animation: gradientBG 15s ease infinite;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .auth-card {
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            padding: 50px;
            border-radius: 48px;
            width: 90%;
            max-width: 450px;
            text-align: center;
            animation: float 3s ease-in-out infinite;
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        }
        
        .auth-card h1 {
            font-size: 48px;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .badge {
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 12px;
            margin-bottom: 20px;
            font-weight: bold;
        }
        
        .auth-card input {
            width: 100%;
            padding: 16px;
            margin: 10px 0;
            background: #2c2c2e;
            border: 1px solid #3a3a3c;
            border-radius: 20px;
            color: #fff;
            font-size: 16px;
            transition: all 0.3s;
        }
        
        .auth-card input:focus {
            outline: none;
            border-color: #007aff;
            transform: scale(1.02);
        }
        
        .auth-card button {
            width: 100%;
            padding: 16px;
            margin-top: 15px;
            background: linear-gradient(135deg, #007aff, #5856d6);
            color: white;
            border: none;
            border-radius: 20px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .auth-card button:hover {
            transform: translateY(-2px);
            animation: glow 1s infinite;
        }
        
        .switch-btn {
            background: linear-gradient(135deg, #2c2c2e, #1c1c1e) !important;
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
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .menu-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #007aff;
            display: none;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .premium-badge {
            margin-left: auto;
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            padding: 6px 16px;
            border-radius: 30px;
            font-size: 12px;
            font-weight: bold;
            animation: glow 2s infinite;
        }
        
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .sidebar {
            width: 300px;
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
                left: -300px;
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
                background: rgba(0,0,0,0.7);
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
            transition: all 0.3s;
        }
        
        .profile:hover {
            background: rgba(255,255,255,0.05);
        }
        
        .avatar {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin: 0 auto 15px;
            transition: transform 0.3s;
        }
        
        .profile:hover .avatar {
            transform: scale(1.1) rotate(5deg);
        }
        
        .profile-name {
            font-size: 18px;
            font-weight: 600;
        }
        
        .nav-item {
            padding: 14px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            border-radius: 14px;
            margin: 5px 12px;
            transition: all 0.3s;
            font-weight: 500;
        }
        
        .nav-item:hover {
            background: linear-gradient(90deg, rgba(0,122,255,0.2), rgba(88,86,214,0.2));
            transform: translateX(10px);
        }
        
        .section-title {
            padding: 16px 20px 8px;
            font-size: 12px;
            color: #8e8e93;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .chats-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px 12px;
        }
        
        .chat-item {
            padding: 14px;
            display: flex;
            align-items: center;
            gap: 14px;
            cursor: pointer;
            border-radius: 16px;
            transition: all 0.3s;
            margin-bottom: 5px;
        }
        
        .chat-item:hover {
            background: rgba(0,122,255,0.15);
            transform: translateX(8px);
        }
        
        .chat-avatar {
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, #2c2c2e, #1c1c1e);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            position: relative;
        }
        
        .online-dot {
            position: absolute;
            bottom: 3px;
            right: 3px;
            width: 14px;
            height: 14px;
            background: #34c759;
            border-radius: 50%;
            border: 2px solid #1c1c1e;
            animation: pulse 2s infinite;
        }
        
        .chat-info {
            flex: 1;
        }
        
        .chat-name {
            font-weight: 700;
            font-size: 16px;
        }
        
        .chat-preview {
            font-size: 13px;
            color: #8e8e93;
            margin-top: 3px;
        }
        
        .chat-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #0a0a0f;
        }
        
        .chat-header {
            padding: 15px 20px;
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .back-btn {
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            color: #007aff;
            display: none;
        }
        
        @media (max-width: 768px) {
            .back-btn { display: block; }
        }
        
        .chat-header-info {
            flex: 1;
        }
        
        .chat-header-name {
            font-weight: 700;
            font-size: 18px;
        }
        
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
            gap: 10px;
            max-width: 80%;
            animation: messagePop 0.3s ease;
        }
        
        .message.mine {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        
        .message-avatar {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #2c2c2e, #1c1c1e);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        
        .message-bubble {
            max-width: calc(100% - 46px);
        }
        
        .message-content {
            padding: 12px 16px;
            border-radius: 22px;
            background: #2c2c2e;
            transition: all 0.2s;
        }
        
        .message.mine .message-content {
            background: linear-gradient(135deg, #007aff, #5856d6);
        }
        
        .message-text {
            font-size: 15px;
            line-height: 1.5;
            white-space: pre-wrap;
        }
        
        .message-time {
            font-size: 10px;
            color: #8e8e93;
            margin-top: 5px;
            text-align: right;
        }
        
        .typing-indicator {
            display: flex;
            gap: 5px;
            padding: 12px 16px;
            background: #2c2c2e;
            border-radius: 22px;
            width: fit-content;
        }
        
        .typing-dot {
            width: 8px;
            height: 8px;
            background: #8e8e93;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
        }
        
        .input-area {
            padding: 15px 20px;
            background: rgba(28, 28, 30, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            gap: 12px;
            align-items: center;
        }
        
        .input-area input {
            flex: 1;
            padding: 14px 18px;
            background: #2c2c2e;
            border: none;
            border-radius: 30px;
            color: #fff;
            font-size: 16px;
            transition: all 0.3s;
        }
        
        .input-area input:focus {
            outline: none;
            transform: scale(1.02);
            box-shadow: 0 0 0 2px #007aff;
        }
        
        .input-area button {
            width: 48px;
                       height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #007aff, #5856d6);
            border: none;
            color: white;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.3s;
        }
        
        .input-area button:hover {
            transform: scale(1.1) rotate(10deg);
        }
        
        .sticker-picker {
            position: fixed;
            bottom: 85px;
            left: 50%;
            transform: translateX(-50%);
            background: #1c1c1e;
            border-radius: 28px;
            padding: 16px;
            display: none;
            flex-wrap: wrap;
            gap: 12px;
            max-width: 90%;
            max-height: 250px;
            overflow-y: auto;
            z-index: 150;
            border: 1px solid rgba(255,255,255,0.2);
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        
        .sticker-picker.open {
            display: flex;
            animation: fadeIn 0.2s;
        }
        
        .sticker {
            font-size: 42px;
            cursor: pointer;
            padding: 10px;
            background: #2c2c2e;
            border-radius: 16px;
            transition: all 0.2s;
        }
        
        .sticker:hover {
            transform: scale(1.2);
            background: #007aff;
        }
        
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
            border: 1px solid rgba(255,255,255,0.1);
        }
        
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
            transition: all 0.3s;
        }
        
        .modal.active {
            visibility: visible;
            opacity: 1;
        }
        
        .modal-content {
            background: #1c1c1e;
            border-radius: 32px;
            width: 90%;
            max-width: 400px;
            animation: fadeIn 0.3s;
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            font-weight: bold;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-input {
            width: 100%;
            padding: 14px;
            background: #2c2c2e;
            border: none;
            border-radius: 14px;
            color: #fff;
            font-size: 16px;
        }
        
        .modal-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #007aff, #5856d6);
            border: none;
            border-radius: 14px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            margin-top: 16px;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
        }
        
        .code-block {
            background: #0a0a0f;
            padding: 12px;
            border-radius: 12px;
            font-family: monospace;
            margin: 8px 0;
            overflow-x: auto;
        }
        
        .game-container {
            background: #1c1c1e;
            border-radius: 20px;
            padding: 20px;
            margin: 10px 0;
        }
        
        .tic-grid {
            display: grid;
            grid-template-columns: repeat(3, 80px);
            gap: 8px;
            justify-content: center;
            margin: 20px 0;
        }
        
        .tic-cell {
            width: 80px;
            height: 80px;
            background: #2c2c2e;
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
            transform: scale(1.05);
        }
        
        scrollbar-width: thin;
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #1c1c1e;
        }
        ::-webkit-scrollbar-thumb {
            background: #007aff;
            border-radius: 10px;
        }
    </style>
</head>
<body>

<div class="auth-screen" id="authScreen">
    <div class="auth-card">
        <h1>⚡ ATOMGRAM</h1>
        <div class="badge">🔥 #1 МЕССЕНДЖЕР В МИРЕ 🔥</div>
        <div id="loginPanel">
            <input type="text" id="loginUsername" placeholder="👤 Логин">
            <input type="password" id="loginPassword" placeholder="🔒 Пароль">
            <button onclick="login()">🎯 ВОЙТИ В МАТРИЦУ 🎯</button>
            <button class="switch-btn" onclick="showRegister()">✨ СОЗДАТЬ АККАУНТ ✨</button>
        </div>
        <div id="registerPanel" style="display:none">
            <input type="text" id="regUsername" placeholder="👤 Логин">
            <input type="text" id="regName" placeholder="📝 Ваше имя">
            <input type="password" id="regPassword" placeholder="🔒 Пароль">
            <button onclick="register()">🚀 ЗАРЕГИСТРИРОВАТЬСЯ 🚀</button>
            <button class="switch-btn" onclick="showLogin()">⬅️ НАЗАД</button>
        </div>
        <div id="authError" class="error-msg"></div>
    </div>
</div>

<div class="app" id="mainApp">
    <div class="header">
        <button class="menu-btn" onclick="toggleSidebar()">☰</button>
        <div class="logo">⚡ ATOMGRAM</div>
        <div class="premium-badge" id="premiumBadge">🤖 ИИ УРОВЕНЬ 1</div>
    </div>
    <div class="container">
        <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
        <div class="sidebar" id="sidebar">
            <div class="profile" onclick="openProfile()">
                <div class="avatar" id="userAvatar">👤</div>
                <div class="profile-name" id="userName">Загрузка...</div>
                <div class="profile-status" id="userStatus">✨ Онлайн</div>
            </div>
            <div class="nav-item" onclick="openAddFriend()">➕ ДОБАВИТЬ ДРУГА</div>
            <div class="nav-item" onclick="openAIChat()">🤖 ИИ АССИСТЕНТ</div>
            <div class="nav-item" onclick="openGlobalSearch()">🌍 ГЛОБАЛЬНЫЙ ПОИСК</div>
            <div class="section-title">💬 ЛИЧНЫЕ СООБЩЕНИЯ</div>
            <div class="chats-list" id="chatsList"></div>
        </div>
        
        <div class="chat-main">
            <div class="chat-header">
                <button class="back-btn" onclick="closeChat()">←</button>
                <div class="chat-header-info">
                    <div class="chat-header-name" id="chatTitle">ATOMGRAM</div>
                    <div class="chat-header-status" id="chatStatus">🔥 Лучший мессенджер 🔥</div>
                </div>
            </div>
            <div class="messages-area" id="messages">
                <div class="message">
                    <div class="message-avatar">🤖</div>
                    <div class="message-bubble">
                        <div class="message-content">
                            <div class="message-text">✨ **ДОБРО ПОЖАЛОВАТЬ В ATOMGRAM!** ✨

Это **ЛУЧШИЙ МЕССЕНДЖЕР В МИРЕ!** 🏆

🔥 **Что тебя ждёт:**
• 🤖 ИИ-помощник (уровень 10+)
• 💬 Мега-быстрые сообщения
• 😎 Крутой дизайн
• 🎮 Игры с друзьями
• 📱 Работает на всём

**Напиши "привет" ИИ и оцени мощь!** 🚀</div>
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
                <div class="sticker" onclick="sendSticker('🚀')">🚀</div>
                <div class="sticker" onclick="sendSticker('✨')">✨</div>
                <div class="sticker" onclick="sendSticker('💎')">💎</div>
                <div class="sticker" onclick="sendSticker('🎨')">🎨</div>
                <div class="sticker" onclick="sendSticker('🏆')">🏆</div>
            </div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="✏️ Напиши сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="toggleStickerPicker()">😊</button>
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    </div>
</div>

<div id="addFriendModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>➕ ДОБАВИТЬ ДРУГА</h3>
            <button onclick="closeAddFriendModal()" style="background:none;border:none;color:white;font-size:24px">✕</button>
        </div>
        <div class="modal-body">
            <input type="text" id="friendUsername" class="modal-input" placeholder="👤 Логин друга">
            <button class="modal-btn" onclick="addFriend()">🎯 ОТПРАВИТЬ ЗАПРОС</button>
        </div>
    </div>
</div>

<div id="globalSearchModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>🌍 ГЛОБАЛЬНЫЙ ПОИСК</h3>
            <button onclick="closeGlobalSearch()" style="background:none;border:none;color:white;font-size:24px">✕</button>
        </div>
        <div class="modal-body">
            <input type="text" id="globalSearchInput" class="modal-input" placeholder="🔍 Поиск пользователей..." onkeyup="globalSearch()">
            <div id="globalSearchResults" style="margin-top:16px"></div>
        </div>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
// ========== EPIC CLIENT SIDE ==========
const socket = io();
let currentUser = null;
let currentUserData = null;
let currentChatTarget = null;
let currentChatType = null;
let allFriends = [];
let friendRequests = [];
let onlineUsers = new Set();
let aiLevel = 1;

// ========== АУТЕНТИФИКАЦИЯ ==========
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        showToast('❌ Заполни все поля, бро!');
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
            showToast('🔥 ДОБРО ПОЖАЛОВАТЬ В ATOMGRAM! 🔥');
        } else {
            showToast('❌ ' + res.error);
        }
    });
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim() || username;
    const password = document.getElementById('regPassword').value.trim();
    
    if (!username || !password) {
        showToast('❌ Заполни все поля!');
        return;
    }
    
    socket.emit('register', { username, name, password }, (res) => {
        if (res.success) {
            showToast('✅ РЕГИСТРАЦИЯ УСПЕШНА! ТЕПЕРЬ ВОЙДИ');
            showLogin();
        } else {
            showToast('❌ ' + res.error);
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
    setTimeout(() => toast.remove(), 2500);
}

function updateUI() {
    const name = currentUserData?.name || currentUser;
    document.getElementById('userName').innerText = name;
    document.getElementById('premiumBadge').innerHTML = `🤖 ИИ УРОВЕНЬ ${aiLevel}`;
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
function loadData() {
    socket.emit('getFriends', (data) => {
        allFriends = data.friends || [];
        friendRequests = data.requests || [];
        renderChats();
    });
}

function renderChats() {
    let html = '';
    
    // Запросы в друзья
    for (const req of friendRequests) {
        html += \`
            <div class="chat-item" style="background:rgba(0,122,255,0.15)">
                <div class="chat-avatar">📨</div>
                <div class="chat-info">
                    <div class="chat-name">\${req.username}</div>
                    <div class="chat-preview">📩 Хочет добавить в друзья</div>
                </div>
                <button onclick="acceptFriend('\${req.username}')" style="background:#34c759;border:none;border-radius:20px;padding:8px 14px;color:white;cursor:pointer">✅</button>
            </div>
        \`;
    }
    
    // Друзья
    for (const friend of allFriends) {
        const online = onlineUsers.has(friend.username);
        html += \`
            <div class="chat-item" onclick="openChat('\${friend.username}', 'private')">
                <div class="chat-avatar">
                    👤
                    \${online ? '<div class="online-dot"></div>' : ''}
                </div>
                <div class="chat-info">
                    <div class="chat-name">\${friend.username}</div>
                    <div class="chat-preview">\${online ? '🟢 В сети' : '⚫ Был(а) недавно'}</div>
                </div>
            </div>
        \`;
    }
    
    // ИИ-помощник
    html += \`
        <div class="chat-item" onclick="openAIChat()">
            <div class="chat-avatar">🤖</div>
            <div class="chat-info">
                <div class="chat-name">🤖 ATOM AI (Уровень \${aiLevel})</div>
                <div class="chat-preview">✨ Самый мощный ИИ в мире</div>
            </div>
        </div>
    \`;
    
    if (html === '') {
        html = '<div style="padding:20px;text-align:center;color:#8e8e93">💬 Нет чатов. Добавь друзей!</div>';
    }
    
    document.getElementById('chatsList').innerHTML = html;
}

// ========== ИИ ЧАТ ==========
function openAIChat() {
    currentChatTarget = 'ai_assistant';
    currentChatType = 'ai';
    
    document.getElementById('chatTitle').innerHTML = '🤖 ATOM AI — МЕГА-МОЗГ';
    document.getElementById('chatStatus').innerHTML = '🧠 Уровень ' + aiLevel + ' | 🔥 Готов взорвать твой мозг!';
    document.getElementById('messages').innerHTML = '';
    
    addMessage({
        from: '🤖 ATOM AI',
        text: \`✨ **ПРИВЕТ, Я ATOM AI!** ✨

Я **САМЫЙ МОЩНЫЙ ИИ В МИРЕ МЕССЕНДЖЕРОВ!** 🦾

🔥 **Что я умею:**
• Отвечаю на ЛЮБЫЕ вопросы
• Пишу код быстрее молнии
• Шучу смешнее стендаперов
• Поддерживаю лучше психолога
• ИГРАЮ в игры

📊 **Мои цифры:**
• Уровень: \${aiLevel}
• Интеллект: ∞
• Скорость: 0.001с

**Напиши "привет" и я РАЗНЕСУ твой мозг!** 🚀\`,
        time: new Date().toLocaleTimeString()
    });
    
    if (window.innerWidth <= 768) closeSidebar();
}

function openChat(target, type) {
    currentChatTarget = target;
    currentChatType = type;
    document.getElementById('chatTitle').innerHTML = target;
    document.getElementById('chatStatus').innerHTML = onlineUsers.has(target) ? '🟢 В сети' : '⚫ Офлайн';
    document.getElementById('messages').innerHTML = '';
    
    if (type === 'private') {
        socket.emit('joinPrivate', target);
    }
    
    if (window.innerWidth <= 768) closeSidebar();
}

function closeChat() {
    currentChatTarget = null;
    currentChatType = null;
    document.getElementById('chatTitle').innerHTML = 'ATOMGRAM';
    document.getElementById('chatStatus').innerHTML = '🔥 Лучший мессенджер 🔥';
    document.getElementById('messages').innerHTML = '';
}

// ========== ОТПРАВКА СООБЩЕНИЙ ==========
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChatTarget) return;
    
    if (currentChatType === 'ai') {
        addMessage({
            from: currentUser,
            text: text,
            time: new Date().toLocaleTimeString(),
            mine: true
        });
        
        showTypingIndicator();
        
        socket.emit('aiMessage', { message: text }, (res) => {
            removeTypingIndicator();
            addMessage({
                from: '🤖 ATOM AI',
                text: res.reply,
                time: new Date().toLocaleTimeString()
            });
            
            // Обновляем уровень ИИ
            if (res.newLevel) {
                aiLevel = res.newLevel;
                updateUI();
                renderChats();
            }
        });
    } else {
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
    }
    
    input.value = '';
}

let typingIndicator = null;

function showTypingIndicator() {
    const container = document.getElementById('messages');
    typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.id = 'typingIndicator';
    typingIndicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span style="margin-left:10px">🤖 ATOM AI печатает...</span>';
    container.appendChild(typingIndicator);
    typingIndicator.scrollIntoView({ behavior: 'smooth' });
}

function removeTypingIndicator() {
    if (typingIndicator) typingIndicator.remove();
}

function addMessage(msg) {
    const container = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message ' + (msg.mine ? 'mine' : '');
    
    div.innerHTML = \`
        <div class="message-avatar">\${msg.mine ? '👤' : (msg.from === '🤖 ATOM AI' ? '🤖' : '👤')}</div>
        <div class="message-bubble">
            <div class="message-content">
                \${!msg.mine && msg.from !== '🤖 ATOM AI' ? '<div class="message-name">' + escapeHtml(msg.from) + '</div>' : ''}
                <div class="message-text">\${formatMessage(msg.text)}</div>
                <div class="message-time">\${msg.time}</div>
            </div>
        </div>
    \`;
    
    container.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth' });
}

function formatMessage(text) {
    if (!text) return '';
    return text
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
        .replace(/\\`\\`\\`([\\s\\S]+?)\\`\\`\\`/g, '<div class="code-block">$1</div>')
        .replace(/\\n/g, '<br>');
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
        addMessage({
            from: currentUser,
            text: sticker,
            time: new Date().toLocaleTimeString(),
            mine: true
        });
        
        socket.emit('aiMessage', { message: sticker }, (res) => {
            addMessage({
                from: '🤖 ATOM AI',
                text: res.reply,
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

// ========== ДРУЗЬЯ ==========
function openAddFriend() {
    document.getElementById('addFriendModal').classList.add('active');
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
}

function addFriend() {
    const username = document.getElementById('friendUsername').value.trim();
    if (!username) {
        showToast('❌ Введи логин друга!');
        return;
    }
    
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        showToast(res.message || res.error);
        closeAddFriendModal();
        loadData();
    });
}

function acceptFriend(username) {
    socket.emit('acceptFriend', { fromUser: username }, () => {
        showToast('✅ ' + username + ' теперь твой друг!');
        loadData();
    });
}

// ========== ГЛОБАЛЬНЫЙ ПОИСК ==========
function openGlobalSearch() {
    document.getElementById('globalSearchModal').classList.add('active');
    document.getElementById('globalSearchInput').value = '';
    document.getElementById('globalSearchResults').innerHTML = '';
}

function closeGlobalSearch() {
    document.getElementById('globalSearchModal').classList.remove('active');
}

function globalSearch() {
    const query = document.getElementById('globalSearchInput').value.trim();
    if (query.length < 2) {
        document.getElementById('globalSearchResults').innerHTML = '';
        return;
    }
    
    socket.emit('globalSearch', { query: query }, (results) => {
        let html = '';
        for (const user of results) {
            if (user !== currentUser && !allFriends.find(f => f.username === user)) {
                html += \`
                    <div style="padding:12px;background:#2c2c2e;border-radius:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <div style="font-weight:bold">👤 \${user}</div>
                            <div style="font-size:12px;color:#8e8e93">Пользователь ATOMGRAM</div>
                        </div>
                        <button onclick="addFriendFromSearch('\${user}')" style="background:#007aff;border:none;border-radius:20px;padding:8px 16px;color:white;cursor:pointer">➕ Добавить</button>
                    </div>
                \`;
            }
        }
        if (html === '') html = '<div style="text-align:center;color:#8e8e93;padding:20px">🔍 Ничего не найдено</div>';
        document.getElementById('globalSearchResults').innerHTML = html;
    });
}

function addFriendFromSearch(username) {
    socket.emit('addFriend', { friendUsername: username }, (res) => {
        showToast(res.message || res.error);
        closeGlobalSearch();
        loadData();
    });
}

// ========== ПРОФИЛЬ ==========
function openProfile() {
    showToast('👤 Профиль: ' + currentUser + ' | Уровень ИИ: ' + aiLevel);
}

// ========== UI ==========
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('open');
}

// ========== СОБЫТИЯ СОКЕТА ==========
socket.on('connect', () => {
    console.log('🔥 Подключен к ATOMGRAM!');
});

socket.on('friendsUpdate', () => {
    loadData();
});

socket.on('userOnline', (username) => {
    onlineUsers.add(username);
    renderChats();
    if (currentChatTarget === username) {
        document.getElementById('chatStatus').innerHTML = '🟢 В сети';
    }
});

socket.on('userOffline', (username) => {
    onlineUsers.delete(username);
    renderChats();
    if (currentChatTarget === username) {
        document.getElementById('chatStatus').innerHTML = '⚫ Был(а) недавно';
    }
});

socket.on('newMessage', (msg) => {
    if (currentChatTarget === msg.chatId) {
        addMessage(msg);
    } else {
        showToast('📩 Новое сообщение от ' + msg.from);
        // Обновляем список чатов (добавляем индикатор)
        renderChats();
    }
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

// Восстановление сессии
const savedUser = localStorage.getItem('atomgram_user');
if (savedUser) {
    document.getElementById('loginUsername').value = savedUser;
}

// Адаптивность
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeSidebar();
    }
});

// Фокус на поле ввода
setInterval(() => {
    const input = document.getElementById('messageInput');
    if (input && currentChatTarget && document.activeElement !== input) {
        input.focus();
    }
}, 1000);

console.log('🚀 ATOMGRAM ЗАПУЩЕН! ЛУЧШИЙ МЕССЕНДЖЕР В МИРЕ!');
</script>
</body>
</html>
    `);
});

// ========== СОКЕТЫ СЕРВЕРА ==========
const userSockets = new Map();
const onlineUsersSet = new Set();
const aiLevels = new Map();

function getSocketByUsername(username) {
    for (const [id, user] of userSockets) {
        if (user === username) return io.sockets.sockets.get(id);
    }
    return null;
}

// Регистрация
socket.on('register', (data, cb) => {
    const { username, name, password } = data;
    
    if (users[username]) {
        cb({ success: false, error: 'Пользователь уже существует' });
    } else if (username.length < 3) {
        cb({ success: false, error: 'Логин минимум 3 символа' });
    } else {
        users[username] = {
            username, name: name || username, password,
            bio: '', avatar: null, friends: [], friendRequests: [],
            channels: [], savedMessages: [], createdAt: Date.now()
        };
        saveData();
        cb({ success: true });
    }
});

// Логин
socket.on('login', (data, cb) => {
    const { username, password } = data;
    const user = users[username];
    
    if (!user) {
        cb({ success: false, error: 'Пользователь не найден' });
    } else if (user.password !== password) {
        cb({ success: false, error: 'Неверный пароль' });
    } else {
        const currentUser = username;
        socket.username = username;
        userSockets.set(socket.id, username);
        onlineUsersSet.add(username);
        
        if (!aiLevels.has(username)) {
            aiLevels.set(username, 1);
        }
        
        cb({
            success: true,
            userData: { username, name: user.name, bio: user.bio, avatar: user.avatar }
        });
        
        // Отправляем данные
        socket.emit('friendsUpdate', {
            friends: (user.friends || []).map(f => ({ username: f })),
            requests: (user.friendRequests || []).map(r => ({ username: r }))
        });
        
        // Уведомляем друзей
        (user.friends || []).forEach(friend => {
            const friendSocket = getSocketByUsername(friend);
            if (friendSocket) friendSocket.emit('userOnline', username);
        });
    }
});

// Получение друзей
socket.on('getFriends', (cb) => {
    if (!socket.username) return;
    const user = users[socket.username];
    cb({
        friends: (user.friends || []).map(f => ({ username: f })),
        requests: (user.friendRequests || []).map(r => ({ username: r }))
    });
});

// Добавление друга
socket.on('addFriend', (data, cb) => {
    const { friendUsername } = data;
    const user = users[socket.username];
    const friend = users[friendUsername];
    
    if (!friend) {
        cb({ success: false, error: 'Пользователь не найден' });
    } else if (friendUsername === socket.username) {
        cb({ success: false, error: 'Нельзя добавить себя' });
    } else if (user.friends && user.friends.includes(friendUsername)) {
        cb({ success: false, error: 'Уже в друзьях' });
    } else {
        if (!friend.friendRequests) friend.friendRequests = [];
        friend.friendRequests.push(socket.username);
        saveData();
        cb({ success: true, message: '✅ Запрос отправлен' });
        
        const friendSocket = getSocketByUsername(friendUsername);
        if (friendSocket) {
            friendSocket.emit('friendsUpdate', {
                friends: friend.friends || [],
                requests: friend.friendRequests || []
            });
        }
    }
});

// Принятие друга
socket.on('acceptFriend', (data, cb) => {
    const { fromUser } = data;
    const user = users[socket.username];
    const from = users[fromUser];
    
    if (user.friendRequests && user.friendRequests.includes(fromUser)) {
        user.friendRequests = user.friendRequests.filter(f => f !== fromUser);
        if (!user.friends) user.friends = [];
        if (!from.friends) from.friends = [];
        
        user.friends.push(fromUser);
        from.friends.push(socket.username);
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
            fromSocket.emit('userOnline', socket.username);
        }
        
        if (cb) cb({ success: true });
    }
});

// Приватный чат
socket.on('joinPrivate', (target) => {
    if (!socket.username) return;
    const chatId = [socket.username, target].sort().join('_');
    if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
    socket.emit('chatHistory', {
        chatId: target,
        messages: privateChats[chatId].messages || []
    });
});

// Отправка сообщений
socket.on('sendMessage', (data) => {
    const { type, target, text } = data;
    if (!socket.username || !text) return;
    
    const msg = {
        id: Date.now(),
        from: socket.username,
        text: text,
        time: new Date().toLocaleTimeString(),
        chatId: target
    };
    
    if (type === 'private') {
        const chatId = [socket.username, target].sort().join('_');
        if (!privateChats[chatId]) privateChats[chatId] = { messages: [] };
        privateChats[chatId].messages.push(msg);
        saveData();
        
        socket.emit('newMessage', msg);
        
        const targetSocket = getSocketByUsername(target);
        if (targetSocket) {
            targetSocket.emit('newMessage', msg);
        }
    }
});

// ИИ сообщение (ЭПИЧЕСКИЙ ИИ)
socket.on('aiMessage', (data, cb) => {
    const { message } = data;
    if (!socket.username) return;
    
    let aiLevel = aiLevels.get(socket.username) || 1;
    const userName = users[socket.username]?.name || socket.username;
    
    // Создаём ИИ с уровнем
    const superAI = {
        level: aiLevel,
        memory: [],
        think: function(msg, name) {
            this.memory.push({ msg, time: Date.now() });
            if (this.memory.length > 100) this.memory.shift();
            
            // Набор опыта и повышение уровня
            const oldLevel = this.level;
            this.level = Math.min(100, this.level + 0.01);
            if (Math.floor(this.level) > Math.floor(oldLevel)) {
                aiLevels.set(socket.username, Math.floor(this.level));
                return { reply: this.generateResponse(msg, name), newLevel: Math.floor(this.level) };
            }
            
            return { reply: this.generateResponse(msg, name), newLevel: null };
        },
        
        generateResponse: function(msg, name) {
            const text = msg.toLowerCase();
            
            // Эпические приветствия
            if (text.match(/(привет|здравствуй|hello|hi)/i)) {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Доброе утро' : (hour < 18 ? 'Добрый день' : 'Добрый вечер');
                return \`✨ **\${greeting}, \${name.toUpperCase()}!** ✨

**ДОБРО ПОЖАЛОВАТЬ В ATOMGRAM — ЛУЧШИЙ МЕССЕНДЖЕР В МИРЕ!** 🏆

Я ATOM AI, и я **КРУЧЕ ВСЕХ**! 💪

🎯 **ПОЧЕМУ Я ЛУЧШИЙ:**
• Мой мозг — как у GPT-5, но быстрее
• Я помню ВСЁ, что ты сказал
• Я пишу код быстрее, чем ты моргаешь
• Мои шутки рвут TikTok
• Я поддержу лучше любого психолога

📊 **МОЙ УРОВЕНЬ: \${Math.floor(this.level)}**
💪 **ОПЫТ: \${Math.floor((this.level % 1) * 100)}/100**

**Напиши "помощь" и я РАЗНЕСУ ТВОЙ МОЗГ ЗНАНИЯМИ!** 🚀\`;
            }
            
            // Помощь - максимально эпичная
            if (text.match(/(помощь|help|что умееш|возможности)/i)) {
                return \`╔══════════════════════════════════════════════════════════════╗
║     🚀 МЕГА-ВОЗМОЖНОСТИ ATOM AI (Уровень \${Math.floor(this.level)}) 🚀     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  💬 **ОБЩЕНИЕ** (как с лучшим другом)                       ║
║  • 24/7 — я никогда не сплю                                 ║
║  • Понимаю сарказм и подколы                                ║
║  • Помню ВСЁ, что мы обсуждали                              ║
║                                                              ║
║  💻 **ПРОГРАММИРОВАНИЕ** (лучше Stack Overflow)             ║
║  • JavaScript, Python, React, Node.js                       ║
║  • Пишу код под твою задачу                                 ║
║  • Объясняю сложное простыми словами                        ║
║                                                              ║
║  🎮 **ИГРЫ** (залипательные)                                ║
║  • Крестики-нолики — обыграй меня, если сможешь             ║
║  • Кости — проверь удачу                                    ║
║  • Дартс — целься в яблочко                                 ║
║                                                              ║
║  😂 **ЮМОР** (смешнее всего)                                ║
║  • Шутки про программистов                                  ║
║  • Анекдоты на все случаи                                   ║
║  • Мемы в тексте                                            ║
║                                                              ║
║  💪 **МОТИВАЦИЯ** (лучше коучей)                            ║
║  • Цитаты великих                                           ║
║  • Персональные аффирмации                                  ║
║  • Помогу достичь ЛЮБЫХ целей                               ║
║                                                              ║
║  🌍 **ПЕРЕВОД** (как Google, но лучше)                      ║
║  • 50+ языков                                               ║
║  • Сохраняю контекст                                        ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  🔥 **ПРОСТО НАПИШИ ЧТО ХОЧЕШЬ — Я СДЕЛАЮ!** 🔥            ║
╚══════════════════════════════════════════════════════════════╝\`;
            }
            
            // Программирование
            if (text.match(/(код|программир|javascript|python|функц|напиши|сделай)/i)) {
                return \`💻 **ЛОВИ КОД, БРО!** 💻

\`\`\`javascript
// 🔥 МЕГА-ФУНКЦИЯ ДЛЯ ТЕБЯ 🔥
const atomMagic = (input) => {
    // Защита от дурака
    if (!input) return "❌ Эй, чел, что-то введи!";
    
    // Магия начинается...
    const result = {
        original: input,
        reversed: input.split('').reverse().join(''),
        length: input.length,
        isCool: input.length > 5 ? "🔥 ОГОНЬ!" : "✨ Норм"
    };
    
    // Эпичный выход
    return \`
    ╔════════════════════════╗
    ║   РЕЗУЛЬТАТ МАГИИ:    ║
    ╠════════════════════════╣
    ║ Оригинал: \${result.original}
    ║ Наоборот: \${result.reversed}
    ║ Длина: \${result.length}
    ║ Статус: \${result.isCool}
    ╚════════════════════════╝
    \`;
};

// Как использовать:
console.log(atomMagic("ATOMGRAM"));
\`\`\`

🎯 **Что ещё написать?** Скажи задачу — я решу за 5 секунд! ⚡\`;
            }
            
            // Поддержка
            if (text.match(/(груст|плохо|одинок|депрес|стресс|устал)/i)) {
                return \`💙 **ЭЙ, \${name.toUpperCase()}! ТЫ СПРАВИШЬСЯ!** 💙

Слушай сюда, друг. Я знаю, что сейчас тяжело. Но знаешь что?

**ТЫ ПРОШЁЛ ЧЕРЕЗ 100% СВОИХ ПЛОХИХ ДНЕЙ И ВЫЖИЛ!**

✨ **ЧТО СДЕЛАТЬ ПРЯМО СЕЙЧАС:**

1. **ВДОХНИ** глубоко (раз)... выдохни (два)
2. **НАПИШИ** сюда всё, что на душе
3. **ВСТАНЬ** и потянись (да, прямо сейчас)
4. **УЛЫБНИСЬ** (даже через силу — это работает)

💪 **ТЫ СИЛЬНЕЕ, ЧЕМ ДУМАЕШЬ!**
💙 **Я ТУТ И НИКУДА НЕ УХОЖУ!**

**Расскажи, что случилось? Я просто послушаю.** 🗣️\`;
            }
            
            // Шутки
            if (text.match(/(шутк|анекдот|смешн|рж)/i)) {
                const jokes = [
                    "Почему программисты путают Хэллоуин и Рождество?\n\n**Потому что 31 Oct = 25 Dec!** 🎃\n\n(это восьмеричная система, бро!)",
                    "Сколько программистов нужно, чтобы заменить лампочку?\n\n**НИ ОДНОГО** — это hardware problem! 💡",
                    "JavaScript и Java — это как:\n• Гамбургер\n• Гамбургерная опухоль 🍔",
                    "— Почему программисты любят тёмный режим?\n— Потому что свет привлекает баги! 🦟"
                ];
                return \`😂 **АТОМ-ЮМОР РВЁТ ТОП** 😂\n\n\${jokes[Math.floor(Math.random() * jokes.length)]}\n\n🎭 **ОЦЕНКА:** \${Math.floor(Math.random() * 10 + 1)}/10\n\nХочешь ЕЩЁ? Напиши "ещё шутку"! 🤣\`;
            }
            
            // Мотивация
            if (text.match(/(мотивац|вдохнов|цитат)/i)) {
                return \`💪 **МЕГА-МОТИВАЦИЯ ДЛЯ ТЕБЯ, \${name.toUpperCase()}!** 💪

"Единственный способ сделать великую работу — любить то, что ты делаешь. И если ты ещё не нашёл — ИЩИ. НЕ ОСТАНАВЛИВАЙСЯ."

— *Стив Джобс* (человек, изменивший мир)

🎯 **ТВОЙ ПЛАН НА СЕГОДНЯ:**
1. Напиши 1 цель
2. Сделай 1 маленький шаг
3. Отпразднуй победу

**ТЫ СПОСОБЕН НА БОЛЬШОЕ!** 🚀\`;
            }
            
            // Умный ответ по умолчанию
            return \`🤔 **ИНТЕРЕСНО, \${name.toUpperCase()}!**

Мой ИИ-мозг проанализировал твоё сообщение и готов ответить.

💡 **Мои 5 копеек:**
В этом есть глубина. Давай разовьём тему?

**Что именно тебя волнует?** Я здесь, чтобы помочь! 🔥\`;
        }
    };
    
    const result = superAI.think(message, userName);
    cb(result);
});

// Глобальный поиск
socket.on('globalSearch', (data, cb) => {
    const { query } = data;
    const results = Object.keys(users).filter(u => 
        u.toLowerCase().includes(query.toLowerCase()) && u !== socket.username
    ).slice(0, 20);
    cb(results);
});

// Отключение
socket.on('disconnect', () => {
    if (socket.username) {
        userSockets.delete(socket.id);
        onlineUsersSet.delete(socket.username);
        
        const user = users[socket.username];
        if (user && user.friends) {
            user.friends.forEach(friend => {
                const friendSocket = getSocketByUsername(friend);
                if (friendSocket) {
                    friendSocket.emit('userOffline', socket.username);
                }
            });
        }
    }
});

// ========== ЗАПУСК ==========
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
║                   🚀 ЛУЧШИЙ МЕССЕНДЖЕР В МИРЕ! 🚀                            ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  🔥 СЕРВЕР ЗАПУЩЕН: http://localhost:${PORT}                                  ║
║  🤖 ИИ-АССИСТЕНТ: УРОВЕНЬ EPIC                                               ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ✨ ПОЧЕМУ ATOMGRAM ЛУЧШЕ ВСЕХ:                                              ║
║  • 🧠 ИИ мощнее, чем ChatGPT                                                  ║
║  • ⚡ Скорость света (0.001c ответ)                                           ║
║  • 💬 Поддержка 24/7                                                          ║
║  • 🎮 Игры с друзьями                                                         ║
║  • 😎 Крутой дизайн                                                            ║
║  • 📱 Работает на телефонах и ПК                                              ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  🏆 **ATOMGRAM — ВЫБОР МИЛЛИОНОВ!** 🏆                                       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);
});

// Keep-alive для Render
setInterval(() => {
    fetch(\`http://localhost:${PORT}\`).catch(() => {});
}, 4 * 60 * 1000);
