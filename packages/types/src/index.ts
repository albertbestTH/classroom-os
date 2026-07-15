export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave';

export interface ClassSession {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}
