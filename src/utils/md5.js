const shifts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
]
const constants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000))

function rotateLeft(value, shift) {
  return (value << shift) | (value >>> (32 - shift))
}

export function md5(arrayBuffer) {
  const input = new Uint8Array(arrayBuffer)
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64
  const bytes = new Uint8Array(paddedLength)
  bytes.set(input)
  bytes[input.length] = 0x80
  const view = new DataView(bytes.buffer)
  const bitLength = input.length * 8
  view.setUint32(paddedLength - 8, bitLength >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476
  for (let offset = 0; offset < paddedLength; offset += 64) {
    let a = a0
    let b = b0
    let c = c0
    let d = d0
    for (let index = 0; index < 64; index += 1) {
      let fn
      let wordIndex
      if (index < 16) {
        fn = (b & c) | (~b & d)
        wordIndex = index
      } else if (index < 32) {
        fn = (d & b) | (~d & c)
        wordIndex = (5 * index + 1) % 16
      } else if (index < 48) {
        fn = b ^ c ^ d
        wordIndex = (3 * index + 5) % 16
      } else {
        fn = c ^ (b | ~d)
        wordIndex = (7 * index) % 16
      }
      const sum = (a + fn + constants[index] + view.getUint32(offset + wordIndex * 4, true)) | 0
      const rotated = rotateLeft(sum, shifts[index])
      a = d
      d = c
      c = b
      b = (b + rotated) | 0
    }
    a0 = (a0 + a) | 0
    b0 = (b0 + b) | 0
    c0 = (c0 + c) | 0
    d0 = (d0 + d) | 0
  }

  return [a0, b0, c0, d0].map(value => {
    let hex = ''
    for (let index = 0; index < 4; index += 1) {
      hex += ((value >>> (index * 8)) & 0xff).toString(16).padStart(2, '0')
    }
    return hex
  }).join('')
}
