import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type Props = {
  imageUrl?: string
  className?: string
}

/** Orbit / pan / zoom plane preview of a result image via three.js */
export function Preview3DView({ imageUrl, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const w = mount.clientWidth || 640
    const h = mount.clientHeight || 420

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf4f5f7)

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
    camera.position.set(0, 0.35, 2.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = true
    controls.minDistance = 0.8
    controls.maxDistance = 8

    const ambient = new THREE.AmbientLight(0xffffff, 0.85)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.65)
    dir.position.set(2, 3, 4)
    scene.add(dir)

    const grid = new THREE.GridHelper(6, 24, 0xcbd5e1, 0xe2e8f0)
    grid.position.y = -0.75
    scene.add(grid)

    let mesh: THREE.Mesh | null = null
    let tex: THREE.Texture | null = null
    let disposed = false

    const buildPlane = (texture?: THREE.Texture) => {
      if (mesh) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        mesh = null
      }
      const mat = texture
        ? new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0.05 })
        : new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.9 })
      const aspect = texture?.image
        ? (texture.image as HTMLImageElement).width /
          Math.max(1, (texture.image as HTMLImageElement).height)
        : 16 / 9
      const height = 1.35
      const width = height * aspect
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat)
      scene.add(mesh)
    }

    buildPlane()

    if (imageUrl) {
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(
        imageUrl,
        (t) => {
          if (disposed) {
            t.dispose()
            return
          }
          t.colorSpace = THREE.SRGBColorSpace
          tex = t
          buildPlane(t)
        },
        undefined,
        () => {
          /* keep placeholder plane */
        },
      )
    }

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    const onResize = () => {
      if (!mount) return
      const nw = mount.clientWidth
      const nh = mount.clientHeight
      camera.aspect = nw / Math.max(1, nh)
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      if (mesh) {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
      tex?.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [imageUrl])

  return <div ref={mountRef} className={className ?? 'h-full w-full'} />
}
