
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Kanban,
  FolderOpen,
  Users,
  BarChart3,
  Search,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Mic
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'COLABORADOR']
  },
  {
    name: 'Tablero Kanban',
    href: '/kanban',
    icon: Kanban,
    roles: ['ADMIN', 'COLABORADOR']
  },
  {
    name: 'Programas',
    href: '/programs',
    icon: FolderOpen,
    roles: ['ADMIN']
  },
  {
    name: 'Usuarios',
    href: '/users',
    icon: Users,
    roles: ['ADMIN']
  },
  {
    name: 'KPIs y Reportes',
    href: '/reports',
    icon: BarChart3,
    roles: ['ADMIN', 'COLABORADOR']
  },
  {
    name: 'Búsqueda',
    href: '/search',
    icon: Search,
    roles: ['ADMIN', 'COLABORADOR']
  },
  {
    name: 'Transcribir',
    href: '/transcribir',
    icon: Mic,
    roles: ['ADMIN', 'COLABORADOR']
  },
  {
    name: 'Mi Perfil',
    href: '/profile',
    icon: User,
    roles: ['ADMIN', 'COLABORADOR']
  }
];

export function Sidebar({ isOpen = true, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const filteredNavigation = navigationItems.filter(item =>
    item.roles.includes(session?.user?.role as any)
  );

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'ceti-sidebar fixed left-0 top-16 h-[calc(100vh-4rem)] z-50 transform transition-all duration-300 md:relative md:top-0 md:h-screen md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between p-4 border-b">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-primary md:block hidden">
                Navegación
              </h2>
            )}
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-primary md:hidden">
                Navegación
              </h2>
            )}
            
            {/* Botón de toggle para desktop */}
            <div className="hidden md:flex">
              {onToggleCollapse && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onToggleCollapse}
                  className="h-8 w-8"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            
            {/* Botón de cerrar para móvil */}
            <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navegación */}
          <nav className="flex-1 space-y-1 p-4">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center rounded-md text-sm font-medium transition-colors group',
                    isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isCollapsed ? "" : "mr-3"
                  )} />
                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                  {isCollapsed && (
                    <span className="absolute left-16 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.name}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer del sidebar */}
          <div className="border-t p-4">
            {!isCollapsed ? (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium truncate">{session?.user?.name || 'Usuario'}</p>
                <p className="truncate">{session?.user?.email}</p>
                <p className="mt-1 px-2 py-1 bg-accent text-accent-foreground rounded text-xs inline-block">
                  {session?.user?.role}
                </p>
              </div>
            ) : (
              <div className="flex justify-center group relative">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || session?.user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="absolute left-16 bottom-0 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  <p className="font-medium">{session?.user?.name || 'Usuario'}</p>
                  <p>{session?.user?.email}</p>
                  <p className="text-yellow-300">{session?.user?.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
