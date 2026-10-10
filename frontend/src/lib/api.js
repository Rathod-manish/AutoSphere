const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082/api'

export function getApiBaseUrl() { return API_BASE_URL }
export function getStoredAuth() { try { return JSON.parse(localStorage.getItem('autosphere_auth') || 'null') } catch { return null } }
export function storeAuth(auth) { localStorage.setItem('autosphere_auth', JSON.stringify(auth)) }
export function clearAuth() { localStorage.removeItem('autosphere_auth'); localStorage.removeItem('autosphere_onboarding_complete') }

async function request(path, options = {}) {
  const auth = getStoredAuth()
  const headers = new Headers(options.headers || {})
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`)
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) {
    const message = data?.message || data?.error || (typeof data === 'string' ? data : `Request failed (${response.status})`)
    throw new Error(message)
  }
  return data
}

export const api = {
  health: () => request('/health'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  vehicles: () => request('/vehicles'),
  createVehicle: (payload) => request('/vehicles', { method: 'POST', body: JSON.stringify(payload) }),
  updateVehicle: (id, payload) => request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),
  records: (vehicleId) => request(`/service-records/vehicle/${vehicleId}`),
  createRecord: (vehicleId, payload) => request(`/service-records/vehicle/${vehicleId}`, { method: 'POST', body: JSON.stringify(payload) }),
  updateRecord: (recordId, vehicleId, payload) => request(`/service-records/${recordId}/vehicle/${vehicleId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRecord: (recordId, vehicleId) => request(`/service-records/${recordId}/vehicle/${vehicleId}`, { method: 'DELETE' }),
  reminder: (vehicleId) => request(`/service-records/vehicle/${vehicleId}/reminder`),
  assistant: (payload) => request('/assistant/chat', { method: 'POST', body: JSON.stringify(payload) }),
  vehicleSpin: ({ vehicleId, color = 'silver' }) => request(`/vehicle-visuals/vehicles/${encodeURIComponent(vehicleId)}/spin?color=${encodeURIComponent(color)}`),
  vehicleHero: (vehicleId, color = 'silver') => request(`/vehicle-visuals/vehicles/${encodeURIComponent(vehicleId)}/hero`, { method: 'POST', body: JSON.stringify({ color, confirmCredit: true }) }),
  vehicleModel3d: (vehicleId, color = 'silver') => request(`/vehicle-visuals/vehicles/${encodeURIComponent(vehicleId)}/model?color=${encodeURIComponent(color)}`),
  createVehicleModel3d: (vehicleId, color = 'silver') => request(`/vehicle-visuals/vehicles/${encodeURIComponent(vehicleId)}/model`, { method: 'POST', body: JSON.stringify({ color, confirmCost: true }) }),
}
