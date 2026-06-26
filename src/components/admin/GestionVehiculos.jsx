import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const TIPOS = ['Camión', 'Camioneta', 'Furgón', 'Minibús', 'Semi remolque', 'Otro']

const VACIO = {
  patente: '', marca: '', modelo: '', anio: '', color: '',
  tipo: '', km_actuales: '', capacidad: '',
  vencimiento_seguro: '', vencimiento_revision_tecnica: '',
}

function Modal({ vehiculo, onCerrar, onGuardado }) {
  const esNuevo = !vehiculo
  const [form, setForm] = useState(
    esNuevo ? VACIO : {
      ...vehiculo,
      anio: vehiculo.anio ?? '',
      km_actuales: vehiculo.km_actuales ?? '',
      capacidad: vehiculo.capacidad ?? '',
      vencimiento_seguro: vehiculo.vencimiento_seguro ?? '',
      vencimiento_revision_tecnica: vehiculo.vencimiento_revision_tecnica ?? '',
    }
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleGuardar() {
    setError(null)
    if (!form.patente.trim()) { setError('La patente es obligatoria.'); return }

    const datos = {
      patente: form.patente.trim().toUpperCase(),
      marca: form.marca || null,
      modelo: form.modelo || null,
      anio: form.anio ? Number(form.anio) : null,
      color: form.color || null,
      tipo: form.tipo || null,
      km_actuales: form.km_actuales !== '' ? Number(form.km_actuales) : null,
      capacidad: form.capacidad !== '' ? Number(form.capacidad) : null,
      vencimiento_seguro: form.vencimiento_seguro || null,
      vencimiento_revision_tecnica: form.vencimiento_revision_tecnica || null,
    }

    setGuardando(true)
    const { error: err } = esNuevo
      ? await supabase.from('vehiculos').insert([datos])
      : await supabase.from('vehiculos').update(datos).eq('patente', vehiculo.patente)

    if (err) { setError(err.message); setGuardando(false); return }
    setGuardando(false)
    onGuardado()
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-6">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{esNuevo ? 'Nuevo vehículo' : `Editar ${vehiculo.patente}`}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Patente *</label>
            <input name="patente" value={form.patente} onChange={handleChange} disabled={!esNuevo}
              className={`${inputCls} ${!esNuevo ? 'bg-gray-50 text-gray-400' : ''}`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
              <option value="">-- Seleccionar --</option>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Marca</label>
            <input name="marca" value={form.marca} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Modelo</label>
            <input name="modelo" value={form.modelo} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
            <input type="number" name="anio" value={form.anio} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <input name="color" value={form.color} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Km actuales</label>
            <input type="number" name="km_actuales" value={form.km_actuales} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Capacidad</label>
            <input type="number" name="capacidad" value={form.capacidad} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Venc. seguro</label>
            <input type="date" name="vencimiento_seguro" value={form.vencimiento_seguro} onChange={handleChange} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Venc. rev. técnica</label>
            <input type="date" name="vencimiento_revision_tecnica" value={form.vencimiento_revision_tecnica} onChange={handleChange} className={inputCls} />
          </div>
        </div>

        {error && <p className="mx-5 mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleGuardar} disabled={guardando}
            className="px-4 py-2 text-sm rounded-lg bg-brand text-white font-medium hover:bg-brand-dark disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GestionVehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null) // null | 'nuevo' | vehiculo
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('vehiculos').select('*').order('patente')
    setVehiculos(data || [])
    setCargando(false)
  }

  async function eliminar(patente) {
    if (!confirm(`¿Eliminar el vehículo ${patente}? Esta acción no se puede deshacer.`)) return
    setEliminando(patente)
    await supabase.from('vehiculos').delete().eq('patente', patente)
    setEliminando(null)
    cargar()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Vehículos ({vehiculos.length})</h3>
        <button onClick={() => setModal('nuevo')}
          className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
          + Nuevo vehículo
        </button>
      </div>

      {modal && (
        <Modal
          vehiculo={modal === 'nuevo' ? null : modal}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar() }}
        />
      )}

      {cargando ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                <th className="px-4 py-3">Patente</th>
                <th className="px-4 py-3">Marca / Modelo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Año</th>
                <th className="px-4 py-3">Km</th>
                <th className="px-4 py-3">Seg.</th>
                <th className="px-4 py-3">Rev. Téc.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vehiculos.map(v => (
                <tr key={v.patente} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-brand">{v.patente}</td>
                  <td className="px-4 py-3">{[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.tipo || '—'}</td>
                  <td className="px-4 py-3">{v.anio || '—'}</td>
                  <td className="px-4 py-3 text-right">{v.km_actuales?.toLocaleString('es-CL') || '—'}</td>
                  <td className="px-4 py-3">{v.vencimiento_seguro ? new Date(v.vencimiento_seguro).toLocaleDateString('es-CL') : '—'}</td>
                  <td className="px-4 py-3">{v.vencimiento_revision_tecnica ? new Date(v.vencimiento_revision_tecnica).toLocaleDateString('es-CL') : '—'}</td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button onClick={() => setModal(v)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-100">
                      Editar
                    </button>
                    <button onClick={() => eliminar(v.patente)} disabled={eliminando === v.patente}
                      className="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40">
                      Eliminar
                    </button>
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
