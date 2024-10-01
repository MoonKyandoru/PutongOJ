const Router = require('koa-router')
const address = require('../controllers/address')
const { auth } = require('../utils/middlewares')


const router = new Router({
    prefix: '/ip',
})
// TODO 完善find, findOne逻辑 (并未实现)
// 列出所有用户
router.get('/list', auth.login, auth.admin, address.find)
// 列出某个用户的详细信息
router.get('/:uid', auth.login, auth.admin, address.findOne)


