import { useState } from 'react'
import { ArrowRight, Bike, CarFront, Check, ChevronLeft, ChevronRight, Gauge, ShieldCheck, Sparkles, Wrench } from 'lucide-react'

const todayYear = new Date().getFullYear()
const empty = (type) => ({
  vehicleType: type,
  vehicleNumber: '',
  brand: '',
  model: '',
  modelYear: todayYear,
  currentMileage: '',
  lastServiceDate: '',
  lastServiceMileage: '',
  nextServiceDate: '',
  serviceCost: '',
})

export default function VehicleSetup({ onComplete, existingVehicles = [], adding = false }) {
  const initialChoice = existingVehicles.length === 0 ? 'BOTH' : existingVehicles.length > 1 ? 'BOTH' : existingVehicles[0].vehicleType
  const [choice, setChoice] = useState(initialChoice)
  const types = choice === 'BOTH' ? ['CAR', 'BIKE'] : [choice]
  const [drafts, setDrafts] = useState(() => types.map(t => ({ ...empty(t), ...(existingVehicles.find(v => v.vehicleType === t) || {}) })))
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function setType(next) {
    setChoice(next)
    const nextTypes = next === 'BOTH' ? ['CAR', 'BIKE'] : [next]
    setDrafts(nextTypes.map(t => ({ ...empty(t), ...(drafts.find(v => v.vehicleType === t) || {}) })))
    setStep(0)
    setError('')
  }

  function update(type, key, value) {
    setDrafts(prev => prev.map(v => v.vehicleType === type ? { ...v, [key]: value } : v))
  }

  function currentDraft() { return drafts[step - 1] }

  function validate(v) {
    if (!v.vehicleNumber.trim()) return 'Registration number is required.'
    if (!v.brand.trim()) return 'Brand is required.'
    if (!v.model.trim()) return 'Model is required.'
    if (!v.modelYear || Number(v.modelYear) < 2000 || Number(v.modelYear) > todayYear + 1) return `Model year must be between 2000 and ${todayYear + 1}.`
    if (v.currentMileage === '' || Number(v.currentMileage) < 0) return 'Current mileage is required.'
    if (v.lastServiceDate && !v.nextServiceDate) return 'Add the upcoming service date when a last service is entered.'
    if (v.lastServiceDate && v.nextServiceDate && v.nextServiceDate < v.lastServiceDate) return 'Next service cannot be before the last service.'
    if (v.lastServiceMileage && Number(v.lastServiceMileage) > Number(v.currentMileage)) return 'Last service mileage cannot be higher than the current mileage.'
    return ''
  }

  async function submit() {
    const issue = drafts.map(validate).find(Boolean)
    if (issue) { setError(issue); return }
    setBusy(true); setError('')
    try { await onComplete(drafts) } catch (e) { setError(e.message || 'Could not save your garage.') } finally { setBusy(false) }
  }

  return <main className="v5-setup">
    <div className="v5-setup-grid">
      <section className="v5-setup-story">
        <div className="v5-eyebrow"><Sparkles size={15} /> ONE-TIME GARAGE INTELLIGENCE</div>
        <h1>Tell us the vehicle.<br /><span>We'll build the garage.</span></h1>
        <p>Only the facts that matter. AutoSphere stores them once, derives the rest and uses AI to turn your data into useful maintenance guidance.</p>
        <div className="v5-story-pills"><span><ShieldCheck size={14}/> Saved once</span><span><Gauge size={14}/> Accurate user facts</span><span><Wrench size={14}/> Service timeline</span></div>
        <div className="v5-mini-preview"><div className="v5-mini-car"><CarFront size={28}/><div><strong>CAR</strong><span>Your saved car profile</span></div></div><div className="v5-mini-bike"><Bike size={28}/><div><strong>BIKE</strong><span>Your saved bike profile</span></div></div></div>
      </section>

      <section className="v5-setup-card">
        <div className="v5-setup-head"><div><span className="v5-mini-tag">{adding ? 'ADD TO GARAGE' : 'INITIAL SETUP'}</span><h2>{adding ? 'Add one more vehicle' : 'What do you own?'}</h2></div><span className="v5-step">{step === 0 ? '01' : `${String(step).padStart(2,'0')} / ${String(types.length).padStart(2,'0')}`}</span></div>
        {step === 0 ? <>
          <div className="v5-choice-grid">
            {[['CAR','Car only',CarFront],['BIKE','Bike only',Bike],['BOTH','Car + bike',null]].map(([value,label,Icon]) => <button type="button" key={value} className={`v5-choice ${choice === value ? 'selected' : ''}`} onClick={() => setType(value)}><span>{Icon ? <Icon size={28}/> : <><CarFront size={19}/><Bike size={19}/></>}</span><strong>{label}</strong>{choice === value && <Check size={16}/>}</button>)}
          </div>
          <div className="v5-info-card"><Sparkles size={20}/><div><strong>AI fills the gaps</strong><span>Don't make the user enter 20 maintenance fields. We collect core vehicle facts and let the intelligence layer surface the useful extras later.</span></div></div>
          <button className="v5-btn v5-primary v5-wide" onClick={() => { setStep(1); setError('') }}>Continue <ArrowRight size={17}/></button>
        </> : <>
          <div className="v5-current-vehicle"><span className={`v5-type-badge ${currentDraft()?.vehicleType === 'CAR' ? 'car' : 'bike'}`}>{currentDraft()?.vehicleType === 'CAR' ? <CarFront size={15}/> : <Bike size={15}/>}</span><div><strong>{currentDraft()?.vehicleType === 'CAR' ? 'Car profile' : 'Bike profile'}</strong><span>One time · saved to your account</span></div></div>
          <div className="v5-field-grid">
            <label>Registration<input value={currentDraft()?.vehicleNumber || ''} onChange={e => update(currentDraft().vehicleType, 'vehicleNumber', e.target.value.toUpperCase())} placeholder="TS09AB1234" /></label>
            <label>Brand<input value={currentDraft()?.brand || ''} onChange={e => update(currentDraft().vehicleType, 'brand', e.target.value)} placeholder="Mahindra / Tata / Kawasaki" /></label>
            <label>Model<input value={currentDraft()?.model || ''} onChange={e => update(currentDraft().vehicleType, 'model', e.target.value)} placeholder="Thar / Brezza / Ninja" /></label>
            <label>Model year<select value={currentDraft()?.modelYear || todayYear} onChange={e => update(currentDraft().vehicleType, 'modelYear', Number(e.target.value))}>{Array.from({ length: todayYear - 1999 }, (_, i) => todayYear - i).map(y => <option key={y}>{y}</option>)}</select></label>
            <label>Current mileage<input type="number" min="0" value={currentDraft()?.currentMileage || ''} onChange={e => update(currentDraft().vehicleType, 'currentMileage', e.target.value)} placeholder="18500" /></label>
            <label>Last service date<input type="date" value={currentDraft()?.lastServiceDate || ''} onChange={e => update(currentDraft().vehicleType, 'lastServiceDate', e.target.value)} /></label>
            <label>Last service mileage<input type="number" min="0" value={currentDraft()?.lastServiceMileage || ''} onChange={e => update(currentDraft().vehicleType, 'lastServiceMileage', e.target.value)} placeholder="15000" /></label>
            <label>Next service<input type="date" value={currentDraft()?.nextServiceDate || ''} onChange={e => update(currentDraft().vehicleType, 'nextServiceDate', e.target.value)} /></label>
            <label>Last service cost (₹)<input type="number" min="0" value={currentDraft()?.serviceCost || ''} onChange={e => update(currentDraft().vehicleType, 'serviceCost', e.target.value)} placeholder="3500" /></label>
          </div>
          <div className="v5-smart-note"><Sparkles size={14}/><span>After setup, the dashboard can suggest checks for tyres, engine, battery, insurance and other systems without asking the user to repeat this information.</span></div>
          {error && <div className="v5-error">{error}</div>}
          <div className="v5-setup-actions"><button className="v5-btn v5-secondary" onClick={() => setStep(s => Math.max(0, s - 1))}><ChevronLeft size={16}/> Back</button>{step < types.length ? <button className="v5-btn v5-primary" onClick={() => { const issue = validate(currentDraft()); if (issue) { setError(issue); return } setError(''); setStep(s => s + 1) }}>Next {types[step] === 'CAR' ? 'bike' : 'vehicle'} <ChevronRight size={16}/></button> : <button className="v5-btn v5-primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Launch my garage'} <Sparkles size={16}/></button>}</div>
        </>}
      </section>
    </div>
  </main>
}
