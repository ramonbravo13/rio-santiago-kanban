

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2, Plus, X, ExternalLink, Star } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Task, TaskStatus, TaskLink } from '@/lib/types';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  task: Task;
  programs: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
}

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Por hacer' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'DONE', label: 'Completado' },
];

export function EditTaskModal({ isOpen, onClose, onTaskUpdated, task, programs }: EditTaskModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'TODO' as TaskStatus,
    programId: '',
    assigneeIds: [] as string[],
    leaderIds: [] as string[],
    expectedDeliverables: '',
    progressPercentage: 0,
  });

  const isAdmin = session?.user?.role === 'ADMIN';
  const isAssignee = task.assignees?.some(assignee => assignee.user?.id === session?.user?.id);

  useEffect(() => {
    if (isOpen && task) {
      // Poblar formulario con datos de la tarea
      setFormData({
        name: task.name || '',
        description: task.description || '',
        status: task.status || 'TODO',
        programId: task.programId || '',
        assigneeIds: task.assignees?.map(a => a.userId) || [],
        leaderIds: task.assignees?.filter(a => a.isLeader).map(a => a.userId) || [],
        expectedDeliverables: task.expectedDeliverables || '',
        progressPercentage: task.progressPercentage || 0,
      });
      
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setLinks(task.links || []);
      
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [isOpen, task, isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.filter((user: User) => user.isActive));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('El nombre es requerido');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dueDate: dueDate?.toISOString(),
          links: links.filter(link => link.url?.trim()),
          assigneeIds: isAdmin ? formData.assigneeIds : undefined,
          leaderIds: isAdmin ? formData.leaderIds : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Tarea actualizada exitosamente');
        onTaskUpdated();
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar la tarea');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const addLink = () => {
    setLinks(prev => [...prev, { url: '', title: '' }]);
  };

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: 'url' | 'title', value: string) => {
    setLinks(prev => prev.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    ));
  };

  // Filtrar solo programas activos
  const activePrograms = programs?.filter(program => program.status === 'ACTIVO') ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Editar Tarea
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre de la tarea */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Nombre de la Tarea *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ingrese el nombre de la tarea"
              required
              className="w-full"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe los objetivos y alcance de la tarea"
              rows={3}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estado */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Estado
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as TaskStatus }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Progreso */}
            <div className="space-y-2">
              <Label htmlFor="progress" className="text-sm font-medium text-gray-700">
                Progreso (%)
              </Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progressPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, progressPercentage: parseInt(e.target.value) || 0 }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Flujo de Trabajo - solo admin puede cambiar */}
          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Flujo de Trabajo
              </Label>
              <Select
                value={formData.programId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, programId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar flujo de trabajo" />
                </SelectTrigger>
                <SelectContent>
                  {activePrograms.filter(program => program.id && program.id.trim() !== '').map(program => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Responsables - solo admin puede cambiar */}
          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Responsables
              </Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto bg-white">
                <div className="space-y-2">
                  {users.filter(user => user.id && user.id.trim() !== '').map(user => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={formData.assigneeIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              assigneeIds: [...prev.assigneeIds, user.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              assigneeIds: prev.assigneeIds.filter(id => id !== user.id),
                              leaderIds: prev.leaderIds.filter(id => id !== user.id)
                            }));
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {user.name || user.email}
                      </Label>
                    </div>
                  ))}
                  {users.filter(user => user.id && user.id.trim() !== '').length === 0 && (
                    <p className="text-sm text-gray-500">No hay usuarios disponibles</p>
                  )}
                </div>
              </div>
              {formData.assigneeIds.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <Label className="text-sm font-medium text-amber-900 flex items-center mb-2">
                    <Star className="h-4 w-4 mr-1 text-amber-500 fill-amber-500" />
                    Líderes de la tarea (Máx. 2)
                  </Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.assigneeIds.map(assigneeId => {
                      const user = users.find(u => u.id === assigneeId);
                      if (!user) return null;
                      return (
                        <div key={`leader-${user.id}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`leader-${user.id}`}
                            checked={formData.leaderIds.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                if (formData.leaderIds.length >= 2) {
                                  toast.error('Solo puedes seleccionar hasta 2 líderes');
                                  return;
                                }
                                setFormData(prev => ({ ...prev, leaderIds: [...prev.leaderIds, user.id] }));
                              } else {
                                setFormData(prev => ({ ...prev, leaderIds: prev.leaderIds.filter(id => id !== user.id) }));
                              }
                            }}
                          />
                          <Label htmlFor={`leader-${user.id}`} className="text-sm font-normal cursor-pointer text-amber-900">
                            {user.name || user.email}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fecha de vencimiento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Fecha de Vencimiento
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Links opcionales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">
                Enlaces de Referencia
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Enlace
              </Button>
            </div>
            
            {links.map((link, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border rounded-md bg-gray-50">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    placeholder="URL (https://...)"
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    className="bg-white"
                  />
                  <Input
                    placeholder="Título (opcional)"
                    value={link.title}
                    onChange={(e) => updateLink(index, 'title', e.target.value)}
                    className="bg-white"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLink(index)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {links.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-200 rounded-md">
                No hay enlaces agregados. Haz clic en "Agregar Enlace" para añadir referencias externas.
              </p>
            )}
          </div>

          {/* Entregables esperados */}
          <div className="space-y-2">
            <Label htmlFor="expectedDeliverables" className="text-sm font-medium text-gray-700">
              Entregables Esperados
            </Label>
            <Textarea
              id="expectedDeliverables"
              value={formData.expectedDeliverables}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliverables: e.target.value }))}
              placeholder="Describe los documentos, reportes o productos que se deben entregar"
              rows={3}
              className="w-full"
            />
          </div>

          {/* Información de permisos */}
          {!isAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Como colaborador, puedes editar la información de la tarea pero no cambiar el flujo de trabajo ni los responsables.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="ceti-button-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Tarea'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
