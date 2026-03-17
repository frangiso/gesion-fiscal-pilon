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

export function getCat(m) {
  for (const c of ORDEN) { if (m <= CATS[c].lim) return c }
  return 'EXCEDE'
}
export function getPct(m, c) {
  const cat = CATS[c]; if (!cat) return 0
  return Math.min(Math.round((m / cat.lim) * 100), 100)
}
export function getRest(m, c) {
  const cat = CATS[c]; if (!cat) return 0
  return Math.max(cat.lim - m, 0)
}
export function getProy(m, mes) { return mes ? Math.round((m / mes) * 12) : 0 }
export function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}
export function fmtF(iso) { if (!iso) return '-'; return iso.slice(0, 10) }
export function progColor(pct) { return pct >= 90 ? '#C0291A' : pct >= 70 ? '#C45A0A' : '#0A6E3E' }

export const STORE = {
  calEvents: [
    { id: 'ce1', dia: 20, mes: 0, tipo: 'mt', lbl: 'Vencimiento Monotributo', col: '#1B4FD8', recurrente: true, desc: 'Pago cuota mensual de monotributo' },
    { id: 'ce2', dia: 15, mes: 0, tipo: 'ib', lbl: 'Vencimiento IIBB', col: '#0A6E3E', recurrente: true, desc: 'Declaracion jurada Ingresos Brutos' },
    { id: 'ce3', dia: 20, mes: 1, tipo: 'rc', lbl: 'Recategorizacion', col: '#C45A0A', recurrente: false, desc: 'Periodo de recategorizacion enero' },
    { id: 'ce4', dia: 20, mes: 7, tipo: 'rc', lbl: 'Recategorizacion', col: '#C45A0A', recurrente: false, desc: 'Periodo de recategorizacion julio' },
  ],
  users: [
    { id: 'admin1', email: 'franco@armandpilon.com.ar', password: 'Admin2026!', role: 'admin', nombre: 'Franco', apellido: 'Armand Pilon' },
    { id: 'c1', email: 'maria@email.com', password: '1234', role: 'client', nombre: 'Maria', apellido: 'Gonzalez', tel: '11-4523-8891', fiscal: { cuit: '27-30456789-3', cat: 'C', act: 'Diseno Grafico', inicio: '2021-03-01', dom: 'Av. Corrientes 1234, CABA', iibb: true, nroiibb: '901-123456-7' } },
    { id: 'c2', email: 'roberto@email.com', password: '1234', role: 'client', nombre: 'Roberto', apellido: 'Fernandez', tel: '11-5678-4432', fiscal: { cuit: '20-28765432-1', cat: 'E', act: 'Desarrollo de Software', inicio: '2019-07-15', dom: 'Av. Santa Fe 800, CABA', iibb: true, nroiibb: '901-654321-0' } },
    { id: 'c3', email: 'laura@email.com', password: '1234', role: 'client', nombre: 'Laura', apellido: 'Martinez', tel: '11-9021-5543', fiscal: { cuit: '27-25678901-5', cat: 'B', act: 'Fotografia', inicio: '2022-01-10', dom: 'Palermo, CABA', iibb: false, nroiibb: '' } },
    { id: 'c4', email: 'carlos@email.com', password: '1234', role: 'client', nombre: 'Carlos', apellido: 'Sanchez', tel: '11-3344-7788', fiscal: { cuit: '20-22334455-6', cat: 'D', act: 'Consultoria', inicio: '2020-05-20', dom: 'Belgrano, CABA', iibb: true, nroiibb: '901-778899-1' } },
  ],
  inv: {
    c1: [{ id: 'i1', per: `${ANIO}-01`, monto: 1450000 }, { id: 'i2', per: `${ANIO}-02`, monto: 1680000 }, { id: 'i3', per: `${ANIO}-03`, monto: 1520000 }],
    c2: [{ id: 'i4', per: `${ANIO}-01`, monto: 2900000 }, { id: 'i5', per: `${ANIO}-02`, monto: 3100000 }, { id: 'i6', per: `${ANIO}-03`, monto: 2750000 }],
    c3: [{ id: 'i7', per: `${ANIO}-01`, monto: 780000  }, { id: 'i8', per: `${ANIO}-02`, monto: 920000  }],
    c4: [{ id: 'i9', per: `${ANIO}-01`, monto: 1900000 }, { id: 'i10', per: `${ANIO}-02`, monto: 2100000 }, { id: 'i11', per: `${ANIO}-03`, monto: 1850000 }],
  },
  pay: {
    c1: [
      { id: 'p1', tipo: 'monotributo', per: `${ANIO}-01`, monto: 56502, estado: 'pagado',   venc: `${ANIO}-01-20`, fpago: `${ANIO}-01-18` },
      { id: 'p2', tipo: 'monotributo', per: `${ANIO}-02`, monto: 56502, estado: 'pagado',   venc: `${ANIO}-02-20`, fpago: `${ANIO}-02-15` },
      { id: 'p3', tipo: 'monotributo', per: `${ANIO}-03`, monto: 56502, estado: 'pendiente',venc: `${ANIO}-03-20`, fpago: '' },
      { id: 'p4', tipo: 'iibb', per: `${ANIO}-01`, monto: 29000, estado: 'pagado',   venc: `${ANIO}-01-15`, fpago: `${ANIO}-01-14` },
      { id: 'p5', tipo: 'iibb', per: `${ANIO}-02`, monto: 33600, estado: 'pagado',   venc: `${ANIO}-02-15`, fpago: `${ANIO}-02-13` },
      { id: 'p6', tipo: 'iibb', per: `${ANIO}-03`, monto: 30400, estado: 'pendiente', venc: `${ANIO}-03-15`, fpago: '' },
    ],
    c2: [
      { id: 'p7',  tipo: 'monotributo', per: `${ANIO}-01`, monto: 89218, estado: 'pagado',  venc: `${ANIO}-01-20`, fpago: `${ANIO}-01-17` },
      { id: 'p8',  tipo: 'monotributo', per: `${ANIO}-02`, monto: 89218, estado: 'pagado',  venc: `${ANIO}-02-20`, fpago: `${ANIO}-02-19` },
      { id: 'p9',  tipo: 'monotributo', per: `${ANIO}-03`, monto: 89218, estado: 'vencido', venc: `${ANIO}-03-20`, fpago: '' },
      { id: 'p10', tipo: 'iibb', per: `${ANIO}-01`, monto: 58000, estado: 'pagado',  venc: `${ANIO}-01-15`, fpago: `${ANIO}-01-13` },
      { id: 'p11', tipo: 'iibb', per: `${ANIO}-02`, monto: 62000, estado: 'vencido', venc: `${ANIO}-02-15`, fpago: '' },
    ],
    c3: [
      { id: 'p12', tipo: 'monotributo', per: `${ANIO}-01`, monto: 48251, estado: 'pagado',   venc: `${ANIO}-01-20`, fpago: `${ANIO}-01-10` },
      { id: 'p13', tipo: 'monotributo', per: `${ANIO}-02`, monto: 48251, estado: 'pagado',   venc: `${ANIO}-02-20`, fpago: `${ANIO}-02-18` },
      { id: 'p14', tipo: 'monotributo', per: `${ANIO}-03`, monto: 48251, estado: 'pendiente',venc: `${ANIO}-03-20`, fpago: '' },
    ],
    c4: [
      { id: 'p15', tipo: 'monotributo', per: `${ANIO}-01`, monto: 69840, estado: 'pagado',  venc: `${ANIO}-01-20`, fpago: `${ANIO}-01-20` },
      { id: 'p16', tipo: 'monotributo', per: `${ANIO}-02`, monto: 69840, estado: 'pagado',  venc: `${ANIO}-02-20`, fpago: `${ANIO}-02-17` },
      { id: 'p17', tipo: 'monotributo', per: `${ANIO}-03`, monto: 69840, estado: 'vencido', venc: `${ANIO}-03-20`, fpago: '' },
      { id: 'p18', tipo: 'iibb', per: `${ANIO}-01`, monto: 38000, estado: 'pagado',  venc: `${ANIO}-01-15`, fpago: `${ANIO}-01-12` },
      { id: 'p19', tipo: 'iibb', per: `${ANIO}-02`, monto: 42000, estado: 'vencido', venc: `${ANIO}-02-15`, fpago: '' },
    ],
  },
  iibb: {
    c1: [
      { id: 'dj1', per: `${ANIO}-01`, base: 1450000, alic: 3.5, monto: 50750, estado: 'presentada', fecha: `${ANIO}-01-14` },
      { id: 'dj2', per: `${ANIO}-02`, base: 1680000, alic: 3.5, monto: 58800, estado: 'presentada', fecha: `${ANIO}-02-12` },
      { id: 'dj3', per: `${ANIO}-03`, base: 1520000, alic: 3.5, monto: 53200, estado: 'pendiente',  fecha: '' },
    ],
    c2: [
      { id: 'dj4', per: `${ANIO}-01`, base: 2900000, alic: 3.0, monto: 87000, estado: 'presentada', fecha: `${ANIO}-01-13` },
      { id: 'dj5', per: `${ANIO}-02`, base: 3100000, alic: 3.0, monto: 93000, estado: 'presentada', fecha: `${ANIO}-02-11` },
      { id: 'dj6', per: `${ANIO}-03`, base: 2750000, alic: 3.0, monto: 82500, estado: 'vencida',    fecha: '' },
    ],
    c4: [
      { id: 'dj7', per: `${ANIO}-01`, base: 1900000, alic: 3.5, monto: 66500, estado: 'presentada', fecha: `${ANIO}-01-12` },
      { id: 'dj8', per: `${ANIO}-02`, base: 2100000, alic: 3.5, monto: 73500, estado: 'pendiente',  fecha: '' },
    ],
  },
  msgs: {
    c1: [
      { id: 'm1', from: 'admin',  txt: 'Hola Maria, recorda que el vencimiento del monotributo de marzo es el dia 20. Necesitas el VEP?', fecha: `${ANIO}-03-10T10:30:00`, leido: true },
      { id: 'm2', from: 'client', txt: 'Hola Franco! Si por favor, mandame el VEP cuando puedas. Gracias!', fecha: `${ANIO}-03-10T11:15:00`, leido: true },
    ],
    c2: [{ id: 'm4', from: 'admin', txt: 'Roberto, tenes el pago de monotributo de marzo vencido. Por favor regulariza lo antes posible.', fecha: `${ANIO}-03-12T09:00:00`, leido: false }],
    c3: [],
    c4: [
      { id: 'm5', from: 'admin',  txt: 'Carlos, revise tu DJ de IIBB de febrero. Hay una diferencia en la base imponible. Podemos hablar esta semana?', fecha: `${ANIO}-03-08T14:00:00`, leido: true },
      { id: 'm6', from: 'client', txt: 'Claro Franco, el jueves a las 10 te va bien?', fecha: `${ANIO}-03-08T14:30:00`, leido: true },
    ],
  },
}
