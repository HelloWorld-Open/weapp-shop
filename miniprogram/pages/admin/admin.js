const api = require('../../utils/api')
const { getSession, redirectNonAdmin } = require('../../utils/util')
const overviewHelper = require('./helpers/overview')
const usersHelper = require('./helpers/users')
const productsHelper = require('./helpers/products')
const ordersHelper = require('./helpers/orders')
const bannersHelper = require('./helpers/banners')
const reviewsHelper = require('./helpers/reviews')
const activitiesHelper = require('./helpers/activities')

Page({
  data: {
    tabIndex: 0,
    session: null,
    statusBarHeight: 44,
    adminScrollTop: 0,
    showBackTop: false,
    ...overviewHelper.data,
    ...usersHelper.data,
    ...productsHelper.data,
    ...ordersHelper.data,
    ...bannersHelper.data,
    ...reviewsHelper.data,
    ...activitiesHelper.data,
  },

  _tabLoaded: {},

  _debounce(fn, delay = 300) {
    let timer
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => fn.apply(this, args), delay)
    }
  },

  onLoad() {
    if (redirectNonAdmin()) return
    const session = getSession()
    const sysInfo = wx.getSystemInfoSync()
    this.setData({ session, statusBarHeight: sysInfo.statusBarHeight })
    this.loadCategories()
    this.loadUserTrend()
    this._userSearchDebounce = this._debounce(() => this.loadUsers(true))
    this._productSearchDebounce = this._debounce(() => this.loadProducts(true))
    this._reviewSearchDebounce = this._debounce(() => this.loadReviews(true))
  },

  onShow() { if (redirectNonAdmin()) return },

  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ tabIndex: index })
    if (index === 0) {
      if (this.data.chartTab === 0 && this.data.userTrend.daily.length === 0) this.loadUserTrend()
      if (this.data.chartTab === 1 && this.data.categoryStats.list.length === 0) this.loadCategoryStats()
      if (this.data.chartTab === 2 && this.data.orderTrend.daily.length === 0) this.loadOrderTrend()
      if (this.data.chartTab === 3 && this.data.favStats.daily.length === 0) this.loadFavoriteStats()
    }
    if (index === 1 && !this._tabLoaded[1]) { this._tabLoaded[1] = true; this.loadUsers(true) }
    if (index === 2 && !this._tabLoaded[2]) { this._tabLoaded[2] = true; this.loadProducts(true) }
    if (index === 3 && !this._tabLoaded[3]) { this._tabLoaded[3] = true; this.loadOrders(true) }
    if (index === 4 && this.data.banners.length === 0) this.loadBanners()
    if (index === 5 && !this._tabLoaded[5]) { this._tabLoaded[5] = true; this.loadReviews(true) }
    if (index === 6 && !this._tabLoaded[6]) { this._tabLoaded[6] = true; this.loadActivities() }
  },

  onScrollTolower() {
    const { tabIndex } = this.data
    if (tabIndex === 1 && this.data.userHasMore) this.loadUsers(false)
    else if (tabIndex === 2 && this.data.productHasMore) this.loadProducts(false)
    else if (tabIndex === 3 && this.data.orderHasMore) this.loadOrders(false)
    else if (tabIndex === 5 && this.data.reviewHasMore) this.loadReviews(false)
    else if (tabIndex === 6 && this.data.activityHasMore) this.loadActivities()
  },

  async loadCategories() {
    try {
      const res = await api.adminGetCategories()
      this.setData({ categories: res.list, allCategories: [{ _id: '', name: '全部分类' }, ...res.list] })
    } catch (err) { console.error('loadCategories', err) }
  },

  onAdminScroll(e) {
    const y = e.detail.scrollTop
    this.setData({ showBackTop: y > 600 })
  },

  onBackTop() {
    this.setData({ adminScrollTop: -1 })
    setTimeout(() => this.setData({ adminScrollTop: 0 }), 50)
  },

  onLogout() {
    wx.showModal({
      title: '提示', content: '确定退出管理后台吗？',
      success: (r) => { if (r.confirm) { wx.removeStorageSync('session'); wx.reLaunch({ url: '/pages/login/login' }) } }
    })
  },

  onStop() {},

  ...overviewHelper.methods,
  ...usersHelper.methods,
  ...productsHelper.methods,
  ...ordersHelper.methods,
  ...bannersHelper.methods,
  ...reviewsHelper.methods,
  ...activitiesHelper.methods,
})
