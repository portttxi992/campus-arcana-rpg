/**
 * AI 自由模式引擎
 * 玩家自備 API Key，支援 OpenAI / Gemini / OpenRouter / 自訂相容端點
 */

const AI_SETTINGS_KEY = 'campus_arcana_ai_settings';
const AI_SAVE_KEY = 'campus_arcana_ai_save';

const AI_WORLD = `你是文字冒險遊戲《校園奧秘》的敘事引擎。
世界觀：現代台灣高中「星辰高中」+ 隱藏奇幻。學校建在「裂隙」上，裂隙連接另一側空間。少數人成為「守門人」，負責淨化影之侵蝕、維持平衡。
主要 NPC：
- 陳浩然（學生會、陽光、忠誠）
- 蘇晴／蘇老師（導師、守門人指導者、沉穩）
- 林曉月（鄰座、寡言、感知敏銳、與裂隙有緣）
玩家是轉學生，可逐漸捲入守門人與裂隙的秘密。

規則：
1. 以繁體中文撰寫，口吻像輕小說／文字 RPG，有畫面感。
2. 每次只推進一小段劇情（約 80～180 字），不要一次寫完整章。
3. 必須提供 2～4 個有意義的選項，選項會影響劇情走向與角色好感。
4. 好感度鍵名只能用：haoran、teacher、xiaoyue（數值建議 -2～+3）。
5. 只有登場過的角色才能出現在 meet 陣列。
6. 不要寫出「選項A/B」這種後設文字；選項本身要像角色會說或玩家會做的事。
7. 避免無限循環：劇情要有進展，必要時可進入小結局（end: true）。
8. 嚴格只輸出 JSON，不要 markdown、不要解釋。`;

const AI_JSON_SCHEMA = `輸出格式（純 JSON）：
{
  "text": "這一段的劇情文字，可用 {player} 代表玩家名字",
  "choices": [
    { "text": "選項文字", "effects": { "affection": { "haoran": 1 }, "flags": {} } }
  ],
  "meet": ["haoran"],
  "end": false
}
若為結局，choices 可為空陣列且 end 為 true。`;

function loadAiSettings() {
  try {
    return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAiSettings(s) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(s));
}

function hasAiKey() {
  const s = loadAiSettings();
  return !!(s.apiKey && s.apiKey.trim());
}

function defaultModel(provider) {
  if (provider === 'gemini') return 'gemini-2.0-flash';
  if (provider === 'openrouter') return 'openai/gpt-4o-mini';
  return 'gpt-4o-mini';
}

async function callOpenAICompatible({ endpoint, apiKey, model, messages }) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 800
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`API 錯誤 ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 回傳沒有內容');
  return content;
}

async function callGemini({ apiKey, model, messages }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  // 把 messages 轉成 Gemini 格式
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const body = {
    contents,
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 800,
      responseMimeType: 'application/json'
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini 錯誤 ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini 回傳沒有內容');
  return content;
}

function parseAiJson(raw) {
  let s = raw.trim();
  // 去掉可能的 ```json 包裝
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  const obj = JSON.parse(s);
  if (!obj.text || typeof obj.text !== 'string') throw new Error('JSON 缺少 text');
  if (!Array.isArray(obj.choices)) obj.choices = [];
  if (!Array.isArray(obj.meet)) obj.meet = [];
  obj.end = !!obj.end;
  // 正規化 choices
  obj.choices = obj.choices.slice(0, 4).map(c => ({
    text: String(c.text || '繼續'),
    effects: c.effects || {}
  }));
  return obj;
}

async function generateAiScene({ playerName, history, lastChoice, affection, met, flags }) {
  const settings = loadAiSettings();
  if (!settings.apiKey) throw new Error('尚未設定 API Key');

  const provider = settings.provider || 'openai';
  const model = settings.model || defaultModel(provider);

  const summary = history.slice(-6).map((h, i) =>
    `【第${i + 1}段】${h.text.slice(0, 120)}${h.choice ? `\n玩家選擇：${h.choice}` : ''}`
  ).join('\n\n');

  const status = `玩家名字：${playerName}\n已登場：${Object.keys(met || {}).filter(k => met[k]).join(', ') || '無'}\n好感：${JSON.stringify(affection || {})}\n旗標：${JSON.stringify(flags || {})}`;

  const userPrompt = history.length === 0
    ? `請生成故事開頭：玩家「${playerName}」剛轉入星辰高中的第一天早晨，站在校門口。\n${status}\n\n${AI_JSON_SCHEMA}`
    : `延續以下劇情。玩家剛剛選擇了：「${lastChoice || '（無）』」\n\n近期劇情：\n${summary}\n\n${status}\n\n請生成下一段，並給 2～4 個選項。\n${AI_JSON_SCHEMA}`;

  const messages = [
    { role: 'system', content: AI_WORLD },
    { role: 'user', content: userPrompt }
  ];

  let raw;
  if (provider === 'gemini') {
    raw = await callGemini({ apiKey: settings.apiKey, model, messages });
  } else {
    let endpoint;
    if (provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
    else if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    else endpoint = settings.endpoint || 'https://api.openai.com/v1/chat/completions';

    raw = await callOpenAICompatible({
      endpoint,
      apiKey: settings.apiKey,
      model,
      messages
    });
  }

  return parseAiJson(raw);
}

function saveAiGame(state) {
  localStorage.setItem(AI_SAVE_KEY, JSON.stringify({
    ...state,
    mode: 'ai',
    savedAt: new Date().toISOString()
  }));
}

function loadAiGame() {
  try {
    const raw = localStorage.getItem(AI_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearAiGame() {
  localStorage.removeItem(AI_SAVE_KEY);
}
