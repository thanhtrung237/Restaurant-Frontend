import * as React from "react"
import { DayPicker } from "react-day-picker"
import { vi } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = vi,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "space-y-3",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-sm font-semibold capitalize",

        // Nút điều hướng nằm 2 bên tiêu đề
        nav: "absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "pointer-events-auto h-8 w-8 rounded-full bg-transparent p-0 opacity-70 transition-all hover:opacity-100 hover:scale-105",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "pointer-events-auto h-8 w-8 rounded-full bg-transparent p-0 opacity-70 transition-all hover:opacity-100 hover:scale-105",
        ),

        month_grid: "w-full border-collapse",
        weekdays: "",
        weekday: "h-9 w-10 text-center text-xs font-medium text-muted-foreground",
        week: "",
        day: "relative h-10 w-10 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 rounded-xl p-0 font-normal transition-all duration-150 hover:scale-105 aria-selected:opacity-100",
        ),

        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold [&>button]:shadow-md [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-semibold",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
        disabled:
          "[&>button]:text-muted-foreground [&>button]:opacity-40 [&>button]:pointer-events-none",
        hidden: "invisible",
        range_start: "[&>button]:rounded-r-none",
        range_end: "[&>button]:rounded-l-none",
        range_middle:
          "[&>button]:rounded-none [&>button]:bg-accent [&>button]:text-accent-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
