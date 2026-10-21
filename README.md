# TaskFlow cho Đề 24

Dự án mới độc lập của sinh viên **Lã Quốc Trường – DTC245200410**. React/TypeScript + Express/Prisma + PostgreSQL, Nginx HTTPS, Prometheus/Grafana, Loki/Promtail. Chạy cục bộ bằng Docker Desktop; mọi cổng truy cập chỉ bind `127.0.0.1`. Không ghi đè hoặc sử dụng volume của dự án cũ.

## Chạy trên Windows bằng PowerShell

Docker Desktop phải đang chạy **Linux containers** với WSL2. Git/Node/Python trên Windows chỉ cần khi phát triển, không bắt buộc để khởi chạy các container. Giải nén ZIP vào đường dẫn ngắn, ví dụ `D:\DoAn\DTC245200410`, mở VS Code tại thư mục chứa `docker-compose.yml`.

```powershell
Set-Location D:\DoAn\DTC245200410
docker version
docker compose version
powershell -ExecutionPolicy Bypass -File .\scripts\init.ps1
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps -a
```

`init.ps1` sinh tám mật khẩu độc lập 256 bit dạng hex và tạo `.env` UTF-8. Không in mật khẩu và không ghi đè `.env` đã có. Lần đầu cần Internet để tải image/npm; không cam kết thời gian tải. Chờ healthcheck trước khi mở web. `migrate`, `permissions`, `cert-init` kết thúc với `Exited (0)` là bình thường. Lệnh tắt an toàn: `docker compose down` — giữ dữ liệu volume. **Không dùng `down -v` trong quy trình thường ngày.**

Lệnh gộp sau này:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

## Địa chỉ và đăng nhập

| Thành phần | URL mặc định | Thông tin truy cập |
|---|---|---|
| Website | https://localhost:8448 | `ADMIN_EMAIL` + `ADMIN_INITIAL_PASSWORD` trong `.env` local |
| HTTP redirect | http://localhost:8088 | Chuyển sang HTTPS localhost:8448 |
| pgAdmin | http://localhost:5058 | `PGADMIN_EMAIL` + `PGADMIN_PASSWORD` |
| Grafana | http://localhost:3008 | `GRAFANA_ADMIN_USER` + `GRAFANA_ADMIN_PASSWORD` |
| Prometheus | http://localhost:9098/targets | Localhost; không public Internet |
| PostgreSQL | `postgres:5432` trong Docker | Không có cổng host |
| Backend, Loki, Promtail, exporters, cAdvisor | Chỉ mạng nội bộ | Không có cổng host |

Chứng chỉ tự ký chỉ cho localhost, SAN có localhost/127.0.0.1. Trong trình duyệt chọn **Nâng cao → Tiếp tục đến localhost** khi đã xác nhận đúng bài demo. Không nhập mật khẩu trên trang cảnh báo chứng chỉ của một website lạ. Chứng chỉ nằm trong volume TLS, không có khóa riêng trong ZIP.

Các tài khoản ứng dụng:

- Admin: email `ADMIN_EMAIL` (mặc định `admin@taskflow.local`), mật khẩu `ADMIN_INITIAL_PASSWORD`.
- Member: `member@taskflow.local`, mật khẩu `DEMO_PASSWORD`.
- Viewer: `viewer@taskflow.local`, mật khẩu `DEMO_PASSWORD`.
- Người dùng có thể đăng ký tài khoản mới. Không có mật khẩu demo cố định trong sản phẩm. Chuỗi `QA-...` trong test chỉ thuộc database kiểm thử tạm, không được dùng cho Compose.

Seed tạo ba tài khoản, hai dự án và mười task ở bốn trạng thái. Deadline tính tương đối tại lần seed đầu tiên. Seed lại không reset dữ liệu, quyền hay mật khẩu đã thay đổi. Sau lần đầu nên đổi mật khẩu admin qua Cài đặt tài khoản; `.env` initial password không tự cập nhật theo mật khẩu mới.

## Chức năng

Đăng ký/đăng nhập/đăng xuất, hồ sơ/đổi mật khẩu; dự án cá nhân/nhóm, lưu trữ/khôi phục; quản lý thành viên OWNER/ADMIN/MEMBER/VIEWER; task có mã duy nhất, trạng thái, ưu tiên, ngày bắt đầu, deadline, phân công và nhãn; Kanban kéo thả có lưu DB, rollback khi lỗi; danh sách có tìm kiếm, lọc, sắp xếp, phân trang; My Tasks, quá hạn, lịch tháng; checklist, bình luận, lịch sử; dashboard dữ liệu thật và quản trị khóa/mở tài khoản.

ADMIN hệ thống quản lý tài khoản, không tự có quyền đọc các dự án riêng. VIEWER không được ghi, MEMBER không quản lý thành viên và chỉ xóa task do mình tạo. OWNER không bị xóa/hạ quyền. Dữ liệu đã lưu trữ vẫn còn nhưng không nằm trong danh sách/dashboard đang hoạt động. Chức năng mở rộng như email, task lặp, CSV và sprint chưa triển khai.

## Cấu trúc và luồng khởi động

- `frontend/`: React SPA; không cần chạy Vite riêng khi dùng Docker.
- `backend/`: TypeScript, Prisma schema/migration/seed, API và tests.
- `database/01-roles.sh`: tạo role và quyền tối thiểu khi volume PostgreSQL mới.
- `nginx/`: build frontend và Nginx non-root, reverse proxy/TLS/headers.
- `compose.monitoring.yml`, `monitoring/`: metrics/exporters/dashboard provision.
- `compose.logging.yml`, `logging/`: Loki, Promtail và rotation Nginx.
- `scripts/`: thao tác Windows; `tests/`: nghiệm thu stack và E2E QA.
- `docs/`: kiến trúc, API, kiểm thử, rubric, demo và minh chứng.
- `repository.bundle`: lịch sử Git nội bộ sau khi đóng gói; ZIP không chứa `.git`.

PostgreSQL healthy → migrate + seed thành công → backend healthy → Nginx. Permissions/cert-init chuẩn bị volume/TLS trước dịch vụ cần dùng. Tất cả phụ thuộc được khai báo trong Compose. File gốc dùng `extends` tới hai file cấu hình dịch vụ; không cần tự thêm các cờ `-f`.

## Cấu hình local và xung đột cổng

Giữ project name `taskflow_dtc245200410_new` khác dự án trước. Các network/volume tự nhận prefix theo project, không dùng `container_name` toàn cục. Kiểm tra cổng trước khi chạy:
```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 8088,8448,5058,3008,9098 | Select-Object LocalAddress,LocalPort,OwningProcess
```
Đổi biến `HTTP_PORT`, `HTTPS_PORT`, `PGADMIN_PORT`, `GRAFANA_PORT`, `PROMETHEUS_PORT` trong `.env` nếu cần rồi `docker compose up -d`. `HTTPS_PORT` cũng cập nhật Origin backend và redirect Nginx. Luôn truy cập web bằng **https://localhost**, không thay hostname tùy ý vì Origin được kiểm tra chính xác. Dùng mật khẩu hex do init sinh; nếu tự đổi secret DB trong `.env`, role trong volume cũ **không** đổi theo. Không xóa volume để xử lý lỗi xác thực.

## Database và pgAdmin

Mở pgAdmin, đăng nhập bằng `.env`; Add New Server:

| Trường | Giá trị |
|---|---|
| Name | TaskFlow Local |
| Host name/address | `postgres` |
| Port | `5432` |
| Maintenance database | `taskflow`, hoặc `POSTGRES_DB` đã đặt |
| Username | `taskflow_owner` |
| Password | `POSTGRES_PASSWORD` |

`localhost` trong pgAdmin container là chính pgAdmin, không phải PostgreSQL. Không tạo bảng tay; migrate service thực hiện migration. Chạy lại sau khi thêm migration:
```powershell
docker compose run --rm migrate
```
Kiểm tra trong Query Tool:
```sql
SELECT "number","title","status","dueAt" FROM "Task" ORDER BY "number";
SELECT rolname,rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname LIKE 'taskflow_%';
SELECT has_schema_privilege('taskflow_app','public','CREATE');
```
Kỳ vọng taskflow_app không superuser/createdb/createrole và quyền CREATE trả false. `taskflow_migrate` sở hữu schema/bảng; app chỉ DML + usage sequence. Owner chỉ dùng admin/backup.

## Giám sát và log

Prometheus /targets cần **7 job UP**: backend, nginx, postgres, containers, prometheus, loki, promtail. UP chỉ xác nhận scrape thành công: kiểm thêm `pg_up == 1`, `nginx_up == 1` và có series container thực tế.

Grafana → Dashboards → TaskFlow → **TaskFlow Hệ thống**. Hai datasource Prometheus/Loki và 12 panel được provision. Chọn Last 30 minutes, refresh15s, chạy:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-traffic.ps1
```
CPU container là rate CPU seconds ×100 (có thể >100% khi nhiều core), RAM là working set bytes; latency p95 dùng histogram. `process_resident_memory_bytes` là riêng tiến trình backend, không phải toàn máy. cAdvisor đo Docker Linux VM/containers, **không đo đầy đủ Windows host**. Không bật Node Exporter giả làm exporter Windows. Nếu đổi project name/DB, chỉnh hai textbox variable trên dashboard.

Grafana → Explore → Loki → Last15minutes; các truy vấn khớp pipeline:
```logql
{job="taskflow", service="nginx"}
```
```logql
{job="taskflow", service="nginx"} | json | status >= 400
```
```logql
{job="taskflow", service="backend", level=~"warn|error"}
```
Xem `docs/LOGQL.md` cho xử lý lỗi và query5xx. Log Nginx/backend tập trung; log hạ tầng khác còn ở Docker logging driver. Promtail 3.5.1 đã EOL từ02/03/2026 theo Grafana; giữ để đúng bài local, không coi pin version là khắc phục hết hỗ trợ. Không thay Alloy trong bản này.

## Hardening và cách kiểm tra

```powershell
docker compose exec backend id
docker compose exec nginx id
docker compose port backend 4000
docker compose port postgres 5432
curl.exe -k -I https://localhost:8448
```
Backend UID1000, Nginx UID101. Lệnh port cho backend/PostgreSQL không trả published port; mã thoát khác0 ở phép kiểm này là kết quả mong đợi. Headers cần CSP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy. Trong app, cookie HttpOnly+Secure+SameSite, CSRF/Origin, bcrypt, Zod và kiểm tra membership đều được thực thi ở backend. Xem APItests cho trường hợp403/404.

Backend/Nginx read-only, cap_dropALL, no-new-privileges; volume chỉ cho log/data cần ghi. PostgreSQL entrypoint, one-shot chown/cert và cAdvisor có nhu cầu root riêng, **không tuyên bố mọi container non-root**. cAdvisor không privileged mặc định nhưng đọc host mounts/Docker socket; giữ nội bộ và kiểm tra Docker Desktop thực. Không công khai công cụ quản trị ra Internet.

## Kiểm thử

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\acceptance.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```
`test.ps1`: isolated PGlite trong test container; không đụng dữ liệu thật. `acceptance.ps1`: gọi backend thật qua mạng Compose, đăng ký QA, tạo/sửa trạng thái/đọc/xóa task. Giữ lại một tài khoản QA và dự án rỗng đã lưu trữ. `verify.ps1`: health, headers, targets. Kiểm tra pgAdmin, dashboard, LogQL và dữ liệu sau restart bằng thao tác ở `docs/DEMO.md`.

Phát triển không Docker, khi đã có PostgreSQL dev và DATABASE_URL:
```powershell
Set-Location backend
npm ci
npm run build
npm run migrate
npm test
```
Không đặt `TEST_DATABASE_URL` vào database cá nhân: test này yêu cầu database **kiểm thử biệt lập** đã migrate. Mặc định test dùng PGlite tạm. E2E QA tự chạy app với PGlite và production frontend, không chứng nhận Docker:
```powershell
Set-Location ..\frontend
npm ci
npx playwright install chromium
npm run build
Set-Location ..
node .\tests\e2e.mjs
```

## Backup, restore và vận hành

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
docker compose stop
docker compose start
# Hoặc hạ container/network, giữ dữ liệu:
docker compose down
docker compose up -d
```
Backup dùng custom pg_dump rồi composecp, tránh redirect file nhị phân bằng PowerShell5.1. Backup chứa hash mật khẩu và dữ liệu: không commit/chia sẻ tùy tiện. Restore thay dữ liệu hiện tại, chỉ sau khi backup:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore.ps1 -BackupFile .\backups\TEN_FILE.dump -ConfirmReplaceTaskFlow
```
Gia hạn TLS sau365ngày chỉ sửa volume chứng chỉ, không xóa volume DB:
```powershell
docker compose stop nginx
docker compose run --rm --entrypoint sh cert-init -ec 'rm -f /certs/server.key /certs/server.crt'
docker compose run --rm cert-init
docker compose up -d nginx
```
Không chạy `docker system prune -a --volumes` vì có thể ảnh hưởng dự án khác. Dùng `docker system df`, kiểm kích thước volume và backup trước dọn dẹp.

## GitHub và ba commit thật

Dự án mới chưa push lên GitHub. Ba commit thật được giữ trong `repository.bundle`, không có `.git` trong ZIP. Khôi phục lịch sử sang thư mục mới:
```powershell
git clone .\repository.bundle ..\DTC245200410-Git
Set-Location ..\DTC245200410-Git
git log --oneline --reverse
git remote remove origin
```
Sau khi bạn tạo repository GitHub mới, lấy URL HTTPS thật, đăng nhập qua Git Credential Manager trên Windows; không gửi token vào chat:
```powershell
$TaskFlowRepoUrl = Read-Host 'URL HTTPS repository GitHub moi'
git remote add origin $TaskFlowRepoUrl
git push -u origin main
```
Kiểm `.env` bị ignore bằng `git check-ignore .env`; không in `.env` để chụp minh chứng. Không pushforce lên repo cũ. Author kỹ thuật của bundle không giả danh sinh viên; trước commit tiếp theo cấu hình user.name/email của bạn. Ba mốc: Nginx triển khai; Prometheus/Grafana; Loki/Promtail và hardening. Mở docs/GIT_HISTORY.md để đối chiếu.

## Lỗi thường gặp

| Hiện tượng | Kiểm tra và cách xử lý |
|---|---|
| Docker không chạy | `docker info`; mở Docker Desktop, Linux containers, chờ Engine ready |
| Cổng bị chiếm | Get-NetTCPConnection; đổi đúng biến port rồi up-d, không dừng dự án khác |
| Container restart | `docker compose logs --tail=100 TEN_SERVICE`; đọc lỗi đầu tiên, không chỉ restart liên tục |
| Migration lỗi | logs migrate/postgres; giữ nguyên volume/secret; kiểm role và migrationfile |
| Nginx502/504 | logs backend/nginx, backendhealth; sau recreate backend có thể cần restartnginx để refreshDNS |
| pgAdmin không kết nối | Host phải là postgres, port5432, owner/taskflow DB/password đúng .env lần init |
| Origin/CSRF403 | Dùng https://localhost:HTTPS_PORT, tải lại/đăng nhập lại; không tắt bảo vệ để sửa lỗi |
| TargetDOWN | Xem lastError ở /targets, logs exporter, hostname/network và pg_up/nginx_up |
| cAdvisor không có series | logs cadvisor, DockerDesktop/ECI/hostmount; không tự bật privileged nếu chưa đánh giá |
| Dashboard trống | Chọn Last30minutes, đợi2scrape, traffic, đúng project/DBvariable và datasource |
| Loki không có log | Last15minutes, kiểm nhãn/file/quyền, logs promtail/loki; xem LOGQL.md |
| Đổi mật khẩu.env không có hiệu lực | Role/adminuser cũ nằm trong volume; dùng quy trình đổi mật khẩu thật, không xóa dữ liệu |
| Thiếu RAM/ổ đĩa | DockerDesktopresources, `docker stats`, `docker system df`; dừng projectkhác bằng compose riêng nếu cần |
| Dữ liệu mất sau down-v | Restore backup có sẵn; không thể hứa phục hồi nếu không có backup |

## Tình trạng bàn giao

Xem `docs/TESTING.md` và `docs/RUBRIC.md`. PASS phải gắn đúng môi trường; static syntax/manifest không phải build/run Docker. Ảnh UI trong docs/evidence là ảnh Chromium thật của bản QA HTTP + Prisma/PGlite trong Work; chưa thay thế ảnh DockerDesktop, pgAdmin, TargetsUP, Grafana hoặc LogQL từ máy bạn.
