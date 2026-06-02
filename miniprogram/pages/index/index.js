const api = require('../../utils/api')
const { redirectAdmin } = require('../../utils/util')

Page({
  data: {
    banners: [],
    categories: [],
    hotProducts: [],
    newProducts: [],
    salesRanking: [],
    activities: [],
    loading: true
  },

  onShow() {
    if (redirectAdmin()) return
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const res = await api.getHomePage()
      this.setData({
        banners: res.banners || [],
        categories: (res.categories || []).slice(0, 8),
        hotProducts: res.hotProducts || [],
        newProducts: res.newProducts || [],
        salesRanking: res.salesRanking || [],
        activities: (res.activities || []).map(a => {
          const end = new Date(a.endTime).getTime()
          const s = Math.max(0, Math.floor((end - Date.now()) / 1000))
          const d = Math.floor(s / 86400)
          return { ...a, countdown: s > 0 ? (d > 0 ? '剩' + d + '天' : Math.floor(s / 3600) + '时') : '已结束' }
        }),
        loading: false
      })
    } catch (err) {
      try {
        const res = await api.getHomePageDirect()
        this.setData({
          banners: res.banners || [],
          categories: (res.categories || []).slice(0, 8),
          hotProducts: res.hotProducts || [],
          newProducts: res.newProducts || [],
          salesRanking: res.salesRanking || [],
          activities: (res.activities || []).map(a => {
            const end = new Date(a.endTime).getTime()
            const s = Math.max(0, Math.floor((end - Date.now()) / 1000))
            const d = Math.floor(s / 86400)
            return { ...a, countdown: s > 0 ? (d > 0 ? '剩' + d + '天' : Math.floor(s / 3600) + '时') : '已结束' }
          }),
          loading: false
        })
      } catch (err2) {
        this.setData({ loading: false })
      }
    }
  },

  onCategoryTap(e) {
    const { id, name } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/product-list/product-list?categoryId=${id}&title=${name}`
    })
  },

  onBannerTap(e) {
    const link = e.currentTarget.dataset.link
    if (link) wx.navigateTo({ url: link })
  },

  onSearchTap() {
    wx.navigateTo({
      url: '/pages/product-list/product-list'
    })
  },

  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${id}`
    })
  },

  onActivityTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${id}`
    })
  }
})
