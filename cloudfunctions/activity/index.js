const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

async function verifyToken(uid, token) {
  if (!uid || !token) return false
  const { data: user } = await db.collection('users').doc(uid).get()
  return !!(user && user.tokens && user.tokens.includes(token))
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

    if (action === 'getList') {
    const now = new Date()
    const { data } = await db.collection('activities')
      .where({ status: 'published', endTime: _.gte(now) })
      .field({ _id: true, title: true, description: true, image: true, type: true, taskType: true, startTime: true, endTime: true, rewardConfig: true, claimedCount: true })
      .orderBy('startTime', 'desc')
      .limit(6)
      .get()
    return { success: true, data: { list: data } }
  }

  if (action === 'getDetail') {
    const { activityId } = event
    const { data } = await db.collection('activities').doc(activityId).get()
    if (!data) return { success: false, data: null, message: '活动不存在' }
    if (!event._uid) return { success: true, data: { activity: data, userActivity: null } }
    const { data: ua } = await db.collection('userActivities')
      .where({ activityId, userId: event._uid })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
    return { success: true, data: { activity: data, userActivity: ua[0] || null } }
  }

  if (action === 'startTask') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { activityId } = event
    const { data: activity } = await db.collection('activities').doc(activityId).get()
    if (!activity) return { success: false, data: null, message: '活动不存在' }
    if (activity.status !== 'published') return { success: false, data: null, message: '活动已结束' }
    const now = new Date()
    if (now < new Date(activity.startTime)) return { success: false, data: null, message: '活动未开始' }
    if (now > new Date(activity.endTime)) return { success: false, data: null, message: '活动已结束' }
    const { data: existing } = await db.collection('userActivities')
      .where({ activityId, userId: event._uid })
      .limit(1)
      .get()
    if (existing.length > 0 && existing[0].status !== 'claimed') {
      return { success: false, data: null, message: '已参与该活动' }
    }
    if ((activity.rewardConfig?.totalQuantity || 0) > 0 && activity.claimedCount >= activity.rewardConfig.totalQuantity) {
      return { success: false, data: null, message: '奖品已发完' }
    }
    const res = await db.collection('userActivities').add({
      data: {
        openId: OPENID,
        userId: event._uid,
        activityId,
        status: 'in_progress',
        activityTitle: activity.title,
        activityImage: activity.image,
        activityType: activity.type,
        progress: {
          browseStartedAt: null,
          browseProductId: null,
          browseDuration: 0,
          totalAmount: 0
        },
        claimedAt: null,
        rewardSnapshot: {},
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    return { success: true, data: { userActivityId: res._id } }
  }

  if (action === 'browseReport') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { activityId, duration } = event
    const { data: activity } = await db.collection('activities').doc(activityId).get()
    if (!activity) return { success: false, data: null, message: '活动不存在' }
    const { data: uaList } = await db.collection('userActivities')
      .where({ activityId, userId: event._uid, status: 'in_progress' })
      .limit(1)
      .get()
    if (uaList.length === 0) return { success: false, data: null, message: '未参与活动' }
    const ua = uaList[0]
    const minSeconds = (activity.taskConfig?.browseSeconds) || 0
    const newDuration = (ua.progress.browseDuration || 0) + duration
    const completed = newDuration >= minSeconds
    await db.collection('userActivities').doc(ua._id).update({
      data: {
        status: completed ? 'completed' : 'in_progress',
        'progress.browseDuration': newDuration,
        updateTime: db.serverDate()
      }
    })
    return { success: true, data: { completed, duration: newDuration } }
  }

  if (action === 'claimReward') {
    if (!await verifyToken(event._uid, event._token)) return { success: false, data: null, message: '无权限' }
    const { activityId } = event
    const { data: activity } = await db.collection('activities').doc(activityId).get()
    if (!activity) return { success: false, data: null, message: '活动不存在' }
    if (activity.status !== 'published') return { success: false, data: null, message: '活动已结束' }
    if ((activity.rewardConfig?.totalQuantity || 0) > 0 && activity.claimedCount >= activity.rewardConfig.totalQuantity) {
      return { success: false, data: null, message: '奖品已发完' }
    }
    const { data: uaList } = await db.collection('userActivities')
      .where({ activityId, userId: event._uid, status: 'completed' })
      .limit(1)
      .get()
    if (uaList.length === 0) return { success: false, data: null, message: '任务未完成或已领取' }
    const ua = uaList[0]
    if (ua.status === 'claimed') return { success: false, data: null, message: '已领取过奖励' }

    if (activity.type === 'coupon') {
      const rc = activity.rewardConfig
      const validFrom = new Date()
      const validTo = new Date(validFrom.getTime() + (rc.validDays || 30) * 86400000)

      await db.collection('activities').doc(activityId).update({
        data: { claimedCount: _.inc(1) }
      })

      await db.collection('coupons').add({
        data: {
          openId: OPENID,
          userId: event._uid,
          activityId,
          userActivityId: ua._id,
          activityTitle: activity.title,
          activityImage: activity.image,
          type: rc.couponType || 'fixed',
          value: rc.couponValue || 0,
          minAmount: rc.minAmount || 0,
          categoryId: rc.categoryId || null,
          status: 'available',
          validFrom,
          validTo,
          usedAt: null,
          usedOrderNo: null,
          createTime: db.serverDate()
        }
      })

      await db.collection('userActivities').doc(ua._id).update({
        data: {
          status: 'claimed',
          claimedAt: db.serverDate(),
          rewardSnapshot: _.set({
            type: 'coupon',
            couponType: rc.couponType,
            couponValue: rc.couponValue,
            validDays: rc.validDays
          }),
          updateTime: db.serverDate()
        }
      })

      return { success: true, data: { reward: { type: 'coupon' } } }
    }

    if (activity.type === 'prize') {
      await db.collection('activities').doc(activityId).update({
        data: { claimedCount: _.inc(1) }
      })
      await db.collection('userActivities').doc(ua._id).update({
        data: {
          status: 'claimed',
          claimedAt: db.serverDate(),
          rewardSnapshot: _.set({
            type: 'prize',
            prizeName: activity.rewardConfig.prizeName,
            redeemStartTime: activity.rewardConfig.redeemStartTime,
            redeemEndTime: activity.rewardConfig.redeemEndTime
          }),
          updateTime: db.serverDate()
        }
      })
      return { success: true, data: { reward: { type: 'prize' } } }
    }

    return { success: false, data: null, message: '未知奖励类型' }
  }

  if (action === 'getMyActivities') {
    const { page = 1, pageSize = 20, type, status } = event
    let query = { userId: event._uid }
    if (type) query.activityType = type
    if (status) query.status = status
    const countResult = await db.collection('userActivities').where(query).count()
    const { data } = await db.collection('userActivities')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return { success: true, data: { list: data, total: countResult.total } }
  }

  return { success: false, data: null, message: 'unknown action' }
}
