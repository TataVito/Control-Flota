import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const VACIO = { nombre: '', rut: '', activo: true }

function Modal({ chofer, onCerrar, onGuardado }) {
  const esNuevo = !chofer
  const [form, setForm] = useState(esNuevo ? VACIO : { ...chofer })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleGuardar() {
    setError(null)
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }

    const datos = { nombre: form.nombre.trim(), rut: form.rut || null, activo: form.activo }
    setGuardando(true)
    const { error: err } = esNuevo
      ? await supabase.from('choferes').insert([datos])
      : await supabase.from('choferes').update(datos).eq('id', chofer.id)

    if (err) { setError(err.message); setGuardando(false); return }
    setGuardando(false)
    onGuardado()
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{esNuevo ? 'Nuevo chofer' : 'Editar chofer'}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre completo *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} autoFocus className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">RUT</label>
            <input name="rut" value={form.rut ?? ''} onChange={handleChange} placeholder="12.345.678-9" className={inputCls} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange}
              className="w-4 h-4 accent-brand" />
            <span className="text-sm text-gray-600">Chofer activo</span>
          </label>
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

export default function GestionChoferes() {
  const [choferes, setChoferes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('choferes').select('*').order('nombre')
    setChoferes(data || [])
    setCargando(false)
  }

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return
    setEliminando(id)
    await supabase.from('choferes').delete().eq('id', id)
    setEliminando(null)
    cargar()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Choferes ({choferes.length})</h3>
        <button onClick={() => setModal('nuevo')}
          className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors">
          + Nuevo chofer
        </button>
      </div>

      {modal && (
        <Modal
          chofer={modal === 'nuevo' ? null : modal}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar() }}
        />
      )}

      {cargando ? (
        <p className="text-sm text-gray-400 py-8 text-center">Cargando...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">RUT</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {choferes.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{c.rut || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button onClick={() => setModal(c)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-100">
                      Editar
                    </button>
                    <button onClick={() => eliminar(c.id, c.nombre)} disabled={eliminando === c.id}
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
