const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const ids = require('./ID')

// 用户id, 用户活动时间, 用户活动地点
const addressSchema = mongoose.Schema({
  id: {
    type: String,
    index: {
      unique: true,
    },
  },
  userID: {
    type: String,
  },
  activityTime: {
    type: Number,
    default: Date.now,
  },
  activityAddress: {
    type: String,
  },
}, {
  collection: 'address',// TODO 记得在提交的时候改成 address
})

addressSchema.plugin(mongoosePaginate)

addressSchema.pre('validate', function (next) {
  // 验证字段 如果希望传入活动时间, 则销毁传入时间
  if(this.activityTime !== null){
    delete this.activityTim;
  }
  next()
})

addressSchema.pre('save', function (next) {
  // 保存
  ids
    .generateId('Address')
    .then((id) => {
      this.id = id
    })
    .then(next)
})

module.exports = mongoose.model('Address', addressSchema)
