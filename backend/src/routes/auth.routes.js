const {Router} = require('express')
const authController = require("../controllers/auth.controller")
const authMiddleware=require("../middlewares/auth.middleware")
const authRouter=Router()

//js doc comments
/**
 * @route POST /api/auth/register
 * @description reg. new user public access
 */
authRouter.post("/register",authController.registerUserController)



/**
 * @route post /api/auth/login
 * @description login user - email n pswd
 * @access public
 */


authRouter.post("/login",authController.loginUserController)


/**
 * @route get/api/auth/logout
 * @descrption clear token from user cookie + add to blacklist
 * @access public
 */

authRouter.get("/logout",authController.logoutUserController)

/**
 * @route get /api/auth/get-me
 * @description curr user details
 * @access private
 */

authRouter.get("/get-me",authMiddleware.authUser,authController.getMeController)


module.exports=authRouter 