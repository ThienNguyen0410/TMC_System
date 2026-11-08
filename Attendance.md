### Task attendance module
- Principle code: SOLID Principle

• S - Single Responsibility Principle (SRP): A class should have only one reason to change, meaning it should only have one job or responsibility. If a class handles database connections, business logic, and UI rendering all at once, it breaks SRP.

• O - Open/Closed Principle (OCP): Software entities (classes, modules, functions) should be open for extension, but closed for modification. You should be able to add new functionality by writing new code, not by rewriting and breaking existing, tested code.

• L - Liskov Substitution Principle (LSP): Subtypes must be substitutable for their base types. If Class B is a subclass of Class A, you should be able to pass an instance of Class B into any method that expects Class A without breaking the program's behavior.
• I - Interface Segregation Principle (ISP): A client should never be forced to depend on methods it does not use. It is much better to create many small, specific interfaces rather than one bloated, "catch-all" interface.

• D - Dependency Inversion Principle (DIP): High-level modules should not depend on low-level modules; both should depend on abstractions. Furthermore, abstractions should not depend on details; details should depend on abstractions (usually achieved via interfaces or abstract classes).


**## 1. List of tasks**

**# 1.1 Receive check-in event**

- **Create QR Code:** Trong `employee/EmployeeDashboardPage.tsx`, khi nhân viên nhấn vào nút `QR Code` hoặc `Show Attendance QR Code`, hệ thống sẽ gửi request đến Backend để tạo một QR Code mới. Backend tạo random token, hash token bằng SHA-256 và lưu thông tin vào bảng `attendance.qr_codes`. Token gốc được trả về Frontend để hiển thị dưới dạng QR Code.

- **Display QR Code:** Frontend sử dụng token nhận được từ Backend để generate và hiển thị QR Code trên giao diện. QR Code này được sử dụng để xác định danh tính nhân viên khi thực hiện điểm danh tại Kiosk.

- **QR Code Expiration:** Mỗi QR Code có thời gian hiệu lực 5 giây. Khi QR Code hết hạn, nhân viên cần nhấn nút tạo lại QR Code để tiếp tục sử dụng.

- **Scan QR Code:** Tại giao diện Kiosk, camera sẽ quét QR Code do nhân viên cung cấp và trích xuất token. Kiosk gửi token cùng với `gate_id` và thông tin GPS (latitude, longitude, accuracy) đến Backend để xác thực.

- **Validate QR Code:** Backend hash token nhận được và đối chiếu với `token_hash` trong bảng `attendance.qr_codes`. Hệ thống kiểm tra QR Code có tồn tại, chưa hết hạn và chưa bị thu hồi (`revoked_at IS NULL`) hay không. Nếu không hợp lệ, request sẽ bị từ chối.

- **Determine Attendance Event:** Sau khi xác thực QR Code thành công, Backend truy vấn bản ghi điểm danh gần nhất của nhân viên trong bảng `attendance.attendance_records` để xác định loại sự kiện tiếp theo (`CHECK_IN` hoặc `CHECK_OUT`).

- **Create Attendance Record:** Backend tạo một bản ghi mới trong `attendance.attendance_records`, bao gồm `employee_id`, `gate_id`, `event_type`, `recorded_at`, `source` và thông tin GPS.

- **Attendance Confirmation:** Sau khi ghi nhận điểm danh thành công, Kiosk hiển thị thông báo xác nhận, bao gồm thông tin nhân viên, loại sự kiện điểm danh và thời gian ghi nhận. Hệ thống áp dụng một khoảng cooldown để hạn chế việc quét QR liên tục và tạo các bản ghi trùng lặp.

- Logic nằm trong src/backend/modules/attendance
- Không sửa các modules khác
- Không sửa database
- Ghi ra các file mà bạn đã code