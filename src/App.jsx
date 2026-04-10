import { useState, useRef, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ANIO, CATS, ORDEN, MN, MF, getCat, getPct, getRest, getProy, fmt, fmtF, progColor } from './data'
import { loginUser, logoutUser, createAuthUser, createClient, getAllClients, updateClient, deleteClient, getInvoices, getAllInvoices, upsertInvoice, deleteInvoice, getPayments, getAllPayments, createPayment, updatePayment, deletePayment, getIIBB, getAllIIBB, createIIBB, updateIIBBDoc, listenMessages, sendMessage, getCalEvents, createCalEvent, updateCalEvent, deleteCalEvent, initAdmin } from './db'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'

// ── AI ASSISTANT ──────────────────────────────────────────────
const AI_R = {
  cat: `Las categorias del Monotributo van de la A a la K. Desde febrero 2026:\n- Cat. A: hasta ${fmt(10277988)}/anio\n- Cat. B: hasta ${fmt(15063928)}/anio\n- Cat. C: hasta ${fmt(21236256)}/anio\n- Cat. D: hasta ${fmt(26545320)}/anio\n- Cat. E: hasta ${fmt(31854384)}/anio\n- Cat. F hasta K: hasta ${fmt(108357084)}/anio`,
  venc: 'El Monotributo vence el dia 20 de cada mes.\nIngresos Brutos generalmente el dia 15.',
  recat: 'La recategorizacion es obligatoria dos veces por anio: enero y julio, del 1 al 20.',
  pago: 'Podes pagar en monotributo.arca.gob.ar o generando un VEP desde ARCA.',
  iibb: 'Ingresos Brutos es un impuesto provincial. En CABA se gestiona en AGIP.',
  def: 'Soy el asistente fiscal del estudio del Contador Franco Armand Pilon. Puedo ayudarte con categorias, vencimientos, recategorizacion, IIBB y pagos.',
}
function getAIResp(m) {
  const ml = m.toLowerCase()
  if (ml.includes('categor') || ml.includes('limit')) return AI_R.cat
  if (ml.includes('vencim') || ml.includes('cuando') || ml.includes('fecha')) return AI_R.venc
  if (ml.includes('recat') || ml.includes('cambio')) return AI_R.recat
  if (ml.includes('pagar') || ml.includes('vep') || ml.includes('pago')) return AI_R.pago
  if (ml.includes('iibb') || ml.includes('ingresos')) return AI_R.iibb
  return AI_R.def
}
function AIAsist() {
  const [msgs, setMsgs] = useState([{ r: 'bot', t: 'Hola! Soy el asistente fiscal del estudio. En que puedo ayudarte?' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  const send = (txt) => {
    if (!txt.trim()) return
    setMsgs(m => [...m, { r: 'user', t: txt }])
    setInput(''); setLoading(true)
    setTimeout(() => { setMsgs(m => [...m, { r: 'bot', t: getAIResp(txt) }]); setLoading(false) }, 600)
  }
  const qq = ['Cuando vence el pago?', 'Como me recategorizo?', 'Como pago el VEP?', 'Que son los IIBB?']
  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-hd"><span className="card-title">Asistente Fiscal IA</span><span className="badge badge-blue">Beta</span></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="ai-msgs" style={{ flex: 1 }}>
          {msgs.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: m.r === 'user' ? 'flex-end' : 'flex-start' }}><div className={m.r === 'bot' ? 'ai-bub-bot' : 'ai-bub-user'}>{m.t}</div></div>)}
          {loading && <div style={{ display: 'flex' }}><div className="ai-bub-bot" style={{ color: '#4A5568' }}>Escribiendo...</div></div>}
          <div ref={endRef} />
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid #DDE1EC', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {qq.map(q => <button key={q} className="btn btn-outline btn-sm" style={{ fontSize: 11 }} onClick={() => send(q)}>{q}</button>)}
        </div>
        <div className="chat-inp-row">
          <input className="chat-inp" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="Escribi tu consulta..." />
          <button className="btn btn-primary btn-sm" onClick={() => send(input)}>Enviar</button>
        </div>
      </div>
    </div>
  )
}

// ── NAV ───────────────────────────────────────────────────────
const ADMIN_NAV = [
  { sec: 'PANEL', items: [{ lbl: 'Dashboard', id: 'adash' }, { lbl: 'Clientes', id: 'aclients' }, { lbl: 'Facturacion', id: 'abillin' }, { lbl: 'IIBB / DJ', id: 'aiibb' }] },
  { sec: 'GESTION', items: [{ lbl: 'Pagos', id: 'apay' }, { lbl: 'Calendario Fiscal', id: 'acal' }, { lbl: 'Mensajes', id: 'amsgs' }] },
]
const CLIENT_NAV = [
  { sec: 'MI CUENTA', items: [{ lbl: 'Dashboard', id: 'cdash' }, { lbl: 'Facturacion', id: 'cbill' }, { lbl: 'Emitir Factura', id: 'cfacturar' }, { lbl: 'Importar Facturas', id: 'cimport' }, { lbl: 'IIBB / DJ', id: 'ciibb' }, { lbl: 'Pagos', id: 'cpay' }] },
  { sec: 'HERRAMIENTAS', items: [{ lbl: 'Calendario Fiscal', id: 'cal' }, { lbl: 'Alertas', id: 'calerts' }, { lbl: 'Mensajes', id: 'cmsgs' }] },
]

// ── SIDEBAR ───────────────────────────────────────────────────
function Sidebar({ user, page, setPage, onLogout }) {
  const nav = user.role === 'admin' ? ADMIN_NAV : CLIENT_NAV
  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sb-mark">F</div>
          <div><div className="sb-name">Gestion Fiscal</div><div className="sb-sub">Cdr. Franco Armand Pilon</div></div>
        </div>
      </div>
      {nav.map(g => (
        <div key={g.sec}>
          <div className="sb-sec">{g.sec}</div>
          {g.items.map(item => <div key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>{item.lbl}</div>)}
        </div>
      ))}
      <div className="sb-foot">
        <div className="user-pill">
          <div className="user-av" style={{ background: user.role === 'admin' ? '#B8860B' : '#1B4FD8' }}>{user.nombre?.[0]}{user.apellido?.[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div className="user-nm">{user.nombre} {user.apellido}</div><div className="user-rl">{user.role === 'admin' ? 'Administrador' : 'Cliente'}</div></div>
          <button className="btn btn-ghost btn-icon" style={{ padding: 5 }} onClick={onLogout}>X</button>
        </div>
      </div>
    </aside>
  )
}

// ── LOGIN ─────────────────────────────────────────────────────
function Login({ setUser }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setErr('')
    try {
      const profile = await loginUser(form.email, form.password)
      if (!profile) { setErr('Usuario no encontrado'); setLoading(false); return }
      setUser(profile)
    } catch { setErr('Email o contrasena incorrectos'); setLoading(false) }
  }
  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div className="login-mark">F</div>
          <div className="login-title">Gestion Fiscal</div>
          <div style={{ fontSize: 12, color: '#4A5568', marginTop: 4 }}>Contador Franco Armand Pilon</div>
        </div>
        {err && <div className="login-err">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="tucorreo@email.com" /></div>
          <div className="form-group"><label className="form-label">Contrasena</label><input className="form-input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required placeholder="••••••••" /></div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: '#4A5568' }}>Sistema exclusivo para clientes del estudio</div>
      </div>
    </div>
  )
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────
function AdminDash({ setPage }) {
  const [clients, setClients] = useState([])
  const [allInv, setAllInv] = useState([])
  const [allPay, setAllPay] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([getAllClients(), getAllInvoices(), getAllPayments()]).then(([c, i, p]) => {
      setClients(c); setAllInv(i); setAllPay(p); setLoading(false)
    })
  }, [])
  const totalFact = allInv.reduce((s, i) => s + i.monto, 0)
  const pend = allPay.filter(p => p.estado === 'pendiente').length
  const venc = allPay.filter(p => p.estado === 'vencido').length
  const recat = clients.filter(c => { const t = allInv.filter(i => i.userId === c.id).reduce((s, i) => s + i.monto, 0); return t > 0 && getCat(t) !== c.fiscal?.cat })
  const chartData = MN.map((mes, i) => { const p = `${ANIO}-${String(i + 1).padStart(2, '0')}`; return { mes, monto: allInv.filter(f => f.per === p).reduce((s, f) => s + f.monto, 0) } })
  const recent = allPay.filter(p => p.estado !== 'pagado').slice(0, 6).map(p => ({ ...p, cnom: clients.find(c => c.id === p.userId)?.nombre + ' ' + clients.find(c => c.id === p.userId)?.apellido || '-' }))
  if (loading) return <div className="page"><div className="empty">Cargando...</div></div>
  return (
    <div className="page">
      <div className="mq4">
        <div className="metric"><div className="m-lbl">Clientes activos</div><div className="m-val">{clients.length}</div><div className="m-sub">monotributistas</div></div>
        <div className="metric"><div className="m-lbl">Facturacion {ANIO}</div><div className="m-val" style={{ fontSize: 17 }}>{fmt(totalFact)}</div><div className="m-sub">acumulado todos</div></div>
        <div className="metric"><div className="m-lbl">Pagos pendientes</div><div className="m-val" style={{ color: '#C45A0A' }}>{pend}</div><div className="m-sub">sin abonar</div></div>
        <div className="metric"><div className="m-lbl">Pagos vencidos</div><div className="m-val" style={{ color: '#C0291A' }}>{venc}</div><div className="m-sub">{recat.length} requieren recategorizacion</div></div>
      </div>
      <div className="g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-hd"><span className="card-title">Facturacion mensual {ANIO}</span></div>
          <div className="card-bd">
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1B4FD8" stopOpacity={0.15} /><stop offset="95%" stopColor="#1B4FD8" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} />
                <YAxis hide /><Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #DDE1EC', fontSize: 11 }} />
                <Area type="monotone" dataKey="monto" stroke="#1B4FD8" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">Clientes por categoria</span></div>
          <div className="card-bd">
            {ORDEN.map(cat => { const count = clients.filter(c => c.fiscal?.cat === cat).length; if (!count) return null; return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span className="badge badge-cat">{cat}</span>
                <div style={{ flex: 1, background: '#ECEEF4', borderRadius: 99, height: 7, overflow: 'hidden' }}><div style={{ width: `${Math.round((count / clients.length) * 100)}%`, height: '100%', background: '#1B4FD8', borderRadius: 99 }} /></div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#4A5568', minWidth: 18 }}>{count}</span>
              </div>
            )})}
          </div>
        </div>
      </div>
      {recat.length > 0 && <div className="card" style={{ marginBottom: 14 }}><div className="card-hd"><span className="card-title" style={{ color: '#C45A0A' }}>Alertas de recategorizacion</span></div><div className="card-bd" style={{ paddingTop: 10 }}>{recat.map(c => { const t = allInv.filter(i => i.userId === c.id).reduce((s, i) => s + i.monto, 0); return <div key={c.id} className="alert-box alert-warn"><strong>{c.nombre} {c.apellido}</strong> esta en cat. <strong>{c.fiscal?.cat}</strong> pero deberia estar en <strong>{getCat(t)}</strong> (facturo {fmt(t)})</div> })}</div></div>}
      <div className="card">
        <div className="card-hd"><span className="card-title">Pagos pendientes / vencidos</span><button className="btn btn-ghost btn-sm" onClick={() => setPage('apay')}>Ver todos</button></div>
        <div className="tbl-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Periodo</th><th>Monto</th><th>Estado</th></tr></thead>
          <tbody>{recent.length === 0 ? <tr><td colSpan={5}><div className="empty"><div className="empty-title">Todo al dia</div></div></td></tr> : recent.map((p, i) => <tr key={i}><td className="fw6">{p.cnom}</td><td><span className="badge badge-gray">{p.tipo === 'monotributo' ? 'Monotributo' : 'IIBB'}</span></td><td>{p.per}</td><td className="fw6">{fmt(p.monto)}</td><td><span className={`badge ${p.estado === 'vencido' ? 'badge-red' : 'badge-orange'}`}>{p.estado}</span></td></tr>)}</tbody>
        </table></div>
      </div>
    </div>
  )
}

// ── ADMIN CLIENTS ─────────────────────────────────────────────
function AdminClients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [sel, setSel] = useState(null)
  const EF = { nombre: '', apellido: '', email: '', password: '', tel: '', cuit: '', cat: 'A', act: '', inicio: '', dom: '', iibb: false, nroiibb: '' }
  const [form, setForm] = useState(EF)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const load = async () => { setLoading(true); setClients(await getAllClients()); setLoading(false) }
  useEffect(() => { load() }, [])
  const filtered = clients.filter(c => `${c.nombre} ${c.apellido} ${c.email} ${c.fiscal?.cuit || ''}`.toLowerCase().includes(search.toLowerCase()))
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const save = async () => {
    if (!form.nombre || !form.apellido || !form.email || !form.cuit) { setMsg('Completa nombre, apellido, email y CUIT'); return }
    if (modal === 'create' && !form.password) { setMsg('La contrasena es obligatoria'); return }
    setSaving(true)
    try {
      if (modal === 'create') {
        const uid = await createAuthUser(form.email, form.password)
        await createClient(uid, { nombre: form.nombre, apellido: form.apellido, email: form.email, tel: form.tel, fiscal: { cuit: form.cuit, cat: form.cat, act: form.act, inicio: form.inicio, dom: form.dom, iibb: form.iibb, nroiibb: form.nroiibb } })
      } else {
        await updateClient(sel.id, { nombre: form.nombre, apellido: form.apellido, tel: form.tel, fiscal: { cuit: form.cuit, cat: form.cat, act: form.act, inicio: form.inicio, dom: form.dom, iibb: form.iibb, nroiibb: form.nroiibb } })
      }
      await load(); setModal(null)
    } catch (e) { setMsg('Error: ' + (e.message || 'Intenta de nuevo')) }
    setSaving(false)
  }
  const del = async () => { setSaving(true); await deleteClient(sel.id); await load(); setModal(null); setSaving(false) }
  return (
    <div className="page">
      <div className="sec-hd"><div><div className="sec-title">Clientes</div><div style={{ fontSize: 12, color: '#4A5568' }}>{clients.length} monotributistas</div></div><button className="btn btn-primary" onClick={() => { setForm(EF); setModal('create'); setMsg('') }}>+ Nuevo cliente</button></div>
      <div className="card" style={{ marginBottom: 12 }}><div className="card-bd" style={{ paddingTop: 12, paddingBottom: 12 }}><input className="form-input" style={{ maxWidth: 320 }} placeholder="Buscar por nombre, email o CUIT..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
      <div className="card">
        {loading ? <div className="empty">Cargando...</div> :
        <div className="tbl-wrap"><table>
          <thead><tr><th>Cliente</th><th>CUIT</th><th>Categoria</th><th>Actividad</th><th></th></tr></thead>
          <tbody>{filtered.length === 0 ? <tr><td colSpan={5}><div className="empty"><div className="empty-title">Sin resultados</div></div></td></tr> :
            filtered.map(c => <tr key={c.id}>
              <td><div className="fw6">{c.nombre} {c.apellido}</div><div style={{ fontSize: 11, color: '#4A5568' }}>{c.email}</div></td>
              <td style={{ fontSize: 12, color: '#4A5568' }}>{c.fiscal?.cuit}</td>
              <td><span className="badge badge-cat">{c.fiscal?.cat}</span></td>
              <td style={{ fontSize: 12, color: '#4A5568' }}>{c.fiscal?.act || '-'}</td>
              <td><div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setSel(c); setForm({ ...EF, ...c, ...c.fiscal }); setModal('edit'); setMsg('') }}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => { setSel(c); setModal('delete') }}>Borrar</button>
              </div></td>
            </tr>)
          }</tbody>
        </table></div>}
      </div>
      {(modal === 'create' || modal === 'edit') && <div className="overlay" onClick={() => setModal(null)}><div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-hd"><h3 className="modal-title">{modal === 'create' ? 'Nuevo cliente' : 'Editar cliente'}</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(null)}>x</button></div>
        <div className="modal-bd">
          {msg && <div className="login-err" style={{ marginBottom: 12 }}>{msg}</div>}
          <div style={{ fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', color: '#4A5568', marginBottom: 10 }}>Datos personales</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={form.nombre} onChange={e => F('nombre', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" value={form.apellido} onChange={e => F('apellido', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => F('email', e.target.value)} disabled={modal === 'edit'} /></div>
            {modal === 'create' ? <div className="form-group"><label className="form-label">Contrasena *</label><input className="form-input" type="password" value={form.password} onChange={e => F('password', e.target.value)} /></div> : <div className="form-group"><label className="form-label">Telefono</label><input className="form-input" value={form.tel || ''} onChange={e => F('tel', e.target.value)} /></div>}
          </div>
          <div style={{ height: 1, background: '#DDE1EC', margin: '12px 0' }} />
          <div style={{ fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', color: '#4A5568', marginBottom: 10 }}>Datos fiscales</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">CUIT *</label><input className="form-input" value={form.cuit || ''} onChange={e => F('cuit', e.target.value)} placeholder="20-12345678-9" /></div>
            <div className="form-group"><label className="form-label">Categoria</label><select className="form-input" style={{ appearance: 'none' }} value={form.cat || 'A'} onChange={e => F('cat', e.target.value)}>{ORDEN.map(c => <option key={c} value={c}>Cat. {c} - hasta {fmt(CATS[c].lim)}/anio</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Actividad</label><input className="form-input" value={form.act || ''} onChange={e => F('act', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Inicio actividad</label><input className="form-input" type="date" value={form.inicio || ''} onChange={e => F('inicio', e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Domicilio fiscal</label><input className="form-input" value={form.dom || ''} onChange={e => F('dom', e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={form.iibb || false} onChange={e => F('iibb', e.target.checked)} style={{ width: 14, height: 14 }} />Inscripto en IIBB</label></div>
            {form.iibb && <div className="form-group"><label className="form-label">N. IIBB</label><input className="form-input" value={form.nroiibb || ''} onChange={e => F('nroiibb', e.target.value)} /></div>}
          </div>
        </div>
        <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : modal === 'create' ? 'Crear cliente' : 'Guardar'}</button></div>
      </div></div>}
      {modal === 'delete' && <div className="overlay" onClick={() => setModal(null)}><div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-hd"><h3 className="modal-title">Eliminar cliente</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(null)}>x</button></div>
        <div className="modal-bd"><p>Eliminar a <strong>{sel?.nombre} {sel?.apellido}</strong>? Esta accion no se puede deshacer.</p></div>
        <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={del} disabled={saving}>{saving ? 'Eliminando...' : 'Eliminar'}</button></div>
      </div></div>}
    </div>
  )
}

// ── ADMIN BILLING ─────────────────────────────────────────────
function AdminBilling() {
  const [clients, setClients] = useState([])
  const [allInv, setAllInv] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterC, setFilterC] = useState('')
  const [modal, setModal] = useState(false)
  const [modalPDF, setModalPDF] = useState(false)
  const [form, setForm] = useState({ uid: '', per: '', monto: '', desc: '' })
  const [saving, setSaving] = useState(false)
  const [pdfResult, setPdfResult] = useState(null)
  const [pdfError, setPdfError] = useState('')
  const [pdfUid, setPdfUid] = useState('')
  const fileRef = useRef(null)

  const load = async () => { setLoading(true); const [c, i] = await Promise.all([getAllClients(), getAllInvoices()]); setClients(c); setAllInv(i); setLoading(false) }
  useEffect(() => { load() }, [])

  const procesarPDF = async (file) => {
    setPdfError(''); setPdfResult(null)
    if (!pdfUid) { setPdfError('Selecciona un cliente primero'); return }
    try {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          script.onload = resolve; script.onerror = reject
          document.head.appendChild(script)
        })
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      }

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p)
        const content = await page.getTextContent()
        // Reconstruir lineas por posicion Y
        const byY = {}
        content.items.forEach(item => {
          const y = Math.round(item.transform[5])
          if (!byY[y]) byY[y] = []
          if (item.str.trim()) byY[y].push(item.str.trim())
        })
        Object.keys(byY).sort((a, b) => b - a).forEach(y => {
          fullText += byY[y].join(' ') + '\n'
        })
      }

      // Formato ARCA: cada linea de factura tiene fecha DD/MM/YYYY y termina con $ 0,00 - $ monto
      // Patron: fecha al inicio, ultimo monto de la linea es el Imp. Total
      const agrupado = {}
      const lineas = fullText.split('\n')
      
      lineas.forEach(linea => {
        const fechaMatch = linea.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
        if (!fechaMatch) return
        // Buscar todos los montos en la linea formato $ X.XXX,XX
        const todosMontos = [...linea.matchAll(/\$\s*([\d.]+,\d{2})/g)]
          .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
        // El Imp. Total es el ultimo monto positivo (distinto de 0)
        const montosPositivos = todosMontos.filter(m => m > 0)
        if (montosPositivos.length === 0) return
        const impTotal = montosPositivos[montosPositivos.length - 1]
        const mes = fechaMatch[2].padStart(2, '0')
        const anioF = fechaMatch[3]
        const periodo = `${anioF}-${mes}`
        agrupado[periodo] = (agrupado[periodo] || 0) + impTotal
      })

      if (Object.keys(agrupado).length === 0) {
        setPdfError('No se encontraron facturas. Asegurate de subir "Mis Comprobantes Emitidos" de ARCA.')
        return
      }

      let nuevas = 0; let actualizadas = 0
      for (const [per, monto] of Object.entries(agrupado)) {
        const existing = allInv.find(i => i.userId === pdfUid && i.per === per)
        await upsertInvoice(pdfUid, per, monto)
        if (existing) actualizadas++; else nuevas++
      }
      setPdfResult({ nuevas, actualizadas, periodos: Object.keys(agrupado).sort() })
      await load()
    } catch (err) {
      setPdfError('Error: ' + (err.message || 'Intenta de nuevo'))
    }
  }
  const filtered = filterC ? allInv.filter(i => i.userId === filterC) : allInv
  const chartData = MN.map((mes, i) => { const p = `${ANIO}-${String(i + 1).padStart(2, '0')}`; return { mes, total: allInv.filter(f => f.per === p).reduce((s, f) => s + f.monto, 0) } })
  const save = async () => {
    if (!form.uid || !form.per || !form.monto) return
    setSaving(true)
    await upsertInvoice(form.uid, form.per, parseFloat(form.monto), form.desc)
    await load(); setModal(false); setForm({ uid: '', per: '', monto: '', desc: '' }); setSaving(false)
  }
  const resumen = clients.map(c => { const t = allInv.filter(i => i.userId === c.id).reduce((s, i) => s + i.monto, 0); return { ...c, total: t, catSug: getCat(t), nec: t > 0 && getCat(t) !== c.fiscal?.cat } })
  return (
    <div className="page">
      <div className="sec-hd"><div className="sec-title">Facturacion de clientes</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => { setModalPDF(true); setPdfResult(null); setPdfError(''); setPdfUid('') }}>Importar PDF de ARCA</button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Cargar manual</button>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd"><span className="card-title">Facturacion mensual {ANIO}</span></div>
        <div className="card-bd"><ResponsiveContainer width="100%" height={160}><BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}><XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} /><Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #DDE1EC', fontSize: 11 }} /><Bar dataKey="total" fill="#1B4FD8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd"><span className="card-title">Resumen anual por cliente</span></div>
        <div className="tbl-wrap"><table><thead><tr><th>Cliente</th><th>Cat.</th><th>Facturado {ANIO}</th><th>Limite</th><th>Uso</th><th>Estado</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={6}><div className="empty">Cargando...</div></td></tr> : resumen.map(c => { const lim = CATS[c.fiscal?.cat]?.lim || 0; const pct = lim ? Math.min(Math.round((c.total / lim) * 100), 100) : 0; return <tr key={c.id}><td className="fw6">{c.nombre} {c.apellido}</td><td><span className="badge badge-cat">{c.fiscal?.cat}</span></td><td className="fw6">{fmt(c.total)}</td><td style={{ fontSize: 12, color: '#4A5568' }}>{fmt(lim)}</td><td><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><div className="prog-track" style={{ height: 7, width: 72 }}><div className="prog-fill" style={{ width: `${pct}%`, background: progColor(pct) }} /></div><span style={{ fontSize: 11, fontWeight: 600 }}>{pct}%</span></div></td><td>{c.nec ? <span className="badge badge-orange">Cat. {c.catSug} [!]</span> : <span className="badge badge-green">OK</span>}</td></tr> })}</tbody>
        </table></div>
      </div>
      <div className="card">
        <div className="card-hd"><span className="card-title">Detalle mensual</span><select className="form-input" style={{ maxWidth: 200, padding: '4px 26px 4px 9px', fontSize: 12, appearance: 'none' }} value={filterC} onChange={e => setFilterC(e.target.value)}><option value="">Todos</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
        <div className="tbl-wrap"><table><thead><tr><th>Cliente</th><th>Periodo</th><th>Monto</th><th></th></tr></thead>
          <tbody>{filtered.length === 0 ? <tr><td colSpan={4}><div className="empty"><div className="empty-title">Sin datos</div></div></td></tr> :
            filtered.map(i => <tr key={i.id}><td className="fw6">{clients.find(c => c.id === i.userId)?.nombre} {clients.find(c => c.id === i.userId)?.apellido}</td><td>{i.per}</td><td className="fw6">{fmt(i.monto)}</td><td><button className="btn btn-danger btn-sm" onClick={async () => { await deleteInvoice(i.id); await load() }}>Borrar</button></td></tr>)
          }</tbody>
        </table></div>
      </div>
      {modal && <div className="overlay" onClick={() => setModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd"><h3 className="modal-title">Cargar facturacion</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(false)}>x</button></div>
        <div className="modal-bd">
          <div className="form-group"><label className="form-label">Cliente *</label><select className="form-input" style={{ appearance: 'none' }} value={form.uid} onChange={e => setForm(p => ({ ...p, uid: e.target.value }))}><option value="">Seleccionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Periodo *</label><input className="form-input" type="month" value={form.per} onChange={e => setForm(p => ({ ...p, per: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} placeholder="0" /></div>
          </div>
          <div className="form-group"><label className="form-label">Descripcion</label><input className="form-input" value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} /></div>
        </div>
        <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></div>
      </div></div>}
      {modalPDF && <div className="overlay" onClick={() => setModalPDF(false)}><div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-hd"><h3 className="modal-title">Importar PDF de ARCA</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModalPDF(false)}>x</button></div>
        <div className="modal-bd">
          <div className="form-group"><label className="form-label">Cliente *</label><select className="form-input" style={{ appearance: 'none' }} value={pdfUid} onChange={e => setPdfUid(e.target.value)}><option value="">Seleccionar cliente...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido} - {c.fiscal?.cuit}</option>)}</select></div>
          <div style={{ border: '2px dashed #DDE1EC', borderRadius: 10, padding: 28, textAlign: 'center', cursor: 'pointer', background: '#F7F8FC', marginBottom: 12 }} onClick={() => pdfUid && fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) procesarPDF(f) }} />
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Arrastra el PDF o hace clic para seleccionar</div>
            <div style={{ fontSize: 12, color: '#4A5568' }}>PDF exportado desde ARCA → Mis Comprobantes Emitidos</div>
            {!pdfUid && <div style={{ marginTop: 8, fontSize: 12, color: '#C45A0A', fontWeight: 600 }}>Selecciona un cliente primero</div>}
          </div>
          {pdfError && <div className="alert-box alert-danger">{pdfError}</div>}
          {pdfResult && <div className="alert-box alert-success"><div><div style={{ fontWeight: 700, marginBottom: 4 }}>Importacion completada</div><div style={{ fontSize: 12.5 }}>{pdfResult.nuevas} periodos nuevos - {pdfResult.actualizadas} actualizados<br />Periodos: {pdfResult.periodos.join(', ')}</div></div></div>}
          <div className="alert-box alert-info" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12 }}><strong>Como exportar desde ARCA:</strong><br />1. Entra a arca.gob.ar → Mis Comprobantes → Emitidos<br />2. Filtra el periodo → clic en el icono de impresora o descarga<br />3. Guarda como PDF y subilo aca</div>
          </div>
        </div>
        <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModalPDF(false)}>Cerrar</button></div>
      </div></div>}
    </div>
  )
}
function AdminIIBB() {
  const [clients, setClients] = useState([])
  const [allDJ, setAllDJ] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterC, setFilterC] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ uid: '', per: '', base: '', alic: '3.5', estado: 'pendiente', fecha: '' })
  const [saving, setSaving] = useState(false)
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const load = async () => { setLoading(true); const [c, dj] = await Promise.all([getAllClients(), getAllIIBB()]); setClients(c.filter(c => c.fiscal?.iibb)); setAllDJ(dj); setLoading(false) }
  useEffect(() => { load() }, [])
  const filtered = filterC ? allDJ.filter(d => d.userId === filterC) : allDJ
  const totals = { pres: allDJ.filter(d => d.estado === 'presentada').length, pend: allDJ.filter(d => d.estado === 'pendiente').length, venc: allDJ.filter(d => d.estado === 'vencida').length, monto: allDJ.reduce((s, d) => s + (d.monto || 0), 0) }
  const calcM = Math.round((parseFloat(form.base) || 0) * (parseFloat(form.alic) || 0) / 100)
  const save = async () => {
    if (!form.uid || !form.per || !form.base) return
    setSaving(true)
    await createIIBB({ userId: form.uid, per: form.per, base: parseFloat(form.base), alic: parseFloat(form.alic), monto: calcM, estado: form.estado, fecha: form.fecha || '' })
    await load(); setModal(false); setForm({ uid: '', per: '', base: '', alic: '3.5', estado: 'pendiente', fecha: '' }); setSaving(false)
  }
  const markP = async (id) => { await updateIIBBDoc(id, { estado: 'presentada', fecha: new Date().toISOString().slice(0, 10) }); await load() }
  return (
    <div className="page">
      <div className="sec-hd"><div className="sec-title">IIBB / Declaraciones Juradas</div><button className="btn btn-primary" onClick={() => setModal(true)}>+ Cargar DJ</button></div>
      <div className="mq4"><div className="metric"><div className="m-lbl">Presentadas</div><div className="m-val" style={{ color: '#0A6E3E' }}>{totals.pres}</div></div><div className="metric"><div className="m-lbl">Pendientes</div><div className="m-val" style={{ color: '#C45A0A' }}>{totals.pend}</div></div><div className="metric"><div className="m-lbl">Vencidas</div><div className="m-val" style={{ color: '#C0291A' }}>{totals.venc}</div></div><div className="metric"><div className="m-lbl">Total declarado</div><div className="m-val" style={{ fontSize: 17 }}>{fmt(totals.monto)}</div></div></div>
      <div className="card" style={{ marginBottom: 12 }}><div className="card-bd" style={{ paddingTop: 12, paddingBottom: 12 }}><select className="form-input" style={{ maxWidth: 260, appearance: 'none' }} value={filterC} onChange={e => setFilterC(e.target.value)}><option value="">Todos los clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div></div>
      <div className="card"><div className="tbl-wrap"><table>
        <thead><tr><th>Cliente</th><th>Periodo</th><th>Base</th><th>Alic.</th><th>Monto</th><th>Estado</th><th>Presentacion</th><th></th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={8}><div className="empty">Cargando...</div></td></tr> : filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><div className="empty-title">Sin declaraciones</div></div></td></tr> :
          filtered.map(dj => <tr key={dj.id}><td className="fw6">{clients.find(c => c.id === dj.userId)?.nombre} {clients.find(c => c.id === dj.userId)?.apellido}</td><td>{dj.per}</td><td>{fmt(dj.base)}</td><td>{dj.alic}%</td><td className="fw6">{fmt(dj.monto)}</td><td><span className={`badge ${dj.estado === 'presentada' ? 'badge-green' : dj.estado === 'vencida' ? 'badge-red' : 'badge-orange'}`}>{dj.estado}</span></td><td style={{ fontSize: 12, color: '#4A5568' }}>{dj.fecha || '-'}</td><td>{dj.estado !== 'presentada' && <button className="btn btn-success btn-sm" onClick={() => markP(dj.id)}>Marcar presentada</button>}</td></tr>)
        }</tbody>
      </table></div></div>
      {modal && <div className="overlay" onClick={() => setModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd"><h3 className="modal-title">Cargar DJ de IIBB</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(false)}>x</button></div>
        <div className="modal-bd">
          <div className="form-group"><label className="form-label">Cliente *</label><select className="form-input" style={{ appearance: 'none' }} value={form.uid} onChange={e => F('uid', e.target.value)}><option value="">Seleccionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Periodo *</label><input className="form-input" type="month" value={form.per} onChange={e => F('per', e.target.value)} /></div><div className="form-group"><label className="form-label">Estado</label><select className="form-input" style={{ appearance: 'none' }} value={form.estado} onChange={e => F('estado', e.target.value)}><option value="pendiente">Pendiente</option><option value="presentada">Presentada</option><option value="vencida">Vencida</option></select></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Base Imponible *</label><input className="form-input" type="number" value={form.base} onChange={e => F('base', e.target.value)} placeholder="0" /></div><div className="form-group"><label className="form-label">Alicuota %</label><input className="form-input" type="number" step="0.1" value={form.alic} onChange={e => F('alic', e.target.value)} /></div></div>
          {form.base && <div className="alert-box alert-info" style={{ marginBottom: 0 }}>Monto calculado: <strong>{fmt(calcM)}</strong></div>}
          <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Fecha presentacion</label><input className="form-input" type="date" value={form.fecha} onChange={e => F('fecha', e.target.value)} /></div>
        </div>
        <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar DJ'}</button></div>
      </div></div>}
    </div>
  )
}

// ── ADMIN PAYMENTS ────────────────────────────────────────────
function AdminPay() {
  const [clients, setClients] = useState([])
  const [allPay, setAllPay] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterC, setFilterC] = useState('')
  const [filterE, setFilterE] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ uid: '', tipo: 'monotributo', per: '', monto: '', estado: 'pendiente', venc: '', fpago: '' })
  const [saving, setSaving] = useState(false)
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const load = async () => { setLoading(true); const [c, p] = await Promise.all([getAllClients(), getAllPayments()]); setClients(c); setAllPay(p); setLoading(false) }
  useEffect(() => { load() }, [])
  const filtered = allPay.filter(p => (!filterC || p.userId === filterC) && (!filterE || p.estado === filterE))
  const totals = { pag: allPay.filter(p => p.estado === 'pagado').length, pend: allPay.filter(p => p.estado === 'pendiente').length, venc: allPay.filter(p => p.estado === 'vencido').length }
  const markPaid = async (id) => { await updatePayment(id, { estado: 'pagado', fpago: new Date().toISOString().slice(0, 10) }); await load() }
  const save = async () => {
    if (!form.uid || !form.per || !form.monto) return
    setSaving(true)
    await createPayment({ userId: form.uid, tipo: form.tipo, per: form.per, monto: parseFloat(form.monto), estado: form.estado, venc: form.venc || '', fpago: form.fpago || '' })
    await load(); setModal(false); setForm({ uid: '', tipo: 'monotributo', per: '', monto: '', estado: 'pendiente', venc: '', fpago: '' }); setSaving(false)
  }
  return (
    <div className="page">
      <div className="sec-hd"><div className="sec-title">Gestion de Pagos</div><button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar pago</button></div>
      <div className="mq3"><div className="metric"><div className="m-lbl">Pagados</div><div className="m-val" style={{ color: '#0A6E3E' }}>{totals.pag}</div></div><div className="metric"><div className="m-lbl">Pendientes</div><div className="m-val" style={{ color: '#C45A0A' }}>{totals.pend}</div></div><div className="metric"><div className="m-lbl">Vencidos</div><div className="m-val" style={{ color: '#C0291A' }}>{totals.venc}</div></div></div>
      <div className="card" style={{ marginBottom: 12 }}><div className="card-bd" style={{ paddingTop: 12, paddingBottom: 12, display: 'flex', gap: 10 }}><select className="form-input" style={{ maxWidth: 230, appearance: 'none' }} value={filterC} onChange={e => setFilterC(e.target.value)}><option value="">Todos los clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select><select className="form-input" style={{ maxWidth: 150, appearance: 'none' }} value={filterE} onChange={e => setFilterE(e.target.value)}><option value="">Todos</option><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option><option value="vencido">Vencido</option></select></div></div>
      <div className="card"><div className="tbl-wrap"><table>
        <thead><tr><th>Cliente</th><th>Tipo</th><th>Periodo</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th>Fecha pago</th><th></th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={8}><div className="empty">Cargando...</div></td></tr> : filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><div className="empty-title">Sin pagos</div></div></td></tr> :
          filtered.map(p => <tr key={p.id}><td className="fw6">{clients.find(c => c.id === p.userId)?.nombre} {clients.find(c => c.id === p.userId)?.apellido}</td><td><span className="badge badge-gray">{p.tipo === 'monotributo' ? 'Monotributo' : 'IIBB'}</span></td><td>{p.per}</td><td className="fw6">{fmt(p.monto)}</td><td style={{ fontSize: 12, color: p.estado === 'vencido' ? '#C0291A' : '#4A5568' }}>{p.venc || '-'}</td><td><span className={`badge ${p.estado === 'pagado' ? 'badge-green' : p.estado === 'vencido' ? 'badge-red' : 'badge-orange'}`}>{p.estado}</span></td><td style={{ fontSize: 12, color: '#4A5568' }}>{p.fpago || '-'}</td><td>{p.estado !== 'pagado' && <button className="btn btn-success btn-sm" onClick={() => markPaid(p.id)}>Marcar pagado</button>}</td></tr>)
        }</tbody>
      </table></div></div>
      {modal && <div className="overlay" onClick={() => setModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd"><h3 className="modal-title">Registrar pago</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(false)}>x</button></div>
        <div className="modal-bd">
          <div className="form-group"><label className="form-label">Cliente *</label><select className="form-input" style={{ appearance: 'none' }} value={form.uid} onChange={e => F('uid', e.target.value)}><option value="">Seleccionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Tipo</label><select className="form-input" style={{ appearance: 'none' }} value={form.tipo} onChange={e => F('tipo', e.target.value)}><option value="monotributo">Monotributo</option><option value="iibb">Ingresos Brutos</option></select></div><div className="form-group"><label className="form-label">Periodo *</label><input className="form-input" type="month" value={form.per} onChange={e => F('per', e.target.value)} /></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={form.monto} onChange={e => F('monto', e.target.value)} /></div><div className="form-group"><label className="form-label">Estado</label><select className="form-input" style={{ appearance: 'none' }} value={form.estado} onChange={e => F('estado', e.target.value)}><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option></select></div></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Fecha vencimiento</label><input className="form-input" type="date" value={form.venc} onChange={e => F('venc', e.target.value)} /></div><div className="form-group"><label className="form-label">Fecha pago</label><input className="form-input" type="date" value={form.fpago} onChange={e => F('fpago', e.target.value)} /></div></div>
        </div>
        <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></div>
      </div></div>}
    </div>
  )
}

// ── ADMIN MESSAGES ────────────────────────────────────────────
function AdminMsgs({ user }) {
  const [clients, setClients] = useState([])
  const [selC, setSelC] = useState('')
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  useEffect(() => { getAllClients().then(c => { setClients(c); if (c[0]) setSelC(c[0].id) }) }, [])
  useEffect(() => {
    if (!selC) return
    const unsub = listenMessages(selC, setMsgs)
    return () => unsub()
  }, [selC])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  const send = async () => {
    if (!input.trim() || !selC) return
    await sendMessage(selC, 'admin', input)
    setInput('')
  }
  return (
    <div className="page">
      <div className="sec-hd"><div className="sec-title">Mensajes con clientes</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14, height: 'calc(100vh - 180px)' }}>
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #DDE1EC', fontWeight: 700, fontSize: 12.5 }}>Conversaciones</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {clients.map(c => <div key={c.id} onClick={() => setSelC(c.id)} style={{ padding: '10px 14px', cursor: 'pointer', background: selC === c.id ? '#EEF3FF' : 'transparent', borderLeft: selC === c.id ? '3px solid #1B4FD8' : '3px solid transparent' }}>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{c.nombre} {c.apellido}</div>
              <div style={{ fontSize: 11, color: '#4A5568' }}>{c.email}</div>
            </div>)}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selC ? <>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #DDE1EC', fontWeight: 700, fontSize: 13 }}>{clients.find(c => c.id === selC)?.nombre} {clients.find(c => c.id === selC)?.apellido}</div>
            <div className="chat-msgs" style={{ flex: 1, maxHeight: 'none' }}>
              {msgs.length === 0 ? <div className="empty" style={{ margin: 'auto' }}>Sin mensajes</div> :
                msgs.map(m => <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'admin' ? 'flex-end' : 'flex-start' }}>
                  <div className={`bubble bubble-${m.from}`}>{m.txt}</div>
                  <div style={{ fontSize: 9.5, opacity: .55, marginTop: 3 }}>{m.fecha?.toDate ? m.fecha.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                </div>)
              }
              <div ref={endRef} />
            </div>
            <div className="chat-inp-row"><input className="chat-inp" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Escribir mensaje..." /><button className="btn btn-primary btn-icon" onClick={send}>Enviar</button></div>
          </> : <div className="empty" style={{ margin: 'auto' }}>Selecciona un cliente</div>}
        </div>
      </div>
    </div>
  )
}

// ── ADMIN CALENDARIO ──────────────────────────────────────────
function AdminCalendario() {
  const today = new Date()
  const [mes, setMes] = useState(today.getMonth() + 1)
  const [anio, setAnio] = useState(today.getFullYear())
  const [events, setEvents] = useState([])
  const [modal, setModal] = useState(false)
  const [editEv, setEditEv] = useState(null)
  const EF = { dia: '', mes: '0', lbl: '', col: '#1B4FD8', recurrente: true, desc: '' }
  const [form, setForm] = useState(EF)
  const [saving, setSaving] = useState(false)
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const load = async () => { setEvents(await getCalEvents()) }
  useEffect(() => { load() }, [])
  const mesEvents = events.filter(e => e.recurrente || parseInt(e.mes) === mes - 1)
  const diasMes = new Date(anio, mes, 0).getDate()
  const primerDia = new Date(anio, mes - 1, 1).getDay()
  const offset = primerDia === 0 ? 6 : primerDia - 1
  const cellEvs = {}; mesEvents.forEach(e => { if (!cellEvs[e.dia]) cellEvs[e.dia] = []; cellEvs[e.dia].push(e) })
  const cells = []; for (let i = 0; i < offset; i++) cells.push(null); for (let d = 1; d <= diasMes; d++) cells.push(d)
  const save = async () => {
    if (!form.dia || !form.lbl) return
    setSaving(true)
    const data = { ...form, dia: parseInt(form.dia), mes: parseInt(form.mes) }
    if (editEv) await updateCalEvent(editEv.id, data)
    else await createCalEvent(data)
    await load(); setModal(false); setSaving(false)
  }
  const del = async (id) => { await deleteCalEvent(id); await load() }
  return (
    <div className="page">
      <div className="sec-hd">
        <div className="sec-title">Calendario Fiscal</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { if (mes === 1) { setMes(12); setAnio(a => a - 1) } else setMes(m => m - 1) }}>{'<'}</button>
          <span style={{ fontWeight: 700, minWidth: 140, textAlign: 'center', fontSize: 13.5 }}>{MF[mes - 1]} {anio}</span>
          <button className="btn btn-outline btn-sm" onClick={() => { if (mes === 12) { setMes(1); setAnio(a => a + 1) } else setMes(m => m + 1) }}>{'>'}</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(EF); setEditEv(null); setModal(true) }}>+ Agregar evento</button>
        </div>
      </div>
      <div className="g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-hd"><span className="card-title">Eventos de {MF[mes - 1]}</span></div>
          <div className="card-bd" style={{ paddingTop: 10 }}>
            {mesEvents.length === 0 && <div style={{ color: '#4A5568', fontSize: 13 }}>Sin eventos este mes</div>}
            {mesEvents.map(ev => <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #ECEEF4' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: ev.col, flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>Dia {ev.dia} - {ev.lbl}</div>{ev.desc && <div style={{ fontSize: 11.5, color: '#4A5568' }}>{ev.desc}</div>}<span className="badge badge-gray" style={{ fontSize: 9.5, marginTop: 2 }}>{ev.recurrente ? 'Todos los meses' : MF[ev.mes]}</span></div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setEditEv(ev); setForm({ ...ev, mes: String(ev.mes) }); setModal(true) }}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(ev.id)}>X</button>
              </div>
            </div>)}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">Todos los eventos</span></div>
          <div className="card-bd" style={{ paddingTop: 10, maxHeight: 300, overflowY: 'auto' }}>
            {events.map(ev => <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #ECEEF4' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: ev.col, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 12 }}><strong>Dia {ev.dia}</strong> {ev.recurrente ? '(mensual)' : `(${MF[ev.mes]})`} - {ev.lbl}</div>
              <button className="btn btn-outline btn-sm" style={{ fontSize: 10 }} onClick={() => { setEditEv(ev); setForm({ ...ev, mes: String(ev.mes) }); setModal(true) }}>Editar</button>
              <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }} onClick={() => del(ev.id)}>X</button>
            </div>)}
          </div>
        </div>
      </div>
      <div className="card"><div className="card-bd">
        <div className="cal-grid" style={{ marginBottom: 7 }}>{['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#4A5568', paddingBottom: 5 }}>{d}</div>)}</div>
        <div className="cal-grid">{cells.map((dia, i) => { const isToday = dia === today.getDate() && mes === today.getMonth() + 1 && anio === today.getFullYear(); const evs = dia ? cellEvs[dia] : null; return <div key={i} className={`cal-cell${isToday ? ' cal-cell-today' : evs ? ' cal-cell-event' : ''}`}>{dia && <><div className="cal-day" style={isToday ? { color: '#fff', fontWeight: 700 } : {}}>{dia}</div>{evs?.map((ev, j) => <div key={j} className="cal-ev" style={{ color: isToday ? 'rgba(255,255,255,.9)' : ev.col }}>{ev.lbl.slice(0, 3).toUpperCase()}</div>)}</>}</div> })}</div>
      </div></div>
      {modal && <div className="overlay" onClick={() => setModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd"><h3 className="modal-title">{editEv ? 'Editar evento' : 'Nuevo evento'}</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(false)}>x</button></div>
        <div className="modal-bd">
          <div className="form-group"><label className="form-label">Nombre del evento *</label><input className="form-input" value={form.lbl} onChange={e => F('lbl', e.target.value)} placeholder="Ej: Vencimiento ARCA" /></div>
          <div className="form-row"><div className="form-group"><label className="form-label">Dia del mes *</label><input className="form-input" type="number" min="1" max="31" value={form.dia} onChange={e => F('dia', e.target.value)} placeholder="20" /></div><div className="form-group"><label className="form-label">Color</label><input className="form-input" type="color" value={form.col} onChange={e => F('col', e.target.value)} style={{ height: 38, padding: 4 }} /></div></div>
          <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={form.recurrente} onChange={e => F('recurrente', e.target.checked)} style={{ width: 14, height: 14 }} />Se repite todos los meses</label></div>
          {!form.recurrente && <div className="form-group"><label className="form-label">Mes especifico</label><select className="form-input" style={{ appearance: 'none' }} value={form.mes} onChange={e => F('mes', e.target.value)}>{MF.map((m, i) => <option key={i} value={i}>{m}</option>)}</select></div>}
          <div className="form-group"><label className="form-label">Descripcion</label><input className="form-input" value={form.desc} onChange={e => F('desc', e.target.value)} placeholder="Detalle del evento..." /></div>
        </div>
        <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : editEv ? 'Guardar cambios' : 'Agregar evento'}</button></div>
      </div></div>}
    </div>
  )
}

// ── CALENDARIO CLIENTE ────────────────────────────────────────
function Calendario() {
  const today = new Date()
  const [mes, setMes] = useState(today.getMonth() + 1)
  const [anio, setAnio] = useState(today.getFullYear())
  const [events, setEvents] = useState([])
  useEffect(() => { getCalEvents().then(setEvents) }, [])
  const mesEvents = events.filter(e => e.recurrente || parseInt(e.mes) === mes - 1)
  const diasMes = new Date(anio, mes, 0).getDate()
  const primerDia = new Date(anio, mes - 1, 1).getDay()
  const offset = primerDia === 0 ? 6 : primerDia - 1
  const cellEvs = {}; mesEvents.forEach(e => { if (!cellEvs[e.dia]) cellEvs[e.dia] = []; cellEvs[e.dia].push(e) })
  const cells = []; for (let i = 0; i < offset; i++) cells.push(null); for (let d = 1; d <= diasMes; d++) cells.push(d)
  return (
    <div className="page">
      <div className="sec-hd">
        <div className="sec-title">Calendario Fiscal</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => { if (mes === 1) { setMes(12); setAnio(a => a - 1) } else setMes(m => m - 1) }}>{'<'}</button>
          <span style={{ fontWeight: 700, minWidth: 140, textAlign: 'center', fontSize: 13.5 }}>{MF[mes - 1]} {anio}</span>
          <button className="btn btn-outline btn-sm" onClick={() => { if (mes === 12) { setMes(1); setAnio(a => a + 1) } else setMes(m => m + 1) }}>{'>'}</button>
        </div>
      </div>
      <div className="g2" style={{ marginBottom: 16 }}>
        <div className="card"><div className="card-hd"><span className="card-title">Vencimientos de {MF[mes - 1]}</span></div><div className="card-bd" style={{ paddingTop: 10 }}>{mesEvents.length === 0 ? <div style={{ color: '#4A5568', fontSize: 13 }}>Sin eventos</div> : mesEvents.map(ev => <div key={ev.id} className="alert-box alert-info" style={{ marginBottom: 8, borderLeft: `3px solid ${ev.col}`, background: ev.col + '15' }}><div style={{ color: ev.col }}><strong>Dia {ev.dia} - {ev.lbl}</strong>{ev.desc && <><br /><span style={{ fontSize: 11.5 }}>{ev.desc}</span></>}</div></div>)}</div></div>
        <div className="card"><div className="card-hd"><span className="card-title">Referencias</span></div><div className="card-bd" style={{ paddingTop: 10 }}>{[...new Map(events.map(e => [e.col, e])).values()].map((e, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, fontSize: 13 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: e.col, flexShrink: 0 }} />{e.lbl}</div>)}</div></div>
      </div>
      <div className="card"><div className="card-bd">
        <div className="cal-grid" style={{ marginBottom: 7 }}>{['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#4A5568', paddingBottom: 5 }}>{d}</div>)}</div>
        <div className="cal-grid">{cells.map((dia, i) => { const isToday = dia === today.getDate() && mes === today.getMonth() + 1 && anio === today.getFullYear(); const evs = dia ? cellEvs[dia] : null; return <div key={i} className={`cal-cell${isToday ? ' cal-cell-today' : evs ? ' cal-cell-event' : ''}`}>{dia && <><div className="cal-day" style={isToday ? { color: '#fff', fontWeight: 700 } : {}}>{dia}</div>{evs?.map((ev, j) => <div key={j} className="cal-ev" style={{ color: isToday ? 'rgba(255,255,255,.9)' : ev.col }}>{ev.lbl.slice(0, 3).toUpperCase()}</div>)}</>}</div> })}</div>
      </div></div>
    </div>
  )
}

// ── CLIENT DASHBOARD ──────────────────────────────────────────
function ClientDash({ user }) {
  const [invs, setInvs] = useState([])
  const [pays, setPays] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { Promise.all([getInvoices(user.id), getPayments(user.id)]).then(([i, p]) => { setInvs(i); setPays(p); setLoading(false) }) }, [user.id])
  const mes = new Date().getMonth() + 1
  const cat = user.fiscal?.cat || 'A'
  const total = invs.reduce((s, f) => s + f.monto, 0)
  const pct = getPct(total, cat); const rest = getRest(total, cat)
  const proy = getProy(total, mes); const catP = getCat(proy); const lim = CATS[cat]?.lim || 0
  const pends = pays.filter(p => p.estado === 'pendiente'); const vends = pays.filter(p => p.estado === 'vencido')
  const chartData = MN.map((m, i) => { const p = `${ANIO}-${String(i + 1).padStart(2, '0')}`; const f = invs.find(f => f.per === p); return { mes: m, monto: f ? f.monto : 0 } })
  if (loading) return <div className="page"><div className="empty">Cargando...</div></div>
  return (
    <div className="page">
      {vends.length > 0 && <div className="alert-box alert-danger" style={{ marginBottom: 12 }}>Tenes {vends.length} pago{vends.length > 1 ? 's' : ''} vencido{vends.length > 1 ? 's' : ''}. Regulariza para evitar intereses.</div>}
      {pct >= 80 && <div className="alert-box alert-warn" style={{ marginBottom: 12 }}>Facturaste el {pct}% del limite de tu categoria {cat}. Te quedan {fmt(rest)}. Consulta con Franco.</div>}
      <div className="mq4">
        <div className="metric"><div className="m-lbl">Facturacion {ANIO}</div><div className="m-val" style={{ fontSize: 18 }}>{fmt(total)}</div><div className="m-sub">de {fmt(lim)}</div></div>
        <div className="metric"><div className="m-lbl">Categoria actual</div><div className="m-val" style={{ fontSize: 40, lineHeight: 1 }}>{cat}</div><div className="m-sub">Monotributo 2026</div></div>
        <div className="metric"><div className="m-lbl">Pagos pendientes</div><div className="m-val">{pends.length}</div><div className="m-sub">{vends.length} vencido{vends.length !== 1 ? 's' : ''}</div></div>
        <div className="metric"><div className="m-lbl">Proyeccion anual</div><div className="m-val" style={{ fontSize: 18 }}>{fmt(proy)}</div><div className="m-sub">Cat. proyectada: <strong>{catP}</strong></div></div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}><div className="card-bd">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 13 }}>Progreso - Categoria {cat}</div><div style={{ fontWeight: 700, fontSize: 12.5, color: progColor(pct) }}>{pct}%</div></div>
        <div className="prog-track" style={{ height: 14 }}><div className="prog-fill" style={{ width: `${pct}%`, background: progColor(pct) }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, color: '#4A5568' }}><span>$0</span><span style={{ fontWeight: 600, color: '#0D1117' }}>{fmt(total)} facturado</span><span>Limite: {fmt(lim)}</span></div>
        {pct < 90 && <div style={{ marginTop: 8, fontSize: 12, color: '#4A5568' }}>Te quedan <strong style={{ color: '#0D1117' }}>{fmt(rest)}</strong> para llegar al limite.</div>}
      </div></div>
      <div className="g2" style={{ marginBottom: 14 }}>
        <div className="card"><div className="card-hd"><span className="card-title">Facturacion mensual {ANIO}</span></div><div className="card-bd"><ResponsiveContainer width="100%" height={160}><BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}><XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} /><Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #DDE1EC', fontSize: 11 }} /><Bar dataKey="monto" fill="#1B4FD8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><div className="card-hd"><span className="card-title">Proximos pagos</span><a href="https://monotributo.economy.gob.ar/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Pagar en ARCA</a></div><div className="card-bd" style={{ paddingTop: 10 }}>
          {vends.length === 0 && pends.length === 0 ? <div style={{ color: '#0A6E3E', fontWeight: 600 }}>Todos los pagos al dia</div> :
            [...vends, ...pends].map(p => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ECEEF4' }}>
              <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.tipo === 'monotributo' ? 'Monotributo' : 'IIBB'}</div><div style={{ fontSize: 11, color: '#4A5568' }}>Vence: {fmtF(p.venc)}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{fmt(p.monto)}</div><span className={`badge ${p.estado === 'vencido' ? 'badge-red' : 'badge-orange'}`}>{p.estado}</span></div>
            </div>)
          }
        </div></div>
      </div>
      <div style={{ height: 420 }}><AIAsist /></div>
    </div>
  )
}

// ── CLIENT BILLING ────────────────────────────────────────────
function ClientBill({ user }) {
  const [invs, setInvs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getInvoices(user.id).then(i => { setInvs(i); setLoading(false) }) }, [user.id])
  const hoy = new Date()
  const mes = hoy.getMonth() + 1
  const cat = user.fiscal?.cat || 'A'
  const total = invs.reduce((s, f) => s + f.monto, 0)
  const pct = getPct(total, cat); const lim = CATS[cat]?.lim || 0
  const prom = mes > 0 ? Math.round(total / mes) : 0
  const proy = getProy(total, mes)
  // Categoria que corresponde segun lo facturado REAL (no proyectado)
  const catCorresponde = getCat(total)
  const cuotaActual = CATS[cat]?.cuota || 0
  const cuotaCorrespondiente = CATS[catCorresponde]?.cuota || cuotaActual

  // Periodo fiscal vigente:
  // Recategorización julio: mira 01/01 al 31/12 del año anterior
  // Recategorización enero: mira 01/07 del año anterior al 30/06 del año actual
  // Ahora (marzo 2026): periodo vigente es 01/07/2025 al 30/06/2026
  const periodoDesde = mes >= 7 ? `01/07/${hoy.getFullYear()}` : `01/07/${hoy.getFullYear() - 1}`
  const periodoHasta = mes >= 7 ? `30/06/${hoy.getFullYear() + 1}` : `30/06/${hoy.getFullYear()}`
  const proxRecat = mes >= 7 ? `Enero ${hoy.getFullYear() + 1}` : `Julio ${hoy.getFullYear()}`

  // Relacion de dependencia: aportes del empleado = 17% del sueldo bruto
  // Jubilacion 11% + Obra Social 3% + PAMI 3%
  const aporteRD = Math.round(prom * 0.17)
  const diferencia = cuotaActual - aporteRD

  const chartData = MN.map((m, i) => { const p = `${ANIO}-${String(i + 1).padStart(2, '0')}`; const f = invs.find(f => f.per === p); return { mes: m, monto: f ? f.monto : 0 } })
  if (loading) return <div className="page"><div className="empty">Cargando...</div></div>
  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 16 }}>Mi Facturacion</div>

      {/* Cartel periodo fiscal */}
      <div className="alert-box alert-info" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Periodo fiscal vigente: {periodoDesde} al {periodoHasta}</div>
          <div style={{ fontSize: 12 }}>El monto facturado en este periodo es el que se tiene en cuenta para tu recategorizacion. Proxima recategorizacion: <strong>{proxRecat}</strong></div>
        </div>
      </div>

      <div className="mq4">
        <div className="metric"><div className="m-lbl">Total {ANIO}</div><div className="m-val" style={{ fontSize: 18 }}>{fmt(total)}</div><div className="m-sub">{pct}% del limite</div></div>
        <div className="metric"><div className="m-lbl">Promedio mensual</div><div className="m-val" style={{ fontSize: 18 }}>{fmt(prom)}</div><div className="m-sub">{mes} mes{mes > 1 ? 'es' : ''} analizados</div></div>
        <div className="metric"><div className="m-lbl">Categoria que corresponde</div><div className="m-val" style={{ fontSize: 40, lineHeight: 1 }}>{catCorresponde}</div><div className="m-sub">Segun lo facturado real</div></div>
        <div className="metric"><div className="m-lbl">Limite cat. {cat}</div><div className="m-val" style={{ fontSize: 17 }}>{fmt(lim)}</div><div className="m-sub">Quedan: {fmt(Math.max(lim - total, 0))}</div></div>
      </div>

      {/* Cuotas y comparacion */}
      <div className="g2" style={{ marginBottom: 14 }}>
        <div className="card"><div className="card-hd"><span className="card-title">Cuota mensual del monotributo</span></div><div className="card-bd" style={{ paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #ECEEF4' }}>
            <div><div style={{ fontWeight: 600, fontSize: 13 }}>Categoria actual ({cat})</div><div style={{ fontSize: 11.5, color: '#4A5568' }}>Lo que pagas ahora</div></div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{fmt(cuotaActual)}/mes</div>
          </div>
          {catCorresponde !== cat
            ? <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #ECEEF4' }}>
                <div><div style={{ fontWeight: 600, fontSize: 13, color: '#C45A0A' }}>Si te recategorias a {catCorresponde}</div><div style={{ fontSize: 11.5, color: '#4A5568' }}>Cuota que corresponde a tu facturacion</div></div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#C45A0A' }}>{fmt(cuotaCorrespondiente)}/mes</div>
              </div>
            : <div style={{ padding: '9px 0', fontSize: 12.5, color: '#0A6E3E', fontWeight: 600 }}>Tu cuota corresponde a tu facturacion actual.</div>
          }
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0' }}>
            <div><div style={{ fontWeight: 600, fontSize: 13 }}>Cuota anual estimada</div><div style={{ fontSize: 11.5, color: '#4A5568' }}>12 meses x cuota actual</div></div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(cuotaActual * 12)}/anio</div>
          </div>
        </div></div>

        <div className="card"><div className="card-hd"><span className="card-title">Monotributo vs Relacion de Dependencia</span></div><div className="card-bd" style={{ paddingTop: 10 }}>
          <div style={{ fontSize: 11.5, color: '#4A5568', marginBottom: 10 }}>Comparacion basada en tu ingreso promedio mensual de {fmt(prom)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #ECEEF4' }}>
            <div><div style={{ fontWeight: 600, fontSize: 13, color: '#1B4FD8' }}>Monotributo (cuota fija)</div><div style={{ fontSize: 11.5, color: '#4A5568' }}>Cuota categoria {cat}</div></div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1B4FD8' }}>{fmt(cuotaActual)}/mes</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #ECEEF4' }}>
            <div><div style={{ fontWeight: 600, fontSize: 13, color: '#4A5568' }}>Relacion de dependencia</div><div style={{ fontSize: 11.5, color: '#4A5568' }}>17% del ingreso (Jub. 11% + OS 3% + PAMI 3%)</div></div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(aporteRD)}/mes</div>
          </div>
          <div style={{ padding: '9px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{diferencia >= 0 ? 'Pagás mas siendo monotributista' : 'Pagás menos siendo monotributista'}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: diferencia >= 0 ? '#C0291A' : '#0A6E3E' }}>{diferencia >= 0 ? '+' : ''}{fmt(diferencia)}/mes</div>
          </div>
          {prom === 0 && <div style={{ fontSize: 11.5, color: '#4A5568', fontStyle: 'italic' }}>Carga tu facturacion para ver la comparacion.</div>}
        </div></div>
      </div>

      {/* Barra de progreso */}
      <div className="card" style={{ marginBottom: 14 }}><div className="card-bd">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontWeight: 700, fontSize: 13 }}>Uso del limite anual - Categoria {cat}</span><span style={{ fontWeight: 700, fontSize: 12.5, color: progColor(pct) }}>{pct}% utilizado</span></div>
        <div className="prog-track" style={{ height: 16 }}><div className="prog-fill" style={{ width: `${pct}%`, background: progColor(pct) }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, color: '#4A5568' }}><span>$0</span><span style={{ fontWeight: 600, color: '#0D1117' }}>{fmt(total)} facturado</span><span>Limite: {fmt(lim)}</span></div>
      </div></div>

      <div className="card" style={{ marginBottom: 14 }}><div className="card-hd"><span className="card-title">Facturacion mensual {ANIO}</span></div><div className="card-bd"><ResponsiveContainer width="100%" height={180}><BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}><XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} /><Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #DDE1EC', fontSize: 11 }} /><Bar dataKey="monto" fill="#1B4FD8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
      <div className="card"><div className="card-hd"><span className="card-title">Detalle mensual</span></div><div className="tbl-wrap"><table><thead><tr><th>Mes</th><th>Periodo</th><th>Monto</th><th>Acumulado</th><th></th></tr></thead>
        <tbody>{invs.length === 0 ? <tr><td colSpan={5}><div className="empty"><div className="empty-title">Sin datos</div><p style={{ fontSize: 12 }}>Tu contador carga estos datos</p></div></td></tr> :
          [...invs].sort((a, b) => b.per.localeCompare(a.per)).map(f => { const mi = parseInt(f.per.split('-')[1]) - 1; const acum = invs.filter(fi => fi.per <= f.per).reduce((s, fi) => s + fi.monto, 0); return <tr key={f.id}><td className="fw6">{MF[mi]}</td><td style={{ fontSize: 12, color: '#4A5568' }}>{f.per}</td><td className="fw6">{fmt(f.monto)}</td><td style={{ color: '#4A5568' }}>{fmt(acum)}</td><td><button className="btn btn-danger btn-sm" onClick={async () => { await deleteInvoice(f.id); setInvs(await getInvoices(user.id)) }}>Borrar</button></td></tr> })
        }</tbody>
      </table></div></div>
    </div>
  )
}

// ── CLIENT IIBB ───────────────────────────────────────────────
function ClientIIBB({ user }) {
  const [djs, setDjs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getIIBB(user.id).then(d => { setDjs(d); setLoading(false) }) }, [user.id])
  if (!user.fiscal?.iibb) return <div className="page"><div className="sec-title" style={{ marginBottom: 16 }}>IIBB / Declaraciones Juradas</div><div className="card"><div className="card-bd"><div className="empty"><div className="empty-title">No estas inscripto en Ingresos Brutos</div><p style={{ fontSize: 12.5 }}>Si necesitas inscribirte, contacta a Franco.</p></div></div></div></div>
  const totals = { pres: djs.filter(d => d.estado === 'presentada').length, pend: djs.filter(d => d.estado === 'pendiente').length, venc: djs.filter(d => d.estado === 'vencida').length, monto: djs.reduce((s, d) => s + (d.monto || 0), 0) }
  if (loading) return <div className="page"><div className="empty">Cargando...</div></div>
  return (
    <div className="page">
      <div className="sec-hd"><div><div className="sec-title">IIBB / Declaraciones Juradas</div><div style={{ fontSize: 12, color: '#4A5568' }}>N. IIBB: {user.fiscal.nroiibb}</div></div><a href="https://www.agip.gob.ar/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Portal AGIP</a></div>
      <div className="mq4"><div className="metric"><div className="m-lbl">Presentadas</div><div className="m-val" style={{ color: '#0A6E3E' }}>{totals.pres}</div></div><div className="metric"><div className="m-lbl">Pendientes</div><div className="m-val" style={{ color: '#C45A0A' }}>{totals.pend}</div></div><div className="metric"><div className="m-lbl">Vencidas</div><div className="m-val" style={{ color: '#C0291A' }}>{totals.venc}</div></div><div className="metric"><div className="m-lbl">Total declarado</div><div className="m-val" style={{ fontSize: 17 }}>{fmt(totals.monto)}</div></div></div>
      {totals.pend > 0 && <div className="alert-box alert-info" style={{ marginBottom: 12 }}>Tenes {totals.pend} declaracion{totals.pend > 1 ? 'es' : ''} pendiente{totals.pend > 1 ? 's' : ''}. Tu contador Franco se encarga de presentarlas.</div>}
      <div className="card"><div className="card-hd"><span className="card-title">Historial de Declaraciones</span></div><div className="tbl-wrap"><table><thead><tr><th>Periodo</th><th>Base Imponible</th><th>Alicuota</th><th>Monto</th><th>Estado</th><th>Presentacion</th></tr></thead>
        <tbody>{djs.length === 0 ? <tr><td colSpan={6}><div className="empty"><div className="empty-title">Sin declaraciones</div></div></td></tr> :
          [...djs].map(dj => <tr key={dj.id}><td className="fw6">{dj.per}</td><td>{fmt(dj.base)}</td><td>{dj.alic}%</td><td className="fw6">{fmt(dj.monto)}</td><td><span className={`badge ${dj.estado === 'presentada' ? 'badge-green' : dj.estado === 'vencida' ? 'badge-red' : 'badge-orange'}`}>{dj.estado}</span></td><td style={{ fontSize: 12, color: '#4A5568' }}>{dj.fecha || '-'}</td></tr>)
        }</tbody>
      </table></div></div>
    </div>
  )
}

// ── CLIENT PAYMENTS ───────────────────────────────────────────
function ClientPay({ user }) {
  const [pays, setPays] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getPayments(user.id).then(p => { setPays(p); setLoading(false) }) }, [user.id])
  const pagados = pays.filter(p => p.estado === 'pagado')
  const pends = pays.filter(p => p.estado === 'pendiente')
  const vends = pays.filter(p => p.estado === 'vencido')
  const totPag = pagados.reduce((s, p) => s + p.monto, 0)
  const totPend = [...pends, ...vends].reduce((s, p) => s + p.monto, 0)
  const Row = ({ p }) => <tr><td>{p.estado === 'pagado' ? '[OK]' : p.estado === 'vencido' ? '[!]' : '[.]'}</td><td><span className="badge badge-gray">{p.tipo === 'monotributo' ? 'Monotributo' : 'IIBB'}</span></td><td className="fw6">{p.per}</td><td className="fw6">{fmt(p.monto)}</td><td style={{ fontSize: 12, color: '#4A5568' }}>{fmtF(p.venc)}</td><td style={{ fontSize: 12, color: '#4A5568' }}>{fmtF(p.fpago)}</td><td><span className={`badge ${p.estado === 'pagado' ? 'badge-green' : p.estado === 'vencido' ? 'badge-red' : 'badge-orange'}`}>{p.estado}</span></td></tr>
  if (loading) return <div className="page"><div className="empty">Cargando...</div></div>
  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 16 }}>Mis Pagos</div>
      <div className="mq3"><div className="metric"><div className="m-lbl">Total abonado {ANIO}</div><div className="m-val" style={{ fontSize: 18 }}>{fmt(totPag)}</div><div className="m-sub">{pagados.length} pagos realizados</div></div><div className="metric"><div className="m-lbl">Pendiente de pago</div><div className="m-val" style={{ fontSize: 18, color: totPend > 0 ? '#C45A0A' : '#0A6E3E' }}>{fmt(totPend)}</div><div className="m-sub">{pends.length + vends.length} cuotas</div></div><div className="metric"><div className="m-lbl">Vencidos</div><div className="m-val" style={{ color: vends.length > 0 ? '#C0291A' : '#0A6E3E' }}>{vends.length}</div><div className="m-sub">{vends.length === 0 ? 'Sin vencidos' : 'Regulariza cuanto antes'}</div></div></div>
      {vends.length > 0 && <div className="alert-box alert-danger" style={{ marginBottom: 12 }}><strong>Tenes {vends.length} pago{vends.length > 1 ? 's' : ''} vencido{vends.length > 1 ? 's' : ''}.</strong><a href="https://monotributo.economy.gob.ar/" target="_blank" rel="noreferrer" className="btn btn-danger btn-sm" style={{ marginLeft: 10 }}>Pagar en ARCA</a></div>}
      {[...vends, ...pends].length > 0 && <div className="card" style={{ marginBottom: 14 }}><div className="card-hd"><span className="card-title">Pagos pendientes y vencidos</span><a href="https://monotributo.economy.gob.ar/" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Ir a pagar</a></div><div className="tbl-wrap"><table><thead><tr><th></th><th>Tipo</th><th>Periodo</th><th>Monto</th><th>Vencimiento</th><th>Fecha pago</th><th>Estado</th></tr></thead><tbody>{[...vends, ...pends].map(p => <Row key={p.id} p={p} />)}</tbody></table></div></div>}
      <div className="card"><div className="card-hd"><span className="card-title">Historial de pagos</span></div><div className="tbl-wrap"><table><thead><tr><th></th><th>Tipo</th><th>Periodo</th><th>Monto</th><th>Vencimiento</th><th>Fecha pago</th><th>Estado</th></tr></thead><tbody>{pagados.length === 0 ? <tr><td colSpan={7}><div className="empty"><div className="empty-title">Sin pagos</div></div></td></tr> : pagados.map(p => <Row key={p.id} p={p} />)}</tbody></table></div></div>
    </div>
  )
}

// ── CLIENT ALERTS ─────────────────────────────────────────────
function ClientAlerts({ user }) {
  const [invs, setInvs] = useState([])
  const [pays, setPays] = useState([])
  useEffect(() => { Promise.all([getInvoices(user.id), getPayments(user.id)]).then(([i, p]) => { setInvs(i); setPays(p) }) }, [user.id])
  const cat = user.fiscal?.cat || 'A'; const mes = new Date().getMonth() + 1
  const total = invs.reduce((s, f) => s + f.monto, 0)
  const pct = getPct(total, cat); const rest = getRest(total, cat); const catC = getCat(total)
  const vends = pays.filter(p => p.estado === 'vencido'); const pends = pays.filter(p => p.estado === 'pendiente')
  const alerts = []
  if (pct >= 90) alerts.push({ tipo: 'danger', t: 'Limite de categoria casi alcanzado', d: `Facturaste el ${pct}% del limite de la Categoria ${cat}. Te quedan ${fmt(rest)}. Consulta con Franco urgente.` })
  else if (pct >= 70) alerts.push({ tipo: 'warn', t: 'Acercandote al limite', d: `Facturaste ${pct}% del limite. Te quedan ${fmt(rest)}.` })
  if (total > 0 && catC !== cat) alerts.push({ tipo: 'warn', t: 'Revision de categoria', d: `Segun tu facturacion (${fmt(total)}), deberias estar en Categoria ${catC}. Habla con Franco.` })
  if (vends.length > 0) alerts.push({ tipo: 'danger', t: `${vends.length} pago${vends.length > 1 ? 's' : ''} vencido${vends.length > 1 ? 's' : ''}`, d: 'Tenes pagos sin abonar con fecha vencida. Regulariza para evitar multas.' })
  if (pends.length > 0) alerts.push({ tipo: 'info', t: `${pends.length} pago${pends.length > 1 ? 's' : ''} proximo${pends.length > 1 ? 's' : ''}`, d: 'El monotributo vence el dia 20 de cada mes.' })
  if (mes === 1 || mes === 7) alerts.push({ tipo: 'info', t: 'Periodo de recategorizacion', d: 'Estamos en periodo de recategorizacion. Tu contador revisara si corresponde cambiar tu categoria.' })
  if (alerts.length === 0) alerts.push({ tipo: 'success', t: 'Todo en orden', d: 'No tenes alertas pendientes.' })
  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 16 }}>Alertas y Avisos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{alerts.map((a, i) => <div key={i} className={`alert-box alert-${a.tipo}`} style={{ padding: '14px 16px' }}><div><div style={{ fontWeight: 700, marginBottom: 3 }}>{a.t}</div><div style={{ fontSize: 12.5, opacity: .9 }}>{a.d}</div></div></div>)}</div>
      <div className="card" style={{ marginTop: 18 }}><div className="card-hd"><span className="card-title">Fechas clave</span></div><div className="card-bd" style={{ paddingTop: 10 }}>
        {[{ dia: 'Dia 20 de cada mes', desc: 'Vencimiento Monotributo', col: '#1B4FD8' }, { dia: 'Dia 15 de cada mes', desc: 'Vencimiento IIBB', col: '#0A6E3E' }, { dia: 'Enero y Julio', desc: 'Recategorizacion (del 1 al 20)', col: '#C45A0A' }, { dia: 'Diciembre', desc: 'Revisar proyeccion anual', col: '#B8860B' }].map((f, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < 3 ? '1px solid #ECEEF4' : 'none' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: f.col, flexShrink: 0 }} /><div style={{ fontWeight: 700, fontSize: 12.5, minWidth: 155 }}>{f.dia}</div><div style={{ fontSize: 12.5, color: '#4A5568' }}>{f.desc}</div></div>)}
      </div></div>
    </div>
  )
}

// ── CLIENT MESSAGES ───────────────────────────────────────────
function ClientMsgs({ user }) {
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  useEffect(() => {
    const unsub = listenMessages(user.id, setMsgs)
    return () => unsub()
  }, [user.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])
  const send = async () => {
    if (!input.trim()) return
    await sendMessage(user.id, 'client', input)
    setInput('')
  }
  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 16 }}>Mensajes con tu contador</div>
      <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #DDE1EC', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: '#B8860B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>FA</div>
          <div><div style={{ fontWeight: 700, fontSize: 13 }}>Franco Armand Pilon</div><div style={{ fontSize: 10.5, color: '#4A5568' }}>Contador Publico</div></div>
        </div>
        <div className="chat-msgs" style={{ flex: 1, maxHeight: 'none' }}>
          {msgs.length === 0 ? <div className="empty" style={{ margin: 'auto' }}>Sin mensajes - escribile a Franco</div> :
            msgs.map(m => <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'client' ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: 10, color: '#4A5568', marginBottom: 2 }}>{m.from === 'admin' ? 'Franco Armand Pilon' : 'Vos'}</div>
              <div className={`bubble bubble-${m.from}`}>{m.txt}</div>
              <div style={{ fontSize: 9.5, opacity: .55, marginTop: 3 }}>{m.fecha?.toDate ? m.fecha.toDate().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</div>
            </div>)
          }
          <div ref={endRef} />
        </div>
        <div className="chat-inp-row"><input className="chat-inp" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Escribile a Franco..." /><button className="btn btn-primary btn-icon" onClick={send}>Enviar</button></div>
      </div>
    </div>
  )
}

// ── IMPORTAR FACTURAS ─────────────────────────────────────────
function ImportarFacturas({ user }) {
  const [invs, setInvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const load = async () => { setInvs(await getInvoices(user.id)); setLoading(false) }
  useEffect(() => { load() }, [user.id])
  const procesarArchivo = (file) => {
    setError(''); setResultado(null); setSaving(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target.result
        const lineas = text.split('\n').filter(l => l.trim())
        const importadas = []
        lineas.forEach((linea, idx) => {
          if (idx === 0) return
          const cols = linea.split(',').map(c => c.trim().replace(/"/g, ''))
          if (cols.length < 3) return
          const fecha = cols[0]; const monto = parseFloat(cols[cols.length - 1].replace(/\./g, '').replace(',', '.'))
          if (!fecha || isNaN(monto)) return
          let periodo = ''
          if (fecha.includes('/')) { const parts = fecha.split('/'); if (parts.length === 3) { const mes = parts[1].padStart(2, '0'); const anioF = parts[2].length === 2 ? '20' + parts[2] : parts[2]; periodo = `${anioF}-${mes}` } }
          else if (fecha.includes('-')) { periodo = fecha.slice(0, 7) }
          if (periodo) importadas.push({ periodo, monto })
        })
        const agrupado = {}
        importadas.forEach(({ periodo, monto }) => { agrupado[periodo] = (agrupado[periodo] || 0) + monto })
        let nuevas = 0; let actualizadas = 0
        for (const [per, monto] of Object.entries(agrupado)) {
          const existing = invs.find(i => i.per === per)
          await upsertInvoice(user.id, per, monto)
          if (existing) actualizadas++; else nuevas++
        }
        setResultado({ nuevas, actualizadas, total: importadas.length })
        await load()
      } catch { setError('No se pudo leer el archivo. Asegurate de exportarlo como CSV desde ARCA.') }
      setSaving(false)
    }
    reader.onerror = () => { setError('Error al leer el archivo.'); setSaving(false) }
    reader.readAsText(file)
  }
  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 6 }}>Importar Facturas desde ARCA</div>
      <p style={{ color: '#4A5568', fontSize: 13, marginBottom: 20 }}>Exporta tus facturas desde ARCA en formato CSV y subelas aca. El sistema las importa automaticamente.</p>
      <div className="card" style={{ marginBottom: 16 }}><div className="card-hd"><span className="card-title">Como exportar desde ARCA</span></div><div className="card-bd" style={{ paddingTop: 12 }}>
        {[{ n: '1', txt: 'Entra a arca.gob.ar con tu CUIT y clave fiscal' }, { n: '2', txt: 'Ve a "Mis Comprobantes" -> "Emitidos"' }, { n: '3', txt: 'Filtra por el periodo que queres importar' }, { n: '4', txt: 'Hace clic en "Exportar" y elegis formato CSV' }, { n: '5', txt: 'Guarda el archivo y subilo aca abajo' }].map(s => <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}><div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1B4FD8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.n}</div><div style={{ fontSize: 13, paddingTop: 3 }}>{s.txt}</div></div>)}
      </div></div>
      <div onDrop={e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) procesarArchivo(file) }} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #DDE1EC', borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer', background: '#F7F8FC', marginBottom: 16 }}>
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => { const file = e.target.files[0]; if (file) procesarArchivo(file) }} />
        <div style={{ fontSize: 32, marginBottom: 10 }}>+</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Arrastra el archivo aca o hace clic para seleccionar</div>
        <div style={{ fontSize: 12.5, color: '#4A5568' }}>Formatos aceptados: CSV, TXT</div>
        {saving && <div style={{ marginTop: 12, color: '#1B4FD8', fontWeight: 600 }}>Procesando...</div>}
      </div>
      {error && <div className="alert-box alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
      {resultado && <div className="alert-box alert-success" style={{ marginBottom: 16, padding: '14px 16px' }}><div><div style={{ fontWeight: 700, marginBottom: 4 }}>Importacion completada</div><div style={{ fontSize: 12.5 }}>{resultado.nuevas} periodos nuevos - {resultado.actualizadas} periodos actualizados</div></div></div>}
      <div className="card"><div className="card-hd"><span className="card-title">Facturacion registrada</span></div><div className="tbl-wrap"><table><thead><tr><th>Periodo</th><th>Monto</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={2}><div className="empty">Cargando...</div></td></tr> : invs.length === 0 ? <tr><td colSpan={2}><div className="empty"><div className="empty-title">Sin facturacion registrada</div></div></td></tr> :
          [...invs].sort((a, b) => b.per.localeCompare(a.per)).map(f => <tr key={f.id}><td className="fw6">{MF[parseInt(f.per.split('-')[1]) - 1]} {f.per.split('-')[0]}</td><td className="fw6">{fmt(f.monto)}</td></tr>)
        }</tbody>
      </table></div></div>
    </div>
  )
}

// ── EMITIR FACTURA (CLIENTE) ──────────────────────────────────
function EmitirFactura({ user }) {
  const [form, setForm] = useState({
    cuitReceptor: '',
    nombreReceptor: '',
    concepto: '2',
    importe: '',
    descripcion: ''
  })
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [emitiendo, setEmitiendo] = useState(false)
  const [facturas, setFacturas] = useState([])
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    getInvoices(user.id).then(inv => {
      // Mostrar solo las que tienen CAE
      setFacturas(inv.filter(i => i.cae).sort((a, b) => b.per?.localeCompare(a.per)))
    })
  }, [user.id])

  const cuitEmisor = user.fiscal?.cuit?.replace(/-/g, '') || ''

  const emitir = async () => {
    if (!form.cuitReceptor || !form.importe) { setError('Completá el CUIT del receptor y el importe'); return }
    if (!cuitEmisor) { setError('Tu perfil no tiene CUIT cargado. Contactá a tu contador.'); return }
    if (form.cuitReceptor.replace(/-/g, '').length < 10) { setError('CUIT del receptor inválido'); return }
    setEmitiendo(true); setError(''); setResultado(null)
    try {
      const res = await fetch('/api/facturar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuitEmisor: cuitEmisor,
          cuitReceptor: form.cuitReceptor.replace(/-/g, ''),
          nombreReceptor: form.nombreReceptor,
          concepto: parseInt(form.concepto),
          importeTotal: parseFloat(form.importe),
          descripcion: form.descripcion || 'Servicios profesionales'
        })
      })
      const data = await res.json()
      if (data.error) { setError('Error ARCA: ' + data.error); setEmitiendo(false); return }
      setResultado(data)
      // Guardar en Firestore con CAE
      await upsertInvoice(user.id, new Date().toISOString().slice(0, 7), parseFloat(form.importe))
      setFacturas(prev => [{ id: Date.now(), per: new Date().toISOString().slice(0, 7), monto: parseFloat(form.importe), cae: data.CAE, nro: data.nroComprobante, receptor: form.nombreReceptor || form.cuitReceptor }, ...prev])
      setForm(p => ({ ...p, cuitReceptor: '', nombreReceptor: '', importe: '', descripcion: '' }))
    } catch (e) {
      setError('Error al conectar con ARCA: ' + e.message)
    }
    setEmitiendo(false)
  }

  const conceptos = [
    { val: '1', lbl: 'Productos' },
    { val: '2', lbl: 'Servicios' },
    { val: '3', lbl: 'Productos y Servicios' },
  ]

  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 6 }}>Emitir Factura C</div>
      <p style={{ color: '#4A5568', fontSize: 13, marginBottom: 20 }}>
        Emitis facturas electronicas a nombre de tu CUIT. El CAE se obtiene en tiempo real de ARCA.
      </p>

      <div className="alert-box alert-info" style={{ marginBottom: 16 }}>
        <div><strong>Emisor:</strong> {user.nombre} {user.apellido} · CUIT: {user.fiscal?.cuit} · Categoria {user.fiscal?.cat}</div>
      </div>

      <div className="g2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-hd"><span className="card-title">Datos de la factura</span></div>
          <div className="card-bd">
            {error && <div className="alert-box alert-danger" style={{ marginBottom: 12 }}>{error}</div>}
            {resultado && (
              <div className="alert-box alert-success" style={{ marginBottom: 12, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Factura emitida correctamente</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                  <div>Nro: <strong>{resultado.nroComprobante}</strong></div>
                  <div>CAE: <strong>{resultado.CAE}</strong></div>
                  <div>Vencimiento CAE: <strong>{resultado.CAEFchVto}</strong></div>
                </div>
              </div>
            )}

            <div style={{ fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', color: '#4A5568', marginBottom: 10 }}>Datos del receptor</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CUIT del receptor *</label>
                <input className="form-input" value={form.cuitReceptor} onChange={e => F('cuitReceptor', e.target.value)} placeholder="20-12345678-9" />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre / Razon social</label>
                <input className="form-input" value={form.nombreReceptor} onChange={e => F('nombreReceptor', e.target.value)} placeholder="Juan Perez" />
              </div>
            </div>

            <div style={{ height: 1, background: '#DDE1EC', margin: '4px 0 14px' }} />
            <div style={{ fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', color: '#4A5568', marginBottom: 10 }}>Datos de la factura</div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Concepto *</label>
                <select className="form-input" style={{ appearance: 'none' }} value={form.concepto} onChange={e => F('concepto', e.target.value)}>
                  {conceptos.map(c => <option key={c.val} value={c.val}>{c.lbl}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Importe total *</label>
                <input className="form-input" type="number" value={form.importe} onChange={e => F('importe', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripcion</label>
              <input className="form-input" value={form.descripcion} onChange={e => F('descripcion', e.target.value)} placeholder="Servicios profesionales..." />
            </div>
            {form.importe && <div style={{ padding: '8px 0', fontSize: 13, color: '#4A5568' }}>Importe: <strong style={{ color: '#0D1117', fontSize: 16 }}>{fmt(parseFloat(form.importe) || 0)}</strong></div>}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }} onClick={emitir} disabled={emitiendo}>
              {emitiendo ? 'Conectando con ARCA...' : 'Emitir Factura C'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-hd"><span className="card-title">Informacion</span></div>
          <div className="card-bd" style={{ paddingTop: 12 }}>
            <div style={{ fontSize: 12.5, color: '#4A5568', lineHeight: 1.9 }}>
              <div><strong style={{ color: '#0D1117' }}>Tipo:</strong> Factura C</div>
              <div><strong style={{ color: '#0D1117' }}>Punto de venta:</strong> 00002</div>
              <div><strong style={{ color: '#0D1117' }}>CUIT emisor:</strong> {user.fiscal?.cuit}</div>
              <div><strong style={{ color: '#0D1117' }}>Proceso:</strong> El sistema se autentica en ARCA con tu certificado, consulta el ultimo numero de comprobante y solicita el CAE automaticamente.</div>
            </div>
            <div className="alert-box alert-warn" style={{ marginTop: 14, fontSize: 12 }}>
              Las facturas emitidas son <strong>reales y legalmente validas</strong>. Si necesitas anular una, hacelo directamente en ARCA.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd"><span className="card-title">Facturas emitidas este mes</span></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Periodo</th><th>Receptor</th><th>Importe</th><th>CAE</th></tr></thead>
            <tbody>
              {facturas.length === 0
                ? <tr><td colSpan={4}><div className="empty"><div className="empty-title">Sin facturas emitidas</div></div></td></tr>
                : facturas.map(f => (
                  <tr key={f.id}>
                    <td>{f.per}</td>
                    <td style={{ fontSize: 12, color: '#4A5568' }}>{f.receptor || '-'}</td>
                    <td className="fw6">{fmt(f.monto)}</td>
                    <td style={{ fontSize: 11, color: '#4A5568', fontFamily: 'monospace' }}>{f.cae || '-'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── TITLES & APP ──────────────────────────────────────────────
const TITLES = { adash: 'Dashboard', aclients: 'Clientes', abillin: 'Facturacion', aiibb: 'IIBB / DJ', apay: 'Gestion de Pagos', acal: 'Calendario Fiscal', amsgs: 'Mensajes', cdash: 'Mi Panel', cbill: 'Mi Facturacion', cfacturar: 'Emitir Factura', cimport: 'Importar Facturas desde ARCA', ciibb: 'IIBB / DJ', cpay: 'Mis Pagos', calerts: 'Alertas', cmsgs: 'Mensajes', cal: 'Calendario Fiscal' }

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState(null)

  useEffect(() => {
    initAdmin().catch(() => {})
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await import('./db').then(m => m.getUserProfile(fbUser.uid))
          if (profile) { setUser(profile); setPage(profile.role === 'admin' ? 'adash' : 'cdash') }
          else setUser(null)
        } catch { setUser(null) }
      } else { setUser(null) }
      setAuthLoading(false)
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => { await logoutUser(); setUser(null); setPage(null) }

  if (authLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1117' }}><div style={{ color: '#fff', fontSize: 16 }}>Cargando sistema...</div></div>
  if (!user) return <Login setUser={u => { setUser(u); setPage(u.role === 'admin' ? 'adash' : 'cdash') }} />

  const renderPage = () => {
    if (user.role === 'admin') {
      if (page === 'adash') return <AdminDash setPage={setPage} />
      if (page === 'aclients') return <AdminClients />
      if (page === 'abillin') return <AdminBilling />
      if (page === 'aiibb') return <AdminIIBB />
      if (page === 'apay') return <AdminPay />
      if (page === 'acal') return <AdminCalendario />
      if (page === 'amsgs') return <AdminMsgs user={user} />
    } else {
      if (page === 'cdash') return <ClientDash user={user} />
      if (page === 'cbill') return <ClientBill user={user} />
      if (page === 'cfacturar') return <EmitirFactura user={user} />
      if (page === 'cimport') return <ImportarFacturas user={user} />
      if (page === 'ciibb') return <ClientIIBB user={user} />
      if (page === 'cpay') return <ClientPay user={user} />
      if (page === 'calerts') return <ClientAlerts user={user} />
      if (page === 'cmsgs') return <ClientMsgs user={user} />
      if (page === 'cal') return <Calendario />
    }
    return <div className="page">Pagina no encontrada</div>
  }

  return (
    <div className="shell">
      <Sidebar user={user} page={page} setPage={setPage} onLogout={handleLogout} />
      <div className="main">
        <header className="topbar">
          <h1 className="page-heading">{TITLES[page] || 'Gestion Fiscal'}</h1>
          <span className="tb-badge">{user.role === 'admin' ? 'Administrador' : `Categoria ${user.fiscal?.cat || ''}`}</span>
        </header>
        {renderPage()}
      </div>
    </div>
  )
}
