import { readFileSync } from 'fs'
import { read, utils } from 'xlsx'
import { createClient } from '@supabase/supabase-js'

// Lee credenciales del .env manualmente (sin dotenv)
const env = readFileSync('.env', 'utf8')
const getEnv = key => env.match(new RegExp(`^${key}=(.+)`, 'm'))?.[1]?.trim()

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'))

// ── Parsing helpers ────────────────────────────────────────────────────────────

const TIPOS = ['semi remolque', 'minibús', 'minibus', 'furgon', 'furgón', 'camión grúa', 'camión', 'camioneta']

function extraerTipo(desc) {
  const d = desc.toLowerCase()
  for (const t of TIPOS) {
    if (d.startsWith(t)) return t.replace('furgon', 'furgón').replace(/^\w/, c => c.toUpperCase())
  }
  return null
}

function extraerMarca(desc) {
  // Quita el tipo al inicio y toma la primera palabra(s) como marca
  const tipo = extraerTipo(desc)
  if (!tipo) return null
  const sinTipo = desc.slice(tipo.length).trim()
  // Hasta el primer número o palabra clave como "año", "4x2", "año"
  const match = sinTipo.match(/^([A-Za-záéíóúÁÉÍÓÚñÑ\s\.]+?)(?:\s+(?:Año|año|\d{4}|4x2|4X2|Cil|Bco|Blanco|Rojo|Post|Pick|HL|GL|M-)|$)/i)
  if (!match) return sinTipo.split(/\s+/).slice(0, 2).join(' ').trim() || null
  return match[1].trim() || null
}

function extraerAnio(desc) {
  const m = desc.match(/[Aa]ño\s+(\d{4})/)
  if (m) return parseInt(m[1])
  const m2 = desc.match(/\b(19\d{2}|20\d{2})\b/)
  return m2 ? parseInt(m2[1]) : null
}

function extraerColor(desc) {
  const colores = [
    'Rojo Joya', 'Rojo Guinda', 'Rojo', 'Blanco', 'Negro', 'Azul', 'Gris', 'Plateado', 'Verde'
  ]
  for (const c of colores) {
    if (desc.toLowerCase().includes(c.toLowerCase())) return c
  }
  return null
}

function limpiarModelo(val) {
  if (!val || val === 'S/F' || val === 'N/A') return null
  return val.trim() || null
}

// ── Leer Excel ─────────────────────────────────────────────────────────────────

const wb = read(readFileSync('F:\\control\\Vehículos Menores 2026.xlsx'))
const ws = wb.Sheets[wb.SheetNames[0]]
const filas = utils.sheet_to_json(ws, { header: 1, defval: '' })

// Encabezados en fila 0; datos desde fila 1
// Col 8 = Modelo (vehiculo), Col 9 = Patente (vehiculo), Col 11 = Descripcion
const REGEX_PATENTE = /^[A-Z]{4}-\d{2}$|^[A-Z]{3}-\d{4}$|^[A-Z]{2}\d{4}$|^[A-Z]{2}\d{4}$/

const mapa = new Map()

for (const fila of filas.slice(1)) {
  const patente = String(fila[9] ?? '').trim()
  if (!REGEX_PATENTE.test(patente)) continue
  if (mapa.has(patente)) continue  // deduplicar: conservar la primera aparición

  const desc   = String(fila[11] ?? '').trim()
  const modelo = limpiarModelo(String(fila[8] ?? ''))

  // Ignorar los vendidos (opcional: comenta esta línea para incluirlos)
  if (desc.toLowerCase().includes('vendido')) continue

  const tipo  = extraerTipo(desc)
  const marca = extraerMarca(desc)
  const anio  = extraerAnio(desc)
  const color = extraerColor(desc)

  mapa.set(patente, { patente, marca, modelo, anio, color, tipo, km_actuales: 0, capacidad: null })
}

const vehiculos = [...mapa.values()]

// ── Preview ────────────────────────────────────────────────────────────────────

console.log(`\n📋 ${vehiculos.length} vehículos a importar:\n`)
for (const v of vehiculos) {
  console.log(
    `  ${v.patente.padEnd(10)} ${(v.tipo ?? '').padEnd(14)} ${(v.marca ?? '').padEnd(16)} ${v.modelo ?? ''} (${v.anio ?? '?'})`
  )
}

// ── Subir a Supabase ───────────────────────────────────────────────────────────

console.log('\n⏳ Subiendo a Supabase...\n')

const { data, error } = await supabase
  .from('vehiculos')
  .upsert(vehiculos, { onConflict: 'patente' })

if (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}

console.log(`✅ ${vehiculos.length} vehículos importados correctamente.`)
