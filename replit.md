# Video Streaming Platform

## Overview

This is a full-stack video streaming application built with a modern web stack. The application allows users to upload videos, manage playlists, configure streaming settings, and broadcast video content to streaming platforms. It features a React frontend with a Node.js/Express backend, using PostgreSQL for data persistence and Drizzle ORM for database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Upload**: Multer for handling video file uploads
- **Development**: Hot reload with Vite integration

### Project Structure
- `client/` - React frontend application
- `server/` - Express backend API
- `shared/` - Shared types and schemas between frontend and backend
- `migrations/` - Database migration files

## Key Components

### Database Schema
The application uses three main database tables:
- **videos**: Stores video metadata (title, filename, file size, duration, playlist order)
- **streamConfigs**: Manages streaming platform configurations (platform, stream key, quality settings)
- **streamStatus**: Tracks current streaming state (status, viewer count, uptime, current video)

### API Endpoints
- `GET /api/videos` - Retrieve all videos
- `POST /api/videos` - Upload new video with metadata
- `DELETE /api/videos/:id` - Delete video
- `POST /api/videos/reorder` - Reorder playlist
- `GET/POST /api/stream-config` - Manage streaming configuration
- `GET /api/stream-status` - Get current stream status
- `POST /api/stream/start` - Start streaming
- `POST /api/stream/stop` - Stop streaming

### Frontend Components
- **VideoUpload**: Drag-and-drop file upload with progress tracking
- **PlaylistManager**: Sortable video playlist with drag-and-drop reordering
- **StreamConfig**: Form for configuring streaming settings (platform, quality, bitrate)
- **StreamStatus**: Real-time streaming status display
- **CurrentlyPlaying**: Shows currently playing video information
- **Dashboard**: Main application interface

## Data Flow

1. **Video Upload**: Users drag/drop video files → Multer processes upload → Metadata stored in database → UI updates via React Query
2. **Playlist Management**: Users reorder videos via drag-and-drop → API updates playlist order → Database reflects changes
3. **Stream Configuration**: Users configure streaming settings → Form validation with Zod → Settings saved to database
4. **Stream Control**: Users start/stop streaming → API calls update stream status → Real-time status updates via polling

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **multer**: File upload handling
- **zod**: Runtime type validation
- **react-hook-form**: Form management

### Development Dependencies
- **vite**: Build tool and development server
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Type safety
- **drizzle-kit**: Database migrations

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public/`
2. **Backend**: esbuild bundles server code to `dist/`
3. **Database**: Drizzle migrations ensure schema consistency

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment mode (development/production)
- File uploads stored in local `uploads/` directory

### Development Workflow
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build production artifacts
- `npm run start`: Start production server
- `npm run db:push`: Push database schema changes

## Recent Changes: Latest modifications with dates

### January 15, 2025
- **Database Integration**: Migrated from in-memory storage to PostgreSQL database
  - Created `server/db.ts` with Neon serverless PostgreSQL connection
  - Replaced `MemStorage` with `DatabaseStorage` in `server/storage.ts`
  - Updated all CRUD operations to use Drizzle ORM with proper database queries
  - Ran `npm run db:push` to create database tables
  - Added automatic stream status initialization for new databases

### January 15, 2025 (Earlier)
- **Bug Fixes**: Fixed video upload functionality and stream controls
  - Resolved 400 error on video upload by fixing FormData handling
  - Added missing pause and restart stream endpoints
  - Updated UI components to handle paused stream state
  - Fixed TypeScript errors in storage layer

The application is designed for easy deployment on platforms like Replit, with built-in development tooling and a streamlined build process.