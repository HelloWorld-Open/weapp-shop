const api = require('../../utils/api')
const { initialState, load, loadMore } = require('../../utils/use-pagination')

function formatCoupons(list) {
  const now = Date.now()
  return (list || []).map(c => {
    let statusText = c.status
    if (c.status === 'available' && new Date(c.validTo).getTime() < now) {
      statusText = '过期'
    }
    return {
      ...c, statusText,
      validFromText: c.validFrom ? String(c.validFrom).substring(0, 10) : '',
      validToText: c.validTo ? String(c.validTo).substring(0, 10) : '',
      conditionText: c.categoryId ? '指定分类使用' : c.minAmount > 0 ? `满¥${c.minAmount}可用` : '无门槛',
      valueText: c.type === 'fixed' ? `¥${c.value}` : `${c.value}折`,
      refunded: !!c.refundedAt
    }
  })
}

function fetchCoupons(pageCtx) {
  return async (page) => {
    const res = await api.getMyCoupons(pageCtx.data.statusTab, page)
    return { list: formatCoupons(res.list), total: res.total }
  }
}

Page({
  data: {
    ...initialState({ dataKey: 'coupons' }),
    statusTab: 'available'
  },

  onLoad() {
    this.loadCoupons(true)
  },

  onShow() {
    if (this.data.coupons.length > 0) this.loadCoupons(true)
  },

  onTabChange(e) {
    const s = e.currentTarget.dataset.status
    this.setData({ statusTab: s, page: 1, coupons: [] }, () => this.loadCoupons(true))
  },

  async loadCoupons(reset) {
    await load(this, fetchCoupons(this), reset, { dataKey: 'coupons' })
  },

  onScrollTolower() {
    loadMore(this, fetchCoupons(this), { dataKey: 'coupons' })
  },

  onGoUse() {
    wx.switchTab({ url: '/pages/category/category' })
  }
})
