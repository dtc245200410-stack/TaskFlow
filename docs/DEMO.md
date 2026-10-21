# Kịch bản nghiệm thu 15 phút

Thực hiện trước buổi báo cáo: scripts/start.ps1, scripts/test.ps1, scripts/acceptance.ps1, scripts/verify.ps1, scripts/generate-traffic.ps1. Giữ .env và mật khẩu ngoài màn hình chia sẻ.

1. Phút 0–2: mở folder gốc, docker compose ps -a. Giải thích migrate/permissions/cert-init Exited(0) là bình thường, không phải dịch vụ lỗi. Chỉ các dịch vụ chạy lâu dài mới cần Up; xem health khi có.
2. Phút 2–5: vào https://localhost:8448, chấp nhận chứng chỉ localhost. Đăng nhập admin bằng mật khẩu cục bộ. Xem dashboard, mở Ra mắt TaskFlow, tạo task, deadline, người phụ trách, nhãn. Kéo sang In Review, refresh trang và mở chi tiết xác nhận trạng thái. Thêm checklist, đánh dấu, bình luận và xem lịch sử.
3. Phút 5–6: đăng nhập viewer trong cửa sổ riêng. Chỉ xem; gọi write bằng DevTools/fetch với CSRF hợp lệ phải 403. Dùng tài khoản mới chưa thuộc dự án và mở task link phải 404. Không dùng cookie admin cho phần kiểm tra viewer.
4. Phút 6–8: mở pgAdmin 5058. Register Server host postgres, port 5432, DB taskflow, owner taskflow_owner. Query SELECT "number","title","status","dueAt" FROM "Task" ORDER BY "number" DESC; đối chiếu task vừa kéo.
5. Phút 8–10: Prometheus 9098 /targets: 7 job UP. Query pg_up và nginx_up cần bằng 1; kiểm container_memory_working_set_bytes có series dự án. Mở Grafana 3008 > Dashboards > TaskFlow > TaskFlow Hệ thống; chọn Last30minutes và chờ ít nhất2 scrape sau traffic.
6. Phút 10–12: Grafana Explore > Loki, chạy3 query đầu ở LOGQL.md, chọn Last15minutes. Chỉ rõ nhãn service, level và field status. Nếu không có5xx, giải thích điều này thay vì cố tạo lỗi phá dữ liệu.
7. Phút 12–14: chứng minh hardening: backend/nginx non-root bằng id; không published PostgreSQL/backend; app role nosuperuser; headers qua curl; .env bị ignore. Không hiển thị docker compose config đầy đủ vì có secret đã nội suy.
8. Phút 14–15: tạo task có tên minh chứng, docker compose restart backend, refresh và kiểm task còn. Mở git log --oneline sau clone bundle; giải thích3 commit chính và giới hạn các hạng mục chưa kiểm chứng trên Windows.

Ảnh cần chụp ở máy thật xem docs/evidence/README.md. Nếu có mục không hoạt động, ghi FAIL hoặc BLOCKED đúng nguyên nhân; không dùng ảnh Work UI thay cho ảnh Docker/monitoring.
