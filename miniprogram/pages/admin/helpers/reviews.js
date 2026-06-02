const api = require('../../../utils/api')
const { formatTime } = require('../../../utils/util')
const PAGE_SIZE = 20

module.exports = {
  data: {
    reviews: [], reviewPage: 1, reviewHasMore: true, reviewKeyword: '', reviewsLoading: false,
  },
  methods: {
    async loadReviews(reset) {
      if (this.data.reviewsLoading) return
      this.setData({ reviewsLoading: true })
      if (reset) this.setData({ reviewPage: 1, reviews: [] })
      try {
        const res = await api.adminGetReviews({ page: this.data.reviewPage, pageSize: PAGE_SIZE, keyword: this.data.reviewKeyword })
        const list = (res.list || []).map(r => ({
          ...r,
          stars: [1, 2, 3, 4, 5].map(s => ({ active: s <= r.rating })),
          createTimeText: formatTime(r.createTime),
          avatarText: r.nickName ? r.nickName.charAt(0) : '用',
          avatarColor: r.userId ? `admin-letter-${r.userId.charCodeAt(0) % 8}` : 'admin-letter-0'
        }))
        this.setData({
          reviews: reset ? list : [...this.data.reviews, ...list],
          reviewPage: this.data.reviewPage + 1,
          reviewHasMore: (reset ? list.length : this.data.reviews.length + list.length) < res.total,
          reviewsLoading: false
        })
      } catch (err) { this.setData({ reviewsLoading: false }); console.error('loadReviews', err) }
    },
    onSearchReview() { this.loadReviews(true) },
    onReviewKeywordInput(e) {
      this.setData({ reviewKeyword: e.detail.value })
      this._reviewSearchDebounce()
    },
    onDeleteReview(e) {
      wx.showModal({
        title: '提示', content: '确定删除该评价？',
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: '删除中...' })
            api.adminDeleteReview(e.currentTarget.dataset.id).then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已删除', icon: 'success' })
              this._tabLoaded[5] = true
              this.loadReviews(true)
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
          }
        }
      })
    },
  }
}
