# Pickleball Scorekeeper

Ứng dụng web mobile-first để ghi điểm pickleball: *Mỗi điểm. Mỗi trận. Mỗi tiến bộ.*
Được port từ prototype HTML sang **React 19 + Vite + TypeScript**.

## Tính năng

- Trận đơn / đôi, tính điểm **truyền thống** (có số người giao 1/2 và xướng điểm `a–b–n`) hoặc **Rally**
- 1 ván hoặc Best of 3; điểm đích 11 / 15 / 21; cách 2 điểm hoặc cách 1 điểm
- Một chạm cho mỗi rally, **Hoàn tác** không giới hạn, tạm dừng, nhãn *Game point* / *Match point*, báo *Đổi giao*
- Lịch sử trận, bảng người chơi, thống kê, chia sẻ kết quả (Web Share / copy)
- Danh bạ hồ sơ người chơi lưu cục bộ với ID ổn định; hồ sơ được tạo từ lịch sử tên cũ khi nâng cấp dữ liệu. Supabase Auth hỗ trợ email OTP, Google và Apple khi đã cấu hình; chế độ khách vẫn hoạt động.
- Tạo giải đơn/đôi theo thể thức vòng tròn hoặc loại trực tiếp, tự xếp lịch và sân, dùng lại bộ chấm điểm MVP; lịch giải và bảng xếp hạng chỉ lưu trên thiết bị.
- Ở lần chạy đầu tiên trên thiết bị mới, ứng dụng tự seed một bộ dữ liệu demo với 20 người chơi và 1 giải đấu để kiểm tra nhanh flow tạo giải và fixtures.
- Hồ sơ có thể đặt visibility riêng tư, gửi yêu cầu liên kết cần Owner/Co-organizer phê duyệt; Supabase migrations định nghĩa membership và RLS. Lời mời, đồng bộ giải đấu và xử lý xung đột chưa được bật.
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

Yêu cầu Node.js 20 trở lên. `dist/` là static site (`base: './'` khi build cục bộ), có thể đưa lên GitHub Pages, Netlify, Vercel hoặc Cloudflare Pages. Workflow GitHub Pages tự đặt `base` theo đường dẫn repository.

## Cài trên iPhone dưới dạng PWA

PWA cho phép mở ứng dụng từ Safari và thêm biểu tượng lên Màn hình chính; đây không phải file IPA và không cần Mac hay Apple Developer. Dự án dùng service worker để lưu giao diện ứng dụng cho lần mở offline sau lần tải đầu tiên. Dữ liệu trận đấu vẫn chỉ lưu trên thiết bị bằng `localStorage`, không được đồng bộ lên đám mây.

Để phát hành qua GitHub Pages:

1. Trong repository, mở **Settings → Pages** và chọn **GitHub Actions** làm nguồn triển khai.
2. Push lên nhánh `main` hoặc chạy workflow **Deploy PWA to GitHub Pages** trong tab **Actions**.
3. Sau khi workflow hoàn tất, mở URL GitHub Pages của repository trên iPhone bằng Safari.
4. Chọn **Share → Add to Home Screen**, rồi mở ứng dụng từ biểu tượng vừa thêm.

PWA cần HTTPS để cài và dùng service worker. Khi cập nhật phiên bản, service worker tự động nhận bản build mới. Tài nguyên Google Fonts bên ngoài cần kết nối mạng; ứng dụng dùng font dự phòng khi offline.

## Chạy như ứng dụng iOS / Android

Ứng dụng dùng Capacitor để đóng gói giao diện web thành app native:

```bash
npm install
npm run cap:sync
npm run cap:open:android
# hoặc
npm run cap:open:ios
```

`cap:sync` build web app rồi đồng bộ vào hai project native. Android cần Android Studio cùng Android SDK; mở project bằng lệnh trên rồi chạy trên emulator/thiết bị hoặc tạo signed App Bundle trong Android Studio. iOS cần macOS và Xcode; mở project bằng lệnh trên, chọn signing team rồi Archive để phân phối lên App Store. Không thể build/ký iOS trên Windows.

`appId` hiện là `com.pickleballscorekeeper.app` trong `capacitor.config.ts`; hãy đổi thành application/bundle ID thuộc quyền kiểm soát của bạn trước khi phát hành. Tên, icon, ảnh khởi chạy và metadata cửa hàng cũng cần được hoàn thiện trước khi gửi duyệt.

## Cấu hình Supabase Auth

1. Tạo Supabase project và bật Email trong **Authentication → Sign In / Providers**. Cấu hình email OTP (`{{ .Token }}`), email confirmation theo nhu cầu và minimum password length tối thiểu 8 ký tự. Google và Apple tạm thời chưa được dùng trong giao diện.
2. Sao chép `.env.example` thành `.env.local`, rồi điền project URL và public anon/publishable key. Không đặt service-role key trong app hoặc commit credentials.
3. Thêm redirect URLs `http://localhost:5173/auth/callback`, `http://127.0.0.1:5173/auth/callback` và `pickleballscorekeeper://auth/callback` vào Auth redirect allowlist. URL callback phải khớp với hostname đang mở ứng dụng.
4. Áp dụng migrations bằng Supabase CLI (`npx supabase link` rồi `npx supabase db push`). Để chạy RLS tests cục bộ cần Docker và Supabase CLI: `npx supabase start`, sau đó `npx supabase test db`.
5. Sau khi thêm/cập nhật Capacitor plugins, chạy `npm run cap:sync` rồi build lại ứng dụng native.

Đăng ký tài khoản dùng username, email và password; đăng nhập bằng email/password hoặc mã OTP (Supabase Auth không hỗ trợ đăng nhập chỉ bằng username). Supabase Auth tự quản lý password hash; username được lưu riêng trong `public.account_profiles` và phải duy nhất, không phân biệt chữ hoa/thường. Không lưu password plaintext trong bảng ứng dụng. Đăng nhập không tự tải dữ liệu guest lên cloud; đăng xuất không xóa dữ liệu local. Tournament hiện có vẫn là local-only. Các bảng shared tournament/RLS và profile-link APIs là nền tảng bảo mật; invitations, shared-tournament sync, offline queues, conflict handling và audit/correction UX vẫn là các bước sau.

## Cấu trúc

```
src/
├── auth/                # Supabase Auth context, callback handling, secure session storage
├── domain/              # Logic thuần, không phụ thuộc React
│   ├── types.ts         # Kiểu dữ liệu: Match, PlayerProfile, Tournament, MatchConfig...
│   ├── scoring.ts       # createMatch, applyRally, undo, nextGame, canEndGame...
│   ├── players.ts       # Tên mặc định, kiểm tra trùng tên, thống kê người chơi
│   ├── tournaments.ts   # Fixture Round Robin/Single Elimination và standings
│   ├── permissions.ts   # Ma trận quyền per-tournament và policy evaluation
│   └── scoring.test.ts
├── store/
│   ├── reducer.ts       # Toàn bộ state + action (điều hướng, giải đấu, trận đấu)
│   ├── AppContext.tsx   # Provider, useApp(), useT()
│   ├── storage.ts       # Lưu / nạp localStorage
│   └── reducer.test.ts
├── i18n/                # strings.ts (vi, en) + hàm translate
├── hooks/useWakeLock.ts # Wake Lock + vibrate
├── components/          # Segmented, Modal, BottomNav, MatchCard, GameList...
├── screens/             # Home, Setup, PlayersSetup, Live, Result, History,
│                        # Detail, Tournaments, Tournament Setup/Detail, Roster, Stats, Settings
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

## Giới hạn và bước tiếp theo

Giải đấu hiện chỉ lưu trên thiết bị; invitations, cộng tác đa tài khoản thực tế, đồng bộ, xử lý conflict, sửa kết quả có audit, báo cáo/PDF và chia sẻ kết quả giải chưa được bật. Để xác minh đăng nhập đầu-cuối, cần cấu hình Supabase project, email delivery và OAuth credentials/redirects như hướng dẫn ở trên.
