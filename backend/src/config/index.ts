export * from '../modules/googleCalendarToken/googleCalendarToken.config';
export * from '../rootModules/database/database.config';

export const config = {
  appointment: {
    maxDurationMinutes: parseInt(process.env.MAX_APPOINTMENT_DURATION_MINUTES || '480', 10) // 8 hours default
  }
}; 