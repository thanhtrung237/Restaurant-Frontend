import * as React from "react"
import {
  Search,
  ChevronDown,
  Camera,
  ShoppingBag,
  Smile,
  Store,
  Minimize2,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChatConversation {
  id: string | number
  name: string
  avatarText: string
  avatarBg?: string
  lastMessage: string
  time: string
  online?: boolean
  onlineStatusText?: string
}

export const DEFAULT_CHAT_CONVERSATIONS: ChatConversation[] = [
  {
    id: "1",
    name: "Shop good HLE",
    avatarText: "SG",
    avatarBg: "bg-linear-to-tr from-brand-primary to-status-warning",
    lastMessage: "Cuộc trò chuyện mới được khởi tạo 👋",
    time: "18:16",
    online: true,
    onlineStatusText: "Online 5 phút trước",
  },
  {
    id: "2",
    name: "Shop good HLE",
    avatarText: "SG",
    avatarBg: "bg-linear-to-tr from-brand-primary to-status-warning",
    lastMessage: "Cuộc trò chuyện mới được khởi tạo 👋",
    time: "18:15",
    online: true,
    onlineStatusText: "Online 10 phút trước",
  },
  {
    id: "3",
    name: "Shop good HLE",
    avatarText: "SG",
    avatarBg: "bg-linear-to-tr from-brand-primary to-status-warning",
    lastMessage: "hi shop",
    time: "18:12",
    online: true,
    onlineStatusText: "Online 15 phút trước",
  },
  {
    id: "4",
    name: "Shop good HLE",
    avatarText: "SG",
    avatarBg: "bg-linear-to-tr from-brand-primary to-status-warning",
    lastMessage: "xin chào",
    time: "09:57",
    online: true,
    onlineStatusText: "Online 2 giờ trước",
  },
]

export interface ChatWidgetProps {
  conversations?: ChatConversation[]
  className?: string
}

/**
 * ChatWidget — khớp chính xác giao diện Chat trong tài liệu thiết kế khách hàng cung cấp:
 * - Cửa sổ chat 2 cột: Danh sách hội thoại bên trái và Khung chat chi tiết bên phải
 * - Avatar gradient SG có chấm tròn online màu xanh
 * - Ô tìm kiếm "Tìm theo tên..." và bộ lọc "Tất cả (4)"
 * - Header shop với nút "Xem Shop"
 * - Thông báo mở đầu "Hãy gửi tin nhắn đầu tiên để mở đầu cuộc trò chuyện!"
 * - Thanh công cụ đính kèm (ảnh, giỏ hàng, emoji) + ô nhập tin nhắn và nút "Gửi".
 */
export function ChatWidget({
  conversations = DEFAULT_CHAT_CONVERSATIONS,
  className,
}: ChatWidgetProps) {
  const [selectedId, setSelectedId] = React.useState<string | number>(
    conversations[0]?.id ?? "1"
  )
  const [inputText, setInputText] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")

  const activeConv =
    conversations.find((c) => c.id === selectedId) ?? conversations[0]

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      className={cn(
        "flex h-[520px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-lg",
        className
      )}
    >
      {/* Header chính của Modal Chat */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-default px-5">
        <h3 className="text-lg font-bold text-brand-primary">Chat</h3>
        <div className="flex items-center gap-2 text-text-tertiary">
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md hover:bg-surface-muted hover:text-text-primary"
            title="Mở rộng"
          >
            <Minimize2 className="size-3.5" />
          </button>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md hover:bg-surface-muted hover:text-text-primary"
            title="Thu nhỏ"
          >
            <ChevronUp className="size-4" />
          </button>
        </div>
      </div>

      {/* Nội dung 2 cột */}
      <div className="grid flex-1 grid-cols-1 divide-x divide-border-default overflow-hidden md:grid-cols-12">
        {/* Cột trái: Danh sách cuộc trò chuyện (4 cols) */}
        <div className="flex flex-col overflow-hidden md:col-span-5 lg:col-span-4 bg-surface-card">
          {/* Ô tìm kiếm & Bộ lọc */}
          <div className="space-y-2.5 border-b border-border-default p-3">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên..."
                className="h-9 w-full rounded-pill bg-surface-muted pl-9 pr-3 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:bg-surface-card focus:ring-1 focus:ring-brand-primary/40 border border-transparent focus:border-border-default"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border-default bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text-secondary cursor-pointer">
              <span>Tất cả ({conversations.length})</span>
              <ChevronDown className="size-3.5 text-text-tertiary" />
            </div>
          </div>

          {/* List hội thoại */}
          <div className="flex-1 overflow-y-auto divide-y divide-border-default/60">
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "relative flex cursor-pointer items-start gap-3 p-3 transition-colors",
                    isSelected
                      ? "bg-surface-page/70 border-l-4 border-brand-primary pl-2.5"
                      : "hover:bg-surface-page/40"
                  )}
                >
                  {/* Avatar có chấm tròn online */}
                  <div className="relative size-10 shrink-0">
                    <div
                      className={cn(
                        "flex size-full items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs",
                        conv.avatarBg ?? "bg-brand-primary"
                      )}
                    >
                      {conv.avatarText}
                    </div>
                    {conv.online ? (
                      <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-surface-card bg-status-success" />
                    ) : null}
                  </div>

                  {/* Tên & Nội dung */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <h5 className="truncate text-xs font-bold text-text-primary">
                        {conv.name}
                      </h5>
                      <span className="shrink-0 text-[10px] text-text-tertiary font-medium">
                        {conv.time}
                      </span>
                    </div>
                    <p className="truncate text-xs text-text-secondary mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cột phải: Khung chat chi tiết (8 cols) */}
        <div className="flex flex-col justify-between overflow-hidden md:col-span-7 lg:col-span-8 bg-surface-card">
          {/* Header đối tác chat */}
          {activeConv ? (
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-default px-4">
              <div className="flex items-center gap-3">
                <div className="relative size-9 shrink-0">
                  <div
                    className={cn(
                      "flex size-full items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs",
                      activeConv.avatarBg ?? "bg-brand-primary"
                    )}
                  >
                    {activeConv.avatarText}
                  </div>
                  {activeConv.online ? (
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-surface-card bg-status-success" />
                  ) : null}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">
                    {activeConv.name}
                  </h4>
                  {activeConv.onlineStatusText ? (
                    <p className="text-[11px] font-medium text-status-success">
                      • {activeConv.onlineStatusText}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Nút Xem Shop */}
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-card px-3 py-1.5 text-xs font-semibold text-text-primary shadow-2xs transition-colors hover:bg-surface-muted"
              >
                <Store className="size-3.5 text-status-warning" />
                <span>Xem Shop</span>
              </button>
            </div>
          ) : null}

          {/* Vùng tin nhắn trống với icon vẫy tay */}
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center select-none">
            <div className="mb-3 text-4xl animate-bounce">👋</div>
            <p className="max-w-xs text-xs font-bold leading-relaxed text-text-secondary">
              Hãy gửi tin nhắn đầu tiên để mở đầu cuộc trò chuyện!
            </p>
          </div>

          {/* Vùng chân trang nhập tin nhắn */}
          <div className="border-t border-border-default p-3 space-y-2 bg-surface-card">
            {/* Toolbar icon phụ trợ */}
            <div className="flex items-center gap-3 px-1 text-text-tertiary">
              <button
                type="button"
                className="transition-colors hover:text-text-primary"
                title="Gửi ảnh"
              >
                <Camera className="size-4" />
              </button>
              <button
                type="button"
                className="transition-colors hover:text-text-primary"
                title="Gửi món / sản phẩm"
              >
                <ShoppingBag className="size-4" />
              </button>
              <button
                type="button"
                className="transition-colors hover:text-text-primary"
                title="Biểu tượng cảm xúc"
              >
                <Smile className="size-4" />
              </button>
            </div>

            {/* Khung input và nút Gửi */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập nội dung tin nhắn..."
                className="h-10 flex-1 rounded-pill bg-surface-muted px-4 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:bg-surface-card focus:ring-1 focus:ring-brand-primary border border-transparent focus:border-border-default"
              />
              <button
                type="button"
                disabled={!inputText.trim()}
                className={cn(
                  "flex h-10 shrink-0 items-center justify-center rounded-pill px-5 text-xs font-bold transition-all",
                  inputText.trim()
                    ? "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-xs active:scale-95"
                    : "bg-brand-primary-subtle text-brand-primary/80 opacity-80 cursor-not-allowed"
                )}
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
