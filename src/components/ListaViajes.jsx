import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function fechaHoraLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function ModalEditar({ viaje, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    km_llegada: viaje.km_llegada ?? '',
    hora_llegada: viaje.hora_llegada
      ? new Date(viaje.hora_llegada).toISOString().slice(0, 16)
      : '',
    observaciones: viaje.observaciones ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const kmInvalido =
    form.km_llegada !== '' && Number(form.km_llegada) < Number(viaje.km_salida)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => {
      const next = { ...f, [name]: value }
      if (name === 'km_llegada' && value && !f.hora_llegada) {
        next.hora_llegada = fechaHoraLocal()
      }
      return next
    })
  }

  async function handleGuardar() {
    setError(null)
    if (kmInvalido) {
      setError(`El km de llegada no puede ser menor al de salida (${viaje.km_salida?.toLocaleString('es-CL')}).`)
      return
    }

    setGuardando(true)
    const { error: err } = await supabase
      .from('viajes')
      .update({
        km_llegada: form.km_llegada !== '' ? Number(form.km_llegada) : null,
        hora_llegada: form.hora_llegada || null,
        observaciones: form.observaciones || null,
      })
      .eq('id', viaje.id)

    if (err) {
      setError('Error al guardar: ' + err.message)
      setGuardando(false)
      return
    }

    // Actualizar odómetro del vehículo
    if (form.km_llegada) {
      await supabase
        .from('vehiculos')
        .update({ km_actuales: Number(form.km_llegada) })
        .eq('patente', viaje.patente)
    }

    setGuardando(false)
    onGuardado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-800">Completar llegada</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {viaje.patente} · {viaje.destino} · Km salida: {viaje.km_salida?.toLocaleString('es-CL')}
            </p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Cuerpo */}
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Km llegada</label>
              <input
                type="number"
                name="km_llegada"
                value={form.km_llegada}
                onChange={handleChange}
                min={viaje.km_salida ?? 0}
                autoFocus
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  kmInvalido
                    ? 'border-red-400 focus:ring-red-300 bg-red-50'
                    : 'border-gray-300 focus:ring-brand/40'
                }`}
              />
              {kmInvalido && (
                <p className="text-xs text-red-500 mt-1">
                  Mínimo {viaje.km_salida?.toLocaleString('es-CL')} km
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Hora llegada</label>
              <input
                type="datetime-local"
                name="hora_llegada"
                value={form.hora_llegada}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Observaciones</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={2}
              placeholder="Notas del viaje..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Pie */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || kmInvalido}
            className="px-4 py-2 text-sm rounded-lg bg-brand text-white font-medium hover:bg-brand-dark disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ListaViajes() {
  const [viajes, setViajes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroPatente, setFiltroPatente] = useState('')
  const [filtroChofer, setFiltroChofer] = useState('')
  const [viajeEditando, setViajeEditando] = useState(null)

  useEffect(() => {
    cargarViajes()
  }, [])

  async function cargarViajes() {
    setCargando(true)
    const { data } = await supabase
      .from('viajes')
      .select('*, choferes!chofer_id (nombre, rut), chofer2:choferes!chofer2_id (nombre)')
      .order('hora_salida', { ascending: false })
      .limit(200)
    setViajes(data || [])
    setCargando(false)
  }

  const viajesFiltrados = viajes.filter(v => {
    const matchPatente = !filtroPatente || v.patente?.toLowerCase().includes(filtroPatente.toLowerCase())
    const matchChofer = !filtroChofer || v.choferes?.nombre?.toLowerCase().includes(filtroChofer.toLowerCase())
    return matchPatente && matchChofer
  })

  if (cargando) {
    return <div className="flex justify-center py-16 text-gray-400 text-sm">Cargando historial...</div>
  }

  return (
    <div className="space-y-4">
      {viajeEditando && (
        <ModalEditar
          viaje={viajeEditando}
          onCerrar={() => setViajeEditando(null)}
          onGuardado={() => { setViajeEditando(null); cargarViajes() }}
        />
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <h2 className="text-lg font-semibold text-gray-700 flex-1">Historial de viajes</h2>
        <input
          type="text"
          placeholder="Filtrar por patente..."
          value={filtroPatente}
          onChange={e => setFiltroPatente(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 w-full md:w-48"
        />
        <input
          type="text"
          placeholder="Filtrar por chofer..."
          value={filtroChofer}
          onChange={e => setFiltroChofer(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 w-full md:w-48"
        />
      </div>

      {viajesFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
          No hay viajes registrados.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 whitespace-nowrap">Fecha salida</th>
                <th className="px-4 py-3 whitespace-nowrap">Patente</th>
                <th className="px-4 py-3 whitespace-nowrap">Chofer</th>
                <th className="px-4 py-3 whitespace-nowrap">Destino</th>
                <th className="px-4 py-3 whitespace-nowrap">Km salida</th>
                <th className="px-4 py-3 whitespace-nowrap">Km llegada</th>
                <th className="px-4 py-3 whitespace-nowrap">Recorrido</th>
                <th className="px-4 py-3 whitespace-nowrap">Motivo</th>
                <th className="px-4 py-3 whitespace-nowrap">N° Guía</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {viajesFiltrados.map(v => {
                const kmRecorrido = v.km_llegada && v.km_salida ? v.km_llegada - v.km_salida : null
                const sinLlegada = !v.km_llegada
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${sinLlegada ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {v.hora_salida
                        ? new Date(v.hora_salida).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-brand">{v.patente}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {v.choferes?.nombre || '—'}
                      {v.chofer2?.nombre && <span className="text-gray-400 text-xs block">+{v.chofer2.nombre}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{v.destino}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">{v.km_salida?.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {v.km_llegada?.toLocaleString('es-CL') || (
                        <span className="text-amber-500 font-medium">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-green-700">
                      {kmRecorrido != null ? `${kmRecorrido.toLocaleString('es-CL')} km` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{v.motivo || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{v.numero_guia || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setViajeEditando(v)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 text-right">
        {viajesFiltrados.length} viaje{viajesFiltrados.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
