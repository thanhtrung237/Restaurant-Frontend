export interface GuestLocation {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}
export function requestGuestLocation(): Promise<GuestLocation> {
  if (!window.isSecureContext || !navigator.geolocation) {
    return Promise.reject(
      new Error("Thiết bị cần HTTPS và hỗ trợ định vị. Vui lòng nhờ nhân viên hỗ trợ mã tham gia."),
    )
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          timestamp,
        }),
      () =>
        reject(
          new Error(
            "Không lấy được vị trí. Hãy bật quyền vị trí và thử lại, hoặc nhờ nhân viên mở bàn và cung cấp mã tham gia.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}
