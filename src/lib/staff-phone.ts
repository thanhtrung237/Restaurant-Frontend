const staffPhonePattern = /^0(?:3[2-9]|5[25689]|7[06789]|8[1-9]|9[0-9])[0-9]{7}$/
export const STAFF_PHONE_ERROR =
  "Nhập 10 chữ số, bắt đầu bằng 0 và có đầu số di động Việt Nam hợp lệ."
export const isStaffPhone = (value: string) => staffPhonePattern.test(value)
