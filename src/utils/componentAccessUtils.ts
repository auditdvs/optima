import { supabase } from '../lib/supabaseClient';

export interface ComponentAccessControl {
  id: number;
  component_name: string;
  display_name: string;
  is_enabled: boolean;
  is_24_hours: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
}

/**
 * Check if access is allowed for a specific component
 */
export const isComponentAccessAllowed = async (componentName: string): Promise<{
  allowed: boolean;
  reason?: string;
  component?: ComponentAccessControl;
}> => {
  try {
    // Get component settings
    const { data: component, error } = await supabase
      .from('component_access_control')
      .select('*')
      .eq('component_name', componentName)
      .single();

    if (error) {
      console.error('Error fetching component access:', error);
      // If we can't fetch settings, allow access (fail open)
      return { allowed: true, reason: 'Unable to verify component settings, allowing access' };
    }

    if (!component) {
      // Component not found, allow access
      return { allowed: true, reason: 'Component settings not found, allowing access' };
    }

    // Check if component is enabled
    if (!component.is_enabled) {
      return { 
        allowed: false, 
        reason: `${component.display_name} is currently disabled by administrator`,
        component 
      };
    }

    // If 24 hours, always allow
    if (component.is_24_hours) {
      return { 
        allowed: true, 
        reason: `${component.display_name} is available 24/7`,
        component 
      };
    }

    // Check time range
    const now = new Date();
    const currentTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: component.timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(now);

    const current = timeToMinutes(currentTime);
    const start = timeToMinutes(component.start_time);
    const end = timeToMinutes(component.end_time);

    // Debug logging
    console.log(`[ComponentAccess] Checking ${componentName}:`, {
      component_name: component.component_name,
      is_enabled: component.is_enabled,
      is_24_hours: component.is_24_hours,
      currentTime,
      currentMinutes: current,
      start_time: component.start_time,
      startMinutes: start,
      end_time: component.end_time,
      endMinutes: end,
      timezone: component.timezone
    });

    // Handle overnight schedules (e.g., 22:00 - 06:00)
    if (start > end) {
      if (current >= start || current <= end) {
        return { 
          allowed: true, 
          reason: `${component.display_name} is available (${component.start_time.slice(0, 5)} - ${component.end_time.slice(0, 5)})`,
          component 
        };
      }
    } else {
      // Normal schedules (e.g., 09:00 - 17:00)
      if (current >= start && current <= end) {
        return { 
          allowed: true, 
          reason: `${component.display_name} is available (${component.start_time.slice(0, 5)} - ${component.end_time.slice(0, 5)})`,
          component 
        };
      }
    }

    return { 
      allowed: false, 
      reason: `${component.display_name} is only available between ${component.start_time.slice(0, 5)} - ${component.end_time.slice(0, 5)} (${component.timezone})`,
      component 
    };

  } catch (error) {
    console.error('Error checking component access:', error);
    // On error, allow access (fail open)
    return { allowed: true, reason: 'Error checking component access, allowing access' };
  }
};

/**
 * Get next available time for a component
 */
export const getNextComponentAccessTime = async (componentName: string): Promise<{
  nextTime?: string;
  component?: ComponentAccessControl;
}> => {
  try {
    const { data: component, error } = await supabase
      .from('component_access_control')
      .select('*')
      .eq('component_name', componentName)
      .single();

    if (error || !component) {
      return {};
    }

    if (!component.is_enabled) {
      return { 
        nextTime: 'Component is disabled',
        component 
      };
    }

    if (component.is_24_hours) {
      return { 
        nextTime: 'Always available',
        component 
      };
    }

    // Calculate next access time
    const now = new Date();
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Try today first
    const [hours, minutes] = component.start_time.split(':').map(Number);
    today.setHours(hours, minutes, 0, 0);

    if (today > now) {
      return {
        nextTime: today.toLocaleString('id-ID', {
          timeZone: component.timezone,
          dateStyle: 'full',
          timeStyle: 'short'
        }),
        component
      };
    }

    // Try tomorrow
    tomorrow.setHours(hours, minutes, 0, 0);
    return {
      nextTime: tomorrow.toLocaleString('id-ID', {
        timeZone: component.timezone,
        dateStyle: 'full',
        timeStyle: 'short'
      }),
      component
    };

  } catch (error) {
    console.error('Error calculating next access time:', error);
    return {};
  }
};

/**
 * Convert time string (HH:MM or HH:MM:SS) to minutes since midnight
 */
const timeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Get all component access settings
 */
export const getAllComponentAccess = async (): Promise<ComponentAccessControl[]> => {
  try {
    const { data, error } = await supabase
      .from('component_access_control')
      .select('*')
      .order('display_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all component access:', error);
    return [];
  }
};

/**
 * Hook for components that need to check specific component access
 */
export const useComponentAccess = (componentName: string) => {
  const checkAccess = () => isComponentAccessAllowed(componentName);
  const getNextAccess = () => getNextComponentAccessTime(componentName);
  
  return {
    checkAccess,
    getNextAccess
  };
};