'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Trash2, Save, FileText, CheckCircle2, Circle, X, BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  todos: Todo[];
  updatedAt: string;
}

export function NotesContent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');

  // Form states for the active note (to allow editing without immediately saving)
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTodos, setEditTodos] = useState<Todo[]>([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  // Update local edit form when a new note is selected
  useEffect(() => {
    if (activeNote) {
      setEditTitle(activeNote.title || '');
      setEditContent(activeNote.content || '');
      setEditTodos(activeNote.todos || []);
    }
  }, [activeNote]);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
        if (data.length > 0 && !activeNote) {
          setActiveNote(data[0]);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Error cargando las notas');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentChanges = async () => {
    if (!activeNote || !isDirty) return null;
    setIsSaving(true);
    try {
      const payload = { title: editTitle, content: editContent, todos: editTodos };
      const res = await fetch(`/api/notes/${activeNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedNote = await res.json();
        setNotes(prevNotes => prevNotes.map(n => n.id === activeNote.id ? updatedNote : n));
        return updatedNote;
      }
      return null;
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNote = async () => {
    if (isDirty) {
      await saveCurrentChanges();
    }

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Nueva Nota',
          content: '',
          todos: []
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setNotes(prevNotes => [newNote, ...prevNotes]);
        setActiveNote(newNote);
      }
    } catch (error) {
      toast.error('Error al crear nota');
    }
  };

  const handleSelectNote = async (note: Note) => {
    if (activeNote?.id === note.id) return;
    if (isDirty) {
      await saveCurrentChanges();
    }
    setActiveNote(note);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta nota?')) return;

    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = notes.filter(n => n.id !== id);
        setNotes(updated);
        toast.success('Nota eliminada');
        
        if (activeNote?.id === id) {
          setActiveNote(updated.length > 0 ? updated[0] : null);
        }
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSaveNote = async () => {
    const updatedNote = await saveCurrentChanges();
    if (updatedNote) {
      toast.success('Guardado completo');
      setActiveNote(updatedNote); 
    }
  };

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false
    };
    setEditTodos([...editTodos, newTodo]);
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    setEditTodos(editTodos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const updateTodoText = (id: string, newText: string) => {
    setEditTodos(editTodos.map(t => 
      t.id === id ? { ...t, text: newText } : t
    ));
  };

  const deleteTodo = (id: string) => {
    setEditTodos(editTodos.filter(t => t.id !== id));
  };

  // Verificadores rápidos para el botón de "guardado pendiente"
  const isDirty = activeNote !== null && (
    editTitle !== activeNote.title || 
    editContent !== activeNote.content || 
    JSON.stringify(editTodos) !== JSON.stringify(activeNote.todos)
  );

  return (
    <div className="flex h-full w-full">
      {/* Paneles de lista de notas (Maestro) */}
      <div className="w-1/3 min-w-[250px] max-w-[350px] border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Button 
            onClick={handleCreateNote} 
            className="w-full justify-center ceti-button-primary bg-[#011400] hover:bg-[#022800]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Nota
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Cargando...</div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No tienes notas.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notes.map(note => (
                <div 
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={cn(
                    "relative p-4 cursor-pointer hover:bg-gray-100 transition-colors border-l-4",
                    activeNote?.id === note.id 
                      ? "bg-gray-100 border-l-[#1E8F24]" 
                      : "border-l-transparent"
                  )}
                >
                  <h4 className="font-semibold text-gray-800 text-sm mb-1 truncate pr-6">{note.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {note.content 
                      ? note.content.replace(/<[^>]*>?/gm, '') 
                      : (note.todos && note.todos.length > 0 ? `${note.todos.length} tareas pendientes` : "Sin contenido adicional")}
                  </p>
                  <span className="text-[10px] text-gray-400 mt-2 block">
                    {format(new Date(note.updatedAt), 'dd MMM yyyy', { locale: es })}
                  </span>
                  
                  <button 
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className="absolute top-4 right-2 text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel del Editor (Detalle) */}
      <div className="flex-1 flex flex-col bg-white">
        {activeNote ? (
          <>
            {/* Header Editor */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-transparent hover:border-gray-200 focus:border-gray-300 focus:ring-0 px-2 py-1 flex-1 shadow-none rounded"
                placeholder="Título de la nota..."
              />
              
              <div className="ml-4 flex items-center space-x-2">
                {isDirty && <span className="text-xs text-amber-600 mr-2 uppercase tracking-wide font-medium">Cambios sin guardar</span>}
                <Button 
                  onClick={handleSaveNote} 
                  disabled={!isDirty || isSaving}
                  className="bg-[#1E8F24] hover:bg-[#16701B]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>

            {/* Area Principal Editor */}
            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
              
              <div className="mb-12 h-[400px]">
                {/* @ts-ignore */}
                <ReactQuill 
                  theme="snow"
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Escribe tus notas, actas, apuntes generales aquí..."
                  className="h-full [&_.ql-container]:text-[15px] [&_.ql-container]:font-sans [&_.ql-container]:border-gray-200 [&_.ql-toolbar]:border-gray-200 [&_.ql-container]:rounded-b-lg [&_.ql-toolbar]:rounded-t-lg [&_.ql-editor]:min-h-[350px]"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      ['clean']
                    ]
                  }}
                />
              </div>

              {/* Tareas Interactive */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-[#1E8F24]" />
                  Lista de Tareas / Checklists
                </h3>
                
                <div className="space-y-2 mb-4">
                  {editTodos.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Agrega tu primer elemento a la lista abajo.</p>
                  ) : (
                    editTodos.map(todo => (
                      <div key={todo.id} className="flex items-center space-x-3 group">
                        <button onClick={() => toggleTodo(todo.id)} className="text-gray-400 hover:text-[#1E8F24] transition-colors focus:outline-none">
                          {todo.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-[#1E8F24]" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <input
                          type="text"
                          value={todo.text}
                          onChange={(e) => updateTodoText(todo.id, e.target.value)}
                          className={cn(
                            "flex-1 text-sm transition-all bg-transparent border-transparent hover:border-gray-200 focus:border-gray-300 focus:ring-0 px-2 py-1 rounded outline-none",
                            todo.completed ? "text-gray-400 line-through" : "text-gray-700"
                          )}
                        />
                        <button 
                          onClick={() => deleteTodo(todo.id)} 
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <Input 
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                    placeholder="Escribe una tarea y presiona Enter..."
                    className="flex-1 h-9 text-sm focus-visible:ring-[#1E8F24]"
                  />
                  <Button size="sm" onClick={handleAddTodo} className="bg-[#1E8F24] hover:bg-[#16701B]">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4">
            <BookText className="h-16 w-16 opacity-20" />
            <p className="text-lg font-medium">Selecciona una nota para leer o comienza una nueva</p>
          </div>
        )}
      </div>
    </div>
  );
}
