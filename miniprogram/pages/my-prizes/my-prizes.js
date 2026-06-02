const api = require('../../utils/api')
const { initialState, load, loadMore } = require('../../utils/use-pagination')

function formatPrizes(list) {
  return (list || []).map(ua => ({
    ...ua,
    prizeName: ua.rewardSnapshot?.prizeName || '奖品',
    claimedAtText: ua.claimedAt ? String(ua.claimedAt).substring(0, 10) : '',
    redeemEnd: ua.rewardSnapshot?.redeemEndTime || ''
  }))
}

function fetchPrizes() {
  return async (page) => {
    const res = await api.getMyActivities(page, { type: 'prize', status: 'claimed' })
    return { list: formatPrizes(res.list), total: res.total }
  }
}

Page({
  data: {
    ...initialState({ dataKey: 'prizes' })
  },

  onLoad() {
    this.loadPrizes(true)
  },

  async loadPrizes(reset) {
    await load(this, fetchPrizes(), reset, { dataKey: 'prizes' })
  },

  onReachBottom() {
    loadMore(this, fetchPrizes(), { dataKey: 'prizes' })
  }
})
