import { useState } from 'react'
import NuevoViaje from './components/NuevoViaje'
import ListaViajes from './components/ListaViajes'
import AdminLogin from './components/AdminLogin'
import Admin from './components/Admin'
import ControlVehiculos from './components/ControlVehiculos'

export default function App() {
  const [vista, setVista] = useState('nuevo')
  const [refreshKey, setRefreshKey] = useState(0)
  const [adminAuth, setAdminAuth] = useState(
    () => sessionStorage.getItem('admin_auth') === '1'
  )

  function handleViajeGuardado() {
    setRefreshKey(k => k + 1)
    setVista('historial')
  }

  function handleCerrarSesionAdmin() {
    sessionStorage.removeItem('admin_auth')
    setAdminAuth(false)
    setVista('nuevo')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-brand text-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/rvc.jpg" alt="RVC" className="h-9 w-9 sm:h-10 sm:w-10 rounded object-cover shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold tracking-wide">Control de Flota</h1>
          </div>
          <nav className="flex gap-1.5 sm:gap-2 overflow-x-auto -mx-1 px-1">
            {['nuevo', 'historial', 'control', 'admin'].map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  vista === v
                    ? 'bg-white text-brand'
                    : 'text-red-100 hover:bg-brand-light'
                }`}
              >
                {v === 'nuevo' ? 'Nuevo viaje' : v === 'historial' ? 'Historial' : v === 'control' ? 'Control' : 'Administración'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {vista === 'nuevo' && <NuevoViaje onGuardado={handleViajeGuardado} />}
        {vista === 'historial' && <ListaViajes key={refreshKey} />}
        {vista === 'control' && <ControlVehiculos />}
        {vista === 'admin' && (
          adminAuth
            ? <Admin onCerrarSesion={handleCerrarSesionAdmin} />
            : <AdminLogin onAcceso={() => setAdminAuth(true)} />
        )}
      </main>
    </div>
  )
}
