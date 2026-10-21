# Loki và LogQL

Chạy scripts/generate-traffic.ps1 để tạo HTTP 401 thật; thao tác đăng nhập và CRUD trong web để có log 200/201. Đợi 30 giây. Mở Grafana http://localhost:3008, đăng nhập bằng .env local, Explore > datasource Loki > Last 15 minutes > chế độ Code > Run query.

1. Access log Nginx:
```logql
{job="taskflow", service="nginx"}
```
2. HTTP lỗi từ Nginx, định dạng JSON có status số:
```logql
{job="taskflow", service="nginx"} | json | status >= 400
```
3. API bị từ chối hoặc lỗi backend:
```logql
{job="taskflow", service="backend", level=~"warn|error"}
```
4. Riêng HTTP 5xx (có thể rỗng nếu hệ thống không phát sinh lỗi):
```logql
{job="taskflow", service="backend"} | json | status >= 500
```
5. Error log Nginx là văn bản, không dùng parser JSON:
```logql
{job="taskflow", service="nginx-error"} |= "error"
```
Ba truy vấn đầu là kịch bản nghiệm thu chính. Kết quả rỗng của query 5xx không phải bằng chứng Loki lỗi. Đối chiếu job/service trong logging/promtail.yml; không tự đặt nhãn container_name khi pipeline không tạo nó. Trong query thứ hai, status là trường JSON, không phải stream label.

Kiểm tra khi không có log:
```powershell
docker compose logs --tail=100 promtail loki
docker compose exec backend sh -c 'ls -l /logs'
docker compose exec nginx sh -c 'ls -l /logs'
```
Promtail UID1000 + supplementary group101 đọc volume backend UID1000 và Nginx UID101. Không chmod 777 volume để sửa quyền. Xác nhận Loki ready qua Prometheus target hoặc từ container backend:
```powershell
docker compose exec backend node -e "fetch('http://loki:3100/ready').then(async r=>console.log(r.status,await r.text()))"
```
Loki không có authentication trong mạng monitoring nội bộ; không publish ra host. Backend không log cookie, csrf, password hay request body. Nginx dùng $uri thay $request_uri trong JSON log để không ghi query string. Không thêm secret vào URL khi thử nghiệm.

Các query trên được đối chiếu cấu hình; kết quả ingest trên Docker cần xác nhận bằng ảnh thật ở máy người dùng. Không dùng ảnh dashboard giả hoặc dòng log tự viết làm bằng chứng đã triển khai.
