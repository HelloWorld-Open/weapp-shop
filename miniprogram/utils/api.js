const { cacheGet, cacheSet, cacheClear } = require('./util')

const PRODUCT_PREFIXES = ['home_', 'product_', 'admin-stats_{"action":"getCategoryStats']
const BANNER_PREFIXES = ['home_', 'category_{"action":"getBanners']
const ORDER_PREFIXES = ['admin-stats_{"action":"getOrderTrend']
const USER_PREFIXES = ['admin-stats_{"action":"getUserTrend']
const FAVORITE_PREFIXES = ['admin-stats_{"action":"getFavoriteStats']
const ACTIVITY_PREFIXES = ['home_', 'activity_']

function withCacheClear(fn, prefixes) {
  return function () {
    return fn.apply(this, arguments).then(res => {
      cacheClear(...prefixes)
      return res
    })
  }
}

function callCloudFunction(name, data = {}) {
  const session = wx.getStorageSync('session')
  if (session && session.userId) {
    data._uid = session.userId
  }
  if (session && session.sessionToken) {
    data._token = session.sessionToken
  }
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const r = res.result
        if (r && r.success === false) {
          wx.showToast({ title: r.message || '操作失败', icon: 'none' })
          reject(new Error(r.message))
        } else if (r && r.success === true) {
          resolve(r.data)
        } else {
          resolve(r)
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      }
    })
  })
}

function callWithCache(name, data = {}, ttlSeconds = 120) {
  const key = `${name}_${JSON.stringify(data)}`
  const cached = cacheGet(key)
  if (cached) return Promise.resolve(cached)
  return callCloudFunction(name, data).then(res => {
    cacheSet(key, res, ttlSeconds)
    return res
  })
}

module.exports = {
  updateUserInfo(data) {
    return callCloudFunction('user', { action: 'updateInfo', ...data })
  },

  getCategoryList() {
    return callWithCache('category', { action: 'getList' })
  },

  getHomePage() {
    return callWithCache('home', {}, 120)
  },

  getHomePageDirect() {
    return callCloudFunction('home', {})
  },


  getProductList(data) {
    return callWithCache('product', { action: 'getList', ...data }, 30)
  },

  getProductDetail(productId) {
    return callWithCache('product', { action: 'getDetail', productId }, 30)
  },

  cartAdd(data) {
    return callCloudFunction('cart', { action: 'add', ...data })
  },

  cartGetList() {
    return callCloudFunction('cart', { action: 'getList' })
  },

  cartUpdate(data) {
    return callCloudFunction('cart', { action: 'update', ...data })
  },

  cartDelete(cartIds) {
    return callCloudFunction('cart', { action: 'delete', cartIds })
  },

  orderCreate(data) {
    return callCloudFunction('order', { action: 'create', ...data })
  },

  orderGetList(data) {
    return callCloudFunction('order', { action: 'getList', ...data })
  },

  orderGetCounts() {
    return callCloudFunction('order', { action: 'getOrderCounts' })
  },

  orderGetDetail(orderNo) {
    return callCloudFunction('order', { action: 'getDetail', orderNo })
  },

  orderPay(orderNo) {
    return callCloudFunction('order', { action: 'pay', orderNo })
  },

  orderCancel(orderNo) {
    return callCloudFunction('order', { action: 'cancel', orderNo })
  },

  orderConfirmReceive(orderNo) {
    return callCloudFunction('order', { action: 'confirmReceive', orderNo })
  },

  orderRefund(orderNo) {
    return callCloudFunction('order', { action: 'refund', orderNo })
  },

  addressAdd(data) {
    return callCloudFunction('address', { action: 'add', ...data })
  },

  addressGetList() {
    return callCloudFunction('address', { action: 'getList' })
  },

  addressUpdate(data) {
    return callCloudFunction('address', { action: 'update', ...data })
  },

  addressDelete(addressId) {
    return callCloudFunction('address', { action: 'delete', addressId })
  },

  getUserInfo() {
    return callCloudFunction('user', { action: 'getInfo' })
  },

  phoneLogin(phone) {
    return callCloudFunction('auth', { action: 'phoneLogin', phone })
  },

  adminLogin(username, password) {
    return callCloudFunction('auth', { action: 'adminLogin', username, password })
  },

  authLogout() {
    return callCloudFunction('auth', { action: 'logout' })
  },

  adminGetUsers({ page = 1, keyword = '' } = {}) {
    return callCloudFunction('admin', { action: 'getUsers', page, keyword })
  },

  adminDeleteUser: withCacheClear(
    (userId) => callCloudFunction('admin', { action: 'deleteUser', userId }),
    USER_PREFIXES
  ),

  adminUpdateUser: withCacheClear(
    (data) => callCloudFunction('admin', { action: 'updateUser', ...data }),
    USER_PREFIXES
  ),

  adminToggleBan: withCacheClear(
    (userId) => callCloudFunction('admin', { action: 'toggleBan', userId }),
    USER_PREFIXES
  ),

  adminGetProducts({ page = 1, keyword = '', categoryId = '', productStatus = '' } = {}) {
    return callCloudFunction('admin', { action: 'getProducts', page, keyword, categoryId, productStatus })
  },

  adminAddProduct: withCacheClear(
    (data) => callCloudFunction('admin', { action: 'addProduct', ...data }),
    PRODUCT_PREFIXES
  ),

  adminUpdateProduct: withCacheClear(
    (data) => callCloudFunction('admin', { action: 'updateProduct', ...data }),
    PRODUCT_PREFIXES
  ),

  adminDeleteProduct: withCacheClear(
    (productId) => callCloudFunction('admin', { action: 'deleteProduct', productId }),
    PRODUCT_PREFIXES
  ),

  adminGetOrders({ page = 1, pageSize = 20 } = {}) {
    return callCloudFunction('admin', { action: 'getOrders', page, pageSize })
  },

  adminGetOrderDetail(orderNo) {
    return callCloudFunction('admin', { action: 'getOrderDetail', orderNo })
  },

  adminDeleteOrder: withCacheClear(
    (orderNo) => callCloudFunction('admin', { action: 'deleteOrder', orderNo }),
    ORDER_PREFIXES
  ),

  adminRefundOrder: withCacheClear(
    (orderNo) => callCloudFunction('admin', { action: 'refundOrder', orderNo }),
    ORDER_PREFIXES
  ),

  adminShipOrder: withCacheClear(
    (orderNo) => callCloudFunction('admin', { action: 'shipOrder', orderNo }),
    ORDER_PREFIXES
  ),

  adminGetCategories() {
    return callWithCache('admin', { action: 'getCategories' })
  },

  adminGetUserTrend(days = 7) {
    return callWithCache('admin-stats', { action: 'getUserTrend', days })
  },

  adminGetCategoryStats() {
    return callWithCache('admin-stats', { action: 'getCategoryStats' })
  },

  adminGetOrderTrend(days = 7) {
    return callWithCache('admin-stats', { action: 'getOrderTrend', days })
  },

  adminGetBanners() {
    return callCloudFunction('admin', { action: 'getBanners' })
  },

  adminAddBanner: withCacheClear(
    (data) => callCloudFunction('admin', { action: 'addBanner', ...data }),
    BANNER_PREFIXES
  ),

  adminUpdateBanner: withCacheClear(
    (data) => callCloudFunction('admin', { action: 'updateBanner', ...data }),
    BANNER_PREFIXES
  ),

  adminDeleteBanner: withCacheClear(
    (bannerId) => callCloudFunction('admin', { action: 'deleteBanner', bannerId }),
    BANNER_PREFIXES
  ),

  adminReorderBanners: withCacheClear(
    (ids) => callCloudFunction('admin', { action: 'reorderBanners', ids }),
    BANNER_PREFIXES
  ),

  favoriteAdd: withCacheClear(
    (productId) => callCloudFunction('favorite', { action: 'add', productId }),
    FAVORITE_PREFIXES
  ),

  favoriteRemove: withCacheClear(
    (productId) => callCloudFunction('favorite', { action: 'remove', productId }),
    FAVORITE_PREFIXES
  ),

  favoriteGetList(page = 1, pageSize = 20) {
    return callCloudFunction('favorite', { action: 'getList', page, pageSize })
  },

  favoriteCheckBatch(productIds) {
    return callCloudFunction('favorite', { action: 'checkBatch', productIds })
  },

  adminGetFavoriteStats(days = 7) {
    return callWithCache('admin-stats', { action: 'getFavoriteStats', days })
  },

  reviewAdd: withCacheClear(
    (data) => callCloudFunction('review', { action: 'add', ...data }),
    PRODUCT_PREFIXES.concat(['review_'])
  ),

  reviewGetList(productId, page = 1, pageSize = 10) {
    return callCloudFunction('review', { action: 'getList', productId, page, pageSize })
  },

  reviewGetStats(productId) {
    return callWithCache('review', { action: 'getStats', productId }, 120)
  },

  adminGetReviews({ page = 1, pageSize = 20, keyword = '' } = {}) {
    return callCloudFunction('admin', { action: 'getReviews', page, pageSize, keyword })
  },

  adminDeleteReview(reviewId) {
    return callCloudFunction('admin', { action: 'deleteReview', reviewId })
  },

  // --- Search ---
  productSuggest(keyword) {
    return callCloudFunction('product', { action: 'suggest', keyword })
  },

  searchRecordKeyword(keyword) {
    return callCloudFunction('search', { action: 'recordKeyword', keyword })
  },

  searchGetHotKeywords() {
    return callWithCache('search', { action: 'getHotKeywords' }, 120)
  },

  // ─── 活动 ───
  getActivityList() {
    return callWithCache('activity', { action: 'getList' }, 60)
  },

  getActivityDetail(activityId) {
    return callCloudFunction('activity', { action: 'getDetail', activityId })
  },

  startTask(activityId) {
    return callCloudFunction('activity', { action: 'startTask', activityId })
  },

  browseReport(activityId, duration) {
    return callCloudFunction('activity', { action: 'browseReport', activityId, duration })
  },

  claimReward: withCacheClear(
    (activityId) => callCloudFunction('activity', { action: 'claimReward', activityId }),
    ACTIVITY_PREFIXES
  ),

  getMyActivities(page = 1, params = {}) {
    return callCloudFunction('activity', { action: 'getMyActivities', page, ...params })
  },

  // ─── 优惠券 ───
  getMyCoupons(status = 'available', page = 1) {
    return callCloudFunction('coupon', { action: 'getMyCoupons', status, page })
  },

  getUsableCoupons(products, totalPrice) {
    return callCloudFunction('coupon', { action: 'getUsableCoupons', products, totalPrice })
  },

  // ─── 管理员-活动 ───
  adminGetActivities({ page = 1, pageSize = 999 } = {}) {
    return callCloudFunction('admin', { action: 'getActivities', page, pageSize })
  },

  adminAddActivity: withCacheClear(
    (data) => callCloudFunction('admin', { action: 'addActivity', ...data }),
    ACTIVITY_PREFIXES
  ),

  adminUpdateActivity: withCacheClear(
    (data) => callCloudFunction('admin', { action: 'updateActivity', ...data }),
    ACTIVITY_PREFIXES
  ),

  adminDeleteActivity: withCacheClear(
    (activityId) => callCloudFunction('admin', { action: 'deleteActivity', activityId }),
    ACTIVITY_PREFIXES
  ),

  adminToggleActivityStatus: withCacheClear(
    (activityId, status) => callCloudFunction('admin', { action: 'toggleActivityStatus', activityId, status }),
    ACTIVITY_PREFIXES
  ),
}
