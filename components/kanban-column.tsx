
'use client';

import { Task, TaskStatus } from '@/lib/types';
import { KanbanCard } from './kanban-card';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskEdit?: (task: Task) => void;
  className?: string;
}

export function KanbanColumn({ 
  title, 
  status, 
  tasks, 
  onTaskStatusChange, 
  onTaskDelete,
  onTaskEdit,
  className 
}: KanbanColumnProps) {
  return (
    <div className={cn('kanban-column', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>
      
      <div className="space-y-3 min-h-[500px]">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm">No hay tareas en esta columna</p>
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onStatusChange={onTaskStatusChange}
              onDelete={onTaskDelete}
              onEdit={onTaskEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}
