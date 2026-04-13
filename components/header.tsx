
'use client';

import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Menu, 
  User,
  BarChart3
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="ceti-header sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y navegación */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <Image
                  src="https://cdn.abacus.ai/images/1dc1ee5c-ff25-4715-8c32-26df11c91485.png"
                  alt="CETI Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-primary">CETI</h1>
                <p className="text-xs text-muted-foreground">Seguimiento de Metas</p>
              </div>
            </Link>
          </div>

          {/* Navegación principal */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            
            <Link href="/kanban">
              <Button variant="ghost" size="sm">
                Tablero Kanban
              </Button>
            </Link>

            {session?.user?.role === 'ADMIN' && (
              <>
                <Link href="/programs">
                  <Button variant="ghost" size="sm">
                    Programas
                  </Button>
                </Link>
                <Link href="/users">
                  <Button variant="ghost" size="sm">
                    Usuarios
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Usuario y acciones */}
          <div className="flex items-center space-x-4">
            {session?.user && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {session.user.name || session.user.email}
                  </span>
                  <span className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded-full">
                    {session.user.role}
                  </span>
                </Button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
