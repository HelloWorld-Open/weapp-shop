const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const productFields = { _id: true, name: true, price: true, images: true, originalPrice: true, sales: true, stock: true }
  const now = new Date()

  try {
    const [banners, categories, hotProducts, newProducts, salesRanking, activities] = await Promise.all([
      db.collection('banners').orderBy('sortOrder', 'asc').field({ imageUrl: true, link: true }).get(),
      db.collection('categories').orderBy('sortOrder', 'asc').field({ _id: true, name: true, icon: true }).get(),
      db.collection('products').where({ status: 'on', isHot: true }).orderBy('sales', 'desc').limit(6).field(productFields).get(),
      db.collection('products').where({ status: 'on', isNew: true }).orderBy('createTime', 'desc').limit(6).field(productFields).get(),
      db.collection('products').where({ status: 'on' }).orderBy('sales', 'desc').limit(6).field(productFields).get(),
      db.collection('activities').where({ status: 'published', endTime: _.gte(now) }).orderBy('startTime', 'desc').field({ _id: true, title: true, image: true, type: true, endTime: true }).limit(6).get()
    ])

    return {
      success: true,
      data: {
        banners: banners.data,
        categories: categories.data,
        hotProducts: hotProducts.data,
        newProducts: newProducts.data,
        salesRanking: salesRanking.data,
        activities: activities.data
      }
    }
  } catch (err) {
    console.error('home', err)
    return { success: false, data: null, message: '获取首页数据失败' }
  }
}
