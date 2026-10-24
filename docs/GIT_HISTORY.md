# Lịch sử Git dự án mới

Dự án độc lập, không có remote trỏ repo cũ. Ba commit mốc thực hiện nội dung thật:

1. feat: deploy TaskFlow with PostgreSQL and Nginx reverse proxy
2. feat: add Prometheus metrics and Grafana dashboards
3. feat: add centralized logging and security hardening
4. chore: add one-command Windows runall launcher
5. fix: grant migration schema privileges and install OpenSSL
6. feat: wait for and open all local web interfaces from runall
7. docs: package complete project and document Windows operation

Mốc1 chứa website/DB/migration/seed/auth, Compose nền và Nginx. Mốc2 thêm các dịch vụ scrape, exporter, cAdvisor, Grafana provisioning/dashboard và hướng dẫn monitoring. Mốc3 thêm Loki/Promtail, log rotation, LogQL, kiểm tra bảo mật và tài liệu tổng thể. Các biện pháp an toàn nền tảng cần thiết có từ mốc1; không cố tình tạo bản thiếu xác thực để đợi mốc hardening.

Commit4 bổ sung `runall.bat` gọi script khởi động đã có, cập nhật hướng dẫn Windows và cấu hình xuống dòng cho file batch. Ba mốc theo đề bài được giữ nguyên lịch sử.
Commit5 cấp CREATE trên database chỉ cho role migration để chạy CREATE SCHEMA, cài OpenSSL trong build/runtime và ghi quy trình phục hồi migration thất bại cho database đang tồn tại.
Commit6 bổ sung kiểm tra HTTP sẵn sàng và tự mở TaskFlow/pgAdmin/Grafana/Prometheus sau khi khởi động; đọc cổng cấu hình thực, báo timeout theo dịch vụ và hỗ trợ NoBrowser.
Commit7 gộp báo cáo Word/hướng dẫn vào TaiLieu, bổ sung chương vận hành website/Docker/Prometheus/Grafana và nhật ký triển khai Windows đã ghi nhận; giữ nguyên giới hạn kiểm chứng của từng môi trường.

ZIP không chứa .git. repository.bundle lưu đầy đủ refs của toàn bộ lịch sử; có thể git clone sang folder mới rồi xem git log. Mã hash thực được đọc từ lịch sử sau clone, không tự nhập một chuỗi hash giả trong tài liệu. Author build kỹ thuật TaskFlow Build không đại diện tài khoản GitHub của sinh viên. Chưa tạo/push repo mới.
