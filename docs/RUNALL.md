# Run All và tự mở tất cả trang web

Mở Docker Desktop, sau đó mở Terminal PowerShell của VS Code tại thư mục chứa `docker-compose.yml`:

```powershell
.\runall
```

Lệnh build và khởi động toàn bộ stack Docker Compose. Database, migration, backend và Nginx tuân theo thứ tự phụ thuộc; không khởi động một dịch vụ trước khi phụ thuộc bắt buộc sẵn sàng. Các dịch vụ tiếp tục chạy trong Docker khi đóng Terminal/trình duyệt.

Sau khi bốn trang trả về healthcheck HTTP thành công, lệnh tự mở các trang bằng trình duyệt mặc định:

| Trang | URL mặc định | Kiểm tra sẵn sàng |
|---|---|---|
| TaskFlow | https://localhost:8448/ | /health qua HTTPS Nginx tới backend/database |
| pgAdmin | http://localhost:5058/ | /misc/ping |
| Grafana | http://localhost:3008/ | /api/health |
| Prometheus | http://localhost:9098/targets | /-/ready |

Nếu đổi cổng trong `.env`, các URL mở ra cũng đổi theo. Biến môi trường của Terminal có ưu tiên cao hơn `.env`, giống Compose. Loki/Promtail/exporters chạy trong mạng Docker; xem log Loki tại Grafana → Explore. Không mở cổng quản trị mới chỉ để có thêm trang web.

Chứng chỉ TaskFlow tự ký: trình duyệt có thể yêu cầu Nâng cao → Tiếp tục đến localhost. Script chỉ bỏ qua kiểm tra chứng chỉ cho yêu cầu healthcheck localhost của nó; không thay đổi cấu hình chứng chỉ của Windows/trình duyệt. Việc mở thành tab hoặc cửa sổ do trình duyệt mặc định quyết định.

## Tùy chọn

```powershell
# Máy cần thêm thời gian khởi động: chờ tối đa 300 giây sau bước Compose.
.\runall -WaitTimeoutSeconds 300
# Chạy đầy đủ dịch vụ và chờ sẵn sàng, không tự mở trình duyệt.
.\runall -NoBrowser
```

Script dùng `curl.exe` có sẵn trên Windows 10/11 để kiểm tra HTTP. Nếu trang chưa sẵn sàng sau thời gian chờ, lệnh báo tên/URL và câu lệnh xem log. Nếu trình duyệt không mở được, vẫn in URL để truy cập bằng tay. Chạy lại `runall` sẽ mở lại bốn trang.

## Cài bản cập nhật vào dự án đã giải nén

Chép các thư mục `scripts`, `backend`, `database`, `docs` và file `runall.bat` từ ZIP bản cập nhật vào thư mục dự án, chọn ghi đè các file trùng. Bản cập nhật không chứa `.env` hay dữ liệu database. Backend/Dockerfile và database/01-roles.sh bao gồm bản sửa OpenSSL/quyền migration trước đó.

Nếu database đã có lỗi P3018/42501 rồi P3009, thực hiện một lần quy trình ở [FIX_MIGRATION.md](FIX_MIGRATION.md). Script Run All không tự sửa hoặc xóa lịch sử migration thất bại. Khi Compose báo lỗi migration, bốn trang chưa được xác nhận sẵn sàng và không tự mở.

## Dừng các dịch vụ

```powershell
docker compose stop
```

Các tài khoản/mật khẩu tiếp tục dùng giá trị trong `.env` và dữ liệu hiện có.
