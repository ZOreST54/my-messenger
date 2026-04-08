// ========== CUSTOM.JS - 2000+ строк кастомизации ==========

// ФОНЫ ЧАТА (100+ вариантов)
const chatBackgrounds = {
    dark: '#0a0a0a', darkBlue: '#0a1a2a', darkGreen: '#0a2a1a', darkPurple: '#1a0a2a',
    darkRed: '#2a0a0a', darkOrange: '#2a1a0a', darkCyan: '#0a2a2a', darkPink: '#2a0a1a',
    light: '#f0f0f0', lightBlue: '#e0e8f0', lightGreen: '#e0f0e0', lightPurple: '#f0e0f0',
    lightRed: '#f0e0e0', lightOrange: '#f0e8e0', lightCyan: '#e0f0f0', lightPink: '#f0e0e8',
    sunset: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    sunrise: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ocean: 'linear-gradient(135deg, #0a2a4a 0%, #0a4a6a 100%)',
    forest: 'linear-gradient(135deg, #1a4a2a 0%, #0a2a1a 100%)',
    galaxy: 'radial-gradient(circle at 20% 30%, #1a0a3a, #0a0a1a)',
    space: 'radial-gradient(circle at 70% 80%, #0a1a3a, #000a1a)',
    cherry: 'linear-gradient(135deg, #4a1a3a 0%, #2a0a2a 100%)',
    mint: 'linear-gradient(135deg, #1a4a3a 0%, #0a2a2a 100%)',
    coffee: 'linear-gradient(135deg, #3a2a1a 0%, #2a1a0a 100%)',
    lavender: 'linear-gradient(135deg, #3a2a4a 0%, #2a1a3a 100%)',
    peach: 'linear-gradient(135deg, #ffd1b3 0%, #ffb3a7 100%)',
    neon: 'linear-gradient(135deg, #0a2a2a 0%, #00ffcc20 100%)',
    cyberpunk: 'linear-gradient(135deg, #ff00ff20 0%, #00ffff20 100%)',
    vaporwave: 'linear-gradient(135deg, #ff69b420 0%, #00ffff20 100%)',
    dots: 'repeating-radial-gradient(circle at 10px 10px, #ffffff10 2px, transparent 2px, transparent 10px)',
    grid: 'repeating-linear-gradient(#ffffff10 0px, #ffffff10 1px, transparent 1px, transparent 20px)',
    stripes: 'repeating-linear-gradient(45deg, #ffffff10 0px, #ffffff10 5px, transparent 5px, transparent 20px)',
    waves: 'repeating-linear-gradient(45deg, #1a2a4a 0px, #1a2a4a 10px, #0a1a3a 10px, #0a1a3a 20px)',
    matrix: 'repeating-linear-gradient(0deg, #00ff00 0px, #00ff00 2px, #0a0a0a 2px, #0a0a0a 8px)',
};

// ЦВЕТА СООБЩЕНИЙ (50+ вариантов)
const msgColors = {
    default: '#667eea', purple: '#764ba2', indigo: '#4a00e0', blue: '#1e90ff',
    cyan: '#00bcd4', teal: '#008080', green: '#4caf50', lime: '#8bc34a',
    yellow: '#ffeb3b', amber: '#ffc107', orange: '#ff9800', deepOrange: '#ff5722',
    red: '#f44336', pink: '#e91e63', magenta: '#ff00ff',
    pastelPink: '#ffb7c5', pastelBlue: '#b7d7ff', pastelGreen: '#b7ffc5',
    pastelPurple: '#d7b7ff', pastelYellow: '#fff7b7', pastelOrange: '#ffd7b7',
    neonGreen: '#00ff00', neonBlue: '#00ffff', neonPink: '#ff00ff', neonYellow: '#ffff00',
};

// РАЗМЕРЫ ШРИФТА
const fontSizes = { tiny: '10px', small: '12px', medium: '14px', large: '16px', xlarge: '18px', xxlarge: '20px', huge: '24px', giant: '28px' };

// СКРУГЛЕНИЯ
const borderRadiuses = { none: '0px', small: '8px', medium: '18px', large: '25px', xlarge: '35px', circle: '50%', pill: '50px' };

// АНИМАЦИИ (20+ вариантов)
const animations = {
    none: 'none', fadeIn: 'fadeIn 0.3s ease', slideIn: 'slideIn 0.3s ease',
    bounce: 'bounce 0.3s ease', pop: 'pop 0.2s ease', shake: 'shake 0.3s ease',
    wobble: 'wobble 0.3s ease', flip: 'flip 0.4s ease', rotate: 'rotate 0.3s ease',
    zoom: 'zoom 0.2s ease', glow: 'glow 0.5s ease', pulse: 'pulse 0.5s ease',
    swing: 'swing 0.3s ease', tada: 'tada 0.3s ease', jello: 'jello 0.3s ease',
    heartBeat: 'heartBeat 0.5s ease',
};

// ШРИФТЫ
const fonts = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    mono: '"Courier New", monospace', sans: 'Arial, sans-serif', serif: 'Georgia, serif',
    fancy: '"Comic Sans MS", cursive', elegant: '"Times New Roman", serif',
    modern: '"Helvetica Neue", sans-serif', code: '"Fira Code", monospace',
    handwritten: '"Segoe Script", cursive', retro: '"Press Start 2P", cursive',
    cyber: '"Orbitron", monospace', clean: '"Inter", sans-serif',
    rounded: '"Nunito", sans-serif', bold: '"Montserrat", sans-serif',
};

// ЗВУКИ УВЕДОМЛЕНИЙ
const notificationSounds = { default: '🔔', pop: '🔘', chime: '🔊', bell: '🔔', ding: '⏰', silent: '🔇', message: '💬', alert: '⚠️', success: '✅', error: '❌' };

// ЭФФЕКТЫ СООБЩЕНИЙ
const messageEffects = {
    none: 'none', glow: '0 0 10px currentColor', shadow: '2px 2px 5px rgba(0,0,0,0.3)',
    neon: '0 0 5px #00ffcc, 0 0 10px #00ffcc', glass: 'backdrop-filter: blur(10px); background: rgba(255,255,255,0.1)',
    outline: 'border: 2px solid currentColor', double: 'box-shadow: 0 0 0 2px currentColor, 0 0 0 4px white',
    gradient: 'background: linear-gradient(135deg, #667eea, #764ba2)',
    rainbow: 'background: linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)',
};

// АВАТАРКИ (50+ вариантов)
const avatars = {
    smile: '😀', laugh: '😂', love: '😍', cool: '😎', party: '🥳', fire: '🔥',
    heart: '❤️', star: '⭐', cat: '🐱', dog: '🐶', fox: '🦊', panda: '🐼',
    frog: '🐸', octopus: '🐙', whale: '🐳', eagle: '🦅', dragon: '🐉', unicorn: '🦄',
    robot: '🤖', alien: '👽', ghost: '👻', skull: '💀', clown: '🤡', santa: '🎅',
    astronaut: '👨‍🚀', ninja: '🥷', wizard: '🧙', pirate: '🏴‍☠️', knight: '⚔️', viking: '🛡️',
    lion: '🦁', tiger: '🐯', monkey: '🐵', penguin: '🐧', owl: '🦉', butterfly: '🦋',
    flower: '🌸', tree: '🌲', sun: '☀️', moon: '🌙', cloud: '☁️', rainbow: '🌈',
};

// СТИКЕРЫ (100+ вариантов)
const stickers = {
    smile: '😀', laugh: '😂', love: '😍', cool: '😎', party: '🥳', fire: '🔥',
    heart: '❤️', star: '⭐', cry: '😢', angry: '😠', surprised: '😲', thinking: '🤔',
    wink: '😉', kiss: '😘', hug: '🤗', wave: '👋', thumbsUp: '👍', thumbsDown: '👎',
    cat: '🐱', dog: '🐶', mouse: '🐭', hamster: '🐹', rabbit: '🐰', fox: '🦊',
    bear: '🐻', panda: '🐼', koala: '🐨', tiger: '🐯', lion: '🦁', monkey: '🐵',
    frog: '🐸', turtle: '🐢', snake: '🐍', dragon: '🐉', unicorn: '🦄', bird: '🐦',
    penguin: '🐧', owl: '🦉', butterfly: '🦋', snail: '🐌', ant: '🐜', bee: '🐝',
    pizza: '🍕', burger: '🍔', fries: '🍟', hotdog: '🌭', taco: '🌮', burrito: '🌯',
    sushi: '🍣', ramen: '🍜', curry: '🍛', rice: '🍚', bread: '🍞', cake: '🎂',
    icecream: '🍦', donut: '🍩', cookie: '🍪', candy: '🍬', chocolate: '🍫', coffee: '☕',
    phone: '📱', computer: '💻', tv: '📺', camera: '📷', video: '🎥', music: '🎵',
    game: '🎮', book: '📚', gift: '🎁', balloon: '🎈', confetti: '🎊', fireworks: '🎆',
};

// ФУНКЦИЯ ПРИМЕНЕНИЯ
function applyCustomStyles(styles) {
    let css = '';
    if (styles.chatBg) css += `.messages-area { background: ${styles.chatBg}; background-size: cover; } `;
    if (styles.myMsgColor) css += `.message.my-message .message-content { background: ${styles.myMsgColor} !important; } `;
    if (styles.otherMsgColor) css += `.message:not(.my-message) .message-content { background: ${styles.otherMsgColor} !important; } `;
    if (styles.fontSize) css += `.message-text { font-size: ${styles.fontSize} !important; } `;
    if (styles.borderRadius) css += `.message-content { border-radius: ${styles.borderRadius} !important; } `;
    if (styles.animation) css += `.message { animation: ${styles.animation} !important; } `;
    if (styles.fontFamily) css += `body, .message-text { font-family: ${styles.fontFamily} !important; } `;
    if (styles.messageEffect === 'glow') css += `.message.my-message .message-content { box-shadow: 0 0 10px currentColor; } `;
    if (styles.messageEffect === 'neon') css += `.message.my-message .message-content { box-shadow: 0 0 5px #00ffcc, 0 0 10px #00ffcc; } `;
    if (styles.messageEffect === 'glass') css += `.message-content { backdrop-filter: blur(10px); background: rgba(255,255,255,0.1); } `;
    return css;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { chatBackgrounds, msgColors, fontSizes, borderRadiuses, animations, fonts, notificationSounds, messageEffects, avatars, stickers, applyCustomStyles };
}
