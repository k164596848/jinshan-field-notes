# 金山地瓜地方誌（來去金山，FUN 藷假）

新北市立金山高中「地瓜金正讚」小組的 2015 台灣網界博覽會作品，以及 2026 年的重構版。

| 資料夾 | 內容 |
|---|---|
| `2015-original/` | 2015 年原版網站（Namo WebEditor 輸出，頁框與 Big5 頁面原封不動）。唯一的原稿，請勿修改。 |
| `src/` | 重構版的正式來源：建置腳本、首頁 template、31 篇內文、CSS、JS、圖片、圖示。要改網站請改這裡。 |
| `2026-remake/` | 由 `src/` 建置出的成品網站（重製版），可直接開啟 `2026-remake/index.html` 或放上任何靜態主機。其中 `original/` 是建置時複製進來的 2015 原版，新舊版互有按鈕可以切換，所以整個資料夾放上同一台主機就能兩版都看。 |
| `index.html` | 根目錄的轉址頁，直接跳到 `2026-remake/`，方便整個 repo 放上 GitHub Pages 之類的主機。 |

## 重建

需要 Python 3 與 `lxml`（`pip install lxml`）。在本資料夾執行：

```sh
python3 src/build_yam.py 2015-original /tmp/jfn-preview   # 先輸出到暫存目錄檢查
python3 src/verify_build.py                           # 確認「2026-remake/」與乾淨重建一致
```

確認無誤後，把暫存輸出整個取代 `2026-remake/` 即可。建置腳本會拒絕把輸出指到來源目錄。

## 本機預覽

```sh
cd 2026-remake && python3 -m http.server 8000     # 開 http://localhost:8000/
```

詳細的來源結構與各次改版紀錄見 `src/README.md`。
