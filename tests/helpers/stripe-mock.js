/**
 * Stripe API Mock
 * 
 * Mocks Stripe API calls for testing
 * 
 * NOTE: This file must be loaded AFTER jest is initialized
 * The actual mocking happens in test files that use jest.mock()
 */

// Mock Stripe client (functions will be set up by jest.fn() in tests)
const mockStripeClient = {
  customers: {
    create: null, // Will be set to jest.fn() in setup
    retrieve: null
  },
  subscriptions: {
    list: null,
    retrieve: null
  },
  checkout: {
    sessions: {
      create: null
    }
  },
  webhooks: {
    constructEvent: null
  }
};

/**
 * Initialize mock functions (call this after jest is available)
 */
function initializeMocks() {
  // Use global jest if available, otherwise try to require it
  const jestFn = (typeof jest !== 'undefined' && jest.fn) ? jest.fn : 
                 (() => {
                   try {
                     return require('jest-mock').fn;
                   } catch (e) {
                     // Fallback: create a simple mock function
                     const mockFn = function(...args) {
                       return mockFn._impl ? mockFn._impl(...args) : Promise.resolve({});
                     };
                     mockFn.mockResolvedValue = (value) => { mockFn._impl = () => Promise.resolve(value); return mockFn; };
                     mockFn.mockImplementation = (impl) => { mockFn._impl = impl; return mockFn; };
                     mockFn.mockReset = () => { mockFn._impl = undefined; return mockFn; };
                     return () => mockFn;
                   }
                 })();
  
  mockStripeClient.customers.create = jestFn();
  mockStripeClient.customers.retrieve = jestFn();
  mockStripeClient.subscriptions.list = jestFn();
  mockStripeClient.subscriptions.retrieve = jestFn();
  mockStripeClient.checkout.sessions.create = jestFn();
  mockStripeClient.webhooks.constructEvent = jestFn();
}

/**
 * Reset all Stripe mocks
 */
function resetStripeMocks() {
  if (mockStripeClient.customers.create && typeof mockStripeClient.customers.create.mockReset === 'function') {
    mockStripeClient.customers.create.mockReset();
    mockStripeClient.customers.retrieve.mockReset();
    mockStripeClient.subscriptions.list.mockReset();
    mockStripeClient.subscriptions.retrieve.mockReset();
    mockStripeClient.checkout.sessions.create.mockReset();
    mockStripeClient.webhooks.constructEvent.mockReset();
  }
}

/**
 * Setup default successful Stripe responses
 */
function setupDefaultStripeMocks() {
  // Initialize mocks if not already done
  if (!mockStripeClient.customers.create || typeof mockStripeClient.customers.create.mockResolvedValue !== 'function') {
    initializeMocks();
  }

  // Default customer creation
  mockStripeClient.customers.create.mockResolvedValue({
    id: 'cus_test_123',
    email: 'test@example.com',
    metadata: {}
  });

  // Default customer retrieve
  mockStripeClient.customers.retrieve.mockResolvedValue({
    id: 'cus_test_123',
    email: 'test@example.com',
    metadata: { user_id: '1' }
  });

  // Default subscription list (empty)
  mockStripeClient.subscriptions.list.mockResolvedValue({
    data: []
  });

  // Default subscription retrieve
  mockStripeClient.subscriptions.retrieve.mockResolvedValue({
    id: 'sub_test_123',
    customer: 'cus_test_123',
    status: 'active'
  });

  // Default checkout session
  mockStripeClient.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/test',
    subscription: 'sub_test_123'
  });

  // Default webhook verification
  mockStripeClient.webhooks.constructEvent.mockImplementation((payload, signature, secret) => {
    return JSON.parse(payload.toString());
  });
}

/**
 * Create a mock Stripe subscription object
 * @param {Object} overrides - Override default values
 * @returns {Object} - Mock subscription
 */
function createMockSubscription(overrides = {}) {
  return {
    id: `sub_test_${Date.now()}`,
    customer: 'cus_test_123',
    status: 'active',
    ...overrides
  };
}

/**
 * Create a mock Stripe webhook event
 * @param {string} type - Event type
 * @param {Object} data - Event data
 * @returns {Object} - Mock event
 */
function createMockWebhookEvent(type, data) {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: {
      object: data
    }
  };
}

/**
 * Create a mock checkout session
 * @param {Object} overrides - Override default values
 * @returns {Object} - Mock checkout session
 */
function createMockCheckoutSession(overrides = {}) {
  return {
    id: `cs_test_${Date.now()}`,
    url: 'https://checkout.stripe.com/test',
    subscription: 'sub_test_123',
    ...overrides
  };
}

module.exports = {
  mockStripeClient,
  resetStripeMocks,
  setupDefaultStripeMocks,
  createMockSubscription,
  createMockWebhookEvent,
  createMockCheckoutSession
};
