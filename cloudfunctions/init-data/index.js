const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { action } = event || {}
  
  if (action === 'addMoreProducts') {
    return addMoreProducts()
  }
  if (action === 'deduplicate') {
    return deduplicateProducts()
  }
  
  const collections = ['users', 'categories', 'products', 'carts', 'orders', 'addresses', 'loginLogs', 'banners', 'activities', 'userActivities', 'coupons', 'reviews', 'favorites', 'searchKeywords']
  for (const name of collections) {
    try { await db.createCollection(name) } catch (e) {}
  }

  const { data: existingCats } = await db.collection('categories').get()
  if (existingCats.length > 0) {
    return { message: '数据已存在，跳过初始化' }
  }

  const categories = [
    { name: '电子产品', icon: '📱', sortOrder: 1 },
    { name: '服装鞋帽', icon: '👕', sortOrder: 2 },
    { name: '食品饮料', icon: '🍜', sortOrder: 3 },
    { name: '家居生活', icon: '🏠', sortOrder: 4 },
    { name: '美妆个护', icon: '💄', sortOrder: 5 },
    { name: '图书文具', icon: '📚', sortOrder: 6 },
    { name: '运动户外', icon: '⚽', sortOrder: 7 },
    { name: '母婴用品', icon: '🍼', sortOrder: 8 }
  ]

  const catIds = {}
  for (const cat of categories) {
    const res = await db.collection('categories').add({ data: cat })
    catIds[cat.name] = res._id
  }

  const products = [
    { name: '无线蓝牙耳机 Pro', description: '主动降噪，30小时续航，IPX5防水', categoryId: catIds['电子产品'], price: 299, originalPrice: 499, images: ['https://img0.baidu.com/it/u=2540939470,1662095319&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 200, sales: 1580, isHot: true, isNew: true, status: 'on' },
    { name: '智能运动手表', description: '心率监测，GPS定位，7天续航', categoryId: catIds['电子产品'], price: 599, originalPrice: 899, images: ['https://img1.baidu.com/it/u=387716803,1895998972&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 150, sales: 980, isHot: true, isNew: true, status: 'on' },
    { name: '便携式充电宝', description: '大容量快充，轻薄便携', categoryId: catIds['电子产品'], price: 129, originalPrice: 199, images: ['https://img0.baidu.com/it/u=1588578098,2879349425&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=971'], stock: 500, sales: 3200, isHot: true, isNew: false, status: 'on' },
    { name: '简约纯棉T恤', description: '100%纯棉，舒适透气', categoryId: catIds['服装鞋帽'], price: 79, originalPrice: 129, images: ['https://img0.baidu.com/it/u=2669489703,2372373015&fm=253&fmt=auto&app=120&f=JPEG?w=800&h=1032'], stock: 300, sales: 2100, isHot: true, isNew: false, status: 'on' },
    { name: '经典牛仔裤', description: '修身版型，复古水洗', categoryId: catIds['服装鞋帽'], price: 199, originalPrice: 299, images: ['https://img0.baidu.com/it/u=1571828473,185331121&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1319'], stock: 200, sales: 890, isHot: false, isNew: true, status: 'on' },
    { name: '有机坚果礼盒', description: '每日坚果混合装，健康零食', categoryId: catIds['食品饮料'], price: 89, originalPrice: 128, images: ['https://t14.baidu.com/it/u=1656914071,1224055906&fm=224&app=112&f=JPEG?w=500&h=500'], stock: 400, sales: 4500, isHot: true, isNew: false, status: 'on' },
    { name: '精品咖啡豆 500g', description: '阿拉比卡，中度烘焙，醇香浓郁', categoryId: catIds['食品饮料'], price: 68, originalPrice: 98, images: ['https://img2.baidu.com/it/u=1643434819,473199956&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=703'], stock: 250, sales: 1200, isHot: false, isNew: true, status: 'on' },
    { name: '北欧风台灯', description: 'LED护眼，三档调光，简约设计', categoryId: catIds['家居生活'], price: 159, originalPrice: 239, images: ['https://picsum.photos/seed/p8/400/400'], stock: 180, sales: 670, isHot: false, isNew: true, status: 'on' },
    { name: '记忆棉枕头', description: '慢回弹，护颈助眠', categoryId: catIds['家居生活'], price: 99, originalPrice: 169, images: ['https://img2.baidu.com/it/u=3534399896,3744613133&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 300, sales: 2800, isHot: true, isNew: false, status: 'on' },
    { name: '保湿面霜', description: '玻尿酸补水，滋润不油腻', categoryId: catIds['美妆个护'], price: 139, originalPrice: 199, images: ['https://img0.baidu.com/it/u=3041874134,3109764269&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=800'], stock: 350, sales: 1900, isHot: true, isNew: false, status: 'on' },
    { name: '畅销小说《破晓》', description: '年度最佳小说，感动千万读者', categoryId: catIds['图书文具'], price: 39, originalPrice: 59, images: ['https://img2.baidu.com/it/u=595682743,1993984541&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'], stock: 500, sales: 5600, isHot: true, isNew: false, status: 'on' },
    { name: '计数跳绳', description: '专业轴承，防缠绕，精准计数', categoryId: catIds['运动户外'], price: 29, originalPrice: 49, images: ['https://t14.baidu.com/it/u=583969131,1149656108&fm=224&app=112&f=JPEG?w=500&h=500'], stock: 600, sales: 3800, isHot: false, isNew: false, status: 'on' },
    { name: '婴儿纯棉睡袋', description: '防踢被，恒温透气，安全舒适', categoryId: catIds['母婴用品'], price: 169, originalPrice: 259, images: ['https://img1.baidu.com/it/u=2764655502,1810473278&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1069'], stock: 150, sales: 760, isHot: false, isNew: true, status: 'on' },
    { name: '蓝牙音箱便携版', description: '360°环绕声，IPX7防水，12小时续航', categoryId: catIds['电子产品'], price: 199, originalPrice: 329, images: ['https://img0.baidu.com/it/u=4208259063,865837248&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=889'], stock: 180, sales: 1450, isHot: true, isNew: true, status: 'on' },
    { name: '防晒霜 SPF50+', description: '清爽不油腻，持久防晒', categoryId: catIds['美妆个护'], price: 89, originalPrice: 139, images: ['https://img1.baidu.com/it/u=2711465375,1471340419&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=633'], stock: 400, sales: 3200, isHot: true, isNew: false, status: 'on' },
  ]

  for (const product of products) {
    await db.collection('products').add({
      data: { ...product, createTime: db.serverDate() }
    })
  }

  const { data: existingBanners } = await db.collection('banners').get()
  let bannerCount = 0
  if (existingBanners.length === 0) {
    const banners = [
      { imageUrl: 'https://img2.baidu.com/it/u=3920151719,1826781671&fm=253&fmt=auto?w=760&h=760', link: '', sortOrder: 0 },
      { imageUrl: 'https://img1.baidu.com/it/u=329523945,1857532210&fm=253&fmt=auto?w=802&h=697', link: '', sortOrder: 1 },
      { imageUrl: 'https://img0.baidu.com/it/u=1555090831,2889616099&fm=253&fmt=auto&app=138&f=JPEG?w=807&h=800', link: '', sortOrder: 3 },
      { imageUrl: 'https://doc-fd.zol-img.com.cn/t_s2000x2000/g7/M00/05/02/ChMkK2gdph2IHUJjAAMkz775Or0AAsJbwOsFYMAAyTn049.jpg', link: '', sortOrder: 2 },
      { imageUrl: 'https://img1.baidu.com/it/u=3694101253,2893718582&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=834', link: '', sortOrder: 4 },
    ]
    for (const banner of banners) {
      await db.collection('banners').add({ data: banner })
    }
    bannerCount = banners.length
  }

  const { data: existingActivities } = await db.collection('activities').get()
  let activityCount = 0
  if (existingActivities.length === 0) {
    await db.collection('activities').add({
      data: {
        title: '双11全球狂欢节',
        description: '完成相关活动，领取超多惊人福利，快去参与吧',
        image: 'https://img2.baidu.com/it/u=3452374119,613150409&fm=253&fmt=auto&app=138&f=JPEG?w=1000&h=500',
        type: 'coupon',
        taskType: 'browse',
        taskConfig: { browseSeconds: 60, minAmount: 0 },
        rewardConfig: { categoryId: null, couponType: 'discount', couponValue: '5', minAmount: 0, prizeImage: '', prizeName: '', totalQuantity: 0, validDays: '7' },
        startTime: new Date('2026-05-18T14:30:00Z'),
        endTime: new Date('2026-05-26T14:30:00Z'),
        status: 'published',
        createTime: db.serverDate()
      }
    })
    activityCount = 1
  }

  return { message: '初始化成功', categories: categories.length, products: products.length, banners: bannerCount, activities: activityCount }
}

// 为每个分类添加10个新商品
async function addMoreProducts() {
  try {
    const { data: categories } = await db.collection('categories').get()
    if (categories.length === 0) {
      return { success: false, message: '分类数据不存在' }
    }

    const catMap = {}
    for (const c of categories) {
      catMap[c.name] = c._id
    }

    const newProducts = [
      // 电子产品 10个
      { name: '智能音箱', description: 'AI语音助手，360°环绕声，智能家居控制中心', categoryId: catMap['电子产品'], price: 299, originalPrice: 499, images: ['https://picsum.photos/seed/elec1/400/400'], stock: 300, sales: 1200, isHot: true, isNew: true, status: 'on' },
      { name: '无线充电器', description: '15W快充，多设备兼容，轻薄便携', categoryId: catMap['电子产品'], price: 89, originalPrice: 129, images: ['https://picsum.photos/seed/elec2/400/400'], stock: 450, sales: 800, isHot: false, isNew: true, status: 'on' },
      { name: '机械键盘', description: '青轴机械手感，RGB背光，87键紧凑布局', categoryId: catMap['电子产品'], price: 249, originalPrice: 399, images: ['https://picsum.photos/seed/elec3/400/400'], stock: 200, sales: 560, isHot: false, isNew: true, status: 'on' },
      { name: 'USB-C扩展坞', description: '7合1多接口，4K HDMI输出，高速数据传输', categoryId: catMap['电子产品'], price: 169, originalPrice: 259, images: ['https://img1.baidu.com/it/u=3776611343,1625489165&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500'], stock: 350, sales: 920, isHot: true, isNew: false, status: 'on' },
      { name: '智能体脂秤', description: '蓝牙连接，测量15项身体数据，全家共享', categoryId: catMap['电子产品'], price: 79, originalPrice: 129, images: ['https://img2.baidu.com/it/u=1194751430,1317580895&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1422'], stock: 280, sales: 1800, isHot: false, isNew: false, status: 'on' },
      { name: '平板电脑支架', description: '多角度调节，铝合金材质，稳固防滑', categoryId: catMap['电子产品'], price: 59, originalPrice: 99, images: ['https://picsum.photos/seed/elec6/400/400'], stock: 500, sales: 2100, isHot: true, isNew: false, status: 'on' },
      { name: '电动牙刷', description: '声波震动，IPX7防水，无线充电', categoryId: catMap['电子产品'], price: 199, originalPrice: 299, images: ['https://img2.baidu.com/it/u=219104548,845566692&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=536'], stock: 220, sales: 1400, isHot: false, isNew: true, status: 'on' },
      { name: '便携投影仪', description: '迷你便携，1080P高清，自动对焦', categoryId: catMap['电子产品'], price: 899, originalPrice: 1299, images: ['https://picsum.photos/seed/elec8/400/400'], stock: 80, sales: 340, isHot: true, isNew: true, status: 'on' },
      { name: '降噪睡眠耳塞', description: '被动降噪，舒适佩戴，透气设计', categoryId: catMap['电子产品'], price: 39, originalPrice: 69, images: ['https://picsum.photos/seed/elec9/400/400'], stock: 600, sales: 2800, isHot: false, isNew: false, status: 'on' },
      { name: '移动硬盘 1TB', description: 'USB3.0高速传输，轻薄便携，加密保护', categoryId: catMap['电子产品'], price: 349, originalPrice: 499, images: ['https://img2.baidu.com/it/u=2497997485,3525795110&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=774'], stock: 150, sales: 670, isHot: false, isNew: false, status: 'on' },

      // 服装鞋帽 10个
      { name: '运动外套', description: '防风防水，透气舒适，立领设计', categoryId: catMap['服装鞋帽'], price: 199, originalPrice: 299, images: ['https://img1.baidu.com/it/u=1582831310,1664930346&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500'], stock: 280, sales: 1500, isHot: true, isNew: false, status: 'on' },
      { name: '运动鞋', description: '缓震回弹，轻便耐磨，网面透气', categoryId: catMap['服装鞋帽'], price: 259, originalPrice: 399, images: ['https://picsum.photos/seed/cloth2/400/400'], stock: 320, sales: 900, isHot: false, isNew: true, status: 'on' },
      { name: '休闲卫衣', description: '加绒保暖，宽松版型，潮流印花', categoryId: catMap['服装鞋帽'], price: 129, originalPrice: 199, images: ['https://picsum.photos/seed/cloth3/400/400'], stock: 250, sales: 1800, isHot: true, isNew: false, status: 'on' },
      { name: '速干短袖', description: '冰丝面料，吸汗速干，运动必备', categoryId: catMap['服装鞋帽'], price: 59, originalPrice: 99, images: ['https://picsum.photos/seed/cloth4/400/400'], stock: 400, sales: 3200, isHot: false, isNew: true, status: 'on' },
      { name: '轻薄羽绒服', description: '90%白鸭绒，保暖不臃肿，可收纳', categoryId: catMap['服装鞋帽'], price: 399, originalPrice: 699, images: ['https://picsum.photos/seed/cloth5/400/400'], stock: 180, sales: 780, isHot: true, isNew: true, status: 'on' },
      { name: '阔腿裤', description: '高腰垂感，修饰腿型，百搭显瘦', categoryId: catMap['服装鞋帽'], price: 149, originalPrice: 229, images: ['https://img1.baidu.com/it/u=2502134780,1669390563&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1196'], stock: 200, sales: 1100, isHot: false, isNew: false, status: 'on' },
      { name: '帆布鞋', description: '经典款型，耐磨帆布，舒适百搭', categoryId: catMap['服装鞋帽'], price: 89, originalPrice: 149, images: ['https://picsum.photos/seed/cloth7/400/400'], stock: 350, sales: 2500, isHot: true, isNew: false, status: 'on' },
      { name: '棒球帽', description: '纯棉透气，可调节大小，多色可选', categoryId: catMap['服装鞋帽'], price: 39, originalPrice: 69, images: ['https://picsum.photos/seed/cloth8/400/400'], stock: 500, sales: 3600, isHot: false, isNew: false, status: 'on' },
      { name: '真丝围巾', description: '100%桑蚕丝，柔滑亲肤，优雅气质', categoryId: catMap['服装鞋帽'], price: 199, originalPrice: 359, images: ['https://picsum.photos/seed/cloth9/400/400'], stock: 120, sales: 450, isHot: false, isNew: true, status: 'on' },
      { name: '连帽卫衣', description: '情侣款，加绒加厚，宽松oversize', categoryId: catMap['服装鞋帽'], price: 169, originalPrice: 259, images: ['https://t15.baidu.com/it/u=487358701,2577650856&fm=224&app=112&f=JPEG?w=500&h=500'], stock: 230, sales: 1600, isHot: true, isNew: true, status: 'on' },

      // 食品饮料 10个
      { name: '有机茶包', description: '精选茶叶，0农残，健康养生', categoryId: catMap['食品饮料'], price: 59, originalPrice: 89, images: ['https://img0.baidu.com/it/u=2587459059,1088889495&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'], stock: 400, sales: 1800, isHot: true, isNew: false, status: 'on' },
      { name: '果汁饮料', description: '100%纯果汁，NFC冷压榨，无添加糖', categoryId: catMap['食品饮料'], price: 39, originalPrice: 59, images: ['https://img2.baidu.com/it/u=593350075,2917197966&fm=253&fmt=auto?w=558&h=500'], stock: 500, sales: 600, isHot: false, isNew: true, status: 'on' },
      { name: '黑巧克力礼盒', description: '72%可可含量，丝滑醇厚，精美礼盒装', categoryId: catMap['食品饮料'], price: 79, originalPrice: 128, images: ['https://img2.baidu.com/it/u=2217318370,2811689485&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=774'], stock: 300, sales: 2100, isHot: true, isNew: true, status: 'on' },
      { name: '冻干咖啡粉', description: '即溶冻干，阿拉比卡，0蔗糖', categoryId: catMap['食品饮料'], price: 49, originalPrice: 79, images: ['https://img0.baidu.com/it/u=1051573148,2049587839&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 450, sales: 1500, isHot: false, isNew: false, status: 'on' },
      { name: '即食燕窝', description: '燕窝含量≥98%，冰糖炖煮，即开即食', categoryId: catMap['食品饮料'], price: 299, originalPrice: 499, images: ['https://img0.baidu.com/it/u=808316279,2113221925&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1059'], stock: 200, sales: 890, isHot: true, isNew: true, status: 'on' },
      { name: '坚果能量棒', description: '燕麦+坚果+蜂蜜，高蛋白饱腹零食', categoryId: catMap['食品饮料'], price: 29, originalPrice: 49, images: ['https://img2.baidu.com/it/u=2159982062,3088475555&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 600, sales: 4200, isHot: false, isNew: false, status: 'on' },
      { name: '气泡水礼盒', description: '0糖0脂，多种果味，清爽解渴', categoryId: catMap['食品饮料'], price: 69, originalPrice: 99, images: ['https://img0.baidu.com/it/u=837047128,1259147553&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 350, sales: 2800, isHot: false, isNew: false, status: 'on' },
      { name: '有机蜂蜜', description: '天然成熟蜜，土蜂蜜，500g装', categoryId: catMap['食品饮料'], price: 89, originalPrice: 139, images: ['https://img2.baidu.com/it/u=1218627871,1594471566&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=654'], stock: 280, sales: 1300, isHot: false, isNew: true, status: 'on' },
      { name: '螺蛳粉', description: '柳州正宗，酸辣鲜香，330g*5包', categoryId: catMap['食品饮料'], price: 49, originalPrice: 79, images: ['https://img2.baidu.com/it/u=589428843,3625168368&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=921'], stock: 500, sales: 5600, isHot: true, isNew: false, status: 'on' },
      { name: '枸杞原浆', description: '鲜果榨取，0添加，小袋装便携', categoryId: catMap['食品饮料'], price: 79, originalPrice: 129, images: ['https://img0.baidu.com/it/u=3718234916,2845774000&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=774'], stock: 320, sales: 980, isHot: false, isNew: true, status: 'on' },

      // 家居生活 10个
      { name: '智能插座', description: '远程控制，定时开关，电量统计', categoryId: catMap['家居生活'], price: 159, originalPrice: 239, images: ['https://img2.baidu.com/it/u=615101034,283520722&fm=253&fmt=auto&app=120&f=JPEG?w=712&h=949'], stock: 350, sales: 1100, isHot: false, isNew: true, status: 'on' },
      { name: '收纳盒套装', description: '多功能收纳，透明设计，可叠加', categoryId: catMap['家居生活'], price: 79, originalPrice: 119, images: ['https://img0.baidu.com/it/u=3943092788,989624663&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=774'], stock: 450, sales: 750, isHot: false, isNew: false, status: 'on' },
      { name: '香薰加湿器', description: '超声波雾化，静音运行，氛围灯', categoryId: catMap['家居生活'], price: 129, originalPrice: 199, images: ['https://img2.baidu.com/it/u=3938852591,1419512624&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'], stock: 280, sales: 1700, isHot: true, isNew: true, status: 'on' },
      { name: '保温水杯', description: '316不锈钢，12小时保温，500ml大容量', categoryId: catMap['家居生活'], price: 89, originalPrice: 149, images: ['https://img1.baidu.com/it/u=223363138,457136996&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=758'], stock: 380, sales: 2900, isHot: true, isNew: false, status: 'on' },
      { name: '硅藻土地垫', description: '速干防滑，易清洁，浴室门口必备', categoryId: catMap['家居生活'], price: 39, originalPrice: 69, images: ['https://img0.baidu.com/it/u=1509565793,961973236&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'], stock: 500, sales: 3500, isHot: false, isNew: false, status: 'on' },
      { name: '懒人沙发', description: '可折叠，舒适支撑，客厅阳台两用', categoryId: catMap['家居生活'], price: 259, originalPrice: 399, images: ['https://img0.baidu.com/it/u=1155366491,1584393377&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=653'], stock: 150, sales: 620, isHot: false, isNew: true, status: 'on' },
      { name: '餐具套装', description: '日式风格，16件套，陶瓷釉下彩', categoryId: catMap['家居生活'], price: 139, originalPrice: 229, images: ['https://img0.baidu.com/it/u=464808373,2116659216&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500'], stock: 200, sales: 880, isHot: true, isNew: false, status: 'on' },
      { name: '真空压缩袋', description: '免抽气泵，节省空间，羽绒服专用', categoryId: catMap['家居生活'], price: 49, originalPrice: 79, images: ['https://img1.baidu.com/it/u=789789007,2612277864&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1061'], stock: 400, sales: 1600, isHot: false, isNew: false, status: 'on' },
      { name: 'LED化妆镜', description: '三色温调节，高清镜面，可充电', categoryId: catMap['家居生活'], price: 119, originalPrice: 179, images: ['https://img0.baidu.com/it/u=2222559337,1001078418&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=859'], stock: 260, sales: 1400, isHot: false, isNew: true, status: 'on' },
      { name: '地毯客厅', description: '加厚短绒，防滑底背，可机洗', categoryId: catMap['家居生活'], price: 199, originalPrice: 329, images: ['https://img1.baidu.com/it/u=1623955234,838299354&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=667'], stock: 180, sales: 720, isHot: false, isNew: false, status: 'on' },

      // 美妆个护 10个
      { name: '眼霜', description: '淡化黑眼圈，紧致眼周，淡化细纹', categoryId: catMap['美妆个护'], price: 299, originalPrice: 499, images: ['https://picsum.photos/seed/beauty1/400/400'], stock: 250, sales: 900, isHot: true, isNew: false, status: 'on' },
      { name: '洗发水', description: '去屑止痒，柔顺发质，无硅油配方', categoryId: catMap['美妆个护'], price: 89, originalPrice: 139, images: ['https://img0.baidu.com/it/u=3163942696,3220397000&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500'], stock: 380, sales: 1300, isHot: false, isNew: true, status: 'on' },
      { name: '精华液', description: '烟酰胺美白，淡化痘印，提亮肤色', categoryId: catMap['美妆个护'], price: 199, originalPrice: 329, images: ['https://img0.baidu.com/it/u=4100455766,2285533851&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=879'], stock: 200, sales: 2100, isHot: true, isNew: true, status: 'on' },
      { name: '护手霜套装', description: '滋润保湿，不油腻，随身便携3支装', categoryId: catMap['美妆个护'], price: 49, originalPrice: 79, images: ['https://picsum.photos/seed/beauty4/400/400'], stock: 500, sales: 3800, isHot: false, isNew: false, status: 'on' },
      { name: '口红', description: '丝绒哑光，持久不脱色，多色号可选', categoryId: catMap['美妆个护'], price: 129, originalPrice: 199, images: ['https://picsum.photos/seed/beauty5/400/400'], stock: 300, sales: 4500, isHot: true, isNew: false, status: 'on' },
      { name: '洁面乳', description: '氨基酸温和清洁，不紧绷，敏感肌适用', categoryId: catMap['美妆个护'], price: 69, originalPrice: 109, images: ['https://img1.baidu.com/it/u=2874293554,2439547827&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=759'], stock: 420, sales: 2800, isHot: false, isNew: false, status: 'on' },
      { name: '面膜礼盒', description: '玻尿酸补水，20片装，每周护理', categoryId: catMap['美妆个护'], price: 99, originalPrice: 169, images: ['https://picsum.photos/seed/beauty7/400/400'], stock: 350, sales: 3200, isHot: false, isNew: true, status: 'on' },
      { name: '防晒喷雾', description: 'SPF50+ PA+++，清爽不油腻，全身可用', categoryId: catMap['美妆个护'], price: 79, originalPrice: 129, images: ['https://picsum.photos/seed/beauty8/400/400'], stock: 380, sales: 1900, isHot: true, isNew: true, status: 'on' },
      { name: '身体乳', description: '烟酰胺+维E，美白保湿，持久留香', categoryId: catMap['美妆个护'], price: 69, originalPrice: 119, images: ['https://img0.baidu.com/it/u=3647424900,485722225&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'], stock: 400, sales: 1600, isHot: false, isNew: false, status: 'on' },
      { name: '男士洗面奶', description: '控油祛痘，深层清洁，清爽不刺激', categoryId: catMap['美妆个护'], price: 59, originalPrice: 99, images: ['https://img0.baidu.com/it/u=2317447216,2665614336&fm=253&fmt=auto&app=120&f=JPEG?w=800&h=800'], stock: 450, sales: 2200, isHot: false, isNew: false, status: 'on' },

      // 图书文具 10个
      { name: '绘本故事书', description: '儿童启蒙，趣味插画，亲子共读', categoryId: catMap['图书文具'], price: 49, originalPrice: 79, images: ['https://img2.baidu.com/it/u=3777631248,250001215&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 300, sales: 600, isHot: true, isNew: false, status: 'on' },
      { name: '钢笔套装', description: '商务办公，经典设计，送墨水礼盒', categoryId: catMap['图书文具'], price: 89, originalPrice: 139, images: ['https://img1.baidu.com/it/u=2824270658,3481744916&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=667'], stock: 350, sales: 450, isHot: false, isNew: true, status: 'on' },
      { name: '手账本', description: 'A5尺寸，方格内页，牛皮封面', categoryId: catMap['图书文具'], price: 39, originalPrice: 69, images: ['https://img1.baidu.com/it/u=381187810,3716443114&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=660'], stock: 400, sales: 1800, isHot: false, isNew: false, status: 'on' },
      { name: '水彩画笔套装', description: '12支专业画笔，不同笔尖，初学者适用', categoryId: catMap['图书文具'], price: 59, originalPrice: 99, images: ['https://t15.baidu.com/it/u=2065226322,469103398&fm=224&app=112&f=JPEG?w=500&h=500'], stock: 200, sales: 560, isHot: true, isNew: true, status: 'on' },
      { name: '编程入门指南', description: 'Python零基础，图解算法，实战项目', categoryId: catMap['图书文具'], price: 69, originalPrice: 109, images: ['https://picsum.photos/seed/book5/400/400'], stock: 350, sales: 2900, isHot: true, isNew: false, status: 'on' },
      { name: '彩色铅笔', description: '72色油性彩铅，色彩鲜艳，绘画必备', categoryId: catMap['图书文具'], price: 79, originalPrice: 129, images: ['https://t15.baidu.com/it/u=4168062725,2339043672&fm=224&app=112&f=JPEG?w=500&h=500'], stock: 280, sales: 1200, isHot: false, isNew: false, status: 'on' },
      { name: '便签贴纸套装', description: '多色便签，创意设计，办公学习用', categoryId: catMap['图书文具'], price: 19, originalPrice: 29, images: ['https://picsum.photos/seed/book7/400/400'], stock: 600, sales: 4200, isHot: false, isNew: false, status: 'on' },
      { name: '英文原版小说', description: '经典文学，平装版，词汇量适中', categoryId: catMap['图书文具'], price: 49, originalPrice: 79, images: ['https://img2.baidu.com/it/u=3745271009,3566452432&fm=253&fmt=auto&app=138&f=JPEG?w=503&h=500'], stock: 250, sales: 780, isHot: false, isNew: true, status: 'on' },
      { name: '书立架', description: '可调节角度，阅读书写两用，防近视', categoryId: catMap['图书文具'], price: 69, originalPrice: 109, images: ['https://picsum.photos/seed/book9/400/400'], stock: 300, sales: 950, isHot: false, isNew: false, status: 'on' },
      { name: '日历2026', description: '插画风格，每月主题，可撕设计', categoryId: catMap['图书文具'], price: 29, originalPrice: 49, images: ['https://picsum.photos/seed/book10/400/400'], stock: 400, sales: 1500, isHot: false, isNew: true, status: 'on' },

      // 运动户外 10个
      { name: '瑜伽垫', description: '防滑加厚，舒适支撑，附收纳绑带', categoryId: catMap['运动户外'], price: 129, originalPrice: 199, images: ['https://img1.baidu.com/it/u=3729412679,4061879141&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 400, sales: 1600, isHot: true, isNew: false, status: 'on' },
      { name: '篮球', description: '专业比赛用球，耐磨PU，标准7号', categoryId: catMap['运动户外'], price: 159, originalPrice: 239, images: ['https://picsum.photos/seed/sport2/400/400'], stock: 280, sales: 700, isHot: false, isNew: true, status: 'on' },
      { name: '跑步腰包', description: '弹性透气，手机钥匙收纳，不晃动', categoryId: catMap['运动户外'], price: 49, originalPrice: 79, images: ['https://img0.baidu.com/it/u=418931159,3061575754&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=774'], stock: 350, sales: 2400, isHot: false, isNew: false, status: 'on' },
      { name: '哑铃套装', description: '包胶哑铃，20kg一对，防滑握把', categoryId: catMap['运动户外'], price: 199, originalPrice: 329, images: ['https://img0.baidu.com/it/u=3602215988,3094187424&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=1067'], stock: 180, sales: 1100, isHot: true, isNew: true, status: 'on' },
      { name: '保温运动水壶', description: '750ml大容量，单手开盖，不漏水', categoryId: catMap['运动户外'], price: 69, originalPrice: 109, images: ['https://picsum.photos/seed/sport5/400/400'], stock: 400, sales: 3100, isHot: true, isNew: false, status: 'on' },
      { name: '跳绳专业款', description: '钢丝轴承，可调节长度，计数功能', categoryId: catMap['运动户外'], price: 39, originalPrice: 69, images: ['https://picsum.photos/seed/sport6/400/400'], stock: 450, sales: 3600, isHot: false, isNew: false, status: 'on' },
      { name: '护膝', description: '运动护膝，透气加压，髌骨支撑', categoryId: catMap['运动户外'], price: 89, originalPrice: 149, images: ['https://picsum.photos/seed/sport7/400/400'], stock: 300, sales: 1800, isHot: false, isNew: true, status: 'on' },
      { name: '登山杖', description: '铝合金材质，伸缩便携，防滑手柄', categoryId: catMap['运动户外'], price: 119, originalPrice: 189, images: ['https://picsum.photos/seed/sport8/400/400'], stock: 200, sales: 520, isHot: false, isNew: false, status: 'on' },
      { name: '泳镜', description: '防水防雾，高清镜片，可替换鼻桥', categoryId: catMap['运动户外'], price: 59, originalPrice: 99, images: ['https://img2.baidu.com/it/u=2608807760,2687477596&fm=253&fmt=auto&app=138&f=JPEG?w=507&h=500'], stock: 350, sales: 1300, isHot: false, isNew: true, status: 'on' },
      { name: '弹力带套装', description: '5条不同阻力，多功能健身，便携', categoryId: catMap['运动户外'], price: 29, originalPrice: 49, images: ['https://img0.baidu.com/it/u=1421232241,2059438163&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500'], stock: 500, sales: 2800, isHot: false, isNew: false, status: 'on' },

      // 母婴用品 10个
      { name: '婴儿车', description: '轻便折叠，一键收车，可坐可躺', categoryId: catMap['母婴用品'], price: 599, originalPrice: 899, images: ['https://picsum.photos/seed/baby1/400/400'], stock: 200, sales: 500, isHot: true, isNew: false, status: 'on' },
      { name: '奶瓶套装', description: '宽口径，防胀气设计，PPSU材质', categoryId: catMap['母婴用品'], price: 159, originalPrice: 239, images: ['https://img1.baidu.com/it/u=472938180,301179130&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=651'], stock: 350, sales: 1100, isHot: false, isNew: true, status: 'on' },
      { name: '纸尿裤', description: '超薄透气，瞬吸干爽，XL码60片', categoryId: catMap['母婴用品'], price: 129, originalPrice: 199, images: ['https://picsum.photos/seed/baby3/400/400'], stock: 500, sales: 3200, isHot: true, isNew: false, status: 'on' },
      { name: '婴儿背带', description: '人体工学设计，减压肩带，四季通用', categoryId: catMap['母婴用品'], price: 229, originalPrice: 359, images: ['https://picsum.photos/seed/baby4/400/400'], stock: 150, sales: 420, isHot: false, isNew: true, status: 'on' },
      { name: '幼儿餐具套装', description: '食品级硅胶，防摔设计，卡通造型', categoryId: catMap['母婴用品'], price: 69, originalPrice: 109, images: ['https://picsum.photos/seed/baby5/400/400'], stock: 300, sales: 1800, isHot: false, isNew: false, status: 'on' },
      { name: '婴儿湿巾', description: '无酒精无香精，加厚80抽*12包', categoryId: catMap['母婴用品'], price: 89, originalPrice: 139, images: ['https://picsum.photos/seed/baby6/400/400'], stock: 600, sales: 4500, isHot: true, isNew: false, status: 'on' },
      { name: '儿童安全座椅', description: 'isofix接口，正反安装，3-12岁适用', categoryId: catMap['母婴用品'], price: 899, originalPrice: 1399, images: ['https://picsum.photos/seed/baby7/400/400'], stock: 100, sales: 280, isHot: false, isNew: true, status: 'on' },
      { name: '婴儿衣服礼盒', description: '纯棉A类，四季款6件套，送礼首选', categoryId: catMap['母婴用品'], price: 199, originalPrice: 329, images: ['https://picsum.photos/seed/baby8/400/400'], stock: 200, sales: 670, isHot: false, isNew: false, status: 'on' },
      { name: '婴儿理发器', description: '静音低震，陶瓷刀头，可水洗', categoryId: catMap['母婴用品'], price: 109, originalPrice: 169, images: ['https://picsum.photos/seed/baby9/400/400'], stock: 180, sales: 520, isHot: false, isNew: true, status: 'on' },
      { name: '儿童水杯', description: '吸管式，防喷防漏，316不锈钢', categoryId: catMap['母婴用品'], price: 79, originalPrice: 129, images: ['https://picsum.photos/seed/baby10/400/400'], stock: 350, sales: 2100, isHot: false, isNew: false, status: 'on' },
    ]

    const batch = newProducts.map(p => ({ ...p, createTime: db.serverDate() }))
    const batchSize = 20
    for (let i = 0; i < batch.length; i += batchSize) {
      const chunk = batch.slice(i, i + batchSize)
      await db.collection('products').add({ data: chunk })
    }

    return { success: true, message: '成功添加80个新商品', productsAdded: newProducts.length }
  } catch (error) {
    console.error('添加商品失败:', error)
    return { success: false, message: '添加商品失败', error: error.message }
  }
}

// 清理重复商品，按 name 去重，保留最新一条
async function deduplicateProducts() {
  try {
    const seen = {}
    const toDelete = []
    const pageSize = 100
    let offset = 0

    while (true) {
      const { data: products } = await db.collection('products')
        .field({ _id: true, name: true })
        .orderBy('_id', 'desc')
        .skip(offset)
        .limit(pageSize)
        .get()

      if (products.length === 0) break

      for (const p of products) {
        if (seen[p.name]) {
          toDelete.push(p._id)
        } else {
          seen[p.name] = true
        }
      }
      offset += products.length
    }

    for (let i = 0; i < toDelete.length; i += 20) {
      const chunk = toDelete.slice(i, i + 20)
      await db.collection('products').where({ _id: db.command.in(chunk) }).remove()
    }

    return { success: true, message: `扫描 ${offset} 条，删除 ${toDelete.length} 条重复，剩余 ${Object.keys(seen).length} 条` }
  } catch (error) {
    return { success: false, message: '清理失败', error: error.message }
  }
}
