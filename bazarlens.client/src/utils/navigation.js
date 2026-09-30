export const homeForRole = role => role === 'admin' ? '/admin' : role === 'agent' ? '/submissions' : '/dashboard';

export const agentPaths = ['/submissions', '/profile', '/settings'];
