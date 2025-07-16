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

### January 16, 2025 - 24x7 Playlist Loop Implementation
- **Added 24x7 Continuous Streaming Loop**: Implemented automatic playlist cycling for non-stop streaming
  - Added `loopPlaylist` field to stream status database schema
  - Created RTMPStreamManager loop functionality that automatically plays next video when current ends
  - Implemented `playNextVideo()` method that cycles through playlist (loops back to first video when reaching end)
  - Added API endpoints for loop control: `/api/stream/loop/enable`, `/api/stream/loop/disable`, `/api/stream/loop/status`
  - Added loop toggle switch in PlaylistManager UI with repeat icon and "24x7 Loop" label
  - Loop state persists across stream sessions and platform changes
  - When loop is enabled and video ends, system automatically starts next video with 1-second delay
  - Loop functionality integrates with existing stream start/stop controls
  - Shows "Next" indicator in playlist for upcoming video when loop is active
  - Stream continues indefinitely until manually stopped, perfect for 24x7 broadcasting

### January 16, 2025 - Platform-Specific Streaming Configuration Fix
- **Fixed Platform-Specific RTMP URL Configuration**: Resolved critical issue with stream platform switching
  - Updated backend routing to properly use custom RTMP URLs for different platforms
  - Fixed platform detection to use saved `rtmpUrl` field from database for custom platforms
  - Enhanced frontend form validation to require RTMP URL for custom platforms
  - Improved UI flow: RTMP URL field now appears immediately after platform selection
  - Added proper validation for RTMP URL format (must start with rtmp://)
  - All platforms now properly save and apply their specific stream keys and URLs:
    - YouTube: `rtmp://a.rtmp.youtube.com/live2`
    - Twitch: `rtmp://live.twitch.tv/app`
    - Facebook: `rtmps://live-api-s.facebook.com:443/rtmp`
    - Custom: Uses user-provided RTMP URL from database
  - Stream configuration persists correctly across platform changes
  - FFmpeg now connects to the correct RTMP endpoint based on saved configuration

### January 16, 2025 - YouTube Streaming Fix & Upload Button Enhancement
- **Fixed Start Stream Button**: Resolved critical YouTube streaming connection issue
  - Updated RTMP configuration to use proper YouTube endpoint: `rtmp://a.rtmp.youtube.com/live2`
  - Fixed platform-specific RTMP URL routing for YouTube, Twitch, and Facebook
  - Eliminated "Cannot assign requested address" errors from localhost:1935 attempts
  - FFmpeg now properly connects to YouTube's RTMP servers with correct stream keys
  - Stream status updates correctly show "live" when streaming to YouTube
  - Added proper platform detection for different streaming services
- **Enhanced Upload Button in Playlist Management**: Fixed non-functional upload button
  - Added complete file upload functionality with hidden file input
  - Implemented file type validation (MP4, AVI, MOV only)
  - Added file size validation (500MB maximum)
  - Upload button shows loading state with spinner during upload
  - Success and error messages provide proper user feedback
  - Playlist automatically refreshes after successful upload
  - Fixed accessibility warning by adding DialogDescription to edit video dialog
  - All existing playlist features remain fully functional

### January 16, 2025 - Stream Status & Settings Enhancement
- **Stream Status Real Data Integration**: Fixed Stream Status component to display actual configuration data
  - Removed hardcoded bitrate value, now shows real bitrate from stream configuration
  - Added comprehensive streaming information: resolution, frame rate, audio quality, platform
  - Connected Stream Status to both stream status and stream configuration APIs
  - Now displays "Not configured" when settings haven't been set up
  - Fixed accessibility warning by adding DialogDescription to settings panel
- **Fully Functional Settings Panel**: Enhanced settings with complete functionality
  - Theme switching between light/dark modes with proper CSS variable support
  - Auto-refresh toggle with configurable interval slider (1-30 seconds)
  - Default streaming quality selector with resolution options
  - Buffer size configuration with visual slider control
  - Auto-restart toggle for failed stream recovery
  - Real-time database connection status indicator
  - Settings persistence in localStorage with proper state management
  - Reset to defaults functionality with user confirmation
  - All settings properly connected to backend and affecting actual functionality
- **Playlist Management Complete Integration**: Enhanced playlist with full streaming integration
  - Current video highlighting with blue border and checkmark indicator
  - Next video in sequence highlighted with green border and "Next" badge
  - Real-time streaming status indicators ("Live", "Selected", "Next")
  - Live streaming badge display in playlist header
  - File size display for each video alongside duration
  - Current video name display in playlist header
  - Proper drag-and-drop reordering with immediate database updates
  - Set video as current functionality fully connected to stream status
  - Visual feedback for all streaming states and playlist positions

### January 16, 2025 - Migration & FFmpeg Fixes
- **Migration to Replit Environment**: Successfully migrated from Replit Agent to Replit
  - Created PostgreSQL database and configured environment variables
  - Fixed FFmpeg integration and connection testing
  - Enhanced Video Quality section with clear FFmpeg settings and save button
  - Fixed resolution format conversion from UI (1920x1080) to FFmpeg (1080p)
  - All video quality settings now properly connect to FFmpeg streaming parameters
  - Installed FFmpeg and Nginx system dependencies for RTMP support
  - Applied database schema migrations to set up video streaming tables
  - Enhanced StreamConfig component with improved Video Quality section
  - Added FFmpeg-specific settings display with clear explanations
  - Fixed resolution format conversion between UI (1920x1080) and FFmpeg (1080p)
  - Added separate save button for video quality settings
  - Improved UI feedback with bitrate quality indicators and FFmpeg alerts
  - Verified all components working correctly in Replit environment

### January 16, 2025 (Earlier)
- **RTMP Streaming Integration**: Implemented real RTMP streaming with FFmpeg
  - Created `server/rtmp.ts` with RTMPStreamManager for actual video streaming
  - Added FFmpeg and Nginx system dependencies for RTMP support
  - Enhanced StreamConfig component with platform-specific streaming settings
  - Added support for YouTube, Twitch, Facebook, and custom RTMP servers
  - Implemented RTMP webhook endpoints for stream monitoring
  - Updated backend routes to use actual RTMP streaming instead of mock functionality
  - Added comprehensive Nginx configuration with HLS and DASH support
  - Organized StreamConfig UI with cards for platform settings and video quality

### January 15, 2025
- **Database Integration**: Migrated from in-memory storage to PostgreSQL database
  - Created `server/db.ts` with Neon serverless PostgreSQL connection
  - Replaced `MemStorage` with `DatabaseStorage` in `server/storage.ts`
  - Updated all CRUD operations to use Drizzle ORM with proper database queries
  - Ran `npm run db:push` to create database tables
  - Added automatic stream status initialization for new databases

### January 15, 2025 (Earlier)
- **UI Enhancements**: Fixed video upload functionality and stream controls
  - Resolved 400 error on video upload by fixing FormData handling
  - Added edit video functionality with dialog modal
  - Added play button to set current video for streaming
  - Added comprehensive settings panel with tabs for general, streaming, and about
  - Simplified stream controls by removing pause button (user preference)
  - Fixed TypeScript errors in storage layer

The application is designed for easy deployment on platforms like Replit, with built-in development tooling and a streamlined build process.