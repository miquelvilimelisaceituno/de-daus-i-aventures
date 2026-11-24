import { describe, expect, it } from '@jest/globals';
import { generateInviteCode } from '../src/services/invite-code';

describe('generateInviteCode', () => {
  it('generates 8 characters without the easily confused ones (0, O, 1, I, L)', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateInviteCode()).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    }
  });
});