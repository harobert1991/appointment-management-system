export interface CreateAppointmentDto {
  title: string;
  startDateTime: string;  // API receives dates as strings
  endDateTime: string;
  appointmentType: 'in_person' | 'virtual' | 'phone';
  participants: {
    userId: string;
    role: 'provider' | 'client' | 'other';
    name: string;
    email?: string;
    phone?: string;
  }[];
  location?: string;
  additionalNotes?: string;
} 