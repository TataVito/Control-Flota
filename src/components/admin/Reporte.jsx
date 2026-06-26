import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { utils, writeFile } from 'xlsx'

function primerDiaMes() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

function TarjetaMetrica({ label, valor, sub }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{valor}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function Reporte() {
  const [vehiculos, setVehiculos] = useState([])
  const [choferes, setChoferes]   = useState([])
  const [viajes, setViajes]       = useState([])
  const [cargando, setCargando]   = useState(false)
  const [generado, setGenerado]   = useState(false)

  const [filtros, setFiltros] = useState({
    fechaDesde:    primerDiaMes(),
    fechaHasta:    hoy(),
    patente:       '',
    chofer_id:     '',
    soloCompletos: false,
  })

  useEffect(() => {
    Promise.all([
      supabase.from('vehiculos').select('patente').order('patente'),
      supabase.from('choferes').select('id, nombre').order('nombre'),
    ]).then(([{ data: vh }, { data: ch }]) => {
      setVehiculos(vh || [])
      setChoferes(ch || [])
    })
  }, [])

  function handleFiltro(e) {
    const { name, value, type, checked } = e.target
    setFiltros(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function generar() {
    setCargando(true)
    setGenerado(false)

    let q = supabase
      .from('viajes')
      .select('*, choferes!chofer_id(nombre), chofer2:choferes!chofer2_id(nombre)')
      .gte('hora_salida', filtros.fechaDesde + 'T00:00:00')
      .lte('hora_salida', filtros.fechaHasta + 'T23:59:59')
      .order('hora_salida', { ascending: false })

    if (filtros.patente)       q = q.eq('patente', filtros.patente)
    if (filtros.chofer_id)     q = q.eq('chofer_id', filtros.chofer_id)
    if (filtros.soloCompletos) q = q.not('km_llegada', 'is', null)

    const { data } = await q
    setViajes(data || [])
    setCargando(false)
    setGenerado(true)
  }

  // ── Métricas ──────────────────────────────────────────────────────────────

  const totalKm = viajes.reduce((acc, v) =>
    acc + (v.km_llegada && v.km_salida ? v.km_llegada - v.km_salida : 0), 0)

  const completos = viajes.filter(v => v.km_llegada)
  const promedio  = completos.length ? Math.round(totalKm / completos.length) : 0

  const kmPorPatente = viajes.reduce((acc, v) => {
    if (!v.km_llegada || !v.km_salida) return acc
    acc[v.patente] = (acc[v.patente] || 0) + (v.km_llegada - v.km_salida)
    return acc
  }, {})

  const kmPorChofer = viajes.reduce((acc, v) => {
    if (!v.km_llegada || !v.km_salida) return acc
    const km = v.km_llegada - v.km_salida
    const nombre = v.choferes?.nombre || v.chofer_id
    acc[nombre] = (acc[nombre] || 0) + km
    if (v.chofer2?.nombre) {
      acc[v.chofer2.nombre] = (acc[v.chofer2.nombre] || 0) + km
    }
    return acc
  }, {})

  const rankPatente = Object.entries(kmPorPatente).sort((a, b) => b[1] - a[1])
  const rankChofer  = Object.entries(kmPorChofer).sort((a, b) => b[1] - a[1])

  // ── Exportar Excel ────────────────────────────────────────────────────────

  function exportarExcel() {
    const wb = utils.book_new()

    // Hoja resumen
    const resumenData = [
      ['Período', `${filtros.fechaDesde} al ${filtros.fechaHasta}`],
      ['Total viajes', viajes.length],
      ['Viajes completos', completos.length],
      ['Total km recorridos', totalKm],
      ['Promedio km por viaje', promedio],
      [],
      ['KM POR VEHÍCULO'],
      ['Patente', 'Km recorridos'],
      ...rankPatente.map(([p, km]) => [p, km]),
      [],
      ['KM POR CHOFER'],
      ['Chofer', 'Km recorridos'],
      ...rankChofer.map(([c, km]) => [c, km]),
    ]
    utils.book_append_sheet(wb, utils.aoa_to_sheet(resumenData), 'Resumen')

    // Hoja detalle
    const detalleData = [
      ['Fecha salida', 'Patente', 'Chofer', 'Segundo chofer', 'Destino', 'Motivo', 'Km salida', 'Km llegada', 'Km recorridos', 'Hora llegada', 'Observaciones'],
      ...viajes.map(v => [
        v.hora_salida ? new Date(v.hora_salida).toLocaleString('es-CL') : '',
        v.patente,
        v.choferes?.nombre || '',
        v.chofer2?.nombre || '',
        v.destino,
        v.motivo || '',
        v.km_salida ?? '',
        v.km_llegada ?? '',
        v.km_llegada && v.km_salida ? v.km_llegada - v.km_salida : '',
        v.hora_llegada ? new Date(v.hora_llegada).toLocaleString('es-CL') : '',
        v.observaciones || '',
      ])
    ]
    utils.book_append_sheet(wb, utils.aoa_to_sheet(detalleData), 'Detalle viajes')

    writeFile(wb, `Reporte_viajes_${filtros.fechaDesde}_${filtros.fechaHasta}.xlsx`)
  }

  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40'

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-gray-700">Reporte de viajes</h3>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input type="date" name="fechaDesde" value={filtros.fechaDesde} onChange={handleFiltro} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input type="date" name="fechaHasta" value={filtros.fechaHasta} onChange={handleFiltro} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vehículo</label>
            <select name="patente" value={filtros.patente} onChange={handleFiltro} className={`${inputCls} w-full`}>
              <option value="">Todos</option>
              {vehiculos.map(v => <option key={v.patente} value={v.patente}>{v.patente}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Chofer</label>
            <select name="chofer_id" value={filtros.chofer_id} onChange={handleFiltro} className={`${inputCls} w-full`}>
              <option value="">Todos</option>
              {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input type="checkbox" name="soloCompletos" checked={filtros.soloCompletos} onChange={handleFiltro}
              className="w-4 h-4 accent-brand" />
            Solo viajes con km llegada registrado
          </label>
          <button onClick={generar} disabled={cargando}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50">
            {cargando ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {generado && (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <TarjetaMetrica label="Total viajes" valor={viajes.length} />
            <TarjetaMetrica label="Viajes completos" valor={completos.length}
              sub={`${viajes.length - completos.length} pendientes`} />
            <TarjetaMetrica label="Km totales" valor={totalKm.toLocaleString('es-CL')} />
            <TarjetaMetrica label="Promedio km/viaje" valor={promedio.toLocaleString('es-CL')}
              sub="solo viajes completos" />
          </div>

          {/* Ranking por vehículo y chofer */}
          {(rankPatente.length > 0 || rankChofer.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rankPatente.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">Km por vehículo</h4>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {rankPatente.map(([patente, km]) => (
                        <tr key={patente}>
                          <td className="py-1.5 font-medium text-brand">{patente}</td>
                          <td className="py-1.5 text-right text-gray-700">{km.toLocaleString('es-CL')} km</td>
                          <td className="py-1.5 pl-3 w-24">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-brand rounded-full"
                                style={{ width: `${Math.round((km / rankPatente[0][1]) * 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {rankChofer.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">Km por chofer</h4>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {rankChofer.map(([nombre, km]) => (
                        <tr key={nombre}>
                          <td className="py-1.5 font-medium text-gray-700">{nombre}</td>
                          <td className="py-1.5 text-right text-gray-700">{km.toLocaleString('es-CL')} km</td>
                          <td className="py-1.5 pl-3 w-24">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-brand rounded-full"
                                style={{ width: `${Math.round((km / rankChofer[0][1]) * 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Detalle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-600">Detalle de viajes</h4>
              <button onClick={exportarExcel}
                className="flex items-center gap-1.5 text-sm font-medium text-green-700 border border-green-300 bg-green-50 hover:bg-green-100 px-4 py-1.5 rounded-lg transition-colors">
                ↓ Exportar Excel
              </button>
            </div>

            {viajes.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 text-sm">
                No hay viajes para el período y filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl shadow">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                      <th className="px-4 py-3">Fecha salida</th>
                      <th className="px-4 py-3">Patente</th>
                      <th className="px-4 py-3">Chofer</th>
                      <th className="px-4 py-3">Destino</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3">Km salida</th>
                      <th className="px-4 py-3">Km llegada</th>
                      <th className="px-4 py-3">Recorrido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viajes.map(v => {
                      const km = v.km_llegada && v.km_salida ? v.km_llegada - v.km_salida : null
                      return (
                        <tr key={v.id} className={`hover:bg-gray-50 ${!v.km_llegada ? 'bg-amber-50' : ''}`}>
                          <td className="px-4 py-2.5 whitespace-nowrap text-gray-500 text-xs">{fmtFecha(v.hora_salida)}</td>
                          <td className="px-4 py-2.5 font-semibold text-brand">{v.patente}</td>
                          <td className="px-4 py-2.5">
                            {v.choferes?.nombre || '—'}
                            {v.chofer2?.nombre && <span className="text-gray-400 text-xs block">+{v.chofer2.nombre}</span>}
                          </td>
                          <td className="px-4 py-2.5">{v.destino}</td>
                          <td className="px-4 py-2.5 text-gray-500">{v.motivo || '—'}</td>
                          <td className="px-4 py-2.5 text-right">{v.km_salida?.toLocaleString('es-CL') || '—'}</td>
                          <td className="px-4 py-2.5 text-right">
                            {v.km_llegada?.toLocaleString('es-CL') || <span className="text-amber-500">Pendiente</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-green-700">
                            {km != null ? `${km.toLocaleString('es-CL')} km` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
