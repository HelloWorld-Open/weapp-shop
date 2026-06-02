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
  const { action } = event
  const { OPENID } = cloud.getWXContext()

  if (action === 'add') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { productId } = event
    const existing = await db.collection('favorites')
      .where({ userId: event._uid, productId })
      .get()
    if (existing.data.length > 0) {
      return { success: true, data: { favorited: true } }
    }
    await db.collection('favorites').add({
      data: { openId: OPENID, userId: event._uid, productId, createTime: db.serverDate() }
    })
    return { success: true, data: { favorited: true } }
  }

  if (action === 'remove') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { productId } = event
    await db.collection('favorites')
      .where({ userId: event._uid, productId })
      .remove()
    return { success: true, data: { favorited: false } }
  }

  if (action === 'getList') {
    const { page = 1, pageSize = 20 } = event
    const countResult = await db.collection('favorites')
      .where({ userId: event._uid })
      .count()
    const { data } = await db.collection('favorites')
      .where({ userId: event._uid })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    const productIds = data.map(item => item.productId)
    const { data: products } = await db.collection('products')
      .where({ _id: _.in(productIds) })
      .field({ _id: true, name: true, price: true, images: true, status: true, stock: true, sales: true })
      .get()

    const productMap = {}
    products.forEach(p => { productMap[p._id] = p })

    const list = data.map(item => ({
      _id: item._id,
      productId: item.productId,
      createTime: item.createTime,
      productInfo: productMap[item.productId] || null
    }))

    return { success: true, data: { list, total: countResult.total } }
  }

  if (action === 'checkBatch') {
    const { productIds } = event
    if (!productIds || productIds.length === 0) {
      return { success: true, data: { map: {} } }
    }
    const { data } = await db.collection('favorites')
      .where({ userId: event._uid, productId: _.in(productIds) })
      .get()
    const favorited = {}
    data.forEach(item => { favorited[item.productId] = true })
    productIds.forEach(id => { if (!favorited[id]) favorited[id] = false })
    return { success: true, data: { map: favorited } }
  }

  return { success: false, data: null, message: 'unknown action' }
}
