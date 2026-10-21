# Đối chiếu tiêu chí chấm điểm Đề 24

Trạng thái phản ánh phép kiểm thực hiện ngày 21/10/2026. PASS của mã nguồn hoặc cấu hình không được hiểu thành PASS cho runtime Docker. Không tự tính điểm thay giảng viên khi còn thiếu minh chứng.

| Tiêu chí | Thành phần và file | Thao tác kiểm | Minh chứng hiện có | Trạng thái | Cần hoàn thiện |
|---|---|---|---|---|---|
| Git và ba commit ý nghĩa | repository.bundle, docs/GIT_HISTORY.md | Clone bundle, git log --oneline | Ba commit có thay đổi thật, bundle kiểm clone | PASS cho lịch sử local; NOT RUN cho GitHub | Tạo repo mới, push, chụp GitHub history |
| App + PostgreSQL + pgAdmin | frontend/, backend/, database/, Compose | start; acceptance.ps1; pgAdmin query | 14 test Node và 7 nhóm E2E trên Prisma/PGlite | PASS cho QA; BLOCKED cho PG17/pgAdmin Docker | Chạy Docker, đối chiếu task/status trong DB thật |
| Nginx reverse proxy | nginx/Dockerfile, default.conf.template | nginx-t; curl HTTPS/headers; kiểm port | Build frontend, cấu hình/manifest và Compose hợp lệ | BLOCKED runtime | Xác nhận TLS/redirect/headers và API qua Nginx |
| Prometheus + Grafana | compose.monitoring.yml, monitoring/ | verify.ps1; targets; dashboard | promtool đạt; datasource/dashboard JSON có query thật | PASS config; BLOCKED runtime | Bảy targets UP, pg_up/nginx_up=1, container series |
| Loki + Promtail + LogQL | compose.logging.yml, logging/, LOGQL.md | traffic; Explore ba query | Loki/Promtail syntax đạt; query khớp nhãn/field | PASS config; BLOCKED ingest | Chụp ba query có log thật trên stack |
| Hardening ít nhất 3–4 biện pháp | Auth/permission, Dockerfile, Compose, DB roles, Nginx | id; port; pg_roles; headers; API negative cases | CSRF/Origin/RBAC/rate/errors PASS QA; config có | PASS app QA; BLOCKED container/DB/TLS | Chứng minh UID, mạng, role DB và headers bằng runtime |
| Compose + README | Root Compose, files extends, README.md | config --quiet; up; clean extraction | Static config đạt, hướng dẫn có commands cụ thể | PASS tĩnh; BLOCKED up | Build/run từ ZIP trên Windows |
| Báo cáo Word và hướng dẫn | Hai DOCX ngoài ZIP, docs/INSTALLATION.md | Mở Word, cập nhật mục lục, đối chiếu | Render/kiểm bố cục, hình UI QA và sơ đồ thật | PASS artifact | Bổ sung năm học và ảnh Windows sau nghiệm thu |
| Demo và minh chứng | docs/DEMO.md, evidence/README.md | Thực hành kịch bản15 phút | E2E UI screenshots, test logs, static validators | PASS phần QA; BLOCKED demo stack | Chụp WIN01–WIN12, cập nhật kết quả thật |

Các phép kiểm trong ZIP không cần mật khẩu thật ở nội dung chia sẻ. Secret được sinh local; không đóng gói .env, backup, private key, node_modules, dist, cache hoặc .git. Chi tiết từng kết quả xem TESTING.md.
