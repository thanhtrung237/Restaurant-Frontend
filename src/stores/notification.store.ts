import { create } from "zustand"

interface NotificationRing {
  ringingBranch: number | null
  ring: (branchId: number) => void
  stop: () => void
}

let timeout: ReturnType<typeof setTimeout> | undefined

export const useNotificationRing = create<NotificationRing>((set) => ({
  ringingBranch: null,
  ring: (branchId) => {
    clearTimeout(timeout)
    set({ ringingBranch: branchId })
    timeout = setTimeout(() => set({ ringingBranch: null }), 60_000)
  },
  stop: () => {
    clearTimeout(timeout)
    set({ ringingBranch: null })
  },
}))
