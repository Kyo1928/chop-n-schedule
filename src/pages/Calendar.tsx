import { useEffect, useState, CSSProperties } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Task = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  deadline: string;
  duration_minutes: number;
  repetition_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
};

type ScheduledSegment = {
  taskId: string;
  taskTitle: string;
  startTime: Date;
  duration: number;
  status: "on_time" | "missed_deadline";
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_TIME_SLOT_HEIGHT = 30; // Minimum height in pixels
const MAX_TIME_SLOT_HEIGHT = 120; // Maximum height in pixels
const ZOOM_STEP = 15; // Pixels to increase/decrease per zoom

export default function CalendarPage() {
  const [scheduledSegments, setScheduledSegments] = useState<ScheduledSegment[]>([]);
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlotHeight, setTimeSlotHeight] = useState(60); // Make this stateful
  
  useEffect(() => {
    if (!user) return;
    fetchScheduledSegments();
  }, [user, currentMonth]);

  const fetchScheduledSegments = async () => {
    const { data: segments, error } = await supabase
      .from("scheduled_segments")
      .select(`
        *,
        tasks:tasks(title)
      `)
      .gte('start_time', startOfMonth(currentMonth).toISOString())
      .lte('start_time', endOfMonth(currentMonth).toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error("Error fetching scheduled segments:", error);
      return;
    }

    const formattedSegments: ScheduledSegment[] = segments.map((segment: any) => ({
      taskId: segment.task_id,
      taskTitle: segment.tasks.title,
      startTime: new Date(segment.start_time),
      duration: segment.duration_minutes,
      status: segment.status,
    }));

    setScheduledSegments(formattedSegments);
  };

  const getDaysInMonth = () => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  };

  const getSegmentStyle = (segment: ScheduledSegment) => {
    const startHour = segment.startTime.getHours();
    const startMinute = segment.startTime.getMinutes();
    const durationInHours = segment.duration / 60;
    
    const top = (startHour + startMinute / 60) * timeSlotHeight;
    const height = durationInHours * timeSlotHeight;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: segment.status === "missed_deadline" ? "hsl(var(--destructive))" : "hsl(var(--primary))",
    };
  };

  const handleZoomIn = () => {
    setTimeSlotHeight(prev => Math.min(prev + ZOOM_STEP, MAX_TIME_SLOT_HEIGHT));
  };

  const handleZoomOut = () => {
    setTimeSlotHeight(prev => Math.max(prev - ZOOM_STEP, MIN_TIME_SLOT_HEIGHT));
  };

  return (
    <div className="w-full px-8 pt-16 md:pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar Schedule</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={timeSlotHeight <= MIN_TIME_SLOT_HEIGHT}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={timeSlotHeight >= MAX_TIME_SLOT_HEIGHT}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <ScrollArea className="h-[calc(100vh-7rem)] rounded-md">
          <div className="relative flex">
            {/* Time indicators */}
            <div className="sticky left-0 top-0 bottom-5 w-20 bg-background z-[2] border-r">
              {/* Offset for the first hour */}
              <div
                className="h-[calc(4rem-1px)] flex items-start justify-center"
              >
                <div className="font-bold text-m border-b text-center w-full py-1.5">Time</div>
              </div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[var(--time-slot-height)] flex items-start justify-center text-sm transition-[height] duration-200 relative"
                  style={{
                    '--time-slot-height': `${timeSlotHeight}px`
                  } as CSSProperties}
                >
                  <div className="absolute -top-2.5 text-muted-foreground">
                    {format(new Date().setHours(hour, 0), "HH:mm")}
                  </div>
                  <div className="absolute border-b w-3 right-0"/>
                </div>
              ))}
            </div>
            
            {/* Scrollable calendar content */}
            <div className="relative">
              <div className="flex min-w-max">
                {getDaysInMonth().map((day, index) => (
                  <div
                    key={index}
                    className="flex-none w-[200px] border-r relative"
                  >
                    <div className="sticky top-0 z-[1] bg-background border-b p-2 text-center h-16">
                
                      <div className="font-medium">
                        {format(day, "EEEE")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(day, "MMM d")}
                      </div>
                    </div>
                    
                    {/* Hour grid lines */}
                    <div className="relative">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="border-b h-[var(--time-slot-height)] transition-[height] duration-200"
                          style={{
                            '--time-slot-height': `${timeSlotHeight}px`
                          } as CSSProperties}
                        />
                      ))}
                    
                      {/* Scheduled segments for this day */}
                      {scheduledSegments
                        .filter(segment => 
                          format(segment.startTime, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                        )
                        .map((segment, segmentIndex) => (
                          <div
                            key={`${segment.taskId}-${segmentIndex}`}
                            className="absolute w-[calc(100%-8px)] mx-1 rounded-md p-2 text-primary-foreground overflow-hidden transition-all duration-200"
                            style={getSegmentStyle(segment)}
                          >
                            <div className="text-sm font-medium truncate">
                              {segment.taskTitle}
                            </div>
                            <Badge 
                              variant={segment.status === "missed_deadline" ? "destructive" : "secondary"}
                              className="mt-1"
                            >
                              {segment.status === "missed_deadline" ? "Misses Deadline!" : "On Time"}
                            </Badge>
                          </div>
                        ))}
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