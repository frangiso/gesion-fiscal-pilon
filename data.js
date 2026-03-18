export const ANIO = new Date().getFullYear()

export const CATS = {
  A: { lim: 10277988,  cuota: 42387  },
  B: { lim: 15063928,  cuota: 48251  },
  C: { lim: 21236256,  cuota: 56502  },
  D: { lim: 26545320,  cuota: 69840  },
  E: { lim: 31854384,  cuota: 89218  },
  F: { lim: 39817980,  cuota: 112768 },
  G: { lim: 47781576,  cuota: 143614 },
  H: { lim: 63708768,  cuota: 235437 },
  I: { lim: 74993520,  cuota: 326783 },
  J: { lim: 90920712,  cuota: 493430 },
  K: { lim: 108357084, cuota: 1381762 },
}
export const ORDEN = ['A','B','C','D','E','F','G','H','I','J','K']
export const MN = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export const MF = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function getCat(m) { for (const c of ORDEN) { if (m <= CATS[c].lim) return c }; return 'EXCEDE' }
export function getPct(m, c) { const cat = CATS[c]; if (!cat) return 0; return Math.min(Math.round((m / cat.lim) * 100), 100) }
export function getRest(m, c) { const cat = CATS[c]; if (!cat) return 0; return Math.max(cat.lim - m, 0) }
export function getProy(m, mes) { return mes ? Math.round((m / mes) * 12) : 0 }
export function fmt(n) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) }
export function fmtF(iso) { if (!iso) return '-'; return typeof iso === 'string' ? iso.slice(0, 10) : iso.toDate ? iso.toDate().toISOString().slice(0, 10) : '-' }
export function progColor(pct) { return pct >= 90 ? '#C0291A' : pct >= 70 ? '#C45A0A' : '#0A6E3E' }
