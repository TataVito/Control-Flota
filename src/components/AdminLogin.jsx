import { useState } from 'react'

export default function AdminLogin({ onAcceso }) {
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (pass === import.meta.env.VITE_ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1')
      onAcceso()
    } else {
      setError(true)
      setPass('')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <img src="/rvc.jpg" alt="RVC" className="h-14 w-14 rounded mx-auto object-cover" />
          <h2 className="text-lg font-bold text-gray-800 mt-2">Administración</h2>
          <p className="text-sm text-gray-400">Ingresa la contraseña para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pass}
            onChange={e => { setPass(e.target.value); setError(false) }}
            placeholder="Contraseña"
            autoFocus
            className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-400 focus:ring-red-300 bg-red-50'
                : 'border-gray-300 focus:ring-brand/40'
            }`}
          />
          {error && (
            <p className="text-xs text-red-500 text-center">Contraseña incorrecta</p>
          )}
          <button
            type="submit"
            className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}
