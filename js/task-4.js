document.addEventListener('DOMContentLoaded', () => {
  const latin = ['Consuetudo est altera natura', 'Nota bene', 'Nulla calamitas sola', 'Per aspera ad astra'];

  const ru = ['Привычка - вторая натура', 'Заметьте хорошо!', 'Беда не приходит одна', 'Через тернии к звёздам'];

  // DOM элементы
  const btnCreate = document.getElementById('btnCreate');
  const btnPaint = document.getElementById('btnPaint');
  const tbody = document.querySelector('#phraseTable tbody');
  const rand = document.getElementById('rand');
  const phraseList = document.getElementById('phraseList');

  // Состояние: список доступных индексов для неповторяющегося случайного вывода
  let pool = latin.map((_, i) => i);
  let clickCount = 0; // для чётности/нечётности
  let pCounter = 0; // для нумерации id в #rand

  function takeRandomIndex() {
    if (pool.length === 0) return null;
    const pos = Math.floor(Math.random() * pool.length);
    const idx = pool[pos];
    pool.splice(pos, 1);
    return idx;
  }

  function getRowClassByClick(n) {
    return n % 2 === 0 ? 'class1' : 'class2';
  }

  btnCreate?.addEventListener('click', () => {
    const idx = takeRandomIndex();
    if (idx === null) {
      alert('Фразы закончились');
      return;
    }

    clickCount += 1;
    const rowClass = getRowClassByClick(clickCount);

    // ===== Задание 1
    const tr = document.createElement('tr');
    tr.classList.add(rowClass);

    const tdLat = document.createElement('td');
    const tdRu = document.createElement('td');
    tdLat.textContent = latin[idx];
    tdRu.textContent = ru[idx];

    tr.append(tdLat, tdRu);
    tbody.appendChild(tr);

    // ===== Задание 2
    const p = document.createElement('p');
    p.classList.add(rowClass);

    // номер подчеркнутый, латинский курсив, русский обычный
    p.innerHTML = `<u>n=${pCounter}</u> <i>"${latin[idx]}"</i> "${ru[idx]}"`;
    rand.appendChild(p);
    pCounter += 1;

    // Задание 3
    const li = document.createElement('li');
    li.classList.add(rowClass);
    li.textContent = `"${latin[idx]}"`;

    const inner = document.createElement('ol');
    const innerLi = document.createElement('li');
    innerLi.textContent = ru[idx];
    inner.appendChild(innerLi);

    li.appendChild(inner);
    phraseList.appendChild(li);
  });

  // Кнопка "Перекрасить"
  btnPaint?.addEventListener('click', () => {
    const rows = document.querySelectorAll('.class1');
    rows.forEach((tr) => {
      tr.classList.add('bold');
    });
  });
});
