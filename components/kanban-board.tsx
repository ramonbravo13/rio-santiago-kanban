
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
import { Plus, Search, Filter, User, Calendar } from 'lucide-react';
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

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function KanbanBoard() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [programs, setPrograms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [session?.user?.role]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.filter((user: any) => user.isActive));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchWithRetry = async (url: string, retries = 2, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.json();
        if (i === retries - 1) throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 1000));
      }
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchWithRetry('/api/tasks');
      setTasks(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar las tareas. Por favor, refresca la página.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const data = await fetchWithRetry('/api/programs');
      setPrograms(data);
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
    
    const matchesAssignee = filterAssignee === 'all' || task.assignees?.some(a => a.userId === filterAssignee);
    
    const matchesMonth = filterMonth === 'all' || (task.dueDate && new Date(task.dueDate).getMonth().toString() === filterMonth);
    
    return matchesSearch && matchesProgram && matchesAssignee && matchesMonth;
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
            <SelectValue placeholder="Filtrar por flujo de trabajo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los flujos de trabajo</SelectItem>
            {programs.map(program => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {session?.user?.role === 'ADMIN' && (
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-full sm:w-64">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los responsables</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {session?.user?.role === 'ADMIN' && (
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-full sm:w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {MONTHS.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
            onTaskUpdated={fetchTasks}
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
