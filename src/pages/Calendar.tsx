import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, addWeeks, addMonths, addYears, isAfter } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduledSegments, setScheduledSegments] = useState<ScheduledSegment[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchTasks = async () => {
      console.log("Fetching tasks for user:", user.id);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching tasks:", error);
        return;
      }

      console.log("Fetched tasks:", data);
      setTasks(data || []);
      scheduleSegments(data || []);
    };

    fetchTasks();
  }, [user]);

  const generateRepeatedTasks = (task: Task): Task[] => {
    const tasks: Task[] = [task];
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    if (task.repetition_type === "none") return tasks;

    let currentDate = new Date(task.start_time);
    let currentDeadline = new Date(task.deadline);

    while (currentDate < oneMonthFromNow) {
      let nextDate: Date;
      let nextDeadline: Date;

      switch (task.repetition_type) {
        case "daily":
          nextDate = addDays(currentDate, 1);
          nextDeadline = addDays(currentDeadline, 1);
          break;
        case "weekly":
          nextDate = addWeeks(currentDate, 1);
          nextDeadline = addWeeks(currentDeadline, 1);
          break;
        case "monthly":
          nextDate = addMonths(currentDate, 1);
          nextDeadline = addMonths(currentDeadline, 1);
          break;
        case "yearly":
          nextDate = addYears(currentDate, 1);
          nextDeadline = addYears(currentDeadline, 1);
          break;
        default:
          return tasks;
      }

      if (nextDate >= oneMonthFromNow) break;

      tasks.push({
        ...task,
        start_time: nextDate.toISOString(),
        deadline: nextDeadline.toISOString(),
      });

      currentDate = nextDate;
      currentDeadline = nextDeadline;
    }

    return tasks;
  };

  const scheduleSegments = async (tasks: Task[]) => {
    const segments: ScheduledSegment[] = [];
    const allTasks: Task[] = [];
    
    // Generate repeated tasks
    tasks.forEach(task => {
      allTasks.push(...generateRepeatedTasks(task));
    });
    
    // Sort tasks by deadline and start time
    const sortedTasks = [...allTasks].sort((a, b) => {
      const deadlineDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (deadlineDiff !== 0) return deadlineDiff;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });

    for (const task of sortedTasks) {
      const startTime = new Date(task.start_time);
      const deadline = new Date(task.deadline);
      const duration = task.duration_minutes;

      let scheduledStart = startTime;
      let canSchedule = false;

      while (scheduledStart <= deadline) {
        const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);
        
        const hasOverlap = segments.some(segment => {
          const segmentEnd = new Date(segment.startTime.getTime() + segment.duration * 60000);
          return (
            (scheduledStart >= segment.startTime && scheduledStart < segmentEnd) ||
            (scheduledEnd > segment.startTime && scheduledEnd <= segmentEnd)
          );
        });

        if (!hasOverlap) {
          canSchedule = true;
          break;
        }

        scheduledStart = new Date(scheduledStart.getTime() + 30 * 60000);
      }

      if (canSchedule) {
        const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);
        const status = isAfter(scheduledEnd, deadline) ? "missed_deadline" : "on_time";

        // Save the scheduled segment to the database
        const { error } = await supabase.from("scheduled_segments").insert({
          task_id: task.id,
          start_time: scheduledStart.toISOString(),
          duration_minutes: duration,
          status: status,
        });

        if (error) {
          console.error("Error saving scheduled segment:", error);
          continue;
        }

        segments.push({
          taskId: task.id,
          taskTitle: task.title,
          startTime: scheduledStart,
          duration: duration,
          status: status,
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
              <TableHead>Status</TableHead>
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
                  <TableCell>
                    {segment.status === "missed_deadline" ? (
                      <Badge variant="destructive">Misses Deadline!</Badge>
                    ) : (
                      <Badge variant="default">On Time</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}