import { Database } from "@/integrations/supabase/types";
import { addDays, addWeeks, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface TimeSlot {
  start: Date;
  end: Date;
  duration: number;
}

function findAvailableSlots(
  startTime: Date,
  endTime: Date,
  existingSegments: TimeSlot[],
  duration: number,
  taskStartTime: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  // Ensure we don't start before the task's start time
  let currentTime = new Date(Math.max(startTime.getTime(), taskStartTime.getTime()));
  let remainingDuration = duration;

  // Sort existing segments by start time
  const sortedSegments = [...existingSegments].sort((a, b) => 
    a.start.getTime() - b.start.getTime()
  );

  while (currentTime < endTime && remainingDuration > 0) {
    const nextSegment = sortedSegments.find(seg => 
      seg.start.getTime() >= currentTime.getTime() &&
      seg.start.getTime() <= endTime.getTime()
    );

    if (!nextSegment) {
      const availableDuration = Math.min(
        remainingDuration,
        (endTime.getTime() - currentTime.getTime()) / (1000 * 60)
      );
      
      if (availableDuration > 0) {
        const slotEnd = new Date(currentTime.getTime() + availableDuration * 60 * 1000);
        slots.push({
          start: new Date(currentTime),
          end: slotEnd,
          duration: availableDuration
        });
        remainingDuration -= availableDuration;
      }
      break;
    }

    const timeUntilNext = (nextSegment.start.getTime() - currentTime.getTime()) / (1000 * 60);
    
    if (timeUntilNext > 0) {
      const availableDuration = Math.min(remainingDuration, timeUntilNext);
      const slotEnd = new Date(currentTime.getTime() + availableDuration * 60 * 1000);
      
      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        duration: availableDuration
      });
      
      remainingDuration -= availableDuration;
    }

    currentTime = new Date(nextSegment.end);
  }

  return slots;
}

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
    const existingTimeSlots: TimeSlot[] = [];
    
    const sortedTasks = [...tasks].sort((a, b) => 
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
    
    for (const task of sortedTasks) {
      const startDate = new Date(task.start_time);
      let endDate: Date;
      
      if (task.repetition_type && task.repetition_type !== 'none') {
        endDate = twoWeeksFromNow;
        
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
        const dayStart = new Date(currentDate);
        dayStart.setHours(9, 0, 0, 0);
        
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(17, 0, 0, 0);
        
        const availableSlots = findAvailableSlots(
          dayStart,
          dayEnd,
          existingTimeSlots,
          task.duration_minutes,
          startDate // Pass the task's start time
        );

        for (const slot of availableSlots) {
          const segment = {
            task_id: task.id,
            start_time: slot.start.toISOString(),
            duration_minutes: slot.duration,
            status: (new Date(task.deadline) < new Date() ? 'missed_deadline' : 'on_time') as TaskStatus
          };
          
          newSegments.push(segment);
          existingTimeSlots.push(slot);
        }
        
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