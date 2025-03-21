import {
  transformOperation,
  composeOperations,
  checkConflict,
  applyOperation,
  createInsertOp,
  createDeleteOp,
  createRetainOp,
  OperationType
} from '../../server/utils/operationalTransform.js';

describe('Operational Transform', () => {
  describe('Operation Creation', () => {
    test('creates insert operation', () => {
      const op = createInsertOp(5, 'hello');
      expect(op).toEqual({
        type: OperationType.INSERT,
        position: 5,
        chars: 'hello'
      });
    });

    test('creates delete operation', () => {
      const op = createDeleteOp(3, 2);
      expect(op).toEqual({
        type: OperationType.DELETE,
        position: 3,
        count: 2
      });
    });

    test('creates retain operation', () => {
      const op = createRetainOp(1, 'text');
      expect(op).toEqual({
        type: OperationType.RETAIN,
        position: 1,
        chars: 'text'
      });
    });
  });

  describe('Operation Transformation', () => {
    test('transforms concurrent inserts', () => {
      const op1 = createInsertOp(5, 'hello');
      const op2 = createInsertOp(3, 'world');
      
      const transformed = transformOperation(op1, op2);
      expect(transformed.position).toBe(10); // 5 + length of 'world'
    });

    test('transforms insert against delete', () => {
      const op1 = createInsertOp(7, 'new');
      const op2 = createDeleteOp(5, 2);

      const transformed = transformOperation(op1, op2);
      expect(transformed.position).toBe(5);
    });

    test('transforms delete against insert', () => {
      const op1 = createDeleteOp(5, 3);
      const op2 = createInsertOp(2, 'text');

      const transformed = transformOperation(op1, op2);
      expect(transformed.position).toBe(9);
    });

    test('transforms overlapping deletes', () => {
      const op1 = createDeleteOp(3, 4);
      const op2 = createDeleteOp(5, 4);

      const transformed = transformOperation(op1, op2);
      expect(transformed.position).toBe(3);
      expect(transformed.count).toBe(2);
    });
  });

  describe('Operation Composition', () => {
    test('composes sequential inserts', () => {
      const op1 = createInsertOp(0, 'hello');
      const op2 = createInsertOp(5, ' world');

      const composed = composeOperations(op1, op2);
      expect(composed.position).toBe(5);
      expect(composed.chars).toBe(' world');
    });

    test('cancels out insert followed by delete', () => {
      const op1 = createInsertOp(0, 'test');
      const op2 = createDeleteOp(0, 4);

      const composed = composeOperations(op1, op2);
      expect(composed).toBeNull();
    });

    test('converts delete-insert to retain', () => {
      const op1 = createDeleteOp(5, 3);
      const op2 = createInsertOp(5, 'new');

      const composed = composeOperations(op1, op2);
      expect(composed.type).toBe(OperationType.RETAIN);
      expect(composed.chars).toBe('new');
    });
  });

  describe('Conflict Detection', () => {
    test('detects conflicting inserts at same position', () => {
      const op1 = createInsertOp(5, 'one');
      const op2 = createInsertOp(5, 'two');

      expect(checkConflict(op1, op2)).toBe(true);
    });

    test('detects overlapping deletes', () => {
      const op1 = createDeleteOp(3, 4);
      const op2 = createDeleteOp(5, 4);

      expect(checkConflict(op1, op2)).toBe(true);
    });

    test('detects insert in deleted range', () => {
      const op1 = createInsertOp(7, 'text');
      const op2 = createDeleteOp(5, 5);

      expect(checkConflict(op1, op2)).toBe(true);
    });

    test('identifies non-conflicting operations', () => {
      const op1 = createInsertOp(0, 'hello');
      const op2 = createInsertOp(10, 'world');

      expect(checkConflict(op1, op2)).toBe(false);
    });
  });

  describe('Operation Application', () => {
    test('applies insert operation', () => {
      const content = 'hello world';
      const op = createInsertOp(5, ' beautiful');

      const result = applyOperation(content, op);
      expect(result).toBe('hello beautiful world');
    });

    test('applies delete operation', () => {
      const content = 'hello world';
      const op = createDeleteOp(5, 6);

      const result = applyOperation(content, op);
      expect(result).toBe('hello');
    });

    test('applies retain operation', () => {
      const content = 'hello world';
      const op = createRetainOp(6, 'beautiful');

      const result = applyOperation(content, op);
      expect(result).toBe('hello beautiful');
    });

    test('handles boundary cases', () => {
      const content = 'test';
      
      // Insert at start
      expect(applyOperation(content, createInsertOp(0, 'pre'))).toBe('pretest');
      
      // Insert at end
      expect(applyOperation(content, createInsertOp(4, 'ing'))).toBe('testing');
      
      // Delete entire content
      expect(applyOperation(content, createDeleteOp(0, 4))).toBe('');
    });
  });

  describe('Complex Scenarios', () => {
    test('handles multiple concurrent operations', () => {
      const content = 'hello world';
      const ops = [
        createInsertOp(0, 'say '),    // "say hello world"
        createDeleteOp(6, 5),         // "say he world"
        createInsertOp(9, 'everyone') // "say he everyone"
      ];

      const result = ops.reduce((text, op) => {
        return applyOperation(text, op);
      }, content);

      expect(result).toBe('say he everyone');
    });

    test('maintains content integrity with concurrent edits', () => {
      const content = 'collaborative editing';
      const user1Ops = [
        createDeleteOp(0, 13),        // "editing"
        createInsertOp(0, 'real-time') // "real-time editing"
      ];
      const user2Ops = [
        createInsertOp(13, ' test'),   // "collaborative test editing"
        createDeleteOp(7, 6)           // "collab test editing"
      ];

      // Simulate concurrent edits
      let user1Content = content;
      let user2Content = content;

      user1Ops.forEach(op => {
        user1Content = applyOperation(user1Content, op);
      });

      user2Ops.forEach(op => {
        const transformedOp = user1Ops.reduce((currentOp, prevOp) => 
          transformOperation(currentOp, prevOp), op);
        user2Content = applyOperation(user2Content, transformedOp);
      });

      // Both users should end up with the same content
      expect(user1Content).toBe(user2Content);
    });
  });
});
