# 优选商城 - 微信小程序

基于微信小程序·云开发的全栈商城项目，包含用户端（购物、下单、评价、活动等）和管理后台（数据看板、商品管理、订单管理等）。

![项目演示](assets/demo/demo.gif)

---

## 快速开始

### 前置条件

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 已认证的微信小程序 AppID
- 已开通微信云开发

### 步骤 1：导入项目

克隆或下载本项目，在微信开发者工具中打开项目根目录。

### 步骤 2：修改 AppID

打开 `project.config.json`，将 `appid` 改为你的小程序 AppID：

```json
"appid": "你的小程序AppID"
```

### 步骤 3：开通云开发

在微信开发者工具中点击工具栏「云开发」按钮，创建一个云环境（如果已有可跳过）。

### 步骤 4：修改云环境 ID

打开 `miniprogram/app.js`，将 `env` 改为你的云环境 ID：

```js
wx.cloud.init({
  env: '你的云环境ID',
  traceUser: true
})
```

### 步骤 5：创建数据库集合

在云开发控制台 → 数据库，创建以下 14 个集合：

| 集合名 | 用途 |
|--------|------|
| `users` | 用户信息 |
| `categories` | 商品分类 |
| `products` | 商品 |
| `carts` | 购物车 |
| `orders` | 订单 |
| `addresses` | 收货地址 |
| `banners` | 轮播图 |
| `searchKeywords` | 搜索关键词 |
| `loginLogs` | 登录日志 |
| `reviews` | 商品评价 |
| `activities` | 营销活动 |
| `userActivities` | 用户活动参与记录 |
| `coupons` | 用户优惠券 |
| `favorites` | 用户收藏 |

所有集合无需手动设置索引，云函数会自动处理。

### 步骤 6：构建 npm + 部署云函数

1. 在微信开发者工具中，右键 `miniprogram/` → **构建 npm**
2. 逐个右键 `cloudfunctions/` 下的每个文件夹 → **上传并部署云函数**

共 18 个云函数，未部署的云函数会导致对应功能不可用。

### 步骤 7：初始化种子数据

1. 右键 `cloudfunctions/init-data/` → **上传并部署云函数**
2. 调用该云函数（可在云开发控制台测试调用）：
   - **首次初始化**：不传参数，自动创建分类、示例商品、轮播图、活动
   - **追加商品**：传参 `{ "action": "addMoreProducts" }`，每个分类追加 10 个商品
   - **清理重复**：传参 `{ "action": "deduplicate" }`，按名称去重

### 完成

登录页使用 `admin` / `admin123` 进入管理后台，或在「普通用户」Tab 输入任意 11 位手机号注册用户端账号。

---

## 功能清单

| 模块 | 功能 |
|------|------|
| 首页 | 轮播图、分类导航、热销推荐、新品首发、销量排行、活动展示 |
| 分类 | 左侧分类树 + 右侧商品列表 |
| 商品列表 | 搜索（热词推荐、输入联想、关键词高亮）、排序（默认/销量/价格）、活动浏览计时 |
| 商品详情 | 图片轮播、收藏、加入购物车、立即购买、评价列表/统计 |
| 购物车 | 增删改、全选、结算 |
| 订单 | 创建订单、模拟支付、取消订单、确认收货、申请退款 |
| 地址 | 新增/编辑/删除/默认地址 |
| 个人中心 | 用户信息、订单入口、收货地址、我的收藏、优惠券、活动奖品、退出登录 |
| 登录注册 | 普通用户手机号登录/注册、管理员固定账号登录 |
| 收藏 | 商品收藏/取消、批量检查、收藏列表 |
| 评价 | 星级评分、图文评价、评价统计（1-5 星分布） |
| 优惠券 | 领券、可用优惠券筛选（按品类/金额）、有效期管理 |
| 营销活动 | 浏览/消费任务、倒计时、优惠券/奖品奖励、进度跟踪 |
| 管理后台 | 7 Tab：数据概览、用户管理、商品 CRUD、订单管理、横幅管理、评价管理、活动管理 |

---

## 项目结构

```
shopping-mall/
├── miniprogram/              # 小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── pages/                # 21 个页面（18 用户端 + 3 管理端）
│   ├── components/           # 公共组件（product-card, empty-state）
│   ├── utils/                # 工具函数（api.js, util.js, config.js 等）
│   └── images/               # Tab 栏图标
├── cloudfunctions/           # 18 个云函数
│   ├── login, user, auth, product, category, cart, order, address
│   ├── admin, admin-stats, home, init-data
│   ├── activity, coupon, favorite, review, search
│   └── migrate-review        # 空（占位）
└── project.config.json
```

---

## 数据库集合说明

| 集合 | 关键字段 |
|------|----------|
| **users** | `openId`, `nickName`, `avatarUrl`, `phone`, `role`, `banned`, `tokens` |
| **categories** | `name`, `icon`, `sortOrder` |
| **products** | `name`, `price`, `stock`, `images`, `categoryId`, `sales`, `status`, `reviewCount`, `reviewTotalRating` |
| **carts** | `openId`, `productId`, `quantity`, `selected` |
| **orders** | `orderNo`, `openId`, `items`, `totalPrice`, `status`, `address`, `remark`, `couponId` |
| **addresses** | `openId`, `name`, `phone`, `region`, `detail`, `isDefault` |
| **banners** | `imageUrl`, `link`, `sortOrder` |
| **searchKeywords** | `keyword`, `count`, `lastSearchTime` |
| **loginLogs** | `openId`, `loginTime` |
| **reviews** | `orderNo`, `productId`, `openId`, `rating`, `content`, `images` |
| **activities** | `title`, `type`, `taskConfig`, `rewardConfig`, `startTime`, `endTime`, `status` |
| **coupons** | `openId`, `value`, `type`, `minAmount`, `categoryId`, `validFrom`, `validTo`, `used` |
| **favorites** | `openId`, `productId`, `createTime` |

订单状态流转：`pending` → `paid` → `shipped` → `delivered`（或 `cancelled` / `refunded`）

---

## 登录注册说明

### 普通用户
- 在登录页选择「普通用户」Tab
- 输入任意 11 位数字即可自动注册/登录
- 无需真实手机号验证

### 管理员
- 在登录页选择「管理员」Tab
- 固定账号：用户名 `admin`，密码 `admin123`
- 登录后进入管理后台，可管理商品、订单、用户、横幅、评价、活动

---

## 附录

### 模拟支付说明

订单支付为模拟实现，支付时弹出确认框，确认后直接修改订单状态为"已支付"，无需接入真实微信支付。详见 `cloudfunctions/order/index.js` 的 `pay` action。

### 性能优化

- 管理后台列表一次性加载 999 条数据（微信云数据库单次上限），无需分页
- 编辑商品返回后**本地更新**，不发起网络请求，滚动位置不丢失
- 用户端商品列表翻页不销毁 DOM，滚动位置不丢失
- 骨架屏仅在首次加载时显示，翻页时只显示底部加载提示
