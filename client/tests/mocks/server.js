import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create test server instance
export const server = setupServer(...handlers);

// Export handlers for individual test usage
export { handlers };
