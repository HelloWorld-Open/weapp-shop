const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const STATUS = {
  PENDING: 'pending', PAID: 'paid', SHIPPED: 'shipped',
  DELIVERED: 'delivered', CANCELLED: 'cancelled', REFUNDED: 'refunded'
}
const ROLE = { USER: 'user', ADMIN: 'admin' }

exports.main = async (event, context) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()

  const { data: adminUser } = await db.collection('users').where({ openId: OPENID, role: ROLE.ADMIN }).get()
  if (adminUser.length === 0) {
    return { success: false, data: null, message: '无权限' }
  }

  if (action === 'getUsers') {
    const { page = 1, pageSize = 999, keyword = '' } = event
    let query = { role: ROLE.USER }
    if (keyword && keyword.trim()) {
      const q = keyword.trim()
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const isPhone = /^\d+$/.test(q)
      query = {
        role: ROLE.USER,
        $or: isPhone
          ? [{ phone: q }, { nickName: db.RegExp({ regexp: esc, options: 'i' }) }]
          : [{ nickName: db.RegExp({ regexp: esc, options: 'i' }) }]
      }
    }
    const countResult = await db.collection('users').where(query).count()
    const { data } = await db.collection('users')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { success: true, data: { list: data, total: countResult.total } }
  }

  if (action === 'deleteUser') {
    const { userId } = event
    await db.collection('users').doc(userId).remove()
    return { success: true, data: null }
  }

  if (action === 'updateUser') {
    const { userId } = event
    const updateData = {}
    if (event.nickName !== undefined) updateData.nickName = event.nickName
    if (event.avatarUrl !== undefined) updateData.avatarUrl = event.avatarUrl
    if (Object.keys(updateData).length === 0) return { success: false, data: null }
    await db.collection('users').doc(userId).update({ data: updateData })
    return { success: true, data: null }
  }

  if (action === 'toggleBan') {
    const { userId } = event
    const { data } = await db.collection('users').doc(userId).get()
    if (!data) return { success: false, data: null, message: '用户不存在' }
    const banned = !data.banned
    await db.collection('users').doc(userId).update({ data: { banned } })
    return { success: true, data: { banned } }
  }

  if (action === 'getProducts') {
    const { page = 1, pageSize = 999, keyword = '', categoryId = '', productStatus = '' } = event
    let query = {}
    if (keyword) {
      const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { name: db.RegExp({ regexp: esc, options: 'i' }) },
        { _id: keyword }
      ]
    }
    if (categoryId) {
      query.categoryId = categoryId
    }
    if (productStatus === 'on' || productStatus === 'off') {
      query.status = productStatus
    }
    const countResult = await db.collection('products').where(query).count()
    const { data } = await db.collection('products')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { success: true, data: { list: data, total: countResult.total } }
  }

  if (action === 'addProduct') {
    const { name, description, price, originalPrice, images, categoryId, stock, isHot, isNew } = event
    const res = await db.collection('products').add({
      data: {
        name, description, price: Number(price), originalPrice: Number(originalPrice) || 0,
        images: images || [], categoryId, stock: Number(stock) || 0,
        sales: 0, isHot: !!isHot, isNew: !!isNew, status: 'on',
        createTime: db.serverDate()
      }
    })
    return { success: true, data: { productId: res._id } }
  }

  if (action === 'updateProduct') {
    const { productId, ...fields } = event
    const updateData = {}
    if (fields.name !== undefined) updateData.name = fields.name
    if (fields.description !== undefined) updateData.description = fields.description
    if (fields.price !== undefined) updateData.price = Number(fields.price)
    if (fields.originalPrice !== undefined) updateData.originalPrice = Number(fields.originalPrice)
    if (fields.images !== undefined) updateData.images = fields.images
    if (fields.categoryId !== undefined) updateData.categoryId = fields.categoryId
    if (fields.stock !== undefined) updateData.stock = Number(fields.stock)
    if (fields.isHot !== undefined) updateData.isHot = !!fields.isHot
    if (fields.isNew !== undefined) updateData.isNew = !!fields.isNew
    if (fields.status !== undefined) updateData.status = fields.status
    await db.collection('products').doc(productId).update({ data: updateData })
    return { success: true, data: null }
  }

  if (action === 'deleteProduct') {
    const { productId } = event
    await db.collection('products').doc(productId).remove()
    return { success: true, data: null }
  }

  if (action === 'getOrders') {
    const { page = 1, pageSize = 999 } = event
    const countResult = await db.collection('orders').count()
    const { data } = await db.collection('orders')
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { success: true, data: { list: data, total: countResult.total } }
  }

  if (action === 'getOrderDetail') {
    const { orderNo } = event
    const { data } = await db.collection('orders').where({ orderNo }).get()
    const order = data[0] || null
    if (order && order.items && order.items.length > 0) {
      const productIds = [...new Set(order.items.map(i => i.productId))]
      const { data: products } = await db.collection('products')
        .where({ _id: _.in(productIds) })
        .field({ images: true })
        .get()
      const productMap = {}
      products.forEach(p => { productMap[p._id] = p.images && p.images[0] ? p.images[0] : '' })
      for (const item of order.items) {
        item.image = productMap[item.productId] || item.image || ''
      }
    }
    return { success: true, data: { order } }
  }

  if (action === 'deleteOrder') {
    const { orderNo } = event
    await db.collection('orders').where({ orderNo }).remove()
    return { success: true, data: null }
  }

  if (action === 'refundOrder') {
    const { orderNo } = event
    const { data } = await db.collection('orders').where({ orderNo }).get()
    if (data.length === 0) return { success: false, data: null, message: '订单不存在' }
    const order = data[0]
    if (order.status === STATUS.CANCELLED || order.status === STATUS.REFUNDED) {
      return { success: false, data: null, message: '订单已取消或已退款' }
    }
    await db.collection('orders').where({ orderNo }).update({
      data: { status: STATUS.REFUNDED, refundTime: db.serverDate() }
    })
    if (order.couponId) {
      await db.collection('coupons').doc(order.couponId).update({
        data: { status: 'available', usedAt: null, usedOrderNo: null, refundedAt: db.serverDate(), refundedOrderNo: orderNo }
      }).catch(() => {})
    }
    for (const item of order.items) {
      await db.collection('products').doc(item.productId).update({
        data: { stock: _.inc(item.quantity) }
      })
    }
    return { success: true, data: null }
  }

  if (action === 'shipOrder') {
    const { orderNo } = event
    const { data } = await db.collection('orders').where({ orderNo }).get()
    if (data.length === 0) return { success: false, data: null, message: '订单不存在' }
    if (data[0].status !== STATUS.PAID) return { success: false, data: null, message: '仅待发货订单可发货' }
    await db.collection('orders').where({ orderNo }).update({
      data: { status: STATUS.SHIPPED, shipTime: db.serverDate() }
    })
    return { success: true, data: null }
  }

  if (action === 'getCategories') {
    const { data } = await db.collection('categories').orderBy('sortOrder', 'asc').get()
    return { success: true, data: { list: data } }
  }

  if (action === 'getBanners') {
    const { data } = await db.collection('banners').orderBy('sortOrder', 'asc').get()
    return { success: true, data: { list: data } }
  }

  if (action === 'addBanner') {
    const { imageUrl, link, sortOrder } = event
    const res = await db.collection('banners').add({
      data: { imageUrl, link: link || '', sortOrder: sortOrder || 0, createTime: db.serverDate() }
    })
    return { success: true, data: { bannerId: res._id } }
  }

  if (action === 'updateBanner') {
    const { bannerId, imageUrl, link, sortOrder } = event
    const update = {}
    if (imageUrl !== undefined) update.imageUrl = imageUrl
    if (link !== undefined) update.link = link
    if (sortOrder !== undefined) update.sortOrder = sortOrder
    await db.collection('banners').doc(bannerId).update({ data: update })
    return { success: true, data: null }
  }

  if (action === 'deleteBanner') {
    const { bannerId } = event
    await db.collection('banners').doc(bannerId).remove()
    return { success: true, data: null }
  }

  if (action === 'reorderBanners') {
    const { ids } = event
    for (let i = 0; i < ids.length; i++) {
      await db.collection('banners').doc(ids[i]).update({ data: { sortOrder: i } })
    }
    return { success: true, data: null }
  }

  if (action === 'getReviews') {
    const { page = 1, pageSize = 999, keyword = '' } = event
    let query = {}
    if (keyword && keyword.trim()) {
      const q = keyword.trim()
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      const orConditions = [
        { content: db.RegExp({ regexp: esc, options: 'i' }) },
        { nickName: db.RegExp({ regexp: esc, options: 'i' }) }
      ]

      const { data: matchedProducts } = await db.collection('products')
        .where({ name: db.RegExp({ regexp: esc, options: 'i' }) })
        .limit(50)
        .field({ _id: true })
        .get()

      if (matchedProducts.length > 0) {
        const productIds = matchedProducts.map(p => p._id)
        orConditions.push({ productId: _.in(productIds) })
      }

      query = _.or(orConditions)
    }
    const countResult = await db.collection('reviews').where(query).count()
    const { data } = await db.collection('reviews')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    const productIds = [...new Set(data.map(r => r.productId))]
    const { data: products } = await db.collection('products')
      .where({ _id: _.in(productIds) })
      .field({ name: true, images: true })
      .get()
    const productMap = {}
    products.forEach(p => { productMap[p._id] = { name: p.name, image: (p.images || [])[0] || '' } })

    const list = data.map(r => ({
      ...r,
      productName: productMap[r.productId]?.name || '已删除',
      productImage: productMap[r.productId]?.image || ''
    }))

    return { success: true, data: { list, total: countResult.total } }
  }

  if (action === 'deleteReview') {
    const { reviewId } = event
    await db.collection('reviews').doc(reviewId).remove()
    return { success: true, data: null }
  }

  // ─── 活动管理 ───
  if (action === 'getActivities') {
    const { page = 1, pageSize = 999 } = event
    const countResult = await db.collection('activities').count()
    const { data } = await db.collection('activities')
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { success: true, data: { list: data, total: countResult.total } }
  }

  if (action === 'addActivity') {
    const { title, description, image, type, taskType, taskConfig, rewardConfig, startTime, endTime, status } = event
    if (!title || !type || !taskType || !startTime || !endTime) {
      return { success: false, data: null, message: '缺少必填字段' }
    }
    const res = await db.collection('activities').add({
      data: {
        title, description: description || '', image: image || '',
        type, taskType,
        taskConfig: taskConfig || {},
        rewardConfig: rewardConfig || {},
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: status || 'draft',
        claimedCount: 0,
        createTime: db.serverDate()
      }
    })
    return { success: true, data: { activityId: res._id } }
  }

  if (action === 'updateActivity') {
    const { activityId, ...fields } = event
    const updateData = {}
    if (fields.title !== undefined) updateData.title = fields.title
    if (fields.description !== undefined) updateData.description = fields.description
    if (fields.image !== undefined) updateData.image = fields.image
    if (fields.type !== undefined) updateData.type = fields.type
    if (fields.taskType !== undefined) updateData.taskType = fields.taskType
    if (fields.taskConfig !== undefined) updateData.taskConfig = fields.taskConfig
    if (fields.rewardConfig !== undefined) updateData.rewardConfig = fields.rewardConfig
    if (fields.startTime !== undefined) updateData.startTime = new Date(fields.startTime)
    if (fields.endTime !== undefined) updateData.endTime = new Date(fields.endTime)
    if (fields.status !== undefined) updateData.status = fields.status
    if (Object.keys(updateData).length === 0) return { success: false, data: null }
    await db.collection('activities').doc(activityId).update({ data: updateData })
    return { success: true, data: null }
  }

  if (action === 'deleteActivity') {
    const { activityId } = event
    await db.collection('activities').doc(activityId).remove()
    return { success: true, data: null }
  }

  if (action === 'toggleActivityStatus') {
    const { activityId, status } = event
    if (!['draft', 'published', 'offline'].includes(status)) {
      return { success: false, data: null, message: '无效状态' }
    }
    await db.collection('activities').doc(activityId).update({ data: { status } })
    return { success: true, data: null }
  }

  return { success: false, data: null, message: 'unknown action' }
}
