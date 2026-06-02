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

  if (action === 'getMyCoupons') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { status, page = 1, pageSize = 20 } = event
    let query = { userId: event._uid }
    if (status && status !== 'all') {
      if (status === 'available') {
        query.status = 'available'
        query.validTo = _.gte(new Date())
      } else if (status === 'expired') {
        query.status = 'available'
        query.validTo = _.lt(new Date())
      } else {
        query.status = status
      }
    }
    const countResult = await db.collection('coupons').where(query).count()
    const { data } = await db.collection('coupons')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { success: true, data: { list: data, total: countResult.total } }
  }

  if (action === 'getUsableCoupons') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { products, totalPrice } = event
    const { data: allCoupons } = await db.collection('coupons')
      .where({ userId: event._uid, status: 'available' })
      .get()
    const validCoupons = allCoupons.filter(c => {
      if (c.validTo && new Date(c.validTo) < new Date()) return false
      if (c.minAmount > 0 && totalPrice < c.minAmount) return false
      if (c.categoryId) {
        const hasCategory = products.some(p => p.categoryId === c.categoryId)
        if (!hasCategory) return false
      }
      return true
    })
    return { success: true, data: { list: validCoupons } }
  }

  return { success: false, data: null, message: 'unknown action' }
}
