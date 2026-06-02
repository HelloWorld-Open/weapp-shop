const api = require('../../utils/api')
const { redirectAdmin } = require('../../utils/util')

Page({
  data: {
    categories: [],
    currentIndex: 0,
    products: [],
    loading: true
  },

  onShow() {
    if (redirectAdmin()) return
    if (this.data.categories.length === 0) {
      this.loadCategories()
    }
  },

  async loadCategories() {
    try {
      const res = await api.getCategoryList()
      const cats = res.list
      this.setData({ categories: cats })
      if (cats.length > 0) {
        this.loadProducts(cats[0]._id)
      }
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  async loadProducts(categoryId) {
    try {
      const res = await api.getProductList({ categoryId, pageSize: 50 })
      this.setData({ products: res.list, loading: false })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  onCategoryChange(e) {
    const index = e.currentTarget.dataset.index
    const category = this.data.categories[index]
    this.setData({ currentIndex: index })
    this.loadProducts(category._id)
  },

  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    const product = this.data.products.find(p => p._id === id)
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${id}`,
      success: (res) => {
        if (product) res.eventChannel.emit('acceptProduct', product)
      }
    })
  }
})
