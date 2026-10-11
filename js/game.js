/**
 * 校園奧秘 - 文字RPG 核心引擎
 * 可擴充劇情框架
 */

// ==================== 劇情包註冊 ====================
const STORY_PACKS = {
  chapter1: {
    id: 'chapter1',
    title: '第一章・轉學生的秘密',
    description: '你轉入星辰高中後，發現這個學校隱藏著不為人知的奇幻一面……',
    startScene: 'intro',
    npcs: {
      xiaoyue: { name: '林曉月', emoji: '🌙' },
      haoran: { name: '陳浩然', emoji: '⚡' },
      teacher: { name: '蘇老師', emoji: '📚' }
    }
  }
  // 之後新增劇情包只需在這裡註冊，並提供對應 JSON
};

// ==================== 隨機暱稱產生器 ====================
const NICKNAME_PREFIX = ['星', '月', '風', '影', '夜', '青', '白', '玄', '凌', '云', '靜', '冷', '暖', '小', '阿'];
const NICKNAME_SUFFIX = ['辰', '羽', '凜', '夜', '風', '影', '月', '白', '玄', '秋', '冬', '夏', '空', '光', '塵', '楓', '雪'];

function generateNickname() {
  const p = NICKNAME_PREFIX[Math.floor(Math.random() * NICKNAME_PREFIX.length)];
  const s = NICKNAME_SUFFIX[Math.floor(Math.random() * NICKNAME_SUFFIX.length)];
  return p + s;
}

// ==================== 遊戲狀態 ====================
let state = {
  playerName: '',
  currentStory: 'chapter1',
  currentScene: 'intro',
  affection: {},
  flags: {},
  history: [] // 避免循環用
};

let storyData = null; // 當前載入的劇情

// ==================== DOM ====================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screens = {
  title: $('#title-screen'),
  create: $('#create-screen'),
  game: $('#game-screen')
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function showToast(msg, duration = 2200) {
  const toast = $('#status-toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

// ==================== 存檔系統 ====================
const SAVE_KEY = 'campus_arcana_save';

function saveGame() {
  const data = {
    ...state,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  showToast('已存檔');
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    state = { ...state, ...data };
    return true;
  } catch {
    return false;
  }
}

function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// ==================== 劇情載入 ====================
async function loadStory(packId) {
  const pack = STORY_PACKS[packId];
  if (!pack) throw new Error('找不到劇情包');

  // 目前用內嵌方式，之後可改成 fetch(`data/stories/${packId}.json`)
  if (packId === 'chapter1') {
    storyData = CHAPTER1_STORY;
  } else {
    throw new Error('尚未實作此劇情包');
  }

  // 初始化好感度
  state.affection = {};
  for (const key of Object.keys(pack.npcs)) {
    state.affection[key] = 0;
  }

  state.currentStory = packId;
  state.currentScene = pack.startScene;
  state.flags = {};
  state.history = [];
}

// ==================== 渲染 ====================
function renderAffection() {
  const bar = $('#affection-bar');
  const pack = STORY_PACKS[state.currentStory];
  bar.innerHTML = '';

  for (const [key, npc] of Object.entries(pack.npcs)) {
    const val = state.affection[key] ?? 0;
    const el = document.createElement('div');
    el.className = 'affection-item';
    el.innerHTML = `<span>${npc.emoji}</span><span>${npc.name}</span><span class="heart">♥</span><span class="value">${val}</span>`;
    bar.appendChild(el);
  }
}

function renderScene() {
  const scene = storyData[state.currentScene];
  if (!scene) {
    $('#story-text').textContent = '【錯誤】找不到場景：' + state.currentScene;
    $('#choices').innerHTML = '';
    return;
  }

  // 替換玩家名稱
  let text = scene.text.replace(/\{player\}/g, state.playerName);

  // 依 flag 顯示額外文字
  if (scene.extra && scene.extra.length) {
    for (const ex of scene.extra) {
      if (ex.if && state.flags[ex.if]) {
        text += '\n\n' + ex.text.replace(/\{player\}/g, state.playerName);
      }
      if (ex.ifNot && !state.flags[ex.ifNot]) {
        text += '\n\n' + ex.text.replace(/\{player\}/g, state.playerName);
      }
    }
  }

  const textEl = $('#story-text');
  textEl.style.animation = 'none';
  textEl.offsetHeight; // reflow
  textEl.style.animation = '';
  textEl.textContent = text;

  // 選項
  const choicesEl = $('#choices');
  choicesEl.innerHTML = '';

  if (scene.choices && scene.choices.length) {
    scene.choices.forEach((choice, idx) => {
      // 條件檢查
      if (choice.requireFlag && !state.flags[choice.requireFlag]) return;
      if (choice.requireNotFlag && state.flags[choice.requireNotFlag]) return;
      if (choice.requireAffection) {
        const [npc, op, val] = choice.requireAffection;
        const current = state.affection[npc] ?? 0;
        if (op === '>=' && current < val) return;
        if (op === '<=' && current > val) return;
        if (op === '>' && current <= val) return;
        if (op === '<' && current >= val) return;
      }

      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice.text.replace(/\{player\}/g, state.playerName);
      btn.addEventListener('click', () => makeChoice(choice));
      choicesEl.appendChild(btn);
    });
  } else if (scene.end) {
    // 結局
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = '返回標題畫面';
    btn.addEventListener('click', () => {
      clearSave();
      showScreen('title');
      updateContinueButton();
    });
    choicesEl.appendChild(btn);
  }

  renderAffection();
  $('#display-name').textContent = state.playerName;
}

function makeChoice(choice) {
  // 效果
  if (choice.effects) {
    if (choice.effects.affection) {
      for (const [npc, delta] of Object.entries(choice.effects.affection)) {
        state.affection[npc] = (state.affection[npc] ?? 0) + delta;
        const pack = STORY_PACKS[state.currentStory];
        const name = pack.npcs[npc]?.name || npc;
        const sign = delta > 0 ? '+' : '';
        showToast(`${name} 好感度 ${sign}${delta}`);
      }
    }
    if (choice.effects.flags) {
      for (const [flag, val] of Object.entries(choice.effects.flags)) {
        state.flags[flag] = val;
      }
    }
  }

  // 防止循環：記錄歷史
  state.history.push(state.currentScene);
  if (state.history.length > 50) state.history.shift();

  // 下一個場景
  let next = choice.next;

  // 動態 next（依條件）
  if (choice.nextIf) {
    for (const cond of choice.nextIf) {
      if (cond.if && state.flags[cond.if]) {
        next = cond.next;
        break;
      }
      if (cond.ifNot && !state.flags[cond.ifNot]) {
        next = cond.next;
        break;
      }
      if (cond.affection) {
        const [npc, op, val] = cond.affection;
        const current = state.affection[npc] ?? 0;
        let ok = false;
        if (op === '>=' && current >= val) ok = true;
        if (op === '>' && current > val) ok = true;
        if (ok) {
          next = cond.next;
          break;
        }
      }
    }
  }

  state.currentScene = next;
  renderScene();
}

// ==================== 事件綁定 ====================
function initEvents() {
  // 標題
  $('#btn-new-game').addEventListener('click', () => {
    showScreen('create');
    $('#player-name').value = '';
    $('#btn-start').disabled = true;
  });

  $('#btn-continue').addEventListener('click', async () => {
    if (!loadGame()) {
      showToast('沒有存檔');
      return;
    }
    await loadStory(state.currentStory);
    // 恢復好感度等（loadGame 已還原）
    showScreen('game');
    renderScene();
  });

  $('#btn-select-story').addEventListener('click', () => {
    const list = $('#story-list');
    list.innerHTML = '';
    for (const pack of Object.values(STORY_PACKS)) {
      const div = document.createElement('div');
      div.className = 'story-item' + (state.currentStory === pack.id ? ' active' : '');
      div.innerHTML = `<h4>${pack.title}</h4><p>${pack.description}</p>`;
      div.addEventListener('click', () => {
        state.currentStory = pack.id;
        $$('.story-item').forEach(el => el.classList.remove('active'));
        div.classList.add('active');
      });
      list.appendChild(div);
    }
    $('#story-modal').classList.remove('hidden');
  });

  $('#btn-close-story').addEventListener('click', () => {
    $('#story-modal').classList.add('hidden');
  });

  // 角色建立
  $('#player-name').addEventListener('input', (e) => {
    $('#btn-start').disabled = e.target.value.trim().length === 0;
  });

  $('#btn-random-name').addEventListener('click', () => {
    const name = generateNickname();
    $('#player-name').value = name;
    $('#btn-start').disabled = false;
  });

  $('#btn-start').addEventListener('click', async () => {
    const name = $('#player-name').value.trim();
    if (!name) return;
    state.playerName = name;
    await loadStory(state.currentStory);
    showScreen('game');
    renderScene();
  });

  // 遊戲中
  $('#btn-save').addEventListener('click', saveGame);

  $('#btn-menu').addEventListener('click', () => {
    $('#menu-modal').classList.remove('hidden');
  });

  $('#btn-close-menu').addEventListener('click', () => {
    $('#menu-modal').classList.add('hidden');
  });

  $('#btn-load').addEventListener('click', async () => {
    if (!loadGame()) {
      showToast('沒有存檔');
      return;
    }
    await loadStory(state.currentStory);
    // 狀態已由 loadGame 還原
    $('#menu-modal').classList.add('hidden');
    renderScene();
    showToast('已讀取存檔');
  });

  $('#btn-restart').addEventListener('click', async () => {
    if (!confirm('確定要重新開始嗎？目前進度將會遺失（存檔仍保留）。')) return;
    await loadStory(state.currentStory);
    state.playerName = state.playerName; // 保留名字
    $('#menu-modal').classList.add('hidden');
    renderScene();
  });

  $('#btn-title').addEventListener('click', () => {
    $('#menu-modal').classList.add('hidden');
    showScreen('title');
    updateContinueButton();
  });
}

function updateContinueButton() {
  $('#btn-continue').disabled = !hasSave();
}

// ==================== 第一章劇情資料 ====================
const CHAPTER1_STORY = {
  intro: {
    text: '九月的早晨，陽光灑在星辰高中的校門口。\n\n你拖著行李箱，站在寫有「星辰高中」四個金色大字的大門前。作為一名轉學生，你對這所學校幾乎一無所知——只聽說這裡的升學率很高，校風也相當自由。\n\n「喂！那邊的轉學生！」\n\n一個充滿活力的聲音從身後傳來。',
    choices: [
      { text: '轉過身去看是誰在叫我', next: 'meet_haoran' },
      { text: '假裝沒聽到，繼續往前走', next: 'ignore_haoran' }
    ]
  },

  meet_haoran: {
    text: '你轉過身，看到一個戴著眼鏡、笑得陽光開朗的男生朝你揮手。\n\n「我是陳浩然，三年級，也是學生會的！」他快步走過來，主動接過你的行李箱。「轉學生對吧？我剛好被分配來帶你參觀校園。你叫什麼名字？」\n\n「我是{player}。」你回答。\n\n「{player}啊，好名字！」浩然笑了笑，「走吧，我先帶你去教務處報到。」',
    choices: [
      {
        text: '「謝謝你，麻煩了。」（禮貌回應）',
        next: 'to_office',
        effects: { affection: { haoran: 1 } }
      },
      {
        text: '「不用客氣，我自己可以。」（保持距離）',
        next: 'to_office',
        effects: { affection: { haoran: 0 }, flags: { independent: true } }
      },
      {
        text: '「學生會？聽起來很厲害。」（表現興趣）',
        next: 'to_office',
        effects: { affection: { haoran: 2 } }
      }
    ]
  },

  ignore_haoran: {
    text: '你沒有理會身後的叫聲，徑自往校門內走去。\n\n「等等！真的是轉學生對吧？」那人追了上來，擋在你面前。是個戴眼鏡的男生，看起來有點氣喘吁吁。\n\n「我是陳浩然，學生會的。被派來帶轉學生的……你跑得好快。」他苦笑著伸出手，「能告訴我你的名字嗎？」\n\n你只好停下腳步：「{player}。」',
    choices: [
      {
        text: '「抱歉，我沒注意到。」',
        next: 'to_office',
        effects: { affection: { haoran: 0 } }
      },
      {
        text: '「下次別突然大喊比較好。」',
        next: 'to_office',
        effects: { affection: { haoran: -1 }, flags: { cold_start: true } }
      }
    ]
  },

  to_office: {
    text: '在浩然的帶領下，你順利完成了報到手續，領到了制服、課表與教室鑰匙。\n\n「你的教室在三年二班，就在教學樓三樓。」浩然指著前方的建築，「對了，今天第一節是導師時間，蘇老師人很好，你不用太緊張。」\n\n正當你們走向教學樓時，走廊轉角突然閃過一道銀白色的光。\n\n「咦？」浩然愣了一下，「你有看到嗎？」',
    choices: [
      { text: '「有……那是什麼？」', next: 'see_light' },
      { text: '「可能是光線反射吧。」', next: 'dismiss_light' },
      { text: '（默默記在心裡，沒有出聲）', next: 'silent_light', effects: { flags: { observant: true } } }
    ]
  },

  see_light: {
    text: '「我也看到了……」浩然皺起眉頭，壓低聲音，「這學校有些地方……比較特別。不過現在先別多想，遲到可不好。」\n\n他加快腳步，帶你上了三樓。\n\n教室門口，一位穿著素雅白衬衫的女老師正站在那裡。她看起來大約三十歲出頭，眼神溫和卻透著一股說不出的深邃。\n\n「你就是新來的{player}吧？」她微笑著說，「我是蘇晴，你們的導師。歡迎加入三年二班。」',
    choices: [
      {
        text: '「蘇老師好，請多指教。」',
        next: 'class_intro',
        effects: { affection: { teacher: 1 } }
      },
      {
        text: '「老師，剛才走廊有奇怪的光……」',
        next: 'ask_teacher_light',
        effects: { affection: { teacher: 0 }, flags: { asked_light: true } }
      }
    ]
  },

  dismiss_light: {
    text: '「也許吧。」浩然耸耸肩，但你注意到他的表情有些不自然。\n\n到達教室後，一位氣質出眾的女老師迎接了你。\n\n「你就是{player}？我是蘇晴，導師。歡迎。」她的目光在你身上停留了一秒，似乎在觀察什麼。',
    choices: [
      {
        text: '禮貌地向老師問好',
        next: 'class_intro',
        effects: { affection: { teacher: 1 } }
      },
      {
        text: '「老師看起來很年輕呢。」',
        next: 'class_intro',
        effects: { affection: { teacher: 2 } }
      }
    ]
  },

  silent_light: {
    text: '你沒有說話，只是把那道銀光牢牢記在心裡。\n\n浩然似乎也沒再追問，帶你來到教室。蘇老師站在門口，溫柔地笑著歡迎你。\n\n「{player}，對吧？我是蘇晴。有什麼不習慣的地方，隨時可以來找我。」',
    choices: [
      {
        text: '「謝謝老師。」',
        next: 'class_intro',
        effects: { affection: { teacher: 1 } }
      }
    ]
  },

  ask_teacher_light: {
    text: '蘇老師的眼神微微一動，隨即恢復平靜。\n\n「走廊的光？可能是窗戶反射吧。」她輕描淡寫地說，「先去座位坐好，等等介紹給同學們認識。」\n\n你總覺得她知道些什麼。',
    choices: [
      {
        text: '點點頭，走進教室',
        next: 'class_intro',
        effects: { flags: { suspicious_teacher: true } }
      }
    ]
  },

  class_intro: {
    text: '教室裡大約有三十位同學。蘇老師簡單介紹了你之後，便讓你坐在靠窗的空位。\n\n你的鄰座是一個安靜的女生。她留著及肩的黑髮，正低頭看著一本書，封面看起來不像普通教科書。\n\n「那是林曉月。」浩然在你耳邊小聲說，「她不太跟別人說話，但成績很好。你要是有問題可以問她……大概。」\n\n曉月似乎感覺到你的視線，抬起頭來。她的眼睛是少見的淡灰色。\n\n「……你好。」她只說了這兩個字，便又低下頭。',
    choices: [
      {
        text: '「你好，我是{player}。請多指教。」（友善打招呼）',
        next: 'after_intro',
        effects: { affection: { xiaoyue: 1 } }
      },
      {
        text: '「你在看什麼書？看起來很有趣。」（主動搭話）',
        next: 'ask_book',
        effects: { affection: { xiaoyue: 2 } }
      },
      {
        text: '（保持沉默，不打擾她）',
        next: 'after_intro',
        effects: { affection: { xiaoyue: 0 } }
      }
    ]
  },

  ask_book: {
    text: '曉月愣了一下，把書稍微側過一點。封面用燙銀字寫著《星辰記事・殘卷》。\n\n「……只是閒書。」她淡淡地說，聲音很輕，「你對這種東西有興趣？」\n\n她的目光裡閃過一絲探究。',
    choices: [
      {
        text: '「有點好奇，可以借我看看嗎？」',
        next: 'after_intro',
        effects: { affection: { xiaoyue: 2 }, flags: { interested_book: true } }
      },
      {
        text: '「看起來很厲害的樣子。」',
        next: 'after_intro',
        effects: { affection: { xiaoyue: 1 } }
      },
      {
        text: '「抱歉，只是隨口問問。」',
        next: 'after_intro',
        effects: { affection: { xiaoyue: 0 } }
      }
    ]
  },

  after_intro: {
    text: '上午的課程平靜地過去。中午休息時，浩然過來找你。\n\n「要不要一起去食堂？我請你，當歡迎禮。」他笑著說。\n\n你注意到曉月還坐在原位，沒有要離開的意思。',
    choices: [
      {
        text: '跟浩然去食堂',
        next: 'lunch_haoran',
        effects: { affection: { haoran: 1 } }
      },
      {
        text: '留在教室，嘗試跟曉月說話',
        next: 'lunch_xiaoyue',
        effects: { affection: { xiaoyue: 1 } }
      },
      {
        text: '一個人去校園走走',
        next: 'lunch_alone',
        effects: { flags: { explore_alone: true } }
      }
    ]
  },

  lunch_haoran: {
    text: '食堂人很多。浩然幫你介紹了幾個同學，氣氛相當熱鬧。\n\n「對了，」他突然壓低聲音，「你今天早上有看到那道光對吧？其實……這所學校有些『傳統』。每年轉學生都會遇到一些奇怪的事。」\n\n「什麼意思？」\n\n「晚上的社團大樓，偶爾會傳出不是人的聲音。」他笑了笑，但又很快收起表情，「算了，可能是我聽太多鬼故事。你慢慢吃。」',
    choices: [
      {
        text: '「你是在嚇我嗎？」',
        next: 'afternoon',
        effects: { affection: { haoran: 1 } }
      },
      {
        text: '「社團大樓在哪？我想去看看。」',
        next: 'afternoon',
        effects: { affection: { haoran: 2 }, flags: { curious_building: true } }
      },
      {
        text: '「……我會小心的。」',
        next: 'afternoon',
        effects: { affection: { haoran: 0 } }
      }
    ]
  },

  lunch_xiaoyue: {
    text: '你走到曉月身邊。她抬起頭，似乎有些意外。\n\n「不去吃飯嗎？」你問。\n\n「……我不餓。」她頓了頓，又補了一句，「你呢？不跟陳浩然去？」\n\n「想說先跟鄰座打聲招呼。」\n\n曉月看了你幾秒，然後把那本《星辰記事・殘卷》往你這邊推了推。\n\n「……既然你有興趣，可以看。但不要問我從哪來的。」',
    choices: [
      {
        text: '道謝並接過書',
        next: 'afternoon',
        effects: { affection: { xiaoyue: 3 }, flags: { got_book: true } }
      },
      {
        text: '「為什麼不能問？」',
        next: 'afternoon',
        effects: { affection: { xiaoyue: 1 }, flags: { got_book: true } }
      }
    ]
  },

  lunch_alone: {
    text: '你一個人在校園裡閒晃。教學樓後方有一座看起來有些年歲的舊建築，門口掛著「社團活動中心」的牌子，但鐵門上了鎖。\n\n就在你靠近時，門縫裡再次閃過那道銀白色的光。\n\n同時，你聽到極輕的耳語聲——像是有人在用你聽不懂的語言說話。',
    choices: [
      {
        text: '靠近鐵門仔細聽',
        next: 'afternoon',
        effects: { flags: { heard_whisper: true, curious_building: true } }
      },
      {
        text: '立刻離開這裡',
        next: 'afternoon',
        effects: { flags: { avoided_building: true } }
      }
    ]
  },

  afternoon: {
    text: '下午的課結束後，蘇老師把你叫到了辦公室。\n\n「{player}，第一天還習慣嗎？」她溫柔地問，同時從抽屜裡拿出一枚小小的銀質徽章，上面刻著星辰的圖案。\n\n「這是本校的『守護徽章』，每個新生都會發一枚。戴著它，晚上在校園裡會比較……安心。」\n\n她的用詞很微妙。',
    choices: [
      {
        text: '接過徽章並道謝',
        next: 'evening_choice',
        effects: { affection: { teacher: 1 }, flags: { has_badge: true } }
      },
      {
        text: '「老師，這學校是不是有什麼秘密？」',
        next: 'ask_secret',
        effects: { affection: { teacher: 0 }, flags: { has_badge: true, asked_secret: true } }
      }
    ]
  },

  ask_secret: {
    text: '蘇老師靜靜看著你，良久才開口。\n\n「有些事情，知道得太早並不是好事。但既然你問了……」她把徽章放進你手心，「戴著它。如果晚上看到不該看到的東西，記得不要追。」\n\n「不該看到的東西？」\n\n「去吧。今天就到這裡。」她不再多說。',
    choices: [
      {
        text: '離開辦公室',
        next: 'evening_choice'
      }
    ]
  },

  evening_choice: {
    text: '放學的鐘聲響起。大多數同學都陸續離開了。\n\n你站在教室門口，猶豫著今天要做什麼。\n\n浩然朝你揮手：「要一起走嗎？」\n\n曉月則默默收拾東西，似乎準備去圖書館。\n\n而社團大樓的方向，在暮色中顯得格外安靜。',
    choices: [
      {
        text: '跟浩然一起回家',
        next: 'end_normal_haoran',
        effects: { affection: { haoran: 2 } }
      },
      {
        text: '去圖書館找曉月',
        next: 'library_xiaoyue',
        effects: { affection: { xiaoyue: 1 } }
      },
      {
        text: '一個人去社團大樓看看',
        next: 'building_night',
        effects: { flags: { went_building: true } }
      }
    ]
  },

  library_xiaoyue: {
    text: '圖書館的角落，曉月正坐在靠窗的位置。看到你走來，她輕輕點了點頭。\n\n「你果然來了。」她說，像是早就預料會有人來。\n\n「為什麼這麼說？」\n\n「因為你跟其他轉學生不一樣。」她把一張摺好的紙推到你面前，「今晚子時，舊社團大樓後門。如果你真的想知道這個學校的秘密……就來。一個人。」\n\n說完，她起身離開，沒有再給你反問的機會。',
    choices: [
      {
        text: '決定晚上依約前往',
        next: 'building_night',
        effects: { affection: { xiaoyue: 3 }, flags: { accepted_invite: true } }
      },
      {
        text: '覺得太危險，選擇回家',
        next: 'end_safe',
        effects: { affection: { xiaoyue: -1 }, flags: { refused_invite: true } }
      }
    ]
  },

  building_night: {
    text: '夜色完全降臨後，你獨自來到舊社團大樓。\n\n後門虛掩著，裡面隱約有光。你推開門，走了進去。\n\n空氣中瀰漫著淡淡的草木與舊紙的氣味。中央的大廳裡，林曉月站在一個散發著柔和銀光的法陣前。\n\n「你來了。」她轉過身，淡灰色的眼睛在黑暗中微微發亮。\n\n「歡迎來到星辰高中真正的一面，{player}。」\n\n法陣的光芒突然加劇，你感覺到一股溫暖卻強大的力量包裹住自己。',
    choices: [
      {
        text: '「這到底是怎麼回事？」',
        next: 'truth_reveal'
      },
      {
        text: '「我準備好了。」',
        next: 'truth_reveal',
        effects: { affection: { xiaoyue: 2 } }
      }
    ]
  },

  truth_reveal: {
    text: '「這所學校建立在一處『裂隙』之上。」曉月平靜地說，「現實與其他世界的邊界在這裡特別薄弱。每隔一段時間，就會有『存在』試圖滲透進來。\n\n「學生會、部分老師，以及像我這樣的人……都是『守門人』。而你——」她看著你手中的徽章，「徽章有反應了。代表你也有資格成為其中一員。」\n\n遠處傳來浩然的聲音：「我就知道你會來！」他跑進大廳，手上也拿著相同的徽章。\n\n「歡迎加入，{player}。真正的校園生活，從現在才開始。」',
    choices: [
      {
        text: '接受這個身份',
        next: 'end_join',
        effects: { affection: { xiaoyue: 2, haoran: 2, teacher: 1 }, flags: { joined: true } }
      },
      {
        text: '「我需要時間考慮。」',
        next: 'end_hesitate',
        effects: { affection: { xiaoyue: 0, haoran: 1 } }
      }
    ]
  },

  // ===== 結局 =====
  end_normal_haoran: {
    text: '你跟浩然一起走在回家的路上，聊著普通的校園話題。\n\n夜風吹過，你隱約覺得自己錯過了什麼，但此刻的平靜也令人安心。\n\n「明天見，{player}！」浩然在分岔路口朝你揮手。\n\n你不知道的是，今晚社團大樓裡，有一場關於你的討論正在進行。\n\n——第一章・普通結局——\n\n（提示：嘗試不同的選擇，可以解鎖更多故事分支與結局）',
    end: true
  },

  end_safe: {
    text: '你最終選擇了安全的回家路。\n\n躺在床上時，你回想著今天發生的一切——銀光、耳語、曉月意味深長的眼神。\n\n手機震了一下，是一則匿名訊息：\n\n「你拒絕了邀請。但裂隙不會因此消失。下次滿月時，我們再談。」\n\n——第一章・安全結局——\n\n（提示：好感度與選擇會影響後續發展。可以重新開始嘗試不同路線。）',
    end: true
  },

  end_join: {
    text: '你點了點頭。\n\n法陣的光芒逐漸收斂，化作一道細小的星屑流入你的徽章。你感覺到有什麼東西在體內甦醒。\n\n「從今天起，你就是我們的同伴了。」曉月難得露出一絲微笑。\n\n浩然拍了拍你的肩膀：「明天開始教你基礎的防護咒。別緊張，我們都是這樣過來的。」\n\n蘇老師不知何時出現在門口，溫柔地看著你們：「好好休息。真正的挑戰，才正要開始。」\n\n夜空中，繁星異常明亮。\n\n——第一章・覺醒結局——\n\n（恭喜你完成主線。好感度已記錄，未來章節將依此繼續。感謝遊玩！）',
    end: true
  },

  end_hesitate: {
    text: '「沒關係。」曉月點點頭，「這不是能輕易決定的事。徽章你先留著。當你準備好了，它會指引你回來。」\n\n浩然笑了笑：「我們不急。慢慢來。」\n\n你離開社團大樓時，回頭看了一眼那扇門。門後的光芒已經熄滅，像是從未存在過。\n\n但你知道，有些事情一旦知道，就再也無法當沒發生過。\n\n——第一章・猶豫結局——\n\n（你可以重新開始，或等待後續章節。）',
    end: true
  }
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  updateContinueButton();
  showScreen('title');
});
