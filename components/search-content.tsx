
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  FolderOpen, 
  CheckSquare, 
  Users, 
  MessageSquare,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface SearchResult {
  type: 'program' | 'task' | 'user' | 'comment';
  id: string;
  title: string;
  description?: string;
  content?: string;
  metadata?: any;
  relevance?: number;
}

export function SearchContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const debounceTimer = setTimeout(() => {
        performSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  const performSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        toast.error('Error en la búsqueda');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.length >= 2) {
      performSearch();
    }
  };

  const filteredResults = results.filter(result => {
    if (activeTab === 'all') return true;
    return result.type === activeTab;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'program':
        return <FolderOpen className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'program':
        return 'Programa';
      case 'task':
        return 'Tarea';
      case 'user':
        return 'Usuario';
      case 'comment':
        return 'Comentario';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'program':
        return 'bg-blue-100 text-blue-800';
      case 'task':
        return 'bg-green-100 text-green-800';
      case 'user':
        return 'bg-purple-100 text-purple-800';
      case 'comment':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'program':
        router.push('/programs');
        break;
      case 'task':
        router.push('/kanban');
        break;
      case 'user':
        if (session?.user?.role === 'ADMIN') {
          router.push('/users');
        }
        break;
      case 'comment':
        router.push('/kanban');
        break;
    }
  };

  const resultsByType = {
    all: results.length,
    program: results.filter(r => r.type === 'program').length,
    task: results.filter(r => r.type === 'task').length,
    user: results.filter(r => r.type === 'user').length,
    comment: results.filter(r => r.type === 'comment').length,
  };

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en programas, tareas, usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-base"
                autoFocus
              />
              {loading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </form>
          
          {searchTerm && (
            <div className="mt-4 text-sm text-muted-foreground">
              {loading ? 'Buscando...' : `${results.length} resultado(s) encontrado(s)`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {searchTerm && !loading && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              Todos ({resultsByType.all})
            </TabsTrigger>
            <TabsTrigger value="program">
              Programas ({resultsByType.program})
            </TabsTrigger>
            <TabsTrigger value="task">
              Tareas ({resultsByType.task})
            </TabsTrigger>
            <TabsTrigger value="user">
              Usuarios ({resultsByType.user})
            </TabsTrigger>
            <TabsTrigger value="comment">
              Comentarios ({resultsByType.comment})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchTerm.length < 2 
                      ? 'Ingresa al menos 2 caracteres para buscar' 
                      : 'No se encontraron resultados'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm.length >= 2 && 'Intenta con otros términos de búsqueda'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredResults.map((result, index) => (
                  <Card 
                    key={`${result.type}-${result.id}-${index}`} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            {getTypeIcon(result.type)}
                            <h3 className="font-semibold">{result.title}</h3>
                            <Badge className={getTypeColor(result.type)}>
                              {getTypeName(result.type)}
                            </Badge>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          {result.description && (
                            <p className="text-sm text-muted-foreground">
                              {result.description.length > 150 
                                ? result.description.substring(0, 150) + '...'
                                : result.description}
                            </p>
                          )}
                          
                          {result.content && (
                            <p className="text-sm text-muted-foreground">
                              {result.content.length > 150 
                                ? result.content.substring(0, 150) + '...'
                                : result.content}
                            </p>
                          )}
                          
                          {result.metadata && (
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              {result.metadata.assignee && (
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  {result.metadata.assignee}
                                </div>
                              )}
                              {result.metadata.program && (
                                <div className="flex items-center">
                                  <FolderOpen className="h-3 w-3 mr-1" />
                                  {result.metadata.program}
                                </div>
                              )}
                              {result.metadata.status && (
                                <Badge variant="outline" className="text-xs">
                                  {result.metadata.status}
                                </Badge>
                              )}
                              {result.metadata.date && (
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(result.metadata.date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Tips de búsqueda */}
      {!searchTerm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Consejos de búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Qué puedes buscar:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Nombres de programas</li>
                  <li>• Títulos y descripciones de tareas</li>
                  <li>• Nombres de usuarios</li>
                  <li>• Contenido de comentarios</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Tips para mejores resultados:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Usa al menos 2 caracteres</li>
                  <li>• Palabras clave específicas</li>
                  <li>• Filtra por tipo de contenido</li>
                  <li>• Los resultados se ordenan por relevancia</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
