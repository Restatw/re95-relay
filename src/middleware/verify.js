// Optional ECDSA P-256 signature verification middleware.
// If a post carries { displayId, sig, pubkey }, the signature is verified.
// Posts without a sig are accepted as anonymous.
import { webcrypto } from 'crypto'

const { subtle } = webcrypto

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes.buffer
}

export async function verifyPost(req, res, next) {
  const { id, content, sig, pubkey, displayId } = req.body ?? {}

  // no identity attached — pass through
  if (!sig || !pubkey || !displayId) return next()

  try {
    const key = await subtle.importKey(
      'raw',
      fromHex(pubkey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    )

    const encoded = new TextEncoder().encode(JSON.stringify({ id, content }))
    const valid = await subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      fromHex(sig),
      encoded
    )

    if (!valid) return res.status(403).json({ error: 'invalid signature' })
  } catch {
    return res.status(403).json({ error: 'signature verification failed' })
  }

  next()
}
