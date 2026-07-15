-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('school_admin', 'teacher');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('scheduled', 'live', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'late', 'absent', 'leave');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('quiz', 'homework', 'exam', 'project', 'participation', 'other');

-- CreateTable
CREATE TABLE "School" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "academicYearId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "userId" UUID,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "studentNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "dateOfBirth" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "homeroomTeacherId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "enrolledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TeachingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "room" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "timetableEntryId" UUID,
    "teacherId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "scheduledStart" TIMESTAMPTZ(3) NOT NULL,
    "scheduledEnd" TIMESTAMPTZ(3) NOT NULL,
    "startedAt" TIMESTAMPTZ(3),
    "endedAt" TIMESTAMPTZ(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "classSessionId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "recordedById" UUID,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "classSessionId" UUID,
    "title" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "maxScore" DECIMAL(7,2) NOT NULL,
    "dueAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "gradedById" UUID,
    "value" DECIMAL(7,2) NOT NULL,
    "feedback" TEXT,
    "gradedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE INDEX "School_isActive_idx" ON "School"("isActive");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_isCurrent_idx" ON "AcademicYear"("schoolId", "isCurrent");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_startsOn_endsOn_idx" ON "AcademicYear"("schoolId", "startsOn", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Term_schoolId_isCurrent_idx" ON "Term"("schoolId", "isCurrent");

-- CreateIndex
CREATE INDEX "Term_schoolId_startsOn_endsOn_idx" ON "Term"("schoolId", "startsOn", "endsOn");

-- CreateIndex
CREATE UNIQUE INDEX "Term_academicYearId_name_key" ON "Term"("academicYearId", "name");

-- CreateIndex
CREATE INDEX "User_schoolId_role_isActive_idx" ON "User"("schoolId", "role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_schoolId_email_key" ON "User"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE INDEX "Teacher_schoolId_isActive_idx" ON "Teacher"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_schoolId_employeeCode_key" ON "Teacher"("schoolId", "employeeCode");

-- CreateIndex
CREATE INDEX "Student_schoolId_lastName_firstName_idx" ON "Student"("schoolId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Student_schoolId_isActive_idx" ON "Student"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_studentNumber_key" ON "Student"("schoolId", "studentNumber");

-- CreateIndex
CREATE INDEX "Classroom_schoolId_gradeLevel_isActive_idx" ON "Classroom"("schoolId", "gradeLevel", "isActive");

-- CreateIndex
CREATE INDEX "Classroom_homeroomTeacherId_idx" ON "Classroom"("homeroomTeacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_schoolId_code_key" ON "Classroom"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Subject_schoolId_name_idx" ON "Subject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Subject_schoolId_isActive_idx" ON "Subject"("schoolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON "Subject"("schoolId", "code");

-- CreateIndex
CREATE INDEX "ClassEnrollment_schoolId_termId_classroomId_isActive_idx" ON "ClassEnrollment"("schoolId", "termId", "classroomId", "isActive");

-- CreateIndex
CREATE INDEX "ClassEnrollment_schoolId_termId_studentId_idx" ON "ClassEnrollment"("schoolId", "termId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_termId_classroomId_studentId_key" ON "ClassEnrollment"("termId", "classroomId", "studentId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_schoolId_termId_teacherId_idx" ON "TeachingAssignment"("schoolId", "termId", "teacherId");

-- CreateIndex
CREATE INDEX "TeachingAssignment_schoolId_termId_classroomId_subjectId_idx" ON "TeachingAssignment"("schoolId", "termId", "classroomId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingAssignment_schoolId_termId_teacherId_classroomId_su_key" ON "TeachingAssignment"("schoolId", "termId", "teacherId", "classroomId", "subjectId");

-- CreateIndex
CREATE INDEX "TimetableEntry_schoolId_termId_weekday_isActive_idx" ON "TimetableEntry"("schoolId", "termId", "weekday", "isActive");

-- CreateIndex
CREATE INDEX "TimetableEntry_schoolId_teacherId_weekday_idx" ON "TimetableEntry"("schoolId", "teacherId", "weekday");

-- CreateIndex
CREATE INDEX "TimetableEntry_schoolId_classroomId_weekday_idx" ON "TimetableEntry"("schoolId", "classroomId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_schoolId_termId_weekday_startTime_classroomI_key" ON "TimetableEntry"("schoolId", "termId", "weekday", "startTime", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_schoolId_termId_weekday_startTime_teacherId_key" ON "TimetableEntry"("schoolId", "termId", "weekday", "startTime", "teacherId");

-- CreateIndex
CREATE INDEX "ClassSession_schoolId_scheduledStart_status_idx" ON "ClassSession"("schoolId", "scheduledStart", "status");

-- CreateIndex
CREATE INDEX "ClassSession_schoolId_teacherId_scheduledStart_idx" ON "ClassSession"("schoolId", "teacherId", "scheduledStart");

-- CreateIndex
CREATE INDEX "ClassSession_schoolId_classroomId_scheduledStart_idx" ON "ClassSession"("schoolId", "classroomId", "scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_timetableEntryId_scheduledStart_key" ON "ClassSession"("timetableEntryId", "scheduledStart");

-- CreateIndex
CREATE INDEX "AttendanceRecord_schoolId_studentId_recordedAt_idx" ON "AttendanceRecord"("schoolId", "studentId", "recordedAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_schoolId_classSessionId_status_idx" ON "AttendanceRecord"("schoolId", "classSessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_classSessionId_studentId_key" ON "AttendanceRecord"("classSessionId", "studentId");

-- CreateIndex
CREATE INDEX "Assessment_schoolId_termId_classroomId_subjectId_idx" ON "Assessment"("schoolId", "termId", "classroomId", "subjectId");

-- CreateIndex
CREATE INDEX "Assessment_schoolId_teacherId_createdAt_idx" ON "Assessment"("schoolId", "teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "Assessment_classSessionId_idx" ON "Assessment"("classSessionId");

-- CreateIndex
CREATE INDEX "Score_schoolId_studentId_gradedAt_idx" ON "Score"("schoolId", "studentId", "gradedAt");

-- CreateIndex
CREATE INDEX "Score_schoolId_assessmentId_idx" ON "Score"("schoolId", "assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_assessmentId_studentId_key" ON "Score"("assessmentId", "studentId");

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_homeroomTeacherId_fkey" FOREIGN KEY ("homeroomTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingAssignment" ADD CONSTRAINT "TeachingAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
