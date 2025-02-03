import express from 'express';
import googleCalendarRoutes from './googleCalendar';

const router = express.Router();

// Mount the Google Calendar routes
router.use(googleCalendarRoutes);

export default router; 