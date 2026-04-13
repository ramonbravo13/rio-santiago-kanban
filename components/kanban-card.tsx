
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Task, TaskStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileUploadComponent } from './file-upload-component';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  Calendar,
  User,
  MessageCircle,
  Paperclip,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  FileText,
  Trash2,
  MoreVertical,
  Eye,
  Edit3,
  Lock,
  ExternalLink,
  CalendarPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface KanbanCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}

const STATUS_COLORS = {
  TODO: 'text-gray-600',
  IN_PROGRESS: 'text-blue-600',
  DONE: 'text-green-600',
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  [TaskStatus.TODO]: TaskStatus.IN_PROGRESS,
  [TaskStatus.IN_PROGRESS]: TaskStatus.DONE,
  [TaskStatus.DONE]: null,
};

const PREV_STATUS: Record<TaskStatus, TaskStatus | null> = {
  [TaskStatus.TODO]: null,
  [TaskStatus.IN_PROGRESS]: TaskStatus.TODO,
  [TaskStatus.DONE]: TaskStatus.IN_PROGRESS,
};

export function KanbanCard({ task, onStatusChange, onDelete, onEdit }: KanbanCardProps) {
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  const canEdit = 
    session?.user?.role === 'ADMIN' || 
    task.assignees?.some(assignee => assignee.user?.id === session?.user?.id);

  const canDelete = session?.user?.role === 'ADMIN';

  const isReadOnly = session?.user?.role === 'COLABORADOR' && !canEdit;

  const isOverdue = task.dueDate && new Date() > new Date(task.dueDate) && task.status !== 'DONE';

  const handleMoveNext = () => {
    const nextStatus = NEXT_STATUS[task.status];
    if (nextStatus && canEdit) {
      onStatusChange(task.id, nextStatus as TaskStatus);
    }
  };

  const handleMovePrev = () => {
    const prevStatus = PREV_STATUS[task.status];
    if (prevStatus && canEdit) {
      onStatusChange(task.id, prevStatus as TaskStatus);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || !onDelete) return;

    const confirmed = confirm(
      `¿Estás seguro de que quieres eliminar la tarea "${task.name}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Tarea eliminada exitosamente');
        onDelete(task.id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar la tarea');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  const handleAddToCalendar = async () => {
    if (!canEdit || !task.dueDate) return;

    setAddingToCalendar(true);

    try {
      const response = await fetch('/api/tasks/add-to-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.id }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Abrir Google Calendar en una nueva pestaña
        if (data.event?.calendarUrl) {
          window.open(data.event.calendarUrl, '_blank');
          toast.success('Tarea agregada al calendario exitosamente');
        } else {
          toast.error('Error al generar el enlace del calendario');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al agregar la tarea al calendario');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setAddingToCalendar(false);
    }
  };

  return (
    <div
      className={cn(
        'kanban-card',
        task.status === 'TODO' && 'task-todo',
        task.status === 'IN_PROGRESS' && 'task-in-progress',
        task.status === 'DONE' && 'task-done',
        isOverdue && 'border-red-300 bg-red-50',
        isReadOnly && 'opacity-90 border-gray-300'
      )}
      title={isReadOnly ? 'Esta tarea solo es visible. Solo puedes editar las tareas asignadas a ti.' : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1 mr-2">
          {task.name}
        </h4>
        <div className="flex items-center space-x-1 flex-shrink-0">
          {isOverdue && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canEdit && onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(task)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:text-blue-700 focus:bg-blue-50"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {canEdit && task.dueDate && (
                  <DropdownMenuItem
                    onClick={handleAddToCalendar}
                    disabled={addingToCalendar}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 focus:text-green-700 focus:bg-green-50"
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    {addingToCalendar ? 'Agregando...' : 'Agregar al Calendario'}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Programa y Permisos */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {task.program?.name}
        </Badge>
        {session?.user?.role === 'COLABORADOR' && (
          <Badge 
            variant={canEdit ? "default" : "secondary"} 
            className={cn(
              "text-xs",
              canEdit ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-600 border-gray-300"
            )}
          >
            {canEdit ? (
              <>
                <Edit3 className="h-3 w-3 mr-1" />
                Editable
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Solo lectura
              </>
            )}
          </Badge>
        )}
      </div>

      {/* Descripción */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Links */}
      {task.links && task.links.length > 0 && (
        <div className="mb-3 space-y-1">
          {task.links.slice(0, 2).map((link, index) => (
            <div key={index} className="flex items-center space-x-2">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {link.title || link.url}
                </span>
              </a>
            </div>
          ))}
          {task.links.length > 2 && (
            <p className="text-xs text-gray-500">
              +{task.links.length - 2} enlace(s) más
            </p>
          )}
        </div>
      )}

      {/* Progreso */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progreso</span>
          <span>{task.progressPercentage}%</span>
        </div>
        <Progress value={task.progressPercentage} className="h-2" />
      </div>

      {/* Información adicional */}
      <div className="space-y-2 mb-3">
        {task.assignees && task.assignees.length > 0 && (
          <div 
            className="flex items-center text-xs text-gray-500"
            title={task.assignees.map(a => a.user?.name || a.user?.email).join(', ')}
          >
            <User className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              {task.assignees.map(a => a.user?.name || a.user?.email).join(', ')}
            </span>
          </div>
        )}

        {task.dueDate && (
          <div className={cn(
            "flex items-center text-xs",
            isOverdue ? "text-red-600" : "text-gray-500"
          )}>
            <Calendar className="h-3 w-3 mr-1" />
            <span>
              {format(new Date(task.dueDate), 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <MessageCircle className="h-3 w-3 mr-1" />
            <span>{task.comments?.length || 0}</span>
          </div>
          <div className="flex items-center">
            <Paperclip className="h-3 w-3 mr-1" />
            <span>{task.files?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMovePrev}
          disabled={!canEdit || !PREV_STATUS[task.status]}
          className={cn(
            "h-6 px-2",
            !canEdit && "opacity-50 cursor-not-allowed"
          )}
          title={!canEdit ? "No puedes editar esta tarea" : undefined}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs"
        >
          Detalles
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleMoveNext}
          disabled={!canEdit || !NEXT_STATUS[task.status]}
          className={cn(
            "h-6 px-2",
            !canEdit && "opacity-50 cursor-not-allowed"
          )}
          title={!canEdit ? "No puedes editar esta tarea" : undefined}
        >
          {task.status === 'IN_PROGRESS' ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Información expandida */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {task.expectedDeliverables && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">
                Entregables Esperados:
              </div>
              <div className="text-xs text-gray-600">
                {task.expectedDeliverables}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Creado: {format(new Date(task.createdAt), 'dd/MM/yyyy')}
          </div>

          {/* Enlaces completos en vista expandida */}
          {task.links && task.links.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">
                Enlaces de Referencia:
              </div>
              <div className="space-y-1">
                {task.links.map((link, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {link.title || link.url}
                      </span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.comments && task.comments.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">
                Último comentario:
              </div>
              <div className="text-xs text-gray-600 line-clamp-2">
                {task.comments[0]?.content}
              </div>
            </div>
          )}

          {/* Botón para mostrar archivos */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiles(!showFiles)}
              className="h-7 px-3 text-xs"
            >
              <FileText className="h-3 w-3 mr-1" />
              {showFiles ? 'Ocultar Archivos' : 'Ver Archivos'}
              {task.files && task.files.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs">
                  {task.files.length}
                </span>
              )}
            </Button>
          </div>

          {/* Componente de archivos */}
          {showFiles && (
            <div>
              <Separator className="my-3" />
              <FileUploadComponent
                taskId={task.id}
                taskName={task.name}
                showTitle={false}
                className="space-y-3"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
