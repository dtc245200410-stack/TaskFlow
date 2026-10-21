# Lịch sử Git dự án mới

Dự án độc lập, không có remote trỏ repo cũ. Ba commit mốc thực hiện nội dung thật:

1. feat: deploy TaskFlow with PostgreSQL and Nginx reverse proxy
2. feat: add Prometheus metrics and Grafana dashboards
3. feat: add centralized logging and security hardening

Mốc1 chứa website/DB/migration/seed/auth, Compose nền và Nginx. Mốc2 thêm các dịch vụ scrape, exporter, cAdvisor, Grafana provisioning/dashboard và hướng dẫn monitoring. Mốc3 thêm Loki/Promtail, log rotation, LogQL, kiểm tra bảo mật và tài liệu tổng thể. Các biện pháp an toàn nền tảng cần thiết có từ mốc1; không cố tình tạo bản thiếu xác thực để đợi mốc hardening.

ZIP không chứa .git. repository.bundle lưu đầy đủ refs của ba commit; có thể git clone sang folder mới rồi xem git log. Mã hash thực được đọc từ lịch sử sau clone, không tự nhập một chuỗi hash giả trong tài liệu. Author build kỹ thuật TaskFlow Build không đại diện tài khoản GitHub của sinh viên. Chưa tạo/push repo mới.
