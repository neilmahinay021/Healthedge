# HealthEdge Backend

Backend server for the HealthEdge application, providing API endpoints for health monitoring and management.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

- Authentication
  - POST /api/auth/register
  - POST /api/auth/login
  - GET /api/auth/profile

- Health Data
  - GET /api/health/vitals
  - POST /api/health/vitals
  - GET /api/health/workouts
  - POST /api/health/workouts

## Technologies Used

- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Multer for file uploads 