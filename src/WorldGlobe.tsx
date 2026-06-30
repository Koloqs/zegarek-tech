import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type GlobeCity = {
  city: string
  code: string
  lat: number
  lon: number
  zone: string
}

export type GlobeSelection = {
  code: string
  label: string
  lat: number
  lon: number
  nearestCity: string
  zone: string
}

type WorldGlobeProps = {
  cities: GlobeCity[]
  selected: GlobeSelection
  onSelect: (selection: GlobeSelection) => void
  resolveSelection: (lat: number, lon: number) => GlobeSelection
}

type MarkerRecord = {
  city: GlobeCity
  halo: THREE.Mesh
  marker: THREE.Mesh
}

const earthRadius = 1.54

const continents = [
  [
    [72, -168], [69, -140], [60, -124], [52, -125], [49, -96], [30, -82],
    [19, -99], [15, -110], [32, -124], [46, -124], [58, -151], [72, -168],
  ],
  [
    [13, -82], [10, -76], [5, -78], [-5, -81], [-18, -70], [-34, -72],
    [-55, -67], [-51, -58], [-34, -53], [-16, -40], [2, -50], [10, -62],
    [13, -82],
  ],
  [
    [71, -10], [63, 18], [56, 40], [45, 58], [34, 46], [28, 34], [12, 43],
    [-4, 40], [-15, 28], [-34, 20], [-35, 10], [-17, 12], [0, 9], [8, -12],
    [30, -10], [45, -6], [58, -4], [71, -10],
  ],
  [
    [78, 42], [70, 86], [60, 132], [48, 142], [34, 122], [23, 105],
    [8, 103], [1, 114], [-8, 108], [6, 77], [21, 72], [29, 51], [41, 45],
    [55, 60], [66, 34], [78, 42],
  ],
  [
    [-11, 112], [-20, 122], [-33, 115], [-43, 146], [-31, 154], [-17, 144],
    [-11, 112],
  ],
  [
    [83, -72], [76, -30], [69, -20], [61, -43], [70, -62], [83, -72],
  ],
]

function latLonToVector(latValue: number, lonValue: number, radius = earthRadius) {
  const lat = THREE.MathUtils.degToRad(latValue)
  const lon = THREE.MathUtils.degToRad(lonValue)

  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  )
}

function vectorToLatLon(vector: THREE.Vector3) {
  const normalized = vector.clone().normalize()
  const lat = THREE.MathUtils.radToDeg(Math.asin(normalized.y))
  const lon = THREE.MathUtils.radToDeg(Math.atan2(normalized.x, normalized.z))
  return { lat, lon }
}

function cityToVector(city: GlobeCity, radius = earthRadius) {
  return latLonToVector(city.lat, city.lon, radius)
}

function makeLine(points: THREE.Vector3[], color: number, opacity: number, loop = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    opacity,
    transparent: true,
  })
  return loop ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material)
}

function buildGrid() {
  const grid = new THREE.Group()
  const color = 0xe9fff6

  for (let lat = -60; lat <= 60; lat += 30) {
    const points: THREE.Vector3[] = []
    for (let lon = 0; lon < 360; lon += 4) {
      points.push(latLonToVector(lat, lon, earthRadius + 0.006))
    }
    grid.add(makeLine(points, color, lat === 0 ? 0.24 : 0.13, true))
  }

  for (let lon = 0; lon < 360; lon += 30) {
    const points: THREE.Vector3[] = []
    for (let lat = -88; lat <= 88; lat += 4) {
      points.push(latLonToVector(lat, lon, earthRadius + 0.008))
    }
    grid.add(makeLine(points, color, 0.12))
  }

  return grid
}

function buildContinents() {
  const group = new THREE.Group()

  continents.forEach((continent) => {
    const points = continent.map(([lat, lon]) => latLonToVector(lat, lon, earthRadius + 0.018))
    group.add(makeLine(points, 0xb9fff0, 0.42, false))
  })

  return group
}

function createArc(from: THREE.Vector3, to: THREE.Vector3) {
  const start = from.clone().normalize().multiplyScalar(earthRadius + 0.04)
  const end = to.clone().normalize().multiplyScalar(earthRadius + 0.04)
  const middle = start
    .clone()
    .add(end)
    .normalize()
    .multiplyScalar(earthRadius + 0.42)
  const curve = new THREE.CatmullRomCurve3([start, middle, end])
  const geometry = new THREE.TubeGeometry(curve, 28, 0.006, 6, false)
  const material = new THREE.MeshBasicMaterial({
    color: 0x56e8cf,
    opacity: 0.18,
    transparent: true,
  })
  return new THREE.Mesh(geometry, material)
}

function updateMarker(record: MarkerRecord, selectedZone: string) {
  const selected = record.city.zone === selectedZone
  record.marker.scale.setScalar(selected ? 1.48 : 1)
  record.halo.scale.setScalar(selected ? 1.55 : 1)

  const markerMaterial = record.marker.material as THREE.MeshStandardMaterial
  markerMaterial.color.setHex(selected ? 0xffc857 : 0x56e8cf)
  markerMaterial.emissive.setHex(selected ? 0x8b4b00 : 0x0b695f)
  markerMaterial.emissiveIntensity = selected ? 0.7 : 0.38

  const haloMaterial = record.halo.material as THREE.MeshBasicMaterial
  haloMaterial.color.setHex(selected ? 0xff765f : 0x56e8cf)
  haloMaterial.opacity = selected ? 0.34 : 0.18
}

export function WorldGlobe({ cities, selected, onSelect, resolveSelection }: WorldGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const onSelectRef = useRef(onSelect)
  const resolveSelectionRef = useRef(resolveSelection)
  const markerRecordsRef = useRef<MarkerRecord[]>([])
  const selectedRef = useRef(selected)
  const targetRotationRef = useRef({ x: 0.24, y: 0 })
  const pinRef = useRef<THREE.Mesh | null>(null)
  const pinHaloRef = useRef<THREE.Mesh | null>(null)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    resolveSelectionRef.current = resolveSelection
  }, [resolveSelection])

  useEffect(() => {
    selectedRef.current = selected
    targetRotationRef.current = {
      x: THREE.MathUtils.degToRad(selected.lat) * 0.48 + 0.16,
      y: -THREE.MathUtils.degToRad(selected.lon),
    }

    const position = latLonToVector(selected.lat, selected.lon, earthRadius + 0.055)
    pinRef.current?.position.copy(position)
    pinHaloRef.current?.position.copy(position.clone().normalize().multiplyScalar(earthRadius + 0.066))
    markerRecordsRef.current.forEach((record) => updateMarker(record, selected.zone))
  }, [selected])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
    })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 0, 5.8)

    const root = new THREE.Group()
    scene.add(root)

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius, 96, 96),
      new THREE.MeshStandardMaterial({
        color: 0x153d39,
        emissive: 0x082321,
        emissiveIntensity: 0.28,
        metalness: 0.12,
        roughness: 0.62,
      }),
    )
    root.add(globe)

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius + 0.055, 96, 96),
      new THREE.MeshBasicMaterial({
        color: 0x62ffe1,
        opacity: 0.105,
        transparent: true,
        side: THREE.BackSide,
      }),
    )
    root.add(atmosphere, buildGrid(), buildContinents())

    const markerGeometry = new THREE.SphereGeometry(0.038, 18, 12)
    const haloGeometry = new THREE.RingGeometry(0.062, 0.09, 28)
    const markers: THREE.Mesh[] = []
    const selectedVector = latLonToVector(selectedRef.current.lat, selectedRef.current.lon, earthRadius + 0.018)

    cities.forEach((city) => {
      const position = cityToVector(city, earthRadius + 0.035)
      const marker = new THREE.Mesh(
        markerGeometry.clone(),
        new THREE.MeshStandardMaterial({
          color: 0x56e8cf,
          emissive: 0x0b695f,
          emissiveIntensity: 0.38,
          metalness: 0.2,
          roughness: 0.24,
        }),
      )
      marker.position.copy(position)
      marker.userData.zone = city.zone

      const halo = new THREE.Mesh(
        haloGeometry.clone(),
        new THREE.MeshBasicMaterial({
          color: 0x56e8cf,
          opacity: 0.18,
          transparent: true,
          side: THREE.DoubleSide,
        }),
      )
      halo.position.copy(position.clone().normalize().multiplyScalar(earthRadius + 0.045))
      halo.lookAt(0, 0, 0)

      const record = { city, halo, marker }
      updateMarker(record, selectedRef.current.zone)
      markerRecordsRef.current.push(record)
      markers.push(marker)
      root.add(halo, marker)
    })

    cities
      .filter((city) => city.zone !== selectedRef.current.zone)
      .forEach((city) => root.add(createArc(selectedVector, cityToVector(city))))

    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 24, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffc857,
        emissive: 0x9a4b00,
        emissiveIntensity: 0.72,
        metalness: 0.18,
        roughness: 0.22,
      }),
    )
    const pinHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.09, 0.14, 32),
      new THREE.MeshBasicMaterial({
        color: 0xff765f,
        opacity: 0.35,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    )
    pinRef.current = pin
    pinHaloRef.current = pinHalo
    const initialPin = latLonToVector(selectedRef.current.lat, selectedRef.current.lon, earthRadius + 0.055)
    pin.position.copy(initialPin)
    pinHalo.position.copy(initialPin.clone().normalize().multiplyScalar(earthRadius + 0.066))
    root.add(pinHalo, pin)

    scene.add(new THREE.AmbientLight(0xffffff, 1))

    const keyLight = new THREE.PointLight(0xffffff, 4, 12)
    keyLight.position.set(2.8, 2.6, 3.8)
    scene.add(keyLight)

    const rimLight = new THREE.PointLight(0x4de8d0, 3, 12)
    rimLight.position.set(-3.2, -1.6, 3.2)
    scene.add(rimLight)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const width = Math.max(1, box.width)
      const height = Math.max(1, box.height)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const setPointer = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect()
      pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1
      pointer.y = -(((event.clientY - box.top) / box.height) * 2 - 1)
      raycaster.setFromCamera(pointer, camera)
    }

    const onPointerMove = (event: PointerEvent) => {
      setPointer(event)
      const overSurface = raycaster.intersectObject(globe, false).length > 0
      canvas.style.cursor = overSurface ? 'crosshair' : 'grab'
    }

    const onPointerLeave = () => {
      canvas.style.cursor = 'grab'
    }

    const onPointerDown = (event: PointerEvent) => {
      setPointer(event)
      const surfaceHit = raycaster.intersectObject(globe, false)[0]
      if (!surfaceHit) return

      const localPoint = globe.worldToLocal(surfaceHit.point.clone())
      const { lat, lon } = vectorToLatLon(localPoint)
      onSelectRef.current(resolveSelectionRef.current(lat, lon))
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('pointerdown', onPointerDown)
    resize()

    let frameId = 0
    const animate = (elapsed: number) => {
      const target = targetRotationRef.current
      const idle = Math.sin(elapsed * 0.0002) * 0.045
      root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, target.x, 0.045)
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, target.y + idle, 0.04)
      root.rotation.z = Math.sin(elapsed * 0.00016) * 0.018

      markerRecordsRef.current.forEach((record) => {
        record.marker.lookAt(camera.position)
        record.halo.lookAt(camera.position)
      })
      pin.lookAt(camera.position)
      pinHalo.lookAt(camera.position)

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('pointerdown', onPointerDown)
      markerRecordsRef.current = []
      pinRef.current = null
      pinHaloRef.current = null
      renderer.dispose()
      root.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineLoop) {
          object.geometry.dispose()
          const material = object.material
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose())
          } else {
            material.dispose()
          }
        }
      })
    }
  }, [cities])

  return <canvas className="world-globe-canvas" ref={canvasRef} aria-hidden="true" />
}
