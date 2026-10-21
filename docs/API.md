# API TaskFlow

Base URL từ trình duyệt: `https://localhost:8448/api`. Cookie phiên bắt buộc, trừ register/login. Mọi write gửi Origin chính xác, Content-Type application/json; sau đăng nhập gửi thêm X-CSRF-Token từ response login hoặc GET/auth/me. Không có CORS đa origin trong triển khai cùng origin.

| Endpoint | Quyền | Nội dung |
|---|---|---|
| POST /auth/register | Public + rate limit | name,email,password; tạo USER |
| POST /auth/login | Public + rate limit | email,password; cookie và csrf |
| GET /auth/me | Đã đăng nhập | Hồ sơ và csrf, không hash mật khẩu |
| POST /auth/logout | Đã đăng nhập | Xóa phiên hiện tại |
| POST /auth/password | Đã đăng nhập | currentPassword,newPassword; thu hồi mọi phiên |
| PATCH /profile | Đã đăng nhập | Đổi name |
| GET /projects | Đã đăng nhập | Chỉ dự án có membership |
| POST /projects | Đã đăng nhập | name,description,type; tự làm OWNER |
| GET /projects/:id | Thành viên | Thành viên, nhãn, myRole |
| PATCH /projects/:id | OWNER/ADMIN | name,description,archived |
| POST /projects/:id/members | OWNER/ADMIN, TEAM | email,role; tài khoản đã đăng ký |
| PATCH /projects/:id/members/:userId | OWNER/ADMIN | ADMIN/MEMBER/VIEWER, không hạ OWNER |
| DELETE /projects/:id/members/:userId | OWNER/ADMIN | Xóa membership và bỏ phân công task |
| POST /projects/:id/labels | OWNER/ADMIN | name,color dạng #RRGGBB |
| GET /tasks | Đã đăng nhập | q,projectId,status,priority,assigneeId,labelId,my,overdue,dueBefore,dueAfter,sort,page,limit |
| POST /projects/:id/tasks | OWNER/ADMIN/MEMBER | Tạo task, kiểm assignee và label thuộc dự án |
| GET /tasks/:id | Thành viên | Chi tiết, checklist, comments, activities |
| PATCH /tasks/:id | OWNER/ADMIN/MEMBER | Chỉ status hoặc đầy đủ taskInput |
| DELETE /tasks/:id | OWNER/ADMIN hoặc người tạo | VIEWER không được xóa |
| POST /tasks/:id/comments | OWNER/ADMIN/MEMBER | content |
| DELETE /tasks/:id/comments/:commentId | Tác giả/OWNER/ADMIN | Kiểm comment thuộc task |
| POST /tasks/:id/checklist | OWNER/ADMIN/MEMBER | title |
| PATCH /tasks/:id/checklist/:itemId | OWNER/ADMIN/MEMBER | done boolean |
| DELETE /tasks/:id/checklist/:itemId | OWNER/ADMIN/MEMBER | Kiểm item thuộc task |
| GET /dashboard | Đã đăng nhập | Tổng hợp dự án chưa lưu trữ được tham gia |
| GET /admin/users | System ADMIN | Danh sách tối đa 200 tài khoản |
| PATCH /admin/users/:id | System ADMIN | disabled boolean; không tự khóa |

TaskInput: title1–160; description≤8000; statusTODO/IN_PROGRESS/IN_REVIEW/DONE; priorityLOW/MEDIUM/HIGH/URGENT; assigneeId nullable; startAt/dueAt ISO8601 nullable và start≤due; labelIds không trùng, tối đa20. PATCH đầy đủ cần gửi các trường muốn giữ vì giá trị thiếu dùng default; giao diện gửi đầy đủ. PATCH chỉstatus phục vụ Kanban.

GET/tasks mặc định50, tối đa500; giao diện danh sách dùng25. sort=due|updated|priority. API trả {items,total,page,limit}. Trường number là sequence duy nhất, giao diện hiển thị TASK-001; idUUID dùng URL. Mã có thể có khoảng trống sau xóa/rollback, không tái sử dụng.

HTTP:400 dữ liệu sai;401 chưa đăng nhập/phiên hết hạn;403 thiếu quyền/CSRF/Origin;404 không có tài nguyên hoặc không thuộc dự án;409 trùng dữ liệu/dự án lưu trữ;413 quá64KiB;415 saiContent-Type;429 rate limit;500 lỗi chung kèm requestId. Không trả stacktrace/connectionstring. /health và /metrics là endpoint nội bộ ngoài /api; Nginx chặn /metrics public.
