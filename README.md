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

Khi push lên nhánh làm việc, GitHub Actions dùng Prettier cho các file thay đổi
so với nhánh mặc định. Nếu có thay đổi format, bot push một commit lên chính
nhánh đó. CI chạy lint, build và Playwright trên commit sau khi format. Pull
commit của bot về trước lần push tiếp theo nếu bot đã cập nhật nhánh.

Pull request và mỗi lần push vào `main` đều kiểm tra format, lint, build và
Playwright độc lập. Có thể format cục bộ bằng `npm run format -- <đường-dẫn>`.

Các test bắt buộc kiểm tra truy cập bằng QR, quản trị thực đơn và nhân viên
chi nhánh. Chọn `full_browser_suite` trong
**Actions → Frontend CI/CD → Run workflow** để chạy toàn bộ Playwright.
Playwright dùng Chromium trên CI và giả lập API trong trình duyệt. Nếu test
lỗi, xem báo cáo Playwright trong mục Artifacts.

Khi một lần push vào `main` vượt qua các bước kiểm tra, workflow build image
từ `Dockerfile`, gọi `/healthz` và xác nhận Nginx phục vụ route `/login`.
Image được đưa lên `ghcr.io/thanhtrung237/restaurant-frontend` với tag `latest`
và `sha-<commit-sha>`. Workflow dùng `GITHUB_TOKEN` của GitHub Actions để publish.
Máy triển khai có thể pull theo tag SHA để chọn đúng phiên bản.

### Triển khai trên Docker Desktop

Mở PowerShell tại repo frontend khi stack Compose đã chạy. Dùng SHA của lần
phát hành cần triển khai. Script chỉ cập nhật service `frontend` và chờ healthcheck.

```powershell
.\deploy\deploy-frontend.ps1 -BackendDirectory ..\Restaurant-Backend `
  -Image ghcr.io/thanhtrung237/restaurant-frontend:sha-<commit-sha>
```

Thay `<commit-sha>` bằng SHA thực tế. Với package riêng tư, đăng nhập GHCR
trên máy Docker bằng tài khoản có quyền pull trước khi chạy. Có thể dùng lại
cùng lệnh với một SHA cũ để quay về bản đã phát hành trước đó.

Để tự động triển khai từ repo GitHub riêng tư, đăng ký runner Windows trên
máy Docker với nhãn `restaurant-frontend-deploy`. Tài khoản chạy runner cần
truy cập được Docker Desktop và GHCR. Đặt Actions variable
`RESTAURANT_BACKEND_DIR` thành đường dẫn tuyệt đối tới repo backend chứa
`compose.yaml` và `.env.docker`. Job triển khai tự chạy sau khi `main` phát hành
image thành công. Repo công khai dùng lệnh PowerShell ở trên.
