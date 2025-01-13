import { useState } from "react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";

export default function TasksPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      
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