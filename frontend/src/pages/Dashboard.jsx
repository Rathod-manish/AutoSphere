import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BatteryCharging, Bike, CalendarClock, CarFront, ChevronRight, CircleDot, Gauge, History, IndianRupee, Plus, RefreshCw, ShieldCheck, Sparkles, Wrench, X, Activity, BrainCircuit, ShieldAlert, Fuel } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import VehicleViewer from '../components/VehicleViewer'
import AIAssistant from '../components/AIAssistant'
import { findModelForVehicle, matchesVehicleModel, MODEL_CATALOG } from '../data/modelCatalog'

const money = n => `₹${Number(n || 0).toLocaleString('en-IN')}`
const date = v => v ? new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const dayDiff = target => { if (!target) return null; return Math.ceil((new Date(`${target}T00:00:00`) - new Date(new Date().toISOString().slice(0,10) + 'T00:00:00')) / 86400000) }
const statusMeta = status => { const s = String(status || '').toUpperCase(); if (s.includes('OVERDUE')) return { label:'Overdue', tone:'danger' }; if (s.includes('TODAY')) return { label:'Due today', tone:'warning' }; if (s.includes('SOON') || s.includes('DUE')) return { label:'Due soon', tone:'warning' }; return { label:'On schedule', tone:'success' } }

function profile(v) { return { engineOil:v?.engineOil || '', tyreCondition:v?.tyreCondition || '', tyreReplacementDate:v?.tyreReplacementDate || '', batteryDate:v?.batteryDate || '', insuranceExpiry:v?.insuranceExpiry || '', lastServiceDate:'', notes:v?.notes || '' } }

function smartSuggestions(vehicle, reminder, records) {
  if (!vehicle) return []
  const items = []
  const days = dayDiff(reminder?.nextServiceDate)
  if (reminder?.nextServiceDate) items.push({ tone: days != null && days < 0 ? 'danger' : days <= 30 ? 'warning' : 'good', title: days != null && days < 0 ? 'Service is overdue' : `Service ${days === 0 ? 'is due today' : `in ${days} days`}`, text: `Next service date: ${date(reminder.nextServiceDate)}.` })
  if (vehicle.currentMileage != null) items.push({ tone:'good', title:'Odometer captured', text:`${Number(vehicle.currentMileage).toLocaleString('en-IN')} km is the current reading.` })
  if (vehicle.tyreCondition) items.push({ tone: vehicle.tyreCondition.toLowerCase().includes('replace') || vehicle.tyreCondition.toLowerCase().includes('urgent') ? 'danger' : 'good', title:'Tyre profile saved', text:`Recorded condition: ${vehicle.tyreCondition}.` })
  const insuranceDays = dayDiff(vehicle.insuranceExpiry)
  if (insuranceDays != null && insuranceDays <= 45) items.push({ tone: insuranceDays < 0 ? 'danger' : 'warning', title: insuranceDays < 0 ? 'Insurance has expired' : 'Insurance is approaching', text:`Expiry: ${date(vehicle.insuranceExpiry)}.` })
  if (!records?.length) items.push({ tone:'warning', title:'Build the service timeline', text:'Add your first service event so the maintenance engine can learn the vehicle history.' })
  return items.slice(0,4)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState([])
  const [details, setDetails] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [showAssistant, setShowAssistant] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [showService, setShowService] = useState(false)
  const [modelQuery, setModelQuery] = useState('')
  const [modelFilter, setModelFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [aiPrompt, setAiPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [visualFrames, setVisualFrames] = useState([])
  const [visualVehicleId, setVisualVehicleId] = useState(null)
  const [visualMessage, setVisualMessage] = useState('')
  const [visualLoading, setVisualLoading] = useState(false)
  const [heroImage, setHeroImage] = useState(null)
  const [heroImageVehicleId, setHeroImageVehicleId] = useState(null)
  const [heroImageLoading, setHeroImageLoading] = useState(false)
  const [heroImageMessage, setHeroImageMessage] = useState('')
  const [visualColor, setVisualColor] = useState('silver')
  const [model3d, setModel3d] = useState(null)
  const [model3dVehicleId, setModel3dVehicleId] = useState(null)
  const [model3dLoading, setModel3dLoading] = useState(false)
  const [model3dActionMessage, setModel3dActionMessage] = useState('')
  const [aiSnapshot, setAiSnapshot] = useState('')
  const [aiSnapshotBusy, setAiSnapshotBusy] = useState(false)
  const selectedVehicleIdRef = useRef(null)

  async function loadGarage() {
    setLoading(true); setError('')
    try {
      const list = await api.vehicles()
      setVehicles(list)
      setSelectedId(cur => cur && list.some(v => v.id === cur) ? cur : list[0]?.id ?? null)
      const next = {}
      await Promise.all(list.map(async v => {
        try {
          const [records, reminder] = await Promise.all([api.records(v.id), api.reminder(v.id)])
          next[v.id] = { records, reminder, profile: profile(v) }
        } catch {
          next[v.id] = { records:[], reminder:null, profile:profile(v) }
        }
      }))
      setDetails(next)
    } catch (e) {
      setError(e.message || 'Could not load your garage.')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadGarage() }, [])

  const selectedVehicle = vehicles.find(v => v.id === selectedId) || null
  selectedVehicleIdRef.current = selectedVehicle?.id ?? null
  const selectedDetails = selectedVehicle ? details[selectedVehicle.id] || { records:[], reminder:null, profile:profile(selectedVehicle) } : { records:[], reminder:null, profile:{} }
  const latest = [...(selectedDetails.records || [])].sort((a,b) => String(b.serviceDate).localeCompare(String(a.serviceDate)))[0]
  const totalSpend = Object.values(details).flatMap(d => d.records || []).reduce((s,r) => s + Number(r.cost || 0), 0)
  const attention = vehicles.filter(v => { const s = String(details[v.id]?.reminder?.status || '').toUpperCase(); return s.includes('OVERDUE') || s.includes('DUE') }).length
  const totalMileage = vehicles.reduce((s,v) => s + Number(v.currentMileage || 0), 0)
  const health = useMemo(() => { if (!selectedVehicle) return 0; const s = String(selectedDetails.reminder?.status || '').toUpperCase(); if (s.includes('OVERDUE')) return 42; if (s.includes('DUE') || s.includes('SOON')) return 71; return selectedDetails.records?.length ? 94 : 80 }, [selectedVehicle, selectedDetails.reminder, selectedDetails.records])
  const suggestions = useMemo(() => smartSuggestions(selectedVehicle, selectedDetails.reminder, selectedDetails.records), [selectedVehicle, selectedDetails.reminder, selectedDetails.records])

  // The visual must match the vehicle the owner actually saved. Never let a past
  // library selection show a different vehicle in this owner's dashboard.
  const selectedModel = findModelForVehicle(selectedVehicle) || (selectedVehicle ? {
    id:`exact-${selectedVehicle.id}`, type:selectedVehicle.vehicleType, brand:selectedVehicle.brand,
    model:selectedVehicle.model, year:selectedVehicle.modelYear, source:'', embed:null,
    creator:'No indexed exact model', license:'No bundled model match'
  } : null)

  function visualCacheKey(vehicle, color = visualColor) {
    return `autosphere_spin_${vehicle?.id}_${String(vehicle?.brand || '').toLowerCase()}_${String(vehicle?.model || '').toLowerCase()}_${vehicle?.modelYear || 'unknown'}_${String(color).toLowerCase()}`.replace(/[^a-z0-9_]+/g, '_')
  }

  function heroCacheKey(vehicle, color = visualColor) {
    return `autosphere_hero_${vehicle?.id}_${String(vehicle?.brand || '').toLowerCase()}_${String(vehicle?.model || '').toLowerCase()}_${vehicle?.modelYear || 'unknown'}_${String(color).toLowerCase()}`.replace(/[^a-z0-9_]+/g, '_')
  }

  async function requestHeroImage() {
    const vehicle = selectedVehicle
    if (!vehicle?.id) return false
    if (!vehicle.modelYear) { setHeroImageMessage('Add the vehicle model year first so the catalog can match the right generation.'); return false }
    const key = heroCacheKey(vehicle, visualColor)
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null')
      if (cached?.url && cached?.savedAt && Date.now() - cached.savedAt < 5 * 24 * 60 * 60 * 1000) {
        if (selectedVehicleIdRef.current !== vehicle.id) return false
        setHeroImage(cached.url); setHeroImageVehicleId(vehicle.id); setHeroImageMessage('Loaded the cached catalog image. No new image credit was used.')
        return true
      }
    } catch { /* ignore browser cache corruption */ }
    if (String(model3d?.status || '').toUpperCase() === 'NOT_CONFIGURED') {
      setHeroImageMessage('To enable real catalog images, add CAR_IMAGE_API_KEY to the Spring Boot Run Configuration in STS, then restart the backend. Your local interactive 3D model is free and still works.')
      return false
    }
    const confirmed = window.confirm('Request one catalog image matching this make, model and year? The Car Image API free evaluation starts with 100 image credits; this request uses 1 credit if the provider returns an image. Actual availability depends on its catalogue. Continue?')
    if (!confirmed) return false
    setHeroImageLoading(true); setHeroImageMessage('')
    try {
      const result = await api.vehicleHero(vehicle.id, visualColor)
      if (selectedVehicleIdRef.current !== vehicle.id) return false
      if (!result?.url) { setHeroImageMessage(result?.message || 'No catalog image returned. Your local interactive 3D vehicle is still available.'); return false }
      setHeroImage(result.url); setHeroImageVehicleId(vehicle.id)
      setHeroImageMessage(result.message || 'Catalog image loaded.')
      localStorage.setItem(key, JSON.stringify({ url: result.url, savedAt: Date.now() }))
      return true
    } catch (e) {
      if (selectedVehicleIdRef.current === vehicle.id) setHeroImageMessage(e.message || 'The vehicle image catalog is unavailable. Your local 3D model remains available.')
      return false
    } finally { if (selectedVehicleIdRef.current === vehicle.id) setHeroImageLoading(false) }
  }

  async function loadVisuals(vehicle = selectedVehicle, force = false) {
    setVisualFrames([])
    setVisualMessage('')
    setVisualVehicleId(vehicle?.id ?? null)
    if (!vehicle?.id) return false
    if (!vehicle?.modelYear) {
      setVisualMessage('Add the model year to request a year-specific 360 image set. The interactive 3D vehicle is available now.')
      return false
    }
    const cacheKey = visualCacheKey(vehicle, visualColor)
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached?.savedAt && Array.isArray(cached.frames) && cached.frames.length && Date.now() - cached.savedAt < 5 * 24 * 60 * 60 * 1000) {
        if (selectedVehicleIdRef.current !== vehicle.id) return false
        setVisualFrames(cached.frames)
        setVisualMessage('Loaded the previously cached 360 view for this saved vehicle.')
        if (!force) return true
      }
    } catch { /* ignore malformed browser cache */ }

    // Never spend third-party image credits silently at dashboard render time.
    if (!force) {
      if (selectedVehicleIdRef.current === vehicle.id) setVisualMessage('360 images have not been requested for this vehicle yet. Your interactive local 3D model is ready; choose “Load 360 views” to request provider images.')
      return false
    }

    setVisualLoading(true)
    try {
      const result = await api.vehicleSpin({ vehicleId:vehicle.id, color:visualColor })
      const frames = Array.isArray(result?.frames) ? result.frames : []
      if (selectedVehicleIdRef.current !== vehicle.id) return false
      setVisualFrames(frames)
      setVisualMessage(result?.message || (frames.length ? '360 vehicle views are ready.' : 'No matching 360 views were returned. Your interactive 3D model remains available.'))
      if (frames.length) localStorage.setItem(cacheKey, JSON.stringify({ savedAt:Date.now(), frames }))
      return frames.length > 0
    } catch (e) {
      if (selectedVehicleIdRef.current === vehicle.id) setVisualMessage(e.message || 'The visual catalog is unavailable. Your interactive 3D model remains available.')
      return false
    } finally { if (selectedVehicleIdRef.current === vehicle.id) setVisualLoading(false) }
  }

  async function requestVisuals() {
    if (!selectedVehicle) return false
    if (String(model3d?.status || '').toUpperCase() === 'NOT_CONFIGURED') { setVisualMessage('Configure CAR_IMAGE_API_KEY on the Spring Boot backend to load provider 360 images. Your interactive local 3D vehicle is ready.'); return false }
    const cacheKey = visualCacheKey(selectedVehicle, visualColor)
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached?.savedAt && cached?.frames?.length && Date.now() - cached.savedAt < 5 * 24 * 60 * 60 * 1000) {
        setVisualFrames(cached.frames); setVisualVehicleId(selectedVehicle.id); setVisualMessage('Loaded the previously cached 360 views. No new image request was made.'); return true
      }
    } catch { /* use an explicit provider request below */ }
    const confirmed = window.confirm('Request 8 year-specific 360 vehicle images? The provider may charge up to 8 image credits on a first request. This is optional; your local interactive 3D vehicle already works. Continue?')
    if (confirmed) return await loadVisuals(selectedVehicle, true)
    return false
  }

  async function refresh3dModel(vehicle = selectedVehicle, color = visualColor) {
    if (!vehicle?.id) { setModel3d(null); setModel3dVehicleId(null); return }
    const requestVehicleId = vehicle.id
    setModel3dVehicleId(requestVehicleId)
    try {
      const result = await api.vehicleModel3d(requestVehicleId, color)
      if (selectedVehicleIdRef.current === requestVehicleId) setModel3d(result)
    } catch (e) {
      if (selectedVehicleIdRef.current === requestVehicleId) setModel3d({ enabled:false, available:false, status:'UNAVAILABLE', message:e.message || 'The catalog 3D service is unavailable. The local interactive model is still ready.' })
    }
  }

  async function generateExactModel() {
    if (!selectedVehicle?.id) return
    const existingStatus = String(model3d?.status || '').toUpperCase()
    const resume = ['REQUESTING','PROCESSING','QUEUED'].includes(existingStatus)
    const prompt = resume
      ? 'Resume/check the existing 3D generation request for this vehicle? The backend will reuse its idempotency record instead of intentionally creating a new order.'
      : 'Request a catalog-generated 3D vehicle model for this make/model/year and color? Provider requests may cost up to 100 credits (about US$1) for a new vehicle/color and can take around 10–20 minutes. Reuse may cost less or nothing. This is optional; the local interactive model is free and available now. Continue?'
    if (!window.confirm(prompt)) return
    setModel3dLoading(true)
    setModel3dActionMessage('')
    try {
      const requestVehicleId = selectedVehicle.id
      const result = await api.createVehicleModel3d(requestVehicleId, visualColor)
      if (selectedVehicleIdRef.current === requestVehicleId) {
        setModel3dVehicleId(requestVehicleId)
        setModel3d(result)
        setModel3dActionMessage(result?.message || 'Model request received. Your interactive vehicle remains available while the provider works.')
      }
    } catch (e) {
      if (selectedVehicleIdRef.current === selectedVehicle.id) setModel3dActionMessage(e.message || 'Could not request the catalog 3D model. Your interactive vehicle is still available.')
    } finally { if (selectedVehicleIdRef.current === selectedVehicle.id) setModel3dLoading(false) }
  }

  useEffect(() => { setAiSnapshot(''); if (!selectedVehicle?.id) return; let cancelled = false; const key = `autosphere_ai_snapshot_${selectedVehicle.id}`; const cached = localStorage.getItem(key); if (cached) { setAiSnapshot(cached); return () => { cancelled = true } } (async () => { setAiSnapshotBusy(true); try { const res = await api.assistant({ vehicleId:selectedVehicle.id, mode:'CHAT', question:'Create a short vehicle health snapshot from my saved facts. Give exactly 3 actionable maintenance suggestions, one next-service line, and one safety note. Use only my recorded facts for exact values and clearly label general suggestions.' }); if (!cancelled) { const text = res?.reply || ''; setAiSnapshot(text); if (text) localStorage.setItem(key, text) } } catch { /* dashboard remains useful without AI */ } finally { if (!cancelled) setAiSnapshotBusy(false) } })(); return () => { cancelled = true } }, [selectedVehicle?.id])
  useEffect(() => {
    let cancelled = false
    setVisualFrames([])
    setVisualVehicleId(selectedVehicle?.id ?? null)
    setVisualMessage('')
    setHeroImage(null)
    setHeroImageVehicleId(selectedVehicle?.id ?? null)
    setHeroImageMessage('')
    setHeroImageLoading(false)
    setModel3d(null)
    setModel3dVehicleId(selectedVehicle?.id ?? null)
    setModel3dActionMessage('')
    if (!selectedVehicle?.id) return () => { cancelled = true }
    // Read only browser cache on selection. Provider APIs are invoked only after an explicit click.
    (async () => {
      const key = visualCacheKey(selectedVehicle, visualColor)
      try {
        const cached = JSON.parse(localStorage.getItem(key) || 'null')
        if (cached?.savedAt && cached?.frames?.length && Date.now() - cached.savedAt < 5 * 24 * 60 * 60 * 1000 && !cancelled) {
          setVisualFrames(cached.frames); setVisualMessage('Loaded from local visual cache.')
        } else if (!cancelled) {
          setVisualMessage(selectedVehicle.modelYear ? 'Your local interactive 3D vehicle is ready. Load a catalog image or 360 views only when you request them.' : 'Add the model year to request catalog visuals. Your local interactive 3D vehicle is ready.')
        }
        const heroKey = heroCacheKey(selectedVehicle, visualColor)
        const hero = JSON.parse(localStorage.getItem(heroKey) || 'null')
        if (!cancelled && hero?.url && hero?.savedAt && Date.now() - hero.savedAt < 5 * 24 * 60 * 60 * 1000) {
          setHeroImage(hero.url); setHeroImageVehicleId(selectedVehicle.id); setHeroImageMessage('Loaded your cached catalog image.')
        }
      } catch { if (!cancelled) setVisualMessage('Your local interactive 3D vehicle is ready.') }
      if (!cancelled) await refresh3dModel(selectedVehicle, visualColor)
    })()
    return () => { cancelled = true }
  }, [selectedVehicle?.id, selectedVehicle?.modelYear, visualColor])

  useEffect(() => {
    const status = String(model3d?.status || '').toUpperCase()
    if (!selectedVehicle?.id || model3dVehicleId !== selectedVehicle.id || !model3d?.providerRequestId || !['PROCESSING','QUEUED','REQUESTING'].includes(status)) return undefined
    let cancelled = false
    const timer = window.setInterval(async () => {
      try {
        const result = await api.vehicleModel3d(selectedVehicle.id, visualColor)
        if (!cancelled && selectedVehicleIdRef.current === selectedVehicle.id) setModel3d(result)
      } catch { /* transient status errors keep the last known state */ }
    }, 20000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [selectedVehicle?.id, model3dVehicleId, model3d?.status, model3d?.providerRequestId, visualColor])

  async function addService(e) {
    e.preventDefault(); setSaving(true)
    try {
      const f = new FormData(e.currentTarget)
      await api.createRecord(selectedVehicle.id, { serviceDate:f.get('serviceDate'), serviceType:f.get('serviceType'), mileage:Number(f.get('mileage')), description:f.get('description'), cost:Number(f.get('cost') || 0), nextServiceDate:f.get('nextServiceDate') })
      setShowService(false); await loadGarage()
    } catch (e2) { setError(e2.message || 'Could not save service history.') } finally { setSaving(false) }
  }

  function askAI(prompt) { setAiPrompt(prompt); setShowAssistant(true) }

  const filteredModels = MODEL_CATALOG.filter(m => m.embed && matchesVehicleModel(m, selectedVehicle) && (modelFilter === 'ALL' || m.type === modelFilter) && `${m.brand} ${m.model}`.toLowerCase().includes(modelQuery.toLowerCase()))

  if (loading) return <main className="v5-loading"><div className="v5-loader"/><strong>Building your intelligence garage…</strong><span>Loading saved vehicles, history and reminders</span></main>

  return <main className="v5-dashboard">
    {error && <div className="v5-global-error"><AlertTriangle size={16}/><span>{error}</span><button onClick={() => setError('')}><X size={15}/></button></div>}
    <div className="v5-page">
      <section className="v5-hero">
        <div className="v5-hero-copy"><div className="v5-eyebrow"><span /> LIVE VEHICLE INTELLIGENCE</div><h1>Your garage,<br/><span>in one intelligent view.</span></h1><p>Enter the facts once. AutoSphere remembers them, visualises your vehicles and turns maintenance history into useful decisions.</p><div className="v5-hero-pills"><span><ShieldCheck size={14}/> Memory on</span><span><BrainCircuit size={14}/> AI context ready</span><span><Rotate3DIcon/> Interactive studio</span></div></div><div className="v5-hero-side"><div className="v5-health-ring" style={{'--health':`${health}%`}}><div><strong>{health}</strong><span>health</span></div></div><div><small>CURRENT VEHICLE</small><strong>{selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'No vehicle'}</strong><span>{selectedVehicle?.vehicleNumber || 'Add a vehicle to begin'}</span></div></div>
      </section>

      <section className="v5-metric-grid">
        <Metric icon={<CarFront size={18}/>} label="Garage" value={vehicles.length} sub={vehicles.length === 1 ? 'vehicle remembered' : 'vehicles remembered'} />
        <Metric icon={<CalendarClock size={18}/>} label="Attention" value={attention} sub={attention ? 'review reminders' : 'no urgent reminders'} tone={attention ? 'warning' : ''}/>
        <Metric icon={<IndianRupee size={18}/>} label="Recorded spend" value={money(totalSpend)} sub="from service history" />
        <Metric icon={<Gauge size={18}/>} label="Fleet odometer" value={`${totalMileage.toLocaleString('en-IN')} km`} sub="combined current reading" />
      </section>

      <section className="v5-garage-row-section">
        <div className="v5-section-head"><div><span className="v5-mini-tag">YOUR GARAGE</span><h2>{vehicles.length > 1 ? 'Car + bike, together.' : 'One vehicle, fully remembered.'}</h2></div><button className="v5-btn v5-secondary" onClick={() => navigate('/add-vehicle')}><Plus size={16}/> Add vehicle</button></div>
        <div className={`v5-garage-grid ${vehicles.length > 1 ? 'dual' : ''}`}>
          {vehicles.map(v => { const d=details[v.id]||{}; const sm=statusMeta(d.reminder?.status); return <button key={v.id} className={`v5-garage-card ${selectedId===v.id?'selected':''}`} onClick={() => setSelectedId(v.id)}><div className={`v5-garage-icon ${v.vehicleType==='CAR'?'car':'bike'}`}>{v.vehicleType==='CAR'?<CarFront size={28}/>:<Bike size={28}/>}</div><div className="v5-garage-main"><span>{v.vehicleType==='CAR'?'CAR':'BIKE'} · {v.modelYear || 'year not set'}</span><strong>{v.brand} {v.model}</strong><small>{v.vehicleNumber} · {Number(v.currentMileage||0).toLocaleString('en-IN')} km</small></div><div className="v5-garage-status"><span className={`v5-status ${sm.tone}`}>{sm.label}</span><ChevronRight size={17}/></div></button> })}
        </div>
      </section>

      <section className="v5-main-grid">
        <div className="v5-panel-card v5-studio-card">
          <div className="v5-panel-head"><div><span className="v5-mini-tag">REAL-WORLD VEHICLE STUDIO</span><h2>{selectedVehicle?.brand} {selectedVehicle?.model}</h2><p>{selectedVehicle?.modelYear || 'Year'} · {selectedVehicle?.vehicleType || 'Vehicle'} · {selectedVehicle?.vehicleNumber || ''}</p></div><div className="v5-inline-tools"><select value={visualColor} onChange={e => setVisualColor(e.target.value)}><option value="silver">Silver</option><option value="black">Black</option><option value="white">White</option><option value="red">Red</option><option value="blue">Blue</option></select><button className="v5-btn v5-secondary" onClick={() => setShowModels(true)}>Vehicle library</button></div></div>
          {visualLoading && <div className="v5-visual-loading"><div className="v5-loader small"/><span>Resolving the exact year + model visual…</span></div>}
          <VehicleViewer vehicle={selectedVehicle} selectedModel={selectedModel} heroImage={heroImage} heroImageVehicleId={heroImageVehicleId} heroImageLoading={heroImageLoading} heroImageMessage={heroImageMessage} onLoadHero={requestHeroImage} visualFrames={visualFrames} visualVehicleId={visualVehicleId} visualMessage={visualMessage} visualLoading={visualLoading} paintColor={visualColor} model3d={model3d} model3dVehicleId={model3dVehicleId} model3dLoading={model3dLoading} model3dActionMessage={model3dActionMessage} onGenerateModel={generateExactModel} onLoad360={requestVisuals} onRefreshModel={() => refresh3dModel(selectedVehicle, visualColor)} profile={{...selectedDetails.profile, lastServiceDate:latest?.serviceDate || ''}} onOpenLibrary={() => setShowModels(true)} onAskAI={label => askAI(`Check the ${label} system on my ${selectedVehicle?.brand} ${selectedVehicle?.model}. Use my saved mileage and service history.`)} />
        </div>

        <aside className="v5-right-stack">
          <section className="v5-panel-card v5-timeline-card"><div className="v5-card-kicker"><span className="v5-mini-tag">SERVICE TIMELINE</span><Wrench size={16}/></div><h3>Last service → next service</h3><div className="v5-timeline"><div><small>LAST SERVICE</small><strong>{latest ? date(latest.serviceDate) : 'Not recorded'}</strong><span>{latest ? `${latest.serviceType} · ${Number(latest.mileage||0).toLocaleString('en-IN')} km` : 'Add your first record'}</span></div><div className="v5-timeline-arrow">→</div><div className="focus"><small>NEXT SERVICE</small><strong>{selectedDetails.reminder?.nextServiceDate ? date(selectedDetails.reminder.nextServiceDate) : 'Not set'}</strong><span>{selectedDetails.reminder ? statusMeta(selectedDetails.reminder.status).label : 'Create a service event'}</span></div></div><button className="v5-btn v5-secondary v5-wide" onClick={() => setShowService(true)}><Plus size={15}/> Log service</button></section>

          <section className="v5-panel-card v5-ai-card"><div className="v5-ai-orb"><Sparkles size={20}/></div><div className="v5-ai-title"><span className="v5-mini-tag">AI MAINTENANCE LAYER</span><h3>Your vehicle has a context-aware copilot.</h3><p>It uses your saved vehicle + service history instead of making you repeat the story every time.</p></div><div className="v5-ai-actions"><button className="v5-btn v5-primary" onClick={() => setShowAssistant(true)}><Sparkles size={15}/> Open AI cockpit</button><button className="v5-quick" onClick={() => askAI('What should I inspect before my next service?')}>Pre-service check</button></div></section>

          <section className="v5-panel-card v5-suggestions-card"><div className="v5-card-kicker"><div><span className="v5-mini-tag">SMART SUGGESTIONS</span><h3>Useful before you ask</h3></div><Activity size={17}/></div><div className="v5-suggestion-list">{suggestions.map((s,i) => <button key={i} className={`v5-suggestion ${s.tone}`} onClick={() => askAI(`${s.title}. ${s.text} What should I do next?`)}><span/><div><strong>{s.title}</strong><span>{s.text}</span></div><ChevronRight size={15}/></button>)}{!suggestions.length&&<div className="v5-empty-note">Your saved facts will create maintenance suggestions here.</div>}</div></section>
        </aside>
      </section>

      <section className="v5-system-grid"><SystemCard icon={<Settings2Icon/>} title="Engine" text={selectedVehicle?.engineOil || 'Ask AI what to monitor'} onClick={() => askAI('Review my engine maintenance context and tell me what I should monitor next.')} /><SystemCard icon={<CircleDot size={18}/>} title="Tyres" text={selectedVehicle?.tyreCondition || 'Condition not recorded'} onClick={() => askAI('Review my tyre condition and tell me what inspection I should do next.')} /><SystemCard icon={<BatteryCharging size={18}/>} title="Battery" text={selectedVehicle?.batteryDate ? `Battery date ${date(selectedVehicle.batteryDate)}` : 'Date not recorded'} onClick={() => askAI('Review my battery age and starting-risk context.')} /><SystemCard icon={<ShieldAlert size={18}/>} title="Safety" text="Brakes, lights, leaks" onClick={() => askAI('Give me a safety-first pre-drive checklist for this vehicle.')} /></section>

      <section className="v5-panel-card v5-history-card"><div className="v5-section-head"><div><span className="v5-mini-tag">MAINTENANCE MEMORY</span><h2>Service history</h2><p>Every visit becomes part of the AI context.</p></div><div className="v5-history-total"><History size={15}/> {selectedDetails.records?.length || 0} records</div></div>{selectedDetails.records?.length ? <div className="v5-history-table"><div className="v5-history-row header"><span>DATE</span><span>SERVICE</span><span>MILEAGE</span><span>COST</span><span>NEXT DUE</span></div>{selectedDetails.records.map(r => <div className="v5-history-row" key={r.id}><span>{date(r.serviceDate)}</span><span><strong>{r.serviceType}</strong><small>{r.description || 'Maintenance record'}</small></span><span>{Number(r.mileage||0).toLocaleString('en-IN')} km</span><span>{money(r.cost)}</span><span className={`v5-status ${statusMeta(r.reminderStatus).tone}`}>{date(r.nextServiceDate)}</span></div>)}</div> : <div className="v5-history-empty"><History size={27}/><strong>No service history yet</strong><span>The first service record you enter becomes the anchor for reminders and future AI recommendations.</span><button className="v5-btn v5-primary" onClick={() => setShowService(true)}>Add first service</button></div>}</section>

      <section className="v5-disclaimer"><ShieldCheck size={16}/><span>AutoSphere keeps the user's recorded values as source-of-truth data. AI suggestions are guidance, not a substitute for a qualified technician—especially for brakes, steering, overheating, smoke, fuel leaks or loss of control.</span></section>
    </div>

    {showModels && <div className="v5-modal-backdrop" onMouseDown={e => e.target===e.currentTarget && setShowModels(false)}><div className="v5-modal"><div className="v5-modal-head"><div><span className="v5-mini-tag">VEHICLE VISUAL REFERENCES</span><h2>{selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Vehicle visual'}</h2><p>Your saved vehicle never changes. Community 3D references may differ by model year or trim; a generated interactive 3D profile is available for every saved vehicle.</p></div><button className="v5-icon-btn" onClick={() => setShowModels(false)}><X size={18}/></button></div><div className="v5-library-toolbar"><input value={modelQuery} onChange={e => setModelQuery(e.target.value)} placeholder="Filter this vehicle reference…"/><div className="v5-filter-row">{['ALL', selectedVehicle?.vehicleType || 'CAR'].map(x => <button key={x} className={modelFilter===x?'active':''} onClick={() => setModelFilter(x)}>{x}</button>)}</div></div>{filteredModels.length ? <div className="v5-model-grid">{filteredModels.map(m => <a key={m.id} className="v5-model-card" href={m.source} target="_blank" rel="noreferrer"><div className={`v5-model-icon ${m.type==='CAR'?'car':'bike'}`}>{m.type==='CAR'?<CarFront size={20}/>:<Bike size={20}/>}</div><div><strong>{m.brand} {m.model}</strong><span>Community 3D reference · {m.year}</span><span>Creator: {m.creator || 'See source page'}</span></div><ChevronRight size={15}/></a>)}</div> : <div className="v5-no-exact-model"><div className="v5-model-icon">{selectedVehicle?.vehicleType==='BIKE'?<Bike size={22}/>:<CarFront size={22}/>}</div><strong>No bundled 3D preview for this exact make/model yet</strong><p>Your saved vehicle data is safe and unchanged. We won't show a different vehicle as if it were yours. Add the optional CAR_IMAGE_API_KEY for the year-specific multi-angle image provider, or search a model and verify its license before adding it to the catalog.</p><a className="v5-btn v5-secondary" href={`https://sketchfab.com/search?type=models&q=${encodeURIComponent(`${selectedVehicle?.brand || ''} ${selectedVehicle?.model || ''}`)}`} target="_blank" rel="noreferrer">Search matching 3D models <ChevronRight size={14}/></a></div>}<div className="v5-modal-note">Community model references may represent a different trim or model year. They are interactive visual references, not a VIN-confirmed factory render. Follow the creator's license and attribution terms.</div></div></div>}
    {showAssistant && <AIAssistant vehicle={selectedVehicle} reminder={selectedDetails.reminder} records={selectedDetails.records} profile={selectedDetails.profile} initialPrompt={aiPrompt} onClose={() => { setShowAssistant(false); setAiPrompt('') }} />}
    {showService && <div className="v5-modal-backdrop"><form className="v5-service-modal" onSubmit={addService}><div className="v5-modal-head"><div><span className="v5-mini-tag">SERVICE EVENT</span><h2>Log maintenance</h2></div><button type="button" className="v5-icon-btn" onClick={() => setShowService(false)}><X size={18}/></button></div><div className="v5-field-grid"><label>Service date<input type="date" name="serviceDate" required/></label><label>Service type<select name="serviceType"><option>General Service</option><option>Oil Change</option><option>Brake Service</option><option>Tyre Service</option><option>Battery Service</option><option>Major Service</option></select></label><label>Mileage<input type="number" name="mileage" min="0" defaultValue={selectedVehicle?.currentMileage || 0} required/></label><label>Cost (₹)<input type="number" name="cost" min="0" defaultValue="0" required/></label><label>Next service<input type="date" name="nextServiceDate" required/></label><label>Work performed<textarea name="description" placeholder="What was checked or replaced?"/></label></div><button className="v5-btn v5-primary v5-wide" disabled={saving}>{saving ? 'Saving…' : 'Save to maintenance memory'}</button></form></div>}
  </main>
}

function Metric({ icon, label, value, sub, tone='' }) { return <div className="v5-metric"><span className={`v5-metric-icon ${tone}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{sub}</span></div></div> }
function SystemCard({ icon, title, text, onClick }) { return <button className="v5-system-card" onClick={onClick}><span className="v5-system-icon">{icon}</span><div><span>{title}</span><strong>{text}</strong><small>Open intelligence →</small></div><Sparkles size={15}/></button> }
function Settings2Icon(){ return <Wrench size={18}/> }
function Rotate3DIcon(){ return <Activity size={14}/> }
