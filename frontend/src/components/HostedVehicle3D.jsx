import { useEffect, useRef, useState } from 'react'
import { Box, ExternalLink, LoaderCircle } from 'lucide-react'

function ensureCar3DLibrary() {
  if (window.customElements?.get('car-3d')) return Promise.resolve()
  if (window.__autoSphereCar3dLoad) return window.__autoSphereCar3dLoad
  window.__autoSphereCar3dLoad = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://carimage.dev/embed/3d.js'
    script.async = true
    script.onload = () => {
      if (window.customElements?.get('car-3d')) resolve()
      else window.customElements?.whenDefined('car-3d').then(resolve).catch(reject)
    }
    script.onerror = () => reject(new Error('The hosted 3D viewer library could not be loaded.'))
    document.head.appendChild(script)
  })
  return window.__autoSphereCar3dLoad
}

export default function HostedVehicle3D({ modelId, vehicle, modelStatus = 'PROCESSING', progress = 0, message = '' }) {
  const hostRef = useRef(null)
  const [libraryState, setLibraryState] = useState('loading')

  useEffect(() => {
    const host = hostRef.current
    if (!host || !modelId) return undefined
    let cancelled = false
    setLibraryState('loading')
    host.replaceChildren()

    ensureCar3DLibrary().then(() => {
      if (cancelled || !host) return
      const element = document.createElement('car-3d')
      element.setAttribute('model', modelId)
      element.setAttribute('spin', 'true')
      element.setAttribute('backdrop', '#080d14')
      element.setAttribute('alt', `${vehicle?.modelYear || ''} ${vehicle?.brand || ''} ${vehicle?.model || 'vehicle'} interactive 3D model`.trim())
      element.style.display = 'block'
      element.style.width = '100%'
      element.style.height = '100%'
      element.style.minHeight = '320px'
      host.replaceChildren(element)
      setLibraryState('ready')
    }).catch(() => {
      if (!cancelled) setLibraryState('error')
    })

    return () => { cancelled = true; host.replaceChildren() }
  }, [modelId, vehicle?.brand, vehicle?.model, vehicle?.modelYear])

  return <div className="v6-hosted-3d">
    <div className="v6-hosted-3d-top"><span><Box size={14} /> CATALOG-GENERATED 3D</span><span>{String(modelStatus || 'PROCESSING').replaceAll('_', ' ')}</span></div>
    <div className="v6-hosted-3d-content" ref={hostRef}>
      {libraryState === 'loading' && <div className="v6-hosted-3d-message"><LoaderCircle className="v6-loader-icon" size={24} /><strong>Opening the hosted 3D model…</strong><span>The local model remains available from the studio controls.</span></div>}
      {libraryState === 'error' && <div className="v6-hosted-3d-message"><Box size={25} /><strong>The hosted viewer could not load.</strong><span>Check the browser connection or return to the local interactive model.</span><a href="https://carimage.dev/docs/3d" target="_blank" rel="noreferrer">Provider viewer notes <ExternalLink size={12} /></a></div>}
    </div>
    {String(modelStatus).toUpperCase() !== 'READY' && <div className="v6-provider-progress"><span><LoaderCircle className="v6-loader-icon" size={14} /> {message || 'The provider is still preparing this model.'}</span><div><i style={{ width: `${Math.max(3, Math.min(100, Number(progress || 0)))}%` }} /></div></div>}
    <div className="v6-hosted-disclaimer">Provider-generated geometry from catalog renders; not OEM-certified CAD or a mechanical inspection.</div>
  </div>
}
