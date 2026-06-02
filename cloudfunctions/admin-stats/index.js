const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

const ROLE = { USER: 'user', ADMIN: 'admin' }

exports.main = async (event, context) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()

  const { data: adminUser } = await db.collection('users').where({ openId: OPENID, role: ROLE.ADMIN }).get()
  if (adminUser.length === 0) {
    return { success: false, data: null, message: '无权限' }
  }

  if (action === 'getUserTrend') {
    const days = event.days || 7
    const now = new Date()
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const dailyMap = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      dailyMap[key] = { newUsers: 0, logins: 0 }
    }

    const [userAgg] = await Promise.all([
      db.collection('users').aggregate()
        .match({ role: ROLE.USER, createTime: _.gte(start) })
        .group({
          _id: { year: $.year('$createTime'), month: $.month('$createTime'), day: $.dayOfMonth('$createTime') },
          count: $.sum(1)
        })
        .end()
    ])

    for (const item of userAgg.list) {
      const key = `${item._id.year}-${String(item._id.month).padStart(2,'0')}-${String(item._id.day).padStart(2,'0')}`
      if (dailyMap[key]) dailyMap[key].newUsers = item.count
    }

    try {
      const loginAgg = await db.collection('loginLogs').aggregate()
        .match({ loginTime: _.gte(start) })
        .group({
          _id: { year: $.year('$loginTime'), month: $.month('$loginTime'), day: $.dayOfMonth('$loginTime') },
          count: $.sum(1)
        })
        .end()
      for (const item of loginAgg.list) {
        const key = `${item._id.year}-${String(item._id.month).padStart(2,'0')}-${String(item._id.day).padStart(2,'0')}`
        if (dailyMap[key]) dailyMap[key].logins = item.count
      }
    } catch (e) { console.error('getUserTrend loginLogs', e) }

    const daily = Object.keys(dailyMap).sort().map(date => ({ date, ...dailyMap[date] })).filter(d => d.newUsers > 0 || d.logins > 0)
    const { total } = await db.collection('users').where({ role: ROLE.USER }).count()
    return { success: true, data: { daily, totalUsers: total } }
  }

  if (action === 'getCategoryStats') {
    const { data: categories } = await db.collection('categories').orderBy('sortOrder', 'asc').get()

    const result = await db.collection('products').aggregate()
      .group({ _id: '$categoryId', count: $.sum(1) })
      .end()

    const counts = {}
    for (const item of result.list) {
      counts[item._id] = item.count
    }

    let list = categories.map(c => ({
      _id: c._id,
      name: c.name,
      count: counts[c._id] || 0
    }))

    list.sort((a, b) => b.count - a.count)

    const total = list.reduce((s, c) => s + c.count, 0)
    return { success: true, data: { list, total } }
  }

  if (action === 'getOrderTrend') {
    const days = event.days || 7
    const now = new Date()
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const result = await db.collection('orders').aggregate()
      .match({ createTime: _.gte(start) })
      .group({
        _id: { year: $.year('$createTime'), month: $.month('$createTime'), day: $.dayOfMonth('$createTime'), status: '$status' },
        count: $.sum(1)
      })
      .end()

    const dailyMap = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      dailyMap[key] = { created: 0, completed: 0, refunded: 0 }
    }

    for (const item of result.list) {
      const key = `${item._id.year}-${String(item._id.month).padStart(2,'0')}-${String(item._id.day).padStart(2,'0')}`
      if (dailyMap[key]) {
        dailyMap[key].created += item.count
        if (item._id.status === 'delivered') dailyMap[key].completed += item.count
        if (item._id.status === 'refunded') dailyMap[key].refunded += item.count
      }
    }

    const daily = Object.keys(dailyMap).sort().map(date => ({
      date, ...dailyMap[date]
    })).filter(d => d.created > 0 || d.completed > 0 || d.refunded > 0)

    const [totalResult, deliveredResult, refundedResult] = await Promise.all([
      db.collection('orders').count(),
      db.collection('orders').where({ status: 'delivered' }).count(),
      db.collection('orders').where({ status: 'refunded' }).count()
    ])
    const totalCreated = totalResult.total
    const totalCompleted = deliveredResult.total
    const totalRefunded = refundedResult.total
    const refundRate = totalCreated > 0 ? ((totalRefunded / totalCreated) * 100).toFixed(1) : '0.0'

    return {
      success: true,
      data: {
        daily,
        summary: { totalCreated, totalCompleted, totalRefunded, refundRate }
      }
    }
  }

  if (action === 'getFavoriteStats') {
    const days = event.days || 7
    const now = new Date()
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const dailyMap = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      dailyMap[key] = 0
    }

    const [dailyAgg, totalFavs, usersAgg, topAgg] = await Promise.all([
      db.collection('favorites').aggregate()
        .match({ createTime: _.gte(start) })
        .group({
          _id: { year: $.year('$createTime'), month: $.month('$createTime'), day: $.dayOfMonth('$createTime') },
          count: $.sum(1)
        })
        .end(),
      db.collection('favorites').count(),
      db.collection('favorites').aggregate()
        .group({ _id: '$userId' })
        .end(),
      db.collection('favorites').aggregate()
        .group({ _id: '$productId', count: $.sum(1) })
        .sort({ count: -1 })
        .limit(10)
        .end()
    ])

    for (const item of dailyAgg.list) {
      const key = `${item._id.year}-${String(item._id.month).padStart(2,'0')}-${String(item._id.day).padStart(2,'0')}`
      if (dailyMap[key] !== undefined) dailyMap[key] = item.count
    }

    const productIds = topAgg.list.map(s => s._id)
    let products = []
    if (productIds.length > 0) {
      const result = await db.collection('products')
        .where({ _id: _.in(productIds) })
        .field({ _id: true, name: true, images: true })
        .get()
      products = result.data
    }
    const productMap = {}
    products.forEach(p => { productMap[p._id] = { name: p.name, image: (p.images || [])[0] || '' } })

    const topFavorited = topAgg.list.map(item => ({
      productId: item._id,
      count: item.count,
      ...(productMap[item._id] || { name: '已删除的商品', image: '' })
    }))

    const daily = Object.keys(dailyMap).sort().map(date => ({ date, count: dailyMap[date] })).filter(d => d.count > 0)

    return {
      success: true,
      data: {
        totalFavorites: totalFavs.total,
        totalUsers: usersAgg.list.length,
        topFavorited,
        daily
      }
    }
  }

  return { success: false, data: null, message: 'unknown action' }
}
