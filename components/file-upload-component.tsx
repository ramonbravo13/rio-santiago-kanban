
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  File as FileIcon, 
  Download, 
  Trash2, 
  Image, 
  Video, 
  FileText,
  Eye,
  X,
  AlertCircle,
  Loader2,
  MessageSquare,
  Send,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface FileData {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date | string;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface CommentData {
  id: string;
  content: string;
  createdAt: Date | string;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface FileAndCommentsComponentProps {
  taskId: string;
  taskName: string;
  className?: string;
  showTitle?: boolean;
}

export function FileUploadComponent({ 
  taskId, 
  taskName, 
  className,
  showTitle = true
}: FileAndCommentsComponentProps) {
  const { data: session } = useSession();
  const [files, setFiles] = useState<FileData[]>([]);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchFiles();
    fetchComments();
  }, [taskId]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      } else {
        console.error('Error fetching files');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        console.error('Error fetching comments');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'bg-green-100 text-green-800';
    if (mimeType.startsWith('video/')) return 'bg-purple-100 text-purple-800';
    if (mimeType.includes('pdf')) return 'bg-red-100 text-red-800';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-100 text-blue-800';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const uploadFile = async (file: File) => {
    if (!file) return;

    // Validaciones
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande (máximo 50MB)');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'text/plain',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tasks/${taskId}/files`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newFile = await response.json();
        setFiles(prev => [newFile, ...prev]);
        toast.success('Archivo subido exitosamente');
        setUploadProgress(100);
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

  const deleteFile = async (fileId: string, filename: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        toast.success('Archivo eliminado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar archivo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  const downloadFile = (file: FileData) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    droppedFiles.forEach(uploadFile);
  }, [taskId]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(uploadFile);
    e.target.value = ''; // Reset input
  };

  const submitComment = async () => {
    if (!newComment.trim()) {
      toast.error('El comentario no puede estar vacío');
      return;
    }

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments(prev => [newCommentData, ...prev]);
        setNewComment('');
        toast.success('Comentario agregado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al agregar comentario');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setSubmittingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        toast.success('Comentario eliminado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar comentario');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  // Permisos: El backend maneja la verificación de permisos
  // Solo verificamos que el usuario esté autenticado
  const canEdit = !!session?.user;
  const canUpload = canEdit;
  const canComment = canEdit;

  const isImageFile = (mimeType: string) => mimeType.startsWith('image/');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Archivos y Comentarios
          </h3>
          <div className="flex space-x-2">
            <Badge variant="outline" className="text-xs">
              {files.length} archivo{files.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {comments.length} comentario{comments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      )}

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files" className="flex items-center space-x-2">
            <FileIcon className="h-4 w-4" />
            <span>Archivos ({files.length})</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Comentarios ({comments.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab de Archivos */}
        <TabsContent value="files" className="space-y-4">
          {/* Zona de subida */}
          {canUpload && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
            dragActive 
              ? "border-primary bg-primary/5" 
              : "border-gray-300 hover:border-gray-400",
            uploading && "pointer-events-none opacity-50"
          )}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id={`file-upload-${taskId}`}
            disabled={uploading}
          />
          <label 
            htmlFor={`file-upload-${taskId}`}
            className="cursor-pointer block"
          >
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500">
              PDF, Word, Excel, PowerPoint, imágenes y videos (máx. 50MB)
            </p>
          </label>

          {uploading && (
            <div className="mt-3">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">Subiendo archivo...</p>
            </div>
          )}
        </div>
      )}

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={cn(
                  "p-2 rounded",
                  getFileTypeColor(file.mimeType)
                )}>
                  {getFileIcon(file.mimeType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.uploadedBy.name || file.uploadedBy.email}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(file.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                {isImageFile(file.mimeType) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewFile(file)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadFile(file)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>

                {(session?.user?.role === 'ADMIN' || file.uploadedBy.id === session?.user?.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFile(file.id, file.originalName)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

          {files.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <FileIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No hay archivos subidos</p>
            </div>
          )}
        </TabsContent>

        {/* Tab de Comentarios */}
        <TabsContent value="comments" className="space-y-4">
          {/* Formulario para agregar comentario */}
          {canComment && (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium flex-shrink-0">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={submitComment}
                      disabled={!newComment.trim() || submittingComment}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      {submittingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span>{submittingComment ? 'Enviando...' : 'Enviar'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de comentarios */}
          {comments.length > 0 && (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium flex-shrink-0">
                    {comment.author.name?.charAt(0)?.toUpperCase() || comment.author.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.author.name || comment.author.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                      </div>
                      {(session?.user?.role === 'ADMIN' || comment.author.id === session?.user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteComment(comment.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {comments.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No hay comentarios aún</p>
              {canComment && (
                <p className="text-xs mt-1">¡Sé el primero en agregar un comentario!</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de vista previa */}
      {previewFile && isImageFile(previewFile.mimeType) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium truncate">{previewFile.originalName}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewFile(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={previewFile.url}
                alt={previewFile.originalName}
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
