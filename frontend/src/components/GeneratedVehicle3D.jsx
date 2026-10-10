import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const PAINT = {
  silver: '#b9c6d4',
  white: '#e8edf4',
  black: '#202732',
  red: '#c92e3a',
  blue: '#245fbd',
  green: '#287b63',
  yellow: '#c7a43c',
  orange: '#d76b2e',
  grey: '#6f7b89',
}

function inferBodyStyle(vehicle) {
  const type = String(vehicle?.vehicleType || 'CAR').toUpperCase()
  const text = `${vehicle?.brand || ''} ${vehicle?.model || ''}`.toLowerCase()
  if (type === 'BIKE') {
    if (/ninja|cbr|r15|s ?1000 ?rr|gsx.?r|panigale|zx.?\d|rr 310|rc 390|sport/.test(text)) return 'SPORT BIKE'
    if (/classic|hunter|bullet|meteor|cruiser|intruder|rebel|avenger/.test(text)) return 'ROADSTER / CRUISER'
    return 'STREET BIKE'
  }
  if (/virtus|slavia|verna|city|camry|corolla|dzire|a4|a6|3 series|c.?class|sedan|superb|octavia/.test(text)) return 'SEDAN'
  if (/swift|i20|baleno|polo|altroz|golf|hatchback|micra|brio|jazz/.test(text)) return 'HATCHBACK'
  if (/mustang|supra|911|amg gt|m4|sports car|coupe|challenger|camaro/.test(text)) return 'SPORT COUPE'
  if (/pickup|hilux|ranger|endeavour|gladiator|pickup truck/.test(text)) return 'PICKUP'
  return 'SUV / CROSSOVER'
}

function standardMaterial(color, props = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.32, ...props })
}

function addMesh(parent, geometry, material, position = [0, 0, 0], scale = null, rotation = null) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  if (scale) mesh.scale.set(...scale)
  if (rotation) mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function makeShape(points) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y))
  shape.closePath()
  return shape
}

function addSideShape(parent, points, material, z, depth = 0.018) {
  const geometry = new THREE.ExtrudeGeometry(makeShape(points), { depth, bevelEnabled: false, curveSegments: 10 })
  return addMesh(parent, geometry, material, [0, 0, z])
}

function addLine(parent, points, material, closed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  const line = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material)
  parent.add(line)
  return line
}

function addTubeBetween(parent, a, b, radius, material, radialSegments = 12) {
  const start = new THREE.Vector3(...a)
  const end = new THREE.Vector3(...b)
  const direction = end.clone().sub(start)
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments), material)
  mesh.position.copy(start.add(end).multiplyScalar(0.5))
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addWheel(parent, x, y, z, radius, tireMaterial, rimMaterial, width = 0.16) {
  const wheel = new THREE.Group()
  wheel.position.set(x, y, z)
  parent.add(wheel)
  // The tyre's circular profile sits in the vehicle's length/height plane;
  // thickness runs across the vehicle, like a real wheel viewed from the side.
  addMesh(wheel, new THREE.TorusGeometry(radius * 0.82, radius * 0.18, 16, 44), tireMaterial)
  addMesh(wheel, new THREE.TorusGeometry(radius * 0.56, radius * 0.045, 10, 36), rimMaterial, [0, 0, 0.015])
  addMesh(wheel, new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width, 24), standardMaterial('#45515e', { metalness: 0.8, roughness: 0.24 }), [0, 0, 0], null, [Math.PI / 2, 0, 0])
  const spokeMaterial = standardMaterial('#b3c0cf', { metalness: 0.85, roughness: 0.23 })
  for (let i = 0; i < 8; i += 1) {
    const spoke = addMesh(wheel, new THREE.BoxGeometry(radius * 0.055, radius * 0.68, 0.025), spokeMaterial, [0, 0, 0.035])
    spoke.rotation.z = (Math.PI * 2 * i) / 8
  }
  addMesh(wheel, new THREE.CylinderGeometry(radius * 0.14, radius * 0.14, width + 0.025, 18), standardMaterial('#e3e9f0', { metalness: 0.9, roughness: 0.18 }), [0, 0, 0.04], null, [Math.PI / 2, 0, 0])
  return wheel
}

function addCar(parent, vehicle, paint) {
  const name = `${vehicle?.brand || ''} ${vehicle?.model || ''}`.toLowerCase()
  const style = inferBodyStyle(vehicle)
  const isSedan = style === 'SEDAN'
  const isHatch = style === 'HATCHBACK'
  const bodyWidth = 0.72
  const bodyColor = standardMaterial(paint, { metalness: 0.72, roughness: 0.23, clearcoat: 0.85, clearcoatRoughness: 0.2 })
  const dark = standardMaterial('#121a25', { metalness: 0.22, roughness: 0.42 })
  const glass = standardMaterial('#172b40', { metalness: 0.38, roughness: 0.14, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
  const trim = standardMaterial('#303a48', { metalness: 0.68, roughness: 0.3 })
  const rim = standardMaterial('#d0d8e3', { metalness: 0.92, roughness: 0.18 })
  const headlamp = standardMaterial('#d8f3ff', { emissive: '#9edfff', emissiveIntensity: 1.5, metalness: 0.35, roughness: 0.16 })
  const tailLamp = standardMaterial('#c61f36', { emissive: '#f01d36', emissiveIntensity: 0.75, roughness: 0.22 })

  // Extruded side silhouette: a proper multi-part vehicle body, not a box placeholder.
  const roofY = isSedan ? 1.47 : isHatch ? 1.59 : 1.82
  const cabinFrontX = isSedan ? 0.63 : 0.94
  const cabinBackX = isSedan ? -0.78 : -0.82
  const profile = [
    [-2.12, 0.48], [-1.97, 0.72], [-1.90, 0.99], [cabinBackX - 0.48, 1.05],
    [cabinBackX, roofY - 0.03], [cabinFrontX - 0.34, roofY], [cabinFrontX + 0.42, 1.06],
    [1.92, 0.98], [2.13, 0.75], [2.08, 0.55], [1.72, 0.46], [-1.72, 0.46],
  ]
  const bodyGeo = new THREE.ExtrudeGeometry(makeShape(profile), { depth: bodyWidth * 2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 8 })
  addMesh(parent, bodyGeo, bodyColor, [0, 0, -bodyWidth])

  // Low bumpers, sills, wheel-arch cladding and front/rear facias.
  addMesh(parent, new THREE.BoxGeometry(3.85, 0.11, 1.43), dark, [-0.01, 0.47, 0])
  addMesh(parent, new THREE.BoxGeometry(0.20, 0.24, 1.35), trim, [2.05, 0.68, 0])
  addMesh(parent, new THREE.BoxGeometry(0.18, 0.23, 1.32), trim, [-2.01, 0.66, 0])
  addMesh(parent, new THREE.BoxGeometry(0.9, 0.08, 1.38), trim, [-0.15, 0.5, 0])

  // Wraparound tinted glass, on both flanks.
  const windowTop = roofY - 0.07
  const frontWindow = isSedan
    ? [[0.05, 1.08], [0.58, 1.38], [0.89, 1.10]]
    : [[-0.01, 1.10], [0.43, windowTop], [0.79, windowTop - 0.02], [1.10, 1.10]]
  const rearWindow = isSedan
    ? [[-1.17, 1.11], [-0.72, 1.39], [-0.12, 1.38], [-0.10, 1.10]]
    : [[-1.20, 1.11], [-0.75, windowTop - 0.04], [-0.12, windowTop - 0.03], [-0.08, 1.10]]
  const windowMat = glass.clone()
  const sideZ = bodyWidth + 0.018
  for (const z of [sideZ, -sideZ - 0.015]) {
    addSideShape(parent, frontWindow, windowMat, z, 0.012)
    addSideShape(parent, rearWindow, windowMat, z, 0.012)
    addLine(parent, [[-0.08, 1.08, z + 0.013], [-0.07, 1.48, z + 0.013]], trim, false)
    // Doors and handles are deliberately subtle but visible at showroom scale.
    addLine(parent, [[-0.60, 0.56, z + 0.014], [-0.60, 1.06, z + 0.014], [-0.08, 1.08, z + 0.014]], trim, false)
    addLine(parent, [[0.58, 0.56, z + 0.014], [0.58, 1.05, z + 0.014], [1.35, 1.02, z + 0.014]], trim, false)
    addMesh(parent, new THREE.BoxGeometry(0.18, 0.025, 0.022), rim, [0.22, 0.99, z + 0.025])
    addMesh(parent, new THREE.BoxGeometry(0.18, 0.025, 0.022), rim, [-1.02, 0.99, z + 0.025])
    addMesh(parent, new THREE.BoxGeometry(0.21, 0.13, 0.12), dark, [0.92, 1.1, z + (z > 0 ? 0.08 : -0.08)])
  }

  // Windscreen and rear glass catch a little cool light.
  addMesh(parent, new THREE.BoxGeometry(0.50, 0.025, 1.28), glass, [0.82, 1.33, 0], [1, 1, 1], [0, 0, -0.38])
  addMesh(parent, new THREE.BoxGeometry(0.40, 0.025, 1.20), glass, [-1.0, 1.27, 0], [1, 1, 1], [0, 0, 0.42])

  // Wheels with actual tyre/rim/spoke geometry.
  addWheel(parent, -1.24, 0.40, 0.71, 0.36, dark, rim, 0.18)
  addWheel(parent, 1.20, 0.40, 0.71, 0.36, dark, rim, 0.18)
  addWheel(parent, -1.24, 0.40, -0.71, 0.36, dark, rim, 0.18)
  addWheel(parent, 1.20, 0.40, -0.71, 0.36, dark, rim, 0.18)

  // LED headlights, grille slats, rear light bars and a simple brand-neutral badge.
  for (const z of [-0.43, 0.43]) {
    addMesh(parent, new THREE.BoxGeometry(0.06, 0.14, 0.26), headlamp, [2.075, 0.84, z])
    addMesh(parent, new THREE.BoxGeometry(0.045, 0.16, 0.18), tailLamp, [-2.03, 0.82, z * 1.08])
  }
  addMesh(parent, new THREE.BoxGeometry(0.045, 0.17, 0.43), dark, [2.145, 0.68, 0])
  for (let i = 0; i < 4; i += 1) addMesh(parent, new THREE.BoxGeometry(0.012, 0.018, 0.36), trim, [2.17, 0.62 + i * 0.035, 0])
  addMesh(parent, new THREE.SphereGeometry(0.055, 16, 12), rim, [2.17, 0.68, 0])
  addMesh(parent, new THREE.BoxGeometry(0.08, 0.08, 0.36), dark, [-2.10, 0.54, 0])

  // Roof rails for SUV/crossover silhouettes; subtle hood crease lines add definition.
  if (!isSedan && !isHatch) {
    for (const z of [-0.52, 0.52]) addTubeBetween(parent, [-0.85, roofY + 0.015, z], [0.48, roofY + 0.015, z], 0.018, trim, 8)
  }
  const crease = new THREE.LineBasicMaterial({ color: '#d9e7f7', transparent: true, opacity: 0.32 })
  addLine(parent, [[1.04, 1.01, 0.735], [1.60, 0.97, 0.735], [1.92, 0.88, 0.735]], crease)
  addLine(parent, [[1.04, 1.01, -0.735], [1.60, 0.97, -0.735], [1.92, 0.88, -0.735]], crease)
  // Slight model-specific accent: not a fake factory logo or exact trim claim.
  if (/thar|fortuner|defender|jimny|wrangler/.test(name)) {
    addMesh(parent, new THREE.BoxGeometry(0.05, 0.28, 0.8), trim, [2.12, 0.73, 0])
  }
  return style
}

function addBike(parent, vehicle, paint) {
  const style = inferBodyStyle(vehicle)
  const text = `${vehicle?.brand || ''} ${vehicle?.model || ''}`.toLowerCase()
  const sport = style === 'SPORT BIKE'
  const paintMat = standardMaterial(paint, { metalness: 0.68, roughness: 0.22, clearcoat: 0.88, clearcoatRoughness: 0.18 })
  const dark = standardMaterial('#111820', { metalness: 0.18, roughness: 0.4 })
  const frame = standardMaterial('#626f7e', { metalness: 0.82, roughness: 0.28 })
  const alloy = standardMaterial('#d5dce7', { metalness: 0.92, roughness: 0.2 })
  const glass = standardMaterial('#d8f4ff', { emissive: '#8cdfff', emissiveIntensity: 1.35, roughness: 0.15 })

  addWheel(parent, -1.08, 0.38, 0, 0.36, dark, alloy, 0.18)
  addWheel(parent, 1.10, 0.38, 0, 0.36, dark, alloy, 0.18)

  // Chassis, swingarm, triple tree and fork pairs.
  addTubeBetween(parent, [-1.05, 0.62, 0], [-0.18, 0.70, 0], 0.045, frame)
  addTubeBetween(parent, [-0.18, 0.70, 0], [0.46, 0.94, 0], 0.045, frame)
  addTubeBetween(parent, [-0.54, 0.62, 0], [0.23, 0.60, 0], 0.04, frame)
  addTubeBetween(parent, [-0.98, 0.58, 0], [-0.48, 0.71, 0], 0.06, frame)
  for (const z of [-0.12, 0.12]) {
    addTubeBetween(parent, [0.76, 1.08, z], [1.10, 0.42, z], 0.038, alloy)
    addTubeBetween(parent, [0.88, 1.06, z], [1.13, 0.42, z], 0.022, frame)
  }
  addTubeBetween(parent, [0.74, 1.13, -0.22], [0.86, 1.13, 0.22], 0.032, frame)
  addTubeBetween(parent, [0.76, 1.1, -0.21], [0.67, 1.02, -0.25], 0.025, dark)
  addTubeBetween(parent, [0.76, 1.1, 0.21], [0.67, 1.02, 0.25], 0.025, dark)

  // Engine block with cooling fins and metallic cover.
  addMesh(parent, new THREE.BoxGeometry(0.48, 0.40, 0.38), standardMaterial('#303945', { metalness: 0.66, roughness: 0.32 }), [-0.13, 0.68, 0])
  for (let i = 0; i < 5; i += 1) addMesh(parent, new THREE.BoxGeometry(0.32, 0.018, 0.41), alloy, [-0.13, 0.59 + i * 0.045, 0])
  addMesh(parent, new THREE.CylinderGeometry(0.12, 0.14, 0.06, 24), frame, [-0.16, 0.68, 0.22], null, [Math.PI / 2, 0, 0])

  // Fuel tank and seat; proportions are generated for the entered vehicle category.
  addMesh(parent, new THREE.SphereGeometry(1, 32, 22), paintMat, [-0.12, 1.07, 0], sport ? [0.48, 0.28, 0.34] : [0.52, 0.30, 0.34])
  addMesh(parent, new THREE.SphereGeometry(1, 24, 16), dark, [-0.64, 0.99, 0], [0.48, 0.12, 0.29])
  addMesh(parent, new THREE.SphereGeometry(1, 24, 16), paintMat, [-0.91, 1.02, 0], [0.29, 0.15, 0.28])
  addMesh(parent, new THREE.SphereGeometry(1, 20, 14), dark, [0.18, 0.92, 0], [0.28, 0.10, 0.29])

  if (sport) {
    // Fairing, chin, and side wings give a recognizable sport-bike silhouette.
    for (const z of [-0.27, 0.27]) {
      addSideShape(parent, [[0.48, 1.16], [0.77, 1.24], [0.94, 1.05], [0.70, 0.82], [0.38, 0.88]], paintMat, z, 0.035)
      addSideShape(parent, [[0.30, 0.92], [0.62, 0.88], [0.44, 0.71], [0.13, 0.70]], dark, z + (z > 0 ? 0.04 : -0.04), 0.02)
    }
    addMesh(parent, new THREE.BoxGeometry(0.24, 0.18, 0.23), glass, [0.88, 1.18, 0])
  } else {
    addMesh(parent, new THREE.SphereGeometry(1, 24, 16), paintMat, [0.66, 1.04, 0], [0.24, 0.22, 0.25])
    addMesh(parent, new THREE.SphereGeometry(1, 20, 14), glass, [0.85, 1.04, 0], [0.12, 0.12, 0.15])
  }

  // Chain guard, pegs, rear shock and exhaust.
  addTubeBetween(parent, [-0.82, 0.63, 0.23], [-0.22, 0.67, 0.23], 0.025, alloy, 8)
  addTubeBetween(parent, [-0.22, 0.67, -0.23], [-0.82, 0.63, -0.23], 0.025, alloy, 8)
  addTubeBetween(parent, [-0.40, 0.56, 0.30], [-0.90, 0.49, 0.34], 0.075, frame)
  addTubeBetween(parent, [-0.88, 0.49, 0.34], [-1.0, 0.47, 0.34], 0.09, alloy)
  addTubeBetween(parent, [-0.42, 0.54, -0.30], [-0.92, 0.49, -0.34], 0.075, frame)
  addMesh(parent, new THREE.BoxGeometry(0.22, 0.09, 0.09), dark, [-0.54, 0.5, 0.36], null, [0, 0, -0.18])

  // Rear LED and side indicator details.
  addMesh(parent, new THREE.BoxGeometry(0.12, 0.07, 0.18), standardMaterial('#c82136', { emissive: '#e31b38', emissiveIntensity: 0.55 }), [-0.99, 1.03, 0])
  for (const z of [-0.28, 0.28]) {
    addMesh(parent, new THREE.SphereGeometry(0.035, 12, 10), standardMaterial('#ffc56c', { emissive: '#ff9f38', emissiveIntensity: 0.6 }), [0.72, 0.91, z])
  }
  return style
}

function makeStage(scene) {
  scene.add(new THREE.HemisphereLight('#dceaff', '#131b2a', 2.1))
  const key = new THREE.DirectionalLight('#f5f8ff', 3.0)
  key.position.set(3.8, 7.0, 4.5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 5
  key.shadow.camera.bottom = -4
  scene.add(key)
  const fill = new THREE.DirectionalLight('#6a98ff', 2.0)
  fill.position.set(-4, 3, -3)
  scene.add(fill)
  const rim = new THREE.PointLight('#45e3ff', 22, 8, 2)
  rim.position.set(-1.5, 2.5, 2.5)
  scene.add(rim)

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.5, 96), new THREE.MeshStandardMaterial({ color: '#111927', metalness: 0.4, roughness: 0.76, transparent: true, opacity: 0.98 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.035
  floor.receiveShadow = true
  scene.add(floor)
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.45, 2.48, 120), new THREE.MeshBasicMaterial({ color: '#2e87d7', transparent: true, opacity: 0.72, side: THREE.DoubleSide }))
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -0.018
  scene.add(ring)
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.75, 2.765, 120), new THREE.MeshBasicMaterial({ color: '#53dbef', transparent: true, opacity: 0.28, side: THREE.DoubleSide }))
  ring2.rotation.x = -Math.PI / 2
  ring2.position.y = -0.016
  scene.add(ring2)
}

function StaticFallback({ vehicle, color }) {
  const isBike = String(vehicle?.vehicleType || '').toUpperCase() === 'BIKE'
  const paint = PAINT[String(color || 'silver').toLowerCase()] || PAINT.silver
  return <div className="v6-static-model" role="img" aria-label={`${vehicle?.brand || ''} ${vehicle?.model || ''} ${isBike ? 'motorcycle' : 'car'} visual fallback`}>
    <svg viewBox="0 0 900 440" aria-hidden="true">
      <defs>
        <linearGradient id="v6paint" x1="0" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".85"/><stop offset=".22" stopColor={paint}/><stop offset=".8" stopColor={paint} stopOpacity=".72"/><stop offset="1" stopColor="#0a1220"/></linearGradient>
        <linearGradient id="v6glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#9cd9ff" stopOpacity=".78"/><stop offset="1" stopColor="#101e31"/></linearGradient>
        <filter id="v6shadow"><feGaussianBlur stdDeviation="13"/></filter>
      </defs>
      <ellipse cx="450" cy="352" rx="325" ry="31" fill="#000" opacity=".55" filter="url(#v6shadow)"/>
      {!isBike ? <g transform="translate(0 8)">
        <path d="M135 286 L155 224 Q165 202 203 196 L297 181 Q336 118 398 114 L543 114 Q591 117 631 184 L739 202 Q766 207 775 244 L781 283 L744 302 L167 302Z" fill="url(#v6paint)" stroke="#e9f4ff" strokeOpacity=".4" strokeWidth="3"/>
        <path d="M319 180 L359 132 Q372 125 400 125 L457 125 L457 180Z M474 125 L540 125 Q575 131 608 180 L474 180Z" fill="url(#v6glass)" stroke="#95adca" strokeWidth="4"/>
        <path d="M467 126 L467 287" stroke="#253244" strokeWidth="5"/>
        <path d="M192 218 L272 206 L277 228 L174 243Z" fill="#111923"/>
        <path d="M691 224 L758 239 L760 254 L691 250Z" fill="#c8efff" stroke="#f4fbff" strokeWidth="2"/>
        <path d="M148 250 L206 244 L200 264 L143 268Z" fill="#e43449"/>
        <path d="M310 286 L646 286" stroke="#d6e1f1" strokeOpacity=".7" strokeWidth="3"/>
        {[280,641].map(x=><g key={x}><circle cx={x} cy="292" r="58" fill="#080d14" stroke="#606e80" strokeWidth="8"/><circle cx={x} cy="292" r="36" fill="#aebdce"/><circle cx={x} cy="292" r="25" fill="#17202c"/><circle cx={x} cy="292" r="9" fill="#dce7f5"/></g>)}
      </g> : <g transform="translate(0 0)">
        {[245,652].map(x=><g key={x}><circle cx={x} cy="300" r="60" fill="#080d14" stroke="#657286" strokeWidth="8"/><circle cx={x} cy="300" r="39" fill="none" stroke="#c6d3e3" strokeWidth="4"/><circle cx={x} cy="300" r="10" fill="#bcc8d8"/><path d={`M${x-31} 300 L${x+31} 300 M${x} 269 L${x} 331 M${x-23} 278 L${x+23} 322 M${x-23} 322 L${x+23} 278`} stroke="#94a5ba" strokeWidth="3"/></g>)}
        <path d="M231 292 L337 238 L470 250 L579 282 L640 300" fill="none" stroke="#606d7d" strokeWidth="18" strokeLinecap="round"/>
        <path d="M342 228 Q360 190 420 186 L490 206 L527 248 L437 273 L349 260Z" fill="url(#v6paint)" stroke="#eaf4ff" strokeOpacity=".4" strokeWidth="3"/>
        <path d="M458 210 L545 210 L592 252 L523 263 L482 247Z" fill="url(#v6paint)"/>
        <path d="M585 254 L655 280 L691 298" fill="none" stroke="#d1deed" strokeWidth="10" strokeLinecap="round"/>
        <path d="M568 233 L593 181 L614 166" fill="none" stroke="#b8c8d9" strokeWidth="11" strokeLinecap="round"/>
        <path d="M587 180 L651 170" fill="none" stroke="#252f3d" strokeWidth="12" strokeLinecap="round"/>
        <ellipse cx="626" cy="210" rx="22" ry="15" fill="#d7f5ff" stroke="#ffffff" strokeWidth="4"/>
        <path d="M334 224 L285 218 L265 240 L312 250Z" fill="url(#v6paint)"/>
        <path d="M310 253 L263 299" stroke="#cdd8e7" strokeWidth="6"/>
        <path d="M415 262 L422 283 L490 291" fill="none" stroke="#202a37" strokeWidth="10" strokeLinecap="round"/>
      </g>}
    </svg>
  </div>
}

export default function GeneratedVehicle3D({ vehicle, paintColor = 'silver', autoRotate = true }) {
  const hostRef = useRef(null)
  const autoRotateRef = useRef(autoRotate)
  const [webglFailed, setWebglFailed] = useState(false)
  const [bodyStyle, setBodyStyle] = useState('')

  useEffect(() => { autoRotateRef.current = autoRotate }, [autoRotate])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    setWebglFailed(false)
    setBodyStyle(inferBodyStyle(vehicle))
    let renderer
    let frameId = 0
    let resizeObserver
    let draggingId = null
    let previousX = 0
    let previousY = 0
    let previousPinchDistance = null
    const pointers = new Map()
    let disposed = false

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.08
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.domElement.className = 'v6-three-canvas'
      renderer.domElement.setAttribute('aria-label', `Interactive 3D vehicle profile for ${vehicle?.brand || ''} ${vehicle?.model || ''}. Drag to rotate, pinch or scroll to zoom.`)
      renderer.domElement.tabIndex = 0
      renderer.domElement.style.touchAction = 'none'
      host.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80)
      camera.fov = 31
      camera.position.set(4.0, 2.3, 4.8)
      camera.lookAt(0, 0.75, 0)
      makeStage(scene)
      const vehicleGroup = new THREE.Group()
      vehicleGroup.rotation.y = -0.28
      scene.add(vehicleGroup)
      const paint = PAINT[String(paintColor || 'silver').toLowerCase()] || PAINT.silver
      const isBike = String(vehicle?.vehicleType || 'CAR').toUpperCase() === 'BIKE'
      if (isBike) { addBike(vehicleGroup, vehicle, paint); vehicleGroup.scale.setScalar(1.24) }
      else addCar(vehicleGroup, vehicle, paint)

      const resize = () => {
        if (!renderer || disposed) return
        const width = Math.max(1, host.clientWidth)
        const height = Math.max(1, host.clientHeight)
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      resize()
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(host)
      } else window.addEventListener('resize', resize)

      const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
      const dolly = amount => {
        const direction = camera.position.clone().sub(new THREE.Vector3(0, 0.7, 0))
        const next = THREE.MathUtils.clamp(direction.length() + amount, 4.4, 10.8)
        direction.setLength(next)
        camera.position.copy(direction.add(new THREE.Vector3(0, 0.7, 0)))
        camera.lookAt(0, 0.7, 0)
      }
      const pointerDown = event => {
        event.preventDefault()
        renderer.domElement.focus({ preventScroll: true })
        try { renderer.domElement.setPointerCapture(event.pointerId) } catch { /* capture can fail when browser interrupts touch */ }
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (pointers.size === 1) {
          draggingId = event.pointerId
          previousX = event.clientX
          previousY = event.clientY
        } else if (pointers.size >= 2) {
          const values = [...pointers.values()]
          previousPinchDistance = distance(values[0], values[1])
          draggingId = null
        }
      }
      const pointerMove = event => {
        if (!pointers.has(event.pointerId)) return
        const previous = pointers.get(event.pointerId)
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (pointers.size >= 2) {
          const values = [...pointers.values()]
          const pinchDistance = distance(values[0], values[1])
          if (previousPinchDistance != null) dolly((previousPinchDistance - pinchDistance) * 0.012)
          previousPinchDistance = pinchDistance
        } else if (draggingId === event.pointerId) {
          const dx = event.clientX - previousX
          const dy = event.clientY - previousY
          vehicleGroup.rotation.y += dx * 0.009
          vehicleGroup.rotation.x = THREE.MathUtils.clamp(vehicleGroup.rotation.x + dy * 0.0015, -0.12, 0.12)
          previousX = event.clientX
          previousY = event.clientY
        }
      }
      const pointerUp = event => {
        pointers.delete(event.pointerId)
        if (draggingId === event.pointerId) draggingId = null
        const values = [...pointers.values()]
        previousPinchDistance = values.length >= 2 ? distance(values[0], values[1]) : null
        if (values.length === 1) {
          const [id, p] = [...pointers.entries()][0]
          draggingId = id
          previousX = p.x
          previousY = p.y
        }
      }
      const wheel = event => {
        event.preventDefault()
        dolly(Math.sign(event.deltaY) * 0.48)
      }
      const keydown = event => {
        if (event.key === 'ArrowLeft') vehicleGroup.rotation.y -= 0.16
        else if (event.key === 'ArrowRight') vehicleGroup.rotation.y += 0.16
        else if (event.key === '+' || event.key === '=') dolly(-0.45)
        else if (event.key === '-' || event.key === '_') dolly(0.45)
      }
      const canvas = renderer.domElement
      canvas.addEventListener('pointerdown', pointerDown)
      canvas.addEventListener('pointermove', pointerMove)
      canvas.addEventListener('pointerup', pointerUp)
      canvas.addEventListener('pointercancel', pointerUp)
      canvas.addEventListener('wheel', wheel, { passive: false })
      canvas.addEventListener('keydown', keydown)

      const reduceMotionEnabled = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      const render = () => {
        if (disposed) return
        if (autoRotateRef.current && !draggingId && !reduceMotionEnabled) vehicleGroup.rotation.y += 0.0025
        renderer.render(scene, camera)
        frameId = window.requestAnimationFrame(render)
      }
      render()

      return () => {
        disposed = true
        window.cancelAnimationFrame(frameId)
        resizeObserver?.disconnect()
        if (!resizeObserver) window.removeEventListener('resize', resize)
        canvas.removeEventListener('pointerdown', pointerDown)
        canvas.removeEventListener('pointermove', pointerMove)
        canvas.removeEventListener('pointerup', pointerUp)
        canvas.removeEventListener('pointercancel', pointerUp)
        canvas.removeEventListener('wheel', wheel)
        canvas.removeEventListener('keydown', keydown)
        scene.traverse(object => {
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            materials.forEach(material => material.dispose())
          }
        })
        renderer.dispose()
        renderer.domElement.remove()
      }
    } catch (error) {
      console.warn('WebGL vehicle studio unavailable; using an accessible static vehicle visual.', error)
      if (renderer) {
        renderer.dispose()
        renderer.domElement?.remove()
      }
      setWebglFailed(true)
      return undefined
    }
  }, [vehicle?.id, vehicle?.vehicleType, vehicle?.brand, vehicle?.model, vehicle?.modelYear, paintColor])

  return <div className="v6-generated-viewer" ref={hostRef}>
    {webglFailed && <StaticFallback vehicle={vehicle} color={paintColor} />}
    <div className="v6-model-status">
      <span className="v6-model-status-dot" />
      <span>{webglFailed ? 'VEHICLE VISUAL' : 'INTERACTIVE 3D PROFILE'}</span>
      <b>{bodyStyle || inferBodyStyle(vehicle)}</b>
    </div>
    <div className="v6-model-instructions">{webglFailed ? 'Static visual fallback' : 'Drag to rotate · Pinch or scroll to zoom'}</div>
    <div className="v6-model-caption">Representative geometry · not a factory-certified trim</div>
  </div>
}
