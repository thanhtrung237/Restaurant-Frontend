// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.tsx'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// CHỈ ĐỂ TEST LOCAL — seed nhanh phiên đăng nhập giả qua console (window.loginAs(...)),
// vì trang Đăng nhập thật chưa nối API. Nhánh if(DEV) khiến Vite tree-shake hẳn khỏi
// bundle production, không cần tự tay xoá trước khi build/deploy thật.


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
