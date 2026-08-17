// O ambiente jsdom não expõe TextEncoder/TextDecoder, que o driver `pg`
// (carregado indiretamente por lib/prisma.ts) exige em tempo de import.
// Roda em `setupFiles`, antes de qualquer módulo de teste ser carregado.
const { TextEncoder, TextDecoder } = require('node:util')

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}
