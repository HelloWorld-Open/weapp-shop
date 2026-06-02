function formatTime(date) {
  if (!date) return ''
  const raw = typeof date === 'object' && date.$date ? date.$date : date
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function getSession() {
  return wx.getStorageSync('session') || null
}

function isAdmin() {
  const session = getSession()
  return session && session.role === 'admin'
}

function isUser() {
  const session = getSession()
  return session && session.role === 'user'
}

function redirectAdmin() {
  if (isAdmin()) {
    wx.reLaunch({ url: '/pages/admin/admin' })
    return true
  }
  return false
}

function redirectNonAdmin() {
  if (!isAdmin()) {
    wx.reLaunch({ url: '/pages/login/login' })
    return true
  }
  return false
}

function requireUser() {
  const session = getSession()
  if (!session) {
    wx.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 500)
    return false
  }
  if (session.role !== 'user') {
    wx.showToast({ title: '无权限', icon: 'none' })
    return false
  }
  return true
}

const dataCache = {}

function cacheGet(key) {
  const entry = dataCache[key]
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    delete dataCache[key]
    return null
  }
  return entry.data
}

function cacheSet(key, data, ttlSeconds = 120) {
  dataCache[key] = { data, expiry: Date.now() + ttlSeconds * 1000 }
}

function cacheClear(...prefixes) {
  if (prefixes.length === 0) {
    Object.keys(dataCache).forEach(k => delete dataCache[k])
    return
  }
  Object.keys(dataCache).forEach(k => {
    for (const p of prefixes) {
      if (k.startsWith(p)) { delete dataCache[k]; break }
    }
  })
}

function uploadImage(prefix) {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' })
        wx.cloud.uploadFile({
          cloudPath: prefix + '/' + Date.now() + '_' + Math.random().toString(36).slice(-6) + '.jpg',
          filePath: res.tempFilePaths[0],
          success: (upload) => {
            wx.hideLoading()
            wx.showToast({ title: '上传成功', icon: 'success' })
            resolve(upload.fileID)
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '上传失败', icon: 'none' })
            reject(new Error('upload failed'))
          }
        })
      },
      fail: reject
    })
  })
}

module.exports = {
  formatTime,
  getSession,
  isAdmin,
  isUser,
  redirectAdmin,
  redirectNonAdmin,
  requireUser,
  cacheGet,
  cacheSet,
  cacheClear,
  uploadImage
}
