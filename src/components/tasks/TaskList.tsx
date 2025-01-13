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
  repetition_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      
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
    };

    fetchTasks();
  }, [user]);

  if (!tasks.length) {
    return <div className="text-center text-gray-500 my-8">No tasks found</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Repetition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>{task.title}</TableCell>
              <TableCell>{task.description || "-"}</TableCell>
              <TableCell>
                {format(new Date(task.start_time), "PPp")}
              </TableCell>
              <TableCell>
                {format(new Date(task.deadline), "PPp")}
              </TableCell>
              <TableCell>{task.duration_minutes} minutes</TableCell>
              <TableCell>{task.repetition_type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}