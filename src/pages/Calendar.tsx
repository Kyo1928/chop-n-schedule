import { useEffect, useState, CSSProperties, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ZoomIn, ZoomOut, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCalendarScroll } from "@/hooks/use-calendar-scroll";
import { TimeColumn } from "@/components/calendar/TimeColumn";
import { TaskSegments } from "@/components/calendar/TaskSegments";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_TIME_SLOT_HEIGHT = 30;
const MAX_TIME_SLOT_HEIGHT = 120;
const MONTHS_TO_LOAD = 3;

export default function CalendarPage() {
  const [scheduledSegments, setScheduledSegments] = useState([]);
  const { user } = useAuth();
  const [centerMonth, setCenterMonth] = useState(new Date());
  const [visibleMonths, setVisibleMonths] = useState([centerMonth]);
  const [timeSlotHeight, setTimeSlotHeight] = useState(60);
  const [currentYear, setCurrentYear] = useState(format(new Date(), 'yyyy'));
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  
  const { handleMouseDown, isDragging } = useCalendarScroll(scrollContainerRef);

  useEffect(() => {
    if (!user) return;
    fetchScheduledSegments();
  }, [user, visibleMonths]);

  const fetchScheduledSegments = async () => {
    if (visibleMonths.length === 0) return;
    
    const startDate = startOfMonth(visibleMonths[0]);
    const endDate = endOfMonth(visibleMonths[visibleMonths.length - 1]);

    const { data: segments, error } = await supabase
      .from("scheduled_segments")
      .select(`
        *,
        tasks(*)
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
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

  const getVisibleDays = () => {
    const allDays = visibleMonths.flatMap(month => 
      eachDayOfInterval({
        start: startOfMonth(month),
        end: endOfMonth(month),
      })
    );
    return allDays;
  };

  const handleScroll = () => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const scrollPosition = viewport.scrollLeft;
    const totalWidth = viewport.scrollWidth;
    const viewportWidth = viewport.clientWidth;
    const visibleDays = getVisibleDays();
    
    // Update the current year based on the leftmost visible day
    const leftmostVisibleIndex = Math.floor(scrollPosition / 200); // Assuming each day column is 200px wide
    if (leftmostVisibleIndex >= 0 && leftmostVisibleIndex < visibleDays.length) {
      const leftmostVisibleDay = visibleDays[leftmostVisibleIndex];
      setCurrentYear(format(leftmostVisibleDay, 'yyyy'));
    }

    // If we're near the end, load next month and remove first month
    if (scrollPosition > totalWidth - viewportWidth - 200) {
      setVisibleMonths(prev => {
        const nextMonth = addMonths(prev[prev.length - 1], 1);
        return [...prev.slice(1), nextMonth];
      });
    }
    // If we're near the start, load previous month and remove last month
    else if (scrollPosition < 200) {
      setVisibleMonths(prev => {
        const prevMonth = subMonths(prev[0], 1);
        return [prevMonth, ...prev.slice(0, -1)];
      });
    }
  };

  const handleZoomIn = () => {
    setTimeSlotHeight(prev => Math.min(prev + 15, MAX_TIME_SLOT_HEIGHT));
  };

  const handleZoomOut = () => {
    setTimeSlotHeight(prev => Math.max(prev - 15, MIN_TIME_SLOT_HEIGHT));
  };

  const goToToday = () => {
    const today = new Date();
    setCenterMonth(today);
    setVisibleMonths([
      subMonths(today, 1),
      today,
      addMonths(today, 1)
    ]);
    
    // Scroll to today's column after a short delay to ensure the DOM has updated
    setTimeout(() => {
      const todayColumn = document.querySelector('[data-is-today="true"]');
      if (todayColumn) {
        todayColumn.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 100);
  };

  // Initialize visible months on mount
  useEffect(() => {
    setVisibleMonths([
      subMonths(centerMonth, 1),
      centerMonth,
      addMonths(centerMonth, 1)
    ]);
  }, []);

  return (
    <div className="w-full px-2 md:px-8 pt-12 md:pt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold">Calendar Schedule</h1>
            <span className="text-lg text-muted-foreground">{currentYear}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="hidden md:flex"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Today
          </Button>
        </div>
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
          onScroll={handleScroll}
          scrollHideDelay={0}
        >
          <div 
            className={`relative flex ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
            onMouseDown={handleMouseDown}
            ref={scrollViewportRef}
          >
            <TimeColumn hours={HOURS} timeSlotHeight={timeSlotHeight} />
            
            <div className="relative min-w-[calc(100vw-3rem)] md:min-w-0">
              <div className="flex">
                {getVisibleDays().map((day, index) => (
                  <div
                    key={index}
                    className={`flex-none w-[150px] md:w-[200px] border-r relative ${
                      isToday(day) ? 'bg-accent/20' : ''
                    }`}
                    data-is-today={isToday(day)}
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