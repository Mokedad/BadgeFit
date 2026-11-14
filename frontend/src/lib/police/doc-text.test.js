import { describe, it, expect } from 'vitest'
import { docxXmlText, unzipText } from './doc-text.js'

describe('the words in a sent file', () => {
  it('a Word document: paragraphs become lines', () => {
    const xml = '<w:document><w:body><w:p><w:r><w:t>Day 1</w:t></w:r></w:p><w:p><w:r><w:t>Bench press 4x8</w:t></w:r><w:r><w:tab/><w:t>@ 60kg</w:t></w:r></w:p></w:body></w:document>'
    expect(docxXmlText(xml).trim().split('\n')).toEqual(['Day 1', 'Bench press 4x8 @ 60kg'])
  })
  it('finds a stored file in a zip', async () => {
    // A one-file zip, stored (no compression): local header, data, central directory, end.
    const enc = new TextEncoder(), name = enc.encode('word/document.xml'), data = enc.encode('<w:p>hi</w:p>')
    const local = new Uint8Array(30 + name.length + data.length), lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(26, name.length, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true)
    local.set(name, 30); local.set(data, 30 + name.length)
    const cd = new Uint8Array(46 + name.length), cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true); cv.setUint32(20, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, 0, true); cd.set(name, 46)
    const end = new Uint8Array(22), ev = new DataView(end.buffer)
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(10, 1, true); ev.setUint32(12, cd.length, true); ev.setUint32(16, local.length, true)
    const zip = new Uint8Array(local.length + cd.length + end.length); zip.set(local); zip.set(cd, local.length); zip.set(end, local.length + cd.length)
    expect(await unzipText(zip, 'word/document.xml')).toBe('<w:p>hi</w:p>')
    expect(await unzipText(zip, 'missing.xml')).toBe(null)
  })
})
