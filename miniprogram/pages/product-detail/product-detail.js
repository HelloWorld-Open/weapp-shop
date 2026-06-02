const api = require('../../utils/api')
const { redirectAdmin, requireUser, cacheClear, formatTime } = require('../../utils/util')
const { BrowseTimer } = require('../../utils/browse-timer')

let apiDataLoaded = false
let reviewPage = 1

Page({
  data: {
    product: null,
    loading: true,
    quantity: 1,
    favorited: false,
    reviewStats: { totalReviews: 0, avgRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    reviewList: [],
    reviewHasMore: false,
    reviewLoading: false,
    browseActive: false,
    browseTotal: 0,
    browseTarget: 0,
    browsePercent: 0,
    browseCompleted: false
  },

  onLoad(options) {
    if (redirectAdmin()) return
    if (options.fromActivityId) {
      this._browseTimer = new BrowseTimer()
      this._browseTimer.onProgress((total, pct, completed) => {
        this.setData({ browseTotal: total, browsePercent: pct, browseCompleted: completed })
      })
      this._browseTimer.start(options.fromActivityId, parseInt(options.browseTarget) || 60)
      this.setData({ browseActive: true, browseTarget: parseInt(options.browseTarget) || 60 })
    } else {
      this.setData({ browseActive: false })
    }
    if (options.id) {
      const ec = this.getOpenerEventChannel()
      if (ec && typeof ec.on === 'function') {
        ec.on('acceptProduct', (product) => {
          if (product && product._id === options.id && !apiDataLoaded) {
            this.setData({ product, loading: false })
          }
        })
      }
      this.loadProduct(options.id)
    }
  },

  async loadProduct(id) {
    this.setData({ loading: true })
    try {
      const res = await api.getProductDetail(id)
      apiDataLoaded = true
      this.setData({ product: res.product, loading: false })
      if (res.product) {
        this.checkFavorite(res.product._id)
        this.loadReviews(res.product._id, true)
      }
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  async loadReviews(productId, reset) {
    if (this.data.reviewLoading) return
    this.setData({ reviewLoading: true })
    try {
      if (reset) reviewPage = 1
      const page = reviewPage
      const [stats, list] = await Promise.all([
        api.reviewGetStats(productId),
        api.reviewGetList(productId, page, 10)
      ])
      if (stats) this.setData({ reviewStats: stats })
      const items = (list && list.list) || []
      const colored = items.map(item => ({
        ...item,
        createTimeText: formatTime(item.createTime),
        avatarText: item.nickName ? item.nickName.charAt(0) : '用',
        avatarColor: item.userId ? `color-${item.userId.charCodeAt(0) % 8}` : 'color-0'
      }))
      const merged = reset ? colored : [...this.data.reviewList, ...colored]
      reviewPage = page + 1
      this.setData({
        reviewList: merged,
        reviewHasMore: colored.length >= 10,
        reviewLoading: false
      })
    } catch (err) {
      this.setData({ reviewLoading: false })
      console.error('loadReviews', err)
    }
  },

  async checkFavorite(productId) {
    try {
      const res = await api.favoriteCheckBatch([productId])
      if (res && res.map) {
        this.setData({ favorited: !!res.map[productId] })
      }
    } catch (err) { console.error('checkFavorite', err) }
  },

  onPreviewImage(e) {
    const urls = e.currentTarget.dataset.url
    wx.previewImage({ urls: [urls] })
  },

  async onFavoriteTap() {
    if (!requireUser()) return
    const { product, favorited } = this.data
    if (!product) return
    try {
      if (favorited) {
        await api.favoriteRemove(product._id)
      } else {
        await api.favoriteAdd(product._id)
      }
      this.setData({ favorited: !favorited })
    } catch (err) {
      console.error('favorite toggle failed', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  async onAddToCart() {
    if (!requireUser()) return
    const { product, quantity } = this.data
    if (!product) return

    try {
      await api.cartAdd({ productId: product._id, quantity })
      wx.showToast({ title: '已加入购物车', icon: 'success' })
      this.setData({ quantity: 1 })
    } catch (err) {
      console.error('加入购物车失败', err)
      wx.showToast({ title: '加入购物车失败', icon: 'none' })
    }
  },

  onBuyNow() {
    if (!requireUser()) return
    const { product, quantity } = this.data
    if (!product) return

    const items = [{
      productId: product._id,
      categoryId: product.categoryId || '',
      name: product.name,
      image: product.images?.[0] || '',
      price: product.price,
      quantity
    }]

    wx.navigateTo({
      url: `/pages/order-confirm/order-confirm?items=${encodeURIComponent(JSON.stringify(items))}`
    })
  },

  onShareAppMessage() {
    const { product } = this.data
    return {
      title: product?.name || '优选商城',
      path: `/pages/product-detail/product-detail?id=${product?._id}`
    }
  },

  onReachBottom() {
    const { product, reviewHasMore, reviewLoading } = this.data
    if (product?._id && reviewHasMore && !reviewLoading) {
      this.loadReviews(product._id)
    }
  },

  onPullDownRefresh() {
    const { product } = this.data
    if (product?._id) {
      cacheClear('product_')
      this.loadProduct(product._id).then(() => wx.stopPullDownRefresh())
    } else {
      wx.stopPullDownRefresh()
    }
  },

  onShow() {
    if (this._browseTimer && this.data.browseActive) this._browseTimer.start()
  },

  onHide() {
    if (this._browseTimer) this._browseTimer.report()
  },

  onUnload() {
    if (this._browseTimer) this._browseTimer.report()
  }
})
