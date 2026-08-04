import jwt from "jsonwebtoken"

export const COOKIE_NAME = process.env.COOKIE_NAME || "accessToken"
export const REFRESH_COOKIE_NAME = "refreshToken"

const ONE_HOUR_IN_MS = 60 * 60 * 1000
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000
const REFRESH_PATH = "/api/v1/auth/refresh"

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
        // "lax" prevents CSRF on cross-site POST/PUT/DELETE requests while
        // still allowing the cookie to be sent on top-level navigations
        // (e.g. when the user clicks a link back to the site from MP).
        // "none" would require Secure + would expose the cookie to any
        // cross-site request, creating a CSRF vector.
        sameSite: "lax",
        maxAge: ONE_HOUR_IN_MS,
        path: "/",
    }
}

export const getAuthClearCookieOptions = () => {
    const { maxAge, ...clearOptions } = getAuthCookieOptions()
    void maxAge

    return clearOptions
}

export const getRefreshCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production"

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: SEVEN_DAYS_IN_MS,
        // Restrict the refresh cookie to the refresh endpoint only, so it
        // is never sent on any other request (reduces exposure surface).
        path: REFRESH_PATH,
    }
}

export const getRefreshClearCookieOptions = () => {
    const { maxAge, ...clearOptions } = getRefreshCookieOptions()
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

export const signRefreshToken = (user) => {
    return jwt.sign(
        {
            userId: user._id.toString(),
            isAdmin: Boolean(user.isAdmin),
        },
        getJwtSecret(),
        {
            expiresIn: "7d",
        },
    )
}

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, getJwtSecret())
    } catch {
        return null
    }
}

export const sanitizeUser = (user) => ({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
})
