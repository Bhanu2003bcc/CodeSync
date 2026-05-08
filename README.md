<img width="1056" height="576" alt="screenshot-2026-05-08_10-41-56" src="https://github.com/user-attachments/assets/56b89ba6-dcc5-46ab-adb4-9a453a4611bc" />CodeSync: Real-Time Collaborative Microservices Platform
Overview

CodeSync is a high-performance, distributed platform designed for real-time collaborative code reviews and pair programming. It solves the challenge of synchronization drift in remote collaboration by utilizing an event-driven architecture and specialized data types to ensure all participants maintain a consistent state with sub-50ms latency.  

Architecture

The system is built on a Microservices Architecture, where each domain is isolated to ensure high availability and independent scalability.  

    API Gateway: A reactive gateway that handles central authentication, request routing, and Redis-backed rate limiting.

    Real-time Service: Manages stateful WebSocket connections and utilizes Redis Pub/Sub to synchronize messages across multiple server instances.

    Auth Service: Integrated with GitHub OAuth for secure, streamlined developer onboarding.

    Session Service: Orchestrates the lifecycle of collaborative rooms, managing participant roles and session status.  

Document & Comment Services: Handle persistence for code snapshots and line-level discussions.  
<img width="1056" height="576" alt="screenshot-2026-05-08_10-41-56" src="https://github.com/user-attachments/assets/bad07449-f0c0-4c69-91fe-cc2ba5feaa00" />


Tech Stack

    Backend: Java, Spring Boot, Spring Cloud Gateway   

Real-time: WebSockets, Redis Pub/Sub, CRDT (Conflict-free Replicated Data Types)   

Database: PostgreSQL (Primary persistence), Redis (Caching & Rate limiting)   

    Frontend: React, Vite, Yjs (Shared editing framework)

    Infrastructure: Docker, Docker Compose, Render

Features

    Real-Time Collaborative Editing: Low-latency code propagation using WebSockets and Yjs.  

Conflict-Free Synchronization: Implements CRDTs to handle concurrent edits without data loss.  

Line-Level Commenting: Integrated discussion system allowing reviewers to leave feedback on specific lines of code.  

    GitHub Integration: Fetch repositories and branches directly via GitHub API for review sessions.

    Secure Authentication: JWT-based stateless auth with GitHub OAuth support.

Scalability Features

    Event-Driven Design: Decoupled service communication via Redis Pub/Sub.  

Distributed Rate Limiting: API Gateway uses a Redis-backed Token Bucket algorithm to protect against bursts.

Stateless Services: All backend services are stateless, allowing for horizontal scaling behind the API Gateway.  

Database Isolation: Domain-driven design with separate databases for Auth, Sessions, and Comments to prevent single points of failure.  

API Documentation

The platform provides several key REST endpoints managed through the Gateway:

    POST /api/auth/register - User onboarding.

    GET /api/auth/github/login - GitHub OAuth initiation.

    POST /api/sessions/create - Initialize a new collaborative workspace.  

GET /api/github/repos - Fetch accessible repositories for a user.
