const api = require('../../../utils/api')

module.exports = {
  data: {
    activities: [], activityPage: 1, activityHasMore: true, activitiesLoading: false,
    activityModal: false, editActivityId: '',
    activityForm: {
      title: '', description: '', image: '', type: 'coupon', taskType: 'browse',
      taskConfig: { browseSeconds: 60, minAmount: 0 },
      rewardConfig: {
        couponType: 'fixed', couponValue: 0, minAmount: 0, categoryId: null,
        validDays: 30, totalQuantity: 0,
        prizeName: '', prizeImage: ''
      },
      startTime: '', endTime: '', status: 'draft'
    },
    activityCategoryText: '全部分类',
    activityCategoryIndex: 0,
    multiStartRange: [[], [], [], [], []],
    multiStartIndex: [0, 0, 0, 0, 0],
    multiEndRange: [[], [], [], [], []],
    multiEndIndex: [0, 0, 0, 0, 0]
  },
  methods: {
    async loadActivities() {
      this.setData({ activitiesLoading: true })
      try {
        const res = await api.adminGetActivities()
        const list = (res.list || []).map(a => ({
          ...a,
          statusText: a.status === 'published' ? '已发布' : a.status === 'offline' ? '已下架' : '草稿',
          timeRange: new Date(a.startTime).toLocaleDateString('zh-CN') + ' ~ ' + new Date(a.endTime).toLocaleDateString('zh-CN')
        }))
        this.setData({ activities: list, activitiesLoading: false, activityHasMore: false })
      } catch (err) { this.setData({ activitiesLoading: false }); console.error('loadActivities', err) }
    },
    onOpenAddActivity() {
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
      const endDt = new Date(now)
      endDt.setDate(endDt.getDate() + 7)
      const endStr = `${endDt.getFullYear()}-${pad(endDt.getMonth() + 1)}-${pad(endDt.getDate())} 23:59`
      const startR = this._buildMultiRange(nowStr)
      const endR = this._buildMultiRange(endStr)
      this.setData({
        activityModal: true, editActivityId: '',
        activityCategoryText: '全部分类',
        activityCategoryIndex: 0,
        multiStartRange: startR.range,
        multiStartIndex: startR.index,
        multiEndRange: endR.range,
        multiEndIndex: endR.index,
        activityForm: {
          title: '', description: '', image: '', type: 'coupon', taskType: 'browse',
          taskConfig: { browseSeconds: 60, minAmount: 0 },
          rewardConfig: {
            couponType: 'fixed', couponValue: 0, minAmount: 0, categoryId: null,
            validDays: 30, totalQuantity: 0,
            prizeName: '', prizeImage: ''
          },
          status: 'draft'
        }
      })
    },
    onOpenEditActivity(e) {
      const a = e.currentTarget.dataset.activity
      const categories = this.data.categories || []
      const catId = a.rewardConfig && a.rewardConfig.categoryId
      const catIndex = catId ? categories.findIndex(c => c._id === catId) + 1 : 0
      const catName = catIndex > 0 && categories[catIndex - 1] ? categories[catIndex - 1].name : '全部分类'
      const startR = this._buildMultiRange(a.startTime)
      const endR = this._buildMultiRange(a.endTime)
      this.setData({
        activityModal: true, editActivityId: a._id,
        activityCategoryText: catName,
        activityCategoryIndex: catIndex,
        multiStartRange: startR.range,
        multiStartIndex: startR.index,
        multiEndRange: endR.range,
        multiEndIndex: endR.index,
        activityForm: {
          title: a.title || '',
          description: a.description || '',
          image: a.image || '',
          type: a.type || 'coupon',
          taskType: a.taskType || 'browse',
          taskConfig: a.taskConfig || { browseSeconds: 60, minAmount: 0 },
          rewardConfig: a.rewardConfig || {},
          status: a.status || 'draft'
        }
      })
    },
    onCloseActivityModal() {
      this.setData({ activityModal: false })
    },
    _years() {
      const y = new Date().getFullYear()
      const arr = []
      for (let i = y - 1; i <= y + 2; i++) arr.push(String(i))
      return arr
    },
    _months() {
      const arr = []
      for (let i = 1; i <= 12; i++) arr.push(String(i).padStart(2, '0'))
      return arr
    },
    _days(year, month) {
      const max = new Date(Number(year), Number(month), 0).getDate()
      const arr = []
      for (let i = 1; i <= max; i++) arr.push(String(i).padStart(2, '0'))
      return arr
    },
    _hours() {
      const arr = []
      for (let i = 0; i < 24; i++) arr.push(String(i).padStart(2, '0'))
      return arr
    },
    _minutes() {
      const arr = []
      for (let i = 0; i < 60; i++) arr.push(String(i).padStart(2, '0'))
      return arr
    },
    _buildMultiRange(dtStr) {
      let d = new Date()
      if (dtStr) {
        const parsed = new Date(dtStr)
        if (!isNaN(parsed.getTime())) d = parsed
      }
      const years = this._years()
      const months = this._months()
      const y = String(d.getFullYear())
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const h = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      const yrIdx = Math.max(0, years.indexOf(y))
      const moIdx = Number(m) - 1
      const days = this._days(y, m)
      const hours = this._hours()
      const minutes = this._minutes()
      const dayIdx = Math.max(0, days.indexOf(day))
      const hrIdx = Number(h)
      const minIdx = Number(min)
      return {
        range: [years, months, days, hours, minutes],
        index: [yrIdx, moIdx, dayIdx, hrIdx, minIdx]
      }
    },
    _buildMultiDatetime(range, idx) {
      const y = Number(range[0][idx[0]])
      const m = Number(range[1][idx[1]])
      const d = Number(range[2][idx[2]])
      const h = Number(range[3][idx[3]])
      const min = Number(range[4][idx[4]])
      return new Date(y, m - 1, d, h, min).toISOString()
    },
    onMultiStartColumnChange(e) {
      const { column, value } = e.detail
      const idx = [...this.data.multiStartIndex]
      idx[column] = value
      if (column === 0 || column === 1) {
        const years = this._years()
        const months = this._months()
        const y = years[idx[0]]
        const m = months[idx[1]]
        const days = this._days(y, m)
        const newIdx = [...idx]
        if (newIdx[2] >= days.length) newIdx[2] = days.length - 1
        const range = [years, months, days, this._hours(), this._minutes()]
        this.setData({ multiStartRange: range, multiStartIndex: newIdx })
      } else {
        this.setData({ multiStartIndex: idx })
      }
    },
    onMultiEndColumnChange(e) {
      const { column, value } = e.detail
      const idx = [...this.data.multiEndIndex]
      idx[column] = value
      if (column === 0 || column === 1) {
        const years = this._years()
        const months = this._months()
        const y = years[idx[0]]
        const m = months[idx[1]]
        const days = this._days(y, m)
        const newIdx = [...idx]
        if (newIdx[2] >= days.length) newIdx[2] = days.length - 1
        const range = [years, months, days, this._hours(), this._minutes()]
        this.setData({ multiEndRange: range, multiEndIndex: newIdx })
      } else {
        this.setData({ multiEndIndex: idx })
      }
    },
    onActivityFieldChange(e) {
      const { field } = e.currentTarget.dataset
      const value = e.detail.value
      this.setData({ [`activityForm.${field}`]: value })
    },
    onActivityTypeChange(e) {
      const t = e.currentTarget.dataset.type
      if (t === 'coupon') {
        this.setData({
          'activityForm.type': 'coupon',
          'activityForm.rewardConfig': {
            couponType: 'fixed', couponValue: 0, minAmount: 0, categoryId: null,
            validDays: 30, totalQuantity: 0,
            prizeName: '', prizeImage: ''
          }
        })
      } else {
        this.setData({
          'activityForm.type': 'prize',
          'activityForm.rewardConfig': {
            prizeName: '', prizeImage: '',
            totalQuantity: 0,
            couponType: 'fixed', couponValue: 0, minAmount: 0, categoryId: null, validDays: 0
          }
        })
      }
    },
    onActivityTaskTypeChange(e) {
      const t = e.currentTarget.dataset.type
      this.setData({
        'activityForm.taskType': t,
        'activityForm.taskConfig': t === 'browse' ? { browseSeconds: 60, minAmount: 0 } : { browseSeconds: 0, minAmount: 100 }
      })
    },
    onActivityRewardFieldChange(e) {
      const { field } = e.currentTarget.dataset
      const value = e.detail.value
      this.setData({ [`activityForm.rewardConfig.${field}`]: value })
    },
    onActivityRewardBtnChange(e) {
      const { field, value } = e.currentTarget.dataset
      this.setData({ [`activityForm.rewardConfig.${field}`]: value })
    },
    onActivityTaskFieldChange(e) {
      const { field } = e.currentTarget.dataset
      const value = e.detail.value
      this.setData({ [`activityForm.taskConfig.${field}`]: value })
    },
    onActivityCategoryPick(e) {
      const idx = parseInt(e.detail.value)
      const cates = this.data.categories || []
      if (idx === 0) {
        this.setData({ activityCategoryIndex: 0, activityCategoryText: '全部分类', 'activityForm.rewardConfig.categoryId': null })
      } else if (idx > 0 && idx <= cates.length) {
        const cat = cates[idx - 1]
        this.setData({
          activityCategoryIndex: idx,
          activityCategoryText: cat.name,
          'activityForm.rewardConfig.categoryId': cat._id
        })
      }
    },
    async onSaveActivity() {
      const form = this.data.activityForm
      const startTime = this._buildMultiDatetime(this.data.multiStartRange, this.data.multiStartIndex)
      const endTime = this._buildMultiDatetime(this.data.multiEndRange, this.data.multiEndIndex)
      if (!form.title.trim()) return wx.showToast({ title: '请输入活动标题', icon: 'none' })
      if (!startTime || !endTime) return wx.showToast({ title: '请选择活动时间', icon: 'none' })
      if (form.type === 'coupon' && !form.rewardConfig.couponValue) return wx.showToast({ title: '请输入优惠券面值', icon: 'none' })
      if (form.type === 'prize' && !form.rewardConfig.prizeName.trim()) return wx.showToast({ title: '请输入奖品名称', icon: 'none' })
      wx.showLoading({ title: '保存中...' })
      try {
        const data = {
          title: form.title.trim(),
          description: form.description.trim(),
          image: form.image,
          type: form.type,
          taskType: form.taskType,
          taskConfig: { ...form.taskConfig },
          rewardConfig: { ...form.rewardConfig },
          startTime,
          endTime,
          status: form.status
        }
        if (this.data.editActivityId) {
          await api.adminUpdateActivity({ activityId: this.data.editActivityId, ...data })
        } else {
          await api.adminAddActivity(data)
        }
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        this.setData({ activityModal: false })
        this.loadActivities()
      } catch (err) { wx.hideLoading(); console.error('onSaveActivity', err) }
    },
    async onToggleActivityStatus(e) {
      const { id, status } = e.currentTarget.dataset
      const nextStatus = status === 'published' ? 'offline' : 'published'
      const label = nextStatus === 'published' ? '发布' : '下架'
      wx.showModal({
        title: '提示', content: `确定${label}该活动？`,
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: `${label}中...` })
            api.adminToggleActivityStatus(id, nextStatus).then(() => {
              wx.hideLoading()
              wx.showToast({ title: `已${label}`, icon: 'success' })
              this.loadActivities()
            })
          }
        }
      })
    },
    async onDeleteActivity(e) {
      const { id } = e.currentTarget.dataset
      wx.showModal({
        title: '提示', content: '确定删除该活动？',
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: '删除中...' })
            api.adminDeleteActivity(id).then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已删除', icon: 'success' })
              this._tabLoaded[6] = true
              this.loadActivities()
            })
          }
        }
      })
    },
  }
}
