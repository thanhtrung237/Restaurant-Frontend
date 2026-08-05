import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { APP_ROLE_LABEL } from "@/config/roles";
import { getNavGroupsForRole } from "@/config/nav-items";
import { AUTH_PATHS } from "@/app/router/paths";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const BRANCH_LIST = [
  "Chi nhánh Quận 1",
  "Chi nhánh Quận 3",
  "Chi nhánh Thủ Đức",
];

/**
 * Sidebar — khung điều hướng desktop dùng CHUNG cho các role nhân viên qua `StaffLayout`.
 * - Logo vuông "P" màu cam thương hiệu
 * - Tên quán "Phở Việt", dòng phụ "Chi nhánh Quận 1" và icon dropdown
 * - Menu items: mục active có nền cam nhạt (#FEEBE4) và chữ/icon cam (#F0522B)
 * - Chân trang: Avatar + Tên / Vai trò nhân viên + Nút đăng xuất
 */
export function Sidebar() {
  const account = useAuthStore((s) => s.account);
  const role = useAuthStore((s) => s.role);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [currentBranch, setCurrentBranch] = React.useState("Chi nhánh Quận 1");

  // Mặc định vai trò là Quản trị nhà hàng (RESTAURANT_ADMIN) để xem được toàn bộ màn hình
  const currentRole = role && role !== "CUSTOMER" ? role : "RESTAURANT_ADMIN";
  const navGroups = getNavGroupsForRole(currentRole);

  const initials =
    account?.fullName
      ?.split(" ")
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "QL";

  function handleLogout() {
    clearSession();
    navigate(AUTH_PATHS.LOGIN, { replace: true });
  }

  return (
    <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-border-default/80 bg-surface-card select-none">
      {/* Brand & Branch Switcher */}
      <div className="flex h-16 items-center justify-between border-b border-border-default/60 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary shadow-xs">
            <span className="text-base font-extrabold text-text-on-brand font-sans">
              P
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-text-primary">
              Phở Việt
            </h2>
            <p className="truncate text-xs text-text-tertiary">
              {currentBranch}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-text-tertiary hover:text-text-primary transition-colors p-1 cursor-pointer"
              title="Chọn chi nhánh"
            >
              <ChevronDown className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="right" className="w-48">
            {BRANCH_LIST.map((branch) => (
              <DropdownMenuItem
                key={branch}
                onClick={() => setCurrentBranch(branch)}
                className="cursor-pointer"
              >
                {branch}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navGroups.map((group, groupIndex) => (
          <div
            key={group.title ?? groupIndex}
            className={groupIndex > 0 ? "mt-4" : undefined}
          >
            {group.title ? (
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {group.title}
              </p>
            ) : null}
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-brand-primary-subtle text-brand-primary font-semibold shadow-2xs"
                          : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            "size-4.5 shrink-0 transition-colors",
                            isActive
                              ? "text-brand-primary"
                              : "text-text-tertiary group-hover:text-text-secondary",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border-default/60 p-3">
        <div className="flex items-center justify-between gap-2 rounded-xl p-2 bg-surface-page/60">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Avatar className="size-8 bg-text-primary text-text-on-brand font-bold text-xs shrink-0">
              <AvatarFallback className="bg-text-primary text-text-on-brand">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-bold text-text-primary">
                {account?.fullName || "Quản lý"}
              </p>
              <p className="truncate text-[11px] text-text-tertiary">
                {role ? APP_ROLE_LABEL[role] : "Quản trị nhà hàng"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-muted hover:text-status-danger cursor-pointer"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
