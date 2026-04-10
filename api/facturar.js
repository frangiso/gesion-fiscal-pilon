// api/facturar.js
// Endpoint de Vercel para emitir facturas electrónicas via ARCA (AFIP)
// WSAA + WSFE - Producción
// Usa node-forge en lugar de openssl (compatible con Vercel)

import fs from 'fs'
import path from 'path'
import { parseStringPromise } from 'xml2js'
import forge from 'node-forge'

const CUIT = '20364163739'

// URLs de PRODUCCIÓN
const WSAA_URL = 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
const WSFE_URL = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'

// Rutas a los certificados
const CERT_PATH = path.join(process.cwd(), 'certs', 'certificado.crt')
const KEY_PATH  = path.join(process.cwd(), 'certs', 'clave_privada.key')

// Cache del token en memoria (dura 12hs)
let cachedToken  = null
let cachedSign   = null
let tokenExpiry  = null

// ─── Firmar TRA con node-forge ────────────────────────────────────────────────

function firmarTRA(tra, certPem, keyPem) {
  const cert    = forge.pki.certificateFromPem(certPem)
  const privKey = forge.pki.privateKeyFromPem(keyPem)

  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer(tra, 'utf8')
  p7.addCertificate(cert)
  p7.addSigner({
    key: privKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType,   value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime,   value: new Date() },
    ],
  })
  p7.sign()

  // DER en base64
  const der    = forge.asn1.toDer(p7.toAsn1()).getBytes()
  const base64 = forge.util.encode64(der)
  return base64
}

// ─── WSAA: Obtener Token de Acceso ───────────────────────────────────────────

async function getToken() {
  const now = new Date()
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return { token: cachedToken, sign: cachedSign }
  }

  const certPem = fs.readFileSync(CERT_PATH, 'utf8')
  const keyPem  = fs.readFileSync(KEY_PATH,  'utf8')

  const genTime  = new Date(now.getTime() - 60000).toISOString()
  const expTime  = new Date(now.getTime() + 43200000).toISOString()
  const uniqueId = Math.floor(now.getTime() / 1000)

  const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`

  const cmsBase64 = firmarTRA(tra, certPem, keyPem)

  const soapLogin = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`

  const response = await fetch(WSAA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: '' },
    body: soapLogin,
  })

  const xmlResponse = await response.text()
  const parsed = await parseStringPromise(xmlResponse)

  const loginReturn =
    parsed['soapenv:Envelope']['soapenv:Body'][0]['loginCmsResponse'][0]['loginCmsReturn'][0]

  const ta          = await parseStringPromise(loginReturn)
  const credentials = ta['loginTicketResponse']['credentials'][0]

  cachedToken  = credentials['token'][0]
  cachedSign   = credentials['sign'][0]
  tokenExpiry  = new Date(now.getTime() + 11 * 60 * 60 * 1000)

  return { token: cachedToken, sign: cachedSign }
}

// ─── WSFE: Consultar último comprobante ──────────────────────────────────────

async function getUltimoComprobante(token, sign, puntoVenta, tipoComprobante) {
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${token}</ar:Token>
        <ar:Sign>${sign}</ar:Sign>
        <ar:Cuit>${CUIT}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${puntoVenta}</ar:PtoVta>
      <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`

  const response = await fetch(WSFE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      SOAPAction: 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
    },
    body: soap,
  })

  const xml    = await response.text()
  const parsed = await parseStringPromise(xml)
  const result =
    parsed['soap:Envelope']['soap:Body'][0]['FECompUltimoAutorizadoResponse'][0][
      'FECompUltimoAutorizadoResult'
    ][0]

  return parseInt(result['CbteNro'][0])
}

// ─── WSFE: Autorizar comprobante ─────────────────────────────────────────────

async function autorizarComprobante(token, sign, factura) {
  const {
    puntoVenta, tipoComprobante, tipoDocumento, nroDocumento,
    importeTotal, importeNeto, importeIVA, alicuotaIVA,
    concepto, nroComprobante, fechaComprobante, moneda, tipoCambio,
  } = factura

  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${token}</ar:Token>
        <ar:Sign>${sign}</ar:Sign>
        <ar:Cuit>${CUIT}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${puntoVenta}</ar:PtoVta>
          <ar:CbteTipo>${tipoComprobante}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>${concepto}</ar:Concepto>
            <ar:DocTipo>${tipoDocumento}</ar:DocTipo>
            <ar:DocNro>${nroDocumento}</ar:DocNro>
            <ar:CbteDesde>${nroComprobante}</ar:CbteDesde>
            <ar:CbteHasta>${nroComprobante}</ar:CbteHasta>
            <ar:CbteFch>${fechaComprobante}</ar:CbteFch>
            <ar:ImpTotal>${importeTotal}</ar:ImpTotal>
            <ar:ImpTotConc>0</ar:ImpTotConc>
            <ar:ImpNeto>${importeNeto}</ar:ImpNeto>
            <ar:ImpOpEx>0</ar:ImpOpEx>
            <ar:ImpIVA>${importeIVA}</ar:ImpIVA>
            <ar:ImpTrib>0</ar:ImpTrib>
            <ar:MonId>${moneda || 'PES'}</ar:MonId>
            <ar:MonCotiz>${tipoCambio || 1}</ar:MonCotiz>
            <ar:Iva>
              <ar:AlicIva>
                <ar:Id>${alicuotaIVA}</ar:Id>
                <ar:BaseImp>${importeNeto}</ar:BaseImp>
                <ar:Importe>${importeIVA}</ar:Importe>
              </ar:AlicIva>
            </ar:Iva>
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`

  const response = await fetch(WSFE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      SOAPAction: 'http://ar.gov.afip.dif.FEV1/FECAESolicitar',
    },
    body: soap,
  })

  const xml    = await response.text()
  const parsed = await parseStringPromise(xml)
  const result =
    parsed['soap:Envelope']['soap:Body'][0]['FECAESolicitarResponse'][0]['FECAESolicitarResult'][0]
  const detalle = result['FeDetResp'][0]['FECAEDetResponse'][0]

  let errores = []
  if (result['Errors']) {
    const errs = result['Errors'][0]['Err']
    if (errs) errores = errs.map(e => ({ codigo: e['Code'][0], mensaje: e['Msg'][0] }))
  }
  if (detalle['Observaciones']) {
    const obs = detalle['Observaciones'][0]['Obs']
    if (obs) obs.forEach(o => errores.push({ codigo: o['Code'][0], mensaje: o['Msg'][0] }))
  }

  return {
    resultado:      detalle['Resultado'][0],
    cae:            detalle['CAE']?.[0]       || null,
    caeFchVto:      detalle['CAEFchVto']?.[0] || null,
    nroComprobante,
    errores,
  }
}

// ─── Handler principal ───────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo no permitido' })

  try {
    const body = req.body

    // Soporte para llamada directa desde el frontend:
    // { cuitReceptor, nombreReceptor, concepto, importeTotal, descripcion }
    if (body.cuitReceptor && body.importeTotal) {
      const { token, sign } = await getToken()

      const puntoVenta      = 2
      const tipoComprobante = 11  // Factura C
      const tipoDocumento   = 80  // CUIT
      const nroDocumento    = body.cuitReceptor.replace(/\D/g, '')
      const importeTotal    = parseFloat(body.importeTotal)
      const importeNeto     = importeTotal  // Monotributo: no tiene IVA
      const importeIVA      = 0
      const alicuotaIVA     = 3   // 0% para monotributistas
      const concepto        = parseInt(body.concepto) || 2
      const fechaHoy        = new Date()
      const fechaComprobante = fechaHoy.toISOString().slice(0, 10).replace(/-/g, '')

      const ultimo = await getUltimoComprobante(token, sign, puntoVenta, tipoComprobante)
      const nroComprobante = ultimo + 1

      const resultado = await autorizarComprobante(token, sign, {
        puntoVenta, tipoComprobante, tipoDocumento, nroDocumento,
        importeTotal, importeNeto, importeIVA, alicuotaIVA,
        concepto, nroComprobante, fechaComprobante,
        moneda: 'PES', tipoCambio: 1,
      })

      if (resultado.errores?.length > 0) {
        return res.status(200).json({
          error: resultado.errores.map(e => `${e.codigo}: ${e.mensaje}`).join(' | ')
        })
      }

      return res.status(200).json({
        CAE:            resultado.cae,
        CAEFchVto:      resultado.caeFchVto,
        nroComprobante: resultado.nroComprobante,
        resultado:      resultado.resultado,
      })
    }

    // Soporte para llamada con formato { accion, factura }
    if (body.accion && body.factura) {
      const { token, sign } = await getToken()
      if (body.accion === 'proximoNumero') {
        const ultimo = await getUltimoComprobante(token, sign, body.factura.puntoVenta, body.factura.tipoComprobante)
        return res.status(200).json({ proximoNumero: ultimo + 1 })
      }
      if (body.accion === 'emitir') {
        const ultimo = await getUltimoComprobante(token, sign, body.factura.puntoVenta, body.factura.tipoComprobante)
        body.factura.nroComprobante = ultimo + 1
        const resultado = await autorizarComprobante(token, sign, body.factura)
        return res.status(200).json(resultado)
      }
    }

    return res.status(400).json({ error: 'Parametros invalidos' })

  } catch (error) {
    console.error('Error en API facturar:', error)
    return res.status(500).json({ error: error.message })
  }
}
