const api = require('../../utils/api')
const { formatTime, redirectAdmin, requireUser } = require('../../utils/util')
const config = require('../../utils/config')
const { initialState, load, loadMore } = require('../../utils/use-pagination')

function fetchOrders(pageCtx) {
  return async (page, pageSize) => {
    const res = await api.orderGetList({
      status: pageCtx.data.currentTab,
      page,
      pageSize
    })
    const list = (res.list || []).map(item => ({
      ...item,
      statusText: config.orderStatus[item.status]?.text || item.status,
      createTimeText: item.createTime ? formatTime(item.createTime) : ''
    }))
    return { ...res, list }
  }
}

Page({
  data: {
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待付款' },
      { key: 'paid', label: '待发货' },
      { key: 'shipped', label: '待收货' },
      { key: 'delivered', label: '已完成' }
    ],
    currentTab: 'all',
    ...initialState({ dataKey: 'orders' }),
    orderStatusMap: config.orderStatus
  },

  onLoad(options) {
    if (redirectAdmin()) return
    if (!requireUser()) return
    if (options.tab) {
      this.setData({ currentTab: options.tab })
    }
    this.loadOrders(true)
  },

  onReachBottom() {
    loadMore(this, fetchOrders(this), { dataKey: 'orders', pageSize: 10 })
  },

  async loadOrders(reset = false) {
    await load(this, fetchOrders(this), reset, { dataKey: 'orders', pageSize: 10 })
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.key
    this.setData({ currentTab: tab }, () => {
      this.loadOrders(true)
    })
  },

  onOrderTap(e) {
    const orderNo = e.currentTarget.dataset.orderno
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?orderNo=${orderNo}`
    })
  },

  onPullDownRefresh() {
    this.loadOrders(true)
    wx.stopPullDownRefresh()
  }
})
