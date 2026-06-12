import jwt from "jsonwebtoken"

export const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken"

const ONE_HOUR_IN_MS = 60 * 60 * 1000

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET

    if (!secret) {
        throw new Error("JWT_SECRET is not configured")
    }

    return secret
}

export const getAuthCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production"

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: ONE_HOUR_IN_MS,
        path: "/",
    }
}

export const getAuthClearCookieOptions = () => {
    const { maxAge, ...clearOptions } = getAuthCookieOptions()
    void maxAge

    return clearOptions
}

export const signAuthToken = (user) => {
    return jwt.sign(
        {
            userId: user._id.toString(),
            isAdmin: Boolean(user.isAdmin),
        },
        getJwtSecret(),
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        },
    )
}

export const verifyAuthToken = (token) => {
    return jwt.verify(token, getJwtSecret())
}

export const sanitizeUser = (user) => ({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
})
