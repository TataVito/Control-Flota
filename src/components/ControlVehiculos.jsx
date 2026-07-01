import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function estadoFecha(fecha) {
  if (!fecha) return 'sin-datos'
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(fecha + 'T00:00:00')
  const diasRestantes = Math.floor((venc - hoy) / 86400000)
  if (diasRestantes < 0) return 'vencido'
  if (diasRestantes <= 30) return 'proximo'
  return 'ok'
}

function estadoKm(kmActuales, kmMantencion) {
  if (!kmMantencion || kmActuales == null) return 'sin-datos'
  const diff = kmMantencion - kmActuales
  if (diff <= 0) return 'vencido'
  if (diff <= 1000) return 'proximo'
  return 'ok'
}

const BADGE = {
  vencido:   'bg-red-100 text-red-700 border border-red-300',
  proximo:   'bg-amber-100 text-amber-700 border border-amber-300',
  ok:        'bg-green-100 text-green-700 border border-green-300',
  'sin-datos': 'bg-gray-100 text-gray-400 border border-gray-200',
}

const LABEL = {
  vencido:   'Vencido',
  proximo:   'Próximo',
  ok:        'Vigente',
  'sin-datos': 'Sin datos',
}

function Badge({ estado, texto }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[estado]}`}>
      {texto || LABEL[estado]}
    </span>
  )
}

function FechaBadge({ fecha }) {
  const estado = estadoFecha(fecha)
  const texto = fecha
    ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL')
    : null
  return <Badge estado={estado} texto={texto} />
}

function KmBadge({ kmActuales, kmMantencion }) {
  const estado = estadoKm(kmActuales, kmMantencion)
  const texto = kmMantencion
    ? kmMantencion.toLocaleString('es-CL') + ' km'
    : null
  return <Badge estado={estado} texto={texto} />
}

export default function ControlVehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('vehiculos')
      .select('patente, marca, modelo, tipo, km_actuales, vencimiento_seguro, vencimiento_revision_tecnica, vencimiento_permiso_circulacion, vencimiento_revision_gases, km_mantencion')
      .order('patente')
    setVehiculos(data || [])
    setCargando(false)
  }

  function tieneProblema(v) {
    const fechas = [v.vencimiento_seguro, v.vencimiento_revision_tecnica, v.vencimiento_permiso_circulacion, v.vencimiento_revision_gases]
    const hayFechaVencida = fechas.some(f => estadoFecha(f) === 'vencido')
    const hayFechaProxima = fechas.some(f => estadoFecha(f) === 'proximo')
    const hayKmVencido = estadoKm(v.km_actuales, v.km_mantencion) === 'vencido'
    const hayKmProximo = estadoKm(v.km_actuales, v.km_mantencion) === 'proximo'
    if (filtro === 'vencido') return hayFechaVencida || hayKmVencido
    if (filtro === 'proximo') return (hayFechaProxima || hayKmProximo) && !hayFechaVencida && !hayKmVencido
    return true
  }

  const lista = vehiculos.filter(tieneProblema)

  const contVencidos = vehiculos.filter(v => {
    const fechas = [v.vencimiento_seguro, v.vencimiento_revision_tecnica, v.vencimiento_permiso_circulacion, v.vencimiento_revision_gases]
    return fechas.some(f => estadoFecha(f) === 'vencido') || estadoKm(v.km_actuales, v.km_mantencion) === 'vencido'
  }).length

  const contProximos = vehiculos.filter(v => {
    const fechas = [v.vencimiento_seguro, v.vencimiento_revision_tecnica, v.vencimiento_permiso_circulacion, v.vencimiento_revision_gases]
    const tieneVencido = fechas.some(f => estadoFecha(f) === 'vencido') || estadoKm(v.km_actuales, v.km_mantencion) === 'vencido'
    if (tieneVencido) return false
    return fechas.some(f => estadoFecha(f) === 'proximo') || estadoKm(v.km_actuales, v.km_mantencion) === 'proximo'
  }).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-700">Control de documentos</h2>
        <div className="flex gap-2 text-sm">
          {contVencidos > 0 && (
            <span className="bg-red-100 text-red-700 border border-red-300 px-3 py-1 rounded-full font-medium">
              {contVencidos} vencido{contVencidos !== 1 ? 's' : ''}
            </span>
          )}
          {contProximos > 0 && (
            <span className="bg-amber-100 text-amber-700 border border-amber-300 px-3 py-1 rounded-full font-medium">
              {contProximos} próximo{contProximos !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['todos', 'Todos'], ['vencido', 'Vencidos'], ['proximo', 'Próximos']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filtro === id
                ? 'bg-white text-brand shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-gray-400 text-sm">
            {filtro === 'todos' ? 'No hay vehículos registrados.' : 'No hay vehículos con ese estado.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                <th className="px-4 py-3 whitespace-nowrap">Patente</th>
                <th className="px-4 py-3 whitespace-nowrap">Vehículo</th>
                <th className="px-4 py-3 whitespace-nowrap">SOAP</th>
                <th className="px-4 py-3 whitespace-nowrap">Rev. Técnica</th>
                <th className="px-4 py-3 whitespace-nowrap">Permiso Circ.</th>
                <th className="px-4 py-3 whitespace-nowrap">Rev. Gases</th>
                <th className="px-4 py-3 whitespace-nowrap">Km Mantención</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Km actuales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(v => {
                const estados = [
                  estadoFecha(v.vencimiento_seguro),
                  estadoFecha(v.vencimiento_revision_tecnica),
                  estadoFecha(v.vencimiento_permiso_circulacion),
                  estadoFecha(v.vencimiento_revision_gases),
                  estadoKm(v.km_actuales, v.km_mantencion),
                ]
                const rowVencido = estados.includes('vencido')
                const rowProximo = !rowVencido && estados.includes('proximo')
                return (
                  <tr key={v.patente} className={`${rowVencido ? 'bg-red-50' : rowProximo ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-brand">{v.patente}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {[v.marca, v.modelo].filter(Boolean).join(' ') || v.tipo || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <FechaBadge fecha={v.vencimiento_seguro} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <FechaBadge fecha={v.vencimiento_revision_tecnica} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <FechaBadge fecha={v.vencimiento_permiso_circulacion} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <FechaBadge fecha={v.vencimiento_revision_gases} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <KmBadge kmActuales={v.km_actuales} kmMantencion={v.km_mantencion} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-gray-500">
                      {v.km_actuales != null ? v.km_actuales.toLocaleString('es-CL') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
