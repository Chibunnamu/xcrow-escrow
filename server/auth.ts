import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import type { Express } from "express";
import { getSession } from "./replitAuth";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuth(app: Express) {
  // Use database session store (required for OAuth)
  app.set("trust proxy", 1);
  app.use(getSession());

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.password) {
            return done(null, false, { message: "Please sign in with Google" });
          }

          const isValid = await verifyPassword(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to session (handle both OAuth and local users)
  passport.serializeUser((user: Express.User, done) => {
    const userData = user as any;
    if (userData.claims) {
      // OAuth user
      done(null, { type: 'oauth', data: userData });
    } else {
      // Local user
      done(null, { type: 'local', id: (user as User).id });
    }
  });

  // Deserialize user from session (handle both OAuth and local users)
  passport.deserializeUser(async (data: any, done) => {
    try {
      if (data.type === 'oauth') {
        // OAuth user - fetch the database user using the OAuth sub
        const oauthSub = data.data.claims.sub;
        const user = await storage.getUserByOAuthSub(oauthSub);
        if (!user) {
          return done(new Error('OAuth user not found in database'));
        }
        done(null, user);
      } else {
        // Local user - fetch from database
        const user = await storage.getUser(data.id);
        done(null, user);
      }
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
