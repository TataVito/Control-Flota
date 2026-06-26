import { readFileSync } from 'fs'
import { read, utils } from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('.env', 'utf8')
const getEnv = key => env.match(new RegExp(`^${key}=(.+)`, 'm'))?.[1]?.trim()
const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'))

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// Convierte "APELLIDO1  APELLIDO2, NOMBRE1 NOMBRE2" → "Nombre1 Nombre2 Apellido1 Apellido2"
function parsearNombre(raw) {
  const [apellidosPart, nombresPart] = raw.split(',')
  if (!nombresPart) return toTitleCase(raw.trim())
  const apellidos = apellidosPart.trim().replace(/\s+/g, ' ')
  const nombres   = nombresPart.trim().replace(/\s+/g, ' ')
  return toTitleCase(`${nombres} ${apellidos}`)
}

const wb = read(readFileSync('F:\\control\\Personal BC.xlsx'))
const ws = wb.Sheets[wb.SheetNames[0]]
const filas = utils.sheet_to_json(ws, { header: 1, defval: '' })

const choferes = filas
  .slice(1)
  .map(f => String(f[0] ?? '').trim())
  .filter(Boolean)
  .map(raw => ({ nombre: parsearNombre(raw), activo: true }))

console.log(`\n📋 ${choferes.length} choferes a importar:\n`)
choferes.forEach(c => console.log(`  • ${c.nombre}`))

console.log('\n⏳ Subiendo a Supabase...\n')

const { error } = await supabase.from('choferes').insert(choferes)

if (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}

console.log(`✅ ${choferes.length} choferes importados correctamente.`)
