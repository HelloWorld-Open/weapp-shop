const api = require('../../utils/api')
const { getSession, uploadImage } = require('../../utils/util')

Page({
  data: {
    nickName: '',
    avatarUrl: '',
    phone: '',
    saving: false
  },

  onLoad() {
    const session = getSession()
    if (!session) {
      wx.navigateBack()
      return
    }

    this.setData({
      nickName: session.nickName || '',
      phone: session.phone || '',
      avatarUrl: session.avatarUrl || ''
    })

    this.loadUserInfo()
  },

  async loadUserInfo() {
    try {
      const res = await api.getUserInfo()
      if (res) {
        this.setData({
          nickName: res.nickName || '',
          avatarUrl: res.avatarUrl || ''
        })
      }
    } catch (err) {
      console.error('loadUserInfo', err)
    }
  },

  onUploadAvatar() {
    uploadImage('avatars').then(fileID => {
      this.setData({ avatarUrl: fileID })
      wx.showToast({ title: '头像已上传，请点击保存', icon: 'success' })
    }).catch(() => { wx.showToast({ title: '头像上传失败', icon: 'none' }) })
  },

  onNicknameInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  async onSave() {
    const { nickName, avatarUrl } = this.data

    if (!nickName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    try {
      const updateData = { nickName: nickName.trim() }
      if (avatarUrl) updateData.avatarUrl = avatarUrl

      await api.updateUserInfo(updateData)
      
      // 更新 session
      const session = getSession()
      wx.setStorageSync('session', { ...session, ...updateData })
      
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' })
      this.setData({ saving: false })
    }
  }
})