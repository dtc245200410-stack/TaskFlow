# Minh chứng và ảnh cần bổ sung

Nhật ký Windows ngày 21/10/2026 được bổ sung tại `windows-20261021-build.txt` và `windows-20261021-migrate-excerpt.txt`: build image hoàn tất, PostgreSQL Healthy, một số container Running nhưng migration lỗi P3018/42501 rồi P3009. Đây là bằng chứng của lần chạy đó, không phải xác nhận stack đã hoạt động đầy đủ sau bản sửa. Chương 4 trong báo cáo Word phân tích nhật ký và hướng dẫn nghiệm thu. Xem `windows-local/README.md` để chụp ảnh kết quả trên máy cá nhân.

Ảnh ui-login/dashboard/kanban/detail/list/calendar/projects/mobile.png do Chromium chụp từ bản QA chạy thật trong Work. Môi trường: productionfrontend, Express/Prisma/PGlite quaHTTP; không phải DockerDesktop/PostgreSQL17/NginxTLS. ui-results.json và api-test.txt là kết quả chạy thật; config-validation.json là kiểmtra cấu hình, image-tags.json là kiểmtra manifest.

Sau khi chạy trên máy cá nhân, chụp các ảnh dưới đây để thay/điền phần triển khai trong báo cáo. Không để .env, password, cookie, csrf, token hoặc dữ liệu nhạy cảm xuất hiện.

| Mã ảnh | Vị trí chụp | Chú thích và vị trí chèn báo cáo |
|---|---|---|
| WIN01 | PowerShell docker compose ps-a | Các serviceUp/healthy, one-shotExited0; mục3.3 |
| WIN02 | Websitehttpslocalhost8448 + URL | TaskFlow quaNginxTLS trênWindows; mục3.4 |
| WIN03 | pgAdminQueryTool | Taskvừatạo/trạngtháivừakéo; mục3.5 |
| WIN04 | Prometheus/targets | BảyjobUP, khôngsecret; mục3.6 |
| WIN05 | Grafanadashboard | CóCPU/RAMcontainer,DB,HTTP; mục3.6 |
| WIN06 | GrafanaExplorequery1 | AccesslogNginxthật; mục3.7 |
| WIN07 | GrafanaExplorequery2/3 | HTTP>=400/backendwarnerror; mục3.7 |
| WIN08 | PowerShellidbackend/nginx | UID1000/101; mục3.8 |
| WIN09 | curlheaders và portmapping | Headers vànội bộbackend/DB; mục3.8 |
| WIN10 | APIquyềnviewer/ngườingoài | 403/404 đúngrole, checookie; mục3.9 |
| WIN11 | Trướcsau restartbackend | Taskcòn trongDB; mục3.10 |
| WIN12 | GitHubCommitshistory | Ba commitmốc thật saupushremote mới; phụlụcGit |

Không cóảnh thì giữmục tươngứng BLOCKED, khôngchènảnhcủa dịchvụkhác hay ảnhmôphỏng để chứngminhPASS.
