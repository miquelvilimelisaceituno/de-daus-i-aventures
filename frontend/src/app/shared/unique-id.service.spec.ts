// src/app/shared/unique-id.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { UniqueIdService } from './unique-id.service';

describe('UniqueIdService', () => {
  let service: UniqueIdService;

  beforeEach(() => {
    service = TestBed.inject(UniqueIdService);
  });

  it('starts the id with the given prefix', () => {
    expect(service.next('field')).toMatch(/^field-[0-9a-f-]{36}$/);
  });

  it('never returns the same id twice', () => {
    const ids = new Set(Array.from({ length: 100 }, () => service.next('field')));

    expect(ids.size).toBe(100);
  });
});