import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import morgan from 'morgan';
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";

console.log('VITE_API_URL:', process.env.VITE_API_URL);
console.log('Starting server...');

const app = express();

// CORS configuration for cross-origin requests
// This allows the frontend to make API requests to the backend
const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // In production, you might want to restrict this to your actual domain
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://xcrowpay.com',
      'https://www.xcrowpay.com',
      'https://xcrow-b8385.web.app',
      'https://xcrow-b8385.firebaseapp.com',
      /\.firebaseapp\.com$/,
      /\.web\.app$/
    ];
    
    // Allow if origin is in the allowed list or if there's no origin (same-origin requests)
    if (!origin || allowedOrigins.some(allowed => 
      origin === allowed || (allowed instanceof RegExp && allowed.test(origin))
    )) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all for now to debug
    }
  },
  credentials: true, // Allow credentials (cookies) to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Add raw body parsing for webhook routes
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

console.log('Setting up auth...');
// Setup authentication before routes
setupAuth(app);
console.log('Auth setup complete.');

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('Registering routes...');
  const server = await registerRoutes(app);
  console.log('Routes registered.');

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    console.log('Setting up Vite...');
    await setupVite(app, server);
    console.log('Vite setup complete.');
  } else {
    serveStatic(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  console.log(`Attempting to listen on port ${port}...`);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
