# MCHGLand - Minecraft Server Management System

## Overview

MCHGLand is a comprehensive Minecraft server management system built with Node.js. It provides both Java and Bedrock edition compatibility through cross-platform plugins, featuring a web-based admin panel for server management and real-time monitoring capabilities.

## System Architecture

### Backend Architecture
- **Node.js** server with Express.js framework
- **WebSocket** integration for real-time communication
- **Child Process Management** for Minecraft server control
- **Event-driven architecture** using EventEmitter patterns

### Frontend Architecture
- **Static HTML/CSS/JavaScript** served by Express
- **WebSocket client** for real-time updates
- **Responsive design** with Font Awesome icons
- **Admin authentication** with passcode protection

### Server Management
- **Minecraft Server Wrapper** class for process management
- **Plugin management** system for cross-platform compatibility
- **Configuration management** for server properties
- **Log streaming** and monitoring capabilities

## Key Components

### 1. MinecraftServer Class (`minecraft-server.js`)
- Manages Minecraft server lifecycle (start/stop/restart)
- Handles server JAR downloads and plugin management
- Monitors server status and player statistics
- Provides event-driven updates for server state changes

### 2. Web Server (`server.js`)
- Express.js application serving static files
- WebSocket server for real-time communication
- RESTful API endpoints for server management
- Client connection management and broadcasting

### 3. Admin Panel (`public/admin.html`, `public/admin.js`)
- Authentication system with passcode protection
- Server control interface (start/stop/restart)
- Operator management functionality
- Real-time log viewing and server monitoring

### 4. Public Interface (`public/index.html`)
- Server information display
- Connection details for players
- Status monitoring dashboard
- Cross-platform compatibility information

### 5. Setup Scripts (`scripts/setup.js`)
- Automated server JAR downloading
- Plugin installation and configuration
- Directory structure creation
- Initial server setup automation

## Data Flow

1. **Client Connection**: Web clients connect via HTTP/WebSocket protocols
2. **Authentication**: Admin access requires passcode verification
3. **Server Control**: Commands flow through WebSocket to server wrapper
4. **Process Management**: Server wrapper manages Minecraft server child process
5. **Status Updates**: Real-time updates broadcast to connected clients
6. **Log Streaming**: Server logs streamed to admin panel in real-time

## External Dependencies

### Node.js Dependencies
- **express**: Web framework for HTTP server
- **ws**: WebSocket library for real-time communication
- **child_process**: Native Node.js module for server process management
- **fs/path**: File system operations and path handling
- **https**: HTTP client for downloading server files

### External Services
- **Minecraft Server JAR**: Downloaded from official Minecraft sources
- **Geyser Plugin**: Cross-platform compatibility (Java/Bedrock)
- **Floodgate Plugin**: Authentication bridge for cross-platform play

### Frontend Dependencies
- **Font Awesome**: Icon library for UI elements
- **WebSocket API**: Browser-native WebSocket implementation

## Deployment Strategy

### Development Environment
- Local Node.js server with hot-reload capabilities
- Direct file system access for server management
- Development-friendly logging and error handling

### Production Environment
- Optimized for cloud deployment platforms (Render, Heroku, etc.)
- Environment variable configuration support
- Persistent file storage for server data
- Process management for server reliability

### Key Considerations
- **Port Configuration**: Uses PORT environment variable for cloud deployment
- **File Permissions**: Proper file system permissions for server JAR execution
- **Memory Management**: Java heap size configuration for Minecraft server
- **Network Configuration**: WebSocket and HTTP port management

## Changelog

- July 07, 2025. Initial setup
- July 07, 2025. Fixed server startup issues and enabled unlimited player capacity
- July 07, 2025. Implemented proper operator management with file persistence

## User Preferences

Preferred communication style: Simple, everyday language.
Server Configuration: Unlimited players (999999 max), 24/7 availability required
Admin Access: Passcode 45982 for owner panel functionality