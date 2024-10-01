const { now } = require("mongoose")
const Address = require("../models/Address")

const preload = async (ctx) => {
    ctx = {
        uid: ctx.request.body.uid,
        ip: ctx.request.ip
    }
    next()
}
// 查询所有用户的活动情况
const find = async (ctx) => {

}

// 查询某个用户在某个期间的活动记录 (还未实装)
// TODO 测试
const findOne = async (ctx) => {
    // 鉴权
    if (!isAdmin(ctx.session.profile) && ctx.session.profile.uid !== ctx.state.user.uid) {
        ctx.throw(400, 'You do not have permission to ask this user\'s information!')
    }
    const startTime = ctx.params.startTime
    const endTime = ctx.params.endTime
    const userID = ctx.params.userID

    const rule = [
        { 
            $match: {
              activityTime: { $gte: startTime, $lt: endTime },
              userID: userID
            }
        },
        { $sort: { activityTime: -1 } }, // 按activityTime降序排序
        {
            $group: {
                _id: "$activityAddress",
                activities: { $push: "$$ROOT" },
                maxTime: { $max: "$activityTime" }
            }
        },
        { $unwind: "$activities" },
        { $replaceRoot: { newRoot: { $mergeObjects: ["$activities", { activityTime: "$maxTime" }] } } },
        { $sort: { activityTime: -1 } }, // 再次按activityTime降序排序
        { $limit: 3 } // 限制结果数量为3
      ];
    const info = await Address.pipeline(rule)
    console.log(info)
}

// 活动记录保存, 仅在需要确认用户登录的utils\middlewares.js的login中使用
// 仅作为模板, 并不开放控制层端口
const remember = async (ctx) => {
    const updateInfo = await Address.save({
        userID: ctx.session.profile.uid,
        activityAddress: ctx.request.ip
    })
    console.log(updateInfo)
    delete updateInfo
}

// 不修改网页内容, 只在登录时调用
const login = async (ctx) => {
    const userID = ctx.body.profile.uid
    const activityAddress = ctx.body.address
    delete ctx.body.address

    const address = new Address({
        userID: userID,
        activityAddress: activityAddress,
    })
    try {
        const updateInfo = await address.save()
        console.log(updateInfo)
    } catch (err) {
        ctx.throw(400, err.message)
    }
}

module.exports = {
    preload,
    find,
    findOne,
    login,
}
