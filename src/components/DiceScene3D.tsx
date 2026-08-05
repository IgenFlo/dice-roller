import { useEffect, useRef } from 'react'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { createDieMaterials, disposeDieMaterials } from '../animation/threeDice/diceMaterials'
import { getUpFaceValue, quaternionForValueUp } from '../animation/threeDice/dieOrientation'
import type { ThrowSettings } from '../animation/throwSettings'
import type { Die } from '../domain/dice'
import type { DieAppearance } from '../domain/dieAppearance'
import './DiceScene3D.css'

const AREA_DEPTH = 8
const MAX_HALF_WIDTH = 8
const DIE_SIZE = 1
const WORLD_GRAVITY = -30
const CAMERA_FOV = 45
const SETTLE_LINEAR_SPEED = 0.15
const SETTLE_ANGULAR_SPEED = 0.2
const SETTLE_FRAMES = 18
const MAX_THROW_DURATION_MS = 5000
const GRID_SPACING = 1.5
const GRID_COLUMNS = 5

interface DiceScene3DProps {
  dice: Die[]
  appearance: DieAppearance
  settings: ThrowSettings
  throwRequestCount: number
  disabled: boolean
  onToggleHold: (dieId: number) => void
  onRollResolved: (values: Readonly<Record<number, number>>) => void
}

interface SceneDie {
  id: number
  mesh: THREE.Mesh
  ring: THREE.Mesh
  body: CANNON.Body
}

interface ActiveThrow {
  ids: readonly number[]
  settledFrames: number
  startedAt: number
}

interface SceneContext {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  world: CANNON.World
  dieGeometry: THREE.BoxGeometry
  ringGeometry: THREE.RingGeometry
  diceMaterial: CANNON.Material
  contactMaterials: CANNON.ContactMaterial[]
  walls: { left: CANNON.Body; right: CANNON.Body; back: CANNON.Body; front: CANNON.Body }
  sceneDice: Map<number, SceneDie>
  halfWidth: number
  activeThrow: ActiveThrow | null
}

function gridPosition(index: number, count: number): { x: number; z: number } {
  const columns = Math.min(count, GRID_COLUMNS)
  const rows = Math.ceil(count / GRID_COLUMNS)
  const column = index % GRID_COLUMNS
  const row = Math.floor(index / GRID_COLUMNS)
  return {
    x: (column - (columns - 1) / 2) * GRID_SPACING,
    z: (row - (rows - 1) / 2) * GRID_SPACING,
  }
}

function isBodyCalm(body: CANNON.Body): boolean {
  return (
    body.velocity.length() < SETTLE_LINEAR_SPEED &&
    body.angularVelocity.length() < SETTLE_ANGULAR_SPEED
  )
}

export function DiceScene3D({
  dice,
  appearance,
  settings,
  throwRequestCount,
  disabled,
  onToggleHold,
  onRollResolved,
}: DiceScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contextRef = useRef<SceneContext | null>(null)
  const diceRef = useRef(dice)
  const appearanceRef = useRef(appearance)
  const settingsRef = useRef(settings)
  const disabledRef = useRef(disabled)
  const onToggleHoldRef = useRef(onToggleHold)
  const onRollResolvedRef = useRef(onRollResolved)
  const lastThrowRequestRef = useRef(throwRequestCount)
  const skipNextValueSyncRef = useRef(false)

  useEffect(() => {
    diceRef.current = dice
    appearanceRef.current = appearance
    settingsRef.current = settings
    disabledRef.current = disabled
    onToggleHoldRef.current = onToggleHold
    onRollResolvedRef.current = onRollResolved
  })

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100)
    camera.position.set(0, 11.5, 7.5)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4)
    sunLight.position.set(4, 10, 4)
    sunLight.castShadow = true
    sunLight.shadow.camera.left = -10
    sunLight.shadow.camera.right = 10
    sunLight.shadow.camera.top = 10
    sunLight.shadow.camera.bottom = -10
    sunLight.shadow.mapSize.set(1024, 1024)
    scene.add(sunLight)

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    )
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.receiveShadow = true
    scene.add(floorMesh)

    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, WORLD_GRAVITY, 0) })
    const diceMaterial = new CANNON.Material('dice')
    const boundaryMaterial = new CANNON.Material('boundary')
    const contactMaterials = [
      new CANNON.ContactMaterial(diceMaterial, boundaryMaterial, {
        restitution: settingsRef.current.bounciness,
        friction: 0.3,
      }),
      new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
        restitution: settingsRef.current.bounciness,
        friction: 0.3,
      }),
    ]
    for (const contactMaterial of contactMaterials) world.addContactMaterial(contactMaterial)

    const createBoundary = (eulerX: number, eulerY: number): CANNON.Body => {
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
        material: boundaryMaterial,
      })
      body.quaternion.setFromEuler(eulerX, eulerY, 0)
      world.addBody(body)
      return body
    }

    const floorBody = createBoundary(-Math.PI / 2, 0)
    floorBody.position.set(0, 0, 0)
    const ceiling = createBoundary(Math.PI / 2, 0)
    ceiling.position.set(0, 7, 0)
    const walls = {
      left: createBoundary(0, Math.PI / 2),
      right: createBoundary(0, -Math.PI / 2),
      back: createBoundary(0, 0),
      front: createBoundary(0, Math.PI),
    }
    walls.back.position.set(0, 0, -AREA_DEPTH / 2)
    walls.front.position.set(0, 0, AREA_DEPTH / 2)

    const context: SceneContext = {
      renderer,
      scene,
      camera,
      world,
      dieGeometry: new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE),
      ringGeometry: new THREE.RingGeometry(0.75, 0.92, 32),
      diceMaterial,
      contactMaterials,
      walls,
      sceneDice: new Map(),
      halfWidth: AREA_DEPTH / 2,
      activeThrow: null,
    }
    contextRef.current = context

    const applySize = (width: number, height: number) => {
      if (width === 0 || height === 0) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      context.halfWidth = Math.min(MAX_HALF_WIDTH, (AREA_DEPTH / 2) * camera.aspect * 0.85)
      walls.left.position.set(-context.halfWidth, 0, 0)
      walls.right.position.set(context.halfWidth, 0, 0)
    }
    applySize(container.clientWidth, container.clientHeight)
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) applySize(entry.contentRect.width, entry.contentRect.height)
    })
    resizeObserver.observe(container)

    const handlePointerDown = (event: PointerEvent) => {
      if (disabledRef.current) return
      const rect = renderer.domElement.getBoundingClientRect()
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(pointer, camera)
      const meshes = [...context.sceneDice.values()].map(sceneDie => sceneDie.mesh)
      const hit = raycaster.intersectObjects(meshes)[0]
      const dieId = hit?.object.userData.dieId
      if (typeof dieId === 'number') onToggleHoldRef.current(dieId)
    }
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)

    let frameId = 0
    let lastTime = performance.now()
    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      world.step(1 / 60, deltaSeconds, 3)

      for (const sceneDie of context.sceneDice.values()) {
        const { body, mesh, ring } = sceneDie
        mesh.position.set(body.position.x, body.position.y, body.position.z)
        mesh.quaternion.set(
          body.quaternion.x,
          body.quaternion.y,
          body.quaternion.z,
          body.quaternion.w,
        )
        ring.position.set(body.position.x, 0.02, body.position.z)
      }

      const activeThrow = context.activeThrow
      if (activeThrow !== null) {
        const bodies = activeThrow.ids
          .map(id => context.sceneDice.get(id)?.body)
          .filter(body => body !== undefined)
        const calm = bodies.every(isBodyCalm)
        const timedOut = now - activeThrow.startedAt > MAX_THROW_DURATION_MS
        activeThrow.settledFrames = calm ? activeThrow.settledFrames + 1 : 0
        if (activeThrow.settledFrames >= SETTLE_FRAMES || timedOut) {
          if (timedOut) {
            for (const body of bodies) {
              body.velocity.setZero()
              body.angularVelocity.setZero()
            }
          }
          context.activeThrow = null
          skipNextValueSyncRef.current = true
          const values = Object.fromEntries(
            activeThrow.ids.flatMap(id => {
              const sceneDie = context.sceneDice.get(id)
              if (sceneDie === undefined) return []
              const quaternion = new THREE.Quaternion(
                sceneDie.body.quaternion.x,
                sceneDie.body.quaternion.y,
                sceneDie.body.quaternion.z,
                sceneDie.body.quaternion.w,
              )
              return [[id, getUpFaceValue(quaternion)]]
            }),
          )
          onRollResolvedRef.current(values)
        }
      }

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      for (const sceneDie of context.sceneDice.values()) {
        if (Array.isArray(sceneDie.mesh.material)) {
          disposeDieMaterials(
            sceneDie.mesh.material.filter(
              material => material instanceof THREE.MeshStandardMaterial,
            ),
          )
        }
      }
      context.dieGeometry.dispose()
      context.ringGeometry.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
      contextRef.current = null
    }
  }, [])

  const diceIdsKey = dice.map(die => die.id).join('-')
  useEffect(() => {
    const context = contextRef.current
    if (context === null) return

    for (const sceneDie of context.sceneDice.values()) {
      context.scene.remove(sceneDie.mesh, sceneDie.ring)
      context.world.removeBody(sceneDie.body)
      if (Array.isArray(sceneDie.mesh.material)) {
        disposeDieMaterials(
          sceneDie.mesh.material.filter(material => material instanceof THREE.MeshStandardMaterial),
        )
      }
      if (sceneDie.ring.material instanceof THREE.Material) sceneDie.ring.material.dispose()
    }
    context.sceneDice.clear()

    const currentDice = diceRef.current
    currentDice.forEach((die, index) => {
      const mesh = new THREE.Mesh(context.dieGeometry, createDieMaterials(appearanceRef.current))
      mesh.castShadow = true
      mesh.userData.dieId = die.id

      const ring = new THREE.Mesh(
        context.ringGeometry,
        new THREE.MeshBasicMaterial({
          color: appearanceRef.current.pipColor,
          side: THREE.DoubleSide,
        }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.visible = die.isHeld

      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(DIE_SIZE / 2, DIE_SIZE / 2, DIE_SIZE / 2)),
        material: context.diceMaterial,
        type: die.isHeld ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC,
      })
      const { x, z } = gridPosition(index, currentDice.length)
      body.position.set(x, DIE_SIZE / 2, z)
      const orientation = quaternionForValueUp(die.value)
      body.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w)

      context.scene.add(mesh, ring)
      context.world.addBody(body)
      context.sceneDice.set(die.id, { id: die.id, mesh, ring, body })
    })
  }, [diceIdsKey])

  const valuesKey = dice.map(die => `${die.id}:${die.value}`).join('-')
  useEffect(() => {
    if (skipNextValueSyncRef.current) {
      skipNextValueSyncRef.current = false
      return
    }
    const context = contextRef.current
    if (context === null) return
    diceRef.current.forEach((die, index) => {
      const sceneDie = context.sceneDice.get(die.id)
      if (sceneDie === undefined) return
      const { x, z } = gridPosition(index, diceRef.current.length)
      sceneDie.body.position.set(x, DIE_SIZE / 2, z)
      const orientation = quaternionForValueUp(die.value)
      sceneDie.body.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w)
      sceneDie.body.velocity.setZero()
      sceneDie.body.angularVelocity.setZero()
    })
  }, [valuesKey])

  const heldKey = dice.filter(die => die.isHeld).map(die => die.id).join('-')
  useEffect(() => {
    const context = contextRef.current
    if (context === null) return
    for (const die of diceRef.current) {
      const sceneDie = context.sceneDice.get(die.id)
      if (sceneDie === undefined) continue
      sceneDie.ring.visible = die.isHeld
      sceneDie.body.type = die.isHeld ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC
      sceneDie.body.velocity.setZero()
      sceneDie.body.angularVelocity.setZero()
    }
  }, [heldKey])

  useEffect(() => {
    const context = contextRef.current
    if (context === null) return
    for (const sceneDie of context.sceneDice.values()) {
      const oldMaterials = sceneDie.mesh.material
      sceneDie.mesh.material = createDieMaterials(appearance)
      if (Array.isArray(oldMaterials)) {
        disposeDieMaterials(
          oldMaterials.filter(material => material instanceof THREE.MeshStandardMaterial),
        )
      }
      if (sceneDie.ring.material instanceof THREE.MeshBasicMaterial) {
        sceneDie.ring.material.color.set(appearance.pipColor)
      }
    }
  }, [appearance])

  useEffect(() => {
    const isNewRequest = throwRequestCount !== lastThrowRequestRef.current
    lastThrowRequestRef.current = throwRequestCount
    const context = contextRef.current
    if (!isNewRequest || context === null) return

    const throwSettings = settingsRef.current
    for (const contactMaterial of context.contactMaterials) {
      contactMaterial.restitution = throwSettings.bounciness
      contactMaterial.friction = 0.2 + 0.2 * throwSettings.friction
    }

    const thrownIds: number[] = []
    for (const die of diceRef.current) {
      if (die.isHeld) continue
      const sceneDie = context.sceneDice.get(die.id)
      if (sceneDie === undefined) continue

      thrownIds.push(die.id)
      const { body } = sceneDie
      body.type = CANNON.Body.DYNAMIC
      body.linearDamping = 0.05 * throwSettings.friction
      body.angularDamping = 0.08 * throwSettings.friction
      body.position.set(
        (Math.random() - 0.5) * context.halfWidth * 1.2,
        1.2 + Math.random() * 1.5,
        AREA_DEPTH / 2 - 0.9,
      )
      body.velocity.set(
        (Math.random() - 0.5) * 6 * throwSettings.launchPower,
        (3.5 + Math.random() * 3) * throwSettings.launchPower,
        -(9 + Math.random() * 5) * throwSettings.launchPower,
      )
      body.angularVelocity.set(
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 24,
      )
      body.wakeUp()
    }

    if (thrownIds.length === 0) {
      onRollResolvedRef.current({})
      return
    }
    context.activeThrow = { ids: thrownIds, settledFrames: 0, startedAt: performance.now() }
  }, [throwRequestCount])

  return <div className="dice-scene-3d" ref={containerRef} />
}
