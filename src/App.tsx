import { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import QueryProvider from '@/app/providers/QueryProvider'

function App() {
  return (
    <QueryProvider>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Đang tải...</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryProvider>
  )
}

export default App
