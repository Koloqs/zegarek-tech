import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type OrbitalClockProps = {
  date: Date
}

function buildDialTicks() {
  const geometry = new THREE.BoxGeometry(0.016, 0.16, 0.018)
  const material = new THREE.MeshStandardMaterial({
    color: 0xf5efe0,
    metalness: 0.38,
    roughness: 0.42,
  })
  const ticks = new THREE.InstancedMesh(geometry, material, 60)
  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()

  for (let index = 0; index < 60; index += 1) {
    const angle = (index / 60) * Math.PI * 2
    const major = index % 5 === 0
    position.set(Math.sin(angle) * 1.72, Math.cos(angle) * 1.72, 0)
    quaternion.setFromEuler(new THREE.Euler(0, 0, -angle))
    scale.set(major ? 1.45 : 0.78, major ? 1.25 : 0.5, 1)
    matrix.compose(position, quaternion, scale)
    ticks.setMatrixAt(index, matrix)
  }

  return ticks
}

export function OrbitalClock({ date }: OrbitalClockProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dateRef = useRef(date)

  useEffect(() => {
    dateRef.current = date
  }, [date])

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
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 0, 6.2)

    const root = new THREE.Group()
    root.rotation.x = -0.34
    root.rotation.y = 0.22
    scene.add(root)

    const keyLight = new THREE.PointLight(0xffffff, 3.8, 12)
    keyLight.position.set(2.6, 3.2, 4.2)
    scene.add(keyLight)

    const fillLight = new THREE.PointLight(0x54d6ba, 2.2, 12)
    fillLight.position.set(-3.8, -1.8, 3.2)
    scene.add(fillLight)

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x11151c,
      emissive: 0x0a1f22,
      emissiveIntensity: 0.18,
      metalness: 0.7,
      roughness: 0.22,
    })

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x29d3b7,
      emissive: 0x0d776e,
      emissiveIntensity: 0.45,
      metalness: 0.46,
      roughness: 0.18,
    })

    const coralMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b52,
      emissive: 0x8a1f14,
      emissiveIntensity: 0.28,
      metalness: 0.22,
      roughness: 0.34,
    })

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.95, 0.045, 16, 160),
      ringMaterial,
    )
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.018, 12, 128),
      accentMaterial,
    )
    const tiltedRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.014, 12, 128),
      coralMaterial,
    )
    tiltedRing.rotation.x = Math.PI / 2.8
    tiltedRing.rotation.y = Math.PI / 8

    root.add(outerRing, innerRing, tiltedRing, buildDialTicks())

    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 32, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffc857,
        emissive: 0x8c5200,
        emissiveIntensity: 0.35,
        metalness: 0.48,
        roughness: 0.2,
      }),
    )
    root.add(hub)

    const handGroup = new THREE.Group()
    root.add(handGroup)

    const makeHand = (length: number, width: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, width), material)
      mesh.geometry.translate(0, length / 2, 0)
      return mesh
    }

    const hourHand = makeHand(0.82, 0.05, ringMaterial)
    const minuteHand = makeHand(1.18, 0.032, accentMaterial)
    const secondHand = makeHand(1.35, 0.014, coralMaterial)
    handGroup.add(hourHand, minuteHand, secondHand)

    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 140
    const positions = new Float32Array(particleCount * 3)
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.15 + Math.random() * 1.75
      const angle = Math.random() * Math.PI * 2
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = Math.sin(angle) * radius
      positions[index * 3 + 2] = (Math.random() - 0.5) * 1.2
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        opacity: 0.42,
        size: 0.018,
        transparent: true,
      }),
    )
    root.add(particles)

    let frameId = 0
    const resize = () => {
      const box = canvas.getBoundingClientRect()
      const width = Math.max(1, box.width)
      const height = Math.max(1, box.height)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const animate = (elapsed: number) => {
      const current = dateRef.current
      const seconds = current.getSeconds() + current.getMilliseconds() / 1000
      const minutes = current.getMinutes() + seconds / 60
      const hours = (current.getHours() % 12) + minutes / 60

      hourHand.rotation.z = -(hours / 12) * Math.PI * 2
      minuteHand.rotation.z = -(minutes / 60) * Math.PI * 2
      secondHand.rotation.z = -(seconds / 60) * Math.PI * 2

      const drift = elapsed * 0.00012
      root.rotation.z = Math.sin(elapsed * 0.00018) * 0.05
      innerRing.rotation.z = drift * 3.8
      tiltedRing.rotation.z = -drift * 2.4
      particles.rotation.z = drift
      particles.rotation.x = Math.sin(elapsed * 0.00022) * 0.18

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      renderer.dispose()
      particleGeometry.dispose()
      root.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
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
  }, [])

  return <canvas className="orbital-clock" ref={canvasRef} aria-hidden="true" />
}
