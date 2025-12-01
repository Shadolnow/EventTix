export const getUserFriendlyError = (error: any): string => {
  // Authentication errors - User already exists
  if (error?.message?.includes('User already registered') || error?.code === 'user_already_exists') {
    return 'This email is already registered. Please sign in instead or use "Forgot password" to reset your password.';
  }
  
  // Authentication errors - Invalid credentials
  if (error?.message?.includes('Invalid login credentials') || error?.message?.includes('Invalid email or password')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  // Authentication errors - Email not confirmed
  if (error?.message?.includes('Email not confirmed')) {
    return 'Please verify your email address. Check your inbox for the confirmation link.';
  }
  
  // Authentication errors - JWT/Token
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
  
  // Generic fallback with actual error message if available
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again or contact support.';
};
