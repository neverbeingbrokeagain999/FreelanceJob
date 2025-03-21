import { parentPort } from 'worker_threads';
import { VM } from 'vm2';

// Handle messages from main thread
parentPort.on('message', ({ code, config }) => {
  try {
    // Create sandbox VM with memory limits
    const vm = new VM({
      timeout: config.timeout || 5000,
      sandbox: {
        console: {
          log: (...args) => {
            output.push(...args.map(arg => String(arg)));
          },
          error: (...args) => {
            errors.push(...args.map(arg => String(arg)));
          }
        }
      }
    });

    const output = [];
    const errors = [];
    
    // Execute code in sandbox
    const result = vm.run(code);

    // Get memory usage
    const memory = process.memoryUsage();

    // Send result back to main thread
    parentPort.postMessage({
      success: true,
      result: result !== undefined ? String(result) : undefined,
      output,
      errors,
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external
      }
    });
  } catch (error) {
    // Send error back to main thread
    parentPort.postMessage({
      success: false,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }
});

// Handle errors
parentPort.on('error', (error) => {
  parentPort.postMessage({
    success: false,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
});
