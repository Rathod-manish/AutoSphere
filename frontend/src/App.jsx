import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { clearAuth, getStoredAuth, storeAuth, api } from './lib/api'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import VehicleSetup from './components/VehicleSetup'
import { useEffect, useState } from 'react'

function Protected({ children }) { const auth=getStoredAuth(); return auth?.token?children:<Navigate to="/login" replace/> }

function normalizeVehiclePayload(v){
  return {
    vehicleNumber:v.vehicleNumber.trim(), vehicleType:v.vehicleType, brand:v.brand.trim(), model:v.model.trim(),
    purchaseDate:v.purchaseDate || null, currentMileage:Number(v.currentMileage), modelYear:v.modelYear ? Number(v.modelYear) : null, variant:v.variant?.trim()||null,
    fuelType:v.fuelType?.trim()||null, insuranceExpiry:v.insuranceExpiry||null, tyreCondition:v.tyreCondition||null,
    tyreReplacementDate:v.tyreReplacementDate||null, batteryDate:v.batteryDate||null, engineOil:v.engineOil?.trim()||null,
    notes:v.notes?.trim()||null,
  }
}

function normalizeServicePayload(v){
  if(!v.lastServiceDate) return null
  return {
    serviceDate:v.lastServiceDate,
    serviceType:v.serviceType || 'General Service',
    mileage:Number(v.lastServiceMileage || v.currentMileage),
    description:v.notes?.trim() || 'Initial service history',
    cost:Number(v.serviceCost || 0),
    nextServiceDate:v.nextServiceDate || null,
  }
}

function buildPayload(v){ return { vehicle:normalizeVehiclePayload(v), service:normalizeServicePayload(v) } }

function SetupPage(){
  const navigate=useNavigate(); const auth=getStoredAuth(); const [vehicles,setVehicles]=useState([])
  useEffect(()=>{api.vehicles().then(setVehicles).catch(()=>setVehicles([]))},[])
  async function complete(payloads){
    const created=[]
    for(const item of payloads){
      const prepared=buildPayload(item)
      const vehicle=await api.createVehicle(prepared.vehicle)
      created.push(vehicle)
      if(prepared.service) await api.createRecord(vehicle.id,prepared.service)
    }
    localStorage.setItem('autosphere_onboarding_complete','true')
    navigate('/dashboard',{replace:true,state:{welcome:true,created}})
  }
  if(!auth?.token)return <Navigate to="/login" replace/>
  if(vehicles.length)return <Navigate to="/dashboard" replace/>
  return <VehicleSetup existingVehicles={[]} onComplete={complete}/>
}

function AddVehiclePage(){
  const navigate=useNavigate()
  async function complete(payloads){
    for(const item of payloads){
      const prepared=buildPayload(item)
      const vehicle=await api.createVehicle(prepared.vehicle)
      if(prepared.service) await api.createRecord(vehicle.id,prepared.service)
    }
    navigate('/dashboard',{replace:true,state:{welcome:true}})
  }
  return <Protected><VehicleSetup existingVehicles={[]} adding onComplete={complete}/></Protected>
}

export default function App(){
  const location=useLocation(); const navigate=useNavigate(); const [auth,setAuth]=useState(getStoredAuth())
  useEffect(()=>{ const handler=()=>setAuth(getStoredAuth()); window.addEventListener('storage',handler); return()=>window.removeEventListener('storage',handler)},[])
  async function handleAuth(result){
    storeAuth(result); setAuth(result)
    try{const vehicles=await api.vehicles(); navigate(vehicles.length?'/dashboard':'/setup',{replace:true})}
    catch{navigate('/setup',{replace:true})}
  }
  function logout(){clearAuth();setAuth(null);navigate('/login',{replace:true})}
  return <>
    {location.pathname.startsWith('/dashboard')&&auth?.token&&<DashboardShell auth={auth} onLogout={logout}/>} 
    <Routes>
      <Route path="/" element={<Navigate to={auth?.token?'/dashboard':'/login'} replace/>}/>
      <Route path="/login" element={<AuthPage mode="login" onAuth={handleAuth}/>}/>
      <Route path="/register" element={<AuthPage mode="register" onAuth={handleAuth}/>}/>
      <Route path="/setup" element={<Protected><SetupPage/></Protected>}/>
      <Route path="/add-vehicle" element={<AddVehiclePage/>}/>
      <Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/>
      <Route path="*" element={<Navigate to={auth?.token?'/dashboard':'/login'} replace/>}/>
    </Routes>
  </>
}

function DashboardShell({auth,onLogout}){
  const navigate=useNavigate()
  return <header className="top-nav">
    <button className="brand-mark" onClick={()=>navigate('/dashboard')}><span className="brand-symbol">A</span><span><strong>AutoSphere</strong><small>VEHICLE INTELLIGENCE</small></span></button>
    <nav><button className="nav-link active">Garage</button><button className="nav-link" onClick={()=>navigate('/add-vehicle')}>Add vehicle</button></nav>
    <div className="user-menu"><div className="user-avatar">{String(auth.name||'U').slice(0,1).toUpperCase()}</div><div className="user-copy"><strong>{auth.name}</strong><span>{auth.email}</span></div><button className="icon-button" title="Log out" onClick={onLogout}>↪</button></div>
  </header>
}
