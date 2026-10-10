import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowLeft, ArrowRight, BatteryCharging, CircleDot, Disc3, ExternalLink,
  Images, Lightbulb, LoaderCircle, Maximize2, Pause, Play, Rotate3D, Settings2,
  Sparkles, X, Box, WandSparkles, RotateCcw, AlertCircle
} from 'lucide-react'
import GeneratedVehicle3D from './GeneratedVehicle3D'
import HostedVehicle3D from './HostedVehicle3D'

const PARTS = {
  engine: { label: 'Engine', icon: Settings2, tone: 'ember', title: 'Powertrain intelligence', copy: 'Review the service timeline, oil history, mileage and reported symptoms before visiting a workshop.', actions: ['Oil / coolant', 'Air filter', 'Battery', 'Noise'] },
  tires: { label: 'Tyres', icon: CircleDot, tone: 'blue', title: 'Tyre health', copy: 'Track your recorded condition and replacement date. AI can turn that data into a practical inspection checklist.', actions: ['Tread', 'Pressure', 'Rotation', 'Replacement'] },
  brakes: { label: 'Brakes', icon: Disc3, tone: 'violet', title: 'Brake system', copy: 'Brake concerns are safety-critical. Use the AI copilot for symptoms and take serious warnings to a qualified technician.', actions: ['Pads', 'Discs', 'Fluid'] },
  battery: { label: 'Battery', icon: BatteryCharging, tone: 'green', title: 'Battery watch', copy: 'Keep battery age and starting behaviour visible in one place and ask the AI what to monitor next.', actions: ['Battery age', 'Voltage', 'Starting'] },
  lights: { label: 'Lights', icon: Lightbulb, tone: 'gold', title: 'Lighting check', copy: 'A quick visual reminder for headlamps, indicators and brake lights.', actions: ['Headlamp', 'Indicators', 'Brake lamps'] },
}

const VIEW_NAMES = {
  front: 'Front', 'front-3-4': 'Front 3/4', side: 'Left side', 'rear-3-4': 'Rear 3/4',
  rear: 'Rear', 'rear-3-4-right': 'Rear 3/4 R', 'side-right': 'Right side', 'front-3-4-right': 'Front 3/4 R',
}

export default function VehicleViewer({
  vehicle, selectedModel, heroImage = null, heroImageVehicleId = null, heroImageLoading = false, heroImageMessage = '', onLoadHero,
  visualFrames = [], visualMessage = '', visualVehicleId = null,
  visualLoading = false, paintColor = 'silver', model3d = null, model3dVehicleId = null,
  model3dLoading = false, model3dActionMessage = '', onOpenLibrary, onAskAI, onLoad360,
  onGenerateModel, onRefreshModel, profile = {},
}) {
  const [part, setPart] = useState(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [spinning, setSpinning] = useState(true)
  // Start with the local model so the stage is never blank if an external iframe is blocked or slow.
  const [viewMode, setViewMode] = useState('generated')
  const drag = useRef({ active: false, x: 0, last: 0 })
  const frames = useMemo(() => visualVehicleId === vehicle?.id ? (visualFrames || []) : [], [visualFrames, visualVehicleId, vehicle?.id])
  const modelForVehicle = model3dVehicleId === vehicle?.id ? model3d : null
  const heroForVehicle = heroImageVehicleId === vehicle?.id ? heroImage : null
  const providerStatus = String(modelForVehicle?.status || '').toUpperCase()
  const hostedModelReady = Boolean(modelForVehicle?.publicModelId && providerStatus === 'READY')

  const resolvedModel = useMemo(() => selectedModel || (vehicle ? {
    id: `generated-${vehicle.id}`, type: vehicle.vehicleType, brand: vehicle.brand,
    model: vehicle.model, year: vehicle.modelYear, source: '', embed: null,
    creator: 'AutoSphere procedural 3D', license: 'Generated representative geometry',
  } : null), [selectedModel, vehicle])

  useEffect(() => {
    setPart(null); setFrameIndex(0); setSpinning(true)
    // Always show the locally generated 3D vehicle first. External assets are optional views.
    setViewMode('generated')
  }, [vehicle?.id, resolvedModel?.id])

  useEffect(() => {
    if (heroForVehicle) setViewMode('hero')
  }, [heroForVehicle])

  // Show a saved provider model for this exact vehicle only. It must never leak
  // across vehicle selections or replace the local fallback before READY.
  useEffect(() => {
    if (hostedModelReady && model3dVehicleId === vehicle?.id) setViewMode('provider')
  }, [hostedModelReady, model3dVehicleId, vehicle?.id])

  useEffect(() => {
    if (frames.length) setFrameIndex(i => Math.min(i, frames.length - 1))
  }, [frames.length])

  useEffect(() => {
    if (viewMode !== 'frames' || !spinning || frames.length < 2) return undefined
    const id = window.setInterval(() => setFrameIndex(i => (i + 1) % frames.length), 900)
    return () => window.clearInterval(id)
  }, [viewMode, spinning, frames.length])

  if (!vehicle) {
    return <div className="v5-stage v5-empty-stage"><div className="v5-empty-orbit"><Rotate3D size={30} /></div><h3>Your garage is waiting</h3><p>Add a car or bike to create its personal vehicle studio.</p><button className="v5-btn v5-primary" onClick={onOpenLibrary}>Open vehicle library</button></div>
  }

  const active = part ? PARTS[part] : null
  const currentFrame = frames[frameIndex]
  const iframeSrc = resolvedModel?.embed ? `${resolvedModel.embed}?autostart=0&ui_theme=dark&dnt=1` : null
  const title = `${vehicle.brand || ''} ${vehicle.model || ''}`.trim()
  const canUseCommunityModel = Boolean(iframeSrc)
  const showHero = viewMode === 'hero' && Boolean(heroForVehicle)
  const showFrames = viewMode === 'frames' && frames.length > 0
  const showCommunity = viewMode === 'community' && canUseCommunityModel
  const showProvider = viewMode === 'provider' && hostedModelReady
  const showGenerated = !showHero && !showFrames && !showCommunity && !showProvider
  const generationPending = ['REQUESTING', 'PROCESSING', 'QUEUED'].includes(providerStatus)
  const providerUnavailable = modelForVehicle && ['NOT_CONFIGURED', 'UNAVAILABLE', 'FAILED', 'ERROR', 'YEAR_REQUIRED'].includes(providerStatus)

  function beginDrag(e) {
    if (!showFrames || frames.length < 2) return
    drag.current = { active: true, x: e.clientX, last: e.clientX }
    setSpinning(false)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* optional on older browsers */ }
  }
  function moveDrag(e) {
    if (!drag.current.active || !showFrames || frames.length < 2) return
    const delta = e.clientX - drag.current.last
    if (Math.abs(delta) < 18) return
    setFrameIndex(i => (i + (delta > 0 ? -1 : 1) + frames.length) % frames.length)
    drag.current.last = e.clientX
  }
  function endDrag() { drag.current.active = false }
  function stepFrame(direction) { if (frames.length) { setSpinning(false); setFrameIndex(i => (i + direction + frames.length) % frames.length) } }

  return <div className="v5-stage v6-stage">
    <div className="v5-stage-toolbar">
      <div className="v5-live"><span />{showHero ? 'CATALOG VEHICLE IMAGE' : showFrames ? '360 VEHICLE VIEWS' : showCommunity ? 'COMMUNITY 3D REFERENCE' : showProvider ? 'CATALOG-GENERATED 3D' : 'INTERACTIVE VEHICLE STUDIO'}</div>
      <div className="v5-stage-actions">
        {heroForVehicle && !showHero && <button className="v5-glass-btn" onClick={() => setViewMode('hero')}><Images size={14} />Catalog image</button>}
        {showHero && <button className="v5-glass-btn" onClick={() => setViewMode('generated')}><Rotate3D size={14} />Interactive 3D</button>}
        {!heroForVehicle && <button className="v5-glass-btn" disabled={heroImageLoading || !vehicle.modelYear} onClick={async () => { const ready = await onLoadHero?.(); if (ready) setViewMode('hero') }} title="Optional catalog image request; one image credit. Free evaluation tier starts with 100 image credits."><Images size={14} />{heroImageLoading ? 'Loading image…' : 'Get real vehicle image · 1 credit'}</button>}
        {(showGenerated || showFrames) && <button className="v5-glass-btn" onClick={() => setSpinning(v => !v)}>{spinning ? <Pause size={14} /> : <Play size={14} />}{spinning ? 'Pause spin' : 'Auto spin'}</button>}
        {frames.length > 0 && !showFrames && <button className="v5-glass-btn" onClick={() => { setViewMode('frames'); setFrameIndex(0); setSpinning(true) }}><Images size={14} />360 views</button>}
        {!frames.length && !showFrames && <button className="v5-glass-btn" disabled={visualLoading || !vehicle.modelYear} onClick={async () => { const ready = await onLoad360?.(); if (ready) { setViewMode('frames'); setFrameIndex(0); setSpinning(true) } }} title="Optional provider request; may use image credits"><Images size={14} />{visualLoading ? 'Loading 360…' : 'Load 360 views'}</button>}
        {modelForVehicle?.enabled && !hostedModelReady && <button className="v5-glass-btn" disabled={model3dLoading || !vehicle.modelYear} onClick={generationPending && modelForVehicle?.providerRequestId ? onRefreshModel : onGenerateModel} title={generationPending ? 'Resume with the same idempotency key or check status' : 'Optional provider request; may cost credits'}>{model3dLoading ? <LoaderCircle size={14} className="v6-loader-icon" /> : generationPending ? <RotateCcw size={14} /> : <WandSparkles size={14} />}{model3dLoading ? 'Requesting…' : generationPending ? (modelForVehicle?.providerRequestId ? 'Check 3D status' : 'Resume safely') : 'Generate catalog 3D'}</button>}
        {!modelForVehicle?.enabled && !hostedModelReady && <button className="v5-glass-btn" disabled title="Configure CAR_IMAGE_API_KEY on the backend to enable provider-generated catalog 3D"><Box size={14} />Catalog 3D unavailable</button>}
        {hostedModelReady && !showProvider && <button className="v5-glass-btn" onClick={() => setViewMode('provider')}><Box size={14} />Catalog 3D</button>}
        {showProvider && <button className="v5-glass-btn" onClick={() => setViewMode('generated')}><Rotate3D size={14} />Local 3D</button>}
        {canUseCommunityModel && !showCommunity && <button className="v5-glass-btn" onClick={() => setViewMode('community')}><Box size={14} />Community 3D</button>}
        {showCommunity && <button className="v5-glass-btn" onClick={() => setViewMode('generated')}><Rotate3D size={14} />Local 3D</button>}
        {showFrames && <button className="v5-glass-btn" onClick={() => setViewMode('generated')}><Rotate3D size={14} />Interactive 3D</button>}
        {resolvedModel?.source && showCommunity && <a className="v5-glass-btn" href={resolvedModel.source} target="_blank" rel="noreferrer"><ExternalLink size={14} />Source</a>}
      </div>
    </div>

    <div className={`v5-stage-viewport v6-stage-viewport ${showGenerated ? 'is-generated' : ''} ${showProvider || showCommunity || showHero || showFrames ? 'is-hosted' : ''}`} onPointerDown={showFrames ? beginDrag : undefined} onPointerMove={showFrames ? moveDrag : undefined} onPointerUp={showFrames ? endDrag : undefined} onPointerCancel={showFrames ? endDrag : undefined}>
      {showHero ? <>
        <div className="v5-backdrop-glow" />
        <img className="v5-vehicle-image" src={heroForVehicle} alt={`${title}, catalog vehicle render`} draggable="false" />
        <div className="v5-frame-label">Catalog render · static image</div>
        <div className="v5-turntable-hint"><Images size={14} />Image matched by make, model and year; not a rotatable 3D mesh</div>
      </> : showFrames && currentFrame ? <>
        <div className="v5-backdrop-glow" />
        <img className="v5-vehicle-image" src={currentFrame.url} alt={`${title}, ${VIEW_NAMES[currentFrame.view] || currentFrame.view}`} draggable="false" />
        <div className="v5-frame-label">{VIEW_NAMES[currentFrame.view] || currentFrame.view}</div>
        <button className="v5-arrow v5-left" onClick={() => stepFrame(-1)} aria-label="Previous angle"><ArrowLeft size={20} /></button>
        <button className="v5-arrow v5-right" onClick={() => stepFrame(1)} aria-label="Next angle"><ArrowRight size={20} /></button>
        <div className="v5-turntable-hint"><Rotate3D size={14} />Drag left / right to rotate</div>
        <div className="v5-progress-dots">{frames.map((f, i) => <button key={`${f.view}-${i}`} aria-label={`Show ${VIEW_NAMES[f.view] || f.view}`} className={i === frameIndex ? 'active' : ''} onClick={() => { setSpinning(false); setFrameIndex(i) }} />)}</div>
      </> : showCommunity ? <>
        <iframe className="v5-sketchfab v6-community-viewer" src={iframeSrc} title={`${title} community 3D model`} allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen loading="lazy" />
        <div className="v6-viewer-note"><span className="v6-model-status-dot" />Community-created reference · model year/trim may differ</div>
      </> : showProvider ? <HostedVehicle3D modelId={modelForVehicle.publicModelId} vehicle={vehicle} modelStatus={modelForVehicle.status} progress={modelForVehicle.progress} message={modelForVehicle.message} /> : <>
        <GeneratedVehicle3D vehicle={vehicle} paintColor={paintColor} autoRotate={spinning} />
        <div className="v6-representative-badge"><span className="v6-model-status-dot" /><span><strong>Vehicle profile visual</strong><small>Interactive 3D · built from your saved make/model/type</small></span></div>
        {visualLoading && <div className="v6-resolve-chip"><LoaderCircle size={13} className="v6-loader-icon" />Loading requested 360 images; your vehicle stays visible.</div>}
        {generationPending && <div className="v6-generation-overlay"><div className="v6-progress-icon"><LoaderCircle className="v6-loader-icon" size={19} /></div><strong>Your catalog 3D model is being prepared</strong><span>{modelForVehicle?.message || 'You can continue rotating the local model while this runs.'}</span><div className="v6-provider-progress"><i style={{ width: `${Math.max(3, Math.min(100, Number(modelForVehicle?.progress || 0)))}%` }} /></div><button className="v5-glass-btn" onClick={modelForVehicle?.providerRequestId ? onRefreshModel : onGenerateModel}><RotateCcw size={13} />{modelForVehicle?.providerRequestId ? 'Check progress' : 'Resume safely'}</button></div>}
      </>}

      <div className="v5-hotspot-heading">Tap a vehicle system</div>
      <div className="v5-hotspots">{Object.entries(PARTS).map(([key, item]) => { const Icon = item.icon; return <button key={key} className={`v5-hotspot ${item.tone} ${part === key ? 'active' : ''}`} onClick={e => { e.stopPropagation(); setPart(key === part ? null : key) }}><Icon size={15} /><span>{item.label}</span></button> })}</div>
    </div>

    <div className="v5-stage-footer">
      <div><strong>{title}</strong><span>{vehicle.modelYear || 'Year not recorded'} · {vehicle.vehicleType || 'Vehicle'} · {vehicle.vehicleNumber || 'Garage vehicle'}{showHero ? ' · catalog vehicle image' : showCommunity && resolvedModel?.creator ? ` · Community model by ${resolvedModel.creator}` : showGenerated ? ' · representative 3D geometry, not OEM CAD' : showProvider ? ' · provider-generated reconstruction' : showFrames ? ' · provider-supplied exterior views' : ''}</span>
      {heroImageMessage && <small className="v6-viewer-message">{heroImageMessage}</small>}
      {visualMessage && !showFrames && !showProvider && <small className="v6-viewer-message">{visualMessage}</small>}
      {model3dActionMessage && <small className="v6-viewer-message">{model3dActionMessage}</small>}
      {providerUnavailable && <small className="v6-viewer-message"><AlertCircle size={12} />{modelForVehicle?.message || 'Catalog 3D is unavailable; your local interactive model remains available.'}</small>}
      </div>
      {showCommunity && resolvedModel?.source ? <a className="v5-icon-btn" href={resolvedModel.source} target="_blank" rel="noreferrer" title="Open model source"><Maximize2 size={16} /></a> : <button className="v5-icon-btn" onClick={() => { setPart(null); setViewMode('generated') }} title="Return to interactive vehicle model"><Rotate3D size={16} /></button>}
    </div>

    {active && <div className="v5-part-panel">
      <div className="v5-panel-head"><div><span className="v5-mini-tag">SMART SYSTEM</span><h3>{active.title}</h3></div><button className="v5-icon-btn" onClick={() => setPart(null)} aria-label="Close system panel"><X size={16} /></button></div>
      <p>{active.copy}</p>
      <div className="v5-action-row">{active.actions.map(a => <span key={a}>{a}</span>)}</div>
      {part === 'engine' && <div className="v5-snapshot"><Activity size={15} /><div><strong>{profile.engineOil || 'Engine oil not recorded'}</strong><span>Last service {profile.lastServiceDate || 'not recorded'}</span></div></div>}
      {part === 'tires' && <div className="v5-snapshot"><CircleDot size={15} /><div><strong>{profile.tyreCondition || 'Tyre condition not recorded'}</strong><span>Replacement {profile.tyreReplacementDate || 'not recorded'}</span></div></div>}
      <button className="v5-btn v5-primary" onClick={() => onAskAI?.(active.label)}><Sparkles size={15} />Ask AutoSphere AI</button>
    </div>}
  </div>
}
