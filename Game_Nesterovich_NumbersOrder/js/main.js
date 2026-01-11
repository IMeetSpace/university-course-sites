const LEVELS = [
  {
    id: 1,
    key: 'order',
    name: 'Уровень 1: Порядок чисел',
    description: 'Дважды щёлкните по числам в нужном порядке. Ошибка — штрафные баллы.',
    rounds: 3,
    timeLimit: 30,
  },
  {
    id: 2,
    key: 'progression',
    name: 'Уровень 2: Прогрессии',
    description: 'Определите следующее число прогрессии: перетащите правильное падающее число в зону ответа.',
    rounds: 4,
    timeLimit: 25,
  },
  {
    id: 3,
    key: 'exp',
    name: 'Уровень 3: Аритметические выражения',
    description:
      'Соберите корректное арифметическое выражение, дающее указанный результат, перетаскивая числа и знаки операций в слоты.',
    rounds: 5,
    timeLimit: 20,
  },
];

const STORAGE_KEY_SETTINGS = 'settings';
const STORAGE_KEY_RESULTS = 'results';
const STORAGE_KEY_LAST_RESULT = 'lastResult';

const PAGE_START = 'index.html';
const PAGE_GAME = 'game.html';
const PAGE_RATING = 'rating.html';

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

// Состояние
const STATE = {
  playerName: '',
  gameMode: 0, // 0 — все уровни, 1..3 — конкретный уровень
  currentLevelIndex: 0,
  score: 0,
  timerId: null,
  timeLeft: 0,
  roundIndex: 0,
  isPaused: false,
  level1ExpectedOrder: [],
  level1CurrentIndex: 0,
  maxLevelReached: 0,
};

// ----- Utils -----

function $(id) {
  return document.getElementById(id);
}

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function changeScore(delta) {
  STATE.score += delta;
  if (STATE.score < 0) STATE.score = 0;
  const scoreEl = $('current-score');
  if (scoreEl) scoreEl.textContent = String(STATE.score);
}

function shakeElement(el) {
  if (!el) return;
  el.classList.add('wrong');
  setTimeout(() => {
    el.classList.remove('wrong');
  }, 350);
}

// ----- localStorage -----

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {}
}

function loadResults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESULTS);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveResults(results) {
  try {
    localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(results));
  } catch {}
}

function addResult(record) {
  const results = loadResults();
  results.push(record);
  saveResults(results);
  try {
    localStorage.setItem(STORAGE_KEY_LAST_RESULT, JSON.stringify(record));
  } catch {}
}

function loadLastResult() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_RESULT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ----- Таймер -----

function startTimer(seconds) {
  stopTimer();
  STATE.timeLeft = seconds;
  const timerEl = $('timer');
  if (timerEl) timerEl.textContent = formatTime(STATE.timeLeft);

  STATE.timerId = setInterval(() => {
    if (STATE.isPaused) return;
    STATE.timeLeft -= 1;
    if (timerEl) timerEl.textContent = formatTime(STATE.timeLeft);
    if (STATE.timeLeft <= 0) {
      stopTimer();
      onTimeOver();
    }
  }, 1000);
}

function stopTimer() {
  if (STATE.timerId !== null) {
    clearInterval(STATE.timerId);
    STATE.timerId = null;
  }
}

// ----- Пауза -----

function setPaused(paused) {
  STATE.isPaused = paused;
  const gameArea = $('game-area');
  if (gameArea) {
    gameArea.classList.toggle('paused');
  }
  const el = $('pause-button');
  if (el) {
    el.classList.toggle('accent2');
  }
}

// ----- Логика уровней -----

// Запуск игры
function startNewGame(startLevelIndex) {
  STATE.currentLevelIndex = startLevelIndex || 0;
  STATE.score = 0;
  STATE.maxLevelReached = 0;
  STATE.roundIndex = 0;
  STATE.isPaused = false;
  const scoreEl = $('current-score');
  if (scoreEl) scoreEl.textContent = '0';
  startLevel(STATE.currentLevelIndex);
}

// Запуск уровня
function startLevel(levelIndex) {
  const level = LEVELS[levelIndex];
  STATE.currentLevelIndex = levelIndex;
  STATE.roundIndex = 0;
  STATE.maxLevelReached = Math.max(STATE.maxLevelReached, level.id);

  const titleEl = $('level-title');
  const descEl = $('level-description');
  const labelEl = $('current-level-label');
  const gameArea = $('game-area');

  if (titleEl) titleEl.textContent = level.name;
  if (descEl) descEl.textContent = level.description;
  if (labelEl) labelEl.textContent = `${level.id} / ${LEVELS.length}`;
  if (gameArea) gameArea.innerHTML = '';

  startTimer(level.timeLimit);
  runRoundForCurrentLevel();
}

// Запуск раунда
function runRoundForCurrentLevel() {
  const level = LEVELS[STATE.currentLevelIndex];
  const gameArea = $('game-area');
  if (!gameArea) return;
  gameArea.innerHTML = '';

  if (level.key === 'order') runLevel1Round();
  else if (level.key === 'progression') runLevel2Round();
  else if (level.key === 'exp') runLevel3Round();
}

// Окончание раунда
function onRoundFinished() {
  const gameArea = $('game-area');
  if (gameArea) {
    gameArea.classList.add('is-complete');
    setTimeout(() => {
      gameArea.classList.remove('is-complete');
    }, 450);
  }

  const level = LEVELS[STATE.currentLevelIndex];
  STATE.roundIndex += 1;

  if (STATE.roundIndex >= level.rounds) {
    completeLevel();
  } else {
    runRoundForCurrentLevel();
  }
}

// Завершение уровня
function completeLevel() {
  stopTimer();

  const settings = loadSettings() || {};
  const gameMode = Number(settings.gameMode) || 0; // 0 — все уровни, >0 — один

  // Бонус за прохождение уровня
  changeScore(10 * (STATE.currentLevelIndex + 1));

  // Если есть еще уровни - переход к следующему
  if (gameMode === 0 && STATE.currentLevelIndex < LEVELS.length - 1) {
    startLevel(STATE.currentLevelIndex + 1);
  } else {
    endGame();
  }
}

function onTimeOver() {
  endGame();
}

// Завершение вручную
function finishByUser() {
  stopTimer();
  endGame();
}

// ----- Уровень 1: порядок чисел -----

function runLevel1Round() {
  const gameArea = $('game-area');
  if (!gameArea) return;

  const count = 3 + Math.floor(Math.random() * 3); // 3-5 чисел
  let start = 1 + Math.floor(Math.random() * 10);
  let step = 1 + Math.floor(Math.random() * 6);
  let ratio = 2 + Math.floor(Math.random() * 3);
  const numbers = [];

  const mode = 1 + Math.floor(Math.random() * 4);
  const text = document.createElement('div');
  text.className = 'exp-target';
  switch (mode) {
    case 1:
      text.textContent = `По возрастанию`;
      while (numbers.length < count) {
        const n = 1 + Math.floor(Math.random() * 99);
        if (!numbers.includes(n)) numbers.push(n);
      }
      break;
    case 2:
      text.textContent = `По убыванию`;
      while (numbers.length < count) {
        const n = 1 + Math.floor(Math.random() * 99);
        if (!numbers.includes(n)) numbers.push(n);
      }
      break;
    case 3:
      text.textContent = `Арифметическая прогрессия`;
      for (let i = 0; i < Math.min(4, count); i++) numbers.push(start + step * i);
      break;
    case 4:
      text.textContent = `Геометрическая прогрессия`;
      for (let i = 0; i < Math.min(4, count); i++) numbers.push(start * Math.pow(ratio, i));
      break;
    default:
      break;
  }
  gameArea.appendChild(text);

  // Генерируем числа

  // Сохраняем верный порядок
  const sorted = numbers.slice().sort((a, b) => (mode !== 2 ? a - b : b - a));
  STATE.level1ExpectedOrder = sorted;
  STATE.level1CurrentIndex = 0;

  // Перемешиваем числа
  const shuffledNumbers = shuffle(numbers);
  shuffledNumbers.forEach((num) => {
    const tile = document.createElement('div');
    const random = Math.ceil(Math.random() * 5);
    tile.className = `number-tile floating-number speed-${random}`;
    tile.textContent = String(num);
    tile.dataset.value = String(num);

    // Обработчик нажатия
    const handlePick = () => {
      if (STATE.isPaused) return;
      const value = Number(tile.dataset.value);
      const expected = STATE.level1ExpectedOrder[STATE.level1CurrentIndex];

      // Если верно выбрано число - прибавляем очки и ждем следующее число
      if (value === expected) {
        STATE.level1CurrentIndex += 1;
        tile.classList.add('selected');
        changeScore(5);

        // Числа кончились - завершаем раунд
        if (STATE.level1CurrentIndex >= STATE.level1ExpectedOrder.length) {
          onRoundFinished();
        }
      } else {
        changeScore(-5);
        shakeElement(tile);
      }
    };

    tile.addEventListener('dblclick', handlePick);
    if (isMobile) {
      tile.addEventListener('click', handlePick);
    }

    gameArea.appendChild(tile);
  });
}

// ----- Уровень 2: прогрессии с падающими числами -----

function runLevel2Round() {
  const gameArea = $('game-area');
  if (!gameArea) return;
  gameArea.innerHTML = '';

  // Генерируем параметры последовательности
  const isArithmetic = Math.random() < 0.6;
  let start = 1 + Math.floor(Math.random() * 10);
  let step = 1 + Math.floor(Math.random() * 6);
  let ratio = 2 + Math.floor(Math.random() * 3);
  const length = 4;
  const seq = [];

  // Генерируем последовательность
  if (isArithmetic) {
    for (let i = 0; i < length; i++) seq.push(start + step * i);
  } else {
    for (let i = 0; i < length; i++) seq.push(start * Math.pow(ratio, i));
  }

  const correctNext = isArithmetic ? start + step * length : start * Math.pow(ratio, length);

  const text = document.createElement('div');
  text.className = 'exp-target';
  text.textContent = isArithmetic
    ? `Арифметическая прогрессия: ${seq.join(', ')}, ?`
    : `Геометрическая прогрессия: ${seq.join(', ')}, ?`;
  gameArea.appendChild(text);

  // Добавляем на зону ответа
  const answerZone = document.createElement('div');
  answerZone.className = 'exp-slot';
  answerZone.textContent = '?';
  gameArea.appendChild(answerZone);

  // Добавляем на экран числа
  const fallingContainer = document.createElement('div');
  fallingContainer.style.position = 'absolute';
  fallingContainer.style.inset = '0';
  fallingContainer.style.pointerEvents = 'none';
  gameArea.appendChild(fallingContainer);

  // Генерируем неверные варианты
  const options = [correctNext];
  while (options.length < 4) {
    const noise = correctNext + (Math.floor(Math.random() * 7) - 3) * (isArithmetic ? step : 1);
    if (noise !== correctNext && !options.includes(noise) && noise > 0) {
      options.push(noise);
    }
  }

  const shuffledOptions = shuffle(options);
  const duration = 7;

  shuffledOptions.forEach((value, idx) => {
    const tile = document.createElement('div');
    const random = Math.ceil(Math.random() * 5);
    tile.className = `number-tile falling-number speed-${random}`;
    tile.textContent = String(value);
    tile.dataset.value = String(value);
    tile.dataset.correct = value === correctNext ? '1' : '0';

    const leftPercent = 10 + idx * 20 + Math.random() * 10;
    tile.style.left = `${leftPercent}%`;
    tile.style.pointerEvents = 'auto';
    tile.setAttribute('draggable', 'true');

    tile.addEventListener('dragstart', (e) => {
      if (STATE.isPaused) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', tile.dataset.value);
      e.dataTransfer.setData('correct', tile.dataset.correct);
    });

    // Обработчик нажатий для мобильных
    if (isMobile) {
      tile.addEventListener('click', () => {
        if (STATE.isPaused) return;

        const valueStr = tile.dataset.value;
        const correctFlag = tile.dataset.correct;
        if (!valueStr) return;

        answerZone.textContent = valueStr;
        answerZone.classList.add('exp-slot--filled');

        const isCorrect = correctFlag === '1';
        if (isCorrect) {
          // Верный ответ: начисляем очки и завершаем раунд
          changeScore(15);
          onRoundFinished();
        } else {
          // Неверный ответ: штраф
          changeScore(-10);
          shakeElement(answerZone);

          setTimeout(() => {
            answerZone.textContent = '?';
            answerZone.classList.remove('exp-slot--filled');
          }, 250);
        }
      });
    }

    fallingContainer.appendChild(tile);
  });

  answerZone.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  answerZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (STATE.isPaused) return;

    const valueStr = e.dataTransfer.getData('text/plain');
    const correctFlag = e.dataTransfer.getData('correct');
    if (!valueStr) return;

    answerZone.textContent = valueStr;
    answerZone.classList.add('exp-slot--filled');

    const isCorrect = correctFlag === '1';
    if (isCorrect) {
      // Верный ответ: начисляем очки и завершаем раунд
      changeScore(15);
      onRoundFinished();
    } else {
      // Неверный ответ: штраф
      changeScore(-10);
      shakeElement(answerZone);

      setTimeout(() => {
        answerZone.textContent = '?';
        answerZone.classList.remove('exp-slot--filled');
      }, 250);
    }
  });
}

// ----- Уровень 3: собрать выражение -----

function runLevel3Round() {
  const gameArea = $('game-area');
  if (!gameArea) return;
  gameArea.innerHTML = '';

  // Генерируем 2 числа и мат операцию
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  // Считаем ответ
  let target;
  if (op === '+') target = a + b;
  else if (op === '-') target = a - b;
  else target = a * b;
  if (target <= 0) return runLevel3Round();

  const wrapper = document.createElement('div');
  wrapper.className = 'group center wrap';

  const text = document.createElement('div');
  text.className = 'exp-target';
  text.textContent = `Соберите выражение, равное ${target}`;
  wrapper.appendChild(text);

  const row = document.createElement('div');
  row.className = 'group row wrap';

  const slot1 = document.createElement('div');
  slot1.className = 'exp-slot';
  slot1.dataset.slotType = 'number';
  slot1.dataset.slotName = 'left';
  slot1.textContent = 'a';

  const slotOp = document.createElement('div');
  slotOp.className = 'exp-slot';
  slotOp.dataset.slotType = 'op';
  slotOp.textContent = '◦';

  const slot2 = document.createElement('div');
  slot2.className = 'exp-slot';
  slot2.dataset.slotType = 'number';
  slot2.dataset.slotName = 'right';
  slot2.textContent = 'b';

  [slot1, slotOp, slot2].forEach((slot) => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      if (STATE.isPaused) return;
      const type = e.dataTransfer.getData('type');
      const value = e.dataTransfer.getData('value');
      if (!type || !value) return;

      // Если ставим оператор в поле числа или число в поле оператора - ошибка
      if (slot.dataset.slotType !== type) {
        shakeElement(slot);
        return;
      }

      slot.textContent = value;
      slot.dataset.value = value;
      slot.classList.add('exp-slot--filled');
    });
  });

  row.appendChild(slot1);
  row.appendChild(slotOp);
  row.appendChild(slot2);
  wrapper.appendChild(row);

  const pool = document.createElement('div');
  pool.className = 'group row wrap';

  const tokens = [];
  tokens.push({ type: 'number', value: a });
  tokens.push({ type: 'number', value: b });
  tokens.push({ type: 'op', value: op });

  // Создаем неверные числа
  while (tokens.filter((t) => t.type === 'number').length < 4) {
    const n = 1 + Math.floor(Math.random() * 12);
    if (!tokens.some((t) => t.type === 'number' && t.value === n)) {
      tokens.push({ type: 'number', value: n });
    }
  }

  // Создаем неверные операторы
  ['+', '-', '*', '/'].forEach((o) => {
    if (!tokens.some((t) => t.type === 'op' && t.value === o)) {
      tokens.push({ type: 'op', value: o });
    }
  });

  shuffle(tokens).forEach((tok) => {
    const el = document.createElement('div');
    el.className = 'exp-token';
    el.textContent = String(tok.value);
    el.dataset.type = tok.type;
    el.dataset.value = String(tok.value);
    el.setAttribute('draggable', 'true');

    el.addEventListener('dragstart', (e) => {
      if (STATE.isPaused) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('type', tok.type);
      e.dataTransfer.setData('value', String(tok.value));
    });

    pool.appendChild(el);
  });

  wrapper.appendChild(pool);

  const checkBtn = document.createElement('button');
  checkBtn.type = 'button';
  checkBtn.className = 'button primary';
  checkBtn.textContent = 'Проверить выражение (Enter)';
  checkBtn.addEventListener('click', () => {
    if (STATE.isPaused) return;
    checkExpression(slot1, slotOp, slot2, target);
  });

  wrapper.appendChild(checkBtn);

  gameArea.appendChild(wrapper);

  gameArea._expSlots = { slot1, slotOp, slot2, target };
}

// Проверка собранного выражения для уровня 3
function checkExpression(slot1, slotOp, slot2, target) {
  const leftVal = Number(slot1.dataset.value);
  const opVal = slotOp.dataset.value;
  const rightVal = Number(slot2.dataset.value);

  // Если не выбраны все блоки - ошибка
  if (!leftVal || !opVal || !rightVal) {
    shakeElement(slot1);
    shakeElement(slotOp);
    shakeElement(slot2);
    return;
  }

  // Считаем результат из выбранных блоков
  let result;
  if (opVal === '+') result = leftVal + rightVal;
  else if (opVal === '-') result = leftVal - rightVal;
  else if (opVal === '*') result = leftVal * rightVal;
  else if (opVal === '/') result = rightVal === 0 ? NaN : leftVal / rightVal;
  else result = NaN;

  if (result === target) {
    // Верный ответ: начисляем очки и завершаем раунд
    changeScore(20);
    onRoundFinished();
  } else {
    // Неверный ответ: штраф
    changeScore(-12);
    shakeElement(slot1);
    shakeElement(slotOp);
    shakeElement(slot2);

    // Сброс к исходному состоянию
    slot1.textContent = 'a';
    slotOp.textContent = '◦';
    slot2.textContent = 'b';

    delete slot1.dataset.value;
    delete slotOp.dataset.value;
    delete slot2.dataset.value;

    slot1.classList.remove('exp-slot--filled');
    slotOp.classList.remove('exp-slot--filled');
    slot2.classList.remove('exp-slot--filled');
  }
}

// ----- Завершение игры и рейтинг -----

// Завершение игры
function endGame() {
  stopTimer();

  const record = {
    name: STATE.playerName || 'Гость',
    score: STATE.score,
    maxLevel: STATE.maxLevelReached,
    date: new Date().toISOString(),
  };

  addResult(record);
  window.location.href = PAGE_RATING;
}

// Отрисовка таблицы результатов
function renderRatingTables() {
  const results = loadResults()
    .slice()
    .sort((a, b) => b.score - a.score);
  const top10 = results.slice(0, 10);

  function makeTableHtml(records) {
    if (!records.length) {
      return '<p class="hint">Пока нет сыгранных игр.</p>';
    }
    let html =
      '<table><thead><tr><th>#</th><th>Имя</th><th>Счёт</th><th>Макс. уровень</th><th>Дата</th></tr></thead><tbody>';
    records.forEach((r, idx) => {
      const dt = new Date(r.date);
      const dateStr = dt.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      html += `<tr>
                <td>${idx + 1}</td>
                <td>${r.name}</td>
                <td>${r.score}</td>
                <td>${r.maxLevel}</td>
                <td>${dateStr}</td>
            </tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  const ratingMain = $('rating-table');
  const ratingStart = $('start-rating-table');
  const html = makeTableHtml(top10);
  if (ratingMain) ratingMain.innerHTML = html;
  if (ratingStart) ratingStart.innerHTML = html;
}

// ----- Инициализация страниц -----

function initStartPage() {
  const settings = loadSettings() || { gameMode: 0 };

  const playerNameInput = $('player-name-input');
  const gameModeSelect = $('game-mode');
  const startForm = $('start-form');

  if (playerNameInput && settings.playerName) {
    playerNameInput.value = settings.playerName;
  }
  if (gameModeSelect && typeof settings.gameMode === 'number') {
    gameModeSelect.value = String(settings.gameMode);
  }

  renderRatingTables();

  if (startForm) {
    startForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = playerNameInput.value.trim();
      if (!name) return;

      const modeValue = Number(gameModeSelect.value);
      const gameMode = !isNaN(modeValue) ? modeValue : 0;

      const newSettings = {
        playerName: name,
        gameMode,
      };
      saveSettings(newSettings);

      window.location.href = PAGE_GAME;
    });
  }
}

function initGamePage() {
  const settings = loadSettings();
  if (!settings || !settings.playerName) {
    window.location.href = PAGE_START;
    return;
  }

  STATE.playerName = settings.playerName;
  STATE.gameMode = Number(settings.gameMode) || 0;

  const nameEl = $('current-player-name');
  if (nameEl) nameEl.textContent = STATE.playerName;

  const pauseBtn = $('pause-button');
  const finishLevelBtn = $('finish-level-button');

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      setPaused(!STATE.isPaused);
    });
  }

  if (finishLevelBtn) {
    finishLevelBtn.addEventListener('click', () => {
      finishByUser();
    });
  }

  // Клавиатура
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setPaused(!STATE.isPaused);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishByUser();
    } else if (e.key === 'Enter') {
      const gameArea = $('game-area');
      if (gameArea && gameArea._expSlots) {
        const { slot1, slotOp, slot2, target } = gameArea._expSlots;
        if (slot1 && slotOp && slot2 && typeof target === 'number') {
          checkExpression(slot1, slotOp, slot2, target);
        }
      }
    }
  });

  // 0 — все уровни: начинаем с 0; 1..3 — только указанный уровень
  const startIndex = STATE.gameMode === 0 ? 0 : Math.min(Math.max(STATE.gameMode - 1, 0), LEVELS.length - 1);

  startNewGame(startIndex);
}

function initRatingPage() {
  renderRatingTables();

  const last = loadLastResult();
  const nameEl = $('final-player-name');
  const scoreEl = $('final-score');
  const levelEl = $('final-max-level');

  if (last) {
    if (nameEl) nameEl.textContent = last.name;
    if (scoreEl) scoreEl.textContent = String(last.score);
    if (levelEl) levelEl.textContent = String(last.maxLevel);
  }

  const playAgainBtn = $('play-again-button');
  const backToStartBtn = $('back-to-start-button');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      const s = loadSettings();
      if (!s || !s.playerName) {
        window.location.href = PAGE_START;
      } else {
        window.location.href = PAGE_GAME;
      }
    });
  }
  if (backToStartBtn) {
    backToStartBtn.addEventListener('click', () => {
      window.location.href = PAGE_START;
    });
  }
}

// ----- Точка входа -----

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'start') initStartPage();
  else if (page === 'game') initGamePage();
  else if (page === 'rating') initRatingPage();
});
