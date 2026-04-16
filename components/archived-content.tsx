'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { KanbanCard } from '@/components/kanban-card';

export function ArchivedContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArchivedTasks();
  }, []);

  const fetchArchivedTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tasks?isArchived=true');
      if (response.ok) {
        const data = await response.json();
        // Orden descendente (más recientes primero)
        const sortedData = data.sort((a: Task, b: Task) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTasks(sortedData);
      }
    } catch (error) {
      toast.error('Error al cargar tareas archivadas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskDeletedOrRestored = (taskId: string) => {
    // Al restaurar una tarea, KanbanCard emite onDelete, por lo que podemos sacarla de esta vista
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const filteredTasks = tasks.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Cargando tareas archivadas...</div>;
  }

  return (
    <div className="bg-transparent flex flex-col flex-1 overflow-hidden">
      <div className="pb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar tarea archivada..." 
            className="pl-9 bg-white shadow-sm border-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="overflow-auto p-0 flex-1">
        {filteredTasks.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-white border rounded-lg shadow-sm">
             <AlertTriangle className="h-12 w-12 mb-4 text-gray-300" />
             <p className="text-lg font-medium">No se encontraron tareas archivadas</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {filteredTasks.map(task => (
              <KanbanCard
                key={task.id}
                task={task}
                onStatusChange={() => {}} // No operation, disabled on archived state anyway
                onDelete={handleTaskDeletedOrRestored}
                onTaskUpdated={fetchArchivedTasks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
