const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event

  if (action === 'getList') {
    const { categoryId, page = 1, pageSize = 10, sort = 'default', keyword } = event
    let query = { status: 'on' }
    if (categoryId) query.categoryId = categoryId
    if (keyword && keyword.trim()) {
      const q = keyword.trim()
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.name = db.RegExp({ regexp: escaped, options: 'i' })
    }

    let orderBy = {}
    if (sort === 'price_asc') orderBy = { price: 'asc' }
    else if (sort === 'price_desc') orderBy = { price: 'desc' }
    else if (sort === 'sales') orderBy = { sales: 'desc' }
    else orderBy = { createTime: 'desc' }

    const sortKey = Object.keys(orderBy)[0]
    const sortDir = orderBy[sortKey]

    const countResult = await db.collection('products').where(query).count()
    const { data } = await db.collection('products')
      .where(query)
      .orderBy(sortKey, sortDir)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({ _id: true, name: true, price: true, images: true, originalPrice: true, sales: true, stock: true })
      .get()

    return { success: true, data: { list: data, total: countResult.total } }
  }

  if (action === 'getDetail') {
    const { productId } = event
    const { data } = await db.collection('products').doc(productId).field({
      _id: true, name: true, price: true, originalPrice: true, images: true,
      description: true, sales: true, stock: true, status: true,
      reviewCount: true, reviewTotalRating: true
    }).get()
    if (!data || data.status !== 'on') {
      return { success: true, data: { product: null } }
    }

    const reviewCount = data.reviewCount || 0
    const avgRating = data.reviewTotalRating && reviewCount > 0
      ? Math.round((data.reviewTotalRating / reviewCount) * 10) / 10
      : 0

    return { success: true, data: { product: { ...data, reviewCount, avgRating } } }
  }

  if (action === 'suggest') {
    const { keyword } = event
    if (!keyword || !keyword.trim()) return { success: true, data: { list: [] } }
    const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const { data } = await db.collection('products')
      .where({ status: 'on', name: db.RegExp({ regexp: escaped, options: 'i' }) })
      .limit(5)
      .field({ _id: true, name: true, images: true })
      .get()
    return { success: true, data: { list: data } }
  }

  return { success: false, data: null, message: 'unknown action' }
}
