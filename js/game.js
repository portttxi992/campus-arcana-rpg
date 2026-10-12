/**
 * 校園奧秘 - 引擎（固定章節 + AI 自由模式）
 */

const STORY_PACKS = {
  chapter1: { id: 'chapter1', title: '校園奧秘I', fullTitle: '校園奧秘I・轉學生的覺醒', subtitle: 'Campus Arcana I', tagline: '轉學第一天，秘密開始浮現', description: '你轉入星辰高中，逐漸揭開隱藏的奇幻世界。', startScene: 'c1_intro', unlockKey: 'ch1', npcs: { haoran: { name: '陳浩然', emoji: '⚡' }, teacher: { name: '蘇老師', emoji: '📚' }, xiaoyue: { name: '林曉月', emoji: '🌙' } } },
  chapter2: { id: 'chapter2', title: '校園奧秘II', fullTitle: '校園奧秘II・影之侵蝕', subtitle: 'Campus Arcana II', tagline: '第一場真正的危機到來', description: '加入守門人後，影之存在開始侵蝕校園。', startScene: 'c2_intro', unlockKey: 'ch2', npcs: { haoran: { name: '陳浩然', emoji: '⚡' }, teacher: { name: '蘇老師', emoji: '📚' }, xiaoyue: { name: '林曉月', emoji: '🌙' } } },
  chapter3: { id: 'chapter3', title: '校園奧秘III', fullTitle: '校園奧秘III・裂隙真相', subtitle: 'Campus Arcana III', tagline: '真相比想像中更沉重', description: '舊守門人現身，裂隙的真實目的逐漸揭露。', startScene: 'c3_intro', unlockKey: 'ch3', npcs: { haoran: { name: '陳浩然', emoji: '⚡' }, teacher: { name: '蘇老師', emoji: '📚' }, xiaoyue: { name: '林曉月', emoji: '🌙' } } },
  chapter4: { id: 'chapter4', title: '校園奧秘IV', fullTitle: '校園奧秘IV・終焉之選', subtitle: 'Campus Arcana IV', tagline: '最後的選擇，決定一切', description: '面對最終抉擇，你的決定將改變星辰高中的命運。', startScene: 'c4_intro', unlockKey: 'ch4', npcs: { haoran: { name: '陳浩然', emoji: '⚡' }, teacher: { name: '蘇老師', emoji: '📚' }, xiaoyue: { name: '林曉月', emoji: '🌙' } } }
};

const AI_NPCS = {
  haoran: { name: '陳浩然', emoji: '⚡' },
  teacher: { name: '蘇老師', emoji: '📚' },
  xiaoyue: { name: '林曉月', emoji: '🌙' }
};

function getAffectionRank(val) {
  if (val <= -3) return { text: '敵視', hearts: '♡♡♡♡♡' };
  if (val <= 0) return { text: '陌生', hearts: '♡♡♡♡♡' };
  if (val <= 3) return { text: '認識', hearts: '♥♡♡♡♡' };
  if (val <= 6) return { text: '友好', hearts: '♥♥♡♡♡' };
  if (val <= 10) return { text: '信賴', hearts: '♥♥♥♡♡' };
  if (val <= 15) return { text: '親密', hearts: '♥♥♥♥♡' };
  return { text: '羈絆', hearts: '♥♥♥♥♥' };
}

const CHAR_POOL = ['星','月','風','影','夜','青','白','玄','凌','雲','靜','冷','暖','小','阿','辰','羽','凜','秋','冬','夏','空','光','塵','楓','雪','晴','嵐','澈','遠','安','語','初','曉','陽'];
function generateNickname() {
  let name = '';
  for (let i = 0; i < 3; i++) name += CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
  return name;
}

let state = {
  mode: 'classic',
  playerName: '',
  currentStory: 'chapter1',
  currentScene: 'c1_intro',
  affection: {},
  met: {},
  flags: {},
  history: [],
  unlocked: { ch1: true, ch2: false, ch3: false, ch4: false },
  aiHistory: [],
  aiCurrent: null,
  pendingAiStart: false
};

let storyData = null;
let musicOn = false;
let audioCtx = null;
let ambientNodes = [];
let aiBusy = false;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const screens = { title: $('#title-screen'), create: $('#create-screen'), game: $('#game-screen') };

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function showToast(msg, duration = 2200) {
  const t = $('#status-toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), duration);
}

const SAVE_KEY = 'campus_arcana_v4';
const PROGRESS_KEY = 'campus_arcana_progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      state.unlocked = { ...state.unlocked, ...p.unlocked };
      if (p.playerName) state.playerName = p.playerName;
    }
  } catch {}
}
function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    unlocked: state.unlocked,
    playerName: state.playerName || ''
  }));
}
function unlockNext(chapterId) {
  const order = ['chapter1', 'chapter2', 'chapter3', 'chapter4'];
  const idx = order.indexOf(chapterId);
  if (idx >= 0 && idx < order.length - 1) {
    const nextKey = STORY_PACKS[order[idx + 1]].unlockKey;
    if (!state.unlocked[nextKey]) {
      state.unlocked[nextKey] = true;
      saveProgress();
      showToast(`已解鎖：${STORY_PACKS[order[idx + 1]].title}`);
    }
  }
}
function saveGame() {
  if (state.mode === 'ai') {
    saveAiGame({
      playerName: state.playerName,
      affection: state.affection,
      met: state.met,
      flags: state.flags,
      aiHistory: state.aiHistory,
      aiCurrent: state.aiCurrent
    });
    showToast('已存檔（AI 模式）');
    return;
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
  showToast('已存檔');
}
function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    state = { ...state, ...data, mode: 'classic' };
    return true;
  } catch { return false; }
}
function hasSave() {
  return !!localStorage.getItem(SAVE_KEY) || !!localStorage.getItem(AI_SAVE_KEY);
}
function clearSave() {
  localStorage.removeItem(SAVE_KEY);
  if (typeof clearAiGame === 'function') clearAiGame();
}

function updateTitleDisplay(packId) {
  if (state.mode === 'ai') {
    $('#main-title').textContent = '校園奧秘・AI';
    $('#main-subtitle').textContent = 'Campus Arcana AI';
    $('#main-tagline').textContent = '由 AI 即時生成的自由劇情';
    document.title = '校園奧秘・AI 自由模式 | Campus Arcana';
    return;
  }
  const pack = STORY_PACKS[packId] || STORY_PACKS.chapter1;
  $('#main-title').textContent = pack.title;
  $('#main-subtitle').textContent = pack.subtitle;
  $('#main-tagline').textContent = pack.tagline;
  document.title = `${pack.fullTitle} | Campus Arcana`;
}

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function startAmbient() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAmbient();
  const master = audioCtx.createGain();
  master.gain.value = 0.03;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  filter.Q.value = 0.6;
  const osc1 = audioCtx.createOscillator();
  const g1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 98;
  g1.gain.value = 0.45;
  osc1.connect(g1);
  const osc2 = audioCtx.createOscillator();
  const g2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 147;
  g2.gain.value = 0.22;
  osc2.connect(g2);
  const lfo = audioCtx.createOscillator();
  const lfoG = audioCtx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.04;
  lfoG.gain.value = 0.12;
  lfo.connect(lfoG);
  lfoG.connect(master.gain);
  g1.connect(filter);
  g2.connect(filter);
  filter.connect(master);
  master.connect(audioCtx.destination);
  osc1.start(); osc2.start(); lfo.start();
  ambientNodes = [osc1, osc2, lfo, g1, g2, filter, master];
}
function stopAmbient() {
  ambientNodes.forEach(n => { try { n.stop?.(); } catch {} try { n.disconnect?.(); } catch {} });
  ambientNodes = [];
}
function toggleMusic() {
  musicOn = !musicOn;
  if (musicOn) {
    startAmbient();
    $('#btn-music').classList.add('active');
    $('#music-status').textContent = '音樂：開';
  } else {
    stopAmbient();
    $('#btn-music').classList.remove('active');
    $('#music-status').textContent = '音樂：關';
  }
}

async function loadStory(packId) {
  const pack = STORY_PACKS[packId];
  if (!pack) throw new Error('找不到章節');
  if (packId === 'chapter1') storyData = CHAPTER1;
  else if (packId === 'chapter2') storyData = CHAPTER2;
  else if (packId === 'chapter3') storyData = CHAPTER3;
  else if (packId === 'chapter4') storyData = CHAPTER4;
  else throw new Error('尚未實作');
  state.affection = {};
  state.met = {};
  for (const key of Object.keys(pack.npcs)) state.affection[key] = 0;
  state.currentStory = packId;
  state.currentScene = pack.startScene;
  state.flags = {};
  state.history = [];
  state.mode = 'classic';
  updateTitleDisplay(packId);
}

function getNpcs() {
  if (state.mode === 'ai') return AI_NPCS;
  return STORY_PACKS[state.currentStory]?.npcs || AI_NPCS;
}

function renderAffection() {
  const bar = $('#affection-bar');
  const npcs = getNpcs();
  bar.innerHTML = '';
  for (const [key, npc] of Object.entries(npcs)) {
    if (!state.met[key]) continue;
    const val = state.affection[key] ?? 0;
    const rank = getAffectionRank(val);
    const el = document.createElement('div');
    el.className = 'affection-item';
    el.innerHTML = `<div class="top-row"><span>${npc.emoji}</span><span>${npc.name}</span><span class="value">${val}</span></div><div class="rank">${rank.text} <span class="hearts">${rank.hearts}</span></div>`;
    bar.appendChild(el);
  }
}
function meetNpc(k) { if (!state.met[k]) state.met[k] = true; }

function setAiLoading(on) {
  aiBusy = on;
  const el = $('#ai-loading');
  if (el) el.classList.toggle('hidden', !on);
  $$('.choice-btn').forEach(b => { b.disabled = on; });
}

function renderAiScene() {
  const scene = state.aiCurrent;
  if (!scene) {
    $('#story-text').textContent = '尚未開始。';
    $('#choices').innerHTML = '';
    return;
  }
  if (scene.meet) scene.meet.forEach(meetNpc);

  let text = (scene.text || '').replace(/\{player\}/g, state.playerName);
  const textEl = $('#story-text');
  textEl.style.animation = 'none';
  textEl.offsetHeight;
  textEl.style.animation = '';
  textEl.textContent = text;

  const choicesEl = $('#choices');
  choicesEl.innerHTML = '';

  if (scene.end || !scene.choices?.length) {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = '返回標題畫面';
    btn.onclick = () => {
      showScreen('title');
      updateContinueButton();
      updateTitleDisplay(state.currentStory);
    };
    choicesEl.appendChild(btn);

    const again = document.createElement('button');
    again.className = 'choice-btn next-chapter';
    again.textContent = '再玩一次 AI 模式';
    again.onclick = () => startAiMode(true);
    choicesEl.appendChild(again);
  } else {
    scene.choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = (choice.text || '繼續').replace(/\{player\}/g, state.playerName);
      btn.onclick = () => makeAiChoice(choice);
      choicesEl.appendChild(btn);
    });
  }

  renderAffection();
  $('#display-name').textContent = state.playerName;
  const label = $('#chapter-label');
  label.textContent = 'AI 自由模式';
  label.classList.add('ai-label');
}

async function makeAiChoice(choice) {
  if (aiBusy) return;
  if (choice.effects) {
    if (choice.effects.affection) {
      for (const [npc, delta] of Object.entries(choice.effects.affection)) {
        meetNpc(npc);
        state.affection[npc] = (state.affection[npc] ?? 0) + Number(delta);
        const name = AI_NPCS[npc]?.name || npc;
        showToast(`${name} 好感度 ${delta > 0 ? '+' : ''}${delta}`);
      }
    }
    if (choice.effects.flags) Object.assign(state.flags, choice.effects.flags);
    if (choice.effects.meet) choice.effects.meet.forEach(meetNpc);
  }

  state.aiHistory.push({
    text: state.aiCurrent?.text || '',
    choice: choice.text
  });
  if (state.aiHistory.length > 20) state.aiHistory.shift();

  setAiLoading(true);
  try {
    const scene = await generateAiScene({
      playerName: state.playerName,
      history: state.aiHistory,
      lastChoice: choice.text,
      affection: state.affection,
      met: state.met,
      flags: state.flags
    });
    state.aiCurrent = scene;
    renderAiScene();
  } catch (e) {
    console.error(e);
    showToast('AI 生成失敗：' + (e.message || e), 4000);
    const choicesEl = $('#choices');
    const retry = document.createElement('button');
    retry.className = 'choice-btn next-chapter';
    retry.textContent = '重試生成下一段';
    retry.onclick = () => makeAiChoice(choice);
    choicesEl.appendChild(retry);
  } finally {
    setAiLoading(false);
  }
}

async function startAiMode(forceNew = false) {
  if (typeof hasAiKey !== 'function' || !hasAiKey()) {
    showToast('請先到「AI 設定」填入 API Key');
    $('#ai-settings-modal').classList.remove('hidden');
    return;
  }

  state.mode = 'ai';
  state.pendingAiStart = true;

  if (state.playerName && state.playerName.trim() && !forceNew) {
    await bootAiGame(state.playerName);
    return;
  }

  $('#create-title').textContent = 'AI 自由模式';
  $('#create-hint').textContent = 'AI 將根據你的選擇即時生成星辰高中的故事……';
  showScreen('create');
  if (!state.playerName) {
    $('#player-name').value = '';
    $('#btn-start').disabled = true;
  } else {
    $('#player-name').value = state.playerName;
    $('#btn-start').disabled = false;
  }
}

async function bootAiGame(name) {
  state.playerName = name;
  state.mode = 'ai';
  state.affection = { haoran: 0, teacher: 0, xiaoyue: 0 };
  state.met = {};
  state.flags = {};
  state.aiHistory = [];
  state.aiCurrent = null;
  state.pendingAiStart = false;
  saveProgress();
  updateTitleDisplay();
  showScreen('game');
  setAiLoading(true);
  $('#story-text').textContent = '正在生成開場……';
  $('#choices').innerHTML = '';
  try {
    const scene = await generateAiScene({
      playerName: state.playerName,
      history: [],
      lastChoice: null,
      affection: state.affection,
      met: state.met,
      flags: state.flags
    });
    state.aiCurrent = scene;
    renderAiScene();
  } catch (e) {
    console.error(e);
    showToast('AI 開場失敗：' + (e.message || e), 4000);
    $('#story-text').textContent = '無法連線到 AI。請檢查 API Key、模型名稱與網路，然後返回標題重試。\n\n錯誤：' + (e.message || e);
    const choicesEl = $('#choices');
    choicesEl.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = '返回標題';
    btn.onclick = () => showScreen('title');
    choicesEl.appendChild(btn);
  } finally {
    setAiLoading(false);
  }
}

function renderScene() {
  if (state.mode === 'ai') {
    renderAiScene();
    return;
  }
  const scene = storyData[state.currentScene];
  if (!scene) {
    $('#story-text').textContent = '【錯誤】場景不存在：' + state.currentScene;
    $('#choices').innerHTML = '';
    return;
  }
  if (scene.meet) scene.meet.forEach(meetNpc);

  let text = scene.text.replace(/\{player\}/g, state.playerName);
  if (scene.extra) {
    for (const ex of scene.extra) {
      if (ex.if && state.flags[ex.if]) text += '\n\n' + ex.text.replace(/\{player\}/g, state.playerName);
      if (ex.ifNot && !state.flags[ex.ifNot]) text += '\n\n' + ex.text.replace(/\{player\}/g, state.playerName);
    }
  }

  const textEl = $('#story-text');
  textEl.style.animation = 'none';
  textEl.offsetHeight;
  textEl.style.animation = '';
  textEl.textContent = text;

  const choicesEl = $('#choices');
  choicesEl.innerHTML = '';
  $('#chapter-label').classList.remove('ai-label');

  if (scene.choices?.length) {
    scene.choices.forEach(choice => {
      if (choice.requireFlag && !state.flags[choice.requireFlag]) return;
      if (choice.requireNotFlag && state.flags[choice.requireNotFlag]) return;
      if (choice.requireAffection) {
        const [npc, op, val] = choice.requireAffection;
        const cur = state.affection[npc] ?? 0;
        if (op === '>=' && cur < val) return;
        if (op === '>' && cur <= val) return;
      }
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text.replace(/\{player\}/g, state.playerName);
      btn.onclick = () => makeChoice(choice);
      choicesEl.appendChild(btn);
    });
  } else if (scene.end) {
    unlockNext(state.currentStory);
    saveProgress();
    const order = ['chapter1', 'chapter2', 'chapter3', 'chapter4'];
    const idx = order.indexOf(state.currentStory);
    const hasNext = idx >= 0 && idx < order.length - 1 && state.unlocked[STORY_PACKS[order[idx + 1]].unlockKey];
    if (hasNext) {
      const nextId = order[idx + 1];
      const nextPack = STORY_PACKS[nextId];
      const btnNext = document.createElement('button');
      btnNext.className = 'choice-btn next-chapter';
      btnNext.textContent = `繼續下一章：${nextPack.title}`;
      btnNext.onclick = async () => {
        const name = state.playerName;
        const unlocked = { ...state.unlocked };
        clearSave();
        state.playerName = name;
        state.unlocked = unlocked;
        await loadStory(nextId);
        state.playerName = name;
        showScreen('game');
        renderScene();
        showToast(`進入 ${nextPack.title}`);
      };
      choicesEl.appendChild(btnNext);
    }
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = '返回標題畫面';
    btn.onclick = () => {
      clearSave();
      showScreen('title');
      updateContinueButton();
      updateTitleDisplay(state.currentStory);
    };
    choicesEl.appendChild(btn);
  }

  renderAffection();
  $('#display-name').textContent = state.playerName;
  $('#chapter-label').textContent = STORY_PACKS[state.currentStory].title;
}

function makeChoice(choice) {
  if (choice.effects) {
    if (choice.effects.affection) {
      for (const [npc, delta] of Object.entries(choice.effects.affection)) {
        meetNpc(npc);
        state.affection[npc] = (state.affection[npc] ?? 0) + delta;
        const name = STORY_PACKS[state.currentStory].npcs[npc]?.name || npc;
        showToast(`${name} 好感度 ${delta > 0 ? '+' : ''}${delta}`);
      }
    }
    if (choice.effects.flags) Object.assign(state.flags, choice.effects.flags);
    if (choice.effects.meet) choice.effects.meet.forEach(meetNpc);
  }
  state.history.push(state.currentScene);
  if (state.history.length > 100) state.history.shift();

  let next = choice.next;
  if (choice.nextIf) {
    for (const cond of choice.nextIf) {
      if (cond.if && state.flags[cond.if]) { next = cond.next; break; }
      if (cond.ifNot && !state.flags[cond.ifNot]) { next = cond.next; break; }
      if (cond.affection) {
        const [npc, op, val] = cond.affection;
        const cur = state.affection[npc] ?? 0;
        if ((op === '>=' && cur >= val) || (op === '>' && cur > val)) { next = cond.next; break; }
      }
    }
  }
  state.currentScene = next;
  renderScene();
}

function initAiSettingsUI() {
  const wrap = $('#custom-endpoint-wrap');

  $('#ai-provider').onchange = () => {
    wrap.classList.toggle('hidden', $('#ai-provider').value !== 'compatible');
  };

  $('#btn-ai-settings').onclick = () => {
    const cur = loadAiSettings();
    $('#ai-provider').value = cur.provider || 'openai';
    $('#ai-api-key').value = cur.apiKey || '';
    $('#ai-model').value = cur.model || '';
    $('#ai-endpoint').value = cur.endpoint || '';
    wrap.classList.toggle('hidden', ($('#ai-provider').value !== 'compatible'));
    $('#ai-settings-modal').classList.remove('hidden');
  };

  $('#btn-close-ai-settings').onclick = () => $('#ai-settings-modal').classList.add('hidden');

  $('#btn-save-ai-settings').onclick = () => {
    const provider = $('#ai-provider').value;
    const apiKey = $('#ai-api-key').value.trim();
    const model = $('#ai-model').value.trim() || defaultModel(provider);
    const endpoint = $('#ai-endpoint').value.trim();
    if (!apiKey) {
      showToast('請填入 API Key');
      return;
    }
    if (provider === 'compatible' && !endpoint) {
      showToast('自訂端點請填 URL');
      return;
    }
    saveAiSettings({ provider, apiKey, model, endpoint });
    showToast('AI 設定已儲存');
    $('#ai-settings-modal').classList.add('hidden');
  };
}

function initEvents() {
  $('#btn-new-game').onclick = () => {
    state.mode = 'classic';
    state.pendingAiStart = false;
    const pack = STORY_PACKS[state.currentStory];
    if (state.playerName && state.playerName.trim()) {
      (async () => {
        const name = state.playerName;
        await loadStory(state.currentStory);
        state.playerName = name;
        showScreen('game');
        renderScene();
      })();
      return;
    }
    $('#create-title').textContent = '建立角色';
    $('#create-hint').textContent = pack.id === 'chapter1'
      ? '你是一名剛轉入「星辰高中」的學生……'
      : `即將進入「${pack.fullTitle}」`;
    showScreen('create');
    $('#player-name').value = '';
    $('#btn-start').disabled = true;
  };

  $('#btn-ai-mode').onclick = () => startAiMode(false);

  $('#btn-continue').onclick = async () => {
    const aiSave = typeof loadAiGame === 'function' ? loadAiGame() : null;
    if (aiSave && aiSave.mode === 'ai') {
      state.mode = 'ai';
      state.playerName = aiSave.playerName;
      state.affection = aiSave.affection || {};
      state.met = aiSave.met || {};
      state.flags = aiSave.flags || {};
      state.aiHistory = aiSave.aiHistory || [];
      state.aiCurrent = aiSave.aiCurrent;
      updateTitleDisplay();
      showScreen('game');
      renderAiScene();
      showToast('已讀取 AI 存檔');
      return;
    }
    if (!loadGame()) { showToast('沒有存檔'); return; }
    await loadStory(state.currentStory);
    loadGame();
    showScreen('game');
    renderScene();
  };

  $('#btn-select-story').onclick = () => {
    state.mode = 'classic';
    const list = $('#story-list');
    list.innerHTML = '';
    for (const pack of Object.values(STORY_PACKS)) {
      const unlocked = state.unlocked[pack.unlockKey];
      const div = document.createElement('div');
      div.className = 'story-item' + (state.currentStory === pack.id ? ' active' : '') + (unlocked ? '' : ' locked');
      div.innerHTML = `<h4>${pack.fullTitle}</h4><p>${pack.description}</p>`;
      if (unlocked) {
        div.onclick = () => {
          state.currentStory = pack.id;
          updateTitleDisplay(pack.id);
          $$('.story-item').forEach(el => el.classList.remove('active'));
          div.classList.add('active');
        };
      }
      list.appendChild(div);
    }
    $('#story-modal').classList.remove('hidden');
  };

  $('#btn-close-story').onclick = () => $('#story-modal').classList.add('hidden');

  $('#player-name').oninput = e => { $('#btn-start').disabled = e.target.value.trim().length === 0; };
  $('#btn-random-name').onclick = () => {
    $('#player-name').value = generateNickname();
    $('#btn-start').disabled = false;
  };

  $('#btn-start').onclick = async () => {
    const name = $('#player-name').value.trim();
    if (!name) return;
    state.playerName = name;
    saveProgress();
    if (state.pendingAiStart || state.mode === 'ai') {
      await bootAiGame(name);
      return;
    }
    await loadStory(state.currentStory);
    state.playerName = name;
    showScreen('game');
    renderScene();
  };

  $('#btn-save').onclick = saveGame;
  $('#btn-menu').onclick = () => $('#menu-modal').classList.remove('hidden');
  $('#btn-close-menu').onclick = () => $('#menu-modal').classList.add('hidden');

  $('#btn-load').onclick = async () => {
    const aiSave = typeof loadAiGame === 'function' ? loadAiGame() : null;
    if (state.mode === 'ai' && aiSave) {
      state.playerName = aiSave.playerName;
      state.affection = aiSave.affection || {};
      state.met = aiSave.met || {};
      state.flags = aiSave.flags || {};
      state.aiHistory = aiSave.aiHistory || [];
      state.aiCurrent = aiSave.aiCurrent;
      $('#menu-modal').classList.add('hidden');
      renderAiScene();
      showToast('已讀取 AI 存檔');
      return;
    }
    if (!loadGame()) { showToast('沒有存檔'); return; }
    await loadStory(state.currentStory);
    loadGame();
    $('#menu-modal').classList.add('hidden');
    renderScene();
    showToast('已讀取存檔');
  };

  $('#btn-restart').onclick = async () => {
    if (!confirm('確定重新開始？')) return;
    const name = state.playerName;
    if (state.mode === 'ai') {
      $('#menu-modal').classList.add('hidden');
      await bootAiGame(name);
      return;
    }
    await loadStory(state.currentStory);
    state.playerName = name;
    $('#menu-modal').classList.add('hidden');
    renderScene();
  };

  $('#btn-title').onclick = () => {
    $('#menu-modal').classList.add('hidden');
    showScreen('title');
    updateContinueButton();
  };

  $('#btn-music').onclick = toggleMusic;

  function doClearAll() {
    if (!confirm('確定要清除所有存檔與進度嗎？此操作無法復原。')) return;
    clearSave();
    localStorage.removeItem(PROGRESS_KEY);
    state.playerName = '';
    state.unlocked = { ch1: true, ch2: false, ch3: false, ch4: false };
    state.currentStory = 'chapter1';
    state.mode = 'classic';
    updateTitleDisplay('chapter1');
    updateContinueButton();
    showToast('已清除所有存檔');
    $('#menu-modal').classList.add('hidden');
    showScreen('title');
  }
  if ($('#btn-clear-save')) $('#btn-clear-save').onclick = doClearAll;
  if ($('#btn-clear-save-menu')) $('#btn-clear-save-menu').onclick = doClearAll;

  initAiSettingsUI();
}

function updateContinueButton() {
  $('#btn-continue').disabled = !hasSave();
}

document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  initEvents();
  updateContinueButton();
  updateTitleDisplay(state.currentStory);
  showScreen('title');
});
