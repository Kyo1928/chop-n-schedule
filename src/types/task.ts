export interface Task {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  deadline: string;
  duration_minutes: number;
  repetition_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
}