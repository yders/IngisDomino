# Overview

This is a full-stack coffee roastery inventory management application built with React and Express. The application helps coffee roasters track their green beans, roasted coffee, and packaging materials inventory with real-time stock monitoring and management capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**React + TypeScript SPA**: The client is built as a single-page application using React 18 with TypeScript for type safety. The frontend uses Wouter for lightweight routing and TanStack Query for server state management and caching.

**Component Library**: Built on shadcn/ui components with Radix UI primitives, providing a consistent design system. Components are styled with Tailwind CSS using CSS custom properties for theming.

**State Management**: 
- Server state managed by TanStack Query with optimistic updates
- Form state handled by React Hook Form with Zod validation
- Local UI state managed with React hooks

## Backend Architecture

**Express.js REST API**: The server provides a RESTful API with CRUD operations for three main entities: green beans, roasted coffee, and packaging materials. The API includes request logging middleware and error handling.

**Storage Layer**: Currently implements an in-memory storage solution with a defined interface (IStorage) that can be easily swapped for database implementations. The storage layer provides full CRUD operations for all inventory types.

**Validation**: Request validation using Zod schemas shared between client and server, ensuring type safety across the application.

## Data Models

**Green Beans**: Tracks variety, origin, current stock levels, minimum stock thresholds, and last updated timestamps.

**Roasted Coffee**: Manages variety, roast date, roast level (Light/Medium/Dark), original weight, and current weight tracking.

**Packaging Materials**: Handles different packaging types (coffee bags, post bags) with size variants and stock level monitoring.

## Build System

**Vite Development**: Uses Vite for fast development with Hot Module Replacement and TypeScript support. The build system includes ESBuild for server bundling and optimized production builds.

**Monorepo Structure**: Organized with shared schemas and types between client and server, enabling code reuse and type safety.

# External Dependencies

## Database
- **Drizzle ORM**: Configured for PostgreSQL with schema definitions and migrations
- **Neon Database**: Using @neondatabase/serverless for serverless PostgreSQL connections
- **Connection Management**: Environment-based database URL configuration

## UI Framework
- **Radix UI**: Comprehensive primitive components for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **TypeScript**: Full-stack type safety with shared types
- **Zod**: Runtime type validation and schema generation
- **React Hook Form**: Form management with validation integration
- **Date-fns**: Date manipulation and formatting utilities

## Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Express middleware**: Custom logging and error handling middleware

The application is designed to be easily deployable on Replit with automatic database provisioning and development tooling integration.