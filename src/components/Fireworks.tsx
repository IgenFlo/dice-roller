import { useEffect, useRef } from 'react'
import './Fireworks.css'

const ROCKET_COUNT = 10
const LAUNCH_WINDOW_MS = 2000
const SPARKS_PER_BURST = 72
const SPARK_TTL_S = 1.5
const ROCKET_SPEED = 900
const SPARK_SPEED = 260
const GRAVITY = 420
const DRAG_PER_SECOND = 0.42
const MAX_FRAME_DELTA_S = 0.05
const BURST_COLORS = ['#ffd54a', '#ff7a18', '#ff4d6d', '#5ec8ff', '#b388ff', '#7bffb0']

interface Rocket {
  x: number
  y: number
  velocityY: number
  burstY: number
  color: string
}

interface Spark {
  x: number
  y: number
  previousX: number
  previousY: number
  velocityX: number
  velocityY: number
  life: number
  color: string
}

interface FireworksProps {
  onDone: () => void
}

export function Fireworks({ onDone }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const context = canvas.getContext('2d')
    if (context === null) return

    let width = window.innerWidth
    let height = window.innerHeight
    const applySize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * pixelRatio
      canvas.height = height * pixelRatio
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }
    applySize()
    window.addEventListener('resize', applySize)

    const rockets: Rocket[] = []
    const sparks: Spark[] = []
    let launchedCount = 0

    const launchRocket = () => {
      rockets.push({
        x: width * (0.12 + Math.random() * 0.76),
        y: height,
        velocityY: -ROCKET_SPEED * (0.85 + Math.random() * 0.3),
        burstY: height * (0.12 + Math.random() * 0.34),
        color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
      })
    }

    const burst = (rocket: Rocket) => {
      for (let index = 0; index < SPARKS_PER_BURST; index++) {
        const angle = Math.random() * Math.PI * 2
        const speed = SPARK_SPEED * (0.35 + Math.random() * 0.85)
        sparks.push({
          x: rocket.x,
          y: rocket.y,
          previousX: rocket.x,
          previousY: rocket.y,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          life: 0,
          color: rocket.color,
        })
      }
    }

    let frameId = 0
    const startedAt = performance.now()
    let lastTime = startedAt

    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - lastTime) / 1000, MAX_FRAME_DELTA_S)
      lastTime = now
      const elapsed = now - startedAt

      const expectedLaunches = Math.min(
        ROCKET_COUNT,
        Math.ceil((elapsed / LAUNCH_WINDOW_MS) * ROCKET_COUNT),
      )
      while (launchedCount < expectedLaunches) {
        launchRocket()
        launchedCount++
      }

      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'lighter'

      for (let index = rockets.length - 1; index >= 0; index--) {
        const rocket = rockets[index]
        rocket.y += rocket.velocityY * deltaSeconds
        rocket.velocityY += GRAVITY * deltaSeconds
        context.strokeStyle = rocket.color
        context.lineWidth = 3
        context.beginPath()
        context.moveTo(rocket.x, rocket.y)
        context.lineTo(rocket.x, rocket.y + 14)
        context.stroke()
        if (rocket.y <= rocket.burstY || rocket.velocityY >= 0) {
          burst(rocket)
          rockets.splice(index, 1)
        }
      }

      const damping = Math.exp(-DRAG_PER_SECOND * deltaSeconds)
      for (let index = sparks.length - 1; index >= 0; index--) {
        const spark = sparks[index]
        spark.life += deltaSeconds
        if (spark.life >= SPARK_TTL_S) {
          sparks.splice(index, 1)
          continue
        }
        spark.previousX = spark.x
        spark.previousY = spark.y
        spark.velocityX *= damping
        spark.velocityY = spark.velocityY * damping + GRAVITY * deltaSeconds
        spark.x += spark.velocityX * deltaSeconds
        spark.y += spark.velocityY * deltaSeconds

        context.globalAlpha = 1 - spark.life / SPARK_TTL_S
        context.strokeStyle = spark.color
        context.lineWidth = 2.5
        context.beginPath()
        context.moveTo(spark.previousX, spark.previousY)
        context.lineTo(spark.x, spark.y)
        context.stroke()
      }
      context.globalAlpha = 1

      if (launchedCount >= ROCKET_COUNT && rockets.length === 0 && sparks.length === 0) {
        onDoneRef.current()
        return
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', applySize)
    }
  }, [])

  return (
    <div className="fireworks" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
