const api = require('../../../utils/api')
const { redirectNonAdmin, uploadImage } = require('../../../utils/util')

Page({
  onLoad(options) {
    if (redirectNonAdmin()) return
    this._init(options)
  },

  data: {
    isEdit: false,
    productId: '',
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    stock: '',
    categoryId: '',
    categoryIndex: -1,
    image: '',
    isHot: false,
    isNew: false,
    categories: [],
    saving: false
  },

  _dirty: false,

  _init(options) {
    if (options.product) {
      const p = JSON.parse(decodeURIComponent(options.product))
      this.setData({
        isEdit: true,
        productId: p._id,
        name: p.name,
        description: p.description || '',
        price: String(p.price),
        originalPrice: p.originalPrice ? String(p.originalPrice) : '',
        stock: String(p.stock),
        categoryId: p.categoryId,
        image: p.images?.[0] || '',
        isHot: !!p.isHot,
        isNew: !!p.isNew
      })
      wx.setNavigationBarTitle({ title: '编辑商品' })
    }
    this.loadCategories()
  },


  async loadCategories() {
    try {
      const res = await api.adminGetCategories()
      const idx = res.list.findIndex(c => c._id === this.data.categoryId)
      this.setData({
        categories: res.list,
        categoryIndex: idx >= 0 ? idx : -1
      })
    } catch (err) { console.error('loadCategories', err) }
  },

  _markDirty() { this._dirty = true },

  onNameInput(e) { this.setData({ name: e.detail.value }); this._markDirty() },
  onDescInput(e) { this.setData({ description: e.detail.value }); this._markDirty() },
  onPriceInput(e) { this.setData({ price: e.detail.value }); this._markDirty() },
  onOriginalPriceInput(e) { this.setData({ originalPrice: e.detail.value }); this._markDirty() },
  onStockInput(e) { this.setData({ stock: e.detail.value }); this._markDirty() },
  onImageInput(e) {
    this.setData({ image: e.detail.value }); this._markDirty()
  },

  onChooseImage() {
    uploadImage('products').then(fileID => { this.setData({ image: fileID }); this._markDirty() }).catch(() => { wx.showToast({ title: '上传失败', icon: 'none' }) })
  },

  onImageError() {
    if (this.data.image) {
      wx.showToast({ title: '图片加载失败，请检查URL', icon: 'none' })
    }
  },

  onPreviewImage() {
    const url = this.data.image
    if (!url) return wx.showToast({ title: '请先选择或输入图片', icon: 'none' })
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('cloud://')) {
      return wx.showToast({ title: '图片地址格式不正确', icon: 'none' })
    }
    wx.previewImage({ urls: [url] })
  },
  onCategoryChange(e) {
    const idx = e.detail.value
    const cat = this.data.categories[idx]
    if (cat) { this.setData({ categoryId: cat._id, categoryIndex: idx }); this._markDirty() }
  },
  onHotChange(e) { this.setData({ isHot: e.detail.value }); this._markDirty() },
  onNewChange(e) { this.setData({ isNew: e.detail.value }); this._markDirty() },

  async onSave() {
    const { name, price, stock, categoryId } = this.data
    if (!name || !price || !stock || !categoryId) {
      wx.showToast({ title: '请填写必填项', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    try {
      const data = {
        name: this.data.name,
        description: this.data.description,
        price: Number(this.data.price),
        originalPrice: this.data.originalPrice ? Number(this.data.originalPrice) : undefined,
        stock: Number(this.data.stock),
        categoryId: this.data.categoryId,
        images: this.data.image ? [this.data.image] : [],
        isHot: this.data.isHot,
        isNew: this.data.isNew
      }

      this._dirty = false
      if (this.data.isEdit) {
        await api.adminUpdateProduct({ productId: this.data.productId, ...data })
        wx.showToast({ title: '更新成功', icon: 'success' })
        const eventChannel = this.getOpenerEventChannel()
        if (eventChannel) eventChannel.emit('acceptData', { _id: this.data.productId, ...data })
      } else {
        const res = await api.adminAddProduct(data)
        wx.showToast({ title: '添加成功', icon: 'success' })
        const eventChannel = this.getOpenerEventChannel()
        if (eventChannel) eventChannel.emit('acceptData', { _id: res.productId, ...data })
      }
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (err) { this.setData({ saving: false }); console.error('onSave', err) }
  }
})
