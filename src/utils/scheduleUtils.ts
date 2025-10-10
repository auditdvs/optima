import { supabase } from '../lib/supabaseClient';

export interface DataAccessSchedule {
  id: number;
  name: string;
  description?: string;
  is_enabled: boolean;
  schedule_type: '24/7' | 'custom' | 'business_hours';
  start_time: string;
  end_time: string;
  timezone: string;
  allowed_days: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Check if data access is currently allowed based on active schedules
 */
export const isDataAccessAllowed = async (): Promise<{
  allowed: boolean;
  reason?: string;
  activeSchedule?: DataAccessSchedule;
}> => {
  try {
    // Get all enabled schedules
    const { data: schedules, error } = await supabase
      .from('data_access_schedule')
      .select('*')
      .eq('is_enabled', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schedules:', error);
      // If we can't fetch schedules, allow access (fail open)
      return { allowed: true, reason: 'Unable to verify schedule, allowing access' };
    }

    if (!schedules || schedules.length === 0) {
      // No schedules configured, allow access
      return { allowed: true, reason: 'No access schedules configured' };
    }

    // Get current time in Jakarta timezone (default)
    const now = new Date();
    const currentTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(now);

    const currentDay = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long'
    }).format(now).toLowerCase();

    // Check each active schedule
    for (const schedule of schedules) {
      const result = checkScheduleAllows(schedule, currentTime, currentDay);
      if (result.allowed) {
        return {
          allowed: true,
          reason: `Access allowed by schedule: ${schedule.name}`,
          activeSchedule: schedule
        };
      }
    }

    // No schedule allows access
    const primarySchedule = schedules[0];
    return {
      allowed: false,
      reason: getAccessDeniedReason(primarySchedule, currentTime, currentDay),
      activeSchedule: primarySchedule
    };

  } catch (error) {
    console.error('Error checking data access:', error);
    // On error, allow access (fail open)
    return { allowed: true, reason: 'Error checking schedule, allowing access' };
  }
};

/**
 * Check if a specific schedule allows access at the given time
 */
const checkScheduleAllows = (
  schedule: DataAccessSchedule,
  currentTime: string,
  currentDay: string
): { allowed: boolean; reason?: string } => {
  // 24/7 access always allows
  if (schedule.schedule_type === '24/7') {
    return { allowed: true, reason: '24/7 access enabled' };
  }

  // Check if current day is allowed
  if (!schedule.allowed_days.includes(currentDay)) {
    return { 
      allowed: false, 
      reason: `Access not allowed on ${currentDay}s` 
    };
  }

  // Check time range
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(schedule.start_time);
  const end = timeToMinutes(schedule.end_time);

  // Handle overnight schedules (e.g., 22:00 - 06:00)
  if (start > end) {
    if (current >= start || current <= end) {
      return { allowed: true, reason: 'Within allowed time range' };
    }
  } else {
    // Normal schedules (e.g., 09:00 - 17:00)
    if (current >= start && current <= end) {
      return { allowed: true, reason: 'Within allowed time range' };
    }
  }

  return { 
    allowed: false, 
    reason: `Outside allowed time range (${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)})` 
  };
};

/**
 * Get a user-friendly reason for access denial
 */
const getAccessDeniedReason = (
  schedule: DataAccessSchedule,
  _currentTime: string,
  currentDay: string
): string => {
  if (schedule.schedule_type === '24/7') {
    return 'Access is currently disabled';
  }

  if (!schedule.allowed_days.includes(currentDay)) {
    const allowedDays = schedule.allowed_days.map(day => 
      day.charAt(0).toUpperCase() + day.slice(1)
    ).join(', ');
    return `Data access is only allowed on: ${allowedDays}`;
  }

  const startTime = schedule.start_time.slice(0, 5);
  const endTime = schedule.end_time.slice(0, 5);
  return `Data access is only allowed between ${startTime} - ${endTime} (${schedule.timezone})`;
};

/**
 * Convert time string (HH:MM or HH:MM:SS) to minutes since midnight
 */
const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Get the next available access time based on active schedules
 */
export const getNextAccessTime = async (): Promise<{
  nextTime?: string;
  schedule?: DataAccessSchedule;
}> => {
  try {
    const { data: schedules, error } = await supabase
      .from('data_access_schedule')
      .select('*')
      .eq('is_enabled', true)
      .order('created_at', { ascending: false });

    if (error || !schedules || schedules.length === 0) {
      return {};
    }

    // Find the earliest next access time from all schedules
    const now = new Date();
    let earliestNext: Date | null = null;
    let earliestSchedule: DataAccessSchedule | null = null;

    for (const schedule of schedules) {
      if (schedule.schedule_type === '24/7') {
        return {
          nextTime: 'Always available',
          schedule
        };
      }

      const nextTime = calculateNextAccessTime(schedule, now);
      if (nextTime && (!earliestNext || nextTime < earliestNext)) {
        earliestNext = nextTime;
        earliestSchedule = schedule;
      }
    }

    if (earliestNext && earliestSchedule) {
      return {
        nextTime: earliestNext.toLocaleString('id-ID', {
          timeZone: earliestSchedule.timezone,
          dateStyle: 'full',
          timeStyle: 'short'
        }),
        schedule: earliestSchedule
      };
    }

    return {};
  } catch (error) {
    console.error('Error calculating next access time:', error);
    return {};
  }
};

/**
 * Calculate the next access time for a specific schedule
 */
const calculateNextAccessTime = (
  schedule: DataAccessSchedule,
  from: Date
): Date | null => {
  if (schedule.schedule_type === '24/7') {
    return from; // Always accessible
  }

  const daysOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Try next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDate = new Date(from);
    checkDate.setDate(checkDate.getDate() + dayOffset);
    
    const checkDayName = daysOrder[checkDate.getDay()];
    
    if (schedule.allowed_days.includes(checkDayName)) {
      // Set the time to start time
      const [hours, minutes] = schedule.start_time.split(':').map(Number);
      checkDate.setHours(hours, minutes, 0, 0);
      
      // If it's today and the time hasn't passed yet, or it's a future day
      if (dayOffset > 0 || checkDate > from) {
        return checkDate;
      }
    }
  }
  
  return null;
};

/**
 * Format schedule information for display
 */
export const formatScheduleInfo = (schedule: DataAccessSchedule): string => {
  if (schedule.schedule_type === '24/7') {
    return 'Available 24/7';
  }

  const days = schedule.allowed_days.map(day => 
    day.charAt(0).toUpperCase() + day.slice(1, 3)
  ).join(', ');
  
  const startTime = schedule.start_time.slice(0, 5);
  const endTime = schedule.end_time.slice(0, 5);
  
  return `${days}, ${startTime} - ${endTime} (${schedule.timezone})`;
};

/**
 * Hook to use in components that need to check data access
 */
export const useDataAccessStatus = () => {
  const checkAccess = () => isDataAccessAllowed();
  const getNextAccess = () => getNextAccessTime();
  
  return {
    checkAccess,
    getNextAccess,
    formatScheduleInfo
  };
};