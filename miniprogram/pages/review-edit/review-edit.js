const api = require('../../utils/api')
const { requireUser, uploadImage } = require('../../utils/util')

Page({
  data: {
    product: null,
    rating: 5,
    content: '',
    images: [],
    submitting: false,
    canSubmit: true
  },

  onLoad(options) {
    if (!requireUser()) return
    const product = JSON.parse(decodeURIComponent(options.product || '{}'))
    this.setData({ product })
    this.setData({ canSubmit: this.calcCanSubmit(this.data.rating, this.data.content) })
  },

  onRatingTap(e) {
    const rating = parseInt(e.currentTarget.dataset.score)
    this.setData({ rating, canSubmit: this.calcCanSubmit(rating, this.data.content) })
  },

  onContentInput(e) {
    const content = e.detail.value
    this.setData({ content, canSubmit: this.calcCanSubmit(this.data.rating, content) })
  },

  onAddImage() {
    uploadImage('reviews').then(fileID => {
      this.setData({ images: [...this.data.images, fileID] })
    }).catch(() => { wx.showToast({ title: '上传失败', icon: 'none' }) })
  },

  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  calcCanSubmit(rating, content) {
    return !this.data.submitting && rating > 0 && content.trim().length > 0
  },

  async onSubmit() {
    if (!this.data.canSubmit) {
      if (!this.data.content.trim()) {
        wx.showToast({ title: '请填写评价内容', icon: 'none' })
      }
      return
    }
    try {
      this.setData({ submitting: true })
      const { product, rating, content, images } = this.data
      const res = await api.reviewAdd({
        orderNo: product.orderNo,
        productId: product.productId,
        rating,
        content: content.trim(),
        images
      })
      wx.showToast({ title: '评价成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      console.error('submit review failed', err)
      wx.showToast({ title: '提交失败', icon: 'none' })
      this.setData({ submitting: false, canSubmit: this.calcCanSubmit(this.data.rating, this.data.content) })
    }
  }
})
