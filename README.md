# 校園奧秘 (Campus Arcana)

現代 + 校園 + 奇幻 文字RPG

## 如何遊玩
1. 開啟 GitHub Pages（Settings → Pages → Source 選 main branch / root）
2. 訪問 `https://portttxi992.github.io/campus-arcana-rpg/`

## 功能
- 玩家自訂名稱或隨機暱稱
- 選項推進劇情（劇情向）
- NPC 好感度系統
- 本地存檔 / 讀檔
- 可擴充劇情框架（新增 `data/stories/` 下的 JSON 即可）

## 擴充新劇情
1. 在 `data/stories/` 新增 `.json` 檔
2. 在 `js/game.js` 的 `STORY_PACKS` 註冊
3. 重新整理頁面即可選擇新版本
