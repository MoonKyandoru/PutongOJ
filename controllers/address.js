const Address = require("../models/Address")
const User = require('../models/User')
const Contest = require('../models/Contest')
const { isAdmin } = require('../utils/helper')

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
    if (!isAdmin(ctx.session.profile) && ctx.session.profile.uid !== ctx.state.user.uid) {
        ctx.throw(400, 'You do not have permission to ask this user\'s information!')
    }
    const opt = ctx.request.query
    const page = Number.parseInt(opt.page) || 1
    const pageSize = Number.parseInt(opt.pageSize) || 30

    let startTime = 0
    let endTime = Date.now()
    let userList = {}
    if(opt.cid) {    // 按照contest的 提交+时间范围 查询, 此查询提供给contest内部
        const cid = Number.parseInt(opt.cid)
        try {
            const contestInfomation = await Contest.findOne(
                {cid: cid},
                'start end ranklist -_id',
                { lean: true },
            )
            startTime = contestInfomation.start
            endTime = contestInfomation.end
            userList = contestInfomation.ranklist
        } catch (err) {
            ctx.throw(err.message)
        }
    } else { // 无限定查询, 此查询提供给全局
        try {
            userList = await User
                .find()
                .select('uid -_id')
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean()
                .exec()
            userList = userList.map(userID => userID.uid)
        } catch (err) {
            ctx.throw(err.message)
        }
    }
    
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
                    _id: { userID: "$userID", activityAddress: "$activityAddress" },
                    maxActivityTime: { $max: "$activityTime" },
                    activity: { $first: "$$ROOT" } // 保留完整的文档
                }
            },
            { 
                $replaceRoot: { newRoot: { $mergeObjects: ["$activity", { activityTime: "$maxActivityTime" }] } } 
            },
            { $sort: { activityTime: -1 } },
            { $limit: 3 },
            { $project: {
                _id: 0,
                userID: 1,
                activityAddress: 1,
                activityTime: 1,
            }}
        ];
        try {
            const result = await Address.aggregate(rule)
            addressList.push(result)
        } catch (err) {
            ctx.throw(err.message)
        }
    }
    ctx = { addressList }
}

// 查询某个用户在某个期间的活动记录
const findOne = async (ctx) => {
    // 鉴权
    if (!isAdmin(ctx.session.profile) && ctx.session.profile.uid !== ctx.state.user.uid) {
        ctx.throw(400, 'You do not have permission to ask this user\'s information!')
    }
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
    const addressList = await Address.aggregate(rule)
    ctx = { addressList }
}

// 活动记录保存, 仅在需要确认用户登录的utils\middlewares.js的login中使用
// 仅作为模板, 并不开放控制层端口
const remember = async (ctx) => {
    const updateInfo = await Address.save({
        userID: ctx.session.profile.uid,
        activityAddress: ctx.request.ip
    })
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
        // console.log(updateInfo)
        delete updateInfo
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
