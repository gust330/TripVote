import { useState, useEffect } from 'react'
import { getRoom, createRoom, getVotes, insertVote } from './supabase.js'

// ─── Data ─────────────────────────────────────────────────────────────────────

const DESTINATIONS = [
  { id: 'praia',    label: '🏖️ Praia',          desc: 'Sol, mar e areia' },
  { id: 'cidade',   label: '🏙️ Cidade',          desc: 'Cultura, museus e noitada' },
  { id: 'montanha', label: '⛰️ Montanha',         desc: 'Natureza e aventura' },
  { id: 'parque',   label: '🎡 Parque Temático',  desc: 'Diversão garantida' },
  { id: 'festival', label: '🎵 Festival',          desc: 'Música e vibes' },
  { id: 'roadtrip', label: '🚗 Road Trip',         desc: 'Liberdade total' },
]

const ACTIVITIES = [
  { id: 'praia_act',   label: '🤿 Desportos aquáticos' },
  { id: 'hiking',      label: '🥾 Caminhadas / Hiking' },
  { id: 'noitada',     label: '🕺 Noitadas / Bares' },
  { id: 'gastronomia', label: '🍽️ Gastronomia local' },
  { id: 'museus',      label: '🖼️ Museus e cultura' },
  { id: 'compras',     label: '🛍️ Compras' },
  { id: 'relaxar',     label: '😴 Relaxar / Spa' },
  { id: 'aventura',    label: '🪂 Aventura extrema' },
  { id: 'fotos',       label: '📸 Turismo fotográfico' },
  { id: 'festas',      label: '🎉 Festas e eventos' },
]

const DURATIONS = [
  { id: '3d',  label: '3 dias',   desc: 'Fuga rápida' },
  { id: '5d',  label: '5 dias',   desc: 'A clássica' },
  { id: '7d',  label: '1 semana', desc: 'A completa' },
  { id: '10d', label: '10 dias',  desc: 'Máximo aproveitamento' },
]

const BUDGETS = [
  { id: 'low',  label: '💸 Económico',  desc: 'até €300',   range: [0,   300]  },
  { id: 'mid',  label: '💳 Moderado',   desc: '€300–€600',  range: [300, 600]  },
  { id: 'high', label: '💎 Premium',    desc: '€600–€1000', range: [600, 1000] },
  { id: 'flex', label: '🤑 Sem limites',desc: '+€1000',     range: [1000,9999] },
]

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const EMPTY = { name:'', destination:[], duration:[], months:[], budget:'', activities:[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genCode() { return Math.random().toString(36).slice(2,8).toUpperCase() }

function getRoomFromHash() {
  const m = window.location.hash.match(/room=([A-Z0-9]{6})/i)
  return m ? m[1].toUpperCase() : null
}
function setHash(code) { window.location.hash = code ? `room=${code}` : '' }

function tally(votes, field, opts) {
  const c = {}
  votes.forEach(v => {
    const val = v[field]
    if (Array.isArray(val)) val.forEach(x => { c[x] = (c[x]||0)+1 })
    else if (val) c[val] = (c[val]||0)+1
  })
  return opts.map(o => ({ ...o, count: c[o.id]||0 })).sort((a,b) => b.count-a.count)
}

function avgBudget(votes) {
  const chosen = votes.map(v => BUDGETS.find(b => b.id===v.budget)).filter(Boolean)
  if (!chosen.length) return null
  return Math.round(chosen.reduce((s,b) => s+(b.range[0]+b.range[1])/2, 0) / chosen.length)
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Tag({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 18px', borderRadius:'100px',
      border: active ? '2px solid var(--ac)' : '2px solid rgba(255,255,255,.12)',
      background: active ? 'var(--ac)' : 'rgba(255,255,255,.05)',
      color: active ? '#000' : 'rgba(255,255,255,.8)',
      fontFamily:"'Space Mono',monospace", fontSize:'.78rem',
      cursor:'pointer', transition:'all .2s', fontWeight: active?'700':'400',
    }}>{children}</button>
  )
}

function Card({ children, style={} }) {
  return (
    <div style={{
      background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
      borderRadius:'20px', padding:'24px', ...style,
    }}>{children}</div>
  )
}

function Lbl({ children }) {
  return (
    <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.6rem',letterSpacing:'.15em',
      textTransform:'uppercase',color:'var(--ac)',marginBottom:'16px'}}>
      {children}
    </div>
  )
}

function Bar({ count, total }) {
  return (
    <div style={{height:'7px',background:'rgba(255,255,255,.08)',borderRadius:'99px',overflow:'hidden',marginTop:'7px'}}>
      <div style={{height:'100%',width:`${total?(count/total)*100:0}%`,
        background:'linear-gradient(90deg,var(--ac),#00e5ff)',borderRadius:'99px',
        transition:'width 1s cubic-bezier(.34,1.56,.64,1)'}}/>
    </div>
  )
}

function Spin() {
  return <span style={{display:'inline-block',animation:'spin .7s linear infinite'}}>⟳</span>
}

function ShareBox({ code }) {
  const [ok, setOk] = useState(false)
  const url = window.location.origin + window.location.pathname + `#room=${code}`
  function copy() {
    navigator.clipboard.writeText(url).then(() => { setOk(true); setTimeout(()=>setOk(false),2000) })
  }
  return (
    <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
      <div style={{flex:1,padding:'10px 14px',borderRadius:'12px',
        background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',
        fontFamily:"'Space Mono',monospace",fontSize:'.68rem',color:'rgba(255,255,255,.45)',
        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{url}</div>
      <button onClick={copy} className="btn-p" style={{padding:'10px 16px',fontSize:'.72rem'}}>
        {ok ? '✓ Copiado!' : 'Copiar link'}
      </button>
    </div>
  )
}

function Progress({ step }) {
  const labels = ['destino','datas','orçamento','atividades']
  return (
    <div style={{marginBottom:'36px'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
        {labels.map((l,i) => (
          <span key={l} style={{fontFamily:"'Space Mono',monospace",fontSize:'.6rem',
            textTransform:'uppercase',letterSpacing:'.1em',
            color:step-1>i?'var(--ac)':'rgba(255,255,255,.25)',transition:'color .3s'}}>{l}</span>
        ))}
      </div>
      <div style={{height:'3px',background:'rgba(255,255,255,.08)',borderRadius:'99px',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${((step-1)/4)*100}%`,
          background:'linear-gradient(90deg,var(--ac),#00e5ff)',borderRadius:'99px',
          transition:'width .5s cubic-bezier(.34,1.56,.64,1)'}}/>
      </div>
    </div>
  )
}

// ─── Global CSS ───────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');
  :root { --ac:#c8f135; }
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:#0a0c0e; font-family:'Syne',sans-serif; color:#fff; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-thumb { background:var(--ac); border-radius:4px; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to { transform:rotate(360deg) } }
  @keyframes pulse  { 0%,100%{box-shadow:0 0 0 0 rgba(200,241,53,.35)} 50%{box-shadow:0 0 0 14px rgba(200,241,53,0)} }
  .fu    { animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both; }
  .pulse { animation:pulse 2.2s infinite; }
  .btn-p {
    background:var(--ac); color:#000; border:none; padding:14px 30px; border-radius:100px;
    font-family:'Space Mono',monospace; font-size:.85rem; font-weight:700; cursor:pointer;
    letter-spacing:.05em; text-transform:uppercase; transition:transform .15s,opacity .15s;
  }
  .btn-p:hover    { transform:translateY(-2px); opacity:.88; }
  .btn-p:disabled { opacity:.35; cursor:not-allowed; transform:none; }
  .btn-g {
    background:transparent; color:rgba(255,255,255,.5); border:1px solid rgba(255,255,255,.18);
    padding:12px 24px; border-radius:100px; font-family:'Space Mono',monospace;
    font-size:.8rem; cursor:pointer; transition:all .2s;
  }
  .btn-g:hover { color:#fff; border-color:rgba(255,255,255,.45); }
  .btn-g:disabled { opacity:.3; cursor:not-allowed; }
  .opt {
    padding:16px 20px; border-radius:16px; border:2px solid rgba(255,255,255,.1);
    background:rgba(255,255,255,.03); cursor:pointer; transition:all .2s;
    text-align:left; width:100%; color:#fff; font-family:'Syne',sans-serif;
  }
  .opt:hover { border-color:rgba(200,241,53,.4); background:rgba(200,241,53,.05); }
  .opt.on    { border-color:var(--ac); background:rgba(200,241,53,.1); }
  input {
    width:100%; padding:16px 20px; border-radius:14px;
    border:2px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05);
    color:#fff; font-size:1rem; font-family:'Syne',sans-serif;
    outline:none; transition:border-color .2s;
  }
  input:focus { border-color:var(--ac); }
  input::placeholder { color:rgba(255,255,255,.3); }
`

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage]         = useState('loading')
  const [roomCode, setRoomCode] = useState(null)
  const [roomName, setRoomName] = useState('')
  const [votes, setVotes]       = useState([])
  const [step, setStep]         = useState(1)
  const [cur, setCur]           = useState({...EMPTY})
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState(null)

  useEffect(() => {
    const code = getRoomFromHash()
    if (code) joinRoom(code)
    else setPage('home')
  }, [])

  // auto-refresh results every 15s
  useEffect(() => {
    if (page !== 'results' || !roomCode) return
    const id = setInterval(() => refreshVotes(roomCode), 15000)
    return () => clearInterval(id)
  }, [page, roomCode])

  async function refreshVotes(code) {
    const data = await getVotes(code)
    setVotes(data)
  }

  async function joinRoom(code) {
    setPage('loading'); setErr(null)
    const room = await getRoom(code)
    if (!room) { setErr(`Sala "${code}" não encontrada.`); setPage('home'); return }
    const v = await getVotes(code)
    setRoomCode(code); setRoomName(room.name); setVotes(v)
    setHash(code); setStep(1); setCur({...EMPTY}); setPage('vote')
  }

  async function handleCreateRoom(name) {
    setBusy(true)
    const code = genCode()
    const ok = await createRoom(code, name)
    if (!ok) { setErr('Erro ao criar sala. Tenta novamente.'); setBusy(false); return }
    setRoomCode(code); setRoomName(name); setVotes([])
    setHash(code); setStep(1); setCur({...EMPTY}); setPage('vote')
    setBusy(false)
  }

  async function submitVote() {
    setBusy(true)
    const ok = await insertVote(roomCode, cur)
    if (ok) {
      await refreshVotes(roomCode)
      setCur({...EMPTY}); setPage('results')
    } else {
      setErr('Erro ao guardar voto. Tenta novamente.')
    }
    setBusy(false)
  }

  function toggle(field, id) {
    setCur(p => ({ ...p, [field]: p[field].includes(id) ? p[field].filter(x=>x!==id) : [...p[field],id] }))
  }
  function single(field, id) {
    setCur(p => ({ ...p, [field]: p[field]===id ? '' : id }))
  }
  function setName(n) { setCur(p => ({ ...p, name: n })) }

  return (
    <>
      <style>{CSS}</style>
      <div style={{minHeight:'100vh',position:'relative',overflow:'hidden'}}>
        {/* bg glows */}
        <div style={{position:'fixed',top:'-30%',right:'-20%',width:'580px',height:'580px',
          background:'radial-gradient(circle,rgba(200,241,53,.07) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'fixed',bottom:'-20%',left:'-15%',width:'480px',height:'480px',
          background:'radial-gradient(circle,rgba(0,229,255,.05) 0%,transparent 70%)',pointerEvents:'none'}}/>

        <div style={{maxWidth:'640px',margin:'0 auto',padding:'36px 20px 100px'}}>

          {/* top bar */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'36px'}}>
            <div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.6rem',letterSpacing:'.2em',
                textTransform:'uppercase',color:'var(--ac)',marginBottom:'3px'}}>✈ Viagem do Secundário</div>
              <div style={{fontSize:'1.35rem',fontWeight:'800'}}>TripVote</div>
            </div>
            {roomCode && (
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.55rem',color:'rgba(255,255,255,.3)',
                  letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'3px'}}>sala</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:'1.05rem',fontWeight:'700',
                  color:'var(--ac)',letterSpacing:'.1em'}}>{roomCode}</div>
              </div>
            )}
          </div>

          {page==='loading' && (
            <div style={{textAlign:'center',paddingTop:'80px',color:'rgba(255,255,255,.4)',
              fontFamily:"'Space Mono',monospace",fontSize:'.9rem'}}>
              <Spin/> A carregar…
            </div>
          )}

          {page==='home' && (
            <Home onCreate={handleCreateRoom} onJoin={joinRoom} busy={busy} err={err}/>
          )}

          {page==='vote' && (
            <Vote step={step} setStep={setStep} cur={cur} toggle={toggle} single={single} setName={setName}
              roomName={roomName} roomCode={roomCode} votes={votes}
              onSubmit={submitVote} busy={busy}
              onResults={() => { refreshVotes(roomCode); setPage('results') }}/>
          )}

          {page==='results' && (
            <Results votes={votes} roomCode={roomCode} roomName={roomName}
              onVote={() => { setStep(1); setCur({...EMPTY}); setPage('vote') }}
              onRefresh={() => refreshVotes(roomCode)}/>
          )}

        </div>
      </div>
    </>
  )
}

// ─── Home ────────────────────────────────────────────────────────────────────

function Home({ onCreate, onJoin, busy, err }) {
  const [mode, setMode] = useState(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  return (
    <div className="fu">
      <h1 style={{fontSize:'clamp(2rem,8vw,3rem)',fontWeight:'800',lineHeight:'1.1',marginBottom:'20px'}}>
        A viagem<br/><span style={{color:'var(--ac)'}}>que vais</span><br/>lembrar sempre.
      </h1>
      <p style={{color:'rgba(255,255,255,.5)',fontFamily:"'Space Mono',monospace",fontSize:'.8rem',
        lineHeight:'1.8',marginBottom:'40px'}}>
        Cria um grupo, partilha o link — cada amigo vota no seu telemóvel e os resultados ficam guardados online.
      </p>

      {err && (
        <Card style={{marginBottom:'20px',borderColor:'rgba(255,100,100,.3)'}}>
          <div style={{color:'#ff6b6b',fontFamily:"'Space Mono',monospace",fontSize:'.8rem'}}>⚠ {err}</div>
        </Card>
      )}

      {!mode && (
        <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
          <button className="btn-p pulse" onClick={()=>setMode('create')}>Criar grupo →</button>
          <button className="btn-g" onClick={()=>setMode('join')}>Entrar com código</button>
        </div>
      )}

      {mode==='create' && (
        <Card>
          <Lbl>Novo grupo</Lbl>
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="Nome do grupo  (ex: Turma 12ºA)" style={{marginBottom:'16px'}}/>
          <div style={{display:'flex',gap:'10px'}}>
            <button className="btn-g" onClick={()=>setMode(null)}>Cancelar</button>
            <button className="btn-p" disabled={!name.trim()||busy} onClick={()=>onCreate(name.trim())}>
              {busy?<Spin/>:'Criar →'}
            </button>
          </div>
        </Card>
      )}

      {mode==='join' && (
        <Card>
          <Lbl>Entrar numa sala</Lbl>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase().slice(0,6))}
            placeholder="Código da sala  (ex: AB1C2D)"
            style={{marginBottom:'16px',letterSpacing:'.2em',fontFamily:"'Space Mono',monospace"}}/>
          <div style={{display:'flex',gap:'10px'}}>
            <button className="btn-g" onClick={()=>setMode(null)}>Cancelar</button>
            <button className="btn-p" disabled={code.length<6} onClick={()=>onJoin(code)}>Entrar →</button>
          </div>
        </Card>
      )}

      <div style={{marginTop:'52px'}}>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.6rem',letterSpacing:'.2em',
          textTransform:'uppercase',color:'rgba(255,255,255,.22)',marginBottom:'18px'}}>Como funciona</div>
        {[
          ['01','Cria um grupo e copia o link'],
          ['02','Cada amigo abre o link e vota no seu telemóvel'],
          ['03','Os votos ficam guardados na base de dados'],
          ['04','Vê os resultados em tempo real e decide juntos!'],
        ].map(([n,t]) => (
          <div key={n} style={{display:'flex',gap:'16px',marginBottom:'14px'}}>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:'var(--ac)',minWidth:'24px',marginTop:'2px'}}>{n}</span>
            <span style={{color:'rgba(255,255,255,.52)',fontSize:'.88rem',lineHeight:'1.6'}}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Vote ────────────────────────────────────────────────────────────────────

function Vote({ step, setStep, cur, toggle, single, setName, roomName, roomCode, votes, onSubmit, busy, onResults }) {
  const dupe = cur.name && votes.some(v => v.name.toLowerCase()===cur.name.toLowerCase())

  return (
    <div className="fu">
      {/* room banner */}
      <Card style={{marginBottom:'24px',borderColor:'rgba(200,241,53,.15)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'12px',marginBottom:'16px'}}>
          <div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.55rem',letterSpacing:'.15em',
              textTransform:'uppercase',color:'rgba(255,255,255,.28)',marginBottom:'4px'}}>grupo</div>
            <div style={{fontWeight:'700',fontSize:'1rem'}}>{roomName}</div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.68rem',color:'rgba(255,255,255,.32)',marginTop:'3px'}}>
              {votes.length} voto{votes.length!==1?'s':''} registado{votes.length!==1?'s':''}
            </div>
          </div>
          <button className="btn-g" style={{padding:'8px 14px',fontSize:'.68rem'}} onClick={onResults}>
            Ver resultados
          </button>
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.55rem',letterSpacing:'.12em',
          textTransform:'uppercase',color:'rgba(255,255,255,.28)',marginBottom:'8px'}}>link para partilhar</div>
        <ShareBox code={roomCode}/>
      </Card>

      <Progress step={step}/>

      {/* Step 1 — nome + destino */}
      {step===1 && <>
        <h2 style={{fontSize:'1.75rem',fontWeight:'800',marginBottom:'8px'}}>Olá! Qual é o teu nome?</h2>
        <p style={{color:'rgba(255,255,255,.4)',fontFamily:"'Space Mono',monospace",fontSize:'.78rem',marginBottom:'22px'}}>
          Para sabermos quem votou em quê
        </p>
        <input value={cur.name} onChange={e=>setName(e.target.value)}
          placeholder="O teu nome…" style={{marginBottom: dupe?'8px':'28px'}}/>
        {dupe && (
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:'#ffaa33',marginBottom:'22px'}}>
            ⚠ Já existe um voto com este nome. Podes continuar mesmo assim.
          </div>
        )}

        <h3 style={{fontSize:'1.1rem',fontWeight:'700',marginBottom:'6px'}}>Tipo de destino?</h3>
        <p style={{color:'rgba(255,255,255,.35)',fontFamily:"'Space Mono',monospace",fontSize:'.7rem',marginBottom:'16px'}}>
          Podes escolher mais do que um
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'28px'}}>
          {DESTINATIONS.map(d => (
            <button key={d.id} className={`opt${cur.destination.includes(d.id)?' on':''}`}
              onClick={()=>toggle('destination',d.id)}>
              <div style={{fontSize:'1.3rem',marginBottom:'3px'}}>{d.label.split(' ')[0]}</div>
              <div style={{fontSize:'.88rem',fontWeight:'700'}}>{d.label.split(' ').slice(1).join(' ')}</div>
              <div style={{fontSize:'.7rem',color:'rgba(255,255,255,.38)',marginTop:'2px'}}>{d.desc}</div>
            </button>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <button className="btn-p" disabled={!cur.name.trim()||!cur.destination.length} onClick={()=>setStep(2)}>
            Continuar →
          </button>
        </div>
      </>}

      {/* Step 2 — datas */}
      {step===2 && <>
        <h2 style={{fontSize:'1.75rem',fontWeight:'800',marginBottom:'8px'}}>Quando queres ir?</h2>
        <p style={{color:'rgba(255,255,255,.4)',fontFamily:"'Space Mono',monospace",fontSize:'.78rem',marginBottom:'22px'}}>
          Marca os meses em que tens disponibilidade
        </p>
        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'28px'}}>
          {MONTHS.map((m,i) => (
            <Tag key={m} active={cur.months.includes(String(i+1))} onClick={()=>toggle('months',String(i+1))}>{m}</Tag>
          ))}
        </div>
        <h3 style={{fontSize:'1.05rem',fontWeight:'700',marginBottom:'14px'}}>Quantos dias?</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'28px'}}>
          {DURATIONS.map(d => (
            <button key={d.id} className={`opt${cur.duration.includes(d.id)?' on':''}`} onClick={()=>toggle('duration',d.id)}>
              <div style={{fontWeight:'700'}}>{d.label}</div>
              <div style={{fontSize:'.7rem',color:'rgba(255,255,255,.38)'}}>{d.desc}</div>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:'12px',justifyContent:'space-between'}}>
          <button className="btn-g" onClick={()=>setStep(1)}>← Voltar</button>
          <button className="btn-p" disabled={!cur.months.length||!cur.duration.length} onClick={()=>setStep(3)}>Continuar →</button>
        </div>
      </>}

      {/* Step 3 — orçamento */}
      {step===3 && <>
        <h2 style={{fontSize:'1.75rem',fontWeight:'800',marginBottom:'8px'}}>Qual é o teu orçamento?</h2>
        <p style={{color:'rgba(255,255,255,.4)',fontFamily:"'Space Mono',monospace",fontSize:'.78rem',marginBottom:'22px'}}>
          Valor total por pessoa — transporte + alojamento + despesas
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'28px'}}>
          {BUDGETS.map(b => (
            <button key={b.id} className={`opt${cur.budget===b.id?' on':''}`} onClick={()=>single('budget',b.id)}
              style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:'700'}}>{b.label}</span>
              <span style={{fontSize:'.8rem',color:'rgba(255,255,255,.45)',fontFamily:"'Space Mono',monospace"}}>{b.desc}</span>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:'12px',justifyContent:'space-between'}}>
          <button className="btn-g" onClick={()=>setStep(2)}>← Voltar</button>
          <button className="btn-p" disabled={!cur.budget} onClick={()=>setStep(4)}>Continuar →</button>
        </div>
      </>}

      {/* Step 4 — atividades + submit */}
      {step===4 && <>
        <h2 style={{fontSize:'1.75rem',fontWeight:'800',marginBottom:'8px'}}>O que queres fazer?</h2>
        <p style={{color:'rgba(255,255,255,.4)',fontFamily:"'Space Mono',monospace",fontSize:'.78rem',marginBottom:'22px'}}>
          Escolhe tudo o que te interessa
        </p>
        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'24px'}}>
          {ACTIVITIES.map(a => (
            <Tag key={a.id} active={cur.activities.includes(a.id)} onClick={()=>toggle('activities',a.id)}>{a.label}</Tag>
          ))}
        </div>
        <Card style={{marginBottom:'24px'}}>
          <Lbl>Resumo do teu voto — {cur.name}</Lbl>
          {[
            ['Destino',   cur.destination.map(id=>DESTINATIONS.find(d=>d.id===id)?.label).join(', ')],
            ['Meses',     cur.months.map(m=>MONTHS[+m-1]).join(', ')],
            ['Duração',   cur.duration.map(id=>DURATIONS.find(d=>d.id===id)?.label).join(', ')],
            ['Orçamento', BUDGETS.find(b=>b.id===cur.budget)?.label+' '+BUDGETS.find(b=>b.id===cur.budget)?.desc],
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex',gap:'12px',marginBottom:'6px'}}>
              <span style={{fontSize:'.68rem',color:'rgba(255,255,255,.3)',fontFamily:"'Space Mono',monospace",minWidth:'72px'}}>{k}</span>
              <span style={{fontSize:'.82rem',color:'rgba(255,255,255,.78)'}}>{v||'—'}</span>
            </div>
          ))}
        </Card>
        <div style={{display:'flex',gap:'12px',justifyContent:'space-between'}}>
          <button className="btn-g" onClick={()=>setStep(3)}>← Voltar</button>
          <button className="btn-p" disabled={!cur.activities.length||busy} onClick={onSubmit} style={{minWidth:'150px'}}>
            {busy ? <><Spin/> A guardar…</> : 'Submeter voto ✓'}
          </button>
        </div>
      </>}
    </div>
  )
}

// ─── Results ─────────────────────────────────────────────────────────────────

function Results({ votes, roomCode, roomName, onVote, onRefresh }) {
  const [loading, setLoading] = useState(false)
  async function refresh() { setLoading(true); await onRefresh(); setLoading(false) }

  return (
    <div className="fu">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h2 style={{fontSize:'1.75rem',fontWeight:'800'}}>Resultados</h2>
          <div style={{color:'rgba(255,255,255,.38)',fontSize:'.72rem',fontFamily:"'Space Mono',monospace",marginTop:'4px'}}>
            {roomName} · {votes.length} voto{votes.length!==1?'s':''}
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn-g" style={{padding:'8px 14px',fontSize:'.7rem'}} onClick={refresh} disabled={loading}>
            {loading?<Spin/>:'↻ Atualizar'}
          </button>
          <button className="btn-p" style={{padding:'10px 18px',fontSize:'.78rem'}} onClick={onVote}>+ Votar</button>
        </div>
      </div>

      <Card style={{marginBottom:'20px',borderColor:'rgba(200,241,53,.14)'}}>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:'.55rem',letterSpacing:'.15em',
          textTransform:'uppercase',color:'rgba(255,255,255,.28)',marginBottom:'10px'}}>partilha com o grupo</div>
        <ShareBox code={roomCode}/>
      </Card>

      {votes.length===0 ? (
        <Card>
          <div style={{textAlign:'center',padding:'32px',color:'rgba(255,255,255,.38)',
            fontFamily:"'Space Mono',monospace",fontSize:'.8rem'}}>
            Ainda ninguém votou.<br/>Partilha o link!
          </div>
        </Card>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>

          <Card>
            <Lbl>🏆 Destino favorito</Lbl>
            {tally(votes,'destination',DESTINATIONS).map((d,i) => (
              <div key={d.id} style={{marginBottom:'13px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:'.9rem',fontWeight:i===0?'700':'400',color:i===0?'#fff':'rgba(255,255,255,.5)'}}>{d.label}</span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:i===0?'var(--ac)':'rgba(255,255,255,.28)'}}>{d.count}/{votes.length}</span>
                </div>
                <Bar count={d.count} total={votes.length}/>
              </div>
            ))}
          </Card>

          <Card>
            <Lbl>📅 Disponibilidade — meses</Lbl>
            <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
              {tally(votes,'months',MONTHS.map((m,i)=>({id:String(i+1),label:m}))).filter(m=>m.count>0).map((m,i) => (
                <div key={m.id} style={{padding:'7px 13px',borderRadius:'99px',
                  background:i===0?'var(--ac)':'rgba(255,255,255,.07)',
                  color:i===0?'#000':'rgba(255,255,255,.65)',
                  fontSize:'.75rem',fontFamily:"'Space Mono',monospace",fontWeight:i===0?'700':'400'}}>
                  {m.label} ({m.count})
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Lbl>⏱ Duração preferida</Lbl>
            {tally(votes,'duration',DURATIONS).filter(d=>d.count>0).map((d,i) => (
              <div key={d.id} style={{marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:'.88rem',color:i===0?'#fff':'rgba(255,255,255,.48)'}}>
                    {d.label} <span style={{fontSize:'.7rem',color:'rgba(255,255,255,.3)'}}>{d.desc}</span>
                  </span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:i===0?'var(--ac)':'rgba(255,255,255,.28)'}}>{d.count}/{votes.length}</span>
                </div>
                <Bar count={d.count} total={votes.length}/>
              </div>
            ))}
          </Card>

          <Card>
            <Lbl>💰 Orçamento do grupo</Lbl>
            {tally(votes,'budget',BUDGETS).filter(b=>b.count>0).map((b,i) => (
              <div key={b.id} style={{marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:'.88rem',fontWeight:i===0?'700':'400',color:i===0?'#fff':'rgba(255,255,255,.48)'}}>
                    {b.label} <span style={{fontSize:'.7rem',color:'rgba(255,255,255,.3)'}}>{b.desc}</span>
                  </span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:i===0?'var(--ac)':'rgba(255,255,255,.28)'}}>{b.count}/{votes.length}</span>
                </div>
                <Bar count={b.count} total={votes.length}/>
              </div>
            ))}
            {avgBudget(votes) && (
              <div style={{marginTop:'14px',padding:'12px 16px',background:'rgba(200,241,53,.07)',
                borderRadius:'12px',border:'1px solid rgba(200,241,53,.2)'}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:'rgba(255,255,255,.42)'}}>Média estimada por pessoa: </span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:'1rem',color:'var(--ac)',fontWeight:'700'}}>~€{avgBudget(votes)}</span>
              </div>
            )}
          </Card>

          <Card>
            <Lbl>🎯 Atividades mais votadas</Lbl>
            {tally(votes,'activities',ACTIVITIES).filter(a=>a.count>0).map((a,i) => (
              <div key={a.id} style={{marginBottom:'11px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:'.88rem',color:i<3?'#fff':'rgba(255,255,255,.42)'}}>{a.label}</span>
                  <span style={{fontFamily:"'Space Mono',monospace",fontSize:'.7rem',color:i<3?'var(--ac)':'rgba(255,255,255,.28)'}}>
                    {a.count} voto{a.count!==1?'s':''}
                  </span>
                </div>
                <Bar count={a.count} total={votes.length}/>
              </div>
            ))}
          </Card>

          <Card>
            <Lbl>👥 Votos individuais ({votes.length})</Lbl>
            {votes.map((v,i) => (
              <div key={i} style={{paddingBottom:'16px',marginBottom:'16px',
                borderBottom:i<votes.length-1?'1px solid rgba(255,255,255,.07)':'none'}}>
                <div style={{fontWeight:'700',color:'var(--ac)',marginBottom:'8px'}}>{v.name}</div>
                {[
                  ['Destino',    v.destination?.map(id=>DESTINATIONS.find(d=>d.id===id)?.label).join(', ')],
                  ['Meses',      v.months?.map(m=>MONTHS[+m-1]).join(', ')],
                  ['Duração',    v.duration?.map(id=>DURATIONS.find(d=>d.id===id)?.label).join(', ')],
                  ['Orçamento',  BUDGETS.find(b=>b.id===v.budget)?.label],
                  ['Atividades', v.activities?.map(id=>ACTIVITIES.find(a=>a.id===id)?.label).join(', ')],
                ].map(([k,val]) => (
                  <div key={k} style={{display:'flex',gap:'10px',marginBottom:'4px'}}>
                    <span style={{fontSize:'.65rem',color:'rgba(255,255,255,.28)',fontFamily:"'Space Mono',monospace",minWidth:'70px'}}>{k}</span>
                    <span style={{fontSize:'.78rem',color:'rgba(255,255,255,.68)'}}>{val||'—'}</span>
                  </div>
                ))}
              </div>
            ))}
          </Card>

        </div>
      )}
    </div>
  )
}
