const api = require('../../utils/api')
const { formatTime, isAdmin } = require('../../utils/util')
const config = require('../../utils/config')

Page({
  data: {
    order: null,
    loading: true,
    statusMap: config.orderStatus,
    shouldPay: false,
    paying: false,
    isAdminView: false
  },

  onLoad(options) {
    const admin = isAdmin()
    this.setData({ isAdminView: admin })
    if (options.orderNo) {
      this.setData({ shouldPay: options.pay === 'true' })
      this.loadOrder(options.orderNo, admin)
    }
  },

  onShow() {
    const { order, isAdminView } = this.data
    if (order && !isAdminView) {
      this.loadOrder(order.orderNo)
    }
  },

  onReview() {
    const { order } = this.data
    if (!order || order.status !== 'delivered') return
    const reviewed = order.reviewedItems || []
    const unreviewed = (order.items || []).find(i => !reviewed.includes(i.productId))
    if (!unreviewed) {
      wx.showToast({ title: '已全部评价', icon: 'none' })
      return
    }
    const product = {
      productId: unreviewed.productId,
      name: unreviewed.name,
      image: unreviewed.image || '',
      orderNo: order.orderNo
    }
    wx.navigateTo({
      url: `/pages/review-edit/review-edit?product=${encodeURIComponent(JSON.stringify(product))}`
    })
  },

  async loadOrder(orderNo, adminView) {
    this.setData({ loading: true })
    try {
      const res = adminView
        ? await api.adminGetOrderDetail(orderNo)
        : await api.orderGetDetail(orderNo)
      if (res.order) {
        res.order.createTimeText = formatTime(res.order.createTime)
        res.order.payTimeText = res.order.payTime ? formatTime(res.order.payTime) : ''
      }
      const reviewed = res.order?.reviewedItems || []
      const reviewAvailable = res.order?.status === 'delivered' && (res.order.items || []).some(i => !reviewed.includes(i.productId))
      this.setData({ order: res.order, reviewAvailable, loading: false })

      if (this.data.shouldPay && res.order?.status === 'pending' && !adminView) {
        this.setData({ shouldPay: false })
        this.onPay()
      }
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  async onPay() {
    if (this.data.paying) return
    const { order } = this.data
    if (!order) return

    this.setData({ paying: true })
    wx.showModal({
      title: '模拟支付',
      content: `确认支付 ¥${(order.finalPrice || order.totalPrice).toFixed(2)}？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '支付中...' })
          try {
            const payRes = await api.orderPay(order.orderNo)
            wx.hideLoading()
            wx.showToast({ title: '支付成功', icon: 'success' })
            this.setData({
              'order.status': 'paid',
              'order.payTimeText': formatTime(new Date()),
              paying: false
            })
          } catch (err) {
            wx.hideLoading()
            this.setData({ paying: false })
          }
        } else {
          this.setData({ paying: false })
        }
      },
      fail: () => { this.setData({ paying: false }) }
    })
  },

  async onCancel() {
    const { order } = this.data
    if (!order) return

    wx.showModal({
      title: '提示',
      content: '确定取消订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const cancelRes = await api.orderCancel(order.orderNo)
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadOrder(order.orderNo)
          } catch (err) {
            wx.showToast({ title: '取消失败', icon: 'none' })
          }
        }
      }
    })
  },

  async onConfirmReceive() {
    const { order } = this.data
    if (!order) return

    wx.showModal({
      title: '提示',
      content: '确认收到商品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const confirmRes = await api.orderConfirmReceive(order.orderNo)
            wx.showToast({ title: '已确认收货', icon: 'success' })
            this.loadOrder(order.orderNo)
          } catch (err) {
            wx.showToast({ title: '确认失败', icon: 'none' })
          }
        }
      }
    })
  },

  async onRefund() {
    const { order } = this.data
    if (!order) return

    wx.showModal({
      title: '申请退款',
      content: `确定对订单 ${order.orderNo} 申请退款吗？退款金额 ¥${(order.finalPrice || order.totalPrice).toFixed(2)} 将按原路返回。`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          try {
            const refundRes = await api.orderRefund(order.orderNo)
            wx.hideLoading()
            wx.showToast({ title: '退款成功', icon: 'success' })
            this.loadOrder(order.orderNo)
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '退款失败', icon: 'none' })
          }
        }
      }
    })
  }
})
