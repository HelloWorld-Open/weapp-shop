function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let t = ''
  for (let i = 0; i < 24; i++) t += chars[Math.floor(Math.random() * 36)]
  return t
}

async function verifyToken(db, uid, token) {
  if (!uid || !token) return false
  const { data: user } = await db.collection('users').doc(uid).get()
  return !!(user && user.tokens && user.tokens.includes(token))
}

module.exports = { generateToken, verifyToken }
