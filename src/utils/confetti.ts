import { sounds } from './sounds'

export interface ConfettiOptions {
  duration?: number
  particleCount?: number
  colors?: string[]
  sound?: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  s: number
  r: number
  rs: number
  c: string
  rect: boolean
  a: number
}

const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768

const DEFAULTS = {
  duration: isMobile ? 3500 : 5000,
  count: isMobile ? 180 : 400,
  colors: ['#e9b00d', '#a58d00', '#e0283e', '#ffffff', '#104480'],
}

function rand(a: number, b: number): number {
  return Math.random() * (b - a) + a
}

export function apostarConfetti(opts?: ConfettiOptions): void {
  const o = opts || {}
  const dur = o.duration || DEFAULTS.duration
  const total = o.particleCount || DEFAULTS.count
  const cols = o.colors || DEFAULTS.colors

  if (o.sound !== false) sounds.confetti()

  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(devicePixelRatio || 1, 2)
  let w: number, h: number

  function resize() {
    w = innerWidth
    h = innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  addEventListener('resize', resize)

  const particles: Particle[] = []
  let spawned = 0
  const t0 = performance.now()

  function spawn() {
    const fromLeft = Math.random() < 0.5
    particles.push({
      x: fromLeft ? -5 : w + 5,
      y: rand(h * 0.02, h * 0.65),
      vx: fromLeft ? rand(4, 12) : rand(-12, -4),
      vy: rand(-5, 2),
      s: rand(5, 10),
      r: rand(0, 6.28),
      rs: rand(-0.15, 0.15),
      c: cols[(Math.random() * cols.length) | 0],
      rect: Math.random() > 0.5,
      a: 1,
    })
    spawned++
  }

  function frame(now: number) {
    const progress = Math.min((now - t0) / dur, 1)
    ctx.clearRect(0, 0, w, h)

    if (progress < 0.55) {
      const target = ((progress / 0.55) * total) | 0
      while (spawned < target) spawn()
    }

    let alive = false
    for (let i = 0, n = particles.length; i < n; i++) {
      const p = particles[i]
      if (p.a <= 0) continue

      p.x += p.vx
      p.vy += 0.1
      p.y += p.vy
      p.r += p.rs
      p.vx *= 0.988

      if (progress > 0.55) p.a = Math.max(0, 1 - (progress - 0.55) / 0.45)
      if (p.y > h + 15) {
        p.a = 0
        continue
      }

      alive = true
      ctx.save()
      ctx.globalAlpha = p.a
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.c

      if (p.rect) {
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.s / 2, 0, 6.28)
        ctx.fill()
      }
      ctx.restore()
    }

    if ((alive || progress < 0.55) && progress < 1) {
      requestAnimationFrame(frame)
    } else {
      removeEventListener('resize', resize)
      canvas.remove()
    }
  }

  requestAnimationFrame(frame)
}

window.apostarConfetti = apostarConfetti
