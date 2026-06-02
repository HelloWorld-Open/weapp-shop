const api = require('../../utils/api')
const { redirectAdmin, cacheClear, getSession } = require('../../utils/util')
const { initialState, load, loadMore } = require('../../utils/use-pagination')

function fetchProducts(pageCtx) {
  return (page, pageSize) => {
    const params = { page, pageSize, sort: pageCtx.data.sort }
    if (pageCtx.data.categoryId) params.categoryId = pageCtx.data.categoryId
    if (pageCtx.data.keyword) params.keyword = pageCtx.data.keyword
    return api.getProductList(params)
  }
}

Page({
  data: {
    categoryId: '',
    keyword: '',
    fromActivityId: '',
    browseTarget: 0,
    ...initialState({ dataKey: 'products' }),
    sort: 'default',
    sortOptions: [
      { value: 'default', label: '默认' },
      { value: 'sales', label: '销量' },
      { value: 'price_desc', label: '价格↑' },
      { value: 'price_asc', label: '价格↓' }
    ],
    favoriteMap: {},
    showBackTop: false,
    searchHistory: [],
    hotKeywords: [],
    suggestions: [],
    showSuggestions: false,
    showSearchPanel: false,
    noResults: false
  },

  onLoad(options) {
    if (redirectAdmin()) return
    if (options.fromActivityId) this.setData({ fromActivityId: options.fromActivityId, browseTarget: options.browseTarget || 0 })
    if (options.categoryId) {
      this.setData({ categoryId: options.categoryId })
      wx.setNavigationBarTitle({ title: options.title || '商品列表' })
    }
    this.loadProducts(true)
    this.loadHotKeywords()
    this.loadSearchHistory()
  },

  onReachBottom() {
    loadMore(this, fetchProducts(this), { dataKey: 'products' })
  },

  async loadHotKeywords() {
    try {
      const res = await api.searchGetHotKeywords()
      this.setData({ hotKeywords: res.list || [] })
    } catch (err) { /* ignore */ }
  },

  async loadProducts(reset = false) {
    if (reset) this.setData({ noResults: false })
    const res = await load(this, fetchProducts(this), reset, { dataKey: 'products', pageSize: 20 })
    if (reset && res && res.list && res.list.length === 0 && !!this.data.keyword) {
      this.setData({ noResults: true })
    }
    if (res) this.loadFavorites(res.list || [])
  },

  async loadFavorites(products) {
    const session = getSession()
    if (!session || session.role !== 'user') return
    const ids = products.map(p => p._id).filter(Boolean)
    if (ids.length === 0) return
    try {
      const res = await api.favoriteCheckBatch(ids)
      if (res && res.map) {
        this.setData({ favoriteMap: { ...this.data.favoriteMap, ...res.map } })
      }
    } catch (err) { console.error('loadFavorites', err) }
  },

  onSortChange(e) {
    const sort = e.currentTarget.dataset.value
    this.setData({ sort }, () => {
      this.loadProducts(true)
    })
  },

  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.setData({ keyword, noResults: false })
    if (this._suggestTimer) clearTimeout(this._suggestTimer)
    if (keyword) {
      this.setData({ showSearchPanel: false })
      this._suggestTimer = setTimeout(() => {
        this.loadSuggestions(keyword)
      }, 300)
    } else {
      this.setData({ suggestions: [], showSuggestions: false, showSearchPanel: true })
    }
  },

  async loadSuggestions(keyword) {
    try {
      const res = await api.productSuggest(keyword)
      this.setData({ suggestions: res.list || [], showSuggestions: true })
    } catch (err) { /* ignore */ }
  },

  onSearchFocus() {
    if (!this.data.keyword.trim()) {
      this.setData({ showSearchPanel: true })
    }
  },

  onSearchBlur() {
    setTimeout(() => {
      this.setData({ showSuggestions: false, showSearchPanel: false })
    }, 200)
  },

  onSelectSuggestion(e) {
    const { id, name } = e.currentTarget.dataset
    this.setData({ keyword: name, showSuggestions: false })
    this.saveSearchHistory(name)
    api.searchRecordKeyword(name).catch(() => {})
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${id}`
    })
  },

  onTapHotKeyword(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword, showSuggestions: false, showSearchPanel: false })
    this.saveSearchHistory(keyword)
    api.searchRecordKeyword(keyword).catch(() => {})
    this.loadProducts(true)
  },

  onSearch() {
    const { keyword } = this.data
    this.setData({ showSuggestions: false, showSearchPanel: false })
    if (keyword) {
      this.saveSearchHistory(keyword)
      api.searchRecordKeyword(keyword).catch(() => {})
    }
    this.loadProducts(true)
  },

  onPageScroll(e) {
    this.setData({ showBackTop: e.scrollTop > 600 })
  },

  onBackTop() {
    wx.pageScrollTo({ scrollTop: 0, duration: 300 })
  },

  onPullDownRefresh() {
    cacheClear('product_')
    this.loadProducts(true)
    wx.stopPullDownRefresh()
  },

  loadSearchHistory() {
    const history = wx.getStorageSync('searchHistory') || []
    this.setData({ searchHistory: history })
  },

  saveSearchHistory(keyword) {
    if (!keyword) return
    let history = wx.getStorageSync('searchHistory') || []
    history = history.filter(item => item !== keyword)
    history.unshift(keyword)
    if (history.length > 20) history = history.slice(0, 20)
    wx.setStorageSync('searchHistory', history)
    this.setData({ searchHistory: history })
  },

  onTapHistory(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword, showSuggestions: false, showSearchPanel: false })
    this.saveSearchHistory(keyword)
    api.searchRecordKeyword(keyword).catch(() => {})
    this.loadProducts(true)
  },

  removeSearchHistory(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    let history = [...this.data.searchHistory]
    history.splice(index, 1)
    wx.setStorageSync('searchHistory', history)
    this.setData({ searchHistory: history })
  },

  clearSearchHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清空所有搜索记录？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory')
          this.setData({ searchHistory: [] })
        }
      }
    })
  }
})
