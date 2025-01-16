import { CSSProperties } from 'react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { Task } from '@/types/task';

interface TaskSegmentsProps {
  segments: Array<{
    taskId: string;
    taskTitle: string;
    startTime: Date;
    duration: number;
    status: "on_time" | "missed_deadline";
    task?: Task;
  }>;
  day: Date;
  timeSlotHeight: number;
}

export const TaskSegments = ({ segments, day, timeSlotHeight }: TaskSegmentsProps) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getSegmentStyle = (segment: typeof segments[0]) => {
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

  const getEndTime = (startTime: Date, durationMinutes: number) => {
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);
    return endTime;
  };

  return (
    <>
      {segments
        .filter(segment => 
          format(segment.startTime, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        )
        .map((segment, segmentIndex) => (
          <HoverCard key={`${segment.taskId}-${segmentIndex}`}>
            <HoverCardTrigger asChild>
              <div
                className="absolute w-[calc(100%-8px)] mx-1 rounded-md p-2 text-primary-foreground overflow-hidden transition-all duration-200 cursor-pointer border border-border/50"
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
                <Badge 
                  variant={segment.status === "missed_deadline" ? "destructive" : "secondary"}
                  className="border-primary-foreground text-primary-foreground dark:text-white"
                >
                  {segment.status === "missed_deadline" ? "Misses Deadline!" : "On Time"}
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Duration: {formatDuration(segment.duration)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    Scheduled: {format(segment.startTime, "MMM d, yyyy HH:mm")} - {format(getEndTime(segment.startTime, segment.duration), "HH:mm")}
                  </span>
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
    </>
  );
};