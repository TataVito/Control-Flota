function Campo({ label, valor }) {
  if (!valor && valor !== 0) return null
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800">{valor}</p>
    </div>
  )
}

function alertaVencimiento(fecha) {
  if (!fecha) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(fecha + 'T00:00:00')
  const dias = Math.floor((venc - hoy) / 86400000)
  if (dias < 0) return 'vencido'
  if (dias <= 30) return 'próximo'
  return null
}

function BadgeFecha({ label, fecha }) {
  if (!fecha) return null
  const alerta = alertaVencimiento(fecha)
  const color =
    alerta === 'vencido'
      ? 'bg-red-100 text-red-700 border-red-200'
      : alerta === 'próximo'
      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
      : 'bg-green-50 text-green-700 border-green-200'

  return (
    <div className={`border rounded-lg px-3 py-2 ${color}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-sm font-bold">{new Date(fecha + 'T00:00:00').toLocaleDateString('es-CL')}</p>
      {alerta && (
        <p className="text-xs mt-0.5 font-semibold uppercase tracking-wide">{alerta}</p>
      )}
    </div>
  )
}

export default function VehiculoInfo({ vehiculo }) {
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-brand uppercase tracking-wide">
        Datos del vehículo
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Campo label="Patente" valor={vehiculo.patente} />
        <Campo label="Marca" valor={vehiculo.marca} />
        <Campo label="Modelo" valor={vehiculo.modelo} />
        <Campo label="Año" valor={vehiculo.anio} />
        <Campo label="Color" valor={vehiculo.color} />
        <Campo label="Tipo" valor={vehiculo.tipo} />
        <Campo label="Km actuales" valor={vehiculo.km_actuales?.toLocaleString('es-CL')} />
        <Campo label="Capacidad" valor={vehiculo.capacidad ? `${vehiculo.capacidad} personas` : null} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BadgeFecha label="Vencimiento seguro (SOAP)" fecha={vehiculo.vencimiento_seguro} />
        <BadgeFecha label="Revisión técnica" fecha={vehiculo.vencimiento_revision_tecnica} />
        <BadgeFecha label="Permiso de circulación" fecha={vehiculo.vencimiento_permiso_circulacion} />
        <BadgeFecha label="Revisión de gases" fecha={vehiculo.vencimiento_revision_gases} />
      </div>
    </div>
  )
}
