const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action } = event

  if (action === 'recordKeyword') {
    try {
      const { keyword } = event
      if (!keyword || !keyword.trim()) return { success: true, data: null }
      const q = keyword.trim().slice(0, 20)
      const { data } = await db.collection('searchKeywords').where({ keyword: q }).get()
      if (data.length > 0) {
        await db.collection('searchKeywords').doc(data[0]._id).update({
          data: { count: _.inc(1), lastSearchTime: db.serverDate() }
        })
      } else {
        await db.collection('searchKeywords').add({
          data: { keyword: q, count: 1, lastSearchTime: db.serverDate(), createTime: db.serverDate() }
        })
      }
    } catch (e) { /* ignore */ }
    return { success: true, data: null }
  }

  if (action === 'getHotKeywords') {
    try {
      const { data } = await db.collection('searchKeywords')
        .orderBy('count', 'desc')
        .limit(10)
        .field({ keyword: true, count: true })
        .get()
      return { success: true, data: { list: data } }
    } catch (e) {
      return { success: true, data: { list: [] } }
    }
  }

  return { success: false, data: null, message: 'unknown action' }
}
