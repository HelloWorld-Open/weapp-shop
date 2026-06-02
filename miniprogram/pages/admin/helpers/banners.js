const api = require('../../../utils/api')
const { uploadImage } = require('../../../utils/util')

module.exports = {
  data: {
    banners: [], bannersLoading: false,
    showModal: false, editId: '', editUrl: '', editLink: '',
  },
  methods: {
    async loadBanners() {
      this.setData({ bannersLoading: true })
      try {
        const res = await api.adminGetBanners()
        this.setData({ banners: res.list, bannersLoading: false })
      } catch (err) { this.setData({ bannersLoading: false }); console.error('loadBanners', err) }
    },
    onAddBanner() {
      this.setData({ showModal: true, editId: '', editUrl: '', editLink: '' })
    },
    onEditBtn(e) {
      const item = this.data.banners.find(b => b._id === e.currentTarget.dataset.id)
      if (item) this.setData({
        showModal: true, editId: item._id, editUrl: item.imageUrl, editLink: item.link || ''
      })
    },
    onDelBtn(e) {
      wx.showModal({
        title: '提示', content: '确定删除该轮播图？',
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: '删除中...' })
            api.adminDeleteBanner(e.currentTarget.dataset.id).then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadBanners()
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
          }
        }
      })
    },
    onMoveUp(e) {
      const i = parseInt(e.currentTarget.dataset.index)
      if (i < 1) return
      const list = [...this.data.banners]
      const t = list[i - 1]; list[i - 1] = list[i]; list[i] = t
      this.setData({ banners: list })
      api.adminReorderBanners(list.map(b => b._id)).catch(() => { console.warn('banner reorder failed') })
    },
    onMoveDown(e) {
      const i = parseInt(e.currentTarget.dataset.index)
      const list = [...this.data.banners]
      if (i >= list.length - 1) return
      const t = list[i + 1]; list[i + 1] = list[i]; list[i] = t
      this.setData({ banners: list })
      api.adminReorderBanners(list.map(b => b._id)).catch(() => { console.warn('banner reorder failed') })
    },
    onCloseModal() { this.setData({ showModal: false }) },
    onUrlInput(e) { this.setData({ editUrl: e.detail.value }) },
    onLinkInput(e) { this.setData({ editLink: e.detail.value }) },
    onPreviewImg() {
      if (this.data.editUrl) wx.previewImage({ urls: [this.data.editUrl] })
    },
    onUploadImg() {
      uploadImage('banners').then(fileID => this.setData({ editUrl: fileID })).catch(() => { wx.showToast({ title: '上传失败', icon: 'none' }) })
    },
    async onSave() {
      if (!this.data.editUrl) return wx.showToast({ title: '请选择或输入图片', icon: 'none' })
      wx.showLoading({ title: '保存中...' })
      try {
        if (this.data.editId) {
          await api.adminUpdateBanner({ bannerId: this.data.editId, imageUrl: this.data.editUrl, link: this.data.editLink })
        } else {
          await api.adminAddBanner({ imageUrl: this.data.editUrl, link: this.data.editLink, sortOrder: this.data.banners.length })
        }
        wx.hideLoading(); this.setData({ showModal: false }); this.loadBanners()
      } catch (err) { wx.hideLoading(); console.error('onSave', err) }
    },
  }
}
