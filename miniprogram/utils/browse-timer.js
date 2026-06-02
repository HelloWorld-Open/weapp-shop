const api = require('./api')

const _accumulated = {}

class BrowseTimer {
  constructor() {
    this._activityId = ''
    this._target = 0
    this._startTime = 0
    this._timer = null
    this._reported = false
    this._completed = false
    this._onProgress = null
  }

  start(activityId, targetSeconds) {
    if (activityId && activityId !== this._activityId) {
      this._activityId = activityId
      if (!_accumulated[activityId]) _accumulated[activityId] = 0
    }
    if (targetSeconds) this._target = targetSeconds
    if (!this._activityId) return
    this._completed = this._completed || (_accumulated[this._activityId] >= this._target)
    if (this._completed) return
    this._resume()
  }

  onProgress(callback) {
    this._onProgress = callback
  }

  _resume() {
    clearInterval(this._timer)
    this._startTime = Date.now()
    this._reported = false
    this._timer = setInterval(() => {
      const sec = Math.floor((Date.now() - this._startTime) / 1000)
      const total = (_accumulated[this._activityId] || 0) + sec
      const pct = Math.min(100, Math.round(total / this._target * 100))
      const completed = pct >= 100
      this._completed = completed
      if (this._onProgress) this._onProgress(total, pct, completed)
      if (completed && !this._reported) {
        this._reported = true
        this._flush()
      }
    }, 1000)
  }

  async _flush() {
    if (!this._activityId || this._startTime <= 0) return
    const duration = Math.floor((Date.now() - this._startTime) / 1000)
    if (duration <= 0) return
    try {
      const res = await api.browseReport(this._activityId, duration)
      if (res && res.duration !== undefined) _accumulated[this._activityId] = res.duration
      this._startTime = 0
      clearInterval(this._timer)
      this._timer = null
    } catch (e) {
      _accumulated[this._activityId] = (_accumulated[this._activityId] || 0) + duration
    }
  }

  report() {
    return this._flush()
  }

  reset() {
    if (this._activityId) delete _accumulated[this._activityId]
    this._activityId = ''
    this._target = 0
    this._startTime = 0
    this._completed = false
    this._reported = false
    this._onProgress = null
    clearInterval(this._timer)
    this._timer = null
  }

  destroy() {
    this.report()
    this.reset()
  }
}

module.exports = { BrowseTimer }
