interface MoneyColor {
  body: string
  border: string
  text: string
}

interface MoneyRainOptions {
  duration?: number
  billCount?: number
  colors?: MoneyColor[]
}

interface Bill {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  rotation: number
  rotationSpeed: number
  windPhase: number
  windSpeed: number
  windAmp: number
  flutterPhase: number
  flutterSpeed: number
  bodyColor: string
  borderColor: string
  textColor: string
  life: number
}

const DEFAULTS: Required<MoneyRainOptions> = {
  duration: 5000,
  billCount: 200,
  colors: [
    { body: '#2d8c3c', border: '#1a6b28', text: '#e9b00d' },
    { body: '#e9b00d', border: '#a58d00', text: '#2d8c3c' },
    { body: '#1a6b28', border: '#0f4a1a', text: '#e9b00d' },
  ],
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function apostarMoney(opts?: MoneyRainOptions): void {
  const duration = (opts && opts.duration) || DEFAULTS.duration
  const billCount = (opts && opts.billCount) || DEFAULTS.billCount
  const colors = (opts && opts.colors) || DEFAULTS.colors

  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = window.devicePixelRatio || 1

  function resize() {
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)

  const w = window.innerWidth
  const bills: Bill[] = []
  const spawnEnd = 0.6
  const fadeStart = 0.7
  const gravity = 0.06
  var spawned = 0
  const start = performance.now()

  function spawnBill() {
    const c = colors[Math.floor(Math.random() * colors.length)]
    const billW = rand(28, 42)
    bills.push({
      x: rand(0, w),
      y: rand(-80, -20),
      vx: rand(-0.8, 0.8),
      vy: rand(0.8, 2.2),
      w: billW,
      h: billW * 0.5,
      rotation: rand(-15, 15),
      rotationSpeed: rand(-2, 2),
      windPhase: rand(0, Math.PI * 2),
      windSpeed: rand(0.015, 0.045),
      windAmp: rand(1.2, 3),
      flutterPhase: rand(0, Math.PI * 2),
      flutterSpeed: rand(0.03, 0.08),
      bodyColor: c.body,
      borderColor: c.border,
      textColor: c.text,
      life: 1,
    })
    spawned++
  }

  function drawBill(p: Bill) {
    ctx!.save()
    ctx!.globalAlpha = p.life
    ctx!.translate(p.x, p.y)
    ctx!.rotate((p.rotation * Math.PI) / 180)

    var flutter = Math.cos(p.flutterPhase)
    var absFlutter = Math.abs(flutter)
    if (absFlutter < 0.15) absFlutter = 0.15
    ctx!.scale(absFlutter, 1)

    var hw = p.w / 2
    var hh = p.h / 2
    var r = 3

    ctx!.beginPath()
    ctx!.moveTo(-hw + r, -hh)
    ctx!.lineTo(hw - r, -hh)
    ctx!.quadraticCurveTo(hw, -hh, hw, -hh + r)
    ctx!.lineTo(hw, hh - r)
    ctx!.quadraticCurveTo(hw, hh, hw - r, hh)
    ctx!.lineTo(-hw + r, hh)
    ctx!.quadraticCurveTo(-hw, hh, -hw, hh - r)
    ctx!.lineTo(-hw, -hh + r)
    ctx!.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
    ctx!.closePath()
    ctx!.fillStyle = p.bodyColor
    ctx!.fill()
    ctx!.strokeStyle = p.borderColor
    ctx!.lineWidth = 1.2
    ctx!.stroke()

    var inset = 3
    var iw = hw - inset
    var ih = hh - inset
    ctx!.beginPath()
    ctx!.rect(-iw, -ih, iw * 2, ih * 2)
    ctx!.strokeStyle = p.borderColor
    ctx!.lineWidth = 0.6
    ctx!.setLineDash([2, 2])
    ctx!.stroke()
    ctx!.setLineDash([])

    ctx!.fillStyle = p.textColor
    ctx!.font = 'bold ' + Math.round(p.h * 0.7) + 'px sans-serif'
    ctx!.textAlign = 'center'
    ctx!.textBaseline = 'middle'
    ctx!.fillText('$', 0, 1)

    var cl = 4
    ctx!.strokeStyle = p.textColor
    ctx!.lineWidth = 0.8
    ctx!.beginPath()
    ctx!.moveTo(-iw, -ih + cl)
    ctx!.lineTo(-iw, -ih)
    ctx!.lineTo(-iw + cl, -ih)
    ctx!.moveTo(iw - cl, -ih)
    ctx!.lineTo(iw, -ih)
    ctx!.lineTo(iw, -ih + cl)
    ctx!.moveTo(iw, ih - cl)
    ctx!.lineTo(iw, ih)
    ctx!.lineTo(iw - cl, ih)
    ctx!.moveTo(-iw + cl, ih)
    ctx!.lineTo(-iw, ih)
    ctx!.lineTo(-iw, ih - cl)
    ctx!.stroke()

    ctx!.restore()
  }

  function frame(now: number) {
    var elapsed = now - start
    var progress = Math.min(elapsed / duration, 1)

    ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight)

    if (progress < spawnEnd) {
      var target = Math.floor((progress / spawnEnd) * billCount)
      while (spawned < target) {
        spawnBill()
      }
    }

    var alive = false
    for (var i = 0; i < bills.length; i++) {
      var p = bills[i]
      if (p.life <= 0) continue

      p.vy += gravity
      p.y += p.vy
      p.windPhase += p.windSpeed
      p.x += p.vx + Math.sin(p.windPhase) * p.windAmp
      p.rotation += p.rotationSpeed + Math.sin(p.windPhase * 1.3) * 0.5
      p.flutterPhase += p.flutterSpeed

      if (progress > fadeStart) {
        p.life = Math.max(0, 1 - (progress - fadeStart) / (1 - fadeStart))
      }

      if (p.y > window.innerHeight + 40 || p.life <= 0) {
        p.life = 0
        continue
      }

      alive = true
      drawBill(p)
    }

    if ((alive || progress < spawnEnd) && progress < 1) {
      requestAnimationFrame(frame)
    } else {
      window.removeEventListener('resize', resize)
      canvas.remove()
    }
  }

  requestAnimationFrame(frame)
}
