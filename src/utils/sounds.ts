type OscillatorShape = OscillatorType

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorShape = 'sine', vol = 0.08, delay = 0) {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration)
  } catch { /* AudioContext may be blocked by browser policy */ }
}

function playNoise(duration: number, vol = 0.04, delay = 0) {
  try {
    const ctx = getCtx()
    const t = ctx.currentTime + delay
    const len = (ctx.sampleRate * duration) | 0
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.3

    const src = ctx.createBufferSource()
    src.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 4000
    src.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    src.start(t)
  } catch { /* AudioContext may be blocked by browser policy */ }
}

export const sounds = {
  confetti() {
    playTone(523, 0.12, 'triangle', 0.06)
    playTone(659, 0.12, 'triangle', 0.06, 0.08)
    playTone(784, 0.18, 'triangle', 0.07, 0.16)
    playNoise(0.15, 0.03, 0.05)
  },

  coins() {
    playTone(2200, 0.06, 'square', 0.05)
    playTone(2800, 0.06, 'square', 0.04, 0.04)
    playTone(3200, 0.08, 'sine', 0.05, 0.08)
    playTone(2600, 0.1, 'sine', 0.04, 0.14)
    playNoise(0.08, 0.02, 0.02)
  },

  chips() {
    playTone(300, 0.05, 'square', 0.05)
    playTone(350, 0.05, 'square', 0.04, 0.06)
    playTone(280, 0.05, 'square', 0.04, 0.12)
    playNoise(0.1, 0.03)
  },

  money() {
    playTone(1000, 0.05, 'square', 0.05)
    playTone(1500, 0.05, 'square', 0.05, 0.06)
    playTone(2000, 0.12, 'sine', 0.07, 0.12)
  },

  win() {
    playTone(523, 0.1, 'triangle', 0.06)
    playTone(659, 0.1, 'triangle', 0.06, 0.1)
    playTone(784, 0.1, 'triangle', 0.06, 0.2)
    playTone(1047, 0.25, 'sine', 0.08, 0.3)
    playNoise(0.12, 0.02, 0.3)
  },
}

window.__abSounds = sounds
