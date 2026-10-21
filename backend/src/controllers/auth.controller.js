const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000 // 1 day, same as the JWT
}

function signToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )
}

/**
 * @name registerUserController
 * @description register a new user, expects username,email,pswd
 * @access public
 */
async function registerUserController(req, res) {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "provide username,email and password"
        })
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [{ email }, { username }]
    })

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "account already exists with this email or username"
        })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
        username,
        email,
        password: hash
    })

    res.cookie("token", signToken(user), COOKIE_OPTIONS)
    res.status(201).json({
        message: "user registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

/**
 * @name loginUserController
 * @description login a user,expext email n pswd
 * @access public
 */
async function loginUserController(req, res) {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({
            message: "provide email and password"
        })
    }

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    res.cookie("token", signToken(user), COOKIE_OPTIONS)

    res.status(200).json({
        message: "user loggedIn successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

async function logoutUserController(req, res) {
    const token = req.cookies?.token

    if (token) {
        await tokenBlacklistModel.create({ token })
    }

    res.clearCookie("token", COOKIE_OPTIONS)
    return res.status(200).json({
        message: "user logged out successfully"
    })
}

async function getMeController(req, res) {
    const user = await userModel.findById(req.user.id)

    if (!user) {
        return res.status(404).json({
            message: "user not found"
        })
    }

    res.status(200).json({
        message: "user details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}
