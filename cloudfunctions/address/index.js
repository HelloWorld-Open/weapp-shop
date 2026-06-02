const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

async function verifyToken(uid, token) {
  if (!uid || !token) return false
  const { data: user } = await db.collection('users').doc(uid).get()
  return !!(user && user.tokens && user.tokens.includes(token))
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  if (action === 'add') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { name, phone, region, detail, isDefault } = event

    if (isDefault) {
      await db.collection('addresses').where({ userId: event._uid }).update({
        data: { isDefault: false }
      })
    }

    const res = await db.collection('addresses').add({
      data: { openId: OPENID, userId: event._uid, name, phone, region, detail, isDefault: !!isDefault, createTime: db.serverDate() }
    })
    return { success: true, data: { addressId: res._id } }
  }

  if (action === 'getList') {
    const { data } = await db.collection('addresses')
      .where({ userId: event._uid })
      .orderBy('isDefault', 'desc')
      .orderBy('createTime', 'desc')
      .field({ _id: true, name: true, phone: true, region: true, detail: true, isDefault: true })
      .get()
    return { success: true, data: { list: data } }
  }

  if (action === 'update') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { addressId, name, phone, region, detail, isDefault } = event

    if (isDefault) {
      await db.collection('addresses').where({ userId: event._uid }).update({
        data: { isDefault: false }
      })
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (region !== undefined) updateData.region = region
    if (detail !== undefined) updateData.detail = detail
    if (isDefault !== undefined) updateData.isDefault = isDefault

    await db.collection('addresses').where({ _id: addressId, userId: event._uid }).update({ data: updateData })
    return { success: true, data: null }
  }

  if (action === 'delete') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { addressId } = event
    await db.collection('addresses').where({ _id: addressId, userId: event._uid }).remove()
    return { success: true, data: null }
  }

  return { success: false, data: null, message: 'unknown action' }
}
