// A photo made small enough to send (longest side `max` px, JPEG), as base64. Used for a plan's
// photo (components/ProgramUpload.jsx) and the machine camera in the exercise picker; the photo is
// read once on the server and kept nowhere.
export async function shrinkPhoto(file, max = 1600) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error('That photo could not be opened.')); i.src = url })
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.82).split(',')[1]
  } finally { URL.revokeObjectURL(url) }
}
