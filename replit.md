# Xcrow - Escrow Transaction Platform

## Overview

Xcrow is a secure escrow transaction platform built with a modern full-stack architecture. The application facilitates safe transactions between buyers and sellers by holding funds until both parties confirm the exchange. It integrates with Paystack for payment processing and provides a complete workflow from transaction creation to completion.

The platform allows sellers to create transaction links, buyers to make payments through Paystack, and both parties to track the transaction status through multiple stages (pending → paid → asset transferred → completed).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming

**Key Design Decisions**:
- Component-based architecture with reusable UI components in `client/src/components/ui/`
- Form validation using Zod schemas shared between frontend and backend
- React Query for caching and synchronizing server state, reducing unnecessary API calls
- Wouter chosen for lightweight routing without React Router overhead

### Backend Architecture

**Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Passport.js with Local Strategy using bcrypt for password hashing
- **Session Management**: Express-session with configurable session store
- **API Design**: RESTful API endpoints organized in `/api/*` routes

**Key Design Decisions**:
- Session-based authentication chosen over JWT for simplicity and built-in CSRF protection
- Bcrypt with 10 salt rounds for password hashing balancing security and performance
- Modular route organization in `server/routes.ts` for maintainability
- Database abstraction layer (`IStorage` interface) allowing for future storage implementations
- Middleware for request logging and error handling

### Database Architecture

**Database**: PostgreSQL via Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database queries
- **Schema Location**: `shared/schema.ts` for shared types between frontend and backend

**Schema Design**:
- **Users Table**: Stores user credentials, profile info, bank account details (bankCode, accountNumber, accountName, recipientCode), and optional referral codes
- **Transactions Table**: Tracks escrow transactions with status workflow and Paystack references
- **Transaction Statuses**: Enforced state machine with four states:
  - `pending`: Initial state after creation
  - `paid`: After successful Paystack payment
  - `asset_transferred`: Seller confirms asset delivery
  - `completed`: Buyer confirms receipt, triggers automatic payout to seller
- **Payouts Table**: Tracks automatic payouts to sellers with status tracking
  - `transactionId`: Unique constraint ensures one payout per transaction (idempotency)
  - `status`: pending → processing → success/failed
  - Stores Paystack transfer codes and references for reconciliation

**Key Design Decisions**:
- UUID primary keys for security and distributed system compatibility
- Decimal type for monetary values to avoid floating-point precision issues
- Unique link generation for transaction sharing
- Foreign key constraints for data integrity
- Timestamps for audit trails (createdAt, updatedAt)
- Unique constraint on payouts.transactionId prevents duplicate transfers

### Authentication & Authorization

**Strategy**: Session-based authentication with Passport.js
- Local strategy with email/password credentials
- Session cookies with httpOnly and sameSite flags for security
- Password hashing with bcrypt (10 salt rounds)
- Session secret from environment variables
- 24-hour session expiration

**Key Design Decisions**:
- Session-based auth chosen for simplicity and automatic CSRF protection
- Sessions stored server-side (default in-memory, extensible to PostgreSQL with connect-pg-simple)
- Secure cookies in production, relaxed in development
- Automatic login after signup for improved UX
- Session regeneration on login to prevent fixation attacks

### Payment & Payout Integration

**Provider**: Paystack API
- **Payment Processing**: Initialize payments with transaction metadata
- **Webhook Validation**: Secure payment verification via webhooks
- **Transfer API**: Automatic payouts to sellers' Nigerian bank accounts
- **Bank Account Verification**: Validate account details before setup
- **Transfer Recipients**: Create Paystack recipients for reliable transfers

**Payment Flow**:
1. Buyer initiates payment → Paystack checkout
2. Payment successful → Webhook sets transaction to "paid"
3. Seller marks asset transferred
4. Buyer confirms receipt → Status becomes "completed"
5. **Automatic payout**: Platform immediately transfers (price - 5% commission) to seller's bank account

**Payout System**:
- **Bank Account Setup** (Settings page):
  - Sellers add Nigerian bank account details
  - System verifies account with Paystack (confirms account name matches)
  - Creates Paystack transfer recipient (recipientCode stored in users table)
- **Automatic Transfers**:
  - Triggered when transaction status becomes "completed"
  - Calculates payout: transaction price - commission (5%)
  - Creates payout record with unique transaction constraint
  - Initiates Paystack transfer with stable reference (PAYOUT-{payoutId})
  - Updates payout status to success/failed based on result
  - Idempotency guards prevent duplicate transfers
- **Payout History**:
  - Sellers view all payouts in dashboard
  - Status tracking: pending → processing → success/failed
  - Shows transaction details, amount, Paystack reference
  - Failed payouts display failure reason

**Key Design Decisions**:
- Paystack chosen for African market focus (particularly Nigeria)
- Transaction metadata includes itemName and transactionId for reconciliation
- Webhook validation for secure payment confirmation
- Payment reference stored in transactions table for audit trail
- Graceful degradation if Paystack key not configured (warnings instead of crashes)
- **Automatic payouts**: No manual withdrawal process, instant transfer on completion
- **Idempotency**: Unique constraint on payouts.transactionId + application-level checks prevent duplicates
- **Stable transfer references**: Use payout ID (not timestamp) for reliable reconciliation
- **Bank account verification**: Ensures accurate payouts before first transfer
- **Transfer error handling**: Failed payouts recorded with reason, don't block transaction completion

## External Dependencies

### Third-Party Services
- **Paystack**: Payment processing API for transaction payments
- **Neon Database**: Serverless PostgreSQL hosting
- **Environment Variables Required**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `PAYSTACK_SECRET_KEY`: Paystack API secret key
  - `SESSION_SECRET`: Express session encryption key

### Key Libraries
- **Frontend**:
  - `@tanstack/react-query`: Server state management
  - `react-hook-form`: Form state management
  - `zod`: Runtime type validation
  - `@radix-ui/*`: Accessible UI primitives
  - `tailwindcss`: Utility-first CSS framework
  - `wouter`: Lightweight routing
  - `axios`: HTTP client for Paystack API

- **Backend**:
  - `express`: Web framework
  - `drizzle-orm`: Type-safe ORM
  - `passport`: Authentication middleware
  - `bcrypt`: Password hashing
  - `express-session`: Session management
  - `@neondatabase/serverless`: Neon database driver

### Build Tools
- **Vite**: Frontend build tool and dev server
- **esbuild**: Backend bundling for production
- **TypeScript**: Type safety across the stack
- **Drizzle Kit**: Database migrations and schema management