
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FolderOpen, 
  CheckSquare, 
  Clock, 
  Target,
  Calendar,
  Activity,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

interface KPIData {
  totalUsers: number;
  activeUsers: number;
  totalPrograms: number;
  activePrograms: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  onTimeCompletionRate: number;
  averageTasksPerUser: number;
  averageTasksPerProgram: number;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#FF6363', '#80D8C3', '#A19AD3', '#72BF78'];

export function ReportsContent() {
  const { data: session } = useSession();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [programsData, setProgramsData] = useState<ChartData[]>([]);
  const [tasksProgressData, setTasksProgressData] = useState<ChartData[]>([]);
  const [tasksTimelineData, setTasksTimelineData] = useState<any[]>([]);

  useEffect(() => {
    fetchKPIData();
    fetchChartsData();
  }, [selectedPeriod]);

  const fetchKPIData = async () => {
    try {
      const response = await fetch(`/api/kpis/overall?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setKpiData(data);
      } else {
        toast.error('Error al cargar datos');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartsData = async () => {
    try {
      const [programsResponse, tasksResponse] = await Promise.all([
        fetch(`/api/kpis/programs?period=${selectedPeriod}`),
        fetch(`/api/kpis/tasks-timeline?period=${selectedPeriod}`)
      ]);

      if (programsResponse.ok) {
        const programsData = await programsResponse.json();
        setProgramsData(programsData);
      }

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setTasksTimelineData(tasksData.timeline || []);
        setTasksProgressData([
          { name: 'Completadas', value: tasksData.completed || 0, color: '#72BF78' },
          { name: 'En Progreso', value: tasksData.inProgress || 0, color: '#60B5FF' },
          { name: 'Pendientes', value: tasksData.pending || 0, color: '#FF9149' },
          { name: 'Vencidas', value: tasksData.overdue || 0, color: '#FF6363' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching charts data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!kpiData) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No se pudieron cargar los datos</p>
      </div>
    );
  }

  // Valores por defecto para evitar errores
  const safeKpiData = {
    totalUsers: kpiData.totalUsers || 0,
    activeUsers: kpiData.activeUsers || 0,
    totalPrograms: kpiData.totalPrograms || 0,
    activePrograms: kpiData.activePrograms || 0,
    totalTasks: kpiData.totalTasks || 0,
    completedTasks: kpiData.completedTasks || 0,
    inProgressTasks: kpiData.inProgressTasks || 0,
    pendingTasks: kpiData.pendingTasks || 0,
    overdueTasks: kpiData.overdueTasks || 0,
    completionRate: kpiData.completionRate || 0,
    onTimeCompletionRate: kpiData.onTimeCompletionRate || 0,
    averageTasksPerUser: kpiData.averageTasksPerUser || 0,
    averageTasksPerProgram: kpiData.averageTasksPerProgram || 0,
  };

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex justify-end">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 3 meses</SelectItem>
            <SelectItem value="365">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeKpiData.totalUsers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {safeKpiData.activeUsers} activos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programas Activos</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeKpiData.activePrograms}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>de {safeKpiData.totalPrograms} totales</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Completadas</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeKpiData.completedTasks}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span>{safeKpiData.completionRate.toFixed(1)}% completado</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Vencidas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{safeKpiData.overdueTasks}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {safeKpiData.overdueTasks > 0 ? (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              ) : (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              )}
              <span>
                {safeKpiData.onTimeCompletionRate.toFixed(1)}% a tiempo
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Tareas/Usuario</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeKpiData.averageTasksPerUser.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Tareas/Programa</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeKpiData.averageTasksPerProgram.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia General</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeKpiData.completionRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {safeKpiData.completionRate >= 80 ? 'Excelente' : 
               safeKpiData.completionRate >= 60 ? 'Bueno' : 
               safeKpiData.completionRate >= 40 ? 'Regular' : 'Necesita mejora'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de tareas */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Tareas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tasksProgressData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {tasksProgressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {tasksProgressData.map((item, index) => (
                <div key={item.name} className="flex items-center text-sm">
                  <div 
                    className="w-3 h-3 rounded mr-2"
                    style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}: </span>
                  <span className="font-medium ml-1">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progreso por programa */}
        <Card>
          <CardHeader>
            <CardTitle>Tareas por Programa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={programsData}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value, name) => [value, 'Tareas']}
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="value" fill="#60B5FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de progreso */}
      {tasksTimelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso en el Tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={tasksTimelineData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ fontSize: 11 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="1"
                  stroke="#72BF78" 
                  fill="#72BF78" 
                  name="Completadas"
                />
                <Area 
                  type="monotone" 
                  dataKey="inProgress" 
                  stackId="1"
                  stroke="#60B5FF" 
                  fill="#60B5FF" 
                  name="En Progreso"
                />
                <Area 
                  type="monotone" 
                  dataKey="pending" 
                  stackId="1"
                  stroke="#FF9149" 
                  fill="#FF9149" 
                  name="Pendientes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
