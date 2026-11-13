# Báo cáo kiểm thử

**Dự án:** Pickleball Scorekeeper
**Ngày kiểm thử:** 2026-11-13 (lần chạy lại lúc 22:51 ICT)
**Phạm vi:** Kiểm tra tự động web app (typecheck, unit/component tests và production build)

## Kết quả

| Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `npm run typecheck` | Đạt | TypeScript hoàn tất, không báo lỗi. |
| `npm test` | Đạt | 3 test files, tổng cộng 40/40 tests thành công. |
| `npm run build` | Đạt | Typecheck và Vite production build thành công; output được tạo trong `dist/`. |

## Chạy lại và smoke test trên trình duyệt

- `npm test`: đạt, 3 test files và 40/40 tests thành công.
- `npm run build`: đạt, TypeScript và production build thành công.
- Mở production preview trên trình duyệt: phản hồi HTTP 200, trang chủ hiển thị.
- Chạy thử luồng tạo trận: Home → cấu hình → nhập người chơi (dùng tên mặc định) → màn hình trận.
- Ghi một rally cho Đội A: điểm đổi từ 0–0 thành 1–0, xướng điểm và sân giao cập nhật.
- Chọn Hoàn tác: điểm trở về 0–0 và nút Hoàn tác bị vô hiệu hóa như mong đợi.
- Đã chụp màn hình trình duyệt ở màn hình trận sau khi ghi rally; ảnh được đính kèm trong cuộc trò chuyện này.

## Android debug APK

- Build bằng Gradle `assembleDebug`: thành công.
- File: `android/app/build/outputs/apk/debug/app-debug.apk` (4.02 MB).
- Đã kiểm tra metadata APK: application ID `com.pickleballscorekeeper.app`, min SDK 24, target SDK 36.
- `apksigner verify`: chữ ký debug APK hợp lệ (APK Signature Scheme v2).
- Không có điện thoại Android kết nối qua ADB trong lúc xác minh; chưa cài/chạy APK trên thiết bị thật.

### Phân bố tests

- `src/domain/scoring.test.ts`: 24 tests
- `src/store/reducer.test.ts`: 6 tests
- `src/screens/screens.test.tsx`: 10 tests

## Kết luận

Các kiểm tra tự động hiện có đều thành công; không phát hiện lỗi cần sửa trong lần chạy này.

## Giới hạn

Báo cáo này chỉ phản ánh kết quả của các lệnh tự động nêu trên. Không bao gồm kiểm thử thủ công trên trình duyệt, thiết bị Android/iOS, hoặc xác nhận toàn diện về việc không còn lỗi giao diện.
