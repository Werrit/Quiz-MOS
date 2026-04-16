/**
 * Quiz App - optimized for performance
 */

// Global State
let QUIZ_DATA = []; 
let QUIZ_MAP = new Map(); 
let MODULES = [];
let state = {
  mode: '',
  queue: [],
  currentIdx: 0,
  correct: 0,
  wrongInSession: [],
  answered: false,
  selectedModules: [],
  wrongListLimit: 15 
};

// Persistence
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };

let wrongIds = load('wrongIds') || [];
let checkpoint = load('checkpoint') || null;
let doneIds = load('doneIds') || [];

// 1. Data Loading
async function loadQuizData() {
  try {
    const response = await fetch('quiz_data.json');
    if (!response.ok) throw new Error('Không thể tải dữ liệu');
    
    QUIZ_DATA = await response.json();
    QUIZ_DATA.forEach(q => QUIZ_MAP.set(q.id, q));
    MODULES = [...new Set(QUIZ_DATA.map(q => q.module))];
    
    document.getElementById('stat-total').textContent = QUIZ_DATA.length;
    showMenu();
  } catch (error) {
    console.error('Lỗi:', error);
    alert('Lỗi khi nạp file quiz_data.json. Hãy đảm bảo file tồn tại cùng thư mục.');
  }
}

// 2. Navigation & UI
function hideAll() {
  ['menu','module-selector','quiz','results','wrong-view'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
}

function showMenu() {
  hideAll();
  document.getElementById('menu').style.display = 'flex';
  updateHomeStats();
}

function updateHomeStats() {
  document.getElementById('stat-done').textContent = doneIds.length;
  document.getElementById('stat-wrong').textContent = wrongIds.length;
  const btn = document.getElementById('btn-redo-wrong');
  if (wrongIds.length > 0) {
    btn.style.display = 'flex';
    document.getElementById('wrong-count-label').textContent = `${wrongIds.length} câu cần ôn lại`;
  } else {
    btn.style.display = 'none';
  }
}

function showModuleSelector(mode) {
  state.mode = mode;
  hideAll();
  const sel = document.getElementById('module-selector');
  sel.style.display = 'flex';
  
  const list = document.getElementById('module-list');
  list.innerHTML = '';
  const fragment = document.createDocumentFragment();
  
  MODULES.forEach(m => {
    const count = QUIZ_DATA.filter(q => q.module === m).length;
    const div = document.createElement('div');
    div.className = 'module-option';
    div.innerHTML = `
      <input type="checkbox" id="mod_${m}" value="${m}">
      <label for="mod_${m}">${m}</label>
      <span class="module-count">${count} câu</span>
    `;
    div.querySelector('input').addEventListener('change', e => {
      div.classList.toggle('selected', e.target.checked);
    });
    fragment.appendChild(div);
  });
  list.appendChild(fragment);
}

// 3. Game Logic
function startSelectedModules() {
  const checked = [...document.querySelectorAll('#module-list input:checked')].map(el => el.value);
  if (checked.length === 0) { alert('Chọn ít nhất 1 module!'); return; }
  state.selectedModules = checked;
  startMode(state.mode);
}

function startMode(mode) {
  state.mode = mode;
  state.correct = 0;
  state.currentIdx = 0;
  
  let queue = [];
  if (mode === 'shuffle') {
    queue = shuffle([...QUIZ_DATA]);
  } else if (mode === 'study') {
    if (checkpoint && checkpoint.queueIds && checkpoint.idx > 0) {
      if (confirm(`Tiếp tục từ câu ${checkpoint.idx + 1}?`)) {
        queue = checkpoint.queueIds.map(id => QUIZ_MAP.get(id)).filter(Boolean);
        state.currentIdx = checkpoint.idx;
        state.queue = queue;
        startQuiz();
        return;
      }
    }
    queue = [...QUIZ_DATA];
    saveCheckpoint(queue, 0);
  } else if (mode === 'module') {
    queue = QUIZ_DATA.filter(q => state.selectedModules.includes(q.module));
  } else if (mode === 'wrong') {
    queue = shuffle(wrongIds.map(id => QUIZ_MAP.get(id)).filter(Boolean));
    if (queue.length === 0) return;
  }
  
  state.queue = queue;
  startQuiz();
}

function startQuiz() {
  hideAll();
  document.getElementById('quiz').style.display = 'flex';
  const labels = { shuffle: '🔀 Ngẫu nhiên', study: '📖 Tuần tự', module: '🎯 Module', wrong: '🔁 Câu sai' };
  document.getElementById('quiz-mode-label').textContent = labels[state.mode] || '';
  renderQuestion();
}

function renderQuestion() {
  const q = state.queue[state.currentIdx];
  if (!q) return showResults();

  state.answered = false;
  document.getElementById('quiz-counter').textContent = `${state.currentIdx + 1}/${state.queue.length}`;
  document.getElementById('progress-fill').style.width = `${((state.currentIdx) / state.queue.length * 100)}%`;
  document.getElementById('q-module').textContent = q.module;
  document.getElementById('q-text').textContent = q.question;
  
  const optEl = document.getElementById('q-options');
  optEl.innerHTML = '';
  const fields = ['option_a', 'option_b', 'option_c', 'option_d'];
  ['A', 'B', 'C', 'D'].forEach((letter, i) => {
    const div = document.createElement('div');
    div.className = 'option';
    div.innerHTML = `<span class="option-letter">${letter}</span><span>${q[fields[i]]}</span>`;
    div.onclick = () => selectAnswer(letter, div);
    optEl.appendChild(div);
  });
  
  document.getElementById('q-feedback').style.display = 'none';
  document.getElementById('next-btn').style.display = 'none';
  
  if (state.mode === 'study' && state.currentIdx % 5 === 0) {
    saveCheckpoint(state.queue, state.currentIdx);
  }
}

function selectAnswer(letter, clickedEl) {
  if (state.answered) return;
  state.answered = true;
  
  const q = state.queue[state.currentIdx];
  const isCorrect = letter === q.correct;
  const allOpts = document.querySelectorAll('.option');
  const optMap = { A: 0, B: 1, C: 2, D: 3 };
  
  allOpts.forEach(o => o.classList.add('disabled'));
  clickedEl.classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) allOpts[optMap[q.correct]].classList.add('correct');

  if (isCorrect) {
    state.correct++;
    if (!doneIds.includes(q.id)) { doneIds.push(q.id); save('doneIds', doneIds); }
    wrongIds = wrongIds.filter(id => id !== q.id);
  } else {
    if (!wrongIds.includes(q.id)) wrongIds.push(q.id);
  }
  save('wrongIds', wrongIds);

  const fb = document.getElementById('q-feedback');
  fb.style.display = 'block';
  fb.className = `feedback ${isCorrect ? 'correct' : 'wrong'}`;
  fb.innerHTML = isCorrect ? '✅ Chính xác!' : `❌ Sai! Đáp án đúng: <b>${q.correct}</b>`;
  
  const btn = document.getElementById('next-btn');
  btn.style.display = 'block';
  btn.textContent = state.currentIdx === state.queue.length - 1 ? '📊 Xem kết quả' : 'Câu tiếp theo →';
}

function nextQuestion() {
  state.currentIdx++;
  if (state.currentIdx < state.queue.length) {
    renderQuestion();
    window.scrollTo(0, 0);
  } else {
    showResults();
  }
}

function showResults() {
  hideAll();
  document.getElementById('results').style.display = 'flex';
  const total = state.queue.length;
  const pct = Math.round((state.correct / total) * 100) || 0;
  
  document.getElementById('score-pct').textContent = pct + '%';
  document.getElementById('score-circle').style.setProperty('--pct', pct * 3.6 + 'deg');
  document.getElementById('res-correct').textContent = state.correct;
  document.getElementById('res-wrong').textContent = total - state.correct;
  document.getElementById('res-total').textContent = total;
  
  if (state.mode === 'study' && pct === 100) save('checkpoint', null);
  updateHomeStats();
}

// 4. Utilities
function showWrongList(limitIncrease = false) {
  if (!limitIncrease) {
    state.wrongListLimit = 15;
    hideAll();
    document.getElementById('wrong-view').style.display = 'block';
  }
  const container = document.getElementById('wrong-list-content');
  const wrongQs = wrongIds.map(id => QUIZ_MAP.get(id)).filter(Boolean);
  
  if (wrongQs.length === 0) {
    container.innerHTML = '<p style="text-align:center;">Chưa có câu sai!</p>';
    return;
  }

  const toDisplay = wrongQs.slice(0, state.wrongListLimit);
  const fields = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' };
  let html = toDisplay.map((q, i) => `
    <div class="wrong-item">
      <div style="font-size:11px;color:#888;">${q.module}</div>
      <div class="wrong-q">${i+1}. ${q.question}</div>
      <div class="wrong-correct">✅ Đáp án: ${q.correct} - ${q[fields[q.correct]]}</div>
    </div>
  `).join('');

  if (wrongQs.length > state.wrongListLimit) {
    html += `<button class="next-btn" onclick="state.wrongListLimit += 20; showWrongList(true)">Xem thêm...</button>`;
  }
  container.innerHTML = html;
}

const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
const saveCheckpoint = (queue, idx) => save('checkpoint', { queueIds: queue.map(q => q.id), idx });
function restartSame() { state.correct = 0; state.currentIdx = 0; startQuiz(); }
function confirmExit() { document.getElementById('exit-modal').classList.add('active'); }
function closeModal() { document.getElementById('exit-modal').classList.remove('active'); }
function forceExit() { closeModal(); showMenu(); }

// Khởi chạy
loadQuizData();