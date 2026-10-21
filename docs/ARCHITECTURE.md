# Kiến trúc TaskFlow

TaskFlow là dự án mới hoàn toàn cho DTC245200410. Không kế thừa mã nguồn, lịch sử Git, network, volume hay repository của dự án Task Tracker cũ. Chạy local trên Windows 11 + Docker Desktop Linux containers; không thiết kế cho truy cập Internet trong bản bàn giao.

## Quyết định kỹ thuật

- React 19, TypeScript, Vite; React Router; dnd-kit với PointerSensor/KeyboardSensor. Một trang SPA, assets được build trong Dockerfile Nginx. Không cần Node trên Windows để chạy stack.
- Express 5 + Prisma 7.10.1, adapter-pg; PostgreSQL 17.11. Driver adapter giúp tránh phụ thuộc query engine native trong backend. Các package được pin chính xác trong package.json và lockfile.
- Phiên đăng nhập dùng token ngẫu nhiên 256 bit. Cookie HttpOnly, Secure, SameSite=Lax; DB chỉ lưu SHA-256 của token. Mỗi phiên có CSRF token; mọi write kiểm tra Origin và X-CSRF-Token. Hết hạn sau 7 ngày; đổi mật khẩu hoặc khóa tài khoản xóa các phiên liên quan.
- bcrypt cost 12; mật khẩu ít nhất 12 ký tự và tối đa 72 byte UTF-8. Không có reset qua email vì phạm vi local không cấu hình SMTP.
- User ADMIN quản trị tài khoản nhưng không mặc nhiên đọc task riêng của mọi người. Quyền dữ liệu dựa vào ProjectMember. OWNER/ADMIN quản lý dự án, MEMBER sửa task, VIEWER chỉ đọc. MEMBER chỉ xóa task do mình tạo; chủ dự án không bị xóa hoặc hạ quyền.
- Migration chạy bằng taskflow_migrate, backend bằng taskflow_app có DML nhưng không CREATE/superuser. Sau migrate, quyền app trên bảng _prisma_migrations bị thu hồi bởi secure-schema.ts. PostgreSQL owner chỉ dùng khởi tạo và backup/restore. Secret sinh cục bộ; không có .env thật trong Git/ZIP.
- Dùng security headers và TLS tự ký trong Nginx non-root. CSP cho phép style inline vì dnd-kit và màu nhãn cần style động; script chỉ cùng origin. Không bật HSTS cho localhost tự ký.
- Cổng web 8088/8448; pgAdmin 5058, Grafana 3008, Prometheus 9098. Tất cả bind 127.0.0.1. Backend, PostgreSQL, exporters, Loki và Promtail không publish host.
- Prometheus có 7 job: backend, nginx, postgres, containers, prometheus, loki, promtail. cAdvisor đọc metrics của Linux VM/containers Docker Desktop, không đại diện đầy đủ CPU/RAM của Windows. Node Exporter không được bật vì không đáp ứng mục tiêu đo Windows host.
- cAdvisor là ngoại lệ chạy root để đọc trạng thái container, không privileged trong cấu hình mặc định. Các mount host là read-only nhưng Docker socket vẫn là tài nguyên nhạy cảm; không public cAdvisor và cần kiểm tra trên Docker Desktop thực tế. Nếu máy chặn host mounts/ECI, không tự bật privileged; đọc lỗi và đánh giá lại.
- Loki + Promtail 3.5.1 giữ đúng đề bài. Promtail đã EOL 02/03/2026; pin version không khắc phục EOL. Phạm vi chỉ bài local. Thay Alloy là thay đổi cần thống nhất riêng.
- App log JSON ra stdout và volume, rotation 5 MiB x 4 (active + 3 bản). Nginx rotation bằng sidecar cùng UID101 và PID namespace, rename rồi SIGUSR1. Loki/Prometheus retention 7 ngày; Prometheus thêm giới hạn 1 GB. Theo dõi dung lượng Docker định kỳ.
- Compose gốc dùng extends để chia cấu hình monitoring/logging thành file riêng. Mọi lệnh docker compose mặc định chạy từ thư mục gốc.
- Ba commit nội bộ có thay đổi thực tế. ZIP không chứa .git; repository.bundle bảo toàn lịch sử và cho phép clone/push sau. Chưa tạo hoặc push repository GitHub mới.

## Giới hạn

Không có email thông báo, công việc lặp, sprint/backlog, CSV hoặc realtime WebSocket. Lịch chỉ có chế độ tháng. Kanban tối đa 500 task ở kết quả hiện tại; danh sách phân trang 25. Dashboard tổng hợp toàn bộ dự án đang hoạt động mà tài khoản được tham gia. Các giới hạn được hiển thị và không được mô tả là tính năng đã triển khai.

## Tài liệu chính thức đã đối chiếu ngày 21/10/2026

- https://vite.dev/guide/
- https://www.prisma.io/docs/orm/reference/system-requirements
- https://www.prisma.io/docs/orm/overview/databases/postgresql
- https://expressjs.com/en/advanced/best-practice-security/
- https://hub.docker.com/_/postgres
- https://hub.docker.com/_/node
- https://docs.docker.com/compose/multiple-compose-files/extends/
- https://github.com/google/cadvisor/releases
- https://grafana.com/docs/loki/latest/send-data/promtail/
- https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- https://prometheus.io/docs/prometheus/latest/configuration/configuration/
