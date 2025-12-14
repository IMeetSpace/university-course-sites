document.addEventListener('DOMContentLoaded', () => {
  const playground = document.getElementById('playground');
  if (!playground) return;

  // Все перетаскиваемые элементы
  const pieces = Array.from(playground.querySelectorAll('.piece'));

  // НАСТРОЙКИ

  // Допустимое расстояние (в пикселях) между текущей и правильной позицией
  const SNAP_DISTANCE_PX = 25;

  // Допустимая ошибка по углу поворота (в градусах)
  const SNAP_ROT_DEG = 15;

  // dx / dy — смещение центра элемента относительно центра якоря (в px)
  // rot     — правильный угол поворота
  const REL = {
    roof: { anchor: 'house', dx: 0, dy: -46, rot: 0 },
    tree2: { anchor: 'tree1', dx: 0, dy: -44, rot: 0 },
    trunk: { anchor: 'tree1', dx: 0, dy: 46, rot: 0 },
  };

  // Текущий перетаскиваемый элемент
  let active = null;

  // Выбранный элемент (в вашем коде сейчас используется только для выделения)
  let selectedPiece = null;

  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

  // Применяет transform с текущим углом поворота
  function applyTransform(el) {
    const rot = parseFloat(el.dataset.rot || '0');
    el.style.transform = `rotate(${rot}deg)`;
  }

  // Устанавливает позицию элемента (внутри playground)
  function setPiecePos(el, left, top) {
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  // Ограничивает значение диапазоном [min..max]
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // Устанавливает позицию элемента, но не даёт выйти за границы playground
  function setPiecePosClamped(el, left, top) {
    const pr = playground.getBoundingClientRect();

    const maxLeft = pr.width - el.offsetWidth;
    const maxTop = pr.height - el.offsetHeight;

    const clampedLeft = clamp(left, 0, maxLeft);
    const clampedTop = clamp(top, 0, maxTop);

    setPiecePos(el, clampedLeft, clampedTop);
  }

  // Нормализует угол к диапазону 0–360
  function normalizeDeg(deg) {
    let d = deg % 360;
    if (d < 0) d += 360;
    return d;
  }

  // Минимальная разница между углами
  function degDiff(a, b) {
    const d = Math.abs(normalizeDeg(a) - normalizeDeg(b));
    return Math.min(d, 360 - d);
  }

  // Возвращает координаты центра элемента (в координатах экрана)
  function getPieceCenter(el) {
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
    };
  }

  // Ставит элемент так, чтобы его центр совпал с заданной точкой
  // И при этом удерживает элемент внутри границ playground
  function setByCenter(el, centerX, centerY) {
    const pr = playground.getBoundingClientRect();
    const left = centerX - pr.left - el.offsetWidth / 2;
    const top = centerY - pr.top - el.offsetHeight / 2;
    setPiecePosClamped(el, left, top);
  }

  // Проверяет, что центр элемента находится внутри playground
  function isCenterInsidePlayground(el) {
    const pr = playground.getBoundingClientRect();
    const c = getPieceCenter(el);
    return c.x >= pr.left && c.x <= pr.right && c.y >= pr.top && c.y <= pr.bottom;
  }

  // Выделяет элемент как выбранный
  function setSelected(el) {
    pieces.forEach((p) => p.classList.remove('is-selected'));
    selectedPiece = el;
    if (el) el.classList.add('is-selected');
  }

  // Фиксирует элемент: угол, блокировка перетаскивания
  function lockPiece(el, rotDeg = 0) {
    el.dataset.rot = String(rotDeg);
    applyTransform(el);
    el.dataset.locked = '1';
    el.classList.add('is-locked');
    el.classList.remove('is-selected');
  }

  // Проверяет, все ли элементы зафиксированы
  function isComplete() {
    return pieces.every((p) => p.dataset.locked === '1');
  }

  // Запускает анимацию при успешной сборке
  function runCompleteAnimation() {
    playground.classList.add('is-complete');
  }

  // ИНИЦИАЛИЗАЦИЯ

  // Начальный поворот элементов
  pieces.forEach((p) => {
    const r = parseFloat(p.dataset.r || '0');
    p.dataset.rot = String(r);
    p.dataset.locked = '0';
    applyTransform(p);

    // На всякий случай: если left/top не заданы корректно — выставим 0
    const cs = getComputedStyle(p);
    if (cs.left === 'auto') p.style.left = '0px';
    if (cs.top === 'auto') p.style.top = '0px';
  });

  // DRAG & DROP (POINTER EVENTS)

  // Перевод координат указателя в координаты playground
  function pointerToPlayground(clientX, clientY) {
    const pr = playground.getBoundingClientRect();
    return {
      x: clientX - pr.left,
      y: clientY - pr.top,
    };
  }

  pieces.forEach((p) => {
    // Начало перетаскивания
    p.addEventListener('pointerdown', (e) => {
      if (p.dataset.locked === '1') return;

      setSelected(p);
      p.classList.add('is-dragging');
      p.setPointerCapture(e.pointerId);

      const { x, y } = pointerToPlayground(e.clientX, e.clientY);

      active = {
        el: p,
        startX: x,
        startY: y,
        baseLeft: parseFloat(getComputedStyle(p).left) || 0,
        baseTop: parseFloat(getComputedStyle(p).top) || 0,
      };
    });

    // Перетаскивание
    p.addEventListener('pointermove', (e) => {
      if (!active || active.el !== p) return;

      const { x, y } = pointerToPlayground(e.clientX, e.clientY);

      const nextLeft = active.baseLeft + (x - active.startX);
      const nextTop = active.baseTop + (y - active.startY);

      // ВАЖНО: ограничиваем по границам
      setPiecePosClamped(p, nextLeft, nextTop);
    });

    // Завершение перетаскивания
    p.addEventListener('pointerup', () => {
      if (!active || active.el !== p) return;
      active = null;
      p.classList.remove('is-dragging');

      const id = p.dataset.id;

      // Якоря можно зафиксировать в любом месте playground
      if ((id === 'house' || id === 'tree1') && p.dataset.locked !== '1') {
        if (isCenterInsidePlayground(p)) {
          lockPiece(p, 0);
          if (isComplete()) runCompleteAnimation();
        }
        return;
      }

      // ЗАВИСИМЫЕ ЭЛЕМЕНТЫ
      const rule = REL[id];
      if (!rule) return;

      const anchor = pieces.find((x) => x.dataset.id === rule.anchor);
      if (!anchor || anchor.dataset.locked !== '1') return;

      const anchorCenter = getPieceCenter(anchor);
      const wantedCenter = {
        x: anchorCenter.x + rule.dx,
        y: anchorCenter.y + rule.dy,
      };

      const currentCenter = getPieceCenter(p);
      const dist = Math.hypot(currentCenter.x - wantedCenter.x, currentCenter.y - wantedCenter.y);

      const curRot = parseFloat(p.dataset.rot || '0');
      const rotOk = degDiff(curRot, rule.rot) <= SNAP_ROT_DEG;

      // Блокируется, если близко по позиции и повороту
      if (dist <= SNAP_DISTANCE_PX && rotOk) {
        setByCenter(p, wantedCenter.x, wantedCenter.y); // тоже с clamp
        lockPiece(p, rule.rot);
        if (isComplete()) runCompleteAnimation();
      }
    });
  });

  // ПОВОРОТ КОЛЁСИКОМ МЫШИ
  playground.addEventListener(
    'wheel',
    (e) => {
      // В вашей реализации вращается активный элемент (который перетаскивают прямо сейчас)
      const el = active?.el;
      if (!el || el.dataset.locked === '1') return;

      e.preventDefault();

      // Направление вращения
      const step = e.deltaY > 0 ? 10 : -10;
      const cur = parseFloat(el.dataset.rot || '0');

      el.dataset.rot = String(cur + step);
      applyTransform(el);
    },
    { passive: false }
  );
});
