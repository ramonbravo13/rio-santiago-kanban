
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileAudio, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Download,
  Calendar,
  FileText,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Transcription, TranscriptionStatus } from '@/lib/types';

interface TranscriptionHistoryProps {
  onSelect: (transcription: Transcription) => void;
  onStatsUpdate: (stats: { total: number; completed: number; processing: number }) => void;
}

export function TranscriptionHistory({ onSelect, onStatsUpdate }: TranscriptionHistoryProps) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<Transcription[]>([]);

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  useEffect(() => {
    filterTranscriptions();
  }, [transcriptions, searchTerm, statusFilter]);

  useEffect(() => {
    updateStats();
  }, [transcriptions]);

  const fetchTranscriptions = async () => {
    try {
      const response = await fetch('/api/transcriptions');
      if (response.ok) {
        const data = await response.json();
        setTranscriptions(data);
      } else {
        toast.error('Error al cargar transcripciones');
      }
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const filterTranscriptions = () => {
    let filtered = [...transcriptions];

    // Filtro por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.originalText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.summary?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    setFilteredTranscriptions(filtered);
  };

  const updateStats = () => {
    const stats = {
      total: transcriptions.length,
      completed: transcriptions.filter(t => t.status === 'COMPLETED').length,
      processing: transcriptions.filter(t => ['PENDING', 'TRANSCRIBING', 'SUMMARIZING'].includes(t.status)).length
    };
    onStatsUpdate(stats);
  };

  const getStatusBadge = (status: TranscriptionStatus) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
          <Clock className="h-3 w-3 mr-1" />
          Pendiente
        </Badge>;
      case 'TRANSCRIBING':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Transcribiendo
        </Badge>;
      case 'SUMMARIZING':
        return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Resumiendo
        </Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completado
        </Badge>;
      case 'ERROR':
        return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o contenido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PENDING">Pendientes</SelectItem>
                  <SelectItem value="TRANSCRIBING">Transcribiendo</SelectItem>
                  <SelectItem value="SUMMARIZING">Resumiendo</SelectItem>
                  <SelectItem value="COMPLETED">Completados</SelectItem>
                  <SelectItem value="ERROR">Con errores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de transcripciones */}
      <div className="space-y-3">
        {filteredTranscriptions.length > 0 ? (
          filteredTranscriptions.map((transcription) => (
            <Card key={transcription.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileAudio className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {transcription.originalName}
                        </h3>
                        {getStatusBadge(transcription.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <span>{formatFileSize(transcription.fileSize)}</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(transcription.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        {transcription.originalText && (
                          <span className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>Transcrito</span>
                          </span>
                        )}
                        {transcription.summary && (
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>Resumido</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelect(transcription)}
                      className="flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver</span>
                    </Button>
                    {transcription.originalText && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadText(transcription.originalText || '', `transcripcion-${transcription.originalName}.txt`)}
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Descargar</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {transcriptions.length === 0 ? 'No hay transcripciones' : 'No se encontraron resultados'}
              </h3>
              <p className="text-gray-600 mb-4">
                {transcriptions.length === 0 
                  ? 'Sube tu primer archivo de audio para comenzar'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
              {transcriptions.length === 0 && (
                <Button onClick={() => window.location.reload()}>
                  Actualizar página
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
