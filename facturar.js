// api/facturar.js
// Endpoint de Vercel para emitir facturas electrónicas via ARCA (AFIP)
// WSAA + WSFE - Producción

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { parseStringPromise, Builder } from "xml2js";

const CUIT = "20364163739";

// URLs de PRODUCCIÓN
const WSAA_URL = "https://wsaa.afip.gov.ar/ws/services/LoginCms";
const WSFE_URL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx";

// Rutas a los certificados (relativos a la raíz del proyecto en Vercel)
const CERT_PATH = path.join(process.cwd(), "certs", "certificado.crt");
const KEY_PATH = path.join(process.cwd(), "certs", "clave_privada.key");

// Cache del token en memoria (dura 12hs, se regenera si vence)
let cachedToken = null;
let cachedSign = null;
let tokenExpiry = null;

// ─── WSAA: Obtener Token de Acceso ───────────────────────────────────────────

async function getToken() {
  const now = new Date();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return { token: cachedToken, sign: cachedSign };
  }

  const cert = fs.readFileSync(CERT_PATH, "utf8");
  const key = fs.readFileSync(KEY_PATH, "utf8");

  // Generar TRA (Ticket de Requerimiento de Acceso)
  const genTime = new Date(now.getTime() - 60000).toISOString();
  const expTime = new Date(now.getTime() + 43200000).toISOString(); // +12hs
  const uniqueId = Math.floor(now.getTime() / 1000);

  const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;

  // Firmar el TRA con OpenSSL via proceso hijo
  const tmpTra = `/tmp/tra_${uniqueId}.xml`;
  const tmpCms = `/tmp/cms_${uniqueId}.p7`;
  const tmpCert = `/tmp/cert_${uniqueId}.crt`;
  const tmpKey = `/tmp/key_${uniqueId}.key`;

  fs.writeFileSync(tmpTra, tra);
  fs.writeFileSync(tmpCert, cert);
  fs.writeFileSync(tmpKey, key);

  execSync(
    `openssl smime -sign -in ${tmpTra} -out ${tmpCms} -signer ${tmpCert} -inkey ${tmpKey} -outform DER -nodetach`
  );

  const cmsBinary = fs.readFileSync(tmpCms);
  const cmsBase64 = cmsBinary.toString("base64");

  // Limpiar temporales
  [tmpTra, tmpCms, tmpCert, tmpKey].forEach((f) => {
    try { fs.unlinkSync(f); } catch {}
  });

  // Llamar al WSAA
  const soapLogin = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch(WSAA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      SOAPAction: "",
    },
    body: soapLogin,
  });

  const xmlResponse = await response.text();
  const parsed = await parseStringPromise(xmlResponse);

  const loginReturn =
    parsed["soapenv:Envelope"]["soapenv:Body"][0]["loginCmsResponse"][0][
      "loginCmsReturn"
    ][0];

  const ta = await parseStringPromise(loginReturn);
  const credentials = ta["loginTicketResponse"]["credentials"][0];

  cachedToken = credentials["token"][0];
  cachedSign = credentials["sign"][0];
  tokenExpiry = new Date(now.getTime() + 11 * 60 * 60 * 1000); // 11hs

  return { token: cachedToken, sign: cachedSign };
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
</soapenv:Envelope>`;

  const response = await fetch(WSFE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      SOAPAction: "http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado",
    },
    body: soap,
  });

  const xml = await response.text();
  const parsed = await parseStringPromise(xml);
  const result =
    parsed["soap:Envelope"]["soap:Body"][0][
      "FECompUltimoAutorizadoResponse"
    ][0]["FECompUltimoAutorizadoResult"][0];

  return parseInt(result["CbteNro"][0]);
}

// ─── WSFE: Autorizar comprobante (CAE) ───────────────────────────────────────

async function autorizarComprobante(token, sign, factura) {
  const {
    puntoVenta,
    tipoComprobante,
    tipoDocumento,
    nroDocumento,
    importeTotal,
    importeNeto,
    importeIVA,
    alicuotaIVA,      // 5 = 21%, 4 = 10.5%, 3 = 0%
    concepto,         // 1 = Productos, 2 = Servicios, 3 = Ambos
    nroComprobante,
    fechaComprobante, // YYYYMMDD
    moneda,           // PES para pesos
    tipoCambio,
  } = factura;

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
            <ar:MonId>${moneda || "PES"}</ar:MonId>
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
</soapenv:Envelope>`;

  const response = await fetch(WSFE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      SOAPAction: "http://ar.gov.afip.dif.FEV1/FECAESolicitar",
    },
    body: soap,
  });

  const xml = await response.text();
  const parsed = await parseStringPromise(xml);

  const result =
    parsed["soap:Envelope"]["soap:Body"][0]["FECAESolicitarResponse"][0][
      "FECAESolicitarResult"
    ][0];

  const detalle =
    result["FeDetResp"][0]["FECAEDetResponse"][0];

  const resultado = detalle["Resultado"][0];
  const cae = detalle["CAE"] ? detalle["CAE"][0] : null;
  const caeFchVto = detalle["CAEFchVto"] ? detalle["CAEFchVto"][0] : null;

  // Capturar errores si los hay
  let errores = [];
  if (result["Errors"]) {
    const errs = result["Errors"][0]["Err"];
    if (errs) {
      errores = errs.map((e) => ({
        codigo: e["Code"][0],
        mensaje: e["Msg"][0],
      }));
    }
  }

  if (detalle["Observaciones"]) {
    const obs = detalle["Observaciones"][0]["Obs"];
    if (obs) {
      obs.forEach((o) => {
        errores.push({ codigo: o["Code"][0], mensaje: o["Msg"][0] });
      });
    }
  }

  return {
    resultado,
    cae,
    caeFchVto,
    nroComprobante,
    errores,
  };
}

// ─── Handler principal ───────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    const { accion, factura } = req.body;

    const { token, sign } = await getToken();

    // Acción: solo obtener próximo número
    if (accion === "proximoNumero") {
      const { puntoVenta, tipoComprobante } = factura;
      const ultimo = await getUltimoComprobante(token, sign, puntoVenta, tipoComprobante);
      return res.status(200).json({ proximoNumero: ultimo + 1 });
    }

    // Acción: emitir factura completa
    if (accion === "emitir") {
      // Obtener próximo número automáticamente
      const ultimo = await getUltimoComprobante(
        token,
        sign,
        factura.puntoVenta,
        factura.tipoComprobante
      );
      factura.nroComprobante = ultimo + 1;

      const resultado = await autorizarComprobante(token, sign, factura);
      return res.status(200).json(resultado);
    }

    return res.status(400).json({ error: "Acción no reconocida. Usar: emitir | proximoNumero" });

  } catch (error) {
    console.error("Error en API facturar:", error);
    return res.status(500).json({ error: error.message });
  }
}
