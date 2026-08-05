import { useEffect, useRef } from 'react'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { createDieMaterials, disposeDieMaterials } from '../animation/threeDice/diceMaterials'
import { getUpFace, quaternionForValueUp } from '../animation/threeDice/dieOrientation'
import type { ThrowSettings } from '../animation/throwSettings'
import type { Die } from '../domain/dice'
import type { DieAppearance } from '../domain/dieAppearance'
import { AURA_FACE_VALUE } from '../domain/dieFaces'
import './DiceScene3D.css'

const AREA_DEPTH = 8
const MAX_HALF_WIDTH = 8
const DIE_SIZE = 1
const WORLD_GRAVITY = -30
const CAMERA_FOV = 45
const SETTLE_LINEAR_SPEED = 0.15
const SETTLE_ANGULAR_SPEED = 0.2
const SETTLE_FRAMES = 18
const COCKED_RETHROW_DELAY_MS = 5000
const FLAT_ALIGNMENT_MIN = 0.96
const ON_FLOOR_MAX_Y = DIE_SIZE * 0.85
const GRID_SPACING = 1.5
const GRID_COLUMNS = 5
const AURA_DURATION_MS = 1200
const LOCK_SPRITE_SIZE = 0.62
const LOCK_HEIGHT_ABOVE_DIE = 0.85

interface DiceScene3DProps {
  dice: Die[]
  appearance: DieAppearance
  settings: ThrowSettings
  throwRequestCount: number
  recenterRequestCount: number
  disabled: boolean
  onToggleHold: (dieId: number) => void
  onRollResolved: (values: Readonly<Record<number, number>>) => void
}

interface SceneDie {
  id: number
  mesh: THREE.Mesh
  lock: THREE.Sprite
  body: CANNON.Body
}

interface ActiveThrow {
  ids: readonly number[]
  settledFrames: number
  startedAt: number
}

interface ActiveAura {
  sprite: THREE.Sprite
  startedAt: number
}

interface SceneContext {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  world: CANNON.World
  dieGeometry: THREE.BufferGeometry
  lockTexture: THREE.CanvasTexture
  diceMaterial: CANNON.Material
  contactMaterials: CANNON.ContactMaterial[]
  walls: { left: CANNON.Body; right: CANNON.Body; back: CANNON.Body; front: CANNON.Body }
  sceneDice: Map<number, SceneDie>
  halfWidth: number
  activeThrow: ActiveThrow | null
  auraTexture: THREE.CanvasTexture
  activeAuras: ActiveAura[]
}

function createAuraTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context !== null) {
    const gradient = context.createRadialGradient(64, 64, 10, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 128, 128)
  }
  return new THREE.CanvasTexture(canvas)
}

function createLockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context !== null) {
    context.strokeStyle = '#ffffff'
    context.fillStyle = '#ffffff'
    context.lineWidth = 13
    context.beginPath()
    context.arc(64, 54, 21, Math.PI, 2 * Math.PI)
    context.stroke()
    context.beginPath()
    context.roundRect(30, 54, 68, 54, 10)
    context.fill()
    context.globalCompositeOperation = 'destination-out'
    context.beginPath()
    context.arc(64, 74, 8, 0, Math.PI * 2)
    context.fill()
    context.fillRect(60, 74, 8, 18)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function spawnAura(context: SceneContext, position: CANNON.Vec3, color: string): void {
  const material = new THREE.SpriteMaterial({
    map: context.auraTexture,
    color,
    transparent: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.position.set(position.x, position.y + 0.1, position.z)
  sprite.scale.set(1.8, 1.8, 1)
  context.scene.add(sprite)
  context.activeAuras.push({ sprite, startedAt: performance.now() })
}

function advanceAuras(context: SceneContext, now: number): void {
  context.activeAuras = context.activeAuras.filter(aura => {
    const progress = (now - aura.startedAt) / AURA_DURATION_MS
    if (progress >= 1) {
      context.scene.remove(aura.sprite)
      aura.sprite.material.dispose()
      return false
    }
    const spread = 1.8 + progress * 1.6
    aura.sprite.scale.set(spread, spread, 1)
    aura.sprite.material.opacity = 1 - progress
    return true
  })
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

function arrangeDiceInGrid(context: SceneContext, dice: readonly Die[]): void {
  dice.forEach((die, index) => {
    const sceneDie = context.sceneDice.get(die.id)
    if (sceneDie === undefined) return
    const { x, z } = gridPosition(index, dice.length)
    sceneDie.body.position.set(x, DIE_SIZE / 2, z)
    const orientation = quaternionForValueUp(die.value)
    sceneDie.body.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w)
    sceneDie.body.velocity.setZero()
    sceneDie.body.angularVelocity.setZero()
  })
}

// Position du mur du fond : là où le bord haut du canvas coupe le plateau à
// hauteur de dé, pour que les dés puissent occuper toute la zone jusqu'au header.
function topEdgeFloorZ(camera: THREE.PerspectiveCamera): number {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(0, 1), camera)
  const diePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DIE_SIZE / 2)
  const intersection = new THREE.Vector3()
  const hit = raycaster.ray.intersectPlane(diePlane, intersection)
  return hit === null ? -AREA_DEPTH / 2 : intersection.z
}

function bodyQuaternion(body: CANNON.Body): THREE.Quaternion {
  return new THREE.Quaternion(
    body.quaternion.x,
    body.quaternion.y,
    body.quaternion.z,
    body.quaternion.w,
  )
}

function isBodyCalm(body: CANNON.Body): boolean {
  return (
    body.velocity.length() < SETTLE_LINEAR_SPEED &&
    body.angularVelocity.length() < SETTLE_ANGULAR_SPEED
  )
}

// Un dé « cassé » repose de travers ou sur un autre dé : sa valeur n'est pas lisible.
function isDieReadable(body: CANNON.Body): boolean {
  return (
    getUpFace(bodyQuaternion(body)).alignment > FLAT_ALIGNMENT_MIN &&
    body.position.y < ON_FLOOR_MAX_Y
  )
}

function launchDie(context: SceneContext, body: CANNON.Body, settings: ThrowSettings): void {
  body.type = CANNON.Body.DYNAMIC
  body.linearDamping = 0.05 * settings.friction
  body.angularDamping = 0.08 * settings.friction
  body.position.set(
    (Math.random() - 0.5) * context.halfWidth * 1.2,
    1.2 + Math.random() * 1.5,
    AREA_DEPTH / 2 - 0.9,
  )
  body.velocity.set(
    (Math.random() - 0.5) * 6 * settings.launchPower,
    (3.5 + Math.random() * 3) * settings.launchPower,
    -(9 + Math.random() * 5) * settings.launchPower,
  )
  body.angularVelocity.set(
    (Math.random() - 0.5) * 24,
    (Math.random() - 0.5) * 24,
    (Math.random() - 0.5) * 24,
  )
  body.wakeUp()
}

export function DiceScene3D({
  dice,
  appearance,
  settings,
  throwRequestCount,
  recenterRequestCount,
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
  const lastRecenterRequestRef = useRef(recenterRequestCount)
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

    scene.add(new THREE.AmbientLight(0xffffff, 1.4))
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdde4ee, 0.8))
    const sunLight = new THREE.DirectionalLight(0xffffff, 2)
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
      dieGeometry: new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 4, 0.14),
      lockTexture: createLockTexture(),
      diceMaterial,
      contactMaterials,
      walls,
      sceneDice: new Map(),
      halfWidth: AREA_DEPTH / 2,
      activeThrow: null,
      auraTexture: createAuraTexture(),
      activeAuras: [],
    }
    contextRef.current = context

    const applySize = (width: number, height: number) => {
      if (width === 0 || height === 0) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
      context.halfWidth = Math.min(MAX_HALF_WIDTH, (AREA_DEPTH / 2) * camera.aspect * 0.85)
      walls.left.position.set(-context.halfWidth, 0, 0)
      walls.right.position.set(context.halfWidth, 0, 0)
      walls.back.position.set(0, 0, topEdgeFloorZ(camera))
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
        const { body, mesh, lock } = sceneDie
        mesh.position.set(body.position.x, body.position.y, body.position.z)
        mesh.quaternion.set(
          body.quaternion.x,
          body.quaternion.y,
          body.quaternion.z,
          body.quaternion.w,
        )
        lock.position.set(
          body.position.x,
          body.position.y + LOCK_HEIGHT_ABOVE_DIE,
          body.position.z,
        )
      }

      const activeThrow = context.activeThrow
      if (activeThrow !== null) {
        const unreadableIds = activeThrow.ids.filter(id => {
          const body = context.sceneDice.get(id)?.body
          return body !== undefined && !(isBodyCalm(body) && isDieReadable(body))
        })
        activeThrow.settledFrames = unreadableIds.length === 0 ? activeThrow.settledFrames + 1 : 0

        if (activeThrow.settledFrames >= SETTLE_FRAMES) {
          context.activeThrow = null
          skipNextValueSyncRef.current = true
          const entries: [number, number][] = activeThrow.ids.flatMap(id => {
            const sceneDie = context.sceneDice.get(id)
            if (sceneDie === undefined) return []
            return [[id, getUpFace(bodyQuaternion(sceneDie.body)).value]]
          })
          for (const [id, value] of entries) {
            const sceneDie = context.sceneDice.get(id)
            if (value === AURA_FACE_VALUE && sceneDie !== undefined) {
              spawnAura(context, sceneDie.body.position, appearanceRef.current.pipColor)
            }
          }
          onRollResolvedRef.current(Object.fromEntries(entries))
        } else if (now - activeThrow.startedAt > COCKED_RETHROW_DELAY_MS) {
          for (const id of unreadableIds) {
            const body = context.sceneDice.get(id)?.body
            if (body !== undefined) launchDie(context, body, settingsRef.current)
          }
          activeThrow.startedAt = now
          activeThrow.settledFrames = 0
        }
      }

      advanceAuras(context, now)
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
        sceneDie.lock.material.dispose()
      }
      for (const aura of context.activeAuras) {
        context.scene.remove(aura.sprite)
        aura.sprite.material.dispose()
      }
      context.auraTexture.dispose()
      context.lockTexture.dispose()
      context.dieGeometry.dispose()
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
      context.scene.remove(sceneDie.mesh, sceneDie.lock)
      context.world.removeBody(sceneDie.body)
      if (Array.isArray(sceneDie.mesh.material)) {
        disposeDieMaterials(
          sceneDie.mesh.material.filter(material => material instanceof THREE.MeshStandardMaterial),
        )
      }
      sceneDie.lock.material.dispose()
    }
    context.sceneDice.clear()

    const currentDice = diceRef.current
    currentDice.forEach((die, index) => {
      const mesh = new THREE.Mesh(context.dieGeometry, createDieMaterials(appearanceRef.current))
      mesh.castShadow = true
      mesh.userData.dieId = die.id

      const lock = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: context.lockTexture,
          color: appearanceRef.current.pipColor,
          transparent: true,
          depthWrite: false,
        }),
      )
      lock.scale.set(LOCK_SPRITE_SIZE, LOCK_SPRITE_SIZE, 1)
      lock.visible = die.isHeld

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

      context.scene.add(mesh, lock)
      context.world.addBody(body)
      context.sceneDice.set(die.id, { id: die.id, mesh, lock, body })
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
    arrangeDiceInGrid(context, diceRef.current)
  }, [valuesKey])

  useEffect(() => {
    const isNewRequest = recenterRequestCount !== lastRecenterRequestRef.current
    lastRecenterRequestRef.current = recenterRequestCount
    const context = contextRef.current
    if (!isNewRequest || context === null) return
    arrangeDiceInGrid(context, diceRef.current)
  }, [recenterRequestCount])

  const heldKey = dice.filter(die => die.isHeld).map(die => die.id).join('-')
  useEffect(() => {
    const context = contextRef.current
    if (context === null) return
    for (const die of diceRef.current) {
      const sceneDie = context.sceneDice.get(die.id)
      if (sceneDie === undefined) continue
      sceneDie.lock.visible = die.isHeld
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
      sceneDie.lock.material.color.set(appearance.pipColor)
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
      launchDie(context, sceneDie.body, throwSettings)
    }

    if (thrownIds.length === 0) {
      onRollResolvedRef.current({})
      return
    }
    context.activeThrow = { ids: thrownIds, settledFrames: 0, startedAt: performance.now() }
  }, [throwRequestCount])

  return <div className="dice-scene-3d" ref={containerRef} />
}
