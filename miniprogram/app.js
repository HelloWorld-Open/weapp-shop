wx.cloud.init({
  env: 'your-env-id',
  traceUser: true
})

App({
  onLaunch() {
    setTimeout(() => this.warmUpCloudFunctions(), 2000)
  },

  onShow() {
    if (this._inited) return
    this._inited = true
    this.getOpenId()
  },

  warmUpCloudFunctions() {
    [
      'login', 'auth', 'user', 'product', 'category',
      'cart', 'order', 'address', 'admin', 'admin-stats', 'home',
      'activity', 'coupon', 'favorite', 'review', 'search'
    ].forEach(name => {
      wx.cloud.callFunction({ name, data: {} }).catch(() => {})
    })
  },

  getOpenId() {
    const openId = wx.getStorageSync('openId')
    if (openId) return
    wx.cloud.callFunction({
      name: 'login',
      success: (res) => {
        const r = res.result
        if (r && r.success === true) {
          wx.setStorageSync('openId', r.data.openId)
        } else {
          wx.showToast({ title: '登录失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  }
})
