'use client';

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            CETI - Sistema Operativo
          </h1>
          
          <p className="text-gray-600 mb-6">
            La aplicación CETI está funcionando correctamente
          </p>
          
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Servidor</span>
              <span className="text-sm text-green-600 font-semibold">✓ Activo</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Frontend</span>
              <span className="text-sm text-green-600 font-semibold">✓ Cargado</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Base de Datos</span>
              <span className="text-sm text-yellow-600 font-semibold">⚠ En configuración</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Transcripción</span>
              <span className="text-sm text-blue-600 font-semibold">✓ Implementada</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Sistema CETI - Seguimiento de Metas y Objetivos
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Versión con funcionalidad de transcripción integrada
            </p>
          </div>
          
          <div className="mt-4">
            <a 
              href="/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Ir al Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
