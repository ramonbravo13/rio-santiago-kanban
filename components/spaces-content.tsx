'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface Space {
  id: string;
  name: string;
  color: string;
}

interface Reservation {
  id: string;
  eventName: string;
  date: string;
  startTime: string;
  endTime: string;
  spaceId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  space: Space;
  user: { name: string; email: string };
  contactInfo: string;
  createdAt?: string;
}

export function SpacesContent() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    eventName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    spaceId: '',
    description: '',
    attendees: '',
    resources: ''
  });

  const [activeEvent, setActiveEvent] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [spacesRes, resRes] = await Promise.all([
        fetch('/api/spaces'),
        fetch('/api/spaces/reservations')
      ]);

      if (spacesRes.ok) setSpaces(await spacesRes.json());
      if (resRes.ok) setReservations(await resRes.json());
    } catch (e) {
      toast.error('Error cargando la agenda');
    } finally {
      setIsLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handleCreateReservation = async () => {
    if (!formData.eventName || !formData.date || !formData.startTime || !formData.endTime || !formData.spaceId) {
      toast.error('Completa los campos obligatorios (*)');
      return;
    }
    
    // Combine date + time
    const startObj = new Date(`${formData.date}T${formData.startTime}:00`);
    const endObj = new Date(`${formData.date}T${formData.endTime}:00`);

    if (startObj >= endObj) {
      toast.error('La hora de fin debe ser posterior a la inicial');
      return;
    }

    try {
      const payload = {
        ...formData,
        startTime: startObj.toISOString(),
        endTime: endObj.toISOString(),
      };

      const res = await fetch('/api/spaces/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Solicitud enviada correctamente');
        setIsModalOpen(false);
        fetchData(); // reload
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al solicitar espacio');
      }
    } catch (e) {
      toast.error('Error de conexión');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/spaces/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Reserva ${status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}`);
        fetchData();
        if (activeEvent?.id === id) setActiveEvent(null);
      } else {
        const err = await res.json();
        toast.error(err.error || 'No se pudo actualizar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const formatTime = (isoString: string) => format(parseISO(isoString), 'HH:mm');

  // Filter approved events for month view
  const approvedReservations = reservations.filter(r => r.status === 'APPROVED');

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="calendar" className="flex-1 flex flex-col">
        <div className="px-8 border-b">
          <TabsList className="my-2 h-10">
            <TabsTrigger value="calendar">Calendario Visual</TabsTrigger>
            <TabsTrigger value="requests">Mis Solicitudes</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Administración (Admin)</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="calendar" className="flex-1 overflow-auto p-8 m-0 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          {/* Main Calendar View */}
          <div className="flex flex-col h-full bg-white rounded-lg border shadow-sm">
            <div className="p-4 flex items-center justify-between border-b">
              <h2 className="text-xl font-bold capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b bg-gray-50/50">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="py-2 text-center text-sm font-semibold text-gray-600 border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 grid-rows-5 flex-1 relative">
              {calendarDays.map((day, idx) => {
                const dayEvents = approvedReservations.filter(r => isSameDay(parseISO(r.date), day));
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                       setSelectedDate(day);
                       setFormData(p => ({ ...p, date: format(day, 'yyyy-MM-dd') }));
                       setIsModalOpen(true);
                    }}
                    className={cn(
                      "min-h-[120px] p-2 border-r border-b cursor-pointer transition-colors hover:bg-gray-50",
                      !isSameMonth(day, currentDate) && "bg-gray-50/30 text-gray-400"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        isSameDay(day, new Date()) ? "bg-[#1E8F24] text-white" : ""
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {dayEvents.map(event => (
                        <div 
                          key={event.id}
                          onClick={(e) => { e.stopPropagation(); setActiveEvent(event); }}
                          className="text-[10px] sm:text-xs truncate px-2 py-1 rounded text-white shadow-sm font-medium cursor-pointer"
                          style={{ backgroundColor: event.space?.color || '#3b82f6' }}
                          title={`${formatTime(event.startTime)} - ${event.eventName}`}
                        >
                          {formatTime(event.startTime)} {event.eventName}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col space-y-6">
            <Button onClick={() => setIsModalOpen(true)} className="w-full ceti-button-primary h-12 shadow-md">
              <Plus className="mr-2 h-5 w-5" /> Nueva Solicitud
            </Button>

            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <h3 className="font-semibold mb-4 text-sm text-gray-500 uppercase tracking-wider">Espacios Disponibles</h3>
              <div className="space-y-3">
                {spaces.map(space => (
                  <div key={space.id} className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: space.color }}></div>
                    <span className="text-sm font-medium text-gray-700">{space.name}</span>
                  </div>
                ))}
                {spaces.length === 0 && <span className="text-sm text-gray-400">No hay espacios.</span>}
              </div>
            </div>

            {/* Event Detail Sidebar */}
            {activeEvent && (
              <div className="bg-white rounded-lg border p-5 shadow-sm animate-in fade-in slide-in-from-right-4 relative">
                <button 
                   onClick={() => setActiveEvent(null)}
                   className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
                >
                  &times;
                </button>
                <Badge className="mb-3" style={{ backgroundColor: activeEvent.space?.color }}>{activeEvent.space?.name}</Badge>
                <h3 className="font-bold text-lg mb-2">{activeEvent.eventName}</h3>
                
                <div className="space-y-3 text-sm mt-4 text-gray-600">
                  <div className="flex items-center"><CalendarDays className="w-4 h-4 mr-2" /> {format(parseISO(activeEvent.date), 'dd MMMM yyyy', {locale: es})}</div>
                  <div className="flex items-center"><Clock className="w-4 h-4 mr-2" /> {formatTime(activeEvent.startTime)} - {formatTime(activeEvent.endTime)}</div>
                  <div className="flex items-center"><MapPin className="w-4 h-4 mr-2" /> Ubicación en plantel</div>
                </div>

                <div className="mt-4 pt-4 border-t text-sm">
                  <p><span className="font-semibold">Responsable:</span> {activeEvent.contactInfo}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="flex-1 overflow-auto p-8 m-0">
          <div className="max-w-5xl">
            <h2 className="text-xl font-bold mb-6">Mis Solicitudes de Espacios</h2>
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">Evento y Espacio</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Fecha y Horario</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Estado</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Creado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reservations.filter(r => r.user.email === session?.user?.email).map(req => (
                    <tr key={req.id}>
                      <td className="px-6 py-4">
                        <p className="font-semibold">{req.eventName}</p>
                        <p className="text-gray-500 text-xs">{req.space?.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p>{format(parseISO(req.date), 'dd/MM/yyyy')}</p>
                        <p className="text-gray-500 text-xs">{formatTime(req.startTime)} - {formatTime(req.endTime)}</p>
                      </td>
                      <td className="px-6 py-4">
                        {req.status === 'PENDING' && <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pendiente</Badge>}
                        {req.status === 'APPROVED' && <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Aprobado</Badge>}
                        {req.status === 'REJECTED' && <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Rechazado</Badge>}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {format(parseISO(req.createdAt || req.date), 'dd/MM')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="flex-1 overflow-auto p-8 m-0">
            <div className="max-w-5xl">
              <h2 className="text-xl font-bold mb-6">Administrar Solicitudes Pendientes</h2>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 font-medium text-gray-500">Evento y Espacio</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Solicitante</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Fechas</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reservations.filter(r => r.status === 'PENDING').map(req => (
                      <tr key={req.id}>
                        <td className="px-6 py-4">
                          <p className="font-semibold">{req.eventName}</p>
                          <Badge variant="secondary" className="mt-1" style={{ backgroundColor: `${req.space?.color}20`, color: req.space?.color }}>
                            {req.space?.name}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p>{req.contactInfo}</p>
                          <p className="text-xs text-gray-500">{req.user?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                           <p>{format(parseISO(req.date), 'dd/MM/yyyy')}</p>
                           <p className="text-gray-500 text-xs">{formatTime(req.startTime)} - {formatTime(req.endTime)}</p>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button size="sm" onClick={() => handleStatusUpdate(req.id, 'APPROVED')} className="bg-green-600 hover:bg-green-700">
                            Aprobar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(req.id, 'REJECTED')} className="text-red-600 hover:bg-red-50">
                            Rechazar
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {reservations.filter(r => r.status === 'PENDING').length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">No hay solicitudes pendientes.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Modal Nueva Reserva */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar Espacio</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Nombre del Evento *</Label>
              <Input 
                value={formData.eventName} 
                onChange={e => setFormData({ ...formData, eventName: e.target.value })} 
                placeholder="Ej. Junta directiva"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Espacio Requerido *</Label>
              <Select onValueChange={v => setFormData({ ...formData, spaceId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un espacio" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map(sp => (
                     <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input 
                type="date"
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Hora Inicio *</Label>
                <Input 
                  type="time"
                  value={formData.startTime} 
                  onChange={e => setFormData({ ...formData, startTime: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fin *</Label>
                <Input 
                  type="time"
                  value={formData.endTime} 
                  onChange={e => setFormData({ ...formData, endTime: e.target.value })} 
                />
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <Label>Requerimientos y Detalles</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Detalles sobre el acomodo, propósito, etc."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4 pt-4 border-t space-x-2">
             <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
             <Button className="ceti-button-primary" onClick={handleCreateReservation}>Enviar Solicitud</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
