const api = require('../../utils/api')
const { redirectAdmin, requireUser } = require('../../utils/util')

Page({
  data: {
    isEdit: false,
    addressId: '',
    name: '',
    phone: '',
    region: [],
    regionText: '',
    detail: '',
    isDefault: false,
    saving: false,
    errors: {}
  },

  onLoad(options) {
    if (redirectAdmin()) return
    if (!requireUser()) return
    if (options.address) {
      const address = JSON.parse(decodeURIComponent(options.address))
      this.setData({
        isEdit: true,
        addressId: address._id,
        name: address.name,
        phone: address.phone,
        region: address.region || [],
        regionText: (address.region || []).join(' '),
        detail: address.detail,
        isDefault: address.isDefault
      })
      wx.setNavigationBarTitle({ title: '编辑地址' })
    }
  },

  onNameInput(e) {
    const name = e.detail.value
    this.setData({
      name,
      'errors.name': !name ? '请输入姓名' : ''
    })
  },

  onPhoneInput(e) {
    const phone = e.detail.value
    this.setData({
      phone,
      'errors.phone': phone && !/^1\d{10}$/.test(phone) ? '手机号格式不正确' : ''
    })
  },

  onDetailInput(e) {
    const detail = e.detail.value
    this.setData({
      detail,
      'errors.detail': !detail ? '请输入详细地址' : ''
    })
  },

  onRegionChange(e) {
    const region = e.detail.value
    this.setData({
      region,
      regionText: region.join(' '),
      'errors.region': ''
    })
  },

  onDefaultChange(e) {
    this.setData({ isDefault: e.detail.value })
  },

  validate() {
    const { name, phone, region, detail } = this.data
    const errors = {}
    if (!name) errors.name = '请输入姓名'
    if (!phone) errors.phone = '请输入手机号'
    else if (!/^1\d{10}$/.test(phone)) errors.phone = '手机号格式不正确'
    if (region.length === 0) errors.region = '请选择地区'
    if (!detail) errors.detail = '请输入详细地址'
    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  async onSave() {
    const { name, phone, region, detail, isDefault } = this.data

    if (!this.validate()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    try {
      if (this.data.isEdit) {
        await api.addressUpdate({
          addressId: this.data.addressId,
          name, phone, region, detail, isDefault
        })
        wx.showToast({ title: '更新成功', icon: 'success' })
      } else {
        await api.addressAdd({ name, phone, region, detail, isDefault })
        wx.showToast({ title: '添加成功', icon: 'success' })
      }
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      this.setData({ saving: false })
    }
  }
})
