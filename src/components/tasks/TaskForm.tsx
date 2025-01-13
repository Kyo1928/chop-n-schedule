import { useState } from "react";
import { useForm } from "react-hook-form";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";

type TaskFormProps = {
  onTaskCreated?: () => void;
};

type TaskFormData = {
  title: string;
  description: string;
  duration_minutes: number;
  repetition_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
  start_time_hour: string;
  start_time_minute: string;
  deadline_hour: string;
  deadline_minute: string;
};

export function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [deadline, setDeadline] = useState<Date>();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<TaskFormData>({
    defaultValues: {
      title: "",
      description: "",
      duration_minutes: 30,
      repetition_type: "none",
      start_time_hour: "09",
      start_time_minute: "00",
      deadline_hour: "17",
      deadline_minute: "00",
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    if (!startDate || !deadline) {
      toast({
        title: "Error",
        description: "Please select both start date and deadline",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create tasks",
        variant: "destructive",
      });
      return;
    }

    // Set time on the dates
    const startDateTime = new Date(startDate);
    startDateTime.setHours(
      parseInt(data.start_time_hour),
      parseInt(data.start_time_minute)
    );

    const deadlineDateTime = new Date(deadline);
    deadlineDateTime.setHours(
      parseInt(data.deadline_hour),
      parseInt(data.deadline_minute)
    );

    try {
      console.log("Creating task with user_id:", user.id);
      const { error } = await supabase.from("tasks").insert({
        title: data.title,
        description: data.description,
        user_id: user.id,
        start_time: startDateTime.toISOString(),
        deadline: deadlineDateTime.toISOString(),
        duration_minutes: data.duration_minutes,
        repetition_type: data.repetition_type,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      // Call the onTaskCreated callback if provided
      onTaskCreated?.();

      form.reset();
      setStartDate(undefined);
      setDeadline(undefined);
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Task title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Task description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <FormLabel>Start Date</FormLabel>
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              className="rounded-md border"
            />
            <div className="flex gap-2 mt-2">
              <FormField
                control={form.control}
                name="start_time_hour"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="HH"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_time_minute"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="MM"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <FormLabel>Deadline</FormLabel>
            <Calendar
              mode="single"
              selected={deadline}
              onSelect={setDeadline}
              className="rounded-md border"
            />
            <div className="flex gap-2 mt-2">
              <FormField
                control={form.control}
                name="deadline_hour"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="HH"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline_minute"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="MM"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="repetition_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repetition</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select repetition type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Create Task
        </Button>
      </form>
    </Form>
  );
}