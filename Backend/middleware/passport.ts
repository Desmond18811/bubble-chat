// @ts-nocheck
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../models/users';
import bcrypt from 'bcryptjs';

//import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, SERVER_URL } from "./env.js";

passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ 
                $or: [{ email }, { phone_number: email }] 
            }).select('+password');
            if (!user) return done(null, false, { message: 'Incorrect email or password' });
            if (!user.password) return done(null, false, { message: 'Incorrect email or password' });
            
            const isMatch = await bcrypt.compare(password, user.password as string);
            if (!isMatch) return done(null, false, { message: 'Incorrect email or password' });
            
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/v1/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // 1. Existing Google user
            let user = await User.findOne({ googleId: profile.id });
            if (user) return done(null, user);

            // 2. Existing local user with same email → link accounts
            const googleEmail = profile.emails?.[0]?.value;
            if (googleEmail) {
                user = await User.findOne({ email: googleEmail });
                if (user) {
                    user.googleId = profile.id;
                    if (!user.avatar && profile.photos?.[0]?.value) {
                        user.avatar = profile.photos[0].value;
                    }
                    await user.save();
                    return done(null, user);
                }
            }

            // 3. Brand new Google user — auto-generate BubbleID
            const { User: UserModel } = await import('../models/users');
            const crypto = await import('crypto');
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let uniqueTag = 'bubble-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            while (await UserModel.findOne({ uniqueTag })) {
              uniqueTag = 'bubble-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
            }

            user = await User.create({
                googleId: profile.id,
                full_name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
                email: googleEmail,
                avatar: profile.photos?.[0]?.value || '',
                isVerified: true, // Google-verified email
                uniqueTag,
            });

            // Background RSA keypair
            crypto.generateKeyPair('rsa', {
              modulusLength: 2048,
              publicKeyEncoding: { type: 'spki', format: 'pem' },
              privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            }, async (err: any, pub: string, priv: string) => {
              if (!err) await User.findByIdAndUpdate(user!._id, { publicKey: pub, privateKey: priv });
            });

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));
} else {
    console.warn("⚠️ Google OAuth credentials missing. Google login strategy won't be loaded.");
}

if (process.env.JWT_KEY) {
    passport.use(new JwtStrategy({
        jwtFromRequest: ExtractJwt.fromExtractors([
            ExtractJwt.fromAuthHeaderAsBearerToken(),
            (req) => req.headers['x-auth-token']
        ]),
        secretOrKey: process.env.JWT_KEY
    }, async (payload, done) => {
        try {
            const user = await User.findById(payload.id);
            if (user) return done(null, user);
            return done(null, false);
        } catch (err) {
            return done(err);
        }
    }));
} else {
    console.warn("⚠️ JWT_KEY is missing. JWT authentication strategy won't be loaded.");
}

export default passport;