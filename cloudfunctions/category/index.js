const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { action } = event

  if (action === 'getList') {
    const { data } = await db.collection('categories')
      .orderBy('sortOrder', 'asc')
      .field({ _id: true, name: true, icon: true })
      .get()
    return { success: true, data: { list: data } }
  }


  return { success: false, data: null, message: 'unknown action' }
}
