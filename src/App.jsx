import { useState } from 'react'
import NuevoViaje from './components/NuevoViaje'
import ListaViajes from './components/ListaViajes'
import AdminLogin from './components/AdminLogin'
import Admin from './components/Admin'

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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/rvc.jpg" alt="RVC" className="h-10 w-10 rounded object-cover" />
            <h1 className="text-xl font-bold tracking-wide">Control de Flota</h1>
          </div>
          <nav className="flex gap-2">
            {['nuevo', 'historial', 'admin'].map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  vista === v
                    ? 'bg-white text-brand'
                    : 'text-red-100 hover:bg-brand-light'
                }`}
              >
                {v === 'nuevo' ? 'Nuevo viaje' : v === 'historial' ? 'Historial' : 'Administración'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {vista === 'nuevo' && <NuevoViaje onGuardado={handleViajeGuardado} />}
        {vista === 'historial' && <ListaViajes key={refreshKey} />}
        {vista === 'admin' && (
          adminAuth
            ? <Admin onCerrarSesion={handleCerrarSesionAdmin} />
            : <AdminLogin onAcceso={() => setAdminAuth(true)} />
        )}
      </main>
    </div>
  )
}
