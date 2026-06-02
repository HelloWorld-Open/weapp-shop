const api = require('../../utils/api')
const { requireUser } = require('../../utils/util')
const { initialState, load, loadMore } = require('../../utils/use-pagination')

Page({
  data: {
    ...initialState({ dataKey: 'list' })
  },

  onLoad() {
    if (!requireUser()) return
    this.loadList(true)
  },

  onShow() {
    this.loadList(true)
  },

  async loadList(reset = false) {
    await load(this, (page, pageSize) => api.favoriteGetList(page, pageSize), reset, { dataKey: 'list', pageSize: 20 })
  },

  onReachBottom() {
    loadMore(this, (page, pageSize) => api.favoriteGetList(page, pageSize), { dataKey: 'list', pageSize: 20 })
  },

  onPullDownRefresh() {
    this.loadList(true).then(() => wx.stopPullDownRefresh())
  },

  onProductTap(e) {
    if (e.mark && (e.mark.addcart || e.mark.delfav)) return
    const productId = e.currentTarget.dataset.productid
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    })
  },

  async onRemoveFavorite(e) {
    const { productid } = e.currentTarget.dataset
    wx.showModal({
      title: '提示',
      content: '确定取消收藏？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.favoriteRemove(productid)
            this.loadList(true)
          } catch (err) {
            console.error('remove favorite', err)
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  async onAddToCart(e) {
    if (!requireUser()) return
    const { productid, name, image, price } = e.currentTarget.dataset
    try {
      await api.cartAdd({ productId: productid })
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } catch (err) {
      console.error('add to cart', err)
      wx.showToast({ title: '加入购物车失败', icon: 'none' })
    }
  }
})