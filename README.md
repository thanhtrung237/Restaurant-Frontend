# Front-end-Booking-Service

## Docker local

Để hiển thị FE, BE và MySQL thành ba container độc lập trong Docker Desktop,
chạy từ repo backend:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-docker.ps1 -Build
```

Frontend: `http://localhost:8088`; Swagger backend:
`http://localhost:8080/swagger-ui/index.html`; MySQL: `127.0.0.1:3307`.
Chỉ build/chạy lại FE sau khi sửa code:

```powershell
.\start-docker.ps1 -Service frontend -Build -Recreate
```

Các lệnh trên dùng script ở repo backend. Không chạy đồng thời với bộ Compose
trên cùng các cổng. Cấu hình Compose bên dưới vẫn được giữ như một lựa chọn khác.

Dockerfile build frontend bằng Node 24, sau đó Nginx phục vụ `dist`.
`nginx.conf` hỗ trợ React Router, chuyển tiếp `/api/` và SockJS/WebSocket `/ws`
đến service `backend:8080`, đồng thời phân giải lại DNS khi backend được tạo lại.

Đặt repo này cạnh `Restaurant-Backend`, rồi chạy trong repo backend:

```powershell
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 300
```

Mở `http://localhost:8088`. Xem hướng dẫn cấu hình môi trường, nhập database và
cài Docker Desktop trong [README backend](../Restaurant-Backend/README.md).
Liên kết tương đối này dành cho workspace có cả hai repo cạnh nhau.

Build args mặc định:

```text
VITE_API_BASE_URL=/api/v1
VITE_WS_URL=/ws
```

Đây là các URL công khai được Vite đóng vào bundle lúc build. Không truyền
password/API secret qua biến `VITE_*`. Cấu hình proxy trong `vite.config.ts` chỉ
dành cho dev; khi chạy container, Nginx thực hiện proxy.

Image frontend được thiết kế chạy cùng Compose. Build image riêng được bằng
`docker build -t restaurant-frontend .`, nhưng để gọi API thì container phải
cùng mạng Docker với backend mang tên service `backend`.

## CI/CD frontend

Khi push hoặc mở pull request, GitHub Actions kiểm tra format của các file thay đổi,
chạy lint, build và Playwright trên commit được checkout. Có thể format cục bộ
bằng `npm run format -- <đường-dẫn>` trước khi commit.

Các test bắt buộc kiểm tra truy cập bằng QR, quản trị thực đơn và nhân viên
chi nhánh. Chọn `full_browser_suite` trong
**Actions → Frontend CI/CD → Run workflow** để chạy toàn bộ Playwright.
Playwright dùng Chromium trên CI và giả lập API trong trình duyệt. Nếu test
lỗi, xem báo cáo Playwright trong mục Artifacts.

Vercel triển khai frontend từ repo GitHub. Để build và chạy Docker thủ công,
xem mục [Docker local](#docker-local).
