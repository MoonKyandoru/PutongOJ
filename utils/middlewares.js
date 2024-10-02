const { RateLimit } = require('koa2-ratelimit')
const { isAdmin, isRoot } = require('./helper')
const User = require('../models/User')
const Address = require('../models/Address')

const login = async (ctx, next) => {
  if (!ctx.session || ctx.session.profile == null) {// TODO 希望对此部分进行检测, 是否有继续存在的必要
    delete ctx.session.profile
    ctx.throw(401, 'Login required')
  }
  const user = await User.findOne({ uid: ctx.session.profile.uid }).exec()
  if (user == null || user.pwd !== ctx.session.profile.pwd) {
    delete ctx.session.profile
    ctx.throw(401, 'Login required')
    // TODO 检测到这部分的内容似乎不会更改页面右上角的登录显示, 希望进行修正
  } else { // 验证登陆时记录(仅在用户可识别状态下)
    const address = new Address({
      userID: ctx.session.profile.uid,
      activityAddress: ctx.request.ip
    })
    const updateInfo = await address.save()
    // console.log(updateInfo)
    delete updateInfo
  }
  if (user.privilege !== ctx.session.profile.privilege)
    ctx.session.profile.privilege = user.privilege
  await next()
}

const admin = async (ctx, next) => {
  if (ctx.session.profile && isAdmin(ctx.session.profile)) {
    return next()
  } else {
    ctx.throw(403, 'Permission denied')
  }
}

const root = async (ctx, next) => {
  if (ctx.session.profile && isRoot(ctx.session.profile)) {
    return next()
  } else {
    ctx.throw(403, 'Permission denied')
  }
}

const handler = async function (ctx) {
  ctx.status = 429
  ctx.body = {
    error: '请求次数过高，请过一会重试',
  }
  if (this.options && this.options.headers) {
    ctx.set('Retry-After', Math.ceil(this.options.interval / 1000))
  }
}

const solutionCreateRateLimit = RateLimit.middleware({
  interval: { min: 1 },
  max: 60,
  async keyGenerator (ctx) {
    const opt = ctx.request.body
    return `solutions/${opt.pid}| ${ctx.request.ip} `
  },
  handler,
})

const userCreateRateLimit = RateLimit.middleware({
  interval: { min: 1 },
  max: 30,
  prefixKey: 'user',
  handler,
})

module.exports = {
  solutionCreateRateLimit,
  userCreateRateLimit,
  auth: {
    login,
    admin,
    root,
  },
}
