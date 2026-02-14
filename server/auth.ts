import { Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { storage } from "./storage.ts";
import { auth as firebaseAuth } from "./firebase.ts";

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      bankCode?: string | null;
      accountNumber?: string | null;
      accountName?: string | null;
      role?: string | null;
      bankAccounts?: {
        paystack?: { bankCode: string; accountNumber: string; accountName: string; recipientCode?: string };
        korapay?: { bankCode: string; accountNumber: string; accountName: string; beneficiaryId?: string };
      };
    }
  }
}

// Helper to extract bank details from new nested structure or fallback to flat (backward compat)
function getBankDetailsFromUser(user: any) {
  // Try new nested structure first
  if (user.bankAccounts?.paystack) {
    return {
      bankCode: user.bankAccounts.paystack.bankCode,
      accountNumber: user.bankAccounts.paystack.accountNumber,
      accountName: user.bankAccounts.paystack.accountName
    };
  }
  // Fallback to old flat structure for backward compatibility
  return {
    bankCode: user.bankCode || undefined,
    accountNumber: user.accountNumber || undefined,
    accountName: user.accountName || undefined
  };
}

export function setupAuth(app: any) {
  // Session middleware (required for Passport)
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Determine if we're running behind a secure connection (HTTPS)
  // This is important for cookie settings in production
  const cookieSecure = isProduction || process.env.REPLIT_DEPLOYMENT === 'true';
  
  // For cross-origin cookies (when frontend is on Firebase and backend is on Render/Replit),
  // we need to use sameSite: 'none' with secure: true
  // For same-origin (when frontend and backend are on same domain), 'lax' is fine
  const cookieSameSite = isProduction ? 'none' : 'lax';
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: cookieSecure, // Enable secure cookies in production
      httpOnly: true,
      sameSite: cookieSameSite, // Use 'none' for cross-origin in production, 'lax' for same-origin in development
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for login (check existing users)
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      // Check if user exists in our Firestore database
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      // For now, simple password check (you might want to implement proper hashing)
      if (user.password !== password) {
        return done(null, false, { message: 'Invalid password' });
      }

      const bankDetails = getBankDetailsFromUser(user);
      return done(null, {
        id: user.id,
        email: user.email!,
        firstName: user.firstName!,
        lastName: user.lastName!,
        bankCode: bankDetails.bankCode,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
        role: (user as any).role,
        bankAccounts: (user as any).bankAccounts
      });
    } catch (error) {
      return done(error);
    }
  }));

  // Google OAuth Strategy (only if credentials are provided)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email provided by Google'));
        }

        // Check if user exists
        let user = await storage.getUserByEmail(email);
        if (!user) {
          // Create new user
          user = await storage.upsertUser({
            oauthSub: profile.id,
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profileImageUrl: profile.photos?.[0]?.value
          });
        }

        return done(null, {
          id: user.id,
          email: user.email!,
          firstName: user.firstName!,
          lastName: user.lastName!,
          bankCode: user.bankCode,
          accountNumber: user.accountNumber,
          accountName: user.accountName,
          role: (user as any).role
        });
      } catch (error) {
        return done(error);
      }
    }));
  }

  // Facebook OAuth Strategy (only if credentials are provided)
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: '/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email provided by Facebook'));
        }

        // Check if user exists
        let user = await storage.getUserByEmail(email);
        if (!user) {
          // Create new user
          user = await storage.upsertUser({
            oauthSub: profile.id,
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profileImageUrl: profile.photos?.[0]?.value
          });
        }

        return done(null, {
          id: user.id,
          email: user.email!,
          firstName: user.firstName!,
          lastName: user.lastName!,
          bankCode: user.bankCode,
          accountNumber: user.accountNumber,
          accountName: user.accountName,
          role: (user as any).role
        });
      } catch (error) {
        return done(error);
      }
    }));
  }

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      const bankDetails = getBankDetailsFromUser(user);
      done(null, {
        id: user.id,
        email: user.email!,
        firstName: user.firstName!,
        lastName: user.lastName!,
        bankCode: bankDetails.bankCode,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName,
        role: (user as any).role,
        bankAccounts: (user as any).bankAccounts
      });
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
}

// Alias for backward compatibility
export const isAuthenticated = requireAuth;

// Hash password function (for backward compatibility)
export async function hashPassword(password: string): Promise<string> {
  // Firebase handles password hashing, so we just return the password
  return password;
}

// Verify password function (for backward compatibility)
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Firebase handles password verification
  return password === hashedPassword;
}
