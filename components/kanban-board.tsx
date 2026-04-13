
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Task, TaskStatus } from '@/lib/types';
import { KanbanColumn } from './kanban-column';
import { CreateTaskModal } from './create-task-modal';
import { EditTaskModal } from './edit-task-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const COLUMN_CONFIG = {
  TODO: {
    title: 'Por Hacer',
    color: 'border-l-gray-400',
    bgColor: 'bg-gray-50'
  },
  IN_PROGRESS: {
    title: 'En Progreso',
    color: 'border-l-blue-500',
    bgColor: 'bg-blue-50'
  },
  DONE: {
    title: 'Completado',
    color: 'border-l-green-500',
    bgColor: 'bg-green-50'
  }
};

export function KanbanBoard() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');
  const [programs, setPrograms] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchPrograms();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        toast.error('Error al cargar las tareas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/programs');
      if (response.ok) {
        const data = await response.json();
        setPrograms(data);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? updatedTask : task
          )
        );
        toast.success('Estado actualizado exitosamente');
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  const handleTaskCreated = () => {
    fetchTasks(); // Refrescar la lista de tareas
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleTaskUpdated = () => {
    fetchTasks(); // Refrescar la lista de tareas
    setIsEditModalOpen(false);
    setSelectedTask(null);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.program?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProgram = filterProgram === 'all' || task.programId === filterProgram;
    
    return matchesSearch && matchesProgram;
  });

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    TODO: filteredTasks.filter(task => task.status === 'TODO'),
    IN_PROGRESS: filteredTasks.filter(task => task.status === 'IN_PROGRESS'),
    DONE: filteredTasks.filter(task => task.status === 'DONE'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="w-full sm:w-64">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por programa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los programas</SelectItem>
            {programs.map(program => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {session?.user?.role === 'ADMIN' && (
          <Button 
            className="ceti-button-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        )}
      </div>

      {/* Tablero Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        {Object.entries(COLUMN_CONFIG).map(([status, config]) => (
          <KanbanColumn
            key={status}
            title={config.title}
            status={status as TaskStatus}
            tasks={tasksByStatus[status as TaskStatus]}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskDelete={handleTaskDelete}
            onTaskEdit={handleTaskEdit}
            className={`${config.color} ${config.bgColor}`}
          />
        ))}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-600">
            {tasksByStatus.TODO.length}
          </div>
          <div className="text-sm text-gray-500">Por Hacer</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            {tasksByStatus.IN_PROGRESS.length}
          </div>
          <div className="text-sm text-gray-500">En Progreso</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {tasksByStatus.DONE.length}
          </div>
          <div className="text-sm text-gray-500">Completadas</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-purple-600">
            {filteredTasks.length}
          </div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
      </div>

      {/* Modal de Crear Tarea */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
        programs={programs}
      />

      {/* Modal de Editar Tarea */}
      {selectedTask && (
        <EditTaskModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={handleTaskUpdated}
          task={selectedTask}
          programs={programs}
        />
      )}
    </div>
  );
}
