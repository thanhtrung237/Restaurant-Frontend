# Tầng gọi API

## Cấu trúc

```
src/lib/http.ts          axios instance + interceptor JWT + refresh 401 + bóc vỏ ResponseSuccess
src/lib/auth-token.ts    nơi duy nhất giữ access/refresh token (tách khỏi store để tránh phụ thuộc vòng)
src/lib/query-keys.ts    toàn bộ query key của React Query
src/types/api.ts         ResponseSuccess / ResponseError / PageResponse
src/types/requests/      body của mọi POST/PUT (mirror dtos/request/** của backend)
src/api/*.api.ts         1 file / 1 Controller backend — hàm gọi endpoint + hook React Query
src/features/*/api/      re-export phần mà feature đó dùng (đọc file này để biết 1 màn chạm API nào)
```

## Quy ước

- **Luôn dùng `apiGet/apiPost/apiPut/apiDelete`**, đừng gọi `http.get()` trực tiếp —
  backend bọc response trong `ResponseSuccess<T>` (`{ status, message, data }`) và 4 hàm này
  đã bóc sẵn lớp vỏ đó.
- **Lỗi luôn là `ApiError`** (`status`, `message`, `path`). Dùng `getErrorMessage(err)` để
  lấy chuỗi hiển thị.
- **Query key lấy từ `qk`**, không viết mảng key trực tiếp trong component.
- Nhiều endpoint nhận tham số qua **query string** chứ không qua body
  (đổi trạng thái, đổi mật khẩu) — đã đóng gói sẵn trong các hàm tương ứng.

## Những chỗ backend chưa có API

| Màn hình | Tình trạng |
|---|---|
| Báo cáo chi nhánh / Báo cáo nhà hàng / Doanh thu theo giờ | Không có `ReportController` nào |
| Cấu hình nền tảng | Không có controller |
| Gói & Thanh toán (subscription) | Không có entity/controller |
| Đánh giá của khách (`review`) | Không có controller |
| Chuyển bàn / Gộp bàn | Chỉ có enum `TableSessionStatus.MERGED`, không có endpoint |
| Quên mật khẩu (tự phục hồi) | Chỉ có `PUT /accounts/{id}/reset-password` do admin gọi |
| Ma trận phân quyền theo Role | `Role` ở BE không có cột lưu permission |

Đừng viết sẵn API client đoán đường dẫn cho các mục trên — chốt với đội backend trước.

## Việc backend cần sửa trước khi luồng refresh token chạy được

`AuthController.refreshToken` đọc token từ header `Refresh-Token`, nhưng
`SecurityConfig.corsConfigurationSource()` mới cho phép
`allowedHeaders = ["Authorization", "Content-Type"]`. Trình duyệt sẽ chặn header
`Refresh-Token` ngay ở bước preflight.

Backend chỉ cần sửa 1 dòng:

```java
config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Refresh-Token"));
```

(Fallback đọc cookie `refreshToken` ở backend cũng không dùng được, vì backend không hề
set cookie đó — `refreshToken` được trả trong body của `LoginResponse`.)
