import { useEffect, useState, CSSProperties, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Calendar as CalendarIcon, ZoomIn, ZoomOut } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

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
  task?: Task;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_TIME_SLOT_HEIGHT = 30;
const MAX_TIME_SLOT_HEIGHT = 120;
const ZOOM_STEP = 15;

export default function CalendarPage() {
  const [scheduledSegments, setScheduledSegments] = useState<ScheduledSegment[]>([]);
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlotHeight, setTimeSlotHeight] = useState(60);
  const isMobile = useIsMobile();
  
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

    const formattedSegments: ScheduledSegment[] = segments.map((segment: any) => ({
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

  const getSegmentStyle = (segment: ScheduledSegment) => {
    const startHour = segment.startTime.getHours();
    const startMinute = segment.startTime.getMinutes();
    const durationInHours = segment.duration / 60;
    const backgroundColor = segment.status === "missed_deadline" 
      ? "hsl(var(--destructive))" 
      : "hsl(var(--primary))";
    
    const top = (startHour + startMinute / 60) * timeSlotHeight;
    const height = durationInHours * timeSlotHeight;
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor,
    };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleZoomIn = () => {
    setTimeSlotHeight(prev => Math.min(prev + 15, 120));
  };

  const handleZoomOut = () => {
    setTimeSlotHeight(prev => Math.max(prev - 15, 30));
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [lastTime, setLastTime] = useState(0);
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    
    setIsDragging(true);
    setStartX(e.pageX - scrollContainer.getBoundingClientRect().left);
    setStartY(e.pageY - scrollContainer.getBoundingClientRect().top);
    setScrollLeft(scrollContainer.scrollLeft);
    setScrollTop(scrollContainer.scrollTop);
    setLastTime(Date.now());
    setLastPoint({ x: e.pageX, y: e.pageY });
    setVelocity({ x: 0, y: 0 });
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    let currentVelocity = { ...velocity };
    const animate = () => {
      currentVelocity = {
        x: currentVelocity.x * 0.95,
        y: currentVelocity.y * 0.95,
      };

      scrollContainer.scrollLeft += currentVelocity.x;
      scrollContainer.scrollTop += currentVelocity.y;

      if (Math.abs(currentVelocity.x) > 0.1 || Math.abs(currentVelocity.y) > 0.1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const scrollContainer = scrollContainerRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!isDragging || !scrollContainer) return;
    
    e.preventDefault();
    const x = e.pageX - scrollContainer.getBoundingClientRect().left;
    const y = e.pageY - scrollContainer.getBoundingClientRect().top;
    const walkX = (x - startX);
    const walkY = (y - startY);
    
    const currentTime = Date.now();
    const timeElapsed = currentTime - lastTime;
    
    if (timeElapsed > 0) {
      const velocityX = (e.pageX - lastPoint.x) / timeElapsed * 16;
      const velocityY = (e.pageY - lastPoint.y) / timeElapsed * 16;
      setVelocity({ x: velocityX, y: velocityY });
    }
    
    setLastTime(currentTime);
    setLastPoint({ x: e.pageX, y: e.pageY });
    
    scrollContainer.scrollLeft = scrollLeft - walkX;
    scrollContainer.scrollTop = scrollTop - walkY;
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
            className="relative flex cursor-grab select-none active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div className="sticky left-0 top-0 bottom-5 w-12 md:w-20 bg-background z-[2] border-r">
              <div className="h-[calc(4rem-1px)] flex items-start justify-center">
                <div className="font-bold text-sm md:text-base border-b text-center w-full py-1.5">Time</div>
              </div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[var(--time-slot-height)] flex items-start justify-center text-xs md:text-sm transition-[height] duration-200 relative"
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
                          className="border-b h-[var(--time-slot-height)] transition-[height] duration-200"
                          style={{
                            '--time-slot-height': `${timeSlotHeight}px`
                          } as CSSProperties}
                        />
                      ))}
                    
                      {scheduledSegments
                        .filter(segment => 
                          format(segment.startTime, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                        )
                        .map((segment, segmentIndex) => (
                          <HoverCard key={`${segment.taskId}-${segmentIndex}`}>
                            <HoverCardTrigger asChild>
                              <div
                                className="absolute w-[calc(100%-8px)] mx-1 rounded-md p-2 text-primary-foreground overflow-hidden transition-all duration-200 cursor-pointer"
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
                            </HoverCardTrigger>
                            <HoverCardContent 
                              className="w-80" 
                              style={{ 
                                backgroundColor: segment.status === "missed_deadline" 
                                  ? "hsl(var(--destructive))" 
                                  : "hsl(var(--primary))",
                                color: "hsl(var(--primary-foreground))",
                                border: "none"
                              }}
                            >
                              <div className="space-y-2">
                                <h3 className="text-lg font-semibold">{segment.task?.title}</h3>
                                {segment.task?.description && (
                                  <p className="text-sm opacity-90">
                                    {segment.task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4" />
                                  <span>Duration: {formatDuration(segment.duration)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>
                                    Deadline: {format(new Date(segment.task?.deadline || ''), "MMM d, yyyy HH:mm")}
                                  </span>
                                </div>
                                {segment.task?.repetition_type !== 'none' && (
                                  <Badge variant="outline" className="mt-2 border-primary-foreground text-primary-foreground">
                                    Repeats: {segment.task?.repetition_type}
                                  </Badge>
                                )}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
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