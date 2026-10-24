# Sửa lỗi migration đầu tiên P3018 / 42501, sau đó P3009

Áp dụng cho dự án TaskFlow có database `taskflow`, role triển khai `taskflow_migrate` và migration `202610210001_initial`. Log ban đầu phải là `permission denied for database taskflow`. Đây là lỗi ở câu lệnh đầu tiên `CREATE SCHEMA IF NOT EXISTS "public"`; không áp dụng quy trình này cho một migration khác đã chạy dở.

## Nguyên nhân và bản sửa

- Script cũ chỉ cấp CONNECT trên database. PostgreSQL yêu cầu CREATE trên database khi thực hiện CREATE SCHEMA, kể cả IF NOT EXISTS. Bản mới chỉ cấp quyền này cho role migration; role ứng dụng vẫn không có quyền tạo schema/database và không có superuser.
- Sau lần thất bại, Prisma lưu bản ghi lỗi và chặn deploy bằng P3009. Cần đánh dấu đúng migration đó rolled back rồi deploy lại. `resolve --rolled-back` chỉ cập nhật lịch sử; không tự hoàn tác SQL đã chạy.
- Image Node slim cũ thiếu OpenSSL. Dockerfile mới cài OpenSSL và CA certificates ở stage base để cả build/runtime đều sử dụng được. Container runtime vẫn chạy USER node.

## Thao tác trên Windows

1. Chép đè `backend/Dockerfile` và `database/01-roles.sh` bằng hai file trong bản vá. Giữ file `.env` hiện có. Với ZIP bản vá, giải nén vào thư mục chứa `docker-compose.yml`; bản vá không chứa `.env` hoặc dữ liệu.
2. Mở Docker Desktop. Tại Terminal PowerShell của VS Code, chuyển tới thư mục dự án, ví dụ:

```powershell
Set-Location D:\DoAn\DTC245200410
```

3. Cấp quyền còn thiếu cho database đang tồn tại:

```powershell
docker compose exec -T postgres psql -U taskflow_owner -d taskflow -v ON_ERROR_STOP=1 -c "GRANT CREATE ON DATABASE taskflow TO taskflow_migrate;"
```

Kỳ vọng có `GRANT`. Script `01-roles.sh` chỉ tự chạy khi PostgreSQL khởi tạo volume mới, nên sửa file này không tự thay quyền trên database hiện có.

4. Build lại hai image dùng Dockerfile backend đã sửa:

```powershell
docker compose build backend migrate
```

5. Đánh dấu lần migration thất bại để cho phép chạy lại:

```powershell
docker compose run --rm --no-deps migrate npx prisma migrate resolve --rolled-back 202610210001_initial
```

Kỳ vọng Prisma báo migration được đánh dấu rolled back. Trong trường hợp này câu lệnh đầu tiên đã thất bại trước khi tạo các bảng nghiệp vụ, nên có thể chạy lại migration gốc. File migration không bị sửa và checksum giữ nguyên. Nếu lệnh này lỗi, dừng tại bước đó và gửi log, không đánh dấu applied.

6. Khởi động toàn bộ hệ thống bằng lệnh quen thuộc:

```powershell
.\runall
```

7. Kiểm tra:

```powershell
docker compose ps -a
docker compose logs --no-color --tail=80 migrate
```

Migration chạy xong có trạng thái Exited (0); backend/nginx khởi động theo phụ thuộc. Mở https://localhost:8448 sau khi backend/nginx healthy. Khi `.\runall` chạy lại, trạng thái migration thất bại cũ đã được xử lý nên không cần lặp bước 5.

Quy trình giữ nguyên volume, mật khẩu và dữ liệu hiện có. Không dùng `docker compose down -v`, `prisma migrate reset` hoặc xóa bảng `_prisma_migrations` để xử lý lỗi này.

## Kiểm tra quyền sau khi khởi động

```powershell
docker compose exec -T postgres psql -U taskflow_owner -d taskflow -c "SELECT has_database_privilege('taskflow_migrate','taskflow','CREATE') AS migrate_create, has_database_privilege('taskflow_app','taskflow','CREATE') AS app_create;"
```

Kỳ vọng `migrate_create = t`, `app_create = f`. CREATE trên database hiện có không phải thuộc tính CREATEDB để tạo database mới.

## Giới hạn kiểm tra bản vá

Bản vá được đối chiếu với migration gốc, cấu hình role, Dockerfile và tài liệu PostgreSQL/Prisma. Môi trường soạn bản vá không có Docker Engine; kết quả chạy lại Docker và trạng thái database cần xác nhận trên máy Windows của bạn.

## Tài liệu tham khảo

- PostgreSQL CREATE SCHEMA: https://www.postgresql.org/docs/17/sql-createschema.html
- Prisma v7 recovery: https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/patching-and-hotfixing
- Prisma Linux/OpenSSL: https://www.prisma.io/docs/orm/v7/reference/system-requirements
