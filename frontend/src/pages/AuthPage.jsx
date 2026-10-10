import { useState } from 'react'
import { ArrowRight, Bike, CarFront, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { MODEL_CATALOG } from '../data/modelCatalog'

export default function AuthPage({ mode, onAuth }) {
  const register = mode === 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = register ? await api.register({ name, email, password }) : await api.login({ email, password })
      await onAuth(result)
    } catch (err) {
      setError(err.message || 'Unable to continue. Check the backend and your details.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-backdrop-grid" />
      <div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" />
      <section className="auth-showcase">
        <div className="eyebrow"><Sparkles size={14} /> A SMART GARAGE FOR REAL-WORLD VEHICLES</div>
        <h1>Your garage.<br /><span>Under control.</span></h1>
        <p>Track cars, bikes, service dates, mileage, maintenance cost and history from one visual cockpit.</p>
        <div className="showcase-rail">
          <div className="rail-stat"><strong>{MODEL_CATALOG.length}+</strong><span>real 3D reference models</span></div>
          <div className="rail-stat"><strong>2</strong><span>vehicle types</span></div>
          <div className="rail-stat"><strong>1</strong><span>service timeline</span></div>
        </div>
        <div className="mini-fleet">
          <div className="mini-vehicle"><CarFront size={19} /><span>Cars</span><small>Mahindra · Tata</small></div>
          <div className="mini-vehicle"><Bike size={19} /><span>Bikes</span><small>Kawasaki · Suzuki</small></div>
        </div>
      </section>

      <section className="auth-card glass-card">
        <div className="auth-card-header"><div className="auth-logo">AS</div><div><strong>{register ? 'Create your garage' : 'Welcome back'}</strong><span>{register ? 'Start with your real vehicle profile' : 'Continue where you left off'}</span></div></div>
        <form onSubmit={submit}>
          {register && <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Manish" required /></label>}
          <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required /></label>
          <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} placeholder="At least 8 characters" required minLength={8} /><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {error && <div className="error-banner">{error}</div>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Connecting...' : register ? 'Create my account' : 'Enter my garage'} <ArrowRight size={18} /></button>
        </form>
        <div className="security-line"><ShieldCheck size={15} /> Authenticated through your Spring Boot backend on port 8082.</div>
        <div className="auth-switch">{register ? 'Already have an account?' : 'New to AutoSphere?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create account'}</Link></div>
      </section>
    </main>
  )
}
