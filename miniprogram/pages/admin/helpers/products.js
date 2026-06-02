const api = require('../../../utils/api')
const PAGE_SIZE = 20

module.exports = {
  data: {
    products: [], productPage: 1, productHasMore: true, productKeyword: '',
    productCategoryId: '', productCategoryIndex: -1, pickerCategoryIndex: 0, productStatus: '',
  },
  methods: {
    async loadProducts(reset) {
      if (this.data.productsLoading) return
      this.setData({ productsLoading: true })
      if (reset) this.setData({ productPage: 1, products: [] })
      try {
        const res = await api.adminGetProducts({
          page: this.data.productPage, pageSize: PAGE_SIZE,
          keyword: this.data.productKeyword,
          categoryId: this.data.productCategoryId,
          productStatus: this.data.productStatus
        })
        this.setData({
          products: reset ? res.list : [...this.data.products, ...res.list],
          productPage: this.data.productPage + 1,
          productHasMore: (reset ? res.list.length : this.data.products.length + res.list.length) < res.total,
          productsLoading: false
        })
      } catch (err) { this.setData({ productsLoading: false }); console.error('loadProducts', err) }
    },
    onChangeProductKeyword(e) {
      this.setData({ productKeyword: e.detail.value })
      this._productSearchDebounce()
    },
    onSearchProduct() { this.loadProducts(true) },
    onProductCategoryFilter(e) {
      const idx = parseInt(e.detail.value)
      const allCats = this.data.allCategories
      if (idx >= 0 && idx < allCats.length) {
        this.setData({ productCategoryId: allCats[idx]._id, productCategoryIndex: idx - 1, pickerCategoryIndex: idx, selectedCategoryText: allCats[idx].name },
          () => this.loadProducts(true))
      }
    },
    onProductStatusFilter(e) { this.setData({ productStatus: e.currentTarget.dataset.value }, () => this.loadProducts(true)) },
    onAddProduct() {
      wx.navigateTo({
        url: '/pages/admin/product-edit/product-edit',
        events: {
          acceptData: (res) => {
            if (res && res._id) this.setData({ products: [res, ...this.data.products] })
            else this.loadProducts(true)
          }
        }
      })
    },
    onEditProduct(e) {
      wx.navigateTo({
        url: `/pages/admin/product-edit/product-edit?product=${encodeURIComponent(JSON.stringify(e.currentTarget.dataset.product))}`,
        events: {
          acceptData: (res) => {
            if (res && res._id) {
              const idx = this.data.products.findIndex(p => p._id === res._id)
              if (idx >= 0) {
                const existing = this.data.products[idx]
                this.setData({ [`products[${idx}]`]: { ...existing, ...res } })
              }
            }
          }
        }
      })
    },
    onDeleteProduct(e) {
      wx.showModal({
        title: '提示', content: '确定删除该商品？',
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: '删除中...' })
            api.adminDeleteProduct(e.currentTarget.dataset.id).then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已删除', icon: 'success' })
              this._tabLoaded[2] = true
              this.loadProducts(true)
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
          }
        }
      })
    },
    onToggleStatus(e) {
      const p = e.currentTarget.dataset.product
      const ns = p.status === 'on' ? 'off' : 'on'
      wx.showModal({
        title: '提示', content: `确定${ns === 'on' ? '上架' : '下架'}？`,
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: ns === 'on' ? '上架中...' : '下架中...' })
            api.adminUpdateProduct({ productId: p._id, status: ns }).then(() => {
              wx.hideLoading()
              wx.showToast({ title: ns === 'on' ? '已上架' : '已下架', icon: 'success' })
              this._tabLoaded[2] = true
              this.loadProducts(true)
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '操作失败', icon: 'none' })
            })
          }
        }
      })
    },
  }
}
