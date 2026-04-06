/**
 * Maps common technical error codes (specifically Firebase) to user-friendly messages.
 */
export const mapErrorMessage = (error: any): string => {
    if (!error) return 'An unexpected error occurred. Please try again.';

    // If it's already a string, return or process it
    if (typeof error === 'string') return error;

    const code = error.code || error.message;

    if (typeof code !== 'string') return 'An unexpected error occurred. Please try again.';

    // Firebase Auth Errors
    if (code.includes('auth/invalid-credential') || code.includes('auth/invalid-login-credentials')) {
        return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (code.includes('auth/user-not-found')) {
        return 'No account found with this email address. Please check your email or sign up.';
    }
    if (code.includes('auth/wrong-password')) {
        return 'Incorrect password. Please try again or use "Forgot Password" to reset.';
    }
    if (code.includes('auth/invalid-email')) {
        return 'Invalid email address format. Please check and try again.';
    }
    if (code.includes('auth/user-disabled')) {
        return 'This account has been disabled. Please contact support for assistance.';
    }
    if (code.includes('auth/too-many-requests')) {
        return 'Too many failed attempts. Please wait a few minutes and try again.';
    }
    if (code.includes('auth/network-request-failed')) {
        return 'Network error. Please check your internet connection and try again.';
    }
    if (code.includes('auth/email-already-in-use')) {
        return 'An account with this email already exists. Try logging in instead.';
    }
    if (code.includes('auth/weak-password')) {
        return 'The password is too weak. Please use at least 6 characters.';
    }

    // Firestore / General Firebase Errors
    if (code.includes('permission-denied')) {
        return 'You do not have permission to perform this action.';
    }
    if (code.includes('unavailable')) {
        return 'The service is temporarily unavailable. Please check your connection.';
    }

    // Default fallback (clean up technical prefixes if possible)
    if (code.includes('FirebaseError:') || code.includes('Firebase:')) {
        return 'Connection error. Please try again.';
    }

    return error.message || 'An error occurred. Please try again.';
};
