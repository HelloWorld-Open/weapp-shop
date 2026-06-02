const config = {
  orderStatus: {
    pending: { text: '待付款', color: '#ff4757' },
    paid: { text: '待发货', color: '#ff6348' },
    shipped: { text: '已发货', color: '#2ed573' },
    delivered: { text: '已收货', color: '#747d8c' },
    cancelled: { text: '已取消', color: '#a4b0be' },
    refunded: { text: '已退款', color: '#636e72' }
  }
}

module.exports = config
