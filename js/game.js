/**
 * 校園奧秘 - 完整系列文字RPG
 * 四章完整劇情 + 章節解鎖 + 動態標題 + BGM + 好感度優化
 */

// ==================== 劇情包 ====================
const STORY_PACKS = {
  chapter1: {
    id: 'chapter1',
    title: '校園奧秘I',
    fullTitle: '校園奧秘I・轉學生的覺醒',
    subtitle: 'Campus Arcana I',
    tagline: '轉學第一天，秘密開始浮現',
    description: '你轉入星辰高中，逐漸揭開隱藏的奇幻世界。',
    startScene: 'c1_intro',
    unlockKey: 'ch1',
    npcs: {
      haoran: { name: '陳浩然', emoji: '⚡' },
      teacher: { name: '蘇老師', emoji: '📚' },
      xiaoyue: { name: '林曉月', emoji: '🌙' }
    }
  },
  chapter2: {
    id: 'chapter2',
    title: '校園奧秘II',
    fullTitle: '校園奧秘II・影之侵蝕',
    subtitle: 'Campus Arcana II',
    tagline: '第一場真正的危機到來',
    description: '加入守門人後，影之存在開始侵蝕校園。',
    startScene: 'c2_intro',
    unlockKey: 'ch2',
    npcs: {
      haoran: { name: '陳浩然', emoji: '⚡' },
      teacher: { name: '蘇老師', emoji: '📚' },
      xiaoyue: { name: '林曉月', emoji: '🌙' }
    }
  },
  chapter3: {
    id: 'chapter3',
    title: '校園奧秘III',
    fullTitle: '校園奧秘III・裂隙真相',
    subtitle: 'Campus Arcana III',
    tagline: '真相比想像中更沉重',
    description: '舊守門人現身，裂隙的真實目的逐漸揭露。',
    startScene: 'c3_intro',
    unlockKey: 'ch3',
    npcs: {
      haoran: { name: '陳浩然', emoji: '⚡' },
      teacher: { name: '蘇老師', emoji: '📚' },
      xiaoyue: { name: '林曉月', emoji: '🌙' }
    }
  },
  chapter4: {
    id: 'chapter4',
    title: '校園奧秘IV',
    fullTitle: '校園奧秘IV・終焉之選',
    subtitle: 'Campus Arcana IV',
    tagline: '最後的選擇，決定一切',
    description: '面對最終抉擇，你的決定將改變星辰高中的命運。',
    startScene: 'c4_intro',
    unlockKey: 'ch4',
    npcs: {
      haoran: { name: '陳浩然', emoji: '⚡' },
      teacher: { name: '蘇老師', emoji: '📚' },
      xiaoyue: { name: '林曉月', emoji: '🌙' }
    }
  }
};

// ==================== 好感度等級 ====================
function getAffectionRank(val) {
  if (val <= -3) return { text: '敵視', hearts: '♡♡♡♡♡' };
  if (val <= 0) return { text: '陌生', hearts: '♡♡♡♡♡' };
  if (val <= 3) return { text: '認識', hearts: '♥♡♡♡♡' };
  if (val <= 6) return { text: '友好', hearts: '♥♥♡♡♡' };
  if (val <= 10) return { text: '信賴', hearts: '♥♥♥♡♡' };
  if (val <= 15) return { text: '親密', hearts: '♥♥♥♥♡' };
  return { text: '羈絆', hearts: '♥♥♥♥♥' };
}

// ==================== 隨機暱稱 ====================
const CHAR_POOL = ['星','月','風','影','夜','青','白','玄','凌','雲','靜','冷','暖','小','阿','辰','羽','凜','秋','冬','夏','空','光','塵','楓','雪','晴','嵐','澈','遠','安','語','初','曉','陽'];
function generateNickname() {
  let name = '';
  for (let i = 0; i < 3; i++) name += CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
  return name;
}

// ==================== 狀態 ====================
let state = {
  playerName: '',
  currentStory: 'chapter1',
  currentScene: 'c1_intro',
  affection: {},
  met: {},
  flags: {},
  history: [],
  unlocked: { ch1: true, ch2: false, ch3: false, ch4: false }
};

let storyData = null;
let musicOn = false;
let audioCtx = null;
let ambientNodes = [];

// ==================== DOM ====================
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

// ==================== 進度與存檔 ====================
const SAVE_KEY = 'campus_arcana_v4';
const PROGRESS_KEY = 'campus_arcana_progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      state.unlocked = { ...state.unlocked, ...p.unlocked };
    }
  } catch {}
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ unlocked: state.unlocked }));
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
  localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
  showToast('已存檔');
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    state = { ...state, ...data };
    return true;
  } catch { return false; }
}

function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
function clearSave() { localStorage.removeItem(SAVE_KEY); }

// ==================== 標題更新 ====================
function updateTitleDisplay(packId) {
  const pack = STORY_PACKS[packId] || STORY_PACKS.chapter1;
  $('#main-title').textContent = pack.title;
  $('#main-subtitle').textContent = pack.subtitle;
  $('#main-tagline').textContent = pack.tagline;
  document.title = `${pack.fullTitle} | Campus Arcana`;
}

// ==================== BGM (Web Audio 環境音) ====================
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function startAmbient() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  stopAmbient();

  // 低頻 drone
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 55;
  gain1.gain.value = 0.04;
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc1.start();

  // 中頻 pad
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 110;
  gain2.gain.value = 0.025;
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start();

  // 高頻微光
  const osc3 = audioCtx.createOscillator();
  const gain3 = audioCtx.createGain();
  osc3.type = 'triangle';
  osc3.frequency.value = 220;
  gain3.gain.value = 0.012;
  osc3.connect(gain3);
  gain3.connect(audioCtx.destination);
  osc3.start();

  // 緩慢 LFO 讓音量呼吸
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(gain1.gain);
  lfoGain.connect(gain2.gain);
  lfo.start();

  ambientNodes = [osc1, osc2, osc3, lfo, gain1, gain2, gain3];
}

function stopAmbient() {
  ambientNodes.forEach(n => {
    try { n.stop?.(); } catch {}
    try { n.disconnect?.(); } catch {}
  });
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

// ==================== 劇情載入 ====================
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
  updateTitleDisplay(packId);
}

// ==================== 渲染 ====================
function renderAffection() {
  const bar = $('#affection-bar');
  const pack = STORY_PACKS[state.currentStory];
  bar.innerHTML = '';
  for (const [key, npc] of Object.entries(pack.npcs)) {
    if (!state.met[key]) continue;
    const val = state.affection[key] ?? 0;
    const rank = getAffectionRank(val);
    const el = document.createElement('div');
    el.className = 'affection-item';
    el.innerHTML = `
      <div class="top-row">
        <span>${npc.emoji}</span>
        <span>${npc.name}</span>
        <span class="value">${val}</span>
      </div>
      <div class="rank">${rank.text} <span class="hearts">${rank.hearts}</span></div>
    `;
    bar.appendChild(el);
  }
}

function meetNpc(k) { if (!state.met[k]) state.met[k] = true; }

function renderScene() {
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
    // 結局：解鎖下一章
    unlockNext(state.currentStory);
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
  const pack = STORY_PACKS[state.currentStory];
  $('#chapter-label').textContent = pack.title;
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

// ==================== 事件 ====================
function initEvents() {
  $('#btn-new-game').onclick = () => {
    showScreen('create');
    $('#player-name').value = '';
    $('#btn-start').disabled = true;
    const pack = STORY_PACKS[state.currentStory];
    $('#create-hint').textContent = pack.id === 'chapter1'
      ? '你是一名剛轉入「星辰高中」的學生……'
      : `即將進入「${pack.fullTitle}」`;
  };

  $('#btn-continue').onclick = async () => {
    if (!loadGame()) { showToast('沒有存檔'); return; }
    await loadStory(state.currentStory);
    loadGame();
    showScreen('game');
    renderScene();
  };

  $('#btn-select-story').onclick = () => {
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
    await loadStory(state.currentStory);
    showScreen('game');
    renderScene();
  };

  $('#btn-save').onclick = saveGame;
  $('#btn-menu').onclick = () => $('#menu-modal').classList.remove('hidden');
  $('#btn-close-menu').onclick = () => $('#menu-modal').classList.add('hidden');

  $('#btn-load').onclick = async () => {
    if (!loadGame()) { showToast('沒有存檔'); return; }
    await loadStory(state.currentStory);
    loadGame();
    $('#menu-modal').classList.add('hidden');
    renderScene();
    showToast('已讀取存檔');
  };

  $('#btn-restart').onclick = async () => {
    if (!confirm('確定重新開始本章？')) return;
    const name = state.playerName;
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
}

function updateContinueButton() {
  $('#btn-continue').disabled = !hasSave();
}

// ==================== 第一章 ====================
const CHAPTER1 = {
  c1_intro: {
    text: '九月的早晨，陽光灑在星辰高中的校門口。\n\n你拖著行李箱站在金色校名牌下。作為轉學生，你對這所學校幾乎一無所知——只聽說升學率高、校風自由。\n\n「喂！那邊的轉學生！」一個充滿活力的聲音從身後傳來。',
    choices: [
      { text: '轉過身去看是誰', next: 'c1_meet_haoran' },
      { text: '假裝沒聽到，繼續走', next: 'c1_ignore' }
    ]
  },
  c1_meet_haoran: {
    meet: ['haoran'],
    text: '戴著眼鏡、笑容陽光的男生朝你揮手。\n\n「我是陳浩然，三年級，學生會的！被分配來帶轉學生。」他主動接過行李箱，「你叫什麼名字？」\n\n「{player}。」\n\n「好名字！走吧，先去教務處。」',
    choices: [
      { text: '「謝謝，麻煩你了。」', next: 'c1_office', effects: { affection: { haoran: 1 } } },
      { text: '「不用客氣，我自己可以。」', next: 'c1_office', effects: { flags: { independent: true } } },
      { text: '「學生會？聽起來很厲害。」', next: 'c1_office', effects: { affection: { haoran: 2 } } }
    ]
  },
  c1_ignore: {
    meet: ['haoran'],
    text: '你沒理會，徑自往前走。那人追上來擋在面前。\n\n「等等！我是陳浩然，學生會的，被派來帶轉學生……你跑得好快。」他苦笑，「能告訴我名字嗎？」\n\n「{player}。」',
    choices: [
      { text: '「抱歉，沒注意到。」', next: 'c1_office' },
      { text: '「下次別突然大喊。」', next: 'c1_office', effects: { affection: { haoran: -1 }, flags: { cold_start: true } } }
    ]
  },
  c1_office: {
    text: '報到完成，領到制服、課表與教室鑰匙。\n\n「三年二班在教學樓三樓。」浩然指著前方，「今天第一節是導師時間，蘇老師人很好。」\n\n走向教學樓時，走廊轉角突然閃過一道銀白色的光。\n\n「咦？你有看到嗎？」浩然愣住。',
    choices: [
      { text: '「有……那是什麼？」', next: 'c1_see_light' },
      { text: '「可能是光線反射。」', next: 'c1_dismiss' },
      { text: '（默默記在心裡）', next: 'c1_silent', effects: { flags: { observant: true } } }
    ]
  },
  c1_see_light: {
    meet: ['teacher'],
    text: '「我也看到了……這學校有些地方比較特別。」浩然壓低聲音，「先別多想，遲到不好。」\n\n三樓教室門口，穿著白襯衫的女老師站在那裡。約三十出頭，眼神溫和卻深邃。\n\n「你就是{player}吧？我是蘇晴，導師。歡迎加入三年二班。」',
    choices: [
      { text: '「蘇老師好，請多指教。」', next: 'c1_class', effects: { affection: { teacher: 1 } } },
      { text: '「老師，剛才走廊有奇怪的光……」', next: 'c1_ask_light', effects: { flags: { asked_light: true } } }
    ]
  },
  c1_dismiss: {
    meet: ['teacher'],
    text: '「也許吧。」浩然聳肩，表情卻不自然。\n\n蘇老師在門口迎接你：「你就是{player}？我是蘇晴。歡迎。」她的目光在你身上停留了一秒。',
    choices: [
      { text: '禮貌問好', next: 'c1_class', effects: { affection: { teacher: 1 } } },
      { text: '「老師看起來很年輕。」', next: 'c1_class', effects: { affection: { teacher: 2 } } }
    ]
  },
  c1_silent: {
    meet: ['teacher'],
    text: '你把銀光記在心裡。浩然沒再追問。\n\n蘇老師溫柔地笑：「{player}對吧？有什麼不習慣隨時來找我。」',
    choices: [{ text: '「謝謝老師。」', next: 'c1_class', effects: { affection: { teacher: 1 } } }]
  },
  c1_ask_light: {
    text: '蘇老師眼神微動，隨即平靜。\n\n「可能是窗戶反射。先去座位坐好。」\n\n你總覺得她知道些什麼。',
    choices: [{ text: '點頭走進教室', next: 'c1_class', effects: { flags: { suspicious: true } } }]
  },
  c1_class: {
    meet: ['xiaoyue'],
    text: '蘇老師介紹完你後，讓你坐在靠窗空位。\n\n鄰座是安靜的黑髮女生，正低頭看一本不像教科書的書。\n\n「那是林曉月。」浩然小聲說，「不太跟人說話，但成績很好。」\n\n她抬起頭，淡灰色的眼睛看著你。\n\n「……你好。」',
    choices: [
      { text: '「你好，我是{player}。請多指教。」', next: 'c1_morning', effects: { affection: { xiaoyue: 1 } } },
      { text: '「你在看什麼書？」', next: 'c1_book', effects: { affection: { xiaoyue: 2 } } },
      { text: '（保持沉默）', next: 'c1_morning' }
    ]
  },
  c1_book: {
    text: '曉月把書側過一點。封面燙銀字寫著《星辰記事・殘卷》。\n\n「……只是閒書。你有興趣？」',
    choices: [
      { text: '「可以借我看看嗎？」', next: 'c1_morning', effects: { affection: { xiaoyue: 2 }, flags: { interested_book: true } } },
      { text: '「看起來很特別。」', next: 'c1_morning', effects: { affection: { xiaoyue: 1 } } },
      { text: '「抱歉，隨口問問。」', next: 'c1_morning' }
    ]
  },
  c1_morning: {
    text: '上午課程結束。浩然轉過身：「中午一起去食堂？我請。」\n\n曉月還坐在原位，正把書收進書包。',
    choices: [
      { text: '跟浩然去食堂', next: 'c1_lunch_h', effects: { affection: { haoran: 1 } } },
      { text: '留在教室找曉月', next: 'c1_lunch_x', effects: { affection: { xiaoyue: 1 } } },
      { text: '一個人去校園走走', next: 'c1_lunch_a', effects: { flags: { explore: true } } }
    ]
  },
  c1_lunch_h: {
    text: '食堂很熱鬧。浩然壓低聲音：「你早上有看到那道光吧？這學校有些『傳統』。晚上社團大樓偶爾會傳出不是人的聲音。」\n\n他笑了笑又收起表情：「算了，可能我聽太多鬼故事。」',
    choices: [
      { text: '「你在嚇我？」', next: 'c1_afternoon', effects: { affection: { haoran: 1 } } },
      { text: '「社團大樓在哪？我想去看。」', next: 'c1_afternoon', effects: { affection: { haoran: 2 }, flags: { curious: true } } },
      { text: '「我會小心。」', next: 'c1_afternoon' }
    ]
  },
  c1_lunch_x: {
    text: '「不去吃飯嗎？」你問。\n\n「……不餓。你不跟浩然去？」\n\n「想先跟鄰座打招呼。」\n\n曉月看了你幾秒，把書推過來：「既然有興趣，可以看。但別問從哪來的。」',
    choices: [
      { text: '道謝接過書', next: 'c1_afternoon', effects: { affection: { xiaoyue: 3 }, flags: { got_book: true } } },
      { text: '「為什麼不能問？」', next: 'c1_afternoon', effects: { affection: { xiaoyue: 1 }, flags: { got_book: true } } }
    ]
  },
  c1_lunch_a: {
    text: '教學樓後方有座舊建築，掛著「社團活動中心」牌子，鐵門上鎖。\n\n門縫再次閃過銀光，你聽到極輕的耳語——聽不懂的語言。空氣忽然變冷。',
    choices: [
      { text: '靠近仔細聽', next: 'c1_afternoon', effects: { flags: { heard_whisper: true, curious: true } } },
      { text: '立刻離開', next: 'c1_afternoon', effects: { flags: { avoided: true } } }
    ]
  },
  c1_afternoon: {
    text: '下課後蘇老師把你叫到辦公室，拿出一枚銀質星辰徽章。\n\n「這是『守護徽章』，每個新生都會發。戴著它，晚上在校園會比較……安心。」',
    choices: [
      { text: '接過並道謝', next: 'c1_evening', effects: { affection: { teacher: 1 }, flags: { has_badge: true } } },
      { text: '「這學校有秘密嗎？」', next: 'c1_secret', effects: { flags: { has_badge: true, asked_secret: true } } }
    ]
  },
  c1_secret: {
    text: '蘇老師靜靜看著你。\n\n「有些事知道得太早不好。但既然問了——戴著它。如果晚上看到不該看的東西，記得不要追。」\n\n她不再多說。',
    choices: [{ text: '離開辦公室', next: 'c1_evening' }]
  },
  c1_evening: {
    text: '放學鐘響。你站在走廊窗邊，看著暮色中的社團大樓。\n\n浩然朝你揮手：「一起走嗎？」\n\n曉月默默收拾東西，似乎要去圖書館。\n\n社團大樓的方向格外安靜。',
    choices: [
      { text: '跟浩然回家', next: 'c1_end_normal', effects: { affection: { haoran: 2 } } },
      { text: '去圖書館找曉月', next: 'c1_library' },
      { text: '一個人去社團大樓', next: 'c1_building', effects: { flags: { went: true } } }
    ]
  },
  c1_library: {
    text: '曉月坐在窗邊。看到你，她點點頭。\n\n「你果然來了。」她推來一張摺紙，「今晚子時，舊社團大樓後門。想知道秘密就來。一個人。」\n\n說完她起身離開。',
    choices: [
      { text: '決定晚上前往', next: 'c1_night', effects: { affection: { xiaoyue: 3 }, flags: { accepted: true } } },
      { text: '覺得太危險，回家', next: 'c1_end_safe', effects: { affection: { xiaoyue: -1 } } }
    ]
  },
  c1_building: {
    text: '後門鎖鬆動，像有人故意留縫。推門進去，空氣混著舊紙與臭氧味。地板上有褪色法陣痕跡。\n\n徽章突然滾燙。',
    choices: [
      { text: '繼續探索', next: 'c1_night' },
      { text: '覺得不對勁，離開', next: 'c1_end_safe' }
    ]
  },
  c1_night: {
    meet: ['xiaoyue', 'haoran', 'teacher'],
    text: '夜色中，你走進大廳。林曉月站在銀光法陣前。\n\n「你來了。」她轉過身，眼睛在黑暗中微微發亮。\n\n「歡迎來到星辰高中真正的一面，{player}。」\n\n光芒加劇，溫暖卻強大的力量包裹住你。',
    choices: [
      { text: '「這到底是怎麼回事？」', next: 'c1_truth' },
      { text: '「我準備好了。」', next: 'c1_truth', effects: { affection: { xiaoyue: 2 } } }
    ]
  },
  c1_truth: {
    text: '「這所學校建在『裂隙』上。」曉月平靜地說，「現實與其他世界的邊界在此薄弱。會有『存在』試圖滲透。\n\n學生會、部分老師、像我這樣的人……都是守門人。而你——徽章有反應了，代表你也有資格。」\n\n浩然跑進來：「我就知道你會來！」\n\n蘇老師出現在門口：「歡迎加入。真正的校園生活，從現在開始。」',
    choices: [
      { text: '接受，成為守門人', next: 'c1_end_join', effects: { affection: { xiaoyue: 2, haoran: 2, teacher: 1 }, flags: { joined: true } } },
      { text: '「我需要時間考慮。」', next: 'c1_end_hesitate' },
      { text: '「為什麼是我？」', next: 'c1_why' }
    ]
  },
  c1_why: {
    text: '蘇老師：「因為徽章選擇了你。它只對有感應體質的人反應。你今天看到的光、聽到的聲音，都是證明。」\n\n曉月：「而且你沒有像其他人一樣選擇視而不見。」\n\n浩然：「這不是強迫。但至少聽聽我們怎麼說。」',
    choices: [
      { text: '願意聽聽看', next: 'c1_end_join', effects: { affection: { xiaoyue: 1, haoran: 1, teacher: 1 }, flags: { joined: true } } },
      { text: '還是需要時間', next: 'c1_end_hesitate' }
    ]
  },
  c1_end_normal: {
    text: '你跟浩然走在回家路上。夜風吹過，你隱約覺得錯過了什麼。\n\n「明天見！」他在路口揮手。\n\n徽章在口袋裡微微發燙。\n\n——第一章・普通結局——\n\n（完成第一章後可解鎖第二章。嘗試不同選擇可看見更多分支。）',
    end: true
  },
  c1_end_safe: {
    text: '你選擇了安全的回家路。\n\n躺在床上回想銀光、耳語、曉月的眼神。\n\n手機震動，匿名訊息：「你拒絕了邀請。但裂隙不會消失。下次滿月再談。」\n\n——第一章・安全結局——',
    end: true
  },
  c1_end_join: {
    text: '你點頭。法陣光芒收斂，星屑流入徽章。你感覺有什麼在體內甦醒。\n\n「從今天起你是同伴了。」曉月難得微笑。\n\n浩然拍你肩膀：「明天教你基礎防護咒。」\n\n蘇老師：「好好休息。真正的挑戰才正要開始。」\n\n——第一章・覺醒結局——\n\n（恭喜完成主線！已解鎖第二章。）',
    end: true
  },
  c1_end_hesitate: {
    text: '「沒關係。」曉月點頭，「徽章先留著。準備好了它會指引你回來。」\n\n浩然：「我們不急。」\n\n你離開時，門後的光已熄滅。但有些事一旦知道，就再也無法當沒發生。\n\n——第一章・猶豫結局——',
    end: true
  }
};

// ==================== 第二章 ====================
const CHAPTER2 = {
  c2_intro: {
    meet: ['haoran', 'xiaoyue', 'teacher'],
    text: '成為守門人已過一週。\n\n白天校園如常，夜晚卻是另一個世界。\n\n中午浩然找你，表情凝重：「下午社團大樓集合。蘇老師有事。」\n\n曉月點頭：「……這次不是練習。」',
    choices: [
      { text: '「發生什麼事？」', next: 'c2_meet', effects: { affection: { haoran: 1 } } },
      { text: '點頭表示明白', next: 'c2_meet' },
      { text: '「又是裂隙的事？」', next: 'c2_meet', effects: { affection: { xiaoyue: 1 } } }
    ]
  },
  c2_meet: {
    text: '蘇老師站在法陣中央：「三天前，二年級張聿開始異常。先是惡夢、幻聽，昨天開始能看到我們看不到的東西。」\n\n浩然：「已經到顯影階段？」\n\n「對。不盡快處理，影會徹底侵蝕他的意識。」她看向你，「{player}，這是你的第一場實戰。準備好了嗎？」',
    choices: [
      { text: '「準備好了。」', next: 'c2_brief', effects: { affection: { teacher: 1, haoran: 1 } } },
      { text: '「能再多說細節嗎？」', next: 'c2_detail', effects: { affection: { teacher: 1 } } },
      { text: '「有點緊張，但會盡力。」', next: 'c2_brief', effects: { affection: { xiaoyue: 1 } } }
    ]
  },
  c2_detail: {
    text: '「影偏好情緒缺口。張聿最近因家庭問題情緒不穩，成了目標。它們先以惡夢接近，再取代意志。」\n\n曉月：「一旦完全取代，人就只剩空殼。」\n\n「今晚子時淨化儀式。你的徽章是關鍵。」',
    choices: [{ text: '「明白，我會配合。」', next: 'c2_visit' }]
  },
  c2_brief: {
    text: '流程簡單說明後，蘇老師希望你先去見張聿，確認附著程度。\n\n浩然：「我們一起去。」',
    choices: [
      { text: '與大家一起去', next: 'c2_visit' },
      { text: '「我想先一個人跟他聊。」', next: 'c2_alone', effects: { flags: { alone: true } } }
    ]
  },
  c2_visit: {
    text: '保健室。張聿躺在床上，雙眼空洞。\n\n你走近，他視線轉向你，嘴角抽動：「……別……信……他們……」\n\n浩然臉色一變：「影已經開始說話了。」',
    choices: [
      { text: '握住他的手安撫', next: 'c2_touch', effects: { flags: { touched: true } } },
      { text: '後退觀察徽章', next: 'c2_observe' },
      { text: '「你還記得自己是誰嗎？」', next: 'c2_name' }
    ]
  },
  c2_alone: {
    text: '你請他們在門外等。張聿看見你，眼神閃過清明又被黑暗吞沒。\n\n「……你也是守門人？他們騙你……裂隙不是封印……是餵養……」\n\n徽章瞬間冰冷。',
    choices: [
      { text: '「再說清楚一點。」', next: 'c2_shadow', effects: { flags: { heard_shadow: true } } },
      { text: '立刻叫外面的人進來', next: 'c2_touch' }
    ]
  },
  c2_shadow: {
    text: '「守門人守護的是裂隙，還是被裂隙守護？你們每解決一次，它就更強一點……」\n\n話沒說完他劇烈顫抖，陷入昏迷。\n\n浩然推門進來：「徽章反應很強。怎麼了？」',
    choices: [
      { text: '把聽到的告訴大家', next: 'c2_share', effects: { flags: { shared: true } } },
      { text: '先隱瞞，等儀式後再想', next: 'c2_prep', effects: { flags: { secret: true } } }
    ]
  },
  c2_touch: {
    text: '握住他的手，冰冷從掌心竄上。眼前閃過破碎畫面——黑暗走廊、無數眼睛、低沉聲音說「再靠近一點」。\n\n徽章燙得幾乎灼傷。你抽回手。\n\n曉月扶住你：「你看到了什麼？」',
    choices: [
      { text: '「看到了影的一部分……」', next: 'c2_prep', effects: { affection: { xiaoyue: 1 }, flags: { vision: true } } },
      { text: '「只是有點冷，沒事。」', next: 'c2_prep' }
    ]
  },
  c2_observe: {
    text: '徽章先變冷，再以不規律節奏震動。\n\n蘇老師：「附著程度比預期深。今晚必須一次成功。」',
    choices: [{ text: '準備參與儀式', next: 'c2_prep' }]
  },
  c2_name: {
    text: '「張……聿……」他艱難吐出名字，又陷入混亂。\n\n浩然：「還有自我意識殘留，是好現象。但時間不多。」',
    choices: [{ text: '準備儀式', next: 'c2_prep' }]
  },
  c2_share: {
    text: '你把影的話告訴大家。\n\n蘇老師：「影最擅長離間，用半真半假動搖你。」\n\n曉月看著你：「……但你覺得呢？」\n\n浩然：「先救人。其他事儀式結束再討論。」',
    choices: [
      { text: '「好，先救人。」', next: 'c2_prep', effects: { affection: { haoran: 1 } } },
      { text: '「我會記住這句話。」', next: 'c2_prep', effects: { affection: { xiaoyue: 1 }, flags: { doubt: true } } }
    ]
  },
  c2_prep: {
    text: '夜晚。法陣銀藍線條發光。張聿在陣中央。\n\n蘇老師北方、曉月東方、浩然西方、你南方——徽章主位。\n\n「儀式開始後影會全力反撲。無論看到什麼都不要離開位置。你的徽章是錨點。」',
    choices: [
      { text: '深呼吸，握住徽章', next: 'c2_ritual' },
      { text: '看向曉月確認', next: 'c2_ritual', effects: { affection: { xiaoyue: 1 } } },
      { text: '看向浩然點頭', next: 'c2_ritual', effects: { affection: { haoran: 1 } } }
    ]
  },
  c2_ritual: {
    text: '法陣亮起。張聿身體弓起，黑色煙霧湧出凝聚成人形。\n\n「守門人……又來了……你們以為在守護，其實只是在延續它的生命。」\n\n徽章劇烈震動。',
    choices: [
      { text: '集中精神穩定力量', next: 'c2_focus' },
      { text: '大聲回覆：「我們是來救他的！」', next: 'c2_shout', effects: { flags: { shouted: true } } }
    ]
  },
  c2_focus: {
    text: '你閉上眼，力量從掌心流入法陣。影發出嘶吼，黑煙被銀光撕碎。\n\n極輕的聲音——是張聿本人：「……謝謝……」',
    choices: [{ text: '繼續灌注力量', next: 'c2_climax' }]
  },
  c2_shout: {
    text: '你的聲音讓影頓了一下。「救人？可笑……」但這一瞬遲疑讓銀光大盛。\n\n張聿身體漸漸平穩。',
    choices: [{ text: '抓住機會全力輸出', next: 'c2_climax' }]
  },
  c2_climax: {
    text: '光芒達到頂點。影發出最後咆哮，化作碎屑消散。張聿呼吸平穩，臉色恢復。\n\n蘇老師：「成功了。」\n\n浩然檢查他：「意識回來了，只是太累。」\n\n曉月：「你還好嗎？」',
    choices: [
      { text: '「沒事，只是有點累。」', next: 'c2_after' },
      { text: '「剛才影說的那些話……」', next: 'c2_doubt', effects: { flags: { asked: true } } }
    ]
  },
  c2_after: {
    text: '蘇老師拍你肩膀：「第一場實戰表現很好。休息吧。」\n\n浩然比讚：「不愧是我看好的人。」\n\n曉月輕聲：「……你做得很好。」',
    choices: [{ text: '回家休息', next: 'c2_end_ok' }]
  },
  c2_doubt: {
    text: '蘇老師凝重：「影用任何手段動搖你。裂隙確實有消耗與再生的循環，但我們守護是為了防止它失控擴散到城市。」\n\n曉月：「有些真相知道太早會成為負擔。等你更強，我會告訴你更多。」\n\n浩然：「不管怎樣，今晚我們救了一個人。」',
    choices: [
      { text: '接受，先休息', next: 'c2_end_ok' },
      { text: '心裡記下，日後再追問', next: 'c2_end_doubt', effects: { flags: { will_investigate: true } } }
    ]
  },
  c2_end_ok: {
    text: '回家路上，徽章溫度恢復正常。\n\n曉月訊息：「下次練習我教你更進階的感知。晚安。」\n\n浩然：「明天食堂見！我請你慶祝。」\n\n你抬頭看繁星。\n\n——第二章・成功結局——\n\n（已解鎖第三章。）',
    end: true
  },
  c2_end_doubt: {
    text: '影的話仍在腦中迴盪。\n\n蘇老師的解釋合情合理，但你覺得真相可能更複雜。\n\n手機震動，匿名訊息：「你開始懷疑了。很好。準備好聽到真正故事時再來找我。——一位舊守門人」\n\n——第二章・疑惑結局——\n\n（已解鎖第三章。你的懷疑將影響後續。）',
    end: true
  }
};

// ==================== 第三章 ====================
const CHAPTER3 = {
  c3_intro: {
    meet: ['haoran', 'xiaoyue', 'teacher'],
    text: '第二章事件過後兩週。校園表面平靜，但你感覺到空氣中多了一絲緊繃。\n\n這天放學後，曉月單獨找到你。\n\n「有人要見你。」她把一張地址塞進你手裡，「舊城區的廢棄天文台。今晚。只有你。」\n\n「蘇老師知道嗎？」\n\n「……不知道。這次我也不確定該不該讓你去。」',
    choices: [
      { text: '「我去。」', next: 'c3_go', effects: { affection: { xiaoyue: 1 }, flags: { went_alone: true } } },
      { text: '「先告訴浩然和蘇老師。」', next: 'c3_tell', effects: { affection: { haoran: 1, teacher: 1 } } },
      { text: '「你為什麼給我這個？」', next: 'c3_ask_x' }
    ]
  },
  c3_ask_x: {
    text: '曉月沉默片刻：「因為影說的話，我也開始懷疑了。那位舊守門人……可能知道真相。」\n\n她看著你：「但危險。你決定。」',
    choices: [
      { text: '還是去', next: 'c3_go', effects: { affection: { xiaoyue: 2 } } },
      { text: '先跟大家商量', next: 'c3_tell' }
    ]
  },
  c3_tell: {
    text: '你把地址拿給蘇老師和浩然看。\n\n蘇老師臉色瞬間凝重：「那個人……我以為他已經離開很久了。」\n\n浩然：「舊守門人？我聽過傳聞，說他因為意見不合被趕出圈子。」\n\n蘇老師：「今晚我們一起去。不能讓你單獨赴約。」',
    choices: [{ text: '點頭同意', next: 'c3_observatory', effects: { flags: { with_team: true } } }]
  },
  c3_go: {
    text: '你獨自來到廢棄天文台。門半掩，裡面有微弱燈光。\n\n一個穿舊風衣的中年男人坐在觀測台上，背對著你。\n\n「來了啊，新的守門人。」他轉過身，臉上有道疤，「我是顧衡。曾經的『首席』。」',
    choices: [
      { text: '「你想告訴我什麼？」', next: 'c3_truth' },
      { text: '保持警惕，先聽他說', next: 'c3_truth' }
    ]
  },
  c3_observatory: {
    text: '你們一起到達天文台。顧衡看到蘇老師，冷笑一聲。\n\n「蘇晴。還是那麼喜歡把年輕人護在身後。」\n\n蘇老師：「顧衡。你不該再回來。」\n\n「我回來是因為裂隙又開始『進食』了。你們每次淨化，都在餵它。」',
    choices: [{ text: '聽他繼續說', next: 'c3_truth' }]
  },
  c3_truth: {
    text: '顧衡點燃一根菸：「裂隙不是漏洞，是『契約』。幾十年前，為了讓這座城市免於更大的災難，有人與另一側達成協議——定期提供『情緒與生命力』作為養分，換取暫時的平靜。\n\n守門人的工作，表面上是阻止侵蝕，實際上是……收割與餵養的執行者。」\n\n蘇老師握緊拳頭：「那是被扭曲的說法。」\n\n「是嗎？那為什麼每次成功淨化後，裂隙的波動反而更穩定、更大？」',
    choices: [
      { text: '「蘇老師，這是真的嗎？」', next: 'c3_confront' },
      { text: '「你有證據嗎？」', next: 'c3_proof' },
      { text: '「那我們該怎麼辦？」', next: 'c3_what_now' }
    ]
  },
  c3_confront: {
    text: '蘇老師閉眼片刻：「協議確實存在。但不是『餵養』那麼單純。如果不維持平衡，另一側的存在會大舉入侵，整座城市都會淪陷。\n\n我們能做的，是把傷害降到最低。」\n\n曉月聲音很輕：「……所以張聿那樣的人，是必要的代價？」\n\n蘇老師沒有回答。',
    choices: [
      { text: '「我需要時間消化。」', next: 'c3_choice' },
      { text: '「有沒有其他辦法？」', next: 'c3_what_now' }
    ]
  },
  c3_proof: {
    text: '顧衡丟出一本舊筆記本：「自己看。裡面有歷任首席的記錄。每次『成功』後，裂隙的規模都在緩慢擴大。蘇晴她……選擇相信這是唯一的路。」\n\n蘇老師：「因為其他路都失敗過。顧衡，你當年的激進手段害死了三個人。」\n\n「至少我沒有假裝那是『守護』。」',
    choices: [
      { text: '接過筆記本', next: 'c3_choice', effects: { flags: { has_notes: true } } },
      { text: '「雙方都先冷靜。」', next: 'c3_choice' }
    ]
  },
  c3_what_now: {
    text: '顧衡：「有另一條路。徹底關閉裂隙。但代價是——過去所有被『餵養』出去的力量會反噬，守門人可能會全部失去感應，甚至更糟。\n\n或者，繼續現在的路，用少數人的痛苦換取大多數人的安全。」\n\n他看著你：「新血，你選哪邊？」',
    choices: [{ text: '「我還沒辦法立刻回答。」', next: 'c3_choice' }]
  },
  c3_choice: {
    text: '夜風灌進破窗。\n\n蘇老師：「無論你聽到什麼，今晚先回去。我們明天再談。」\n\n顧衡：「記住所聽到的。下次裂隙大波動時，你會需要做真正的決定。」\n\n曉月走到你身邊，低聲：「……不管你選哪邊，我都會陪你想清楚。」\n\n浩然則握緊拳頭，沒說話。',
    choices: [
      { text: '先相信蘇老師，維持現狀', next: 'c3_end_order', effects: { affection: { teacher: 2, haoran: 1 } } },
      { text: '開始認真考慮顧衡的說法', next: 'c3_end_rebel', effects: { affection: { xiaoyue: 2 }, flags: { lean_rebel: true } } },
      { text: '兩邊都不完全相信，自己調查', next: 'c3_end_neutral', effects: { affection: { xiaoyue: 1, haoran: 1 }, flags: { independent_path: true } } }
    ]
  },
  c3_end_order: {
    text: '你選擇站在蘇老師這邊。\n\n回去的路上，她輕聲說：「謝謝你願意相信。這條路很難走，但我們不是一個人。」\n\n徽章溫熱，像是在回應。\n\n——第三章・秩序結局——\n\n（你選擇維持現有的守護體系。已解鎖最終章。）',
    end: true
  },
  c3_end_rebel: {
    text: '你沒有立刻表態，但眼神告訴曉月你開始動搖。\n\n她輕輕點頭：「那就一起找出真正的答案。」\n\n顧衡的身影消失在夜色中，只留下一句：「下次見，新守門人。」\n\n——第三章・叛逆結局——\n\n（你開始質疑體制。已解鎖最終章。）',
    end: true
  },
  c3_end_neutral: {
    text: '你決定兩邊的話都只聽一半。\n\n真正的真相，必須自己去確認。\n\n徽章在掌心忽冷忽熱，像是對你的決定感到困惑——或期待。\n\n——第三章・中立結局——\n\n（你選擇獨立調查。已解鎖最終章。）',
    end: true
  }
};

// ==================== 第四章（終章） ====================
const CHAPTER4 = {
  c4_intro: {
    meet: ['haoran', 'xiaoyue', 'teacher'],
    text: '滿月之夜。\n\n裂隙的波動比任何一次都強烈。整座星辰高中的守護徽章同時發熱，警報在守門人內部響起。\n\n蘇老師緊急召集所有人：「這次不是普通的侵蝕。有什麼東西正在從另一側強行擠過來。」\n\n浩然握緊拳頭：「我們該怎麼辦？」\n\n曉月看向你：「……你的決定，會影響所有人。」',
    choices: [
      { text: '「先穩定法陣，阻止它過來。」', next: 'c4_defend' },
      { text: '「這次會不會是關閉裂隙的機會？」', next: 'c4_close' },
      { text: '「我想先確認顧衡的下落。」', next: 'c4_find_gu' }
    ]
  },
  c4_defend: {
    text: '蘇老師點頭：「按原計畫。所有人到社團大樓主法陣。」\n\n夜風中，法陣的光芒比以往更亮，也更不穩定。黑色的霧氣開始從裂縫中滲出。\n\n「撐住！」蘇老師大喊。',
    choices: [
      { text: '全力注入徽章力量', next: 'c4_climax_order' },
      { text: '同時觀察裂隙的反應', next: 'c4_observe_rift', effects: { flags: { observed: true } } }
    ]
  },
  c4_close: {
    text: '蘇老師臉色一變：「關閉裂隙的代價你清楚嗎？」\n\n曉月：「如果顧衡說的是真的……這可能是唯一的機會。」\n\n浩然：「不管選哪邊，我都跟你一起。」',
    choices: [
      { text: '堅持嘗試關閉', next: 'c4_climax_close', effects: { flags: { try_close: true } } },
      { text: '還是先防守，再尋找其他方法', next: 'c4_defend' }
    ]
  },
  c4_find_gu: {
    text: '你在混亂中找到顧衡。他站在天文台遺址，看著遠方的學校。\n\n「來了。我知道你會來。」他轉身，「今晚是窗口。要關閉，就現在。」\n\n他伸出手：「需要你的徽章作為最後的鑰匙。」',
    choices: [
      { text: '把徽章交給他', next: 'c4_climax_close', effects: { flags: { gave_badge: true } } },
      { text: '「我自己來。」', next: 'c4_climax_close' },
      { text: '拒絕，回到蘇老師身邊', next: 'c4_defend' }
    ]
  },
  c4_observe_rift: {
    text: '你在支撐法陣的同時仔細感受。\n\n裂隙的「飢餓」確實存在，但更深層的地方，似乎有什麼在抗拒被餵養——像是被困住的東西在求救。\n\n曉月也察覺到了：「……裡面有意識？」',
    choices: [
      { text: '嘗試與裡面的意識溝通', next: 'c4_communicate' },
      { text: '還是先優先封印', next: 'c4_climax_order' }
    ]
  },
  c4_communicate: {
    text: '你把意識沿著徽章延伸進去。\n\n混亂的畫面中，一個模糊的身影傳遞過來：\n\n「不是契約……是監獄……放我出去……或徹底摧毀……不要繼續餵……」\n\n力量反噬讓你跪倒。曉月扶住你。\n\n「你聽到了什麼？」',
    choices: [
      { text: '把真相告訴所有人', next: 'c4_reveal' },
      { text: '先不說，自己做決定', next: 'c4_climax_close' }
    ]
  },
  c4_reveal: {
    text: '你把聽到的告訴蘇老師、浩然、曉月。\n\n蘇老師沉默很久：「如果那是真的……我們一直以來做的事……」\n\n浩然：「那現在該怎麼辦？」\n\n曉月看著你：「你是唯一真正接觸到那意識的人。你決定。」',
    choices: [
      { text: '徹底關閉裂隙（高風險）', next: 'c4_end_close' },
      { text: '繼續封印，維持現狀', next: 'c4_end_seal' },
      { text: '嘗試解放裡面的存在', next: 'c4_end_free' }
    ]
  },
  c4_climax_order: {
    text: '你與大家一起把全部力量灌入法陣。\n\n黑色霧氣被強行壓回裂隙。光芒大盛後逐漸平息。\n\n蘇老師癱坐在地：「……暫時壓下去了。」\n\n但你知道，這只是又一次的延遲。',
    choices: [{ text: '看著平靜下來的校園', next: 'c4_end_seal' }]
  },
  c4_climax_close: {
    text: '你將徽章的力量與顧衡（或自己）的意志結合，直搗裂隙核心。\n\n劇痛傳來。周圍的人發出驚呼。\n\n裂隙發出尖銳的悲鳴，開始收縮——同時，一股巨大的反噬力量席捲所有守門人。\n\n你聽到蘇老師的聲音：「堅持住——！」',
    choices: [{ text: '承受一切，完成關閉', next: 'c4_end_close' }]
  },
  c4_end_seal: {
    text: '裂隙再次被封印。校園恢復平靜。\n\n蘇老師看著你：「謝謝你今晚的努力。我們會繼續守護下去。」\n\n浩然笑了笑，雖然有些疲憊：「至少大家還在。」\n\n曉月站在你身邊，沒說話，只是輕輕握了一下你的手。\n\n你知道，問題只是被推遲了。但至少，今晚的星空依然明亮。\n\n——最終章・封印結局——\n\n（你選擇了延續守護。故事暫時告一段落。感謝遊玩完整系列。）',
    end: true
  },
  c4_end_close: {
    text: '裂隙在巨大的光芒中徹底閉合。\n\n反噬讓所有守門人短暫失去意識。當你醒來時，徽章已經黯淡無光——感應能力消失了。\n\n蘇老師坐在一旁，聲音沙啞：「……結束了。」\n\n浩然看著自己空空的手：「以後……就只是普通的高中生了？」\n\n曉月看著你，眼中有複雜的情緒：「你做到了。無論代價如何。」\n\n星辰高中的夜晚，第一次真正安靜下來。\n\n——最終章・閉合結局——\n\n（裂隙被永久關閉。守門人的時代結束。感謝遊玩完整系列。）',
    end: true
  },
  c4_end_free: {
    text: '你選擇解放。\n\n裂隙中的意識湧出，化作一道溫和卻強大的光，籠罩整個校園。它沒有攻擊任何人，只是靜靜地看了你一眼，然後消散在夜空中。\n\n蘇老師：「……它走了。」\n\n浩然：「就這樣？沒有災難？」\n\n曉月：「或許……真正的契約，從一開始就被誤解了。」\n\n徽章恢復了平靜的溫度。你感覺到，有什麼古老的東西終於獲得了自由。\n\n——最終章・解放結局——\n\n（你選擇了相信並解放。新的平衡開始。感謝遊玩完整系列。）',
    end: true
  }
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  loadProgress();
  initEvents();
  updateContinueButton();
  updateTitleDisplay(state.currentStory);
  showScreen('title');
});
