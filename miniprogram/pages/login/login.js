const api = require('../../utils/api')
const { isAdmin, isUser } = require('../../utils/util')

Page({
  data: {
    tabIndex: 0,
    phone: '',
    adminUsername: '',
    adminPassword: '',
    submitting: false
  },

  onLoad() {
    if (isAdmin()) {
      return wx.reLaunch({ url: '/pages/admin/admin' })
    }
    if (isUser()) {
      return wx.switchTab({ url: '/pages/index/index' })
    }
  },

  onTabChange(e) {
    this.setData({ tabIndex: parseInt(e.currentTarget.dataset.index) })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onAdminUsernameInput(e) {
    this.setData({ adminUsername: e.detail.value })
  },

  onAdminPasswordInput(e) {
    this.setData({ adminPassword: e.detail.value })
  },

  async onUserLogin() {
    const { phone } = this.data
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入11位手机号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const res = await api.phoneLogin(phone)
      wx.setStorageSync('session', {
        phone: res.user.phone,
        role: res.user.role,
        nickName: res.user.nickName,
        userId: res.user._id,
        sessionToken: res.user.sessionToken
      })
      wx.showToast({ title: res.user.isNew ? '注册成功' : '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1000)
    } catch (err) {
      wx.showToast({ title: '登录失败', icon: 'none' })
    }
    this.setData({ submitting: false })
  },

  async onAdminLogin() {
    const { adminUsername, adminPassword } = this.data
    if (!adminUsername || !adminPassword) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const res = await api.adminLogin(adminUsername, adminPassword)
      wx.setStorageSync('session', {
        username: adminUsername,
        role: res.user.role,
        nickName: res.user.nickName,
        userId: res.user._id,
        sessionToken: res.user.sessionToken
      })
      wx.showToast({ title: '管理员登录成功', icon: 'success' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/admin/admin' })
      }, 1000)
    } catch (err) {
      wx.showToast({ title: '登录失败', icon: 'none' })
    }
    this.setData({ submitting: false })
  }
})
