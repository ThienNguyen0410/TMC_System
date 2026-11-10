# Attendance Module Implementation Log

Ngày hoàn tất: 2026-11-09

## 1. Mục tiêu

Hiện thực yêu cầu trong `Attendance.md`:

- Thêm migration lưu GPS (`location` dạng JSON) vào `attendance.qr_codes`.
- Kiosk sử dụng camera trước (`facingMode: 'user'`).
- Nhân viên tạo QR Code mới từ dashboard; backend sinh token ngẫu nhiên, hash SHA-256 và lưu DB.
- QR Code có hiệu lực 5 giây; hết hạn phải tạo mã mới.
- Kiosk quét QR, gửi token + GPS lên backend để xác thực.
- Backend kiểm tra QR tồn tại, chưa hết hạn, chưa bị thu hồi.
- So sánh GPS giữa QR và kiosk với sai số tối đa 1 mét.
- Xác định `CHECK_IN` / `CHECK_OUT` dựa trên bản ghi gần nhất.
- Ghi `attendance.attendance_records` và `attendance.outbox` trong cùng một transaction.
- Kiosk hiển thị xác nhận điểm danh và áp dụng cooldown chống quét liên tục.
- Tuân thủ SOLID, không sửa module khác, chỉ thay đổi database qua migration được yêu cầu.

## 2. Khảo sát hiện trạng

- Frontend: React 19 + TypeScript + Vite + Ant Design 6.
- Backend: Express 5 + zod + pg; test bằng `node:test`.
- Database: PostgreSQL, quản lý migration bằng `node-pg-migrate`.
- README mô tả backend Node HTTP thuần đã lỗi thời; code thực tế dùng Express.
- Các module hiện có: `user`, `report`, `attendance` (mới), dùng chung `shared`.
- Database có các schema `user`, `role`, `attendance`, `report` và bảng `attendance.outbox` sẵn có.
- Bảng `attendance.attendance_records` không có cột GPS; chỉ có thể lưu GPS kiosk trong payload outbox.
- `gate_id` là `BIGINT` có khóa ngoại, không thể ghi chuỗi rỗng `""`; đã ghi `NULL`.

## 3. Thiết kế đã triển khai

### 3.1. API

- `POST /api/attendance/qr-codes`
  - Yêu cầu Bearer access token.
  - Body: `{ location?: { latitude, longitude, accuracy } | null }`.
  - Response: token gốc, `issuedAt`, `expiresAt`, `expiresInSeconds = 5`, `location`.
- `POST /api/attendance/scan`
  - Công khai cho kiosk.
  - Body: `{ token, location?: { latitude, longitude, accuracy } | null }`.
  - Response: thông tin nhân viên, `eventType`, `recordedAt`.

### 3.2. Quy tắc nghiệp vụ

- Token QR: 32 byte ngẫu nhiên, mã hóa base64url.
- Chỉ lưu SHA-256 hash trong `attendance.qr_codes.token_hash`; token gốc trả về frontend.
- QR hết hạn sau đúng 5 giây.
- QR chỉ dùng một lần: thu hồi bằng `revoked_at` trong transaction.
- Khoảng cách GPS dùng công thức haversine; sai số cho phép 1 mét.
- Chỉ so sánh GPS khi cả QR và kiosk đều có location.
- Cooldown server-side 30 giây giữa hai lần quét của cùng nhân viên.
- Sự kiện tiếp theo:
  - Chưa có bản ghi hoặc bản ghi gần nhất là `CHECK_OUT` → `CHECK_IN`.
  - Bản ghi gần nhất là `CHECK_IN` → `CHECK_OUT`.
- Transaction gồm:
  1. Thu hồi QR bằng `UPDATE ... WHERE revoked_at IS NULL AND expires_at > NOW()`.
  2. Insert `attendance.attendance_records`.
  3. Insert `attendance.outbox`.
- Outbox payload gồm: `recordId`, `employeeId`, `eventType`, `recordedAt`, `source`, `qrCodeId`, `qrLocation`, `kioskLocation`.

### 3.3. Mã lỗi

- `INVALID_QR_CODE`: token không tồn tại hoặc đã bị thu hồi.
- `QR_CODE_EXPIRED`: QR hết hạn.
- `QR_CODE_ALREADY_USED`: QR đã được sử dụng.
- `QR_LOCATION_MISMATCH`: GPS lệch quá 1 mét.
- `ATTENDANCE_COOLDOWN`: quét lại trong thời gian cooldown.
- `VALIDATION_ERROR`: dữ liệu request không hợp lệ.

## 4. File đã thêm

### 4.1. Database

- `src/database/migrations/0007_add-qr-code-location.sql`
  - Thêm cột `location JSONB` vào `attendance.qr_codes`.
  - Có down migration để drop cột.

### 4.2. Backend

- `src/backend/modules/attendance/attendance.types.ts`
- `src/backend/modules/attendance/attendance.ports.ts`
- `src/backend/modules/attendance/domain/attendance.ts`
- `src/backend/modules/attendance/domain/qr-code.ts`
- `src/backend/modules/attendance/domain/attendance-errors.ts`
- `src/backend/modules/attendance/domain/qr-code.test.ts`
- `src/backend/modules/attendance/repository/qr-code.repository.ts`
- `src/backend/modules/attendance/repository/attendance.repository.ts`
- `src/backend/modules/attendance/repository/postgres-attendance.repository.ts`
- `src/backend/modules/attendance/service/qr-code-validator.ts`
- `src/backend/modules/attendance/service/qr-code.service.ts`
- `src/backend/modules/attendance/service/qr-code.service.test.ts`
- `src/backend/modules/attendance/service/attendance.service.ts`
- `src/backend/modules/attendance/service/attendance.service.test.ts`
- `src/backend/modules/attendance/controller/attendance.schema.ts`
- `src/backend/modules/attendance/controller/attendance.ts`
- `src/backend/modules/attendance/controller/attendance.test.ts`
- `src/backend/modules/attendance/routes/attendance.routes.ts`
- `src/backend/modules/attendance/testing/in-memory-attendance.repository.ts`

### 4.3. Frontend

- `src/frontend/utils/geolocation.ts`
- `src/frontend/services/attendance.api.ts`

## 5. File đã sửa

- `src/backend/app.ts`
  - Khởi tạo repository, service, controller và mount `/api/attendance`.
- `src/frontend/types/attendance.ts`
  - Thêm kiểu dữ liệu QR, GPS, nhân viên, kết quả điểm danh.
- `src/frontend/components/common/QRCodeModal.tsx`
  - Gọi API tạo QR, lấy GPS, hiển thị QR, đếm ngược 5 giây, trạng thái hết hạn, tạo lại, tải ảnh.
- `src/frontend/pages/kiosk/KioskPage.tsx`
  - Dùng camera trước, quét QR bằng `jsQR`, gửi token + GPS, hiển thị xác nhận và lỗi.
- `src/frontend/styles/components/_common.scss`
  - Style cho QR modal.
- `src/frontend/styles/components/_kiosk.scss`
  - Style cho camera, khung quét và panel kết quả.
- `src/frontend/components/profile/ProfileCard.tsx`
  - Bỏ import `EditOutlined` không dùng để `tsc` build pass.
- `package.json`, `package-lock.json`
  - Thêm dependency `jsqr`.

## 6. Kiểm thử và xác minh

### 6.1. Unit/API tests

```powershell
npm run test
```

Kết quả:

- 106 test pass.
- 0 test fail.
- Trong đó có 18 test mới cho module attendance.

Các nhóm đã kiểm tra:

- Hash SHA-256, token ngẫu nhiên, hết hạn đúng thời điểm.
- Khoảng cách GPS và ngưỡng 1 mét.
- Tạo QR 5 giây, chỉ lưu hash.
- Từ chối token không tồn tại, hết hạn, đã dùng.
- Xác định `CHECK_IN` / `CHECK_OUT`.
- Cooldown 30 giây.
- Từ chối nhân viên inactive.
- API yêu cầu authentication khi tạo QR.
- API scan ghi bản ghi và chặn replay.

### 6.2. Build

```powershell
npm run build
```

Kết quả: pass (`tsc -b` + `vite build`).

### 6.3. Lint

```powershell
npm run lint
```

Kết quả: không có lỗi, còn 2 warning `react(set-state-in-effect)`:

- `src/frontend/components/common/QRCodeModal.tsx:26`
- `src/frontend/pages/kiosk/KioskPage.tsx:246`

### 6.4. Migration

```powershell
npm run db:migrate
```

Kết quả: migration `0007_add-qr-code-location` đã áp dụng thành công.

### 6.5. Kiểm thử tích hợp với API thật

Đã chạy server tạm ở cổng `5001` (cổng `5000` đang được một tiến trình API khác sử dụng):

1. Đăng nhập `employee01` thành công.
2. Tạo QR: `expiresIn = 5`, token dài 43 ký tự, có GPS.
3. Quét QR: tạo bản ghi `CHECK_IN` cho `Nguyen Van An`.
4. Quét lại cùng token: trả `400 INVALID_QR_CODE`.
5. Dữ liệu test tích hợp đã được xóa khỏi database sau khi kiểm tra.

## 7. Vấn đề gặp phải và cách xử lý

- Test API scan trả `400 VALIDATION_ERROR` vì test server thiếu `express.json()`.
  - Đã mount `express.json()` trong test setup.
- Build fail do `EditOutlined` không được dùng trong `ProfileCard.tsx`.
  - Đã bỏ import thừa.
- Yêu cầu ghi `gate_id = ""` không thực hiện được vì cột là `BIGINT` có khóa ngoại.
  - Đã ghi `NULL` và ghi chú rõ.
- Bảng `attendance_records` không có cột GPS.
  - GPS QR và GPS kiosk được lưu trong payload của `attendance.outbox`.
- Trên môi trường hiện tại, cổng `5432` do PostgreSQL native trên Windows giữ; API và migration kết nối database theo `DATABASE_URL` trong `.env`.
  - Không ghi log giá trị mật khẩu hay JWT secret.

## 8. Lệnh sử dụng

```powershell
npm run db:migrate
npm run api
npm run dev
npm run test
npm run build
npm run lint
```

## 9. Ghi chú

- Kiosk cần chạy trên `localhost` hoặc HTTPS để trình duyệt cho phép truy cập camera và geolocation.
- QR hết hạn sau 5 giây; người dùng phải bấm tạo mã mới.
- Cooldown hiện đặt 30 giây trong `src/backend/app.ts`.
- Không sửa logic các module `user` và `report`.
