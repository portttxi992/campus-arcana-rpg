/** 校園奧秘 四章劇情 */
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
    text: '戴著眼鏡、笑容陽光的男生朝你揮手。\n\n「我是陳浩然，三年級，學生會的！被分配來帶轉學生。」他主動接過行李箱，「你叫什麼名字？」\n\n「我是{player}。」\n\n「好名字！走吧，先去教務處。」',
    choices: [
      { text: '「謝謝，麻煩你了。」', next: 'c1_office', effects: { affection: { haoran: 1 } } },
      { text: '「不用客氣，我自己可以。」', next: 'c1_office', effects: { flags: { independent: true } } },
      { text: '「學生會？聽起來很厲害。」', next: 'c1_office', effects: { affection: { haoran: 2 } } }
    ]
  },
  c1_ignore: {
    meet: ['haoran'],
    text: '你沒理會，徑自往前走。那人追上來擋在面前。\n\n「等等！我是陳浩然，學生會的……你跑得好快。」他苦笑，「能告訴我名字嗎？」\n\n「{player}。」',
    choices: [
      { text: '「抱歉，沒注意到。」', next: 'c1_office' },
      { text: '「下次別突然大喊。」', next: 'c1_office', effects: { affection: { haoran: -1 } } }
    ]
  },
  c1_office: {
    text: '報到完成。走向教學樓時，走廊轉角突然閃過一道銀白色的光。\n\n「咦？你有看到嗎？」浩然愣住。\n\n教室門口，蘇老師溫柔地迎接你：「你就是{player}吧？我是蘇晴，導師。歡迎。」',
    meet: ['teacher'],
    choices: [
      { text: '「蘇老師好。」', next: 'c1_class', effects: { affection: { teacher: 1 } } },
      { text: '「剛才走廊有奇怪的光……」', next: 'c1_class', effects: { flags: { asked_light: true } } }
    ]
  },
  c1_class: {
    meet: ['xiaoyue'],
    text: '你的鄰座是安靜的黑髮女生林曉月。她抬起頭，淡灰色的眼睛看著你。\n\n「……你好。」',
    choices: [
      { text: '「你好，我是{player}。」', next: 'c1_evening', effects: { affection: { xiaoyue: 1 } } },
      { text: '「你在看什麼書？」', next: 'c1_evening', effects: { affection: { xiaoyue: 2 } } },
      { text: '（保持沉默）', next: 'c1_evening' }
    ]
  },
  c1_evening: {
    text: '放學後，蘇老師發給你一枚銀質星辰徽章。\n\n「戴著它，晚上會比較安心。」\n\n你站在走廊，社團大樓在暮色中格外安靜。浩然約你一起走，曉月則留下一張字條：今晚子時，舊社團大樓後門。',
    choices: [
      { text: '跟浩然回家', next: 'c1_end_normal', effects: { affection: { haoran: 2 } } },
      { text: '依約前往社團大樓', next: 'c1_night', effects: { affection: { xiaoyue: 2 } } }
    ]
  },
  c1_night: {
    meet: ['xiaoyue', 'haoran', 'teacher'],
    text: '大廳裡，曉月站在銀光法陣前。\n\n「這所學校建在裂隙上。我們是守門人。徽章選擇了你。」\n\n浩然與蘇老師也出現了。\n\n「歡迎加入，{player}。」',
    choices: [
      { text: '接受，成為守門人', next: 'c1_end_join', effects: { affection: { xiaoyue: 2, haoran: 2, teacher: 1 }, flags: { joined: true } } },
      { text: '「我需要時間考慮。」', next: 'c1_end_hesitate' }
    ]
  },
  c1_end_normal: {
    text: '你跟浩然走在回家路上。徽章在口袋裡微微發燙。\n\n——第一章・普通結局——\n\n（可繼續下一章）',
    end: true
  },
  c1_end_join: {
    text: '法陣光芒流入徽章。你感覺有什麼在體內甦醒。\n\n「從今天起你是同伴了。」曉月難得微笑。\n\n——第一章・覺醒結局——\n\n（可繼續下一章）',
    end: true
  },
  c1_end_hesitate: {
    text: '「沒關係。準備好了它會指引你回來。」\n\n——第一章・猶豫結局——\n\n（可繼續下一章）',
    end: true
  }
};

const CHAPTER2 = {
  c2_intro: {
    meet: ['haoran', 'xiaoyue', 'teacher'],
    text: '成為守門人一週後。\n\n浩然找你，表情凝重：「下午社團大樓集合。」\n\n曉月：「……這次不是練習。」',
    choices: [
      { text: '「發生什麼事？」', next: 'c2_meet', effects: { affection: { haoran: 1 } } },
      { text: '點頭', next: 'c2_meet' }
    ]
  },
  c2_meet: {
    text: '蘇老師：「二年級張聿被影侵蝕。今晚進行淨化儀式。你的徽章是關鍵。」',
    choices: [
      { text: '「準備好了。」', next: 'c2_ritual', effects: { affection: { teacher: 1 } } },
      { text: '「有點緊張，但會盡力。」', next: 'c2_ritual', effects: { affection: { xiaoyue: 1 } } }
    ]
  },
  c2_ritual: {
    text: '法陣亮起。黑色煙霧從張聿身上湧出。\n\n「守門人……你們每解決一次，它就更強一點……」\n\n徽章劇烈震動。',
    choices: [
      { text: '集中精神穩定力量', next: 'c2_end_ok' },
      { text: '大聲回覆：「我們是來救他的！」', next: 'c2_end_ok', effects: { flags: { shouted: true } } }
    ]
  },
  c2_end_ok: {
    text: '影被淨化。張聿脫離危險。\n\n蘇老師：「第一場實戰表現很好。」\n\n——第二章・成功結局——\n\n（可繼續下一章）',
    end: true
  }
};

const CHAPTER3 = {
  c3_intro: {
    meet: ['haoran', 'xiaoyue', 'teacher'],
    text: '曉月單獨找到你，塞給你一張地址。\n\n「舊城區廢棄天文台。有人要見你。今晚。」',
    choices: [
      { text: '「我去。」', next: 'c3_meet', effects: { affection: { xiaoyue: 1 } } },
      { text: '先告訴蘇老師和浩然', next: 'c3_meet', effects: { affection: { teacher: 1, haoran: 1 }, flags: { with_team: true } } }
    ]
  },
  c3_meet: {
    text: '顧衡——舊任首席守門人。\n\n「裂隙不是漏洞，是契約。你們每次淨化，都在餵它。」\n\n蘇老師：「那是被扭曲的說法。若不維持平衡，城市會淪陷。」',
    choices: [
      { text: '相信蘇老師，維持現狀', next: 'c3_end_order', effects: { affection: { teacher: 2 } } },
      { text: '開始懷疑，想調查真相', next: 'c3_end_rebel', effects: { affection: { xiaoyue: 2 }, flags: { lean_rebel: true } } },
      { text: '兩邊都不完全信，自己查', next: 'c3_end_neutral', effects: { flags: { independent_path: true } } }
    ]
  },
  c3_end_order: {
    text: '你選擇站在蘇老師這邊。\n\n——第三章・秩序結局——\n\n（可繼續最終章）',
    end: true
  },
  c3_end_rebel: {
    text: '你開始質疑體制。\n\n——第三章・叛逆結局——\n\n（可繼續最終章）',
    end: true
  },
  c3_end_neutral: {
    text: '你決定自己找出真相。\n\n——第三章・中立結局——\n\n（可繼續最終章）',
    end: true
  }
};

const CHAPTER4 = {
  c4_intro: {
    meet: ['haoran', 'xiaoyue', 'teacher'],
    text: '滿月之夜。裂隙波動異常強烈。\n\n蘇老師：「有什麼東西正在從另一側強行擠過來。」\n\n曉月看向你：「……你的決定，會影響所有人。」',
    choices: [
      { text: '先穩定法陣，阻止它過來', next: 'c4_end_seal' },
      { text: '嘗試徹底關閉裂隙', next: 'c4_end_close' },
      { text: '嘗試與裡面的意識溝通', next: 'c4_comm' }
    ]
  },
  c4_comm: {
    text: '你把意識延伸進去。\n\n一個模糊的身影傳遞過來：「不是契約……是監獄……放我出去……或徹底摧毀……」',
    choices: [
      { text: '徹底關閉裂隙', next: 'c4_end_close' },
      { text: '繼續封印', next: 'c4_end_seal' },
      { text: '嘗試解放裡面的存在', next: 'c4_end_free' }
    ]
  },
  c4_end_seal: {
    text: '裂隙再次被封印。校園恢復平靜。\n\n問題只是被推遲，但今晚的星空依然明亮。\n\n——最終章・封印結局——\n\n感謝遊玩完整系列。',
    end: true
  },
  c4_end_close: {
    text: '裂隙徹底閉合。守門人失去感應能力。\n\n「以後……就只是普通的高中生了？」浩然苦笑。\n\n——最終章・閉合結局——\n\n感謝遊玩完整系列。',
    end: true
  },
  c4_end_free: {
    text: '你選擇解放。那道光靜靜消散在夜空中。\n\n或許真正的契約，從一開始就被誤解了。\n\n——最終章・解放結局——\n\n感謝遊玩完整系列。',
    end: true
  }
};
