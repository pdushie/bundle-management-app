"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function getTodayUTC() {
  const now = new Date();
  function Calendar(props: CalendarProps) {
    const {
      className,
      classNames,
      showOutsideDays = true,
      ...rest
    } = props;

    // Calculate today in local time
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());


    "use client";

    import * as React from "react";
    import { ChevronLeft, ChevronRight } from "lucide-react";
    import { DayPicker } from "react-day-picker";
    import { cn } from "@/lib/utils";

    export type CalendarProps = React.ComponentProps<typeof DayPicker>;

    function Calendar({
      className,
      classNames,
      showOutsideDays = true,
      ...props
    }: CalendarProps) {
      // Calculate today in local time
      const now = new Date();
      const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Prevent navigation to future months
      const handleMonthChange = (newMonth: Date) => {
        if (newMonth > todayLocal) return;
        if (props.onMonthChange) props.onMonthChange(newMonth);
      };

      // Disable right chevron if current month is today (local)
      const isCurrentMonthToday = props.month &&
        props.month.getFullYear() === todayLocal.getFullYear() &&
        props.month.getMonth() === todayLocal.getMonth();

      const calendarClassNames = {
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      };

      const calendarComponents = {
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: (iconProps: any) => (
          <span
            {...iconProps}
            style={{
              pointerEvents: isCurrentMonthToday ? 'none' : undefined,
              opacity: isCurrentMonthToday ? 0.3 : 1,
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        ),
      };

      return (
        <DayPicker
          mode={props.mode}
          selected={props.selected}
          onSelect={props.onSelect}
          fromDate={props.fromDate}
          toDate={todayLocal}
          month={props.month}
          onMonthChange={handleMonthChange}
          captionLayout={props.captionLayout}
          disabled={props.disabled}
          modifiers={props.modifiers}
          modifiersClassNames={props.modifiersClassNames}
          showOutsideDays={showOutsideDays}
          classNames={calendarClassNames}
          components={calendarComponents}
          className={className}
          {...props}
        />
      );
    }
    Calendar.displayName = "Calendar";

    export { Calendar };
            month={props.month}
