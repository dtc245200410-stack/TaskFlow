# Kết quả kiểm thử ngày 21/10/2026

PASS: đã kiểm tra thành công trong môi trường nêu rõ. FAIL: đã chạy và còn lỗi. BLOCKED: thiếu môi trường/quyền. NOT RUN: chưa thực hiện. Các kết quả cũ không được dùng thay cho kết quả lần bàn giao này.

## Kết quả đã thực hiện

| Kiểm tra | Trạng thái | Minh chứng và giới hạn |
|---|---|---|
| Backend TypeScript + Prisma generate | PASS | npm run build; Prisma7.10.1, Node24.19.0 |
| Frontend typecheck + production bundle | PASS | Vite8.3.4; bundle JS/CSS thật |
| 14 test Node (unit và integration) | PASS | evidence/api-test.txt; 14pass,0fail,0skip |
| Auth/CSRF/Origin/rate limit | PASS | HTTP thật qua Express; fakeDB chỉ dùng test500/rate limit |
| Project role/IDOR/admin lock | PASS | Prisma + PGlite PostgreSQL18.6 WASM, không phải PG17container |
| CRUD/Kanban/comment/checklist/filter | PASS | APIintegration, kiểm bằng truy vấnDB |
| Migration SQL + seed idempotent | PASS | Chạy fullSQL trên PGlite, seed2lần vẫn10task/3user |
| Dữ liệu sau đóng/mở database | PASS | PGlite trên ổ đĩa; không chứng nhận namedvolumeDocker |
| Browser E2E | PASS | Chromium 140, productionfrontend + backend/Prisma/PGlite quaHTTP |
| Kanban kéo bằng chuột rồi reload | PASS | E2E xác nhận card ở cộtDONE saureload |
| Tạo/sửa/xóa, checklist/bình luận/tìm kiếm UI | PASS | evidence/ui-results.json |
| Mobile390px, navigation, không tràn ngang | PASS | ui-mobile.png, không pageerror |
| Compose config | PASS | DockerCLI28.4.0/Compose2.39.4, không cóEngine |
| Manifest12image | PASS | image-tags.json; tag vàLinuxAMD64, không phải pull/build |
| Prometheus config | PASS | promtool3.5.0 checkconfig |
| Loki config | PASS | Loki3.5.1 verify-config |
| Promtail config | PASS | Promtail3.5.1 check-syntax |
| PowerShell syntax10scripts | PASS | ParserPowerShell 7.5.2 trênLinux; chưa thực thiWindows5.1 |
| Docker images build, containers up/health | BLOCKED | Work không cóDockerEngine; cầnDockerDesktop |
| PostgreSQL 17 migration/seed/role thật | BLOCKED | Không cóEngine; PGlite không thay phép kiểm role container |
| NginxTLS/redirect/headers/non-root thực | BLOCKED | Cấu hình đã viết; cần chạyimage thật |
| pgAdmin kết nối DB | BLOCKED | CầncontainerpgAdmin/PostgreSQL |
| PrometheusTargets UP, cAdvisor series | BLOCKED | Cần Docker Desktop; metricsbackend endpoint đã kiểm |
| Grafanadatasource/dashboard dữ liệu thật | BLOCKED | Provisionconfig/JSON có, chưa chạyGrafana |
| Lokiingest/3LogQL trongCompose | BLOCKED | Syntax đạt không chứng minh ingestion |
| Backup/restoreWindows, restartnamedvolume | BLOCKED | Script có, cầndata/volume/container thật |
| PushrepositoryGitHub mới | NOT RUN | Người dùng yêu cầu dự án độc lập local; chưa cấp/quyết định remote mới |

Các ảnh ui-*.png là ảnh chụp thật của QAWorkHTTP/PGlite; không có ảnh Grafana/pgAdmin/Targets/LogQL giả. Sau chạyWindows, cập nhật trạng thái từng mục theo scripts/verify.ps1, acceptance.ps1 vàdocs/DEMO.md. Không chuyển BLOCKED thànhPASS chỉ vì container hiển thịUp.

## Lỗi phát hiện và đã sửa

- TypeScript: thêm khai báoViteCSS và thu hẹp kiểu thuộc tính lỗiJSON trướcbuild.
- Checklist: cập nhật optimistic và rollback khiAPIfail để checkbox phản hồi ngay.
- Lịchtháng: nútHômnay đưa về ngàyđầutháng để truyvấn đủcácdeadline trongtháng.
- Search: lưu từkhóa lênURL để giữ bộlọc khi mở/đóngmodal chi tiếttask.
- Overdue: luôn loạiDONE kểcả khi kết hợp bộlọctrạngthái.
- TestharnessPGlite: chờ socketdetach trước đóngWASM để tránh race trongkiểmtra reopen; không thaylogicdatabaseproduction.

## Chạy lại

Windows: scripts/test.ps1 (PGlite), scripts/acceptance.ps1 (backend/DBthật), scripts/verify.ps1 (health/headers/targets); đọcDEMO.md đểkiểmtra thủcông. E2EWork: npmci ởcảfrontend/backend, frontendbuild, playwrightinstallchromium, node tests/e2e.mjs. Không đặtTEST_DATABASE_URL trỏ vàoDBcó dữliệu cần giữ.

## Kiểm tra bổ sung Run All tự mở trang

PowerShell 7.5.2 trên Linux: parser chấp nhận toàn bộ script PowerShell. Năm tình huống chạy script đạt PASS với server HTTP/HTTPS cục bộ thật, curl thật, lệnh Docker và thao tác mở trình duyệt được mô phỏng:

1. Chờ một trang trả 503 hai lần trước khi sẵn sàng; chỉ gọi mở đủ bốn URL sau khi cả bốn health endpoint trả 2xx. Kiểm tra cổng tùy chỉnh, biến môi trường ưu tiên hơn `.env`, bỏ qua proxy cho localhost và giữ nguyên `.env`.
2. NoBrowser vẫn khởi động và kiểm tra sẵn sàng nhưng không gọi mở trang.
3. Prometheus luôn trả 503: script timeout, nêu đúng URL/dịch vụ và trả thất bại; không mở trang.
4. Compose up thất bại: script dừng trước kiểm tra HTTP/mở trang và dẫn tới hướng dẫn lỗi migration.
5. Lỗi liên kết trình duyệt ở một URL: in URL mở tay, tiếp tục gọi mở các trang còn lại.

Các kiểm tra này không chứng minh Docker stack thật đang hoạt động hoặc trình duyệt Windows đã mở tab. Cần xác nhận Docker Desktop/Windows PowerShell 5.1 và trình duyệt mặc định trên máy cá nhân. Không chạy lại kiểm thử backend/UI vì logic ứng dụng không thay đổi trong commit này.
