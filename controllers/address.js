const Address = require("../models/Address")
const config = require('../config')
const User = require('../models/User')

const preload = async (ctx) => {
    ctx = {
        uid: ctx.request.body.uid,
        ip: ctx.request.ip
    }
    next()
}
// 查询所有用户的活动情况
const find = async (ctx) => {
    // 鉴权
    // if (!isAdmin(ctx.session.profile) && ctx.session.profile.uid !== ctx.state.user.uid) {
    //     ctx.throw(400, 'You do not have permission to ask this user\'s information!')
    // }
    const opt = ctx.request.query
    const filter = {}
    const page = Number.parseInt(opt.page) || 1
    const pageSize = Number.parseInt(opt.pageSize) || 30

    filter.privilege = {
        $in: [ config.privilege.Root, config.privilege.Teacher ],
    }
    // 获取用户表单
    // TODO 增加参加contest的指定
    const result = await User
        .find(filter, { _id: 0, uid: 1, nick: 1, privilege: 1})
        .lean()
        .exec()
        
        
    const userList = result.map(userID => userID.uid);
    // console.log('userID', userList)

    // TODO 按照contest查询, 按照时间范围查询
    const startTime = 0
    const endTime = Date.now()


    let addressList = []
    for (let userID of userList){
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
            { $sort: { activityTime: -1 } }, 
            { $limit: 3 }, 
            { $project: {
                _id: 0,
                userID: 1,
                activityAddress: 1,
                activityTime: 1,
            }}
        ]
        
        const result = await Address.aggregate(rule)
        console.log(result)
        addressList.push(result)
    }
    // console.log(addressList)
    

}

// 查询某个用户在某个期间的活动记录 (还未实装)
const findOne = async (ctx) => {
    // 鉴权
    // if (!isAdmin(ctx.session.profile) && ctx.session.profile.uid !== ctx.state.user.uid) {
    //     ctx.throw(400, 'You do not have permission to ask this user\'s information!')
    // }
    const startTime = ctx.params.startTime || 0
    const endTime = ctx.params.endTime || Date.now()
    const userID = ctx.params.uid

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
        { $sort: { activityTime: -1 } }, 
        { $limit: 3 }, 
        { $project: {
            _id: 0,
            userID: 1,
            activityAddress: 1,
            activityTime: 1,
        }}
    ]
    
    const result = await Address.aggregate(rule)
    // console.log(result)
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
const login = async (ctx, next) => {
    const userID = ctx.body.profile.uid
    const activityAddress = ctx.body.address
    delete ctx.body.address

    const address = new Address({
        userID: userID,
        activityAddress: activityAddress,
    })
    try {
        const updateInfo = await address.save()
        // console.log(updateInfo)
        delete updateInfo
    } catch (err) {
        ctx.throw(400, err.message)
    }
    await next(ctx)
}

module.exports = {
    preload,
    find,
    findOne,
    login,
}
