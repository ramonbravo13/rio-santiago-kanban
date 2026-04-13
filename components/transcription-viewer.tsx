
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Volume2,
  FileText,
  FileDown,
  Edit3,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Mic,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Transcription, TranscriptionStatus } from '@/lib/types';

interface TranscriptionViewerProps {
  transcription: Transcription;
  onUpdate: (transcription: Transcription) => void;
  onDelete: () => void;
}

export function TranscriptionViewer({ transcription, onUpdate, onDelete }: TranscriptionViewerProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [transcriptionProgress, setTranscriptionProgress] = useState('');
  const [summaryProgress, setSummaryProgress] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (transcription.originalText) {
      setEditedText(transcription.originalText);
    }
    if (transcription.summary) {
      setEditedSummary(transcription.summary);
    }
  }, [transcription]);

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

  const startTranscription = async () => {
    if (isTranscribing || transcription.originalText) return;

    setIsTranscribing(true);
    setTranscriptionProgress('');

    try {
      const response = await fetch(`/api/transcriptions/${transcription.id}/transcribe`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al iniciar transcripción');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Transcripción completada
                const updatedTranscription = {
                  ...transcription,
                  originalText: buffer,
                  status: 'COMPLETED' as TranscriptionStatus
                };
                onUpdate(updatedTranscription);
                setEditedText(buffer);
                toast.success('Transcripción completada exitosamente');
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.content || '';
                if (content) {
                  buffer += content;
                  setTranscriptionProgress(buffer);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error during transcription:', error);
      toast.error(error.message || 'Error durante la transcripción');
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress('');
    }
  };

  const startSummarization = async () => {
    if (isSummarizing || !transcription.originalText) return;

    setIsSummarizing(true);
    setSummaryProgress('');

    try {
      const response = await fetch(`/api/transcriptions/${transcription.id}/summarize`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al iniciar resumen');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Resumen completado
                const updatedTranscription = {
                  ...transcription,
                  summary: buffer,
                  status: 'COMPLETED' as TranscriptionStatus
                };
                onUpdate(updatedTranscription);
                setEditedSummary(buffer);
                toast.success('Resumen completado exitosamente');
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.content || '';
                if (content) {
                  buffer += content;
                  setSummaryProgress(buffer);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error during summarization:', error);
      toast.error(error.message || 'Error durante el resumen');
    } finally {
      setIsSummarizing(false);
      setSummaryProgress('');
    }
  };

  const saveEdits = async () => {
    try {
      const response = await fetch(`/api/transcriptions/${transcription.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: editedText,
          summary: editedSummary,
        }),
      });

      if (response.ok) {
        const updatedTranscription = await response.json();
        onUpdate(updatedTranscription);
        setIsEditing(false);
        toast.success('Cambios guardados exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar cambios');
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      toast.error('Error de conexión');
    }
  };

  const deleteTranscription = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta transcripción?')) {
      return;
    }

    try {
      const response = await fetch(`/api/transcriptions/${transcription.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete();
        toast.success('Transcripción eliminada exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar transcripción');
      }
    } catch (error) {
      console.error('Error deleting transcription:', error);
      toast.error('Error de conexión');
    }
  };

  const toggleAudio = () => {
    console.log('audio', audio, 'isPlaying', isPlaying, transcription);
    if (!audio) {
      const audioElement = new Audio(transcription.audioUrl);
      audioElement.addEventListener('ended', () => setIsPlaying(false));
      setAudio(audioElement);
      audioElement.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    }
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

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" />
                <span>{transcription.originalName}</span>
              </CardTitle>
              <CardDescription className="mt-1">
                {formatFileSize(transcription.fileSize)} • {format(new Date(transcription.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(transcription.status)}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAudio}
                className="flex items-center space-x-2"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteTranscription}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {!transcription.originalText && (
          <Button
            onClick={startTranscription}
            disabled={isTranscribing}
            className="flex items-center space-x-2"
          >
            {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            <span>{isTranscribing ? 'Transcribiendo...' : 'Iniciar Transcripción'}</span>
          </Button>
        )}

        {transcription.originalText && !transcription.summary && (
          <Button
            onClick={startSummarization}
            disabled={isSummarizing}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            <span>{isSummarizing ? 'Resumiendo...' : 'Generar Resumen'}</span>
          </Button>
        )}

        {(transcription.originalText || transcription.summary) && (
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            <span>{isEditing ? 'Cancelar' : 'Editar'}</span>
          </Button>
        )}

        {isEditing && (
          <Button
            onClick={saveEdits}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Guardar Cambios</span>
          </Button>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="transcription" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transcription">Transcripción</TabsTrigger>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="transcription" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Texto Transcrito</span>
                </CardTitle>
                {transcription.originalText && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadText(transcription.originalText || '', `transcripcion-${transcription.originalName}.txt`)}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isTranscribing && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Transcribiendo audio...</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm whitespace-pre-wrap">
                      {transcriptionProgress || 'Iniciando transcripción...'}
                    </p>
                  </div>
                </div>
              )}

              {transcription.originalText && (
                <div className="space-y-3">
                  {isEditing ? (
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      rows={12}
                      className="w-full"
                      placeholder="Texto transcrito..."
                    />
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {transcription.originalText}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!transcription.originalText && !isTranscribing && (
                <div className="text-center py-8">
                  <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Haz clic en "Iniciar Transcripción" para comenzar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Resumen</span>
                </CardTitle>
                {transcription.summary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadText(transcription.summary || '', `resumen-${transcription.originalName}.txt`)}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isSummarizing && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Generando resumen...</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-purple-500">
                    <p className="text-sm whitespace-pre-wrap">
                      {summaryProgress || 'Analizando texto...'}
                    </p>
                  </div>
                </div>
              )}

              {transcription.summary && (
                <div className="space-y-3">
                  {isEditing ? (
                    <Textarea
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      rows={8}
                      className="w-full"
                      placeholder="Resumen..."
                    />
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {transcription.summary}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!transcription.summary && !isSummarizing && (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {transcription.originalText ? (
                    <p className="text-gray-600">
                      Haz clic en "Generar Resumen" para crear un resumen automático
                    </p>
                  ) : (
                    <p className="text-gray-600">
                      Necesitas transcribir el audio primero para generar un resumen
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
