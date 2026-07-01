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
  const [sinKmAnterior, setSinKmAnterior] = useState(false)
  const [esViajeInicial, setEsViajeInicial] = useState(false)
  const [alertasDocumentos, setAlertasDocumentos] = useState([])

  const [form, setForm] = useState({
    patente: '',
    chofer_id: '',
    chofer2_id: '',
    km_salida: '',
    km_llegada: '',
    hora_salida: fechaHoraLocal(),
    hora_llegada: '',
    destino: '',
    motivo: '',
    numero_guia: '',
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
    setForm(f => ({ ...f, patente, km_salida: '' }))
    setVehiculoSeleccionado(null)
    setSinKmAnterior(false)
    setEsViajeInicial(false)
    setAlertasDocumentos([])
    if (!patente) return

    const [{ data }, { data: ultimosViajes }] = await Promise.all([
      supabase.from('vehiculos').select('*').eq('patente', patente).single(),
      supabase.from('viajes').select('id, km_llegada').eq('patente', patente).order('id', { ascending: false }).limit(1),
    ])

    setVehiculoSeleccionado(data || null)

    if (data) {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const alertas = []
      const checks = [
        { campo: 'vencimiento_seguro', label: 'SOAP' },
        { campo: 'vencimiento_revision_tecnica', label: 'Revisión técnica' },
        { campo: 'vencimiento_permiso_circulacion', label: 'Permiso de circulación' },
        { campo: 'vencimiento_revision_gases', label: 'Revisión de gases' },
      ]
      for (const { campo, label } of checks) {
        const fecha = data[campo]
        if (fecha) {
          const venc = new Date(fecha + 'T00:00:00')
          const dias = Math.floor((venc - hoy) / 86400000)
          if (dias < 0) alertas.push({ label, estado: 'vencido', fecha })
          else if (dias <= 30) alertas.push({ label, estado: 'proximo', fecha })
        }
      }
      if (data.km_mantencion != null && data.km_actuales != null) {
        const diff = data.km_mantencion - data.km_actuales
        if (diff <= 0) alertas.push({ label: 'Mantención', estado: 'vencido', km: data.km_mantencion })
        else if (diff <= 1000) alertas.push({ label: 'Mantención', estado: 'proximo', km: data.km_mantencion })
      }
      setAlertasDocumentos(alertas)
    }

    const sinViajes = !ultimosViajes || ultimosViajes.length === 0
    const ultimoViaje = ultimosViajes?.[0]

    if (sinViajes) {
      setSinKmAnterior(true)
      setEsViajeInicial(true)
    } else if (!ultimoViaje?.km_llegada) {
      setSinKmAnterior(true)
      setEsViajeInicial(false)
    } else {
      setForm(f => ({ ...f, km_salida: data?.km_actuales || ultimoViaje.km_llegada }))
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

    // Buscar el viaje anterior sin km_llegada ANTES de insertar el nuevo
    let anteriorViajeId = null
    if (sinKmAnterior && !esViajeInicial && form.km_salida) {
      const { data: prev } = await supabase
        .from('viajes')
        .select('id')
        .eq('patente', form.patente)
        .is('km_llegada', null)
        .order('id', { ascending: false })
        .limit(1)
        .single()
      anteriorViajeId = prev?.id || null
    }

    const { error: err } = await supabase.from('viajes').insert([
      {
        patente: form.patente,
        chofer_id: form.chofer_id,
        chofer2_id: form.chofer2_id || null,
        km_salida: Number(form.km_salida),
        km_llegada: form.km_llegada ? Number(form.km_llegada) : null,
        hora_salida: desdeInputLocal(form.hora_salida),
        hora_llegada: desdeInputLocal(form.hora_llegada),
        destino: form.destino,
        motivo: form.motivo,
        numero_guia: form.motivo === 'Otro' ? (form.numero_guia || null) : null,
        observaciones: form.observaciones,
      },
    ])

    if (err) {
      setError('Error al guardar: ' + err.message)
      setGuardando(false)
      return
    }

    // Actualizar km_actuales del vehículo
    if (form.km_llegada) {
      await supabase
        .from('vehiculos')
        .update({ km_actuales: Number(form.km_llegada) })
        .eq('patente', form.patente)
    } else if (sinKmAnterior && form.km_salida) {
      if (anteriorViajeId) {
        await supabase
          .from('viajes')
          .update({ km_llegada: Number(form.km_salida) })
          .eq('id', anteriorViajeId)
      }

      await supabase
        .from('vehiculos')
        .update({ km_actuales: Number(form.km_salida) })
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

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Segundo chofer</label>
            <select
              name="chofer2_id"
              value={form.chofer2_id}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="">-- Ninguno --</option>
              {choferes.filter(c => c.id !== form.chofer_id).map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.rut ? `(${c.rut})` : ''}
                </option>
              ))}
            </select>
          </div>

        {/* Info del vehículo seleccionado */}
        {vehiculoSeleccionado && <VehiculoInfo vehiculo={vehiculoSeleccionado} />}

        {/* Alertas de documentos vencidos o próximos a vencer */}
        {alertasDocumentos.length > 0 && (
          <div className={`rounded-lg px-4 py-3 text-sm border ${
            alertasDocumentos.some(a => a.estado === 'vencido')
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}>
            <p className="font-semibold mb-1">
              {alertasDocumentos.some(a => a.estado === 'vencido')
                ? '⛔ Este vehículo tiene documentos vencidos'
                : '⚠ Este vehículo tiene documentos próximos a vencer'}
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {alertasDocumentos.map((a, i) => (
                <li key={i}>
                  <span className="font-medium">{a.label}:</span>{' '}
                  {a.estado === 'vencido' ? 'vencido' : 'vence pronto'}
                  {a.fecha && ` (${new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-CL')})`}
                  {a.km != null && ` (a los ${a.km.toLocaleString('es-CL')} km)`}
                </li>
              ))}
            </ul>
          </div>
        )}

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

        {/* Número de guía (solo cuando el motivo es "Otro") */}
        {form.motivo === 'Otro' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Número de guía</label>
            <input
              type="text"
              name="numero_guia"
              value={form.numero_guia}
              onChange={handleChange}
              placeholder="Ej: 12345"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        )}

        {/* Alerta km faltante */}
        {sinKmAnterior && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
            {esViajeInicial ? (
              <>
                <p className="font-semibold mb-1">Viaje inicial</p>
                <p>Este vehículo no tiene viajes registrados. Ingresa el kilometraje de salida para registrar el primer viaje.</p>
              </>
            ) : (
              <>
                <p className="font-semibold mb-1">⚠ Vehículo no registra Km de llegada anterior</p>
                <p>Ingresa el kilometraje actual del vehículo. Se registrará como Km de llegada del viaje anterior y como Km de salida de este viaje.</p>
              </>
            )}
          </div>
        )}

        {/* Kilometraje */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {esViajeInicial ? (
                <>Km salida <span className="text-red-500">*</span></>
              ) : sinKmAnterior ? (
                <>Km actual del vehículo <span className="text-red-500">*</span></>
              ) : (
                <>Km salida <span className="text-red-500">*</span></>
              )}
            </label>
            <input
              type="number"
              name="km_salida"
              value={form.km_salida}
              onChange={handleChange}
              min={0}
              placeholder={sinKmAnterior && !esViajeInicial ? 'Ingresa el km actual del vehículo' : ''}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                sinKmAnterior
                  ? 'border-amber-400 focus:ring-amber-300 bg-amber-50'
                  : 'border-gray-300 focus:ring-brand/40'
              }`}
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

// El input datetime-local entrega la hora en el huso horario del navegador;
// hay que convertirla a UTC real antes de guardarla en una columna timestamptz.
function desdeInputLocal(value) {
  return value ? new Date(value).toISOString() : null
}
