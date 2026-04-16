'use client';

import { useState, useEffect } from 'react';
import { Task, TaskStatus } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, AlertTriangle, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

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

  const handleRestore = async (task: Task) => {
    if (!confirm(`¿Restaurar la tarea "${task.name}" al tablero?`)) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false })
      });

      if (response.ok) {
        toast.success('Tarea restaurada correctamente');
        fetchArchivedTasks();
      } else {
        toast.error('Error al restaurar la tarea');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Cargando tareas archivadas...</div>;
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm flex flex-col flex-1 overflow-hidden">
      <div className="p-4 border-b bg-gray-50/50">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar tarea archivada..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="overflow-auto p-0 flex-1">
        {filteredTasks.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-12 text-gray-400">
             <AlertTriangle className="h-12 w-12 mb-4 text-gray-300" />
             <p className="text-lg font-medium">No se encontraron tareas archivadas</p>
           </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b sticky top-0 z-10 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Información de la Tarea</th>
                <th className="px-6 py-3 font-medium text-gray-500 hidden lg:table-cell">Estado Previo</th>
                <th className="px-6 py-3 font-medium text-gray-500">Creación</th>
                <th className="px-6 py-3 font-medium text-gray-500">Asignados</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors flex flex-col md:table-row p-4 md:p-0">
                  <td className="px-0 md:px-6 py-2 md:py-4">
                    <h4 className="font-semibold text-gray-900 text-base">{task.name}</h4>
                    {task.description && (
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2 md:line-clamp-1">{task.description}</p>
                    )}
                  </td>
                  <td className="px-0 md:px-6 py-2 md:py-4 hidden lg:table-cell">
                     <Badge variant="outline" className={
                       task.status === TaskStatus.DONE ? 'bg-green-50 text-green-700' : 
                       task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                     }>
                       {task.status === TaskStatus.TODO ? 'Por Hacer' : 
                        task.status === TaskStatus.IN_PROGRESS ? 'En Progreso' : 'Terminada'}
                     </Badge>
                  </td>
                  <td className="px-0 md:px-6 py-2 md:py-4 text-gray-500 flex items-center">
                     <CalendarIcon className="h-4 w-4 mr-2 md:hidden" />
                     {format(new Date(task.createdAt), 'dd MMMM yyyy yyyy', { locale: es })}
                  </td>
                  <td className="px-0 md:px-6 py-2 md:py-4 flex flex-col space-y-1">
                     <div className="flex items-center md:hidden mb-1"><UserIcon className="h-4 w-4 mr-2 text-gray-400" /></div>
                     {task.assignees && task.assignees.length > 0 ? (
                       task.assignees.map((a: any) => (
                         <span key={a.id} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block w-fit">
                           {a.user.name || a.user.email}
                         </span>
                       ))
                     ) : (
                       <span className="text-xs text-gray-400 italic">Sin asignar</span>
                     )}
                  </td>
                  <td className="px-0 md:px-6 py-4 md:py-4 md:text-right mt-2 md:mt-0">
                    <Button 
                      size="sm" 
                      onClick={() => handleRestore(task)}
                      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" /> Restaurar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
