
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileAudio, 
  AlertCircle, 
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Transcription } from '@/lib/types';

interface AudioUploaderProps {
  onUploadSuccess: (transcription: Transcription) => void;
}

export function AudioUploader({ onUploadSuccess }: AudioUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/m4a',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    'audio/flac',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    // Validar tipo
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no soportado. Solo archivos de audio/video.');
      return false;
    }

    // Validar tamaño (máximo 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Archivo demasiado grande. Máximo 100MB.');
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/transcriptions', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const transcription = await response.json();
        onUploadSuccess(transcription);
        setSelectedFile(null);
        setUploadProgress(100);
        toast.success('Archivo subido exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al subir archivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setSelectedFile(droppedFiles[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setSelectedFile(selectedFiles[0]);
    }
    e.target.value = ''; // Reset input
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400',
          uploading && 'pointer-events-none opacity-50'
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={handleFileInput}
          className="hidden"
          id="audio-upload"
          disabled={uploading}
        />
        
        <label 
          htmlFor="audio-upload"
          className="cursor-pointer block"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <Upload className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                Arrastra tu archivo aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500">
                MP3, WAV, M4A, AAC, OGG, FLAC, MP4, WebM (máx. 100MB)
              </p>
            </div>
          </div>
        </label>

        {uploading && (
          <div className="mt-4 space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-gray-500">Subiendo archivo...</p>
          </div>
        )}
      </div>

      {/* Selected File Preview */}
      {selectedFile && !uploading && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded">
                <FileAudio className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => uploadFile(selectedFile)}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Subir</span>
              </Button>
              <Button
                onClick={clearSelectedFile}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancelar</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Consejos para mejores resultados:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Usa archivos con buena calidad de audio</li>
              <li>• Evita ruido de fondo excesivo</li>
              <li>• Habla de manera clara y pausada</li>
              <li>• Para archivos largos, considera dividirlos en segmentos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
