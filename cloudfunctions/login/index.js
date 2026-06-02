const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const users = db.collection('users')

  const { data: existing } = await users.where({ openId: OPENID }).get()
  if (existing.length === 0) {
    await users.add({
      data: {
        openId: OPENID,
        nickName: '微信用户',
        avatarUrl: '',
        phone: '',
        gender: 0,
        createTime: db.serverDate()
      }
    })
  }

  try {
    await db.collection('loginLogs').add({
      data: { openId: OPENID, loginTime: db.serverDate() }
    })
  } catch (e) { console.error('loginLogs add', e) }

  return { success: true, data: { openId: OPENID } }
}
