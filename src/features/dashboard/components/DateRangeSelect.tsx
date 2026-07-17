import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"
import type { DateRangeOption } from "../hooks/useTimelineFilter"

interface DateRangeSelectProps {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
  disabled?: boolean;
}

export function DateRangeSelect({ value, onChange, disabled }: DateRangeSelectProps) {
  return (
    <div className="chart-range-picker">
      <Select
        value={value}
        onValueChange={(val) => onChange(val as DateRangeOption)}
        disabled={disabled}
      >
        <SelectTrigger className="chart-range-select-trigger">
          <SelectValue placeholder="Select Range" />
        </SelectTrigger>
        <SelectContent className="chart-range-select-content">
          {/* <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem> */}
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="90d">Last 90 Days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
