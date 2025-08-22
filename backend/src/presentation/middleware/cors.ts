import cors from 'cors';

export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] // Replace with actual frontend domain
    : ['http://localhost:3000', 'http://localhost:5173'], // Common dev ports for React/Vite
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

export const corsMiddleware = cors(corsOptions);
