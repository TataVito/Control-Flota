import { useState } from 'react'
import GestionVehiculos from './admin/GestionVehiculos'
import GestionChoferes from './admin/GestionChoferes'
import GestionViajes from './admin/GestionViajes'
import Reporte from './admin/Reporte'

const TABS = [
  { id: 'vehiculos', label: 'Vehículos' },
  { id: 'choferes',  label: 'Choferes' },
  { id: 'viajes',    label: 'Viajes' },
  { id: 'reporte',   label: 'Reporte' },
]

export default function Admin({ onCerrarSesion }) {
  const [tab, setTab] = useState('vehiculos')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">Administración</h2>
        <button
          onClick={onCerrarSesion}
          className="text-xs text-gray-400 hover:text-brand transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-brand shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'vehiculos' && <GestionVehiculos />}
      {tab === 'choferes'  && <GestionChoferes />}
      {tab === 'viajes'    && <GestionViajes />}
      {tab === 'reporte'   && <Reporte />}
    </div>
  )
}
