import { Database } from "@/integrations/supabase/types";
import { addDays, addWeeks, differenceInMinutes, addMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface TimeSlot {
  start: Date;
  end: Date;
  status: TaskStatus;
}

let weeksToReschedule = 6;
const millisecondsInMinute = 60 * 1000;

function findAvailableSlots(
  existingSegments: TimeSlot[],
  duration: number,
  taskOriginalStartTime: Date,
  taskOriginalDeadline: Date,
  currentDateToStartFrom: Date,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  // Set the current time to respect the original task's time of day
  let currentStartTime = new Date(currentDateToStartFrom);
  currentStartTime.setHours(taskOriginalStartTime.getHours(), taskOriginalStartTime.getMinutes(), 0, 0);

  let deadlineDifference = differenceInMinutes(taskOriginalDeadline, taskOriginalStartTime);
  let currentDeadline = new Date(currentStartTime);
  currentDeadline = addMinutes(currentDeadline, deadlineDifference);
  
  let remainingDuration = duration;

  // Sort existing segments by start time
  const sortedSegments = [...existingSegments].sort((a, b) => 
    a.start.getTime() - b.start.getTime()
  );

  let currentTime = new Date(currentStartTime);
  while (remainingDuration > 0) {
    const nextSegment = sortedSegments.find(seg => 
      seg.start.getTime() >= currentTime.getTime() ||
      (seg.start.getTime() < currentTime.getTime() && seg.end.getTime() > currentTime.getTime())
    );

    if (!nextSegment) {
      const slotEnd = addMinutes(currentTime, remainingDuration);
      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        status: slotEnd > currentDeadline ? 'missed_deadline' : 'on_time'
      });
      remainingDuration = 0
      break;
    } else if (nextSegment.start.getTime() < currentTime.getTime()) {
      currentTime = new Date(nextSegment.start);
      continue;
    }

    const timeUntilNext = (nextSegment.start.getTime() - currentTime.getTime()) / millisecondsInMinute;
    
    if (timeUntilNext > 0) {
      const availableDuration = Math.min(remainingDuration, timeUntilNext);
      const slotEnd = addMinutes(currentTime, availableDuration);      
      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        status: slotEnd > currentDeadline ? 'missed_deadline' : 'on_time'
      });
      
      remainingDuration -= availableDuration;
    }

    currentTime = new Date(nextSegment.end);
  }

  return slots;
}

async function deleteExistingSegments() {
  console.log('Deleting existing segments...');
  const { error: deleteError } = await supabase
    .from('scheduled_segments')
    .delete()
    .not('id', 'is', null);

  if (deleteError) {
    console.error('Error deleting segments:', deleteError);
    throw deleteError;
  }
}

async function fetchTasks() {
  console.log('Fetching tasks...');
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .order('deadline', { ascending: true });

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
    throw tasksError;
  }

  return tasks;
}

export async function rescheduleAllTasks() {
  try {
    await deleteExistingSegments();

    const tasks = await fetchTasks();

    console.log('Creating new segments...');
    const newSegments = [];
    const weeksFromNow = addWeeks(new Date(), weeksToReschedule);
    const existingTimeSlots: TimeSlot[] = [];
    
    const sortedTasks = [...tasks].sort((a, b) => 
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
    
    for (const task of sortedTasks) {
      const startDate = new Date(task.start_time);
      let endDate: Date;
     
      // Set the end date to the repetition end date if the task has a repetition type
      if (task.repetition_type && task.repetition_type !== 'none') {
        endDate = weeksFromNow;
        
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
        const availableSlots = findAvailableSlots(
          existingTimeSlots,
          task.duration_minutes,
          startDate,
          new Date(task.deadline),
          currentDate
        );

        for (const slot of availableSlots) {
          const segment = {
            task_id: task.id,
            start_time: slot.start.toISOString(),
            duration_minutes: differenceInMinutes(slot.end, slot.start),
            status: slot.status
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