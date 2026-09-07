import { useMutation } from "@tanstack/react-query"
import { apiPost } from "@/lib/http"

/**
 * `POST /upload/dish` và `POST /upload/restaurant` — upload ảnh lên Cloudinary qua BE.
 *
 * Gửi `multipart/form-data` với field tên `file`. Phải ghi đè `Content-Type` về
 * `undefined` để axios/trình duyệt tự sinh boundary — nếu để `application/json`
 * mặc định của instance thì BE sẽ không parse được.
 *
 * BE trả về URL ảnh dạng chuỗi, dùng để gán vào `Dish.imageUrl` / `Restaurant.logoUrl`.
 */
function uploadFile(path: string, file: File) {
  const form = new FormData()
  form.append("file", file)
  return apiPost<string>(path, form, { headers: { "Content-Type": undefined } })
}

export function uploadDishImage(file: File) {
  return uploadFile("/upload/dish", file)
}
export function uploadRestaurantLogo(file: File) {
  return uploadFile("/upload/restaurant", file)
}

export function useUploadDishImage() {
  return useMutation({ mutationFn: uploadDishImage })
}
export function useUploadRestaurantLogo() {
  return useMutation({ mutationFn: uploadRestaurantLogo })
}
