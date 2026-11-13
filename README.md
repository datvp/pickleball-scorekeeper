# Pickleball Scorekeeper

Ứng dụng web mobile-first để ghi điểm pickleball: *Mỗi điểm. Mỗi trận. Mỗi tiến bộ.*
Được port từ prototype HTML sang **React 19 + Vite + TypeScript**.

## Tính năng

- Trận đơn / đôi, tính điểm **truyền thống** (có số người giao 1/2 và xướng điểm `a–b–n`) hoặc **Rally**
- 1 ván hoặc Best of 3; điểm đích 11 / 15 / 21; cách 2 điểm hoặc cách 1 điểm
- Một chạm cho mỗi rally, **Hoàn tác** không giới hạn, tạm dừng, nhãn *Game point* / *Match point*, báo *Đổi giao*
- Lịch sử trận, bảng người chơi, thống kê, chia sẻ kết quả (Web Share / copy)
- 3 giao diện (Sáng / Tối / Ngoài trời độ tương phản cao), 2 ngôn ngữ (Tiếng Việt / English)
- Giữ màn hình sáng (Screen Wake Lock) và rung khi ghi điểm
- Dữ liệu lưu cục bộ trong `localStorage`, tiếp tục được trận đang chơi sau khi tải lại trang

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test (vitest)
npm run build      # kiểm tra kiểu + build ra dist/
npm run preview
```

Yêu cầu Node.js 20 trở lên. `dist/` là static site (`base: './'`), có thể đưa lên GitHub Pages, Netlify, Vercel hoặc Cloudflare Pages.

## Cấu trúc

```
src/
├── domain/              # Logic thuần, không phụ thuộc React
│   ├── types.ts         # Kiểu dữ liệu: Match, MatchConfig, SavedMatch...
│   ├── scoring.ts       # createMatch, applyRally, undo, nextGame, canEndGame...
│   ├── players.ts       # Tên mặc định, kiểm tra trùng tên, thống kê người chơi
│   └── scoring.test.ts
├── store/
│   ├── reducer.ts       # Toàn bộ state + action (điều hướng, cài đặt, trận đấu)
│   ├── AppContext.tsx   # Provider, useApp(), useT()
│   ├── storage.ts       # Lưu / nạp localStorage
│   └── reducer.test.ts
├── i18n/                # strings.ts (vi, en) + hàm translate
├── hooks/useWakeLock.ts # Wake Lock + vibrate
├── components/          # Segmented, Modal, BottomNav, MatchCard, GameList...
├── screens/             # Home, Setup, PlayersSetup, Live, Result, History,
│                        # Detail, Roster, Stats, Settings
├── App.tsx              # Chọn màn hình theo state.view
└── styles.css           # Design tokens + theme (giữ nguyên từ prototype)
```

Mô hình điều hướng là state (`state.view`), không dùng router, đúng với prototype dạng app một khung hình. Nếu cần deep-link hoặc nút Back của trình duyệt, có thể thay bằng React Router.

## Luật tính điểm

| Chế độ | Quy tắc |
| --- | --- |
| Truyền thống (đơn) | Chỉ đội giao được điểm; đội giao thua rally thì đổi giao |
| Truyền thống (đôi) | Ván mới bắt đầu ở người giao số 2. Thua rally: người giao 1 → người giao 2 → đổi giao |
| Rally | Đội thắng rally luôn được điểm; đội nhận thắng thì giành quyền giao |

Ván kết thúc khi một đội đạt điểm đích và hơn đối thủ đủ `winBy` điểm. Ván kế tiếp trong Best of 3 luân phiên đội giao đầu.

> **Cần chốt trước khi phát hành:** luật Rally là giả định (như ghi chú trong app), và tùy chọn "cách 1 điểm" là thiết lập giải trí, không phải luật thi đấu chuẩn.

## Những điểm khác prototype

- Logic tính điểm tách khỏi giao diện, bất biến (immutable) và có test; Undo khôi phục đầy đủ `winner`/`end` khi hoàn tác cú điểm quyết định (prototype chưa xóa các trường này).
- Wake Lock chỉ giữ khi đang ở màn hình trận đấu, tự giành lại khi quay lại tab.
- Khóa lưu trữ mới `pickleball-scorekeeper:v1` (dữ liệu từ prototype `pk_proto_v1` không được chuyển sang).
- Thêm trạng thái "Đã sao chép tóm tắt" khi trình duyệt không hỗ trợ Web Share.

## Ý tưởng tiếp theo

PWA (manifest + service worker để dùng offline), xuất lịch sử CSV, gắn tên người chơi quen thuộc để gợi ý khi nhập, đồng bộ đám mây.
