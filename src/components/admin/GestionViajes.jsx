import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TIPOS_VIAJE = ['Trabajo', 'Traslado personal', 'Compras', 'Mantención', 'Otro']

function toLocal(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function fechaHoraLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function ModalEditar({ viaje, vehiculos, choferes, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    patente:      viaje.patente ?? '',
    chofer_id:    viaje.chofer_id ?? '',
    chofer2_id:   viaje.chofer2_id ?? '',
    km_salida:    viaje.km_salida ?? '',
    km_llegada:   viaje.km_llegada ?? '',
    hora_salida:  toLocal(viaje.hora_salida),
    hora_llegada: toLocal(viaje.hora_llegada),
    destino:      viaje.destino ?? '',
    motivo:       viaje.motivo ?? '',
    observaciones: viaje.observaciones ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const kmInvalido =
    form.km_llegada !== '' &&
    form.km_salida !== '' &&
    Number(form.km_llegada) < Number(form.km_salida)

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
    if (!form.patente || !form.chofer_id || !form.km_salida || !form.destino) {
      setError('Patente, chofer, km salida y destino son obligatorios.')
      return
    }
    if (kmInvalido) {
      setError(`El km de llegada no puede ser menor al de salida (${Number(form.km_salida).toLocaleString('es-CL')}).`)
      return
    }

    setGuardando(true)
    const { error: err } = await supabase.from('viajes').update({
      patente:      form.patente,
      chofer_id:    form.chofer_id,
      chofer2_id:   form.chofer2_id || null,
      km_salida:    form.km_salida !== '' ? Number(form.km_salida) : null,
      km_llegada:   form.km_llegada !== '' ? Number(form.km_llegada) : null,
      hora_salida:  form.hora_salida || null,
      hora_llegada: form.hora_llegada || null,
      destino:      form.destino,
      motivo:       form.motivo || null,
      observaciones: form.observaciones || null,
    }).eq('id', viaje.id)

    if (err) { setError(err.message); setGuardando(false); return }

    if (form.km_llegada) {
      await supabase
        .from('vehiculos')
        .update({ km_actuales: Number(form.km_llegada) })
        .eq('patente', form.patente)
    }

    setGuardando(false)
    onGuardado()
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-6">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-800">Editar viaje</h3>
            <p className="text-xs text-gray-400 mt-0.5">{viaje.patente} · {viaje.destino}</p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Patente y Chofer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Patente *</label>
              <select name="patente" value={form.patente} onChange={handleChange} className={inputCls}>
                <option value="">-- Seleccionar --</option>
                {vehiculos.map(v => <option key={v.patente} value={v.patente}>{v.patente}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Chofer *</label>
              <select name="chofer_id" value={form.chofer_id} onChange={handleChange} className={inputCls}>
                <option value="">-- Seleccionar --</option>
                {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Segundo chofer */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Segundo chofer</label>
            <select name="chofer2_id" value={form.chofer2_id} onChange={handleChange} className={inputCls}>
              <option value="">-- Ninguno --</option>
              {choferes.filter(c => c.id !== form.chofer_id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Destino y Motivo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Destino *</label>
              <input name="destino" value={form.destino} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Motivo</label>
              <select name="motivo" value={form.motivo} onChange={handleChange} className={inputCls}>
                <option value="">-- Seleccionar --</option>
                {TIPOS_VIAJE.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Kilometraje */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Km salida *</label>
              <input type="number" name="km_salida" value={form.km_salida} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Km llegada</label>
              <input
                type="number"
                name="km_llegada"
                value={form.km_llegada}
                onChange={handleChange}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  kmInvalido ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-gray-300 focus:ring-brand/40'
                }`}
              />
              {kmInvalido && (
                <p className="text-xs text-red-500 mt-1">Mínimo {Number(form.km_salida).toLocaleString('es-CL')} km</p>
              )}
            </div>
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hora salida</label>
              <input type="datetime-local" name="hora_salida" value={form.hora_salida} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Hora llegada</label>
              <input type="datetime-local" name="hora_llegada" value={form.hora_llegada} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange}
              rows={2} className={`${inputCls} resize-none`} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando || kmInvalido}
            className="px-4 py-2 text-sm rounded-lg bg-brand text-white font-medium hover:bg-brand-dark disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GestionViajes() {
  const [viajes, setViajes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [choferes, setChoferes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [{ data: vj }, { data: vh }, { data: ch }] = await Promise.all([
      supabase.from('viajes').select('*, choferes!chofer_id (nombre), chofer2:choferes!chofer2_id (nombre)').order('hora_salida', { ascending: false }).limit(200),
      supabase.from('vehiculos').select('patente').order('patente'),
      supabase.from('choferes').select('id, nombre').order('nombre'),
    ])
    setViajes(vj || [])
    setVehiculos(vh || [])
    setChoferes(ch || [])
    setCargando(false)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este viaje? Esta acción no se puede deshacer.')) return
    setEliminando(id)
    await supabase.from('viajes').delete().eq('id', id)
    setEliminando(null)
    cargar()
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">Viajes registrados ({viajes.length})</h3>

      {editando && (
        <ModalEditar
          viaje={editando}
          vehiculos={vehiculos}
          choferes={choferes}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar() }}
        />
      )}

      {cargando ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
      ) : viajes.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
          No hay viajes registrados.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Patente</th>
                <th className="px-4 py-3">Chofer</th>
                <th className="px-4 py-3">Destino</th>
                <th className="px-4 py-3">Km salida</th>
                <th className="px-4 py-3">Km llegada</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {viajes.map(v => (
                <tr key={v.id} className={`hover:bg-gray-50 ${!v.km_llegada ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                    {v.hora_salida
                      ? new Date(v.hora_salida).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-brand">{v.patente}</td>
                  <td className="px-4 py-3">
                    {v.choferes?.nombre || '—'}
                    {v.chofer2?.nombre && <span className="text-gray-400 text-xs block">+{v.chofer2.nombre}</span>}
                  </td>
                  <td className="px-4 py-3">{v.destino}</td>
                  <td className="px-4 py-3 text-right">{v.km_salida?.toLocaleString('es-CL') || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {v.km_llegada?.toLocaleString('es-CL') || (
                      <span className="text-amber-500 font-medium">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditando(v)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-100">
                        Editar
                      </button>
                      <button onClick={() => eliminar(v.id)} disabled={eliminando === v.id}
                        className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
