const api = require('../../../utils/api')
const { uploadImage } = require('../../../utils/util')

module.exports = {
  data: {
    users: [], userPage: 1, userHasMore: true, userKeyword: '',
    userEditModal: false, editUserId: '', editUserName: '', editUserPhone: '', editUserAvatar: '', editUserBanned: false,
  },
  methods: {
    async loadUsers(reset) {
      if (this.data.usersLoading) return
      this.setData({ usersLoading: true })
      if (reset) this.setData({ userPage: 1, users: [] })
      try {
        const res = await api.adminGetUsers({ page: this.data.userPage, keyword: this.data.userKeyword })
        const list = (res.list || []).map(u => ({
          ...u, displayName: u.nickName || '用户' + (u.phone || '').slice(-4)
        }))
        this.setData({
          users: reset ? list : [...this.data.users, ...list],
          userPage: this.data.userPage + 1,
          userHasMore: (reset ? list.length : this.data.users.length + list.length) < res.total,
          usersLoading: false
        })
      } catch (err) { this.setData({ usersLoading: false }); console.error('loadUsers', err) }
    },
    onSearchUser() { this.loadUsers(true) },
    onChangeUserKeyword(e) {
      this.setData({ userKeyword: e.detail.value })
      this._userSearchDebounce()
    },
    onDeleteUser(e) {
      wx.showModal({
        title: '提示', content: '确定删除该用户？',
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: '删除中...' })
            api.adminDeleteUser(e.currentTarget.dataset.id).then(() => {
              wx.hideLoading()
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadUsers(true)
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '删除失败', icon: 'none' })
            })
          }
        }
      })
    },
    onOpenEditUser(e) {
      const user = e.currentTarget.dataset.user
      this.setData({
        userEditModal: true,
        editUserId: user._id,
        editUserName: user.nickName || '',
        editUserPhone: user.phone || '',
        editUserAvatar: user.avatarUrl || '',
        editUserBanned: !!user.banned
      })
    },
    onCloseEditUser() {
      this.setData({ userEditModal: false })
    },
    onEditNameInput(e) {
      this.setData({ editUserName: e.detail.value })
    },
    onEditAvatar() {
      uploadImage('avatars').then(fileID => this.setData({ editUserAvatar: fileID })).catch(() => { wx.showToast({ title: '头像上传失败', icon: 'none' }) })
    },
    async onSaveEditUser() {
      const { editUserId, editUserName, editUserAvatar } = this.data
      if (!editUserName.trim()) {
        return wx.showToast({ title: '请输入昵称', icon: 'none' })
      }
      wx.showLoading({ title: '保存中...' })
      try {
        await api.adminUpdateUser({ userId: editUserId, nickName: editUserName.trim(), avatarUrl: editUserAvatar })
        wx.hideLoading()
        wx.showToast({ title: '已更新', icon: 'success' })
        this.setData({ userEditModal: false })
        this._tabLoaded[1] = true
        this.loadUsers(true)
      } catch (err) { wx.hideLoading(); console.error('onSaveEditUser', err) }
    },
    async onToggleBan(e) {
      const { id, banned } = e.currentTarget.dataset
      const isBanned = banned === 'true' || banned === true
      const label = isBanned ? '启用' : '禁用'
      wx.showModal({
        title: '提示', content: `确定${label}该用户？`,
        success: (r) => {
          if (r.confirm) {
            wx.showLoading({ title: `${label}中...` })
            api.adminToggleBan(id).then((res) => {
              wx.hideLoading()
              wx.showToast({ title: res.banned ? '已禁用' : '已启用', icon: 'success' })
              this._tabLoaded[1] = true
              this.loadUsers(true)
            }).catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '操作失败', icon: 'none' })
            })
          }
        }
      })
    },
  }
}
