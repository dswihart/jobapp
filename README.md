# AI-Powered Job Application Tracker

A modern web application for tracking job applications with intelligent insights and progress visualization.

## Features

- 📊 **Dashboard Overview**: Single-page dashboard with application list and progress charts
- 📋 **Application Management**: Add, edit, and delete job applications
- 👥 **Contact Tracking**: Log contacts and conversations for each application
- 📈 **Progress Visualization**: Interactive charts showing application status distribution
- 🎯 **Kanban Board**: Drag-and-drop board view for managing application pipeline
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Charts**: Recharts
- **Icons**: Heroicons

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd job-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database connection string:
```
DATABASE_URL="postgresql://username:password@localhost:5432/job_tracker?schema=public"
```

4. Set up the database:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main entities:

- **User**: User profile with skills and experience
- **Application**: Job applications with company, role, and status
- **Contact**: Contacts associated with applications

## API Endpoints

- `GET /api/applications` - Get all applications
- `POST /api/applications` - Create new application
- `PUT /api/applications/[id]` - Update application
- `DELETE /api/applications/[id]` - Delete application
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create new contact
- `GET /api/user` - Get user profile
- `PUT /api/user` - Update user profile

## Deployment

### Using Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Development

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Create and run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── ApplicationList.tsx
│   ├── ApplicationBoard.tsx
│   ├── ProgressChart.tsx
│   ├── ApplicationModal.tsx
│   └── ProfileModal.tsx
└── lib/               # Utility functions
    └── prisma.ts      # Prisma client
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
## Documentation

📖 **[Complete Application Documentation](./docs/JOB_TRACKER_DOCUMENTATION.md)**

For comprehensive technical documentation including:
- Complete architecture and deployment details
- Full database schema documentation
- All API endpoints with examples
- AI integration and job matching system
- Component structure and code organization
- Maintenance and troubleshooting guides

See the [docs/](./docs/) directory for additional guides and documentation.


## Documentation Updates (March 7, 2026)

The following docs were added to improve implementation clarity and reduce regression risk:

- docs/CODE_REVIEW_ACTIONS_2026-03-07.md
- docs/API_RESPONSE_CONTRACTS.md
- docs/CURRENT_STATUS_2026-03-07.md

Recommended usage:
- Use CODE_REVIEW_ACTIONS_2026-03-07.md as the short-term engineering checklist.
- Use API_RESPONSE_CONTRACTS.md as the source of truth for API response shapes.
- Use CURRENT_STATUS_2026-03-07.md for the current repository, validation, and risk state.
