const api = require('../../utils/api')
const { redirectAdmin, requireUser } = require('../../utils/util')

Page({
  data: {
    items: [],
    addressList: [],
    selectedAddress: null,
    remark: '',
    totalPrice: 0,
    couponId: '',
    couponDiscount: 0,
    coupons: [],
    selectedCoupon: null,
    fromCart: false,
    loading: true,
    showCouponPicker: false,
    tempSelectedCoupon: null
  },

  onLoad(options) {
    if (redirectAdmin()) return
    if (!requireUser()) return
    if (options.items) {
      const items = JSON.parse(decodeURIComponent(options.items))
      const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      this.setData({ items, totalPrice, fromCart: !!options.fromCart })
    }
    this.loadAddresses()
    this.loadCoupons()
  },

  async loadCoupons() {
    const { items, totalPrice } = this.data
    if (!items.length) return
    try {
      const res = await api.getUsableCoupons(
        items.map(i => ({ categoryId: i.categoryId || '' })),
        totalPrice
      )
      if (res.list && res.list.length > 0) {
        this.setData({ coupons: res.list })
      }
    } catch (err) { /* ignore */ }
  },

  calcDiscount(coupon) {
    if (!coupon) return 0
    if (coupon.type === 'fixed') {
      return Math.min(coupon.value, this.data.totalPrice)
    } else if (coupon.type === 'discount') {
      return Math.round(this.data.totalPrice * (10 - coupon.value) / 10)
    }
    return 0
  },

  onOpenCouponPicker() {
    this.setData({
      showCouponPicker: true,
      tempSelectedCoupon: this.data.selectedCoupon
    })
  },

  onCloseCouponPicker() {
    this.setData({ showCouponPicker: false })
  },

  onPickerSelectCoupon(e) {
    const coupon = e.currentTarget.dataset.coupon
    if (!coupon) {
      this.setData({ tempSelectedCoupon: null })
      return
    }
    if (this.data.tempSelectedCoupon && this.data.tempSelectedCoupon._id === coupon._id) {
      this.setData({ tempSelectedCoupon: null })
    } else {
      this.setData({ tempSelectedCoupon: coupon })
    }
  },

  onConfirmCoupon() {
    const coupon = this.data.tempSelectedCoupon
    const discount = coupon ? this.calcDiscount(coupon) : 0
    this.setData({
      selectedCoupon: coupon,
      couponId: coupon ? coupon._id : '',
      couponDiscount: discount,
      showCouponPicker: false
    })
  },

  onClearCoupon() {
    this.setData({
      tempSelectedCoupon: null,
      selectedCoupon: null,
      couponId: '',
      couponDiscount: 0,
      showCouponPicker: false
    })
  },

  async loadAddresses() {
    try {
      const res = await api.addressGetList()
      const defaultAddr = res.list.find(a => a.isDefault) || res.list[0]
      this.setData({
        addressList: res.list,
        selectedAddress: defaultAddr || null,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  onSelectAddress() {
    wx.navigateTo({
      url: '/pages/address/address?selectMode=true',
      events: {
        acceptAddress: (data) => {
          if (data) {
            this.setData({ selectedAddress: data })
          }
        }
      }
    })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  async onSubmitOrder() {
    const { items, selectedAddress, remark, fromCart } = this.data

    if (!selectedAddress) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交订单中...' })

    try {
      const res = await api.orderCreate({
        items,
        addressId: selectedAddress._id,
        remark,
        couponId: this.data.couponId || undefined
      })

      if (fromCart) {
        const cartIds = items.map(item => item.cartId).filter(Boolean)
        if (cartIds.length > 0) {
          api.cartDelete(cartIds)
        }
      }

      wx.hideLoading()
      wx.showModal({
        title: '订单提交成功',
        content: '是否前往支付？',
        success: (modalRes) => {
          if (modalRes.confirm) {
            wx.redirectTo({
              url: `/pages/order-detail/order-detail?orderNo=${res.orderNo}&pay=true`
            })
          } else {
            wx.switchTab({ url: '/pages/user/user' })
          }
        }
      })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    }
  }
})
