/**
 * Operational Transform utilities for collaborative editing
 */

// Operation types
const OperationType = {
  INSERT: 'insert',
  DELETE: 'delete',
  RETAIN: 'retain'
};

/**
 * Transform operation against another operation
 */
export const transformOperation = (op1, op2) => {
  if (op1.type === OperationType.INSERT && op2.type === OperationType.INSERT) {
    // If both operations are inserts, the one with the higher position needs to be shifted
    if (op1.position < op2.position) {
      return op1;
    } else if (op1.position > op2.position) {
      return {
        ...op1,
        position: op1.position + op2.chars.length
      };
    }
  }

  if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
    // If op1 is insert and op2 is delete, shift op1 if it comes after the deletion
    if (op1.position <= op2.position) {
      return op1;
    } else {
      return {
        ...op1,
        position: Math.max(op2.position, op1.position - op2.count)
      };
    }
  }

  if (op1.type === OperationType.DELETE && op2.type === OperationType.INSERT) {
    // If op1 is delete and op2 is insert, shift op1 if op2 comes before
    if (op2.position <= op1.position) {
      return {
        ...op1,
        position: op1.position + op2.chars.length
      };
    }
    return op1;
  }

  if (op1.type === OperationType.DELETE && op2.type === OperationType.DELETE) {
    // If both are deletes, adjust based on position and count
    if (op2.position >= op1.position + op1.count) {
      return op1;
    }
    if (op1.position >= op2.position + op2.count) {
      return {
        ...op1,
        position: op1.position - op2.count
      };
    }
    // Handle overlapping deletes
    const newPosition = Math.min(op1.position, op2.position);
    const newCount = op1.count - (Math.min(
      op1.position + op1.count,
      op2.position + op2.count
    ) - Math.max(op1.position, op2.position));
    return {
      ...op1,
      position: newPosition,
      count: Math.max(0, newCount)
    };
  }

  return op1;
};

/**
 * Compose two operations into a single operation
 */
export const composeOperations = (op1, op2) => {
  if (!op1) return op2;
  if (!op2) return op1;

  if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
    // If insert is followed by delete at the same position, they cancel out
    if (op1.position === op2.position && op1.chars.length === op2.count) {
      return null;
    }
  }

  if (op1.type === OperationType.DELETE && op2.type === OperationType.INSERT) {
    // If delete is followed by insert at the same position
    if (op1.position === op2.position) {
      if (op1.count === op2.chars.length) {
        // If they have the same length, replace content
        return {
          type: OperationType.RETAIN,
          position: op1.position,
          chars: op2.chars
        };
      }
    }
  }

  // Otherwise, return the transformed version of op2
  return transformOperation(op2, op1);
};

/**
 * Serialize operation for transmission
 */
export const serializeOperation = (operation) => {
  return JSON.stringify({
    type: operation.type,
    position: operation.position,
    chars: operation.chars,
    count: operation.count
  });
};

/**
 * Deserialize received operation
 */
export const deserializeOperation = (serializedOp) => {
  if (typeof serializedOp === 'string') {
    return JSON.parse(serializedOp);
  }
  return serializedOp;
};

/**
 * Check if two operations conflict
 */
export const checkConflict = (op1, op2) => {
  if (op1.type === OperationType.INSERT && op2.type === OperationType.INSERT) {
    return op1.position === op2.position;
  }

  if (op1.type === OperationType.DELETE && op2.type === OperationType.DELETE) {
    const op1Range = { start: op1.position, end: op1.position + op1.count };
    const op2Range = { start: op2.position, end: op2.position + op2.count };
    return !(op1Range.end <= op2Range.start || op2Range.end <= op1Range.start);
  }

  if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
    return op1.position >= op2.position && 
           op1.position < (op2.position + op2.count);
  }

  if (op1.type === OperationType.DELETE && op2.type === OperationType.INSERT) {
    return op2.position >= op1.position && 
           op2.position < (op1.position + op1.count);
  }

  return false;
};

/**
 * Apply an operation to content
 */
export const applyOperation = (content, operation) => {
  switch (operation.type) {
    case OperationType.INSERT:
      return content.slice(0, operation.position) +
             operation.chars +
             content.slice(operation.position);
    
    case OperationType.DELETE:
      return content.slice(0, operation.position) +
             content.slice(operation.position + operation.count);
    
    case OperationType.RETAIN:
      return content.slice(0, operation.position) +
             operation.chars +
             content.slice(operation.position + operation.chars.length);
    
    default:
      return content;
  }
};

/**
 * Create insert operation
 */
export const createInsertOp = (position, chars) => ({
  type: OperationType.INSERT,
  position,
  chars
});

/**
 * Create delete operation
 */
export const createDeleteOp = (position, count) => ({
  type: OperationType.DELETE,
  position,
  count
});

/**
 * Create retain operation
 */
export const createRetainOp = (position, chars) => ({
  type: OperationType.RETAIN,
  position,
  chars
});

export default {
  transformOperation,
  composeOperations,
  serializeOperation,
  deserializeOperation,
  checkConflict,
  applyOperation,
  createInsertOp,
  createDeleteOp,
  createRetainOp,
  OperationType
};
