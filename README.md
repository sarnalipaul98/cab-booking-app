# Cab Booking App

A full-stack cab booking application that connects riders and drivers. Riders can book rides, view ride history and receipts, make demo payments, and submit reviews. Drivers can accept rides, update ride status, and view ratings.

## Live Demo

- **Application:** https://cab-booking-app-ruby.vercel.app/
- **Health Check:** https://cab-booking-app-ruby.vercel.app/api/health
- **GitHub Repository:** https://github.com/sarnalipaul98/cab-booking-app

## Features

### Authentication and Profiles
- Rider and driver sign-in and sign-up using Clerk.
- User profile management.
- Profile picture upload.

### Ride Booking
- Riders can create ride requests.
- Drivers can view and accept available rides.
- Drivers can mark rides as in progress and completed.
- Riders can view their ride history.

### Payments and Receipts
- Demo payment status recording.
- Ride receipt page.
- Email receipts using Resend.

**Note:** Payments are simulated. The application does not currently process real-money transactions.

### Ratings and Reviews
- Riders can rate and review completed rides.
- Drivers can view their ratings and reviews.

### Database and API
- Supabase PostgreSQL database.
- API routes for ride booking, driver actions, profiles, receipts, payments, and reviews.
- Server-side handling of sensitive database credentials.

## Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Authentication:** Clerk
- **Database:** Supabase PostgreSQL
- **Email:** Resend
- **Hosting:** Vercel
- **Version Control:** Git and GitHub

## Run Locally

### Prerequisites
- Node.js and npm
- Supabase project and credentials
- Clerk authentication credentials
- Resend API key for email receipts

### Installation

Clone the repository:

```bash
git clone https://github.com/sarnalipaul98/cab-booking-app.git
cd cab-booking-app
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the project root with these variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
RESEND_API_KEY=
EMAIL_FROM=
```

Fill in your own valid credentials. Never commit `.env.local` or publish secret values.

Start the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Production Build and Checks

Run the TypeScript check:

```bash
npx tsc --noEmit
```

Create an optimized production build:

```bash
npm run build
```

## Deployment

The Next.js application and API routes are hosted on Vercel. Supabase provides the database. Environment variables are configured through Vercel project settings.

## Testing

The application has been manually tested for:
- Rider and driver authentication.
- Ride booking and driver acceptance.
- Ride start and completion.
- Demo payments and ride history.
- Receipt viewing and email delivery.
- Ratings and reviews.
- Database health endpoint.

The TypeScript check and production build completed successfully.

## Future Improvements

- Integration with a real payment provider.
- Additional automated security and integration tests.
- Improved ride tracking and production monitoring.

## Author

Sarnali Paul
