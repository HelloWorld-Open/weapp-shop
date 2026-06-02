const api = require('../../utils/api')
const { getSession } = require('../../utils/util')

function fmtCountdown(seconds) {
  if (seconds <= 0) return ''
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return d + '天' + h + '时' + m + '分'
  if (h > 0) return h + '时' + m + '分'
  return m + '分'
}

function computeButtonState(activity, userActivity) {
  const now = Date.now()
  const start = new Date(activity.startTime).getTime()
  const end = new Date(activity.endTime).getTime()
  const startCountdown = now < start ? fmtCountdown(Math.floor((start - now) / 1000)) : ''
  const endCountdown = fmtCountdown(Math.max(0, Math.floor((end - now) / 1000)))

  if (now > end || activity.status !== 'published') {
    return { barLabel: '活动已结束', btnText: '已结束', btnDisabled: true, barColor: '#a4b0be', btnAction: '' }
  }
  if (userActivity) {
    if (userActivity.status === 'claimed') {
      return { barLabel: '奖励已领取', btnText: '已领取', btnDisabled: true, barColor: '#2ed573', btnAction: '' }
    }
    if (userActivity.status === 'completed') {
      return { barLabel: '任务已完成', btnText: '领取奖励', btnDisabled: false, barColor: '#ffa502', btnAction: 'claimReward' }
    }
    if (userActivity.status === 'in_progress') {
      const isBrowse = activity.taskType === 'browse'
      return {
        barLabel: isBrowse ? '正在浏览商品' : '消费进度',
        btnText: isBrowse ? '继续浏览' : '去逛逛',
        btnDisabled: false,
        barColor: '#ff4757',
        btnAction: isBrowse ? 'goProduct' : 'goShopping'
      }
    }
  }
  if (startCountdown) {
    return { barLabel: '距开始 ' + startCountdown, btnText: '活动未开始', btnDisabled: true, barColor: '#4a90d9', btnAction: '' }
  }
  return { barLabel: '参与活动', btnText: '立即参与', btnDisabled: false, barColor: '#ff4757', btnAction: 'startTask' }
}

Page({
  data: {
    activity: null,
    userActivity: null,
    loading: true,
    startCountdown: '',
    endCountdown: '',
    btnText: '立即参与',
    btnDisabled: false,
    btnAction: 'startTask',
    barLabel: '参与活动',
    barColor: '#ff4757'
  },

  onLoad(options) {
    this.setData({ activityId: options.id })
    this.loadData()
  },

  onShow() {
    if (this.data.activityId) this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const res = await api.getActivityDetail(this.data.activityId)
      const a = res.activity
      const ua = res.userActivity
      const state = computeButtonState(a, ua)
      this.setData({
        activity: a, userActivity: ua,
        startCountdown: state.barLabel.startsWith('距开始') ? state.barLabel.replace('距开始 ', '') : '',
        endCountdown: fmtCountdown(Math.max(0, Math.floor((new Date(a.endTime).getTime() - Date.now()) / 1000))),
        btnText: state.btnText, btnDisabled: state.btnDisabled, btnAction: state.btnAction,
        barLabel: state.barLabel, barColor: state.barColor,
        loading: false
      })
    } catch (err) {
      this.setData({ loading: false })
      console.error('loadActivityDetail', err)
    }
  },

  onBottomBtnTap() {
    const action = this.data.btnAction
    const handlers = {
      startTask: () => this.onStartTask(),
      claimReward: () => this.onClaimReward(),
      goProduct: () => this.onGoProduct(),
      goShopping: () => this.onGoShopping(),
      '': () => {}
    }
    handlers[action]()
  },

  async onStartTask() {
    if (!getSession()) return wx.navigateTo({ url: '/pages/login/login' })
    wx.showLoading({ title: '参与中...' })
    try {
      await api.startTask(this.data.activityId)
      wx.hideLoading()
      wx.showToast({ title: '已参与活动', icon: 'success' })
      this.loadData()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  async onClaimReward() {
    wx.showLoading({ title: '领取中...' })
    try {
      const res = await api.claimReward(this.data.activityId)
      wx.hideLoading()
      wx.showModal({
        title: '领取成功',
        content: res.reward.type === 'coupon' ? '恭喜获得优惠券，可在「我的优惠券」中查看' : '恭喜获得奖品，请联系客服兑换',
        showCancel: false
      })
      this.loadData()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  onGoShopping() {
    wx.switchTab({ url: '/pages/category/category' })
  },

  onGoProduct() {
    wx.navigateTo({ url: `/pages/product-list/product-list?fromActivityId=${this.data.activityId}&browseTarget=${this.data.activity.taskConfig.browseSeconds || 60}` })
  }
})
