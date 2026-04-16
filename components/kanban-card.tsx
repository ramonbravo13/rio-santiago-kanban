
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Task, TaskStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  Calendar,
  User,
  MessageCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Trash2,
  MoreVertical,
  Eye,
  Edit3,
  Lock,
  ExternalLink,
  CalendarPlus,
  Loader2,
  Plus,
  Send,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface KanbanCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  onTaskUpdated?: () => void;
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

export function KanbanCard({ task, onStatusChange, onDelete, onEdit, onTaskUpdated }: KanbanCardProps) {
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  // Estados para nuevos comentarios y links
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  // Estados para edición de links
  const [editingLinkIndex, setEditingLinkIndex] = useState(-1);
  const [editingLinkValues, setEditingLinkValues] = useState({ url: '', title: '' });

  // Estados para edición de comentarios
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');

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

  const handleArchive = async () => {
    if (session?.user?.role !== 'ADMIN') return;

    const confirmed = confirm(
      `¿Estás seguro de que quieres archivar la tarea "${task.name}"?\n\nDesaparecerá del tablero pero podrás restaurarla desde la sección de Tareas Archivadas.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true })
      });

      if (response.ok) {
        toast.success('Tarea archivada exitosamente');
        onDelete?.(task.id); // Remove visually from the current board
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al archivar la tarea');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  const handleRestore = async () => {
    if (session?.user?.role !== 'ADMIN') return;

    if (!confirm(`¿Restaurar la tarea "${task.name}" al tablero?`)) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false })
      });

      if (response.ok) {
        toast.success('Tarea restaurada exitosamente');
        onDelete?.(task.id); // Visually remove from archived view
      } else {
        toast.error('Error al restaurar la tarea');
      }
    } catch (error) {
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        setNewComment('');
        toast.success('Comentario agregado');
        onTaskUpdated?.();
      } else {
        toast.error('Error al agregar comentario');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLinkUrl.trim()) {
      toast.error('La URL es requerida');
      return;
    }
    setIsSubmittingLink(true);
    try {
      const currentLinks = task.links || [];
      const updatedLinks = [...currentLinks, { url: newLinkUrl.trim(), title: newLinkTitle.trim() || undefined }];
      
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: updatedLinks }),
      });

      if (response.ok) {
        setNewLinkUrl('');
        setNewLinkTitle('');
        toast.success('Enlace agregado exitosamente');
        onTaskUpdated?.();
      } else {
        toast.error('Error al actualizar los enlaces');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleDeleteLink = async (index: number) => {
    if (!confirm('¿Estás seguro de eliminar este enlace?')) return;
    try {
      const currentLinks = task.links || [];
      const updatedLinks = currentLinks.filter((_, i) => i !== index);
      
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: updatedLinks.length > 0 ? updatedLinks : [] }),
      });

      if (response.ok) {
        toast.success('Enlace eliminado');
        onTaskUpdated?.();
      } else {
        toast.error('Error al eliminar el enlace');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
    }
  };

  const handleSaveEditedLink = async () => {
    if (editingLinkIndex === -1) return;
    if (!editingLinkValues.url.trim()) {
      toast.error('La URL es requerida');
      return;
    }

    try {
      const updatedLinks = [...(task.links || [])];
      updatedLinks[editingLinkIndex] = { 
        url: editingLinkValues.url.trim(), 
        title: editingLinkValues.title.trim() || undefined 
      };

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: updatedLinks }),
      });

      if (response.ok) {
        setEditingLinkIndex(-1);
        toast.success('Enlace actualizado');
        onTaskUpdated?.();
      } else {
        toast.error('Error al actualizar el enlace');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return;
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Comentario eliminado');
        onTaskUpdated?.();
      } else {
        toast.error('Error al eliminar comentario');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
    }
  };

  const handleSaveEditedComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingCommentContent.trim() }),
      });

      if (response.ok) {
        setEditingCommentId(null);
        toast.success('Comentario actualizado');
        onTaskUpdated?.();
      } else {
        toast.error('Error al actualizar comentario');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
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
      {task.archived && (
        <div className="mb-2">
           <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 shadow-sm w-full justify-center">
             <Archive className="w-3 h-3 mr-1" /> Tarea Archivada
           </Badge>
        </div>
      )}
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
                {!task.archived && canEdit && onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(task)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:text-blue-700 focus:bg-blue-50"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {!task.archived && canEdit && task.dueDate && (
                  <DropdownMenuItem
                    onClick={handleAddToCalendar}
                    disabled={addingToCalendar}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 focus:text-green-700 focus:bg-green-50"
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    {addingToCalendar ? 'Agregando...' : 'Agregar al Calendario'}
                  </DropdownMenuItem>
                )}
                {!task.archived && session?.user?.role === 'ADMIN' && (
                  <DropdownMenuItem
                    onClick={handleArchive}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 focus:text-amber-700 focus:bg-amber-50"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archivar tarea
                  </DropdownMenuItem>
                )}
                {task.archived && session?.user?.role === 'ADMIN' && (
                  <DropdownMenuItem
                    onClick={handleRestore}
                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 focus:text-indigo-700 focus:bg-indigo-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar tarea
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

      {/* Flujo de Trabajo y Permisos */}
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
        <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
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

        <div className="flex items-center text-xs text-gray-500">
          <div className="flex items-center">
            <MessageCircle className="h-3 w-3 mr-1" />
            <span>{task.comments?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className={cn("flex items-center pt-2 border-t border-gray-100", task.archived ? "justify-center" : "justify-between")}>
        {!task.archived && (
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
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs w-full max-w-[120px]"
        >
          {isExpanded ? 'Ocultar Detalles' : 'Ver Detalles completos'}
        </Button>

        {!task.archived && (
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
        )}
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

          {/* Gestión de Enlaces */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Enlaces de Referencia / Drive:</div>
            {(task.links || []).length > 0 && (
              <div className="space-y-1 mb-2">
                {task.links?.map((link, index) => (
                  <div key={index} className="flex flex-col bg-blue-50/50 p-1.5 rounded border border-blue-100">
                    {editingLinkIndex === index ? (
                      <div className="space-y-1">
                        <Input
                          placeholder="Link..."
                          value={editingLinkValues.url}
                          onChange={(e) => setEditingLinkValues({ ...editingLinkValues, url: e.target.value })}
                          className="h-7 text-[11px]"
                        />
                        <div className="flex gap-1">
                          <Input
                            placeholder="Nombre..."
                            value={editingLinkValues.title}
                            onChange={(e) => setEditingLinkValues({ ...editingLinkValues, title: e.target.value })}
                            className="h-7 text-[11px] flex-1"
                          />
                          <Button size="sm" className="h-7 px-2 text-[10px]" onClick={handleSaveEditedLink}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setEditingLinkIndex(-1)}>
                            X
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:underline truncate flex-1"
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{link.title || link.url}</span>
                        </a>
                        {canEdit && (
                          <div className="flex items-center ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-gray-400 hover:text-blue-600"
                              onClick={() => {
                                setEditingLinkIndex(index);
                                setEditingLinkValues({ url: link.url, title: link.title || '' });
                              }}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-gray-400 hover:text-red-600"
                              onClick={() => handleDeleteLink(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {canEdit && (
              <div className="bg-gray-50 p-2 rounded border border-gray-200 space-y-2">
                <Input
                  placeholder="Pegar link de Google Drive..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del enlace (opcional)"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <Button 
                    size="sm" 
                    className="h-7 px-2 text-xs" 
                    onClick={handleAddLink}
                    disabled={isSubmittingLink || !newLinkUrl}
                  >
                    {isSubmittingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                    Agregar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* Comentarios */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-700 mb-1">Actividad / Comentarios:</div>
            
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {(task.comments || []).length === 0 ? (
                <p className="text-[11px] text-gray-400 italic">No hay actividad reciente.</p>
              ) : (
                task.comments?.map((comment, index) => {
                  const isCommentAuthor = comment.authorId === session?.user?.id;
                  const canManageComment = session?.user?.role === 'ADMIN' || isCommentAuthor;
                  const isEditing = editingCommentId === comment.id;

                  return (
                    <div key={comment.id} className="bg-white p-2 border rounded text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-700 text-[10px]">
                            {comment.author?.name || comment.author?.email}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {format(new Date(comment.createdAt), 'dd/MM/yy HH:mm')}
                          </span>
                        </div>
                        {canManageComment && !isEditing && (
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-gray-400 hover:text-blue-600"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentContent(comment.content);
                              }}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-gray-400 hover:text-red-600"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-2 mt-1">
                          <Textarea
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            className="text-xs min-h-[50px] p-1.5"
                          />
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setEditingCommentId(null)}>
                              Cancelar
                            </Button>
                            <Button size="sm" className="h-6 px-2 text-[10px]" onClick={() => handleSaveEditedComment(comment.id)}>
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-600 leading-tight whitespace-pre-wrap">{comment.content}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {canEdit && (
              <div className="flex gap-2 items-start mt-2">
                <Textarea
                  placeholder="Escribe un comentario o actualización..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                />
                <Button 
                  size="sm" 
                  className="h-8 px-2" 
                  onClick={handleAddComment}
                  disabled={isSubmittingComment || !newComment.trim()}
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 pt-2 border-t border-gray-50">
            ID de tarea: {task.id.substring(0, 8)}... | Creado: {format(new Date(task.createdAt), 'dd/MM/yyyy')}
          </div>
        </div>
      )}
    </div>
  );
}
