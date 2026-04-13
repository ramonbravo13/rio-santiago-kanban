
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Mic, 
  FileAudio, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Download,
  Edit3,
  Trash2,
  Loader2,
  History,
  PlayCircle,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { AudioUploader } from '@/components/audio-uploader';
import { TranscriptionViewer } from '@/components/transcription-viewer';
import { TranscriptionHistory } from '@/components/transcription-history';
import { Transcription } from '@/lib/types';

export function TranscriptionContent() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('upload');
  const [currentTranscription, setCurrentTranscription] = useState<Transcription | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleUploadSuccess = (transcription: Transcription) => {
    setCurrentTranscription(transcription);
    setActiveTab('viewer');
    setRefreshHistory(prev => prev + 1);
    toast.success('Archivo subido exitosamente');
  };

  const handleTranscriptionSelect = (transcription: Transcription) => {
    setCurrentTranscription(transcription);
    setActiveTab('viewer');
  };

  const handleTranscriptionUpdate = (updatedTranscription: Transcription) => {
    setCurrentTranscription(updatedTranscription);
    setRefreshHistory(prev => prev + 1);
  };

  const handleTranscriptionDelete = () => {
    setCurrentTranscription(null);
    setActiveTab('upload');
    setRefreshHistory(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Transcribir Audio</h1>
        <p className="text-gray-600">
          Sube archivos de audio y obtén transcripciones automáticas con resúmenes inteligentes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Transcripciones</CardTitle>
            <FileAudio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" id="total-transcriptions">0</div>
            <p className="text-xs text-muted-foreground">Archivos procesados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" id="completed-transcriptions">0</div>
            <p className="text-xs text-muted-foreground">Listas para descargar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" id="processing-transcriptions">0</div>
            <p className="text-xs text-muted-foreground">Siendo procesadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Subir Audio</span>
          </TabsTrigger>
          <TabsTrigger value="viewer" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Transcripción</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Historial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" />
                <span>Subir Archivo de Audio</span>
              </CardTitle>
              <CardDescription>
                Selecciona un archivo de audio para transcribir. Soportamos MP3, WAV, M4A, AAC, OGG, FLAC y video con audio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioUploader onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>

          {/* Información adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formatos Soportados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <FileAudio className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">MP3</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileAudio className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">WAV</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileAudio className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">M4A</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileAudio className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">AAC</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileAudio className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">OGG</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileAudio className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">FLAC</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PlayCircle className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">MP4</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PlayCircle className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">WebM</span>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Tamaño máximo: 100MB</p>
                <p>• Calidad recomendada: 16kHz o superior</p>
                <p>• Duración máxima recomendada: 60 minutos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viewer" className="space-y-4">
          {currentTranscription ? (
            <TranscriptionViewer
              transcription={currentTranscription}
              onUpdate={handleTranscriptionUpdate}
              onDelete={handleTranscriptionDelete}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay transcripción seleccionada
                </h3>
                <p className="text-gray-600 mb-4">
                  Sube un archivo de audio o selecciona una transcripción del historial
                </p>
                <Button onClick={() => setActiveTab('upload')}>
                  Subir Audio
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <TranscriptionHistory
            key={refreshHistory}
            onSelect={handleTranscriptionSelect}
            onStatsUpdate={(stats) => {
              document.getElementById('total-transcriptions')!.textContent = stats.total.toString();
              document.getElementById('completed-transcriptions')!.textContent = stats.completed.toString();
              document.getElementById('processing-transcriptions')!.textContent = stats.processing.toString();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
