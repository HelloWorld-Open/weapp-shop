const api = require('../../utils/api')
const { redirectAdmin, requireUser } = require('../../utils/util')

Page({
  data: {
    addressList: [],
    loading: true,
    selectMode: false
  },

  onLoad(options) {
    if (redirectAdmin()) return
    if (!requireUser()) return
    if (options.selectMode === 'true') {
      this.setData({ selectMode: true })
    }
  },

  onShow() {
    this.loadAddresses()
  },

  async loadAddresses() {
    this.setData({ loading: true })
    try {
      const res = await api.addressGetList()
      this.setData({ addressList: res.list, loading: false })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/address-edit/address-edit' })
  },

  onEdit(e) {
    const address = e.currentTarget.dataset.address
    wx.navigateTo({
      url: `/pages/address-edit/address-edit?address=${encodeURIComponent(JSON.stringify(address))}`
    })
  },

  onSelect(e) {
    if (!this.data.selectMode) return
    const address = e.currentTarget.dataset.address
    const eventChannel = this.getOpenerEventChannel()
    if (eventChannel) {
      eventChannel.emit('acceptAddress', address)
    }
    wx.navigateBack()
  },

  onSetDefault(e) {
    const { id } = e.currentTarget.dataset
    api.addressUpdate({ addressId: id, isDefault: true }).then(() => {
      this.loadAddresses()
    })
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '提示',
      content: '确定删除该地址吗？',
      success: (res) => {
        if (res.confirm) {
          api.addressDelete(id).then(() => {
            this.loadAddresses()
          })
        }
      }
    })
  },

})
