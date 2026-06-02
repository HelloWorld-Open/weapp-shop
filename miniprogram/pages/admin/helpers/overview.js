const api = require('../../../utils/api')

const COLORS = ['#4a90d9', '#ff6348', '#2ed573', '#ffa502', '#a55eea', '#45aaf2', '#fd9644', '#20bf6b', '#fc5c65', '#a29bfe']

module.exports = {
  data: {
    chartTab: 0,
    userTrend: { daily: [], totalUsers: 0 },
    maxUserVal: 1,
    userDays: 7,
    categoryStats: { list: [], total: 0 },
    orderTrend: { daily: [], summary: { totalCreated: 0, totalCompleted: 0, totalRefunded: 0, refundRate: '0.0' } },
    maxOrderVal: 1,
    orderDays: 7,
    favStats: { totalFavorites: 0, totalUsers: 0, topFavorited: [], daily: [] },
    maxFavVal: 1,
    favDays: 7,
    categories: [],
    allCategories: [],
    selectedCategoryText: '全部分类',
  },
  methods: {
    async loadUserTrend() {
      try {
        const res = await api.adminGetUserTrend(this.data.userDays)
        const all = [...res.daily.map(d => d.newUsers), ...res.daily.map(d => d.logins)]
        this.setData({ userTrend: res, maxUserVal: Math.max(...all, 1) })
      } catch (err) { console.error('loadUserTrend', err) }
    },
    async loadCategoryStats() {
      try {
        const res = await api.adminGetCategoryStats()
        const list = res.list.map((item, i) => ({
          ...item,
          color: item.count > 0 ? COLORS[i % COLORS.length] : '#ddd',
          pct: res.total > 0 ? ((item.count / res.total) * 100).toFixed(1) : '0'
        }))
        this.setData({ categoryStats: { ...res, list } })
      } catch (err) { console.error('loadCategoryStats', err) }
    },
    async loadOrderTrend() {
      try {
        const res = await api.adminGetOrderTrend(this.data.orderDays)
        const summary = res.summary
        summary.refundRateColor = parseFloat(summary.refundRate) > 5 ? '#ff4757' : '#2ed573'
        const maxV = Math.max(...res.daily.map(d => d.created), 1)
        this.setData({ orderTrend: { ...res, summary }, maxOrderVal: maxV })
      } catch (err) { console.error('loadOrderTrend', err) }
    },
    async loadFavoriteStats() {
      try {
        const res = await api.adminGetFavoriteStats(this.data.favDays)
        const maxV = Math.max(...res.daily.map(d => d.count), 1)
        this.setData({ favStats: res, maxFavVal: maxV })
      } catch (err) { console.error('loadFavoriteStats', err) }
    },
    onChartTabChange(e) {
      const idx = parseInt(e.currentTarget.dataset.index)
      this.setData({ chartTab: idx })
      if (idx === 0 && this.data.userTrend.daily.length === 0) this.loadUserTrend()
      if (idx === 1 && this.data.categoryStats.list.length === 0) this.loadCategoryStats()
      if (idx === 2 && this.data.orderTrend.daily.length === 0) this.loadOrderTrend()
      if (idx === 3 && this.data.favStats.daily.length === 0) this.loadFavoriteStats()
    },
    onUserDaysChange(e) {
      this.setData({ userDays: parseInt(e.currentTarget.dataset.days) }, () => this.loadUserTrend())
    },
    onOrderDaysChange(e) {
      this.setData({ orderDays: parseInt(e.currentTarget.dataset.days) }, () => this.loadOrderTrend())
    },
    onFavDaysChange(e) {
      this.setData({ favDays: parseInt(e.currentTarget.dataset.days) }, () => this.loadFavoriteStats())
    },
    onCategoryClick(e) {
      const id = e.currentTarget.dataset.categoryId
      const name = e.currentTarget.dataset.categoryName
      if (!id) { wx.showToast({ title: '该分类暂无商品', icon: 'none' }); return }
      this.setData({ tabIndex: 2, productCategoryId: id, selectedCategoryText: name })
      this._tabLoaded[2] = true
      this.loadProducts(true)
    },
  }
}
