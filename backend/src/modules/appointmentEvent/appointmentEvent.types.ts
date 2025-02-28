export interface CreateAppointmentDto {
  title: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  appointmentType: 'in_person' | 'virtual' | 'phone';
  participants: Array<{
    userId: string;
    role: 'provider' | 'client' | 'other';
    name: string;
    email?: string;
    phone?: string;
  }>;
  location?: string;
  additionalNotes?: string;
  organizationId: string;
} 