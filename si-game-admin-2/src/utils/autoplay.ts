const SAMPLE_RATE = 8000
const SILENT_SAMPLES = 800
const WAV_HEADER_SIZE = 44

type AutoplayPolicy = "allowed" | "allowed-muted" | "disallowed"
type AutoplayNavigator = Navigator & { getAutoplayPolicy?: (type: "mediaelement") => AutoplayPolicy }

export const isAutoplayBlocked = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "NotAllowedError"

const silentWavUrl = (): string => {
  const buffer = new ArrayBuffer(WAV_HEADER_SIZE + SILENT_SAMPLES)
  const view = new DataView(buffer)
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index))
    }
  }
  writeText(0, "RIFF")
  view.setUint32(4, WAV_HEADER_SIZE - 8 + SILENT_SAMPLES, true)
  writeText(8, "WAVE")
  writeText(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  writeText(36, "data")
  view.setUint32(40, SILENT_SAMPLES, true)
  const bytes = new Uint8Array(buffer)
  bytes.fill(128, WAV_HEADER_SIZE)
  return `data:audio/wav;base64,${btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""))}`
}

export const canAutoplaySound = async (): Promise<boolean> => {
  const policy = (navigator as AutoplayNavigator).getAutoplayPolicy?.("mediaelement")
  if (policy) {
    return policy === "allowed"
  }

  const audio = new Audio(silentWavUrl())
  try {
    await audio.play()
    audio.pause()
    return true
  } catch (error) {
    return !isAutoplayBlocked(error)
  }
}
