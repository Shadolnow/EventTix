export const getUserFriendlyError = (error: any): string => {
  // Authentication errors
  if (error?.message?.includes('JWT') || error?.message?.includes('token')) {
    return 'Session expired. Please sign in again.';
  }
  
  // Database errors
  if (error?.code === '23505') return 'This item already exists.';
  if (error?.code === '23503') return 'Invalid reference.';
  if (error?.code === '42501') return 'Access denied.';
  if (error?.message?.includes('row-level security')) {
    return 'You do not have permission for this action.';
  }
  if (error?.message?.includes('violates')) return 'Invalid data provided.';
  
  // API/Network errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return 'Network error. Please check your connection.';
  }
  
  // Generic fallback
  return 'An unexpected error occurred. Please try again or contact support.';
};
