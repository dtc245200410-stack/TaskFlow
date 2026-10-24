# Thu thập minh chứng trên máy cá nhân

Sau `.\runall`, xác nhận migration hoàn tất và các trang hoạt động. Lưu ảnh thật vào thư mục này. Mỗi ảnh nên rõ URL/lệnh, khoảng thời gian, tên project và dữ liệu được kiểm tra. Mật khẩu, token, cookie và nội dung `.env` không xuất hiện trong ảnh.

| Mã | Ảnh cần chụp | Điều kiện kiểm tra |
|---|---|---|
| WIN01 | Docker Desktop cùng `docker compose ps -a` | Đúng TaskFlow project, one-shot Exited (0), healthcheck đạt |
| WIN02 | Website https://localhost:8448 | Task demo sau tạo/đổi trạng thái, reload vẫn còn |
| WIN03 | pgAdmin Query Tool | Cùng mã task và dữ liệu title/status/dueAt |
| WIN04 | Prometheus /targets và Query | Bảy job UP, pg_up/nginx_up bằng 1, có series container |
| WIN05 | Grafana TaskFlow Hệ thống | Time range, biến project/database, panel HTTP/DB/container có dữ liệu |
| WIN06 WIN07 | Grafana Explore chọn Loki | Ba truy vấn LogQL và dòng kết quả thực |
| WIN08 WIN09 | UID, headers, cổng | Backend 1000, Nginx 101, headers và port mapping đúng |
| WIN10 WIN11 | Phân quyền và restart | API 403/404 đúng role; task còn sau restart |
| WIN12 | GitHub repository mới | Ba commit mốc và các bản sửa có nội dung |

## Lệnh lấy output chữ

Chạy từ thư mục gốc dự án. Kết quả được lưu vào đây để đối chiếu ảnh; các lệnh chỉ đọc trạng thái và health.

```powershell
docker compose ps -a | Out-File -Encoding utf8 .\docs\evidence\windows-local\WIN01_docker.txt
curl.exe -k --fail https://localhost:8448/health
curl.exe --fail http://localhost:3008/api/health
curl.exe --fail http://localhost:9098/-/ready
powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

Các URL trên dùng cổng mặc định; nếu đã đổi cổng thì thay bằng giá trị hiện tại trong `.env`. Tạo traffic, chờ ít nhất hai chu kỳ scrape rồi chụp dashboard:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate-traffic.ps1
```

Chương 4 của báo cáo chứa kịch bản từng bước, bảng điều kiện nghiệm thu và cách đọc số đo. Dùng Windows Shift S để chụp cửa sổ thật, không thay bằng ảnh minh họa hay số liệu tự điền.
