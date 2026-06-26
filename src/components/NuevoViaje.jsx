import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import VehiculoInfo from './VehiculoInfo'

const TIPOS_VIAJE = ['Trabajo', 'Traslado personal', 'Compras', 'Mantención', 'Otro']

export default function NuevoViaje({ onGuardado }) {
  const [choferes, setChoferes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    patente: '',
    chofer_id: '',
    km_salida: '',
    km_llegada: '',
    hora_salida: fechaHoraLocal(),
    hora_llegada: '',
    destino: '',
    motivo: '',
    observaciones: '',
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const [{ data: ch }, { data: vh }] = await Promise.all([
      supabase.from('choferes').select('id, nombre, rut').order('nombre'),
      supabase.from('vehiculos').select('patente').order('patente'),
    ])
    setChoferes(ch || [])
    setVehiculos(vh || [])
  }

  async function handlePatenteChange(patente) {
    setForm(f => ({ ...f, patente }))
    setVehiculoSeleccionado(null)
    if (!patente) return

    const { data } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('patente', patente)
      .single()

    setVehiculoSeleccionado(data || null)
    if (data?.km_actuales) {
      setForm(f => ({ ...f, km_salida: data.km_actuales }))
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => {
      const next = { ...f, [name]: value }
      // Al ingresar km_llegada: auto-completar hora_llegada si estaba vacía
      if (name === 'km_llegada' && value && !f.hora_llegada) {
        next.hora_llegada = fechaHoraLocal()
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.patente || !form.chofer_id || !form.km_salida || !form.destino) {
      setError('Completa los campos obligatorios: patente, chofer, km salida y destino.')
      return
    }

    if (form.km_llegada && Number(form.km_llegada) < Number(form.km_salida)) {
      setError(`El km de llegada (${Number(form.km_llegada).toLocaleString('es-CL')}) no puede ser menor al de salida (${Number(form.km_salida).toLocaleString('es-CL')}).`)
      return
    }

    setGuardando(true)
    const { error: err } = await supabase.from('viajes').insert([
      {
        patente: form.patente,
        chofer_id: form.chofer_id,
        km_salida: Number(form.km_salida),
        km_llegada: form.km_llegada ? Number(form.km_llegada) : null,
        hora_salida: form.hora_salida || null,
        hora_llegada: form.hora_llegada || null,
        destino: form.destino,
        motivo: form.motivo,
        observaciones: form.observaciones,
      },
    ])

    if (err) {
      setError('Error al guardar: ' + err.message)
      setGuardando(false)
      return
    }

    // Actualizar km_actuales del vehículo si se ingresó km_llegada
    if (form.km_llegada) {
      await supabase
        .from('vehiculos')
        .update({ km_actuales: Number(form.km_llegada) })
        .eq('patente', form.patente)
    }

    setGuardando(false)
    onGuardado()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-700">Registrar nuevo viaje</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-5">
        {/* Vehículo y Chofer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Patente <span className="text-red-500">*</span>
            </label>
            <select
              name="patente"
              value={form.patente}
              onChange={e => handlePatenteChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="">-- Seleccionar vehículo --</option>
              {vehiculos.map(v => (
                <option key={v.patente} value={v.patente}>
                  {v.patente}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Chofer <span className="text-red-500">*</span>
            </label>
            <select
              name="chofer_id"
              value={form.chofer_id}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="">-- Seleccionar chofer --</option>
              {choferes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.rut ? `(${c.rut})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info del vehículo seleccionado */}
        {vehiculoSeleccionado && <VehiculoInfo vehiculo={vehiculoSeleccionado} />}

        {/* Destino y Motivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Destino <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="destino"
              value={form.destino}
              onChange={handleChange}
              placeholder="Ej: Antofagasta, obras norte"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Motivo</label>
            <select
              name="motivo"
              value={form.motivo}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="">-- Seleccionar --</option>
              {TIPOS_VIAJE.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kilometraje */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Km salida <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="km_salida"
              value={form.km_salida}
              onChange={handleChange}
              min={0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Km llegada</label>
            <input
              type="number"
              name="km_llegada"
              value={form.km_llegada}
              onChange={handleChange}
              min={form.km_salida || 0}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                form.km_llegada && Number(form.km_llegada) < Number(form.km_salida)
                  ? 'border-red-400 focus:ring-red-300 bg-red-50'
                  : 'border-gray-300 focus:ring-brand/40'
              }`}
            />
            {form.km_llegada && Number(form.km_llegada) < Number(form.km_salida) && (
              <p className="text-xs text-red-500 mt-1">
                Debe ser mayor o igual al km de salida ({Number(form.km_salida).toLocaleString('es-CL')})
              </p>
            )}
          </div>
        </div>

        {/* Horarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Hora salida</label>
            <input
              type="datetime-local"
              name="hora_salida"
              value={form.hora_salida}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
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

        {/* Observaciones */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Observaciones</label>
          <textarea
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            rows={3}
            placeholder="Notas adicionales..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar viaje'}
          </button>
        </div>
      </form>
    </div>
  )
}

function fechaHoraLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}
