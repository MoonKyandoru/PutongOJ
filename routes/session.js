const Router = require('koa-router')
const session = require('../controllers/session')
const address = require('../controllers/address')

const router = new Router({
  prefix: '/session',
})

router.post('/', session.login, address.login)
router.get('/', session.profile)
router.del('/', session.logout)

module.exports = router
