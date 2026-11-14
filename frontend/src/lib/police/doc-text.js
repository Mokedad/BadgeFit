// The words in a file someone sends Hayden (lib/police/program-text.js reads them): plain text,
// CSV and markdown as they are; a Word document (.docx, a zip) unpacked with the browser's own
// DecompressionStream, no library. A PDF or a photo is refused with a reason the sheet shows.

/** The text of a .docx's main document, paragraphs on their own lines. */
export function docxXmlText(xml) {
  return String(xml)
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<\/w:p>/g, '\n').replace(/<w:br\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

/** One file out of a zip (Uint8Array), as a string, or null when it is not there. */
export async function unzipText(bytes, wanted) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) return null
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) return null
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    if (name === wanted) {
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true)
      const data = bytes.subarray(start, start + size)
      if (method === 0) return dec.decode(data)
      if (method !== 8 || typeof DecompressionStream === 'undefined') return null
      const out = new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')))
      return dec.decode(new Uint8Array(await out.arrayBuffer()))
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  return null
}

/** The words in a picked file. Throws { code: 'pdf' | 'image' | 'unreadable' }. */
export async function fileText(file) {
  const name = String(file?.name || '').toLowerCase()
  const fail = code => Object.assign(new Error(code), { code })
  if (/\.pdf$/.test(name) || file?.type === 'application/pdf') throw fail('pdf')
  if (/^image\//.test(file?.type || '') || /\.(png|jpe?g|heic|webp)$/.test(name)) throw fail('image')
  if (/\.docx$/.test(name)) {
    const xml = await unzipText(new Uint8Array(await file.arrayBuffer()), 'word/document.xml')
    if (xml == null) throw fail('unreadable')
    return docxXmlText(xml)
  }
  if (/\.(doc|pages|xlsx?|numbers|key|zip)$/.test(name)) throw fail('unreadable')
  return await file.text()
}
