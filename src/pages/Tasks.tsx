import { useState } from "react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";

export default function TasksPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container py-4 md:py-6 pt-16 md:pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
          <TaskForm onTaskCreated={handleTaskCreated} />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Tasks</h2>
          <TaskList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}