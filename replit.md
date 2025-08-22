# Overview

This is a full-stack coffee roastery inventory management application built with React and Express. The application helps coffee roasters track their green beans and packaging materials inventory with real-time stock monitoring and management capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.
Change log display preferences: Show "yes → no" instead of "true → false" for boolean values, and ensure all value changes show both old and new values clearly.

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

**Storage Layer**: Implements a PostgreSQL database storage solution using Drizzle ORM with a defined interface (IStorage). The database storage provides full CRUD operations for all inventory types with automatic stock deduction for roasted coffee production and data persistence across restarts.

**Validation**: Request validation using Zod schemas shared between client and server, ensuring type safety across the application.

## Data Models

**Green Beans**: Tracks variety, origin, location, current stock levels, bag labels, webshop status, and last updated timestamps with full change history audit trail.

**Packaging Materials**: Handles different packaging types (coffee bags, post bags) with size variants, stock level monitoring, and minimum stock thresholds.

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