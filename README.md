# FIDE Chess Tournament Manager

A production-ready full-stack application for managing Swiss-system chess tournaments, built with a focus on scalability, data integrity, and real-world tournament workflows.

This project demonstrates strong backend design, algorithmic implementation, and full-stack integration using modern web technologies.

---

## Key Highlights

- Designed and implemented a complete **full-stack architecture** with a React frontend, Node.js/Express backend, and MySQL database  
- Built **custom Swiss pairing and tie-break algorithms** aligned with real tournament standards  
- Migrated from localStorage to a **normalized relational database schema**, improving data persistence and integrity  
- Implemented **secure authentication** using JWT and bcrypt password hashing  
- Structured the frontend into modular components using **React Router and context-based state management**  
- Developed **late-entry player logic**, dynamically adjusting scores based on missed rounds  
- Enabled **real-time tournament updates** and Excel export for reporting  

---

## System Architecture

### Frontend
- React.js with modular component structure  
- React Router for multi-page navigation  
- Axios with interceptor for authenticated API requests  

### Backend
- RESTful API built with Node.js and Express  
- JWT-based authentication and protected routes  
- Clean separation of concerns (routes, controllers, middleware)  

### Database
- MySQL relational schema:
  - users (authentication)
  - tournaments (configuration and state)
  - players (stats and history)
  - pairings (round data and results)

---

## Notable Features

- Swiss-system pairing engine  
- Buchholz tie-break calculation  
- Live standings and match tracking  
- Late player entry with automatic score adjustment  
- Persistent tournament state across sessions  
- Excel export functionality  

---

## Technical Skills Demonstrated

- Full-Stack Development  
- REST API Design  
- Database Design (MySQL)  
- Authentication & Security (JWT, bcrypt)  
- Algorithm Design (pairing systems, ranking logic)  
- State Management and Frontend Architecture  

---

## Running the Project

### Backend
```bash
cd server
npm install
node server.js
```
### Frontend
```bash
cd src
npm install
npm start
```

