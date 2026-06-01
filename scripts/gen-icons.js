// Genera los íconos PNG para PWA a partir de los SVG existentes
// Uso: node scripts/gen-icons.js
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, '..', 'public')
const iconSvg = fs.readFileSync(path.join(publicDir, 'icon.svg'))
const maskableSvg = fs.readFileSync(path.join(publicDir, 'icon-maskable.svg'))

async function generate() {
  // icon-192.png — requerido por Chrome Android para el install prompt
  await sharp(iconSvg).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'))
  console.log('✓ icon-192.png')

  // icon-512.png — splash screen y alta resolución
  await sharp(iconSvg).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'))
  console.log('✓ icon-512.png')

  // apple-touch-icon.png — iOS "Agregar a inicio"
  await sharp(iconSvg).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png')

  // icon-maskable-512.png — Android adaptive icons (fondo lleno, sin esquinas redondeadas)
  await sharp(maskableSvg).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'))
  console.log('✓ icon-maskable-512.png')

  console.log('\nTodos los íconos generados correctamente.')
}

generate().catch(console.error)
