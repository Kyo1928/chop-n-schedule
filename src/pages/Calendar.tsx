import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Task = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  deadline: string;
  duration_minutes: number;
};

type ScheduledSegment = {
  taskId: string;
  taskTitle: string;
  startTime: Date;
  duration: number;
};

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduledSegments, setScheduledSegments] = useState<ScheduledSegment[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching tasks:", error);
        return;
      }

      setTasks(data || []);
      scheduleSegments(data || []);
    };

    fetchTasks();
  }, [user]);

  const scheduleSegments = (tasks: Task[]) => {
    const segments: ScheduledSegment[] = [];
    const sortedTasks = [...tasks].sort((a, b) => {
      // First by deadline
      const deadlineDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (deadlineDiff !== 0) return deadlineDiff;
      
      // Then by start time
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

    for (const task of sortedTasks) {
      const startTime = new Date(task.start_time);
      const deadline = new Date(task.deadline);
      const duration = task.duration_minutes;

      // Find available time slot
      let scheduledStart = startTime;
      let canSchedule = false;

      while (scheduledStart <= deadline) {
        const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);
        
        // Check if this slot overlaps with any existing segments
        const hasOverlap = segments.some(segment => {
          const segmentEnd = new Date(segment.startTime.getTime() + segment.duration * 60000);
          return (
            (scheduledStart >= segment.startTime && scheduledStart < segmentEnd) ||
            (scheduledEnd > segment.startTime && scheduledEnd <= segmentEnd)
          );
        });

        if (!hasOverlap && scheduledEnd <= deadline) {
          canSchedule = true;
          break;
        }

        // Try next 30-minute slot
        scheduledStart = new Date(scheduledStart.getTime() + 30 * 60000);
      }

      if (canSchedule) {
        segments.push({
          taskId: task.id,
          taskTitle: task.title,
          startTime: scheduledStart,
          duration: duration,
        });
      }
    }

    setScheduledSegments(segments);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Auto-Scheduled Calendar</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Duration (minutes)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scheduledSegments.map((segment, index) => {
              const endTime = new Date(
                segment.startTime.getTime() + segment.duration * 60000
              );
              return (
                <TableRow key={`${segment.taskId}-${index}`}>
                  <TableCell>{segment.taskTitle}</TableCell>
                  <TableCell>{format(segment.startTime, "PPp")}</TableCell>
                  <TableCell>{format(endTime, "PPp")}</TableCell>
                  <TableCell>{segment.duration}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}