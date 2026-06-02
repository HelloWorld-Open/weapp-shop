const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function verifyToken(uid, token) {
  if (!uid || !token) return false
  const { data: user } = await db.collection('users').doc(uid).get()
  return !!(user && user.tokens && user.tokens.includes(token))
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  if (action === 'updateInfo') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const updateData = {}
    if (event.nickName !== undefined) updateData.nickName = event.nickName
    if (event.avatarUrl !== undefined) updateData.avatarUrl = event.avatarUrl
    if (event.gender !== undefined) updateData.gender = event.gender
    if (Object.keys(updateData).length === 0) return { success: false, data: null, message: 'no fields to update' }
    await db.collection('users').where({ _id: event._uid }).update({ data: updateData })
    return { success: true, data: null }
  }

  if (action === 'getInfo') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { data } = await db.collection('users').where({ _id: event._uid }).get()
    return { success: true, data: data[0] || null }
  }

  return { success: false, data: null, message: 'unknown action' }
}
