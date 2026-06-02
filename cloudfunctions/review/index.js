const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

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
    const { orderNo, productId, rating, content, images } = event

    const { data: orders } = await db.collection('orders').where({ orderNo, userId: event._uid }).get()
    if (orders.length === 0) return { success: false, data: null, message: '订单不存在' }
    const order = orders[0]
    if (order.status !== 'delivered') return { success: false, data: null, message: '仅已收货订单可评价' }

    const reviewed = order.reviewedItems || []
    if (reviewed.includes(productId)) return { success: false, data: null, message: '该商品已评价过' }

    const { data: users } = await db.collection('users').where({ _id: event._uid }).get()
    const user = users[0] || {}

    const ratingVal = Math.min(5, Math.max(1, Math.round(Number(rating) || 0)))

    await db.collection('reviews').add({
      data: {
        orderNo,
        productId,
        userId: event._uid,
        openId: OPENID,
        nickName: user.nickName || '用户',
        avatarUrl: user.avatarUrl || '',
        rating: ratingVal,
        content: content || '',
        images: images || [],
        createTime: db.serverDate()
      }
    })

    await db.collection('orders').doc(order._id).update({
      data: { reviewedItems: _.push([productId]) }
    })

    await db.collection('products').doc(productId).update({
      data: {
        reviewCount: _.inc(1),
        reviewTotalRating: _.inc(ratingVal)
      }
    })

    return { success: true, data: null }
  }

  if (action === 'getList') {
    const { productId, page = 1, pageSize = 10 } = event
    const countResult = await db.collection('reviews').where({ productId }).count()
    const { data } = await db.collection('reviews')
      .where({ productId })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { success: true, data: { list: data, total: countResult.total } }
  }

  if (action === 'getStats') {
    const { productId } = event
    const { list } = await db.collection('reviews')
      .aggregate()
      .match({ productId })
      .group({
        _id: '$rating',
        count: $.sum(1)
      })
      .end()

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let total = 0
    let totalRating = 0
    ;(list || []).forEach(g => {
      distribution[g._id] = g.count
      total += g.count
      totalRating += g._id * g.count
    })

    return {
      success: true,
      data: {
        totalReviews: total,
        avgRating: total > 0 ? Math.round((totalRating / total) * 10) / 10 : 0,
        distribution
      }
    }
  }

  return { success: false, data: null, message: 'unknown action' }
}
