const api = require('../../../utils/api')
const config = require('../../../utils/config')
const PAGE_SIZE = 20

module.exports = {
  data: {
    orders: [], orderPage: 1, orderHasMore: true,
  },
  methods: {
    async loadOrders(reset) {
      if (this.data.ordersLoading) return
      this.setData({ ordersLoading: true })
      if (reset) this.setData({ orderPage: 1, orders: [] })
      try {
        const res = await api.adminGetOrders({ page: this.data.orderPage, pageSize: PAGE_SIZE })
        const list = (res.list || []).map(o => ({
          ...o, statusText: config.orderStatus[o.status]?.text || o.status,
          createTimeText: o.createTime ? (o.createTime.toString().substring(0, 10)) : ''
        }))
        this.setData({
          orders: reset ? list : [...this.data.orders, ...list],
          orderPage: this.data.orderPage + 1,
          orderHasMore: (reset ? list.length : this.data.orders.length + list.length) < res.total,
          ordersLoading: false
        })
      } catch (err) { this.setData({ ordersLoading: false }); console.error('loadOrders', err) }
    },
    onViewOrder(e) { wx.navigateTo({ url: `/pages/order-detail/order-detail?orderNo=${e.currentTarget.dataset.orderno}` }) },
    onShipOrder(e) {
      wx.showModal({
        title: '提示', content: '确定标记为已发货？',
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: '发货中...' })
            api.adminShipOrder(e.currentTarget.dataset.orderno).then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已发货', icon: 'success' })
              this._tabLoaded[3] = true
              this.loadOrders(true)
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '发货失败', icon: 'none' })
            })
          }
        }
      })
    },
    onRefundOrder(e) {
      wx.showModal({
        title: '退款处理', content: '确定退款？将恢复库存。',
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: '退款中...' })
            api.adminRefundOrder(e.currentTarget.dataset.orderno).then(() => {
              wx.hideLoading()
              wx.showToast({ title: '退款成功', icon: 'success' })
              this._tabLoaded[3] = true
              this.loadOrders(true)
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '退款失败', icon: 'none' })
            })
          }
        }
      })
    },
    onDeleteOrder(e) {
      wx.showModal({
        title: '提示', content: '确定删除该订单？',
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: '删除中...' })
            api.adminDeleteOrder(e.currentTarget.dataset.orderno).then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已删除', icon: 'success' })
              this._tabLoaded[3] = true
              this.loadOrders(true)
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
          }
        }
      })
    },
  }
}
