const api = require('../../utils/api')
const util = require('../../utils/util')

Component({
  properties: {
    product: {
      type: Object,
      value: {}
    },
    favorited: {
      type: Boolean,
      value: false
    },
    keyword: {
      type: String,
      value: ''
    },
    fromActivityId: {
      type: String,
      value: ''
    },
    browseTarget: {
      type: Number,
      value: 0
    }
  },

  data: {
    localFavorited: false
  },

  observers: {
    favorited(val) {
      this.setData({ localFavorited: val })
    }
  },

  methods: {
    onTap(e) {
      if (e.mark && e.mark.fav) return
      const product = this.properties.product
      const aid = this.properties.fromActivityId
      const bt = this.properties.browseTarget
      let url = `/pages/product-detail/product-detail?id=${product._id}`
      if (aid) url += `&fromActivityId=${aid}&browseTarget=${bt}`
      wx.navigateTo({
        url,
        success: (res) => {
          res.eventChannel.emit('acceptProduct', product)
        }
      })
    },

    async onFavoriteTap() {
      const session = util.getSession()
      if (!session) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 500)
        return
      }
      const productId = this.properties.product._id
      const favorited = this.data.localFavorited
      try {
        if (favorited) {
          await api.favoriteRemove(productId)
        } else {
          await api.favoriteAdd(productId)
        }
        this.setData({ localFavorited: !favorited })
      } catch (err) {
        console.error('favorite toggle failed', err)
      }
    }
  }
})
