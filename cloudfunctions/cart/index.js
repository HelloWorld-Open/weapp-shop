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
    const { productId, quantity = 1 } = event
    const existing = await db.collection('carts')
      .where({ userId: event._uid, productId })
      .get()

    if (existing.data.length > 0) {
      await db.collection('carts').doc(existing.data[0]._id).update({
        data: { quantity: _.inc(quantity) }
      })
    } else {
      await db.collection('carts').add({
        data: { openId: OPENID, userId: event._uid, productId, quantity, selected: true, createTime: db.serverDate() }
      })
    }
    return { success: true, data: null }
  }

  if (action === 'getList') {
    const { data } = await db.collection('carts')
      .where({ userId: event._uid })
      .orderBy('createTime', 'desc')
      .get()

    const productIds = data.map(item => item.productId)
    const { data: products } = await db.collection('products')
      .where({ _id: _.in(productIds) })
      .field({ _id: true, name: true, price: true, images: true, status: true, stock: true })
      .get()

    const productMap = {}
    products.forEach(p => { productMap[p._id] = p })

    const list = data.map(item => ({
      ...item,
      productInfo: productMap[item.productId] || null
    }))

    return { success: true, data: { list } }
  }

  if (action === 'update') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { cartId, quantity, selected } = event
    const updateData = {}
    if (quantity !== undefined) updateData.quantity = quantity
    if (selected !== undefined) updateData.selected = selected
    await db.collection('carts').where({ _id: cartId, userId: event._uid }).update({ data: updateData })
    return { success: true, data: null }
  }

  if (action === 'delete') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { cartIds } = event
    await db.collection('carts').where({ _id: _.in(cartIds), userId: event._uid }).remove()
    return { success: true, data: null }
  }

  return { success: false, data: null, message: 'unknown action' }
}
