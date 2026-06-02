const api = require('../../utils/api')
const { getSession, isAdmin, uploadImage } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    orderCounts: {
      pending: 0,
      paid: 0,
      shipped: 0
    },
    session: null,
    isAdmin: false
  },

  onShow() {
    const session = getSession()
    this.setData({ session, isAdmin: isAdmin() })

    if (!session) return

    if (isAdmin()) return

    this.loadUserInfo()
    this.loadOrderCounts()
  },

  async loadUserInfo() {
    try {
      const res = await api.getUserInfo()
      if (res) {
        this.setData({ userInfo: res })
        if (res.avatarUrl) {
          const session = getSession()
          wx.setStorageSync('session', { ...session, avatarUrl: res.avatarUrl })
        }
      }
    } catch (err) { console.error('loadUserInfo', err) }
  },

  async loadOrderCounts() {
    try {
      const res = await api.orderGetCounts()
      this.setData({
        orderCounts: {
          pending: res.pending || 0,
          paid: res.paid || 0,
          shipped: res.shipped || 0
        }
      })
    } catch (err) { console.error('loadOrderCounts', err) }
  },

  onUploadAvatar() {
    uploadImage('avatars').then(fileID => {
      api.updateUserInfo({ avatarUrl: fileID }).then(() => {
        const session = getSession()
        wx.setStorageSync('session', { ...session, avatarUrl: fileID })
        this.setData({ 'userInfo.avatarUrl': fileID, 'session.avatarUrl': fileID })
        wx.showToast({ title: '头像已更新', icon: 'success' })
      })
    }).catch(() => { wx.showToast({ title: '头像上传失败', icon: 'none' }) })
  },

  onNavigate(e) {
    const { url } = e.currentTarget.dataset
    wx.navigateTo({ url })
  },

  onOrderTap(e) {
    const { tab } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/order-list/order-list?tab=${tab}`
    })
  },

  onEditProfile() {
    wx.navigateTo({ url: '/pages/user-edit/user-edit' })
  },

  onEnterAdmin() {
    wx.reLaunch({ url: '/pages/admin/admin' })
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          api.authLogout().catch(() => {})
          wx.removeStorageSync('session')
          this.setData({
            session: null,
            isAdmin: false,
            userInfo: null,
            orderCounts: { pending: 0, paid: 0, shipped: 0 }
          })
          wx.showToast({ title: '已退出', icon: 'success' })
        }
      }
    })
  }
})
