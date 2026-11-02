import { md5 } from '../utils/md5'

function requireAndroid() {
  if (typeof plus === 'undefined' || !plus.android) {
    throw new Error('请在 HBuilderX Android 真机基座或 APK 中运行。')
  }
}

function runtimeApiLevel() {
  const BuildVersion = plus.android.importClass('android.os.Build$VERSION')
  return Number(BuildVersion.SDK_INT)
}

export function requestPhotoPermission() {
  requireAndroid()
  return new Promise((resolve, reject) => {
    const permissions = runtimeApiLevel() >= 33
      ? ['android.permission.READ_MEDIA_IMAGES']
      : ['android.permission.READ_EXTERNAL_STORAGE']
    plus.android.requestPermissions(permissions, result => {
      if (result.granted && result.granted.length) resolve()
      else reject(new Error('没有相册读取权限，请在系统设置中允许 PhotoSort 访问照片。'))
    }, error => reject(new Error(error.message || '申请相册权限失败。')))
  })
}

export function requestExportPermission() {
  requireAndroid()
  if (runtimeApiLevel() > 28) return Promise.resolve()
  return new Promise((resolve, reject) => {
    plus.android.requestPermissions(['android.permission.WRITE_EXTERNAL_STORAGE'], result => {
      if (result.granted && result.granted.length) resolve()
      else reject(new Error('没有相册写入权限，无法导出照片副本。'))
    }, error => reject(new Error(error.message || '申请相册写入权限失败。')))
  })
}

export function scanPhotos() {
  requireAndroid()
  const activity = plus.android.runtimeMainActivity()
  const resolver = plus.android.invoke(activity, 'getContentResolver')
  const Media = plus.android.importClass('android.provider.MediaStore$Images$Media')
  const ContentUris = plus.android.importClass('android.content.ContentUris')
  const mediaUri = Media.EXTERNAL_CONTENT_URI
  const cursor = plus.android.invoke(resolver, 'query', mediaUri, null, null, null, 'date_taken DESC')
  if (!cursor) throw new Error('无法读取系统相册。')

  const rows = []
  try {
    while (plus.android.invoke(cursor, 'moveToNext')) {
      const indexOf = column => Number(plus.android.invoke(cursor, 'getColumnIndex', column))
      const readString = column => {
        const index = indexOf(column)
        return index >= 0 ? plus.android.invoke(cursor, 'getString', index) : ''
      }
      const readLong = column => {
        const index = indexOf(column)
        return index >= 0 ? Number(plus.android.invoke(cursor, 'getLong', index)) : 0
      }
      const id = String(readLong('_id'))
      if (id === '0') continue
      const itemUri = plus.android.invoke(ContentUris, 'withAppendedId', mediaUri, Number(id))
      const taken = readLong('datetaken')
      rows.push({
        id,
        uri: String(itemUri.toString()),
        path: readString('_data'),
        name: readString('_display_name') || `照片-${id}`,
        takenAt: taken ? new Date(taken).toISOString() : '',
        width: readLong('width'),
        height: readLong('height'),
        mimeType: readString('mime_type'),
        isScreenshot: /screenshot|截屏|屏幕截图/i.test(readString('_display_name'))
      })
    }
  } finally {
    plus.android.invoke(cursor, 'close')
  }
  return rows
}

function parseExifCoordinate(exif, latitude) {
  const coordinate = plus.android.invoke(exif, 'getAttribute', latitude ? 'GPSLatitude' : 'GPSLongitude')
  const reference = plus.android.invoke(exif, 'getAttribute', latitude ? 'GPSLatitudeRef' : 'GPSLongitudeRef')
  if (!coordinate) return null
  const parts = String(coordinate).split(',').map(part => {
    const fraction = part.trim().split('/')
    return fraction.length === 2 ? Number(fraction[0]) / Number(fraction[1]) : Number(fraction[0])
  })
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) return null
  let value = parts[0] + parts[1] / 60 + parts[2] / 3600
  if (reference && /[SW]/i.test(String(reference))) value *= -1
  return value
}

function readExif(photo) {
  if (!photo.path) return {}
  try {
    const exif = plus.android.newObject('android.media.ExifInterface', photo.path)
    const date = String(plus.android.invoke(exif, 'getAttribute', 'DateTimeOriginal') || '')
    const parsedDate = date.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
    const camera = [
      plus.android.invoke(exif, 'getAttribute', 'Make'),
      plus.android.invoke(exif, 'getAttribute', 'Model')
    ].filter(Boolean).join(' ')
    return {
      takenAt: parsedDate
        ? `${parsedDate[1]}-${parsedDate[2]}-${parsedDate[3]}T${parsedDate[4]}:${parsedDate[5]}:${parsedDate[6]}`
        : photo.takenAt,
      camera,
      latitude: parseExifCoordinate(exif, true),
      longitude: parseExifCoordinate(exif, false)
    }
  } catch (error) {
    console.warn(`无法读取照片 EXIF：${photo.name}`, error)
    return {}
  }
}

function readArrayBuffer(path) {
  return new Promise((resolve, reject) => {
    if (!path) {
      reject(new Error('系统未提供该照片的本地文件路径。'))
      return
    }
    plus.io.resolveLocalFileSystemURL(path, entry => {
      entry.file(file => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error(`读取照片失败：${file.name}`))
        reader.readAsArrayBuffer(file)
      }, reject)
    }, reject)
  })
}

function inspectPixels(photo) {
  if (!photo.path) return []
  try {
    const BitmapFactory = plus.android.importClass('android.graphics.BitmapFactory')
    const Options = plus.android.newObject('android.graphics.BitmapFactory$Options')
    Options.inSampleSize = 16
    const bitmap = plus.android.invoke(BitmapFactory, 'decodeFile', photo.path, Options)
    if (!bitmap) return []
    const width = Number(plus.android.invoke(bitmap, 'getWidth'))
    const height = Number(plus.android.invoke(bitmap, 'getHeight'))
    if (!width || !height) return []
    let black = 0
    let white = 0
    const samples = 25
    for (let index = 0; index < samples; index += 1) {
      const x = Math.min(width - 1, Math.floor((index % 5) * width / 5 + width / 10))
      const y = Math.min(height - 1, Math.floor(Math.floor(index / 5) * height / 5 + height / 10))
      const pixel = plus.android.invoke(bitmap, 'getPixel', x, y)
      const red = (pixel >>> 16) & 0xff
      const green = (pixel >>> 8) & 0xff
      const blue = pixel & 0xff
      if (red < 12 && green < 12 && blue < 12) black += 1
      if (red > 243 && green > 243 && blue > 243) white += 1
    }
    plus.android.invoke(bitmap, 'recycle')
    const flags = []
    if (Number(photo.width) > 0 && Number(photo.height) > 0
      && (Number(photo.width) < 200 || Number(photo.height) < 200)) {
      flags.push('尺寸过小')
    }
    if (black >= 24) flags.push('疑似全黑')
    if (white >= 24) flags.push('疑似纯白')
    return flags
  } catch (error) {
    console.warn(`无法检查照片像素：${photo.path}`, error)
    return []
  }
}

export async function inspectPhoto(photo) {
  const exif = readExif(photo)
  let hash = ''
  try {
    hash = md5(await readArrayBuffer(photo.path))
  } catch (error) {
    console.warn(`无法计算照片 MD5：${photo.name}`, error)
  }
  let dimensions = {}
  try {
    dimensions = await new Promise((resolve, reject) => {
      uni.getImageInfo({
        src: photo.uri,
        success: result => resolve({ width: result.width, height: result.height }),
        fail: reject
      })
    })
  } catch (error) {
    dimensions = { width: photo.width, height: photo.height }
  }
  return {
    ...exif,
    ...dimensions,
    md5: hash,
    cleanupFlags: inspectPixels({ ...photo, ...dimensions })
  }
}

function copyFileToAlbum(photo, category) {
  const activity = plus.android.runtimeMainActivity()
  const resolver = plus.android.invoke(activity, 'getContentResolver')
  const Uri = plus.android.importClass('android.net.Uri')
  const Media = plus.android.importClass('android.provider.MediaStore$Images$Media')
  const values = plus.android.newObject('android.content.ContentValues')
  const BuildVersion = plus.android.importClass('android.os.Build$VERSION')
  const relativePath = `Pictures/PhotoSort/${category}/`
  plus.android.invoke(values, 'put', 'display_name', photo.name)
  plus.android.invoke(values, 'put', 'mime_type', photo.mimeType || 'image/jpeg')
  if (Number(BuildVersion.SDK_INT) >= 29) {
    plus.android.invoke(values, 'put', 'relative_path', relativePath)
    plus.android.invoke(values, 'put', 'is_pending', 1)
  }
  const destination = plus.android.invoke(resolver, 'insert', Media.EXTERNAL_CONTENT_URI, values)
  if (!destination) return Promise.reject(new Error(`无法创建「${category}」相簿。`))

  return new Promise((resolve, reject) => {
    let input
    let output
    try {
      input = plus.android.invoke(resolver, 'openInputStream', Uri.parse(photo.uri))
      output = plus.android.invoke(resolver, 'openOutputStream', destination)
      if (!input || !output) throw new Error(`无法打开照片流：${photo.name}`)
      if (Number(BuildVersion.SDK_INT) >= 29) {
        const FileUtils = plus.android.importClass('android.os.FileUtils')
        plus.android.invoke(FileUtils, 'copy', input, output)
      } else {
        let value
        while ((value = Number(plus.android.invoke(input, 'read'))) !== -1) {
          plus.android.invoke(output, 'write', value)
        }
      }
      plus.android.invoke(input, 'close')
      input = null
      plus.android.invoke(output, 'close')
      output = null
      if (Number(BuildVersion.SDK_INT) >= 29) {
        const completed = plus.android.newObject('android.content.ContentValues')
        plus.android.invoke(completed, 'put', 'is_pending', 0)
        plus.android.invoke(resolver, 'update', destination, completed, null, null)
      }
      resolve()
    } catch (error) {
      for (const stream of [input, output]) {
        if (!stream) continue
        try {
          plus.android.invoke(stream, 'close')
        } catch (closeError) {
          console.error('关闭照片导出流失败', closeError)
        }
      }
      try {
        plus.android.invoke(resolver, 'delete', destination, null, null)
      } catch (cleanupError) {
        console.error('清理未完成的导出副本失败', cleanupError)
      }
      reject(error)
    }
  })
}

export async function copyPhotosToAlbum(photos, category) {
  requireAndroid()
  let copied = 0
  for (const photo of photos) {
    try {
      await copyFileToAlbum(photo, category)
    } catch (error) {
      throw new Error(`已复制 ${copied} 张；${photo.name} 导出失败：${error.message || '未知错误'}`)
    }
    copied += 1
  }
  return copied
}
