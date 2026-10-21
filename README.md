# TaskFlow Đề 24

Dự án mới độc lập cho DTC245200410, chạy local bằng Docker Compose. React/TypeScript + Express/Prisma + PostgreSQL, pgAdmin và Nginx HTTPS.

Trong PowerShell tại root, chạy scripts/init.ps1, docker compose config --quiet, docker compose up -d --build rồi docker compose ps -a. Website https://localhost:8448; pgAdmin http://localhost:5058. Đăng nhập bằng ADMIN_EMAIL/ADMIN_INITIAL_PASSWORD trong .env cục bộ. Không chia sẻ secret.

Migrate chạy trước backend. App dùng role DML riêng, không superuser. Volume có prefix taskflow_dtc245200410_new. Dừng bằng docker compose down để giữ dữ liệu; không dùng down -v thường ngày.

## Monitoring
Prometheus tại http://localhost:9098/targets và Grafana http://localhost:3008. Datasource/dashboard được provision. Năm job metrics: backend, nginx, postgres, containers, prometheus. Kiểm thêm pg_up/nginx_up và series container. cAdvisor đo Linux VM/containers, không đo đầy đủ Windows.
