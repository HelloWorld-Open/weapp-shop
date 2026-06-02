const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const { ADMIN_USERNAME, ADMIN_PASSWORD } = require('./config')
const { generateToken } = require('./auth-utils')
const ROLE = { USER: 'user', ADMIN: 'admin' }

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  if (action === 'phoneLogin') {
    const { phone } = event
    if (!/^1\d{10}$/.test(phone)) {
      return { success: false, data: null, message: '请输入11位手机号' }
    }

    const { data: byOpenId } = await db.collection('users').where({ openId: OPENID }).get()
    if (byOpenId.length > 0 && !byOpenId[0].phone) {
      if (byOpenId[0].banned) {
        return { success: false, data: null, message: '该账号已被禁用' }
      }
      const token = generateToken()
      const updateFields = { phone, role: ROLE.USER, tokens: _.push([token]) }
      if (!byOpenId[0].nickName) updateFields.nickName = '用户' + phone.slice(-4)
      await db.collection('users').doc(byOpenId[0]._id).update({ data: updateFields })
      byOpenId[0].phone = phone
      if (!byOpenId[0].nickName) byOpenId[0].nickName = '用户' + phone.slice(-4)
      byOpenId[0].role = ROLE.USER
      byOpenId[0].sessionToken = token
      return {
        success: true,
        data: { user: { ...byOpenId[0], isNew: false } }
      }
    }

    const { data: existing } = await db.collection('users').where({ phone }).get()
    if (existing.length > 0) {
      if (existing[0].banned) {
        return { success: false, data: null, message: '该账号已被禁用' }
      }
      const token = generateToken()
      const updateData = { tokens: _.push([token]) }
      if (!existing[0].openId) updateData.openId = OPENID
      await db.collection('users').doc(existing[0]._id).update({ data: updateData })
      if (!existing[0].openId) existing[0].openId = OPENID
      existing[0].sessionToken = token
      return {
        success: true,
        data: { user: { ...existing[0], isNew: false } }
      }
    }

    const token = generateToken()
    const res = await db.collection('users').add({
      data: {
        openId: OPENID,
        phone,
        nickName: '用户' + phone.slice(-4),
        avatarUrl: '',
        role: ROLE.USER,
        tokens: [token],
        createTime: db.serverDate()
      }
    })

    const { data: newUser } = await db.collection('users').doc(res._id).get()
    return {
      success: true,
      data: { user: { ...newUser, isNew: true, sessionToken: token } }
    }
  }

  if (action === 'adminLogin') {
    const { username, password } = event
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return { success: false, data: null, message: '管理员账号或密码错误' }
    }

    let { data: admin } = await db.collection('users').where({ role: ROLE.ADMIN }).get()
    const token = generateToken()
    if (admin.length === 0) {
      const res = await db.collection('users').add({
        data: {
          openId: OPENID,
          phone: '',
          nickName: '管理员',
          avatarUrl: '',
          role: ROLE.ADMIN,
          username: ADMIN_USERNAME,
          tokens: [token],
          createTime: db.serverDate()
        }
      })
      const { data: newAdmin } = await db.collection('users').doc(res._id).get()
      admin = [{ ...newAdmin, sessionToken: token }]
    } else {
      await db.collection('users').doc(admin[0]._id).update({
        data: { openId: OPENID, tokens: _.push([token]) }
      })
      admin[0].openId = OPENID
      admin[0].sessionToken = token
    }

    return { success: true, data: { user: admin[0] } }
  }

  if (action === 'logout') {
    const { data: user } = await db.collection('users').doc(event._uid).get()
    if (user && user.tokens) {
      await db.collection('users').doc(event._uid).update({
        data: { tokens: _.pull(event._token) }
      })
    }
    return { success: true, data: null }
  }

  return { success: false, data: null, message: 'unknown action' }
}
