import { useId } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function InvoiceFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="min-w-0 space-y-1.5">
      <label id={id} className="block text-sm font-semibold">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-labelledby={id}
          className="w-full rounded-xl border-border-default data-[size=default]:h-10"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          side="bottom"
          align="start"
          avoidCollisions={false}
          className="max-h-44 w-(--radix-select-trigger-width) min-w-0 overscroll-contain"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="whitespace-normal break-words"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
