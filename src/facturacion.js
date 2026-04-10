// src/facturacion.js
// Funciones para llamar a la API de facturación desde tu app React

const API_URL = "/api/facturar";

// ─── Obtener próximo número de comprobante ────────────────────────────────────
export async function getProximoNumero(puntoVenta, tipoComprobante) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion: "proximoNumero",
      factura: { puntoVenta, tipoComprobante },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.proximoNumero;
}

// ─── Emitir factura y obtener CAE ─────────────────────────────────────────────
export async function emitirFactura(datosFactura) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion: "emitir",
      factura: datosFactura,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// ─── EJEMPLO DE USO ───────────────────────────────────────────────────────────
//
// import { emitirFactura } from "./facturacion";
//
// const resultado = await emitirFactura({
//   puntoVenta: 1,
//   tipoComprobante: 11,      // 11 = Factura C, 1 = Factura A, 6 = Factura B
//   concepto: 2,              // 1 = Productos, 2 = Servicios, 3 = Ambos
//   tipoDocumento: 80,        // 80 = CUIT, 96 = DNI, 99 = Consumidor Final
//   nroDocumento: "20123456789",
//   fechaComprobante: "20260410",  // YYYYMMDD
//   importeTotal: 12100,
//   importeNeto: 10000,
//   importeIVA: 2100,
//   alicuotaIVA: 5,           // 5 = 21%, 4 = 10.5%, 3 = 0%
//   moneda: "PES",
//   tipoCambio: 1,
// });
//
// console.log(resultado.cae);          // "12345678901234"
// console.log(resultado.caeFchVto);    // "20260420"
// console.log(resultado.nroComprobante); // 42
