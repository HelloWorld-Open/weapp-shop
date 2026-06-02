const DEFAULTS = { pageSize: 20, dataKey: 'list' }

function initialState(options = {}) {
  const { dataKey = DEFAULTS.dataKey } = options
  return { page: 1, hasMore: true, loading: false, [dataKey]: [] }
}

async function load(pageCtx, fetchFn, reset = false, options = {}) {
  const { pageSize = DEFAULTS.pageSize, dataKey = DEFAULTS.dataKey } = options
  if (pageCtx.data.loading) return
  pageCtx.setData({ loading: true })
  if (reset) {
    pageCtx.setData({ page: 1, [dataKey]: [], hasMore: true })
  }
  try {
    const res = await fetchFn(pageCtx.data.page, pageSize)
    const currentList = reset ? (res.list || []) : [...(pageCtx.data[dataKey] || []), ...(res.list || [])]
    pageCtx.setData({
      [dataKey]: currentList,
      hasMore: currentList.length < (res.total || 0),
      page: pageCtx.data.page + 1,
      loading: false
    })
    return res
  } catch (err) {
    pageCtx.setData({ loading: false })
    throw err
  }
}

function loadMore(pageCtx, fetchFn, options = {}) {
  if (pageCtx.data.hasMore && !pageCtx.data.loading) {
    return load(pageCtx, fetchFn, false, options)
  }
}

module.exports = { initialState, load, loadMore }
