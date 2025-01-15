import { CSSProperties } from 'react';
import { format } from 'date-fns';

interface TimeColumnProps {
  hours: number[];
  timeSlotHeight: number;
}

export const TimeColumn = ({ hours, timeSlotHeight }: TimeColumnProps) => {
  return (
    <div className="sticky left-0 top-0 bottom-5 w-12 md:w-20 bg-background z-[2] border-r">
      <div className="h-[calc(4rem-1px)] flex items-start justify-center">
        <div className="font-bold text-sm md:text-base border-b text-center w-full py-1.5">
          Time
        </div>
      </div>
      {hours.map((hour) => (
        <div
          key={hour}
          className="flex items-start justify-center text-xs md:text-sm transition-[height] duration-200 relative"
          style={{
            '--time-slot-height': `${timeSlotHeight}px`,
            height: 'var(--time-slot-height)',
          } as CSSProperties}
        >
          <div className="absolute -top-2.5 text-muted-foreground">
            {format(new Date().setHours(hour, 0), "HH:mm")}
          </div>
          <div className="absolute border-b w-3 right-0"/>
        </div>
      ))}
    </div>
  );
};