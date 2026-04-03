import express from 'express';
import passport from 'passport';
import { 
    register, verifyOTP, login, forgotPassword, resetPassword, 
    resendOTP, verifyResetOTP, refreshAccessToken, logout, getMe,
    googleLogin, googleCallback,
} from '../controllers/authController';

const router = express.Router();

// Middleware to normalize phone_number OR email into req.body.email for Passport
// Since passport local expects a unified 'usernameField' (which we defined as 'email')
const phoneOrEmailAdapter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.body.phone_number && !req.body.email) {
        req.body.email = req.body.phone_number;
    }
    next();
};

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "user@example.com" }
 *               full_name: { type: string }
 *               password: { type: string, description: "Min 8 chars, 1 upper, 1 lower, 1 number, 1 special char" }
 *               confirm_password: { type: string }
 *               phone_number: { type: string }
 */
router.post('/register', register);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email with OTP for new accounts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 */
router.post('/verify-otp', verifyOTP);

/**
 * @swagger
 * /api/v1/auth/resend-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend account verification OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 */
router.post('/resend-otp', resendOTP);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user with credentials
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, description: "Email OR Phone parameter" }
 *               phone_number: { type: string, description: "Email OR Phone parameter (pass one of them)" }
 *               password: { type: string }
 */
router.post('/login', phoneOrEmailAdapter, login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh JWT Access Token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token: { type: string }
 */
router.post('/refresh', refreshAccessToken);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/v1/auth/verify-reset-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Validate reset OTP before actually resetting the password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 */
router.post('/verify-reset-otp', verifyResetOTP);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Finalize changing forgot password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 *               new_password: { type: string, description: "Min 8 chars, 1 upper, 1 lower, 1 number, 1 special char" }
 *               confirm_password: { type: string }
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout and revoke refresh token
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', passport.authenticate('jwt', { session: false }), logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get currently authenticated user profile
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', passport.authenticate('jwt', { session: false }), getMe);

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     tags: [Authentication]
 *     summary: Initiate Google OAuth login flow
 *     description: Redirects user to Google sign-in page. Authorized JavaScript origins must include http://localhost:8080. Redirect URI must be http://localhost:3000/api/v1/auth/google/callback
 */
router.get('/google', googleLogin);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: Google OAuth callback handler
 *     description: Handles the redirect from Google. Issues access_token and refresh_token, then redirects to http://localhost:8080/auth/google/callback?access_token=...&refresh_token=...
 */
router.get('/google/callback', googleCallback);

export default router;
