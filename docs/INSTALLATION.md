# Hướng dẫn cài đặt và vận hành TaskFlow

Tài liệu dành cho người mới chạy TaskFlow trên Windows bằng Docker Desktop và PowerShell. Thực hiện theo thứ tự; mọi lệnh mặc định chạy tại thư mục có docker-compose.yml. Ví dụ dưới đây dùng D:\DoAn\DTC245200410. Nếu giải nén ở nơi khác, thay đường dẫn gốc theo máy của bạn.

Dự án này hoàn toàn độc lập với repository cũ. Tên project taskflow_dtc245200410_new và các cổng được chọn riêng để hạn chế va chạm. Chưa có truy cập vào máy cá nhân nên cần kiểm tra cổng và tài nguyên thực tế trước khi chạy. Không reset Docker Desktop hoặc xóa volume của dự án khác.

## Phần 1 Chuẩn bị môi trường

### 1.1 Kiểm tra các công cụ đã cài

Mở Docker Desktop và chờ Engine running. Bảo đảm dùng Linux containers với WSL2. Nếu menu hiện Switch to Linux containers thì chọn mục đó. Docker đang phục vụ một bài khác vẫn có thể chạy TaskFlow song song nếu cổng và tài nguyên không xung đột.

Bạn đã cung cấp Windows 11, Docker 29.8.0, Compose 5.5.1, Git 2.53.0, Node.js 22.23.2, npm 10.9.8 và VS Code 1.142.0. Không cần cài lại khi kiểm tra cho thấy công cụ hoạt động. Mở PowerShell rồi chạy:

```powershell
docker --version
docker compose version
docker info
git --version
node --version
npm --version
wsl --status
```

docker info phải có phần Server. Nếu chỉ có Client hoặc báo lỗi kết nối daemon, mở Docker Desktop và chờ trước khi chạy tiếp. Node/npm và Git trên Windows cần cho phát triển hoặc push code; chỉ Docker Desktop/Compose là bắt buộc để khởi chạy stack.

### 1.2 Thành phần chạy trong container

Không cài riêng PostgreSQL, pgAdmin, Nginx, Prometheus, Grafana, Loki hoặc Promtail lên Windows. Compose đã khai báo các dịch vụ này. Node chạy backend và build frontend cũng nằm trong image. Python trên Windows không bắt buộc để vận hành dự án.

Nếu thật sự thiếu công cụ, tải từ nguồn chính thức: Docker Desktop tại https://docs.docker.com/desktop/setup/install/windows-install/ ; WSL tại https://learn.microsoft.com/windows/wsl/install ; Git tại https://git-scm.com/downloads/win ; VS Code tại https://code.visualstudio.com/ ; Node tại https://nodejs.org/en/download . Không dùng installer từ nguồn không rõ.

Máy đã khai báo RAM 16 GB và khoảng 80 GB trống. Chọn ổ còn đủ chỗ, ưu tiên đường dẫn ngắn trên ổ D. Source đặt ở D không tự chuyển data disk của Docker Desktop khỏi C. Kiểm tra vị trí lưu và giới hạn tài nguyên trong Settings nếu ổ hệ thống ít chỗ; không tự di chuyển file đĩa WSL khi Docker đang chạy.

## Phần 2 Giải nén và chuẩn bị dự án

### 2.1 Mở đúng thư mục gốc

Tải DTC245200410.zip, chọn Extract All và giải nén vào D:\DoAn. Mở thư mục DTC245200410 trong VS Code bằng File → Open Folder, sau đó Terminal → New Terminal và chọn PowerShell.

```powershell
Set-Location D:\DoAn\DTC245200410
Get-Location
Get-ChildItem
Test-Path .\docker-compose.yml
code .
```

Test-Path phải trả True. Danh sách cần có backend, frontend, scripts, database, nginx, monitoring, logging, docker-compose.yml và .env.example. Nếu chỉ có một thư mục DTC245200410 khác bên trong, đi vào thư mục con đó rồi kiểm lại. Nếu lưu file bằng Save As, bảo đảm tên không bị thêm đuôi .txt.

### 2.2 Tạo .env và mật khẩu cục bộ

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init.ps1
Test-Path .\.env
code .\.env
```

init.ps1 đọc cấu trúc .env.example, sinh tám mật khẩu ngẫu nhiên độc lập dạng hex 64 ký tự và tạo .env UTF-8. Script không in mật khẩu, không ghi đè file đã có. Không chỉ sao chép .env.example rồi chạy ngay vì các giá trị GENERATE_WITH_INIT_SCRIPT vẫn là placeholder.

Đọc tài khoản ban đầu trong .env bằng VS Code riêng tư; không chia sẻ hoặc chụp file này. Giữ dạng hex do script sinh để tránh ký tự dành riêng trong URL database. Không thêm dấu nháy hoặc khoảng trắng quanh secret tùy tiện. Sau lần init đầu, đổi mật khẩu trong .env không tự sửa role hay user đã nằm trong database.

Các biến chính: COMPOSE_PROJECT_NAME=taskflow_dtc245200410_new; POSTGRES_DB=taskflow; HTTP_PORT=8088; HTTPS_PORT=8448; PGADMIN_PORT=5058; GRAFANA_PORT=3008; PROMETHEUS_PORT=9098. POSTGRES_PASSWORD dùng cho taskflow_owner; MIGRATE_DB_PASSWORD cho migration; APP_DB_PASSWORD cho backend; MONITOR_DB_PASSWORD cho exporter.

PGADMIN_EMAIL mặc định admin@example.com, đi với PGADMIN_PASSWORD. Grafana dùng GRAFANA_ADMIN_USER=admin và GRAFANA_ADMIN_PASSWORD. Ứng dụng dùng ADMIN_EMAIL=admin@taskflow.local và ADMIN_INITIAL_PASSWORD. Hai tài khoản member/viewer dùng DEMO_PASSWORD. Tám mật khẩu đều do init sinh, không có mật khẩu cố định trong README.

### 2.3 Kiểm tra cổng trước khi chạy

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 8088,8448,5058,3008,9098 | Select-Object LocalAddress,LocalPort,OwningProcess
```

Nếu không có dòng nào, chưa có listener trên các cổng được kiểm tại thời điểm đó. Nếu có, xác định tiến trình theo PID hoặc đổi đúng biến port trong .env. Không tắt tiến trình chưa rõ nguồn. Ví dụ HTTPS_PORT=8458 thì web dùng https://localhost:8458; Origin backend và redirect Nginx cũng được cập nhật theo biến này khi recreate.

Luôn dùng hostname localhost cho website. 127.0.0.1 khác Origin đã cấu hình nên thao tác ghi có thể bị 403 dù chứng chỉ có SAN tương ứng. Không tắt CSRF hoặc Origin để sửa lỗi truy cập sai URL. Các công cụ quản trị cũng chỉ bind 127.0.0.1, phù hợp phạm vi local.

## Phần 3 Khởi động toàn bộ hệ thống

### 3.1 Kiểm cấu hình và build image

```powershell
docker compose config --quiet
docker compose build
```

config --quiet thành công thường không in gì và trả mã 0. Nếu báo thiếu biến, kiểm .env đúng thư mục. Không dùng output docker compose config đầy đủ để chụp minh chứng vì secret có thể đã được nội suy vào đó.

Build lần đầu cần Internet để tải image và dependency qua npm ci. Thời gian phụ thuộc mạng và cache. Nếu tag tải thất bại, đọc chính xác tên image/tag; không đổi sang latest để bỏ qua. Nếu lỗi TypeScript, đọc file và dòng được báo. Phiên bản trong package.json/lockfile được pin để tái tạo build.

### 3.2 Chạy và kiểm tra thứ tự khởi động

```powershell
docker compose up -d
docker compose ps -a
docker compose logs --tail=100 migrate
docker compose logs --tail=100 backend nginx
```

PostgreSQL cần healthy trước migrate. Migration và seed phải thành công trước backend; backend healthy trước Nginx. permissions và cert-init chuẩn bị volume/TLS. Trong ps -a, migrate, permissions, cert-init có trạng thái Exited (0) là bình thường vì đây là tác vụ một lần. Dịch vụ dài hạn cần Up; dịch vụ có healthcheck cần healthy.

Nếu backend chưa chạy vì migrate thất bại, đọc log migrate/postgres trước, không sửa Nginx để xử lý triệu chứng. Container restart liên tục hoặc Exited khác 0 cần được chẩn đoán từ log đầu tiên. Lệnh gộp cho các lần sau là:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Script start kiểm Engine, cấu hình và chạy build/up; không xóa dữ liệu. Khi chỉ cần áp dụng port/config mới, docker compose up -d sẽ recreate những dịch vụ cần đổi. Không chỉnh tên project sau khi đã có dữ liệu nếu chưa hiểu ảnh hưởng đến volume.

## Phần 4 Truy cập các dịch vụ

Website: https://localhost:8448. HTTP http://localhost:8088 phải chuyển sang HTTPS. pgAdmin: http://localhost:5058. Grafana: http://localhost:3008. Prometheus: http://localhost:9098/targets. Nếu đã đổi biến port thì thay URL tương ứng.

PostgreSQL dùng postgres:5432 trong Docker, không có cổng host. Backend, Loki, Promtail, exporters và cAdvisor cũng chỉ nội bộ. Không mở cổng hoặc tạo rule firewall để truy cập trực tiếp backend/DB khi mục đích vẫn là demo local.

Ứng dụng có admin theo ADMIN_EMAIL với ADMIN_INITIAL_PASSWORD; member@taskflow.local và viewer@taskflow.local dùng DEMO_PASSWORD. Không lấy chuỗi QA trong test để đăng nhập Compose. Người dùng có thể tự đăng ký; tài khoản mới chưa thuộc dự án sẽ không tự thấy dự án nhóm của người khác.

Seed tạo ba tài khoản, hai dự án và mười task. Deadline được tính tương đối tại lần seed đầu; seed lại không đẩy ngày, reset quyền hoặc ghi đè mật khẩu đã đổi. Sau lần đăng nhập đầu nên đổi mật khẩu admin trong Cài đặt tài khoản. ADMIN_INITIAL_PASSWORD trong .env chỉ còn là giá trị khởi tạo cũ sau khi đổi qua giao diện.

## Phần 5 Database và pgAdmin

### 5.1 Kiểm PostgreSQL và migration

```powershell
docker compose ps postgres
docker compose logs --tail=100 postgres migrate
docker compose run --rm migrate
```

Lệnh cuối áp dụng migration còn thiếu rồi seed có kiểm soát. Bootstrap database/01-roles.sh chỉ tự chạy khi volume PostgreSQL trống. Sửa script bootstrap không tự thay role của volume cũ. Không tạo bảng bằng tay để bỏ qua migration lỗi.

Nếu authentication failed, đối chiếu đúng role và secret tại lần init. Nếu migration SQL lỗi, xác định migration gây lỗi, backup trước khi sửa và không thay checksum của migration đã áp dụng tùy tiện. Không dùng down -v để làm sạch nếu có dữ liệu cần giữ.

### 5.2 Đăng ký server trong pgAdmin

Mở pgAdmin, đăng nhập bằng PGADMIN_EMAIL và PGADMIN_PASSWORD. Ở Servers, bấm phải → Register → Server. Tab General đặt Name=TaskFlow Local. Tab Connection điền Host name/address=postgres, Port=5432, Maintenance database=taskflow, Username=taskflow_owner, Password=POSTGRES_PASSWORD. Nếu đã đổi POSTGRES_DB thì dùng đúng tên đó.

postgres là hostname của service trong mạng data. localhost bên trong pgAdmin là chính container pgAdmin, không phải PostgreSQL hoặc Windows. Đây là nguyên nhân thường gặp khi nhập đúng mật khẩu nhưng connection refused. Không chụp ô mật khẩu trong minh chứng.

Sau Save, mở Databases → taskflow → Schemas → public → Tables để thấy các bảng nghiệp vụ và bảng quản lý migration của Prisma. Bấm phải database → Query Tool và chạy:

```sql
SELECT "number","title","status","priority","dueAt"
FROM "Task" ORDER BY "number";
SELECT rolname,rolsuper,rolcreatedb,rolcreaterole
FROM pg_roles WHERE rolname LIKE 'taskflow_%';
SELECT has_schema_privilege('taskflow_app','public','CREATE');
```

Kỳ vọng taskflow_app không có superuser/createdb/createrole và CREATE schema trả false. Tên bảng/cột chữ hoa cần dấu nháy kép. Sau kéo một task trên Kanban, query lại đúng number và status để chứng minh dữ liệu UI đã lưu vào DB.

### 5.3 Backup và restore

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
Get-ChildItem .\backups
```

Backup dùng pg_dump dạng custom trong container rồi compose cp ra Windows. Không dùng dấu > để redirect dump nhị phân trong Windows PowerShell 5.1. Giữ file .dump ở nơi an toàn; backup có hash mật khẩu và dữ liệu nên không đưa vào Git hoặc chia sẻ tùy tiện.

Restore dưới đây thay dữ liệu TaskFlow hiện tại. Chỉ thực hiện sau khi backup và xác nhận đúng file. Script dừng backend trong lúc restore rồi start lại. Nếu lỗi, đọc output và kiểm database trước khi tiếp tục; không thể bảo đảm phục hồi dữ liệu đã xóa khi không có backup.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore.ps1 -BackupFile .\backups\TEN_FILE.dump -ConfirmReplaceTaskFlow
```

## Phần 6 Nginx và HTTPS

### 6.1 Chứng chỉ và reverse proxy

cert-init tạo chứng chỉ RSA 3072 bit, hạn 365 ngày, trong volume tls_data. SAN có localhost và 127.0.0.1. Nginx đọc khóa riêng ở chế độ read only; khóa không nằm trong ZIP/Git. Không cần cài OpenSSL riêng trên Windows.

Mở https://localhost:8448. Trình duyệt có thể cảnh báo vì không tin chứng chỉ tự ký. Chọn Nâng cao → Tiếp tục chỉ khi đã xác nhận đúng localhost của bài demo. Không tắt kiểm tra chứng chỉ cho mọi website hoặc nhập mật khẩu trên một website lạ có cảnh báo.

```powershell
docker compose exec nginx nginx -t
curl.exe -k -I http://localhost:8088
curl.exe -k -I https://localhost:8448
curl.exe -k https://localhost:8448/health
```

HTTP phải redirect; HTTPS có phản hồi, /health trả status ok. nginx -t phải xác nhận syntax và configuration test successful. Nếu 502, kiểm backend health, dependency và logs; 504 thường liên quan timeout đến upstream.

### 6.2 Headers và giới hạn cổng

Tìm X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: same-origin và Content-Security-Policy trong output HTTPS. Không bật HSTS cho localhost tự ký là lựa chọn có chủ đích. /metrics qua Nginx phải trả 404 vì Prometheus chỉ scrape endpoint nội bộ.

```powershell
docker compose port backend 4000
docker compose port postgres 5432
docker compose logs --tail=100 backend nginx
```

Hai lệnh port không trả published mapping; mã thoát khác 0 ở phép kiểm này có thể là kết quả mong đợi. Khi recreate backend làm đổi IP, Nginx có thể cần restart để phân giải lại service name. Không publish backend để né lỗi reverse proxy.

```powershell
docker compose restart nginx
```

## Phần 7 Prometheus và Grafana

### 7.1 Kiểm bảy scrape targets

Mở http://localhost:9098/targets sau khi stack sẵn sàng. Chờ ít nhất 30–60 giây. Cần bảy job backend, nginx, postgres, containers, prometheus, loki, promtail. Nếu DOWN, mở lastError để phân biệt connection refused, timeout, HTTP sai hoặc lỗi parse.

Ở trang Query, chạy từng biểu thức sau. up bằng 1 chỉ chứng minh scrape endpoint được, cần kiểm pg_up/nginx_up bằng 1 và có series container thực. Exporter có thể trả metrics HTTP trong khi kết nối đến nguồn lỗi.

```promql
up
pg_up
nginx_up
container_memory_working_set_bytes
sum(rate(taskflow_http_requests_total[2m]))
```

### 7.2 Datasource và dashboard provision

Mở Grafana 3008, đăng nhập GRAFANA_ADMIN_USER/GRAFANA_ADMIN_PASSWORD. Vào Connections → Data sources để thấy Prometheus và Loki đã provision. Các datasource được quản lý bằng file, không cần tự tạo lại trên UI.

Mở Dashboards → TaskFlow → TaskFlow Hệ thống, chọn Last 30 minutes, refresh 15s. Dashboard có 12 panel cho HTTP, lỗi 5xx, p95 latency, process memory, CPU/RAM container, kết nối/commit database và Nginx. Tạo traffic rồi đợi ít nhất hai lần scrape để các hàm rate có dữ liệu:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-traffic.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

Nếu đổi COMPOSE_PROJECT_NAME hoặc POSTGRES_DB, chỉnh hai textbox Compose project/Database trên dashboard. Nếu panel trống, kiểm datasource, thời gian, target, tên metric và bộ lọc trước khi sửa query. Không thay bằng số liệu hard-code để biểu đồ có hình.

CPU container có thể trên 100% khi dùng nhiều core; RAM working set khác bộ nhớ riêng tiến trình Node. cAdvisor trên Docker Desktop đo Linux VM/containers, không đo đầy đủ Windows host. Bản này không bật Node Exporter rồi gọi đó là metrics Windows. Các giới hạn này cần được giải thích khi demo.

## Phần 8 Loki Promtail và LogQL

### 8.1 Kiểm nguồn log

```powershell
docker compose logs --tail=100 loki promtail
docker compose exec backend sh -c 'ls -l /logs'
docker compose exec nginx sh -c 'ls -l /logs'
powershell -ExecutionPolicy Bypass -File .\scripts\generate-traffic.ps1
```

Backend ghi backend.log JSON, Nginx ghi access.log JSON và error.log văn bản. Promtail đọc named volume read only, lưu offsets riêng. Script traffic gửi request chưa đăng nhập để sinh 401 thật và không sửa database. Đăng nhập/CRUD trên web để bổ sung log thành công 200/201.

Mở Grafana → Explore → chọn Loki → Last 15 minutes → chế độ Code. Dán một query mỗi lần rồi Run query; chờ khoảng 30 giây sau tạo traffic. Log không chứa password, body, cookie hoặc CSRF; không thêm secret vào URL khi thử nghiệm.

### 8.2 Ba truy vấn chính

```logql
{job="taskflow", service="nginx"}
```

Query thứ nhất xem access log Nginx. Mở một dòng để xem time, method, uri, status và request_time. Nhãn service phải đúng pipeline, không tự thay thành tên nhãn container chưa được tạo.

```logql
{job="taskflow", service="nginx"} | json | status >= 400
```

Query thứ hai parse JSON rồi lọc status từ 400. status là field trong dòng log, không phải stream label. Request 401 từ script là dữ liệu kiểm tra phù hợp khi hệ thống không phát sinh 5xx.

```logql
{job="taskflow", service="backend", level=~"warn|error"}
```

Query thứ ba lọc backend theo nhãn level. Query 5xx có thể rỗng khi không có lỗi; không kết luận Loki hỏng chỉ vì không có 5xx. Error log Nginx dạng văn bản nên dùng line filter, xem docs/LOGQL.md để sao chép.

Nếu không có log, kiểm khoảng thời gian, đồng hồ máy, nhãn, file được ghi và quyền volume. Promtail UID1000 có supplementary group101 để đọc Nginx UID101; không chmod777 để sửa nhanh. Promtail đã EOL từ 02/03/2026; bản local giữ nguyên yêu cầu đề bài, không tự chuyển Alloy.

## Phần 9 Kiểm tra hardening

Chạy id ở backend/nginx để thấy UID1000/101. Kiểm published port để xác nhận không có backend4000/PostgreSQL5432. Dùng Query Tool kiểm app role và quyền CREATE schema. Dùng curl qua Nginx để kiểm headers. Mở API tests hoặc thực hiện request thiếu CSRF/Origin để nhận 403.

```powershell
docker compose exec backend id
docker compose exec nginx id
docker compose port backend 4000
docker compose port postgres 5432
curl.exe -k -I https://localhost:8448
```

Backend/Nginx được read_only, cap_drop ALL, no-new-privileges. Chỉ volume cần thiết được ghi. Không khẳng định mọi container đều non-root: bootstrap PostgreSQL, permissions, cert-init và cAdvisor có nhu cầu quyền riêng. cAdvisor không privileged mặc định nhưng đọc host mounts/Docker socket nội bộ; nếu Docker Desktop/ECI chặn, đọc log và đánh giá tương thích trước khi nâng quyền.

Không chụp docker inspect toàn bộ vì environment có secret. Nếu cần chỉ lấy thuộc tính đang kiểm. Sau clone Git, kiểm .env bị ignore; không in mật khẩu để chứng minh độ dài. Giữ Grafana, Prometheus và pgAdmin ở localhost, không đổi bind sang công khai trong phạm vi đề tài này.

## Phần 10 Kiểm thử website

### 10.1 Tài khoản và dashboard

Đăng nhập admin, xem tổng task, bốn trạng thái và công việc quá hạn. Đăng xuất rồi thử mật khẩu sai để kiểm thông báo. Đăng ký tài khoản mới trong cửa sổ khác; tài khoản đó chưa có membership không được tự xem dự án nhóm. Đổi tên trong Cài đặt, reload và kiểm tên mới. Đổi mật khẩu phải thu hồi các phiên và yêu cầu đăng nhập lại.

### 10.2 Dự án và thành viên

Tạo một dự án TEAM và một PERSONAL. Ở TEAM, tab Thành viên & nhãn thêm email đã đăng ký, chọn MEMBER hoặc VIEWER. Thử đổi quyền và xóa thành viên, kiểm các task của người bị xóa được bỏ phân công. OWNER không bị xóa/hạ quyền. PERSONAL không cho thêm người. Lưu trữ/khôi phục dự án và kiểm dữ liệu vẫn giữ.

### 10.3 Tạo sửa task và phân công

Tạo task QA với tiêu đề, mô tả, ưu tiên, ngày bắt đầu, deadline, assignee và nhãn. Mở chi tiết → Chỉnh sửa, thay tiêu đề rồi lưu. Đặt ngày bắt đầu sau deadline để kiểm lỗi, sau đó sửa hợp lệ. Assignee/nhãn phải thuộc đúng dự án. Đặt deadline quá khứ cho task chưa DONE để thấy ở Quá hạn.

### 10.4 Kanban checklist và bình luận

Kéo task bằng tay nắm sang Chờ duyệt, đợi toast đã lưu, reload và xác nhận cột mới. Mở chi tiết, đổi trạng thái bằng select để kiểm cách thay thế kéo thả. Thêm checklist, đánh dấu, tải lại và kiểm. Gửi bình luận, xem lịch sử. Chỉ xóa task khi đã kiểm xong vì xóa không hoàn tác.

### 10.5 Tìm kiếm lọc lịch và My Tasks

Tìm theo tiêu đề vừa tạo, lọc trạng thái/ưu tiên và assignee/label trong dự án. Đổi sort theo deadline hoặc ưu tiên, kiểm phân trang khi đủ dữ liệu. My Tasks chỉ hiện công việc được giao cho người hiện tại. Lịch tháng hiện task có deadline trong tháng; thử tháng trước/sau/Hôm nay. Xóa filter trước khi kết luận task mất.

### 10.6 Phân quyền và thu hồi quyền

Đăng nhập viewer bằng cửa sổ riêng. Viewer được đọc nhưng không ghi; gọi write trực tiếp với cookie/CSRF của viewer vẫn phải 403. Dùng tài khoản chưa tham gia dự án mở link task phải 404. Không dùng cookie admin cho phép kiểm viewer. Sau xóa membership hoặc khóa tài khoản, kiểm lại để thấy quyền/phiên đã bị thu hồi.

### 10.7 Dữ liệu sau restart và kiểm thử tự động

Tạo task có tên minh chứng, ghi mã, restart backend rồi reload để kiểm task còn. Có thể stop/start stack và kiểm lại khi vẫn giữ volume. Dùng request401 hoặc400 để đối chiếu log, không xóa volume hoặc dừng DB nhằm cố tạo lỗi500 trong buổi demo.

```powershell
docker compose restart backend
powershell -ExecutionPolicy Bypass -File .\scripts\test.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\acceptance.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

test.ps1 chạy 14 test trong PGlite biệt lập, không đụng dữ liệu thật. acceptance.ps1 gọi backend thật qua mạng Compose, tạo QA user/project/task, đổi status, đọc rồi xóa task; để lại một tài khoản QA và dự án rỗng đã lưu trữ. verify.ps1 kiểm health/headers/targets. Các script không thay thế toàn bộ phép kiểm thủ công.

Ảnh UI trong ZIP đã chụp thật ở Work HTTP/PGlite. Bổ sung ảnh Docker Desktop, pgAdmin, Grafana, Targets và LogQL theo docs/evidence/README.md trước nộp. Chỉ gắn PASS khi có bằng chứng trong đúng môi trường.

## Phần 11 Git và GitHub

### 11.1 Khôi phục lịch sử từ bundle

ZIP không có .git. repository.bundle bảo toàn ba commit thật của dự án mới. Clone từ bundle sang thư mục khác, không clone đè repo cũ. Xem log rồi bỏ origin local để chuẩn bị repository GitHub mới.

```powershell
git clone .\repository.bundle ..\DTC245200410-Git
Set-Location ..\DTC245200410-Git
git log --oneline --reverse
git status
git remote remove origin
```

Ba mốc là triển khai PostgreSQL/Nginx, thêm Prometheus/Grafana, rồi logging/hardening. Commit có nội dung thật. Author build kỹ thuật không giả danh sinh viên; cấu hình user.name/email của bạn trước các commit bổ sung. Không xóa lịch sử hoặc force push repo cũ.

### 11.2 Tạo repo mới và push

Trên GitHub tạo repository mới theo tên DTC245200410 hoặc tên được giảng viên chấp nhận. Đối chiếu yêu cầu tài khoản theo mã sinh viên nếu username hiện tại có hậu tố. Repo mới nên rỗng, không tự thêm README/license vì bundle đã có lịch sử.

Copy URL HTTPS thật. Git Credential Manager xử lý đăng nhập trên Windows, không gửi token vào chat hoặc terminal đang chia sẻ màn hình. Chỉ push sau khi kiểm remote đúng repo mới.

```powershell
$TaskFlowRepoUrl = Read-Host 'URL HTTPS repository moi'
git remote add origin $TaskFlowRepoUrl
git remote -v
git push -u origin main
git log --oneline
git check-ignore .env
```

Sau push mở GitHub, kiểm source/config/README, tab Commits có ba mốc và không có .env/key. Tạo .env riêng bằng init nếu chạy từ clone. Không commit secret. Chưa có tuyên bố dự án đã push lên GitHub trong bản bàn giao này.

## Phần 12 Khắc phục lỗi

Docker không chạy: dùng docker info, mở Docker Desktop và chờ Engine. Cổng bị chiếm: Get-NetTCPConnection, đổi đúng port .env, up -d. Container restart: logs --tail=100 tên service, đọc lỗi đầu tiên. Không restart liên tục mà bỏ qua nguyên nhân.

Database chưa sẵn sàng: kiểm ps/logs postgres, dung lượng và health. Migration lỗi: logs migrate, đúng role/secret/schema; backup trước sửa. pgAdmin connection refused: dùng host postgres và port 5432. Authentication failed: dùng đúng mật khẩu lúc init, không chỉ giá trị vừa sửa trong .env.

Website không mở: kiểm URL HTTPS/port, backend/nginx và /health. Nginx502/504: xem upstream health và timeout. Origin/CSRF403: đúng https://localhost:HTTPS_PORT, đăng nhập/tải lại; không tắt bảo vệ. TargetDOWN: đọc lastError, hostname/network/port và log exporter.

Grafana trống: datasource, time range, số sample, traffic và variable project/DB. Loki không log: nhãn, thời gian, file/quyền volume và logs promtail/loki. cAdvisor thiếu series: kiểm host mounts/cgroup/ECI; không dùng biểu đồ giả hoặc tự nâng privileged để làm target xanh.

Dung lượng Docker tăng: docker system df, backup rồi dọn đúng tài nguyên dự án. Thiếu RAM: docker stats, giới hạn Docker Desktop hoặc dừng project khác bằng Compose riêng. Dữ liệu mất sau xóa volume: restore backup nếu có; không thể hứa khôi phục khi chưa có backup.

```powershell
docker compose logs --tail=100 TEN_SERVICE
docker stats
docker system df
```

Khi cần hỗ trợ, cung cấp bước, lệnh và phần lỗi liên quan đã che secret. Không gửi toàn bộ .env, config đã nội suy hoặc inspect Environment. Không dùng reset Docker, prune toàn hệ thống hoặc down -v làm giải pháp đầu tiên.

## Phần 13 Tắt khởi động lại và giữ dữ liệu

### 13.1 Lệnh thường dùng

```powershell
docker compose stop
docker compose start
docker compose restart backend
docker compose down
docker compose up -d
docker volume ls
```

stop giữ container/network/volume; start dùng lại container đã dừng. restart backend chỉ tác động service đó. down thông thường xóa container/network nhưng giữ named volume; up -d tạo lại dịch vụ và gắn dữ liệu cũ. Volume của TaskFlow có prefix theo project mới, không dùng chung dự án trước.

Đổi COMPOSE_PROJECT_NAME sau khi đã có dữ liệu khiến Compose dùng tập volume khác, có thể tạo cảm giác dữ liệu bị mất. Kiểm project/volume trước khi kết luận hoặc xóa. Backup trước đổi tên project, schema, role hoặc restore.

### 13.2 Thao tác phá hủy và gia hạn TLS

Lệnh down -v xóa volume của project; system prune --volumes có thể ảnh hưởng nhiều dự án. Đây không phải lệnh dừng thường ngày. Nếu chỉ gia hạn chứng chỉ hết365ngày, chỉ xóa cặp cert trong tls_data và chạy lại cert-init, không xóa postgres_data.

```powershell
docker compose stop nginx
docker compose run --rm --entrypoint sh cert-init -ec 'rm -f /certs/server.key /certs/server.crt'
docker compose run --rm cert-init
docker compose up -d nginx
```

Sau khởi động lại kiểm ps -a, health, dữ liệu và targets trước demo. Đọc docs/DEMO.md cho kịch bản15 phút và docs/RUBRIC.md để đối chiếu tiêu chí. Giữ BLOCKED/NOT RUN cho những mục chưa kiểm chứng; không nâng trạng thái chỉ vì đã có file cấu hình.

## Tài liệu kèm theo

README.md tóm tắt lệnh và cấu hình cuối cùng. ARCHITECTURE.md ghi quyết định và giới hạn. API.md liệt kê endpoint/quyền. LOGQL.md có query sao chép. TESTING.md ghi môi trường/kết quả. evidence/README.md liệt kê ảnh cần chụp và vị trí chèn báo cáo. Các tài liệu nằm trong docs của ZIP.
