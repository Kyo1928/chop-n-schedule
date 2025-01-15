import { useEffect, useState, CSSProperties, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCalendarScroll } from "@/hooks/use-calendar-scroll";
import { TimeColumn } from "@/components/calendar/TimeColumn";
import { TaskSegments } from "@/components/calendar/TaskSegments";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_TIME_SLOT_HEIGHT = 30;
const MAX_TIME_SLOT_HEIGHT = 120;

export default function CalendarPage() {
  const [scheduledSegments, setScheduledSegments] = useState([]);
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlotHeight, setTimeSlotHeight] = useState(60);
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { handleMouseDown, isDragging } = useCalendarScroll(scrollContainerRef);
  
  useEffect(() => {
    if (!user) return;
    fetchScheduledSegments();
  }, [user, currentMonth]);

  const fetchScheduledSegments = async () => {
    const { data: segments, error } = await supabase
      .from("scheduled_segments")
      .select(`
        *,
        tasks(*)
      `)
      .gte('start_time', startOfMonth(currentMonth).toISOString())
      .lte('start_time', endOfMonth(currentMonth).toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error("Error fetching scheduled segments:", error);
      return;
    }

    const formattedSegments = segments.map((segment) => ({
      taskId: segment.task_id,
      taskTitle: segment.tasks.title,
      startTime: new Date(segment.start_time),
      duration: segment.duration_minutes,
      status: segment.status,
      task: segment.tasks,
    }));

    setScheduledSegments(formattedSegments);
  };

  const getDaysInMonth = () => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  };

  const handleZoomIn = () => {
    setTimeSlotHeight(prev => Math.min(prev + 15, MAX_TIME_SLOT_HEIGHT));
  };

  const handleZoomOut = () => {
    setTimeSlotHeight(prev => Math.max(prev - 15, MIN_TIME_SLOT_HEIGHT));
  };

  return (
    <div className="w-full px-2 md:px-8 pt-12 md:pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar Schedule</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={timeSlotHeight <= MIN_TIME_SLOT_HEIGHT}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={timeSlotHeight >= MAX_TIME_SLOT_HEIGHT}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <ScrollArea 
          className="h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)] rounded-md overflow-hidden"
          ref={scrollContainerRef}
        >
          <div 
            className={`relative flex ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
            onMouseDown={handleMouseDown}
          >
            <TimeColumn hours={HOURS} timeSlotHeight={timeSlotHeight} />
            
            <div className="relative min-w-[calc(100vw-3rem)] md:min-w-0">
              <div className="flex">
                {getDaysInMonth().map((day, index) => (
                  <div
                    key={index}
                    className="flex-none w-[150px] md:w-[200px] border-r relative"
                  >
                    <div className="sticky top-0 z-[1] bg-background border-b p-2 text-center h-16">
                      <div className="font-medium">
                        {format(day, "EEEE")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(day, "MMM d")}
                      </div>
                    </div>
                    
                    <div className="relative">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="border-b transition-[height] duration-200"
                          style={{
                            '--time-slot-height': `${timeSlotHeight}px`,
                            height: 'var(--time-slot-height)',
                          } as CSSProperties}
                        />
                      ))}
                      
                      <TaskSegments 
                        segments={scheduledSegments}
                        day={day}
                        timeSlotHeight={timeSlotHeight}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}