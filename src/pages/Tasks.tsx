import { TaskForm } from "@/components/tasks/TaskForm";

export default function TasksPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Task</h1>
      <div className="max-w-2xl mx-auto">
        <TaskForm />
      </div>
    </div>
  );
}