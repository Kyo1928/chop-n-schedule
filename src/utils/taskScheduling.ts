import { Database } from "@/integrations/supabase/types";
import { addDays, addWeeks } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

export async function rescheduleAllTasks() {
  try {
    console.log('Deleting existing segments...');
    const { error: deleteError } = await supabase
      .from('scheduled_segments')
      .delete()
      .not('id', 'is', null);

    if (deleteError) {
      console.error('Error deleting segments:', deleteError);
      throw deleteError;
    }

    console.log('Fetching tasks...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('deadline', { ascending: true });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log('Creating new segments...');
    const newSegments = [];
    const twoWeeksFromNow = addWeeks(new Date(), 2);
    
    for (const task of tasks) {
      const startDate = new Date(task.start_time);
      let endDate: Date;
      
      // For repeating tasks, set end date to 2 weeks from now
      if (task.repetition_type && task.repetition_type !== 'none') {
        endDate = twoWeeksFromNow;
        
        // Update the task's repetition_end_date in the database
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ repetition_end_date: endDate.toISOString() })
          .eq('id', task.id);
          
        if (updateError) {
          console.error('Error updating task repetition end date:', updateError);
          throw updateError;
        }
      } else {
        endDate = new Date(task.deadline);
      }
      
      let currentDate = startDate;
      
      while (currentDate <= endDate) {
        const segmentStartTime = new Date(currentDate);
        const segmentDeadline = new Date(task.deadline);
        
        newSegments.push({
          task_id: task.id,
          start_time: segmentStartTime.toISOString(),
          duration_minutes: task.duration_minutes,
          status: (segmentDeadline < new Date() ? 'missed_deadline' : 'on_time') as TaskStatus
        });
        
        // Calculate next occurrence based on repetition type
        switch (task.repetition_type) {
          case 'daily':
            currentDate = addDays(currentDate, 1);
            break;
          case 'weekly':
            currentDate = addDays(currentDate, 7);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
          default:
            // For non-repeating tasks, exit the loop after one iteration
            currentDate = new Date(endDate.getTime() + 1);
        }
      }
    }

    if (newSegments.length > 0) {
      console.log('Inserting segments:', newSegments);
      const { error: insertError } = await supabase
        .from('scheduled_segments')
        .insert(newSegments);

      if (insertError) {
        console.error('Error inserting segments:', insertError);
        throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error rescheduling tasks:', error);
    throw error;
  }
}