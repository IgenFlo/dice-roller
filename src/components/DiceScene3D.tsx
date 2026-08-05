import { useEffect, useRef } from 'react'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import {
  COMBO_EFFECT_DURATION_MS,
  COMBO_FLAME_COLORS,
  COMBO_FLAME_INTENSITY,
} from '../animation/comboEffects'
import { createDieMaterials, disposeDieMaterials } from '../animation/threeDice/diceMaterials'
import { getUpFace, quaternionForValueUp } from '../animation/threeDice/dieOrientation'
import type { ThrowSettings } from '../animation/throwSettings'
import type { Combo } from '../domain/combos'
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
const GRID_MAX_COLUMNS = 5
const GRID_MIN_SPACING = DIE_SIZE * 1.05
const AURA_DURATION_MS = 1200
const LOCK_SPRITE_SIZE = 0.62
const LOCK_HEIGHT_ABOVE_DIE = 0.85
const FLAME_SPAWN_INTERVAL_S = 0.05
const FLAME_TTL_S = 0.7
// Le mélange additif sature vite : on plafonne l'opacité de chaque particule.
const FLAME_MAX_OPACITY = 0.8
const FLAME_RISE_SPEED = 2.1
const FLAME_BASE_SCALE = 0.85
const FLAME_DRIFT_SPEED = 0.45

interface DiceScene3DProps {
  dice: Die[]
  appearance: DieAppearance
  settings: ThrowSettings
  throwRequestCount: number
  recenterRequestCount: number
  combo: Combo | null
  comboKey: number
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

interface FlameParticle {
  sprite: THREE.Sprite
  life: number
  riseSpeed: number
  driftX: number
  driftZ: number
}

interface FlameEmission {
  dieIds: readonly number[]
  colors: readonly [string, string]
  particlesPerBurst: number
  endsAt: number
  accumulator: number
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
  flameTexture: THREE.CanvasTexture
  activeFlames: FlameParticle[]
  flameEmission: FlameEmission | null
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

interface GridLayout {
  readonly columns: number
  readonly rows: number
  readonly spacing: number
}

// La grille doit tenir entre les murs : sur un écran étroit on réduit le nombre
// de colonnes, puis l'espacement, pour que les dés ne se chevauchent jamais.
function computeGridLayout(context: SceneContext, count: number): GridLayout {
  const halfDepth = Math.min(
    Math.abs(context.walls.front.position.z),
    Math.abs(context.walls.back.position.z),
  )
  const columnsFittingWidth = Math.floor((2 * context.halfWidth - DIE_SIZE) / GRID_SPACING) + 1
  const columns = Math.max(1, Math.min(count, GRID_MAX_COLUMNS, columnsFittingWidth))
  const rows = Math.ceil(count / columns)
  const widthSpacing = columns > 1 ? (2 * context.halfWidth - DIE_SIZE) / (columns - 1) : GRID_SPACING
  const depthSpacing = rows > 1 ? (2 * halfDepth - DIE_SIZE) / (rows - 1) : GRID_SPACING
  const spacing = Math.max(GRID_MIN_SPACING, Math.min(GRID_SPACING, widthSpacing, depthSpacing))
  return { columns, rows, spacing }
}

function createFlameTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (context !== null) {
    const gradient = context.createRadialGradient(32, 38, 2, 32, 38, 30)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.45, 'rgba(255, 255, 255, 0.55)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function spawnFlame(context: SceneContext, position: CANNON.Vec3, colors: readonly string[]): void {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: context.flameTexture,
      color: colors[Math.floor(Math.random() * colors.length)],
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  sprite.position.set(
    position.x + (Math.random() - 0.5) * DIE_SIZE * 1.2,
    position.y - DIE_SIZE / 3,
    position.z + (Math.random() - 0.5) * DIE_SIZE * 1.2,
  )
  const scale = FLAME_BASE_SCALE * (0.75 + Math.random() * 0.5)
  sprite.scale.set(scale * 0.8, scale, 1)
  sprite.userData.scale = scale
  context.scene.add(sprite)
  context.activeFlames.push({
    sprite,
    life: 0,
    riseSpeed: FLAME_RISE_SPEED * (0.7 + Math.random() * 0.6),
    driftX: (Math.random() - 0.5) * FLAME_DRIFT_SPEED,
    driftZ: (Math.random() - 0.5) * FLAME_DRIFT_SPEED,
  })
}

function emitFlames(context: SceneContext, now: number, deltaSeconds: number): void {
  const emission = context.flameEmission
  if (emission === null) return
  if (now > emission.endsAt) {
    context.flameEmission = null
    return
  }
  emission.accumulator += deltaSeconds
  if (emission.accumulator < FLAME_SPAWN_INTERVAL_S) return
  emission.accumulator = 0

  for (const dieId of emission.dieIds) {
    const sceneDie = context.sceneDice.get(dieId)
    if (sceneDie === undefined) continue
    for (let index = 0; index < emission.particlesPerBurst; index++) {
      spawnFlame(context, sceneDie.body.position, emission.colors)
    }
  }
}

function advanceFlames(context: SceneContext, deltaSeconds: number): void {
  context.activeFlames = context.activeFlames.filter(flame => {
    flame.life += deltaSeconds
    const progress = flame.life / FLAME_TTL_S
    if (progress >= 1) {
      context.scene.remove(flame.sprite)
      flame.sprite.material.dispose()
      return false
    }
    flame.sprite.position.x += flame.driftX * deltaSeconds
    flame.sprite.position.y += flame.riseSpeed * deltaSeconds
    flame.sprite.position.z += flame.driftZ * deltaSeconds
    // La flamme s'épanouit puis s'étire en s'affinant vers le haut.
    const scale = flame.sprite.userData.scale * (1 + progress * 0.35) * (1 - progress * 0.5)
    flame.sprite.scale.set(scale * 0.75, scale * 1.25, 1)
    flame.sprite.material.opacity = FLAME_MAX_OPACITY * (1 - progress ** 2)
    return true
  })
}

function gridPosition(index: number, layout: GridLayout): { x: number; z: number } {
  const column = index % layout.columns
  const row = Math.floor(index / layout.columns)
  return {
    x: (column - (layout.columns - 1) / 2) * layout.spacing,
    z: (row - (layout.rows - 1) / 2) * layout.spacing,
  }
}

function arrangeDiceInGrid(context: SceneContext, dice: readonly Die[]): void {
  const layout = computeGridLayout(context, dice.length)
  dice.forEach((die, index) => {
    const sceneDie = context.sceneDice.get(die.id)
    if (sceneDie === undefined) return
    const { x, z } = gridPosition(index, layout)
    sceneDie.body.position.set(x, DIE_SIZE / 2, z)
    const orientation = quaternionForValueUp(die.value)
    sceneDie.body.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w)
    sceneDie.body.velocity.setZero()
    sceneDie.body.angularVelocity.setZero()
    // Sans mise en sommeil, le moindre contact résiduel relance la simulation.
    sceneDie.body.sleep()
  })
}

// Profondeur à laquelle un bord du canvas (ndcY = 1 en haut, -1 en bas) coupe le
// plateau : les murs épousent ainsi la zone réellement visible à l'écran.
function edgeFloorZ(camera: THREE.PerspectiveCamera, ndcY: number): number {
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(0, ndcY), camera)
  const diePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DIE_SIZE / 2)
  const intersection = new THREE.Vector3()
  const hit = raycaster.ray.intersectPlane(diePlane, intersection)
  return hit === null ? (-ndcY * AREA_DEPTH) / 2 : intersection.z
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
    context.walls.front.position.z - DIE_SIZE,
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
  combo,
  comboKey,
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
  const comboRef = useRef(combo)
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
    comboRef.current = combo
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
      flameTexture: createFlameTexture(),
      activeFlames: [],
      flameEmission: null,
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
      walls.back.position.set(0, 0, edgeFloorZ(camera, 1))
      walls.front.position.set(0, 0, edgeFloorZ(camera, -1))
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
      emitFlames(context, now, deltaSeconds)
      advanceFlames(context, deltaSeconds)
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
      for (const flame of context.activeFlames) {
        context.scene.remove(flame.sprite)
        flame.sprite.material.dispose()
      }
      context.auraTexture.dispose()
      context.flameTexture.dispose()
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
    for (const die of currentDice) {
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
      context.scene.add(mesh, lock)
      context.world.addBody(body)
      context.sceneDice.set(die.id, { id: die.id, mesh, lock, body })
    }
    arrangeDiceInGrid(context, currentDice)
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

  useEffect(() => {
    const context = contextRef.current
    const activeCombo = comboRef.current
    if (context === null || comboKey === 0 || activeCombo === null) return
    context.flameEmission = {
      dieIds: activeCombo.dieIds,
      colors: COMBO_FLAME_COLORS[activeCombo.tier],
      particlesPerBurst: COMBO_FLAME_INTENSITY[activeCombo.tier],
      endsAt: performance.now() + COMBO_EFFECT_DURATION_MS,
      accumulator: FLAME_SPAWN_INTERVAL_S,
    }
  }, [comboKey])

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
