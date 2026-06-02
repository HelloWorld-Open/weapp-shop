const api = require('../../utils/api')
const { redirectAdmin, requireUser } = require('../../utils/util')

Page({
  data: {
    cartList: [],
    selectedIds: [],
    totalPrice: 0,
    loading: true,
    allSelected: false
  },

  onShow() {
    if (redirectAdmin()) return
    if (!requireUser()) return
    this.loadCart()
  },

  async loadCart() {
    this.setData({ loading: true })
    try {
      const res = await api.cartGetList()
      const list = res.list
      let total = 0
      const selectedIds = []
      list.forEach(item => {
        if (item.selected) {
          selectedIds.push(item._id)
          total += (item.productInfo?.price || 0) * (item.quantity || 0)
        }
      })
      list.forEach(item => {
        item._selected = selectedIds.includes(item._id)
      })
      this.setData({
        cartList: list,
        selectedIds,
        totalPrice: total,
        allSelected: selectedIds.length === list.length && list.length > 0,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  onToggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const { cartList, selectedIds: oldSelected } = this.data
    const idx = oldSelected.indexOf(id)
    const newSelected = idx !== -1
      ? oldSelected.filter(v => v !== id)
      : [...oldSelected, id]

    const i = cartList.findIndex(v => v._id === id)
    if (i >= 0) {
      this.setData({
        [`cartList[${i}]._selected`]: idx === -1,
        selectedIds: newSelected,
        totalPrice: this._calcTotal(cartList, newSelected),
        allSelected: newSelected.length === cartList.length && cartList.length > 0
      })
    }
  },

  onToggleAll() {
    const { cartList, allSelected } = this.data
    if (allSelected) {
      const paths = cartList.map((_, i) => ({ [`cartList[${i}]._selected`]: false }))
      this.setData(Object.assign({}, ...paths, {
        selectedIds: [],
        totalPrice: 0,
        allSelected: false
      }))
    } else {
      const selectedIds = cartList.map(v => v._id)
      const paths = cartList.map((_, i) => ({ [`cartList[${i}]._selected`]: true }))
      this.setData(Object.assign({}, ...paths, {
        selectedIds,
        totalPrice: this._calcTotal(cartList, selectedIds),
        allSelected: true
      }))
    }
  },

  onQuantityChange(e) {
    const { id, type } = e.currentTarget.dataset
    const { cartList, selectedIds } = this.data
    const i = cartList.findIndex(v => v._id === id)
    if (i < 0) return
    const oldQty = cartList[i].quantity
    let qty = oldQty
    if (type === 'minus' && qty > 1) qty--
    if (type === 'plus') qty++

    this.setData({
      [`cartList[${i}].quantity`]: qty,
      totalPrice: this._calcTotal(cartList, selectedIds)
    })
    api.cartUpdate({ cartId: id, quantity: qty }).catch(() => {
      this.setData({
        [`cartList[${i}].quantity`]: oldQty,
        totalPrice: this._calcTotal(this.data.cartList, this.data.selectedIds)
      })
      wx.showToast({ title: '更新失败', icon: 'none' })
    })
  },

  _calcTotal(list, selectedIds) {
    return list.reduce((sum, item) => {
      if (selectedIds.includes(item._id)) {
        return sum + (item.productInfo?.price || 0) * (item.quantity || 0)
      }
      return sum
    }, 0)
  },

  onDelete() {
    const { selectedIds } = this.data
    if (selectedIds.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    wx.showModal({
      title: '提示',
      content: '确定删除选中的商品吗？',
      success: res => {
        if (res.confirm) {
          api.cartDelete(selectedIds).then(() => this.loadCart())
        }
      }
    })
  },

  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.cartList.find(v => v.productId === id)
    wx.navigateTo({
      url: '/pages/product-detail/product-detail?id=' + id,
      success: res => {
        if (item && item.productInfo) res.eventChannel.emit('acceptProduct', item.productInfo)
      }
    })
  },

  onCheckout() {
    if (!requireUser()) return
    const { cartList, selectedIds } = this.data
    if (selectedIds.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' })
      return
    }
    const items = []
    cartList.forEach(item => {
      if (selectedIds.includes(item._id) && item.productInfo) {
        items.push({
          cartId: item._id,
          productId: item.productId,
          name: item.productInfo.name,
          image: item.productInfo.images?.[0] || '',
          price: item.productInfo.price,
          quantity: item.quantity
        })
      }
    })
    wx.navigateTo({
      url: '/pages/order-confirm/order-confirm?items=' + encodeURIComponent(JSON.stringify(items)) + '&fromCart=true'
    })
  }
})
