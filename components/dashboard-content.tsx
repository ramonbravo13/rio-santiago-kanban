
'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  CheckCircle,
  Clock,
  Users,
  FolderOpen,
  TrendingUp,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { KPIData } from '@/lib/types';
import Link from 'next/link';

export function DashboardContent() {
  const { data: session } = useSession();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      const response = await fetch('/api/kpis/overall');
      if (response.ok) {
        const data = await response.json();
        setKpis(data);
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: 'Total de Tareas',
      value: kpis?.totalTasks || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Tareas Completadas',
      value: kpis?.completedTasks || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Tasa de Cumplimiento',
      value: `${kpis?.completionRate?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Entregables Subidos',
      value: kpis?.deliverablesUploaded || 0,
      icon: BarChart3,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Tareas en Retraso',
      value: kpis?.tasksInDelay || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Nivel de Participación',
      value: kpis?.participationLevel?.toFixed(1) || 0,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido, {session?.user?.name || session?.user?.email}
          </h1>
          <p className="mt-2 text-gray-600">
            Panel de control del sistema de seguimiento de metas CETI
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link href="/kanban">
            <Button className="ceti-button-primary">
              <FolderOpen className="h-4 w-4 mr-2" />
              Ver Tablero
            </Button>
          </Link>
          {session?.user?.role === 'ADMIN' && (
            <Link href="/programs">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Gestionar Programas
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {kpi.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : kpi.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/kanban">
              <Button variant="outline" className="w-full justify-start">
                <FolderOpen className="h-4 w-4 mr-2" />
                Ver Tablero Kanban
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Buscar Tareas
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Ver Reportes
              </Button>
            </Link>
            {session?.user?.role === 'ADMIN' && (
              <Link href="/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Usuarios
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Resumen del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progreso General</span>
                <span className="text-sm font-medium">
                  {kpis?.completionRate?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill bg-green-500"
                  style={{ width: `${kpis?.completionRate || 0}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tiempo Promedio</span>
                <span className="text-sm font-medium">
                  {kpis?.averageCompletionTime?.toFixed(1) || 0} días
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Participación</span>
                <span className="text-sm font-medium">
                  {kpis?.participationLevel?.toFixed(1) || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
