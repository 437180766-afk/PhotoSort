let enginePromise

function assetUrl(name) {
  const relativePath = `_www/static/ocr/${name}`
  if (typeof plus !== 'undefined' && plus.io) {
    return plus.io.convertLocalFileSystemURL(relativePath)
  }
  return `/static/ocr/${name}`
}

function loadScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.PhotoSortPaddleOCR) return Promise.resolve(true)
  return new Promise(resolve => {
    const script = document.createElement('script')
    script.src = assetUrl('paddleocr.js')
    script.onload = () => resolve(Boolean(window.PhotoSortPaddleOCR))
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
}

export async function loadOfflineOcr() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const loaded = await loadScript()
      if (!loaded || !window.PhotoSortPaddleOCR) return false
      try {
        const engine = await window.PhotoSortPaddleOCR.create({
          detModel: assetUrl('det'),
          recModel: assetUrl('rec'),
          keys: assetUrl('keys.txt'),
          wasm: assetUrl('')
        })
        getApp().globalData.ocrEngine = engine
        return true
      } catch (error) {
        throw new Error(`离线 OCR 初始化失败：${error.message || '请检查本地 runtime 和模型文件。'}`)
      }
    })()
  }
  return enginePromise
}

export async function recognize(path, uri) {
  const engine = getApp().globalData.ocrEngine
  if (!engine) return ''
  const result = await engine.recognize(path || uri)
  if (typeof result === 'string') return result
  if (Array.isArray(result)) return result.map(item => item.text || '').join('\n')
  return ''
}
