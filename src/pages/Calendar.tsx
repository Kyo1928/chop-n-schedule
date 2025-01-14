import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
const TIME_SLOT_HEIGHT = 60; // 60px per hour

export default function CalendarPage() {
  const [scheduledSegments, setScheduledSegments] = useState<ScheduledSegment[]>([]);
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
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
    
    const top = (startHour + startMinute / 60) * TIME_SLOT_HEIGHT;
    const height = durationInHours * TIME_SLOT_HEIGHT;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: segment.status === "missed_deadline" ? "hsl(var(--destructive))" : "hsl(var(--primary))",
    };
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Calendar Schedule</h1>
      <div className="rounded-md border">
        <ScrollArea className="h-[calc(100vh-12rem)] rounded-md" orientation="vertical">
          <div className="relative">
            {/* Time indicators */}
            <div className="absolute left-0 top-0 w-20 bg-background z-10 border-r">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b h-[60px] flex items-center justify-center text-sm"
                >
                  {format(new Date().setHours(hour, 0), "HH:mm")}
                </div>
              ))}
            </div>
            
            {/* Scrollable calendar content */}
            <ScrollArea className="ml-20" orientation="horizontal">
              <div className="flex min-w-max">
                {getDaysInMonth().map((day, index) => (
                  <div
                    key={index}
                    className="flex-none w-[200px] border-r relative"
                  >
                    <div className="sticky top-0 z-10 bg-background border-b p-2 text-center">
                      <div className="font-medium">
                        {format(day, "EEEE")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(day, "MMM d")}
                      </div>
                    </div>
                    
                    {/* Hour grid lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="border-b h-[60px]"
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
                          className="absolute w-[calc(100%-8px)] mx-1 rounded-md p-2 text-primary-foreground overflow-hidden"
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
                ))}
              </div>
            </ScrollArea>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}