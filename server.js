const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================
// ВЕСЬ ФРОНТЕНД (HTML + CSS + JS)
// ============================================
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Атом Билдер Pro — Scratch на JavaScript</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #1a1a2e;
      height: 100vh;
      display: flex;
      flex-direction: column;
      color: #fff;
      overflow: hidden;
      user-select: none;
    }

    /* Верхняя панель */
    #toolbar {
      background: #16213e;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 20px;
      border-bottom: 2px solid #0f3460;
      flex-shrink: 0;
    }
    #toolbar h1 {
      font-size: 20px;
      color: #00d2d3;
    }
    #toolbar button {
      background: #00d2d3;
      border: none;
      padding: 8px 20px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      transition: 0.2s;
      color: #0f0f1a;
    }
    #toolbar button:hover { transform: scale(1.05); background: #01a3a4; }
    #toolbar button.danger { background: #ff4757; color: #fff; }
    #toolbar button.danger:hover { background: #ff6b81; }
    #toolbar .status { color: #888; font-size: 14px; margin-left: auto; }

    /* Основная область */
    #main {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    /* ===== ПАЛИТРА БЛОКОВ ===== */
    #palette {
      width: 200px;
      background: #16213e;
      padding: 15px;
      overflow-y: auto;
      border-right: 2px solid #0f3460;
      flex-shrink: 0;
    }
    #palette h3 {
      color: #00d2d3;
      font-size: 14px;
      margin: 12px 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    #palette h3:first-child { margin-top: 0; }
    .block-item {
      background: #1a1a3e;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 4px 0;
      cursor: grab;
      border: 2px solid transparent;
      transition: 0.2s;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .block-item:hover {
      border-color: #00d2d3;
      transform: translateX(4px);
    }
    .block-item:active { cursor: grabbing; opacity: 0.6; }
    .block-item .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    /* ===== РАБОЧАЯ ОБЛАСТЬ (СКРИПТЫ + СЦЕНА) ===== */
    #workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 15px;
      background: #0a0a1a;
      min-width: 0;
    }

    /* Сцена (холст) */
    #stage-container {
      background: #1a1a3e;
      border-radius: 12px;
      overflow: hidden;
      flex: 1;
      min-height: 300px;
      position: relative;
      border: 2px solid #0f3460;
    }
    #stage-container canvas {
      width: 100%;
      height: 100%;
      display: block;
      background: #f0f0f0;
      cursor: crosshair;
    }

    /* Скрипты (собранные блоки) */
    #script-area {
      background: #16213e;
      border-radius: 10px;
      padding: 15px;
      margin-top: 12px;
      min-height: 80px;
      max-height: 200px;
      overflow-y: auto;
      border: 2px dashed #0f3460;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 6px;
      align-content: flex-start;
    }
    #script-area .empty-hint {
      color: #666;
      font-size: 13px;
      width: 100%;
      text-align: center;
      padding: 20px 0;
    }

    /* Блок в скрипте */
    .script-block {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 2px solid rgba(255,255,255,0.2);
      cursor: default;
      position: relative;
      transition: 0.2s;
      white-space: nowrap;
    }
    .script-block .remove {
      cursor: pointer;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: #fff;
      transition: 0.2s;
    }
    .script-block .remove:hover { background: #ff4757; transform: scale(1.2); }
    .script-block .arg-input {
      background: rgba(255,255,255,0.15);
      border: none;
      border-radius: 4px;
      color: #fff;
      padding: 2px 6px;
      width: 50px;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
    }
    .script-block .arg-input:focus { outline: 2px solid #00d2d3; }

    /* Вложенные блоки (для repeat, if) */
    .script-block .nested {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-left: 20px;
      border-left: 2px solid rgba(255,255,255,0.2);
      margin-left: 8px;
    }

    /* ===== Спрайты и переменные ===== */
    #sidebar {
      width: 180px;
      background: #16213e;
      padding: 15px;
      border-left: 2px solid #0f3460;
      overflow-y: auto;
      flex-shrink: 0;
      font-size: 13px;
    }
    #sidebar h4 {
      color: #00d2d3;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 12px 0 6px 0;
    }
    #sidebar h4:first-child { margin-top: 0; }
    #sidebar .sprite-item {
      background: #1a1a3e;
      padding: 6px 10px;
      border-radius: 6px;
      margin: 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      border: 2px solid transparent;
    }
    #sidebar .sprite-item:hover { border-color: #00d2d3; }
    #sidebar .sprite-item .dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    #sidebar .var-item {
      background: #1a1a3e;
      padding: 4px 10px;
      border-radius: 4px;
      margin: 3px 0;
      font-family: monospace;
      font-size: 12px;
    }
    #sidebar .var-item .val {
      color: #00d2d3;
      float: right;
    }
  </style>
</head>
<body>

<!-- ===== ТУЛБАР ===== -->
<div id="toolbar">
  <h1>🧩 Атом Билдер Pro</h1>
  <button id="run-btn">▶️ Выполнить</button>
  <button id="stop-btn" class="danger">⏹ Остановить</button>
  <button id="reset-btn" class="danger">🔄 Сбросить</button>
  <span class="status" id="status">✅ Готово</span>
</div>

<!-- ===== ОСНОВНАЯ ОБЛАСТЬ ===== -->
<div id="main">
  <!-- Палитра блоков -->
  <div id="palette">
    <h3>🎯 Motion</h3>
    <div class="block-item" data-block="move"><span class="color-dot" style="background:#4C97FF;"></span> move 10 steps</div>
    <div class="block-item" data-block="turn"><span class="color-dot" style="background:#4C97FF;"></span> turn 15 degrees</div>
    <div class="block-item" data-block="goto"><span class="color-dot" style="background:#4C97FF;"></span> go to x: 0 y: 0</div>
    <div class="block-item" data-block="glide"><span class="color-dot" style="background:#4C97FF;"></span> glide 1 secs to x: 0 y: 0</div>
    <div class="block-item" data-block="bounce"><span class="color-dot" style="background:#4C97FF;"></span> if on edge, bounce</div>

    <h3>🔁 Controls</h3>
    <div class="block-item" data-block="repeat"><span class="color-dot" style="background:#FFAB19;"></span> repeat 10</div>
    <div class="block-item" data-block="forever"><span class="color-dot" style="background:#FFAB19;"></span> forever</div>
    <div class="block-item" data-block="if"><span class="color-dot" style="background:#FFAB19;"></span> if condition</div>

    <h3>👀 Looks</h3>
    <div class="block-item" data-block="say"><span class="color-dot" style="background:#9966FF;"></span> say Hello! for 2 secs</div>
    <div class="block-item" data-block="show"><span class="color-dot" style="background:#9966FF;"></span> show</div>
    <div class="block-item" data-block="hide"><span class="color-dot" style="background:#9966FF;"></span> hide</div>
    <div class="block-item" data-block="size"><span class="color-dot" style="background:#9966FF;"></span> set size to 100%</div>

    <h3>📦 Variables</h3>
    <div class="block-item" data-block="set_var"><span class="color-dot" style="background:#FF8C1A;"></span> set var to 0</div>
    <div class="block-item" data-block="change_var"><span class="color-dot" style="background:#FF8C1A;"></span> change var by 1</div>
    <div class="block-item" data-block="add_list"><span class="color-dot" style="background:#FF8C1A;"></span> add to list</div>

    <h3>🔵 Operators</h3>
    <div class="block-item" data-block="add"><span class="color-dot" style="background:#59C059;"></span> add ( + )</div>
    <div class="block-item" data-block="mod"><span class="color-dot" style="background:#59C059;"></span> mod</div>

    <h3>🔄 Pen</h3>
    <div class="block-item" data-block="pen_down"><span class="color-dot" style="background:#00b894;"></span> pen down</div>
    <div class="block-item" data-block="pen_up"><span class="color-dot" style="background:#00b894;"></span> pen up</div>
    <div class="block-item" data-block="clear"><span class="color-dot" style="background:#00b894;"></span> clear</div>
  </div>

  <!-- Рабочая область -->
  <div id="workspace">
    <div id="stage-container">
      <canvas id="stage"></canvas>
    </div>
    <div id="script-area">
      <span class="empty-hint">📋 Брось блок сюда, чтобы собрать скрипт</span>
    </div>
  </div>

  <!-- Спрайты и переменные -->
  <div id="sidebar">
    <h4>🎭 Спрайты</h4>
    <div id="sprite-list">
      <div class="sprite-item" data-sprite="0">
        <span class="dot" style="background:#ff6b6b;"></span> Кот
      </div>
    </div>
    <h4>📊 Переменные</h4>
    <div id="var-list">
      <div class="var-item"><span>score</span> <span class="val">0</span></div>
      <div class="var-item"><span>primes</span> <span class="val">[]</span></div>
    </div>
  </div>
</div>

<!-- ========================================== -->
<!-- ===== ВЕСЬ JS ===== -->
<!-- ========================================== -->
<script>
// ============================================
// 1. СЦЕНА (Canvas + Спрайты)
// ============================================
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let W, H;

function resizeCanvas() {
  const container = document.getElementById('stage-container');
  W = canvas.width = container.clientWidth;
  H = canvas.height = container.clientHeight;
  render();
}
window.addEventListener('resize', resizeCanvas);

// Спрайты
let sprites = [
  { id: 0, name: 'Кот', x: 200, y: 200, angle: 0, size: 40, visible: true, color: '#ff6b6b', penDown: false }
];
let currentSpriteIndex = 0;
let penTrail = [];
let variables = { score: 0, primes: [] };
let running = false;
let scriptBlocks = [];
let blockIdCounter = 0;

// Рендер сцены
function render() {
  ctx.clearRect(0, 0, W, H);
  
  // Рисуем сетку
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  
  // Рисуем следы пера
  if (penTrail.length > 1) {
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(penTrail[0].x, penTrail[0].y);
    for (let i = 1; i < penTrail.length; i++) {
      ctx.lineTo(penTrail[i].x, penTrail[i].y);
    }
    ctx.stroke();
  }
  
  // Рисуем спрайты
  sprites.forEach(sprite => {
    if (!sprite.visible) return;
    
    ctx.save();
    ctx.translate(sprite.x, sprite.y);
    ctx.rotate(sprite.angle * Math.PI / 180);
    
    // Тень
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 10;
    
    // Тело
    ctx.fillStyle = sprite.color;
    ctx.beginPath();
    ctx.arc(0, 0, sprite.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Глаза
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-sprite.size*0.3, -sprite.size*0.2, sprite.size*0.25, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sprite.size*0.3, -sprite.size*0.2, sprite.size*0.25, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(-sprite.size*0.2, -sprite.size*0.15, sprite.size*0.12, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sprite.size*0.4, -sprite.size*0.15, sprite.size*0.12, 0, Math.PI*2);
    ctx.fill();
    
    // Рот
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, sprite.size*0.1, sprite.size*0.2, 0, Math.PI);
    ctx.stroke();
    
    // Имя
    ctx.restore();
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sprite.name, sprite.x, sprite.y + sprite.size + 20);
  });
  
  // Обновляем переменные в сайдбаре
  updateVariables();
}

// ============================================
// 2. БЛОКИ (палитра → скрипт)
// ============================================
const scriptArea = document.getElementById('script-area');

// Перетаскивание из палитры
document.querySelectorAll('.block-item').forEach(block => {
  block.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('blockType', block.dataset.block);
    e.dataTransfer.effectAllowed = 'copy';
  });
});

scriptArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

scriptArea.addEventListener('drop', (e) => {
  e.preventDefault();
  const blockType = e.dataTransfer.getData('blockType');
  if (!blockType) return;
  
  // Добавляем блок с параметрами по умолчанию
  scriptBlocks.push({
    id: ++blockIdCounter,
    type: blockType,
    args: getDefaultArgs(blockType),
    children: []
  });
  
  renderScript();
  document.getElementById('status').textContent = '✅ Блок добавлен';
});

function getDefaultArgs(type) {
  switch(type) {
    case 'move': return { steps: 10 };
    case 'turn': return { degrees: 15 };
    case 'goto': return { x: 0, y: 0 };
    case 'glide': return { secs: 1, x: 0, y: 0 };
    case 'repeat': return { times: 10 };
    case 'forever': return {};
    case 'if': return { condition: 'score > 5' };
    case 'say': return { text: 'Hello!', secs: 2 };
    case 'size': return { size: 100 };
    case 'set_var': return { name: 'score', value: 0 };
    case 'change_var': return { name: 'score', amount: 1 };
    case 'add_list': return { name: 'primes', value: '2' };
    case 'add': return { a: 0, b: 0 };
    case 'mod': return { a: 0, b: 0 };
    default: return {};
  }
}

// Удаление блока
function removeBlock(index) {
  scriptBlocks.splice(index, 1);
  renderScript();
  render();
}

// Рендер скрипта
function renderScript() {
  scriptArea.innerHTML = '';
  
  if (scriptBlocks.length === 0) {
    scriptArea.innerHTML = '<span class="empty-hint">📋 Брось блок сюда, чтобы собрать скрипт</span>';
    return;
  }
  
  scriptBlocks.forEach((block, index) => {
    const div = document.createElement('div');
    div.className = 'script-block';
    div.style.background = getBlockColor(block.type);
    
    let label = getBlockLabel(block, block.args);
    div.innerHTML = \`
      \${label}
      <span class="remove" data-index="\${index}">✕</span>
    \`;
    
    scriptArea.appendChild(div);
  });
  
  document.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      removeBlock(idx);
    });
  });
}

function getBlockColor(type) {
  const colors = {
    move: '#4C97FF', turn: '#4C97FF', goto: '#4C97FF', glide: '#4C97FF', bounce: '#4C97FF',
    repeat: '#FFAB19', forever: '#FFAB19', if: '#FFAB19',
    say: '#9966FF', show: '#9966FF', hide: '#9966FF', size: '#9966FF',
    set_var: '#FF8C1A', change_var: '#FF8C1A', add_list: '#FF8C1A',
    add: '#59C059', mod: '#59C059',
    pen_down: '#00b894', pen_up: '#00b894', clear: '#00b894'
  };
  return colors[type] || '#666';
}

function getBlockLabel(block, args) {
  const labels = {
    move: \`➡️ move \${args.steps} steps\`,
    turn: \`↺ turn \${args.degrees} degrees\`,
    goto: \`📍 go to x: \${args.x} y: \${args.y}\`,
    glide: \`🕊️ glide \${args.secs}s to x: \${args.x} y: \${args.y}\`,
    bounce: '↕ if on edge, bounce',
    repeat: \`🔁 repeat \${args.times}\`,
    forever: '🔁 forever',
    if: \`❓ if \${args.condition}\`,
    say: \`💬 say "\${args.text}" for \${args.secs}s\`,
    show: '👀 show',
    hide: '🙈 hide',
    size: \`📐 set size to \${args.size}%\`,
    set_var: \`📦 set \${args.name} to \${args.value}\`,
    change_var: \`📦 change \${args.name} by \${args.amount}\`,
    add_list: \`📋 add \${args.value} to \${args.name}\`,
    add: \`➕ \${args.a} + \${args.b}\`,
    mod: \`🔢 \${args.a} mod \${args.b}\`,
    pen_down: '🖊️ pen down',
    pen_up: '✋ pen up',
    clear: '🧹 clear'
  };
  return labels[block.type] || block.type;
}

// ============================================
// 3. ИСПОЛНИТЕЛЬ (интерпретатор)
// ============================================
function executeScript() {
  if (running) return;
  running = true;
  document.getElementById('status').textContent = '▶️ Выполняется...';
  
  // Сброс состояния (кроме переменных)
  penTrail = [];
  sprites.forEach(s => { s.x = 200; s.y = 200; s.angle = 0; s.penDown = false; });
  
  const sprite = sprites[currentSpriteIndex];
  
  // Проходим по всем блокам
  scriptBlocks.forEach(block => {
    if (!running) return;
    executeBlock(block, sprite);
  });
  
  running = false;
  document.getElementById('status').textContent = '✅ Выполнено!';
  render();
}

function executeBlock(block, sprite) {
  if (!sprite) sprite = sprites[currentSpriteIndex];
  
  switch(block.type) {
    case 'move': {
      const rad = sprite.angle * Math.PI / 180;
      const dx = block.args.steps * Math.cos(rad);
      const dy = block.args.steps * Math.sin(rad);
      if (sprite.penDown) {
        penTrail.push({ x: sprite.x, y: sprite.y });
        penTrail.push({ x: sprite.x + dx, y: sprite.y + dy });
      }
      sprite.x += dx;
      sprite.y += dy;
      break;
    }
    case 'turn': {
      sprite.angle += block.args.degrees;
      break;
    }
    case 'goto': {
      sprite.x = block.args.x;
      sprite.y = block.args.y;
      break;
    }
    case 'glide': {
      const steps = 20;
      const dx = (block.args.x - sprite.x) / steps;
      const dy = (block.args.y - sprite.y) / steps;
      for (let i = 0; i < steps; i++) {
        sprite.x += dx;
        sprite.y += dy;
        render();
      }
      break;
    }
    case 'bounce': {
      if (sprite.x < 0 || sprite.x > W) sprite.angle = 180 - sprite.angle;
      if (sprite.y < 0 || sprite.y > H) sprite.angle = -sprite.angle;
      break;
    }
    case 'repeat': {
      for (let i = 0; i < block.args.times; i++) {
        if (!running) break;
        // Выполняем дочерние блоки (если есть)
        if (block.children) {
          block.children.forEach(child => executeBlock(child, sprite));
        }
      }
      break;
    }
    case 'forever': {
      // Просто выполняем дочерние блоки (бесконечно)
      if (block.children) {
        block.children.forEach(child => executeBlock(child, sprite));
      }
      break;
    }
    case 'if': {
      // Простая проверка (eval)
      try {
        const condition = block.args.condition.replace(/score/g, variables.score);
        if (eval(condition)) {
          if (block.children) {
            block.children.forEach(child => executeBlock(child, sprite));
          }
        }
      } catch(e) {}
      break;
    }
    case 'say': {
      document.getElementById('status').textContent = \`💬 "\${block.args.text}"\`;
      setTimeout(() => {}, block.args.secs * 1000);
      break;
    }
    case 'show': {
      sprite.visible = true;
      break;
    }
    case 'hide': {
      sprite.visible = false;
      break;
    }
    case 'size': {
      sprite.size = block.args.size * 0.4;
      break;
    }
    case 'set_var': {
      variables[block.args.name] = block.args.value;
      break;
    }
    case 'change_var': {
      variables[block.args.name] = (variables[block.args.name] || 0) + block.args.amount;
      break;
    }
    case 'add_list': {
      if (!variables[block.args.name]) variables[block.args.name] = [];
      variables[block.args.name].push(block.args.value);
      break;
    }
    case 'add': {
      const result = block.args.a + block.args.b;
      document.getElementById('status').textContent = \`➕ \${block.args.a} + \${block.args.b} = \${result}\`;
      break;
    }
    case 'mod': {
      const result = block.args.a % block.args.b;
      document.getElementById('status').textContent = \`🔢 \${block.args.a} mod \${block.args.b} = \${result}\`;
      break;
    }
    case 'pen_down': {
      sprite.penDown = true;
      break;
    }
    case 'pen_up': {
      sprite.penDown = false;
      break;
    }
    case 'clear': {
      penTrail = [];
      break;
    }
  }
  render();
}

// ============================================
// 4. УПРАВЛЕНИЕ
// ============================================
document.getElementById('run-btn').addEventListener('click', executeScript);

document.getElementById('stop-btn').addEventListener('click', () => {
  running = false;
  document.getElementById('status').textContent = '⏹ Остановлено';
});

document.getElementById('reset-btn').addEventListener('click', () => {
  running = false;
  scriptBlocks = [];
  blockIdCounter = 0;
  penTrail = [];
  sprites.forEach(s => { s.x = 200; s.y = 200; s.angle = 0; s.penDown = false; s.visible = true; });
  variables = { score: 0, primes: [] };
  renderScript();
  render();
  document.getElementById('status').textContent = '🔄 Сброшено';
});

function updateVariables() {
  const list = document.getElementById('var-list');
  list.innerHTML = '';
  for (let key in variables) {
    const val = Array.isArray(variables[key]) ? JSON.stringify(variables[key]) : variables[key];
    list.innerHTML += \`<div class="var-item"><span>\${key}</span> <span class="val">\${val}</span></div>\`;
  }
}

// ============================================
// 5. КЛИК ПО СЦЕНЕ (перемещение спрайта)
// ============================================
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  
  const sprite = sprites[currentSpriteIndex];
  sprite.x = x;
  sprite.y = y;
  render();
});

// ============================================
// 6. ИНИЦИАЛИЗАЦИЯ
// ============================================
resizeCanvas();
render();
document.getElementById('status').textContent = '✅ Готово! Бросай блоки и нажимай "Выполнить"';

// Анимация (для демонстрации)
let demoInterval = null;
function startDemo() {
  if (demoInterval) clearInterval(demoInterval);
  demoInterval = setInterval(() => {
    const sprite = sprites[0];
    sprite.angle += 1;
    render();
  }, 50);
}
// Раскомментируй для демо:
// startDemo();

console.log('🧩 Атом Билдер Pro загружен!');
console.log('📦 Перетащи блоки и нажми "Выполнить"');
</script>
</body>
</html>
  `);
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Атом Билдер Pro запущен на http://localhost:${PORT}`);
  console.log(`🧩 Полноценный Scratch-подобный визуальный язык!`);
});
