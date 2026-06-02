const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const STATUS = {
  PENDING: 'pending', PAID: 'paid', SHIPPED: 'shipped',
  DELIVERED: 'delivered', CANCELLED: 'cancelled', REFUNDED: 'refunded'
}

function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `ORD${y}${m}${d}${h}${min}${s}${rand}`
}

async function verifyToken(uid, token) {
  if (!uid || !token) return false
  const { data: user } = await db.collection('users').doc(uid).get()
  return !!(user && user.tokens && user.tokens.includes(token))
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  if (action === 'create') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { items: rawItems, addressId, remark, couponId } = event
    const orderNo = generateOrderNo()

    const { data: addressDoc } = await db.collection('addresses').where({ _id: addressId, userId: event._uid }).get()
    if (!addressDoc || addressDoc.length === 0) return { success: false, data: null, message: '地址不存在' }
    const addressData = addressDoc[0]

    const productResults = await Promise.all(
      rawItems.map(item => db.collection('products').doc(item.productId).get())
    )

    const items = []
    let totalPrice = 0
    let discountAmount = 0
    for (let i = 0; i < rawItems.length; i++) {
      const product = productResults[i].data
      if (!product) {
        return { success: false, data: null, message: '商品不存在' }
      }
      if (product.status !== 'on') {
        return { success: false, data: null, message: `商品「${product.name}」已下架` }
      }
      if (product.stock < rawItems[i].quantity) {
        return { success: false, data: null, message: `商品「${product.name}」库存不足` }
      }
      items.push({
        cartId: rawItems[i].cartId || '',
        productId: rawItems[i].productId,
        categoryId: product.categoryId || '',
        name: product.name,
        image: product.images && product.images[0] ? product.images[0] : '',
        price: product.price,
        quantity: rawItems[i].quantity
      })
      totalPrice += product.price * rawItems[i].quantity
    }

    if (couponId) {
      const { data: couponList } = await db.collection('coupons')
        .where({ _id: couponId, userId: event._uid, status: 'available' })
        .limit(1)
        .get()
      if (couponList.length === 0) return { success: false, data: null, message: '优惠券不存在或已使用' }
      const coupon = couponList[0]
      if (coupon.validTo && new Date(coupon.validTo) < new Date()) return { success: false, data: null, message: '优惠券已过期' }
      if (coupon.minAmount > 0 && totalPrice < coupon.minAmount) return { success: false, data: null, message: '未达到优惠券使用门槛' }
      if (coupon.categoryId) {
        const hasCategory = items.some(item => item.categoryId === coupon.categoryId)
        if (!hasCategory) return { success: false, data: null, message: '购物车中无适用分类商品' }
      }
      if (coupon.type === 'fixed') {
        discountAmount = Math.min(coupon.value, totalPrice)
      } else if (coupon.type === 'discount') {
        discountAmount = Math.round(totalPrice * (10 - coupon.value) / 10)
      }
    }

    const finalPrice = Math.max(totalPrice - discountAmount, 0)

    await db.collection('orders').add({
      data: {
        orderNo,
        openId: OPENID,
        userId: event._uid,
        items,
        totalPrice,
        discountAmount,
        finalPrice,
        couponId: couponId || null,
        status: STATUS.PENDING,
        address: addressData,
        remark: remark || '',
        createTime: db.serverDate(),
        payTime: null,
        cancelTime: null
      }
    })

    return { success: true, data: { orderNo, discountAmount, finalPrice } }
  }

  if (action === 'getList') {
    const { status, page = 1, pageSize = 10 } = event
    let query = { userId: event._uid }
    if (status && status !== 'all') query.status = status

    const countResult = await db.collection('orders').where(query).count()
    const { data } = await db.collection('orders')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { success: true, data: { list: data, total: countResult.total } }
  }

  if (action === 'getDetail') {
    const { orderNo } = event
    const { data } = await db.collection('orders').where({ orderNo }).get()
    const order = data[0] || null
    return { success: true, data: { order } }
  }

  if (action === 'getOrderCounts') {
    const userId = event._uid
    const [pending, paid, shipped, delivered] = await Promise.all([
      db.collection('orders').where({ userId, status: 'pending' }).count(),
      db.collection('orders').where({ userId, status: 'paid' }).count(),
      db.collection('orders').where({ userId, status: 'shipped' }).count(),
      db.collection('orders').where({ userId, status: 'delivered' }).count()
    ])
    return {
      success: true,
      data: {
        pending: pending.total,
        paid: paid.total,
        shipped: shipped.total,
        delivered: delivered.total
      }
    }
  }

  if (action === 'pay') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { orderNo } = event
    const { data } = await db.collection('orders').where({ orderNo, userId: event._uid }).get()
    if (data.length === 0) return { success: false, data: null, message: '订单不存在' }
    if (data[0].status !== STATUS.PENDING) return { success: false, data: null, message: '订单状态异常' }

    const items = data[0].items
    const productIds = items.map(item => item.productId)
    const { data: products } = productIds.length > 0
      ? await db.collection('products').where({ _id: _.in(productIds) }).get()
      : { data: [] }
    const productMap = {}
    products.forEach(p => { productMap[p._id] = p })

    for (const item of items) {
      const product = productMap[item.productId]
      if (!product || product.stock < item.quantity) {
        return { success: false, data: null, message: `商品「${product?.name || ''}」库存不足` }
      }
    }

    await Promise.all(items.map(item =>
      db.collection('products').doc(item.productId).update({
        data: { stock: _.inc(-item.quantity), sales: _.inc(item.quantity) }
      })
    ))

    await db.collection('orders').where({ orderNo }).update({
      data: { status: STATUS.PAID, payTime: db.serverDate() }
    })

    if (data[0].couponId) {
      await db.collection('coupons').doc(data[0].couponId).update({
        data: { status: 'used', usedAt: db.serverDate(), usedOrderNo: orderNo }
      }).catch(() => {})
    }

    const userId = data[0].userId
    const orderAmount = data[0].totalPrice
    const { data: activeTasks } = await db.collection('userActivities')
      .where({ userId, status: 'in_progress' })
      .get()
    if (activeTasks.length > 0) {
      const activityIds = [...new Set(activeTasks.map(t => t.activityId))]
      const { data: activities } = await db.collection('activities')
        .where({ _id: _.in(activityIds), taskType: 'purchase', status: 'published' })
        .get()
      for (const act of activities) {
        const ua = activeTasks.find(t => t.activityId === act._id)
        if (!ua) continue
        const minAmount = act.taskConfig.minAmount || 0
        const newAmount = (ua.progress.totalAmount || 0) + orderAmount
        const reached = newAmount >= minAmount
        db.collection('userActivities').doc(ua._id).update({
          data: {
            status: reached ? 'completed' : 'in_progress',
            'progress.totalAmount': _.inc(orderAmount),
            updateTime: db.serverDate()
          }
        }).catch(() => {})
      }
    }

    return { success: true, data: null }
  }

  if (action === 'cancel') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { orderNo } = event
    const { data } = await db.collection('orders').where({ orderNo, userId: event._uid }).get()
    if (data.length === 0) return { success: false, data: null, message: '订单不存在' }
    if (data[0].status !== STATUS.PENDING) return { success: false, data: null, message: '仅待付款订单可取消' }
    await db.collection('orders').where({ orderNo }).update({
      data: { status: STATUS.CANCELLED, cancelTime: db.serverDate() }
    })
    return { success: true, data: null }
  }

  if (action === 'confirmReceive') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { orderNo } = event
    const { data } = await db.collection('orders').where({ orderNo, userId: event._uid }).get()
    if (data.length === 0) return { success: false, data: null, message: '订单不存在' }
    if (data[0].status !== STATUS.SHIPPED) return { success: false, data: null, message: '仅待收货订单可确认' }
    await db.collection('orders').where({ orderNo }).update({
      data: { status: STATUS.DELIVERED }
    })
    return { success: true, data: null }
  }

  if (action === 'refund') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { orderNo } = event
    const { data } = await db.collection('orders').where({ orderNo, userId: event._uid }).get()
    if (data.length === 0) return { success: false, data: null, message: '订单不存在' }
    const order = data[0]
    if (order.status !== STATUS.PAID && order.status !== STATUS.SHIPPED) {
      return { success: false, data: null, message: '仅待发货或已发货订单可申请退款' }
    }
    for (const item of order.items) {
      await db.collection('products').doc(item.productId).update({
        data: { stock: _.inc(item.quantity), sales: _.inc(-item.quantity) }
      })
    }
    await db.collection('orders').where({ orderNo }).update({
      data: { status: STATUS.REFUNDED, refundTime: db.serverDate() }
    })
    if (order.couponId) {
      await db.collection('coupons').doc(order.couponId).update({
        data: { status: 'available', usedAt: null, usedOrderNo: null, refundedAt: db.serverDate(), refundedOrderNo: orderNo }
      }).catch(() => {})
    }
    return { success: true, data: null }
  }

  return { success: false, data: null, message: 'unknown action' }
}
