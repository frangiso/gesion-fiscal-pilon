import { useState, useRef, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ANIO, CATS, ORDEN, MN, MF, STORE, getCat, getPct, getRest, getProy, fmt, fmtF, progColor } from './data'

// ── AI ASSISTANT ──────────────────────────────────────────────
const AI_R = {
  cat: `Las categorias del Monotributo van de la A a la K. Desde febrero 2026:\n- Cat. A: hasta ${fmt(10277988)}/anio\n- Cat. B: hasta ${fmt(15063928)}/anio\n- Cat. C: hasta ${fmt(21236256)}/anio\n- Cat. D: hasta ${fmt(26545320)}/anio\n- Cat. E: hasta ${fmt(31854384)}/anio\n- Cat. F hasta K: hasta ${fmt(108357084)}/anio\n\nTu contador actualiza estos valores cada semestre.`,
  venc: 'El Monotributo vence el dia 20 de cada mes.\nIngresos Brutos generalmente el dia 15.\n\nSi cae en fin de semana o feriado se corre al siguiente dia habil.',
  recat: 'La recategorizacion es obligatoria dos veces por anio: enero y julio, del 1 al 20.\n\nSi tu facturacion supero el limite de tu categoria, debes subir. Tu contador Franco te avisara.',
  pago: 'Podes pagar en:\n- monotributo.arca.gob.ar\n- Generando un VEP desde ARCA\n- Por homebanking o app del banco\n\nSi necesitas el VEP pediselo a Franco por el chat.',
  iibb: 'Ingresos Brutos es un impuesto provincial. En CABA se gestiona en AGIP.\n\nLa alicuota varia segun la actividad (entre 3% y 4.5%). Tu contador presenta las declaraciones mensualmente.',
  def: 'Soy el asistente fiscal del estudio del Contador Franco Armand Pilon. Puedo ayudarte con:\n- Categorias y limites 2026\n- Fechas de vencimiento\n- Recategorizacion\n- Ingresos Brutos\n- Pagos y VEP\n\nSobre que queres consultar?',
}
function getAIResp(m) {
  const ml = m.toLowerCase()
  if (ml.includes('categor') || ml.includes('limit')) return AI_R.cat
  if (ml.includes('vencim') || ml.includes('cuando') || ml.includes('fecha')) return AI_R.venc
  if (ml.includes('recat') || ml.includes('cambio') || ml.includes('subir')) return AI_R.recat
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
    setInput('')
    setLoading(true)
    setTimeout(() => { setMsgs(m => [...m, { r: 'bot', t: getAIResp(txt) }]); setLoading(false) }, 600)
  }
  const qq = ['Cuando vence el pago?', 'Como me recategorizo?', 'Como pago el VEP?', 'Que son los IIBB?']
  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-hd">
        <span className="card-title">Asistente Fiscal IA</span>
        <span className="badge badge-blue">Beta</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="ai-msgs" style={{ flex: 1 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.r === 'user' ? 'flex-end' : 'flex-start' }}>
              <div className={m.r === 'bot' ? 'ai-bub-bot' : 'ai-bub-user'}>{m.t}</div>
            </div>
          ))}
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

// ── SIDEBAR ────────────────────────────────────────────────────
const ADMIN_NAV = [
  { sec: 'PANEL', items: [{ lbl: 'Dashboard', id: 'adash' }, { lbl: 'Clientes', id: 'aclients' }, { lbl: 'Facturacion', id: 'abillin' }, { lbl: 'IIBB / DJ', id: 'aiibb' }] },
  { sec: 'GESTION', items: [{ lbl: 'Pagos', id: 'apay' }, { lbl: 'Calendario Fiscal', id: 'cal' }, { lbl: 'Mensajes', id: 'amsgs', badge: true }] },
]
const CLIENT_NAV = [
  { sec: 'MI CUENTA', items: [{ lbl: 'Dashboard', id: 'cdash' }, { lbl: 'Facturacion', id: 'cbill' }, { lbl: 'IIBB / DJ', id: 'ciibb' }, { lbl: 'Pagos', id: 'cpay' }] },
  { sec: 'HERRAMIENTAS', items: [{ lbl: 'Calendario Fiscal', id: 'cal' }, { lbl: 'Alertas', id: 'calerts' }, { lbl: 'Mensajes', id: 'cmsgs' }] },
]

function Sidebar({ user, page, setPage, setUser }) {
  const nav = user.role === 'admin' ? ADMIN_NAV : CLIENT_NAV
  const unread = user.role === 'admin'
    ? STORE.users.filter(u => u.role === 'client').reduce((s, c) => s + (STORE.msgs[c.id] || []).filter(m => m.from === 'client' && !m.leido).length, 0)
    : (STORE.msgs[user.id] || []).filter(m => m.from === 'admin' && !m.leido).length
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
          {g.items.map(item => (
            <div key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
              {item.lbl}
              {item.badge && unread > 0 && <span className="nav-badge">{unread}</span>}
            </div>
          ))}
        </div>
      ))}
      <div className="sb-foot">
        <div className="user-pill">
          <div className="user-av" style={{ background: user.role === 'admin' ? '#B8860B' : '#1B4FD8' }}>{user.nombre[0]}{user.apellido[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-nm">{user.nombre} {user.apellido}</div>
            <div className="user-rl">{user.role === 'admin' ? 'Administrador' : 'Cliente'}</div>
          </div>
          <button className="btn btn-ghost btn-icon" style={{ padding: 5 }} onClick={() => { localStorage.removeItem('gf_u'); setUser(null) }}>X</button>
        </div>
      </div>
    </aside>
  )
}

// ── LOGIN ──────────────────────────────────────────────────────
function Login({ setUser }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = (e) => {
    e.preventDefault(); setLoading(true); setErr('')
    setTimeout(() => {
      const u = STORE.users.find(u => u.email.toLowerCase() === form.email.toLowerCase() && u.password === form.password)
      setLoading(false)
      if (!u) { setErr('Email o contrasena incorrectos'); return }
      const safe = { id: u.id, email: u.email, role: u.role, nombre: u.nombre, apellido: u.apellido, fiscal: u.fiscal || null }
      localStorage.setItem('gf_u', JSON.stringify(safe))
      setUser(safe)
    }, 400)
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
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="tucorreo@email.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Contrasena</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <div style={{ height: 1, background: '#DDE1EC', margin: '16px 0' }} />
        <div style={{ fontSize: 11, color: '#4A5568', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>ACCESO DEMO</div>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 11.5 }} onClick={() => setForm({ email: 'franco@armandpilon.com.ar', password: 'Admin2026!' })}>Admin (Franco)</button>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', fontSize: 11.5 }} onClick={() => setForm({ email: 'maria@email.com', password: '1234' })}>Cliente (Maria)</button>
        </div>
      </div>
    </div>
  )
}

// ── ADMIN DASHBOARD ────────────────────────────────────────────
function AdminDash({ setPage }) {
  const clients = STORE.users.filter(u => u.role === 'client')
  const allInv = clients.flatMap(c => (STORE.inv[c.id] || []).map(i => ({ ...i, cid: c.id })))
  const allPay = clients.flatMap(c => (STORE.pay[c.id] || []).map(p => ({ ...p, cid: c.id, cnom: `${c.nombre} ${c.apellido}` })))
  const totalFact = allInv.reduce((s, i) => s + i.monto, 0)
  const pend = allPay.filter(p => p.estado === 'pendiente').length
  const venc = allPay.filter(p => p.estado === 'vencido').length
  const recat = clients.filter(c => { const t = (STORE.inv[c.id] || []).reduce((s, f) => s + f.monto, 0); return t > 0 && getCat(t) !== c.fiscal.cat })
  const chartData = MN.map((mes, i) => { const p = `${ANIO}-${String(i + 1).padStart(2, '0')}`; return { mes, monto: allInv.filter(f => f.per === p).reduce((s, f) => s + f.monto, 0) } })
  const recent = allPay.filter(p => p.estado !== 'pagado').slice(0, 6)
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
                <YAxis hide />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #DDE1EC', fontSize: 11 }} />
                <Area type="monotone" dataKey="monto" stroke="#1B4FD8" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">Clientes por categoria</span></div>
          <div className="card-bd">
            {ORDEN.map(cat => { const count = clients.filter(c => c.fiscal.cat === cat).length; if (!count) return null; return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span className="badge badge-cat">{cat}</span>
                <div style={{ flex: 1, background: '#ECEEF4', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((count / clients.length) * 100)}%`, height: '100%', background: '#1B4FD8', borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#4A5568', minWidth: 18 }}>{count}</span>
              </div>
            )})}
          </div>
        </div>
      </div>
      {recat.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-hd"><span className="card-title" style={{ color: '#C45A0A' }}>Alertas de recategorizacion</span></div>
          <div className="card-bd" style={{ paddingTop: 10 }}>
            {recat.map(c => { const t = (STORE.inv[c.id] || []).reduce((s, f) => s + f.monto, 0); return (
              <div key={c.id} className="alert-box alert-warn">
                <strong>{c.nombre} {c.apellido}</strong>&nbsp;esta en cat. <strong>{c.fiscal.cat}</strong> pero deberia estar en <strong>{getCat(t)}</strong> (facturo {fmt(t)})
              </div>
            )})}
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-hd"><span className="card-title">Pagos pendientes / vencidos</span><button className="btn btn-ghost btn-sm" onClick={() => setPage('apay')}>Ver todos</button></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Tipo</th><th>Periodo</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {recent.length === 0 ? <tr><td colSpan={5}><div className="empty"><div className="empty-title">Todo al dia</div></div></td></tr> :
                recent.map((p, i) => <tr key={i}><td className="fw6">{p.cnom}</td><td><span className="badge badge-gray">{p.tipo === 'monotributo' ? 'Monotributo' : 'IIBB'}</span></td><td>{p.per}</td><td className="fw6">{fmt(p.monto)}</td><td><span className={`badge ${p.estado === 'vencido' ? 'badge-red' : 'badge-orange'}`}>{p.estado}</span></td></tr>)
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── ADMIN CLIENTS ──────────────────────────────────────────────
function AdminClients() {
  const [clients, setClients] = useState(STORE.users.filter(u => u.role === 'client'))
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [sel, setSel] = useState(null)
  const EF = { nombre: '', apellido: '', email: '', password: '', tel: '', cuit: '', cat: 'A', act: '', inicio: '', dom: '', iibb: false, nroiibb: '' }
  const [form, setForm] = useState(EF)
  const [msg, setMsg] = useState('')
  const filtered = clients.filter(c => `${c.nombre} ${c.apellido} ${c.email} ${c.fiscal?.cuit || ''}`.toLowerCase().includes(search.toLowerCase()))
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const getFact = id => (STORE.inv[id] || []).reduce((s, f) => s + f.monto, 0)
  const getSt = id => { const ps = STORE.pay[id] || []; return { pend: ps.filter(p => p.estado === 'pendiente').length, venc: ps.filter(p => p.estado === 'vencido').length } }
  const save = () => {
    if (!form.nombre || !form.apellido || !form.email || !form.cuit) { setMsg('Completa nombre, apellido, email y CUIT'); return }
    if (modal === 'create' && !form.password) { setMsg('La contrasena es obligatoria'); return }
    if (modal === 'create') {
      const id = 'c' + Date.now()
      STORE.users.push({ id, role: 'client', nombre: form.nombre, apellido: form.apellido, email: form.email, password: form.password, tel: form.tel, fiscal: { cuit: form.cuit, cat: form.cat, act: form.act, inicio: form.inicio, dom: form.dom, iibb: form.iibb, nroiibb: form.nroiibb } })
      STORE.inv[id] = []; STORE.pay[id] = []; STORE.iibb[id] = []; STORE.msgs[id] = []
    } else {
      const idx = STORE.users.findIndex(u => u.id === sel.id)
      if (idx > -1) STORE.users[idx] = { ...STORE.users[idx], nombre: form.nombre, apellido: form.apellido, tel: form.tel, fiscal: { ...STORE.users[idx].fiscal, cuit: form.cuit, cat: form.cat, act: form.act, inicio: form.inicio, dom: form.dom, iibb: form.iibb, nroiibb: form.nroiibb } }
    }
    setClients(STORE.users.filter(u => u.role === 'client')); setModal(null)
  }
  const del = () => { const idx = STORE.users.findIndex(u => u.id === sel.id); if (idx > -1) STORE.users.splice(idx, 1); setClients(STORE.users.filter(u => u.role === 'client')); setModal(null) }
  return (
    <div className="page">
      <div className="sec-hd">
        <div><div className="sec-title">Clientes</div><div style={{ fontSize: 12, color: '#4A5568' }}>{clients.length} monotributistas</div></div>
        <button className="btn btn-primary" onClick={() => { setForm(EF); setModal('create'); setMsg('') }}>+ Nuevo cliente</button>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-bd" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <input className="form-input" style={{ maxWidth: 320 }} placeholder="Buscar por nombre, email o CUIT..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>CUIT</th><th>Cat.</th><th>Facturacion {ANIO}</th><th>Pagos</th><th>Actividad</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={7}><div className="empty"><div className="empty-title">Sin resultados</div></div></td></tr> :
                filtered.map(c => { const fact = getFact(c.id); const st = getSt(c.id); const cc = getCat(fact); const nec = fact > 0 && cc !== c.fiscal.cat; return (
                  <tr key={c.id}>
                    <td><div className="fw6">{c.nombre} {c.apellido}</div><div style={{ fontSize: 11, color: '#4A5568' }}>{c.email}</div></td>
                    <td style={{ fontSize: 12, color: '#4A5568' }}>{c.fiscal.cuit}</td>
                    <td><span className="badge badge-cat">{c.fiscal.cat}</span>{nec && <span style={{ color: '#C45A0A', marginLeft: 4 }}>[!]</span>}</td>
                    <td className="fw6">{fmt(fact)}</td>
                    <td>
                      {st.venc > 0 && <span className="badge badge-red" style={{ marginRight: 3 }}>{st.venc} venc.</span>}
                      {st.pend > 0 && <span className="badge badge-orange">{st.pend} pend.</span>}
                      {st.venc === 0 && st.pend === 0 && <span className="badge badge-green">Al dia</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#4A5568' }}>{c.fiscal.act || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setSel(c); setForm({ ...EF, ...c, ...c.fiscal }); setModal('edit'); setMsg('') }}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setSel(c); setModal('delete') }}>Borrar</button>
                      </div>
                    </td>
                  </tr>
                )})}
            </tbody>
          </table>
        </div>
      </div>
      {(modal === 'create' || modal === 'edit') && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
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
                {modal === 'create' ? <div className="form-group"><label className="form-label">Contrasena *</label><input className="form-input" type="password" value={form.password} onChange={e => F('password', e.target.value)} /></div> : <div className="form-group"><label className="form-label">Telefono</label><input className="form-input" value={form.tel} onChange={e => F('tel', e.target.value)} /></div>}
              </div>
              <div style={{ height: 1, background: '#DDE1EC', margin: '12px 0' }} />
              <div style={{ fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', color: '#4A5568', marginBottom: 10 }}>Datos fiscales</div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">CUIT *</label><input className="form-input" value={form.cuit} onChange={e => F('cuit', e.target.value)} placeholder="20-12345678-9" /></div>
                <div className="form-group"><label className="form-label">Categoria</label>
                  <select className="form-input" style={{ appearance: 'none' }} value={form.cat} onChange={e => F('cat', e.target.value)}>
                    {ORDEN.map(c => <option key={c} value={c}>Cat. {c} - hasta {fmt(CATS[c].lim)}/anio</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Actividad</label><input className="form-input" value={form.act} onChange={e => F('act', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Inicio actividad</label><input className="form-input" type="date" value={form.inicio} onChange={e => F('inicio', e.target.value)} /></div>
              </div>
              <div className="form-group"><label className="form-label">Domicilio fiscal</label><input className="form-input" value={form.dom} onChange={e => F('dom', e.target.value)} /></div>
              <div className="form-row">
                <div className="form-group"><label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}><input type="checkbox" checked={form.iibb} onChange={e => F('iibb', e.target.checked)} style={{ width: 14, height: 14 }} />Inscripto en IIBB</label></div>
                {form.iibb && <div className="form-group"><label className="form-label">N. IIBB</label><input className="form-input" value={form.nroiibb} onChange={e => F('nroiibb', e.target.value)} /></div>}
              </div>
            </div>
            <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={save}>{modal === 'create' ? 'Crear cliente' : 'Guardar'}</button></div>
          </div>
        </div>
      )}
      {modal === 'delete' && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd"><h3 className="modal-title">Eliminar cliente</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(null)}>x</button></div>
            <div className="modal-bd"><p>Eliminar a <strong>{sel?.nombre} {sel?.apellido}</strong>? Esta accion no se puede deshacer.</p></div>
            <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-danger" onClick={del}>Eliminar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ADMIN BILLING ──────────────────────────────────────────────
function AdminBilling() {
  const [, forceUpd] = useState(0)
  const clients = STORE.users.filter(u => u.role === 'client')
  const [filterC, setFilterC] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ uid: '', per: '', monto: '', desc: '' })
  const allInv = clients.flatMap(c => (STORE.inv[c.id] || []).map(i => ({ ...i, cnom: `${c.nombre} ${c.apellido}`, cid: c.id }))).sort((a, b) => b.per.localeCompare(a.per))
  const filtered = filterC ? allInv.filter(i => i.cid === filterC) : allInv
  const chartData = MN.map((mes, i) => { const p = `${ANIO}-${String(i + 1).padStart(2, '0')}`; return { mes, total: allInv.filter(f => f.per === p).reduce((s, f) => s + f.monto, 0) } })
  const save = () => {
    if (!form.uid || !form.per || !form.monto) return
    if (!STORE.inv[form.uid]) STORE.inv[form.uid] = []
    const idx = STORE.inv[form.uid].findIndex(i => i.per === form.per)
    if (idx > -1) STORE.inv[form.uid][idx] = { ...STORE.inv[form.uid][idx], monto: parseFloat(form.monto), desc: form.desc }
    else STORE.inv[form.uid].push({ id: 'i' + Date.now(), per: form.per, monto: parseFloat(form.monto), desc: form.desc })
    setModal(false); setForm({ uid: '', per: '', monto: '', desc: '' }); forceUpd(n => n + 1)
  }
  const resumen = clients.map(c => { const t = (STORE.inv[c.id] || []).reduce((s, i) => s + i.monto, 0); return { ...c, total: t, catSug: getCat(t), nec: t > 0 && getCat(t) !== c.fiscal.cat } })
  return (
    <div className="page">
      <div className="sec-hd"><div className="sec-title">Facturacion de clientes</div><button className="btn btn-primary" onClick={() => setModal(true)}>+ Cargar</button></div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd"><span className="card-title">Facturacion mensual {ANIO}</span></div>
        <div className="card-bd">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #DDE1EC', fontSize: 11 }} />
              <Bar dataKey="total" fill="#1B4FD8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd"><span className="card-title">Resumen anual por cliente</span></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Cat. actual</th><th>Facturado {ANIO}</th><th>Limite</th><th>Uso</th><th>Estado</th></tr></thead>
            <tbody>
              {resumen.map(c => { const lim = CATS[c.fiscal.cat]?.lim || 0; const pct = lim ? Math.min(Math.round((c.total / lim) * 100), 100) : 0; return (
                <tr key={c.id}>
                  <td className="fw6">{c.nombre} {c.apellido}</td>
                  <td><span className="badge badge-cat">{c.fiscal.cat}</span></td>
                  <td className="fw6">{fmt(c.total)}</td>
                  <td style={{ fontSize: 12, color: '#4A5568' }}>{fmt(lim)}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><div className="prog-track" style={{ height: 7, width: 72 }}><div className="prog-fill" style={{ width: `${pct}%`, background: progColor(pct) }} /></div><span style={{ fontSize: 11, fontWeight: 600 }}>{pct}%</span></div></td>
                  <td>{c.nec ? <span className="badge badge-orange">Cat. {c.catSug} [!]</span> : <span className="badge badge-green">OK</span>}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">Detalle mensual</span>
          <select className="form-input" style={{ maxWidth: 200, padding: '4px 26px 4px 9px', fontSize: 12, appearance: 'none' }} value={filterC} onChange={e => setFilterC(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
          </select>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Periodo</th><th>Monto</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={4}><div className="empty"><div className="empty-title">Sin datos</div></div></td></tr> :
                filtered.map(i => <tr key={i.id}><td className="fw6">{i.cnom}</td><td>{i.per}</td><td className="fw6">{fmt(i.monto)}</td><td><button className="btn btn-danger btn-sm" onClick={() => { STORE.inv[i.cid] = (STORE.inv[i.cid] || []).filter(x => x.id !== i.id); forceUpd(n => n + 1) }}>Borrar</button></td></tr>)
              }
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd"><h3 className="modal-title">Cargar facturacion</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(false)}>x</button></div>
            <div className="modal-bd">
              <div className="form-group"><label className="form-label">Cliente *</label><select className="form-input" style={{ appearance: 'none' }} value={form.uid} onChange={e => setForm(p => ({ ...p, uid: e.target.value }))}><option value="">Seleccionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Periodo *</label><input className="form-input" type="month" value={form.per} onChange={e => setForm(p => ({ ...p, per: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} placeholder="0" /></div>
              </div>
              <div className="form-group"><label className="form-label">Descripcion</label><input className="form-input" value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} /></div>
            </div>
            <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ADMIN IIBB ─────────────────────────────────────────────────
function AdminIIBB() {
  const [, forceUpd] = useState(0)
  const clients = STORE.users.filter(u => u.role === 'client' && u.fiscal.iibb)
  const [filterC, setFilterC] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ uid: '', per: '', base: '', alic: '3.5', estado: 'pendiente', fecha: '' })
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const allDJ = clients.flatMap(c => (STORE.iibb[c.id] || []).map(d => ({ ...d, cnom: `${c.nombre} ${c.apellido}`, cid: c.id }))).sort((a, b) => b.per.localeCompare(a.per))
  const filtered = filterC ? allDJ.filter(d => d.cid === filterC) : allDJ
  const totals = { pres: allDJ.filter(d => d.estado === 'presentada').length, pend: allDJ.filter(d => d.estado === 'pendiente').length, venc: allDJ.filter(d => d.estado === 'vencida').length, monto: allDJ.reduce((s, d) => s + d.monto, 0) }
  const calcM = Math.round((parseFloat(form.base) || 0) * (parseFloat(form.alic) || 0) / 100)
  const save = () => {
    if (!form.uid || !form.per || !form.base) return
    if (!STORE.iibb[form.uid]) STORE.iibb[form.uid] = []
    STORE.iibb[form.uid].push({ id: 'dj' + Date.now(), per: form.per, base: parseFloat(form.base), alic: parseFloat(form.alic), monto: calcM, estado: form.estado, fecha: form.fecha || '' })
    setModal(false); setForm({ uid: '', per: '', base: '', alic: '3.5', estado: 'pendiente', fecha: '' }); forceUpd(n => n + 1)
  }
  const markP = (cid, djid) => { const djs = STORE.iibb[cid] || []; const idx = djs.findIndex(d => d.id === djid); if (idx > -1) { djs[idx].estado = 'presentada'; djs[idx].fecha = new Date().toISOString().slice(0, 10) }; forceUpd(n => n + 1) }
  return (
    <div className="page">
      <div className="sec-hd"><div className="sec-title">IIBB / Declaraciones Juradas</div><button className="btn btn-primary" onClick={() => setModal(true)}>+ Cargar DJ</button></div>
      <div className="mq4">
        <div className="metric"><div className="m-lbl">Presentadas</div><div className="m-val" style={{ color: '#0A6E3E' }}>{totals.pres}</div></div>
        <div className="metric"><div className="m-lbl">Pendientes</div><div className="m-val" style={{ color: '#C45A0A' }}>{totals.pend}</div></div>
        <div className="metric"><div className="m-lbl">Vencidas</div><div className="m-val" style={{ color: '#C0291A' }}>{totals.venc}</div></div>
        <div className="metric"><div className="m-lbl">Total declarado</div><div className="m-val" style={{ fontSize: 17 }}>{fmt(totals.monto)}</div></div>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-bd" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <select className="form-input" style={{ maxWidth: 260, appearance: 'none' }} value={filterC} onChange={e => setFilterC(e.target.value)}>
            <option value="">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Periodo</th><th>Base Imponible</th><th>Alicuota</th><th>Monto</th><th>Estado</th><th>Presentacion</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><div className="empty-title">Sin declaraciones</div></div></td></tr> :
                filtered.map(dj => <tr key={dj.id}><td className="fw6">{dj.cnom}</td><td>{dj.per}</td><td>{fmt(dj.base)}</td><td>{dj.alic}%</td><td className="fw6">{fmt(dj.monto)}</td><td><span className={`badge ${dj.estado === 'presentada' ? 'badge-green' : dj.estado === 'vencida' ? 'badge-red' : 'badge-orange'}`}>{dj.estado}</span></td><td style={{ fontSize: 12, color: '#4A5568' }}>{dj.fecha || '-'}</td><td>{dj.estado !== 'presentada' && <button className="btn btn-success btn-sm" onClick={() => markP(dj.cid, dj.id)}>Marcar presentada</button>}</td></tr>)
              }
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd"><h3 className="modal-title">Cargar DJ de IIBB</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(false)}>x</button></div>
            <div className="modal-bd">
              <div className="form-group"><label className="form-label">Cliente *</label><select className="form-input" style={{ appearance: 'none' }} value={form.uid} onChange={e => F('uid', e.target.value)}><option value="">Seleccionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido} - IIBB: {c.fiscal.nroiibb}</option>)}</select></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Periodo *</label><input className="form-input" type="month" value={form.per} onChange={e => F('per', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Estado</label><select className="form-input" style={{ appearance: 'none' }} value={form.estado} onChange={e => F('estado', e.target.value)}><option value="pendiente">Pendiente</option><option value="presentada">Presentada</option><option value="vencida">Vencida</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Base Imponible *</label><input className="form-input" type="number" value={form.base} onChange={e => F('base', e.target.value)} placeholder="0" /></div>
                <div className="form-group"><label className="form-label">Alicuota %</label><input className="form-input" type="number" step="0.1" value={form.alic} onChange={e => F('alic', e.target.value)} /></div>
              </div>
              {form.base && <div className="alert-box alert-info" style={{ marginBottom: 0 }}>Monto calculado: <strong>{fmt(calcM)}</strong></div>}
              <div className="form-group" style={{ marginTop: 12 }}><label className="form-label">Fecha presentacion</label><input className="form-input" type="date" value={form.fecha} onChange={e => F('fecha', e.target.value)} /></div>
            </div>
            <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar DJ</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ADMIN PAYMENTS ─────────────────────────────────────────────
function AdminPay() {
  const [, forceUpd] = useState(0)
  const clients = STORE.users.filter(u => u.role === 'client')
  const [filterC, setFilterC] = useState('')
  const [filterE, setFilterE] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ uid: '', tipo: 'monotributo', per: '', monto: '', estado: 'pendiente', venc: '', fpago: '' })
  const F = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const allPay = clients.flatMap(c => (STORE.pay[c.id] || []).map(p => ({ ...p, cnom: `${c.nombre} ${c.apellido}`, cid: c.id }))).sort((a, b) => b.per.localeCompare(a.per))
  const filtered = allPay.filter(p => (!filterC || p.cid === filterC) && (!filterE || p.estado === filterE))
  const totals = { pag: allPay.filter(p => p.estado === 'pagado').length, pend: allPay.filter(p => p.estado === 'pendiente').length, venc: allPay.filter(p => p.estado === 'vencido').length }
  const markPaid = (cid, pid) => { const ps = STORE.pay[cid] || []; const idx = ps.findIndex(p => p.id === pid); if (idx > -1) { ps[idx].estado = 'pagado'; ps[idx].fpago = new Date().toISOString().slice(0, 10) }; forceUpd(n => n + 1) }
  const save = () => {
    if (!form.uid || !form.per || !form.monto) return
    if (!STORE.pay[form.uid]) STORE.pay[form.uid] = []
    STORE.pay[form.uid].push({ id: 'p' + Date.now(), tipo: form.tipo, per: form.per, monto: parseFloat(form.monto), estado: form.estado, venc: form.venc || '', fpago: form.fpago || '' })
    setModal(false); setForm({ uid: '', tipo: 'monotributo', per: '', monto: '', estado: 'pendiente', venc: '', fpago: '' }); forceUpd(n => n + 1)
  }
  return (
    <div className="page">
      <div className="sec-hd"><div className="sec-title">Gestion de Pagos</div><button className="btn btn-primary" onClick={() => setModal(true)}>+ Registrar pago</button></div>
      <div className="mq3">
        <div className="metric"><div className="m-lbl">Pagados</div><div className="m-val" style={{ color: '#0A6E3E' }}>{totals.pag}</div></div>
        <div className="metric"><div className="m-lbl">Pendientes</div><div className="m-val" style={{ color: '#C45A0A' }}>{totals.pend}</div></div>
        <div className="metric"><div className="m-lbl">Vencidos</div><div className="m-val" style={{ color: '#C0291A' }}>{totals.venc}</div></div>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-bd" style={{ paddingTop: 12, paddingBottom: 12, display: 'flex', gap: 10 }}>
          <select className="form-input" style={{ maxWidth: 230, appearance: 'none' }} value={filterC} onChange={e => setFilterC(e.target.value)}><option value="">Todos los clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select>
          <select className="form-input" style={{ maxWidth: 150, appearance: 'none' }} value={filterE} onChange={e => setFilterE(e.target.value)}><option value="">Todos</option><option value="pagado">Pagado</option><option value="pendiente">Pendiente</option><option value="vencido">Vencido</option></select>
        </div>
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Tipo</th><th>Periodo</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th>Fecha pago</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8}><div className="empty"><div className="empty-title">Sin pagos</div></div></td></tr> :
                filtered.map(p => <tr key={p.id}><td className="fw6">{p.cnom}</td><td><span className="badge badge-gray">{p.tipo === 'monotributo' ? 'Monotributo' : 'IIBB'}</span></td><td>{p.per}</td><td className="fw6">{fmt(p.monto)}</td><td style={{ fontSize: 12, color: p.estado === 'vencido' ? '#C0291A' : '#4A5568' }}>{p.venc || '-'}</td><td><span className={`badge ${p.estado === 'pagado' ? 'badge-green' : p.estado === 'vencido' ? 'badge-red' : 'badge-orange'}`}>{p.estado}</span></td><td style={{ fontSize: 12, color: '#4A5568' }}>{p.fpago || '-'}</td><td>{p.estado !== 'pagado' && <button className="btn btn-success btn-sm" onClick={() => markPaid(p.cid, p.id)}>Marcar pagado</button>}</td></tr>)
              }
            </tbody>
          </table>
        </div>
      </div>
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hd"><h3 className="modal-title">Registrar pago</h3><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }} onClick={() => setModal(false)}>x</button></div>
            <div className="modal-bd">
              <div className="form-group"><label className="form-label">Cliente *</label><select className="form-input" style={{ appearance: 'none' }} value={form.uid} onChange={e => F('uid', e.target.value)}><option value="">Seleccionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}</select></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Tipo</label><select className="form-input" style={{ appearance: 'none' }} value={form.tipo} onChange={e => F('tipo', e.target.value)}><option value="monotributo">Monotributo</option><option value="iibb">Ingresos Brutos</option></select></div>
                <div className="form-group"><label className="form-label">Periodo *</label><input className="form-input" type="month" value={form.per} onChange={e => F('per', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Monto *</label><input className="form-input" type="number" value={form.monto} onChange={e => F('monto', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Estado</label><select className="form-input" style={{ appearance: 'none' }} value={form.estado} onChange={e => F('estado', e.target.value)}><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Fecha vencimiento</label><input className="form-input" type="date" value={form.venc} onChange={e => F('venc', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Fecha pago</label><input className="form-input" type="date" value={form.fpago} onChange={e => F('fpago', e.target.value)} /></div>
              </div>
            </div>
            <div className="modal-ft"><button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Guardar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ADMIN MESSAGES ─────────────────────────────────────────────
function AdminMsgs() {
  const clients = STORE.users.filter(u => u.role === 'client')
  const [selC, setSelC] = useState(clients[0]?.id || '')
  const [, forceUpd] = useState(0)
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [selC, forceUpd])
  const msgs = STORE.msgs[selC] || []
  const send = () => {
    if (!input.trim() || !selC) return
    if (!STORE.msgs[selC]) STORE.msgs[selC] = []
    STORE.msgs[selC].push({ id: 'm' + Date.now(), from: 'admin', txt: input, fecha: new Date().toISOString(), leido: true })
    setInput(''); forceUpd(n => n + 1)
  }
  return (
    <div className="page">
      <div className="sec-hd"><div className="sec-title">Mensajes con clientes</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14, height: 'calc(100vh - 180px)' }}>
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #DDE1EC', fontWeight: 700, fontSize: 12.5 }}>Conversaciones</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {clients.map(c => { const ms = STORE.msgs[c.id] || []; const last = ms[ms.length - 1]; const un = ms.filter(m => m.from === 'client' && !m.leido).length; return (
              <div key={c.id} onClick={() => setSelC(c.id)} style={{ padding: '10px 14px', cursor: 'pointer', background: selC === c.id ? '#EEF3FF' : 'transparent', borderLeft: selC === c.id ? '3px solid #1B4FD8' : '3px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5 }}>{c.nombre} {c.apellido}</div>
                  {un > 0 && <span className="badge badge-blue" style={{ fontSize: 9 }}>{un}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#4A5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{last ? (last.from === 'admin' ? 'Vos: ' : '') + last.txt : 'Sin mensajes'}</div>
              </div>
            )})}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selC ? <>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #DDE1EC', fontWeight: 700, fontSize: 13 }}>{clients.find(c => c.id === selC)?.nombre} {clients.find(c => c.id === selC)?.apellido}</div>
            <div className="chat-msgs" style={{ flex: 1, maxHeight: 'none' }}>
              {msgs.length === 0 ? <div className="empty" style={{ margin: 'auto' }}>Sin mensajes</div> :
                msgs.map(m => <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.from === 'admin' ? 'flex-end' : 'flex-start' }}>
                  <div className={`bubble bubble-${m.from}`}>{m.txt}</div>
                  <div style={{ fontSize: 9.5, opacity: .55, marginTop: 3, color: '#4A5568' }}>{new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
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

// ── CALENDARIO ─────────────────────────────────────────────────
function Calendario() {
  const today = new Date()
  const [mes, setMes] = useState(today.getMonth() + 1)
  const [anio, setAnio] = useState(today.getFullYear())
  const diasMes = new Date(anio, mes, 0).getDate()
  const primerDia = new Date(anio, mes - 1, 1).getDay()
  const offset = primerDia === 0 ? 6 : primerDia - 1
  const venc = [{ dia: 20, lbl: 'Monotributo', tipo: 'mt', col: '#1B4FD8' }, { dia: 15, lbl: 'IIBB', tipo: 'ib', col: '#0A6E3E' }, ...((mes === 1 || mes === 7) ? [{ dia: 20, lbl: 'Recategorizacion', tipo: 'rc', col: '#C45A0A' }] : [])]
  const cellEvs = {}; venc.forEach(v => { if (!cellEvs[v.dia]) cellEvs[v.dia] = []; cellEvs[v.dia].push(v) })
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
        <div className="card">
          <div className="card-hd"><span className="card-title">Vencimientos del mes</span></div>
          <div className="card-bd" style={{ paddingTop: 10 }}>
            <div className="alert-box alert-info" style={{ marginBottom: 8 }}>Dia 20 - Monotributo: pago cuota mensual</div>
            <div className="alert-box alert-success" style={{ marginBottom: 8 }}>Dia 15 - Ingresos Brutos: declaracion jurada</div>
            {(mes === 1 || mes === 7) && <div className="alert-box alert-warn">Recategorizacion: del 1 al 20 de {mes === 1 ? 'enero' : 'julio'}</div>}
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">Referencias</span></div>
          <div className="card-bd" style={{ paddingTop: 10 }}>
            {[{ col: '#1B4FD8', txt: 'MT - Monotributo (dia 20)' }, { col: '#0A6E3E', txt: 'IB - Ingresos Brutos (dia 15)' }, { col: '#C45A0A', txt: 'RC - Recategorizacion (ene/jul)' }].map((r, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, fontSize: 13 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: r.col, flexShrink: 0 }} />{r.txt}</div>)}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-bd">
          <div className="cal-grid" style={{ marginBottom: 7 }}>{['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: '#4A5568', paddingBottom: 5 }}>{d}</div>)}</div>
          <div className="cal-grid">
            {cells.map((dia, i) => { const isToday = dia === today.getDate() && mes === today.getMonth() + 1 && anio === today.getFullYear(); const evs = dia ? cellEvs[dia] : null; return (
              <div key={i} className={`cal-cell${isToday ? ' cal-cell-today' : evs ? ' cal-cell-event' : ''}`}>
                {dia && <>
                  <div className="cal-day" style={isToday ? { color: '#fff', fontWeight: 700 } : {}}>{dia}</div>
                  {evs?.map((ev, j) => <div key={j} className="cal-ev" style={{ color: isToday ? 'rgba(255,255,255,.9)' : ev.col }}>{ev.tipo === 'mt' ? 'MT' : ev.tipo === 'ib' ? 'IB' : 'RC'}</div>)}
                </>}
              </div>
            )})}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── CLIENT DASHBOARD ───────────────────────────────────────────
function ClientDash({ user }) {
  const invs = STORE.inv[user.id] || []
  const pays = STORE.pay[user.id] || []
  const mes = new Date().getMonth() + 1
  const cat = user.fiscal?.cat || 'A'
  const total = invs.reduce((s, f) => s + f.monto, 0)
  const pct = getPct(total, cat)
  const rest = getRest(total, cat)
  const proy = getProy(total, mes)
  const catP = getCat(proy)
  const lim = CATS[cat]?.lim || 0
  const pends = pays.filter(p => p.estado === 'pendiente')
  const vends = pays.filter(p => p.estado === 'vencido')
  const chartData = MN.map((m, i) => { const p = `${ANIO}-${String(i + 1).padStart(2, '0')}`; const f = invs.find(f => f.per === p); return { mes: m, monto: f ? f.monto : 0 } })
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
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-bd">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 13 }}>Progreso - Categoria {cat}</div><div style={{ fontWeight: 700, fontSize: 12.5, color: progColor(pct) }}>{pct}%</div></div>
          <div className="prog-track" style={{ height: 14 }}><div className="prog-fill" style={{ width: `${pct}%`, background: progColor(pct) }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, color: '#4A5568' }}><span>$0</span><span style={{ fontWeight: 600, color: '#0D1117' }}>{fmt(total)} facturado</span><span>Limite: {fmt(lim)}</span></div>
          {pct < 90 && <div style={{ marginTop: 8, fontSize: 12, color: '#4A5568' }}>Te quedan <strong style={{ color: '#0D1117' }}>{fmt(rest)}</strong> para llegar al limite.</div>}
        </div>
      </div>
      <div className="g2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-hd"><span className="card-title">Facturacion mensual {ANIO}</span></div>
          <div className="card-bd">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #DDE1EC', fontSize: 11 }} />
                <Bar dataKey="monto" fill="#1B4FD8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><span className="card-title">Proximos pagos</span><a href="https://monotributo.economy.gob.ar/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Pagar en ARCA</a></div>
          <div className="card-bd" style={{ paddingTop: 10 }}>
            {vends.length === 0 && pends.length === 0 ? <div style={{ color: '#0A6E3E', fontWeight: 600 }}>Todos los pagos al dia</div> :
              [...vends, ...pends].map(p => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ECEEF4' }}>
                <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.tipo === 'monotributo' ? 'Monotributo' : 'IIBB'}</div><div style={{ fontSize: 11, color: '#4A5568' }}>Vence: {fmtF(p.venc)}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{fmt(p.monto)}</div><span className={`badge ${p.estado === 'vencido' ? 'badge-red' : 'badge-orange'}`}>{p.estado}</span></div>
              </div>)
            }
          </div>
        </div>
      </div>
      <div style={{ height: 420 }}><AIAsist /></div>
    </div>
  )
}

// ── CLIENT BILLING ─────────────────────────────────────────────
function ClientBill({ user }) {
  const invs = STORE.inv[user.id] || []
  const mes = new Date().getMonth() + 1
  const cat = user.fiscal?.cat || 'A'
  const total = invs.reduce((s, f) => s + f.monto, 0)
  const pct = getPct(total, cat)
  const lim = CATS[cat]?.lim || 0
  const prom = mes > 0 ? Math.round(total / mes) : 0
  const proy = getProy(total, mes)
  const catP = getCat(proy)
  const chartData = MN.map((m, i) => { const p = `${ANIO}-${String(i + 1).padStart(2, '0')}`; const f = invs.find(f => f.per === p); return { mes: m, monto: f ? f.monto : 0 } })
  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 16 }}>Mi Facturacion</div>
      <div className="mq4">
        <div className="metric"><div className="m-lbl">Total {ANIO}</div><div className="m-val" style={{ fontSize: 18 }}>{fmt(total)}</div><div className="m-sub">{pct}% del limite</div></div>
        <div className="metric"><div className="m-lbl">Promedio mensual</div><div className="m-val" style={{ fontSize: 18 }}>{fmt(prom)}</div><div className="m-sub">{mes} mes{mes > 1 ? 'es' : ''} analizados</div></div>
        <div className="metric"><div className="m-lbl">Proyeccion anual</div><div className="m-val" style={{ fontSize: 17 }}>{fmt(proy)}</div><div className="m-sub">Cat. proyectada: <strong>{catP}</strong></div></div>
        <div className="metric"><div className="m-lbl">Limite cat. {cat}</div><div className="m-val" style={{ fontSize: 17 }}>{fmt(lim)}</div><div className="m-sub">Quedan: {fmt(Math.max(lim - total, 0))}</div></div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-bd">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontWeight: 700, fontSize: 13 }}>Uso del limite anual - Categoria {cat}</span><span style={{ fontWeight: 700, fontSize: 12.5, color: progColor(pct) }}>{pct}% utilizado</span></div>
          <div className="prog-track" style={{ height: 16 }}><div className="prog-fill" style={{ width: `${pct}%`, background: progColor(pct) }} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, color: '#4A5568' }}><span>$0</span><span style={{ fontWeight: 600, color: '#0D1117' }}>{fmt(total)} facturado</span><span>Limite: {fmt(lim)}</span></div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd"><span className="card-title">Facturacion mensual {ANIO}</span></div>
        <div className="card-bd">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#4A5568' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 8, border: '1px solid #DDE1EC', fontSize: 11 }} />
              <Bar dataKey="monto" fill="#1B4FD8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <div className="card-hd"><span className="card-title">Detalle mensual</span></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Mes</th><th>Periodo</th><th>Monto</th><th>Acumulado</th></tr></thead>
            <tbody>
              {invs.length === 0 ? <tr><td colSpan={4}><div className="empty"><div className="empty-title">Sin datos</div><p style={{ fontSize: 12 }}>Tu contador carga estos datos</p></div></td></tr> :
                [...invs].reverse().map(f => { const mi = parseInt(f.per.split('-')[1]) - 1; const acum = invs.filter(fi => fi.per <= f.per).reduce((s, fi) => s + fi.monto, 0); return <tr key={f.id}><td className="fw6">{MF[mi]}</td><td style={{ fontSize: 12, color: '#4A5568' }}>{f.per}</td><td className="fw6">{fmt(f.monto)}</td><td style={{ color: '#4A5568' }}>{fmt(acum)}</td></tr> })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── CLIENT IIBB ────────────────────────────────────────────────
function ClientIIBB({ user }) {
  const djs = STORE.iibb[user.id] || []
  if (!user.fiscal?.iibb) return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 16 }}>IIBB / Declaraciones Juradas</div>
      <div className="card"><div className="card-bd"><div className="empty"><div className="empty-title">No estas inscripto en Ingresos Brutos</div><p style={{ fontSize: 12.5 }}>Si necesitas inscribirte, contacta a Franco.</p></div></div></div>
    </div>
  )
  const totals = { pres: djs.filter(d => d.estado === 'presentada').length, pend: djs.filter(d => d.estado === 'pendiente').length, venc: djs.filter(d => d.estado === 'vencida').length, monto: djs.reduce((s, d) => s + d.monto, 0) }
  return (
    <div className="page">
      <div className="sec-hd"><div><div className="sec-title">IIBB / Declaraciones Juradas</div><div style={{ fontSize: 12, color: '#4A5568' }}>N. IIBB: {user.fiscal.nroiibb}</div></div><a href="https://www.agip.gob.ar/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Portal AGIP</a></div>
      <div className="mq4">
        <div className="metric"><div className="m-lbl">Presentadas</div><div className="m-val" style={{ color: '#0A6E3E' }}>{totals.pres}</div></div>
        <div className="metric"><div className="m-lbl">Pendientes</div><div className="m-val" style={{ color: '#C45A0A' }}>{totals.pend}</div></div>
        <div className="metric"><div className="m-lbl">Vencidas</div><div className="m-val" style={{ color: '#C0291A' }}>{totals.venc}</div></div>
        <div className="metric"><div className="m-lbl">Total declarado</div><div className="m-val" style={{ fontSize: 17 }}>{fmt(totals.monto)}</div></div>
      </div>
      {totals.pend > 0 && <div className="alert-box alert-info" style={{ marginBottom: 12 }}>Tenes {totals.pend} declaracion{totals.pend > 1 ? 'es' : ''} pendiente{totals.pend > 1 ? 's' : ''}. Tu contador Franco se encarga de presentarlas.</div>}
      <div className="card">
        <div className="card-hd"><span className="card-title">Historial de Declaraciones</span></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Periodo</th><th>Base Imponible</th><th>Alicuota</th><th>Monto</th><th>Estado</th><th>Presentacion</th></tr></thead>
            <tbody>
              {djs.length === 0 ? <tr><td colSpan={6}><div className="empty"><div className="empty-title">Sin declaraciones</div></div></td></tr> :
                [...djs].reverse().map(dj => <tr key={dj.id}><td className="fw6">{dj.per}</td><td>{fmt(dj.base)}</td><td>{dj.alic}%</td><td className="fw6">{fmt(dj.monto)}</td><td><span className={`badge ${dj.estado === 'presentada' ? 'badge-green' : dj.estado === 'vencida' ? 'badge-red' : 'badge-orange'}`}>{dj.estado}</span></td><td style={{ fontSize: 12, color: '#4A5568' }}>{dj.fecha || '-'}</td></tr>)
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── CLIENT PAYMENTS ────────────────────────────────────────────
function ClientPay({ user }) {
  const pays = STORE.pay[user.id] || []
  const pagados = pays.filter(p => p.estado === 'pagado').sort((a, b) => b.per.localeCompare(a.per))
  const pends = pays.filter(p => p.estado === 'pendiente')
  const vends = pays.filter(p => p.estado === 'vencido')
  const totPag = pagados.reduce((s, p) => s + p.monto, 0)
  const totPend = [...pends, ...vends].reduce((s, p) => s + p.monto, 0)
  const Row = ({ p }) => <tr><td>{p.estado === 'pagado' ? '[OK]' : p.estado === 'vencido' ? '[!]' : '[.]'}</td><td><span className="badge badge-gray">{p.tipo === 'monotributo' ? 'Monotributo' : 'IIBB'}</span></td><td className="fw6">{p.per}</td><td className="fw6">{fmt(p.monto)}</td><td style={{ fontSize: 12, color: '#4A5568' }}>{fmtF(p.venc)}</td><td style={{ fontSize: 12, color: '#4A5568' }}>{fmtF(p.fpago)}</td><td><span className={`badge ${p.estado === 'pagado' ? 'badge-green' : p.estado === 'vencido' ? 'badge-red' : 'badge-orange'}`}>{p.estado}</span></td></tr>
  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 16 }}>Mis Pagos</div>
      <div className="mq3">
        <div className="metric"><div className="m-lbl">Total abonado {ANIO}</div><div className="m-val" style={{ fontSize: 18 }}>{fmt(totPag)}</div><div className="m-sub">{pagados.length} pagos realizados</div></div>
        <div className="metric"><div className="m-lbl">Pendiente de pago</div><div className="m-val" style={{ fontSize: 18, color: totPend > 0 ? '#C45A0A' : '#0A6E3E' }}>{fmt(totPend)}</div><div className="m-sub">{pends.length + vends.length} cuotas</div></div>
        <div className="metric"><div className="m-lbl">Vencidos</div><div className="m-val" style={{ color: vends.length > 0 ? '#C0291A' : '#0A6E3E' }}>{vends.length}</div><div className="m-sub">{vends.length === 0 ? 'Sin vencidos' : 'Regulariza cuanto antes'}</div></div>
      </div>
      {vends.length > 0 && <div className="alert-box alert-danger" style={{ marginBottom: 12 }}><strong>Tenes {vends.length} pago{vends.length > 1 ? 's' : ''} vencido{vends.length > 1 ? 's' : ''}.</strong><a href="https://monotributo.economy.gob.ar/" target="_blank" rel="noreferrer" className="btn btn-danger btn-sm" style={{ marginLeft: 10 }}>Pagar en ARCA</a></div>}
      {[...vends, ...pends].length > 0 && <div className="card" style={{ marginBottom: 14 }}><div className="card-hd"><span className="card-title">Pagos pendientes y vencidos</span><a href="https://monotributo.economy.gob.ar/" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Ir a pagar</a></div><div className="tbl-wrap"><table><thead><tr><th></th><th>Tipo</th><th>Periodo</th><th>Monto</th><th>Vencimiento</th><th>Fecha pago</th><th>Estado</th></tr></thead><tbody>{[...vends, ...pends].map(p => <Row key={p.id} p={p} />)}</tbody></table></div></div>}
      <div className="card"><div className="card-hd"><span className="card-title">Historial de pagos</span></div><div className="tbl-wrap"><table><thead><tr><th></th><th>Tipo</th><th>Periodo</th><th>Monto</th><th>Vencimiento</th><th>Fecha pago</th><th>Estado</th></tr></thead><tbody>{pagados.length === 0 ? <tr><td colSpan={7}><div className="empty"><div className="empty-title">Sin pagos</div></div></td></tr> : pagados.map(p => <Row key={p.id} p={p} />)}</tbody></table></div></div>
    </div>
  )
}

// ── CLIENT ALERTS ──────────────────────────────────────────────
function ClientAlerts({ user }) {
  const cat = user.fiscal?.cat || 'A'
  const invs = STORE.inv[user.id] || []
  const pays = STORE.pay[user.id] || []
  const mes = new Date().getMonth() + 1
  const total = invs.reduce((s, f) => s + f.monto, 0)
  const pct = getPct(total, cat)
  const rest = getRest(total, cat)
  const catC = getCat(total)
  const vends = pays.filter(p => p.estado === 'vencido')
  const pends = pays.filter(p => p.estado === 'pendiente')
  const alerts = []
  if (pct >= 90) alerts.push({ tipo: 'danger', t: 'Limite de categoria casi alcanzado', d: `Facturaste el ${pct}% del limite de la Categoria ${cat}. Te quedan ${fmt(rest)}. Consulta con Franco urgente.` })
  else if (pct >= 70) alerts.push({ tipo: 'warn', t: 'Acercandote al limite', d: `Facturaste ${pct}% del limite de tu categoria. Te quedan ${fmt(rest)}.` })
  if (total > 0 && catC !== cat) alerts.push({ tipo: 'warn', t: 'Revision de categoria', d: `Segun tu facturacion (${fmt(total)}), deberias estar en Categoria ${catC}. Habla con Franco.` })
  if (vends.length > 0) alerts.push({ tipo: 'danger', t: `${vends.length} pago${vends.length > 1 ? 's' : ''} vencido${vends.length > 1 ? 's' : ''}`, d: 'Tenes pagos sin abonar con fecha vencida. Regulariza para evitar multas.' })
  if (pends.length > 0) alerts.push({ tipo: 'info', t: `${pends.length} pago${pends.length > 1 ? 's' : ''} proximo${pends.length > 1 ? 's' : ''}`, d: 'El monotributo vence el dia 20 de cada mes.' })
  if (mes === 1 || mes === 7) alerts.push({ tipo: 'info', t: 'Periodo de recategorizacion', d: 'Estamos en periodo de recategorizacion. Tu contador revisara si corresponde cambiar tu categoria.' })
  if (alerts.length === 0) alerts.push({ tipo: 'success', t: 'Todo en orden', d: 'No tenes alertas pendientes. Tus pagos estan al dia y tu facturacion esta dentro del limite.' })
  return (
    <div className="page">
      <div className="sec-title" style={{ marginBottom: 16 }}>Alertas y Avisos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map((a, i) => <div key={i} className={`alert-box alert-${a.tipo}`} style={{ padding: '14px 16px' }}><div><div style={{ fontWeight: 700, marginBottom: 3 }}>{a.t}</div><div style={{ fontSize: 12.5, opacity: .9 }}>{a.d}</div></div></div>)}
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-hd"><span className="card-title">Fechas clave</span></div>
        <div className="card-bd" style={{ paddingTop: 10 }}>
          {[{ dia: 'Dia 20 de cada mes', desc: 'Vencimiento Monotributo', col: '#1B4FD8' }, { dia: 'Dia 15 de cada mes', desc: 'Vencimiento IIBB', col: '#0A6E3E' }, { dia: 'Enero y Julio', desc: 'Recategorizacion (del 1 al 20)', col: '#C45A0A' }, { dia: 'Diciembre', desc: 'Revisar proyeccion anual', col: '#B8860B' }].map((f, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < 3 ? '1px solid #ECEEF4' : 'none' }}><div style={{ width: 9, height: 9, borderRadius: '50%', background: f.col, flexShrink: 0 }} /><div style={{ fontWeight: 700, fontSize: 12.5, minWidth: 155 }}>{f.dia}</div><div style={{ fontSize: 12.5, color: '#4A5568' }}>{f.desc}</div></div>)}
        </div>
      </div>
    </div>
  )
}

// ── CLIENT MESSAGES ────────────────────────────────────────────
function ClientMsgs({ user }) {
  const [, forceUpd] = useState(0)
  const [input, setInput] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [forceUpd])
  const msgs = STORE.msgs[user.id] || []
  const send = () => {
    if (!input.trim()) return
    if (!STORE.msgs[user.id]) STORE.msgs[user.id] = []
    STORE.msgs[user.id].push({ id: 'm' + Date.now(), from: 'client', txt: input, fecha: new Date().toISOString(), leido: false })
    setInput(''); forceUpd(n => n + 1)
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
              <div style={{ fontSize: 9.5, opacity: .55, marginTop: 3, color: '#4A5568' }}>{new Date(m.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            </div>)
          }
          <div ref={endRef} />
        </div>
        <div className="chat-inp-row"><input className="chat-inp" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Escribile a Franco..." /><button className="btn btn-primary btn-icon" onClick={send}>Enviar</button></div>
      </div>
    </div>
  )
}

// ── PAGE TITLES ────────────────────────────────────────────────
const TITLES = { adash: 'Dashboard', aclients: 'Clientes', abillin: 'Facturacion', aiibb: 'IIBB / DJ', apay: 'Gestion de Pagos', cal: 'Calendario Fiscal', amsgs: 'Mensajes', cdash: 'Mi Panel', cbill: 'Mi Facturacion', ciibb: 'IIBB / DJ', cpay: 'Mis Pagos', calerts: 'Alertas', cmsgs: 'Mensajes' }

// ── MAIN APP ───────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => { try { const s = localStorage.getItem('gf_u'); return s ? JSON.parse(s) : null } catch { return null } })
  const [page, setPage] = useState(null)
  useEffect(() => { if (user && !page) setPage(user.role === 'admin' ? 'adash' : 'cdash') }, [user])
  if (!user) return <Login setUser={setUser} />
  const renderPage = () => {
    if (user.role === 'admin') {
      if (page === 'adash') return <AdminDash setPage={setPage} />
      if (page === 'aclients') return <AdminClients />
      if (page === 'abillin') return <AdminBilling />
      if (page === 'aiibb') return <AdminIIBB />
      if (page === 'apay') return <AdminPay />
      if (page === 'amsgs') return <AdminMsgs />
      if (page === 'cal') return <Calendario />
    } else {
      if (page === 'cdash') return <ClientDash user={user} />
      if (page === 'cbill') return <ClientBill user={user} />
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
      <Sidebar user={user} page={page} setPage={setPage} setUser={setUser} />
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
