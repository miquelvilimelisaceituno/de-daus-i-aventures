import { TestBed } from '@angular/core/testing';
import { Member } from '../campaign.model';
import { MemberList } from './member-list';

const MASTER: Member = { userId: 'u1', name: 'Miquel', avatarUrl: null, role: 'master', joinedAt: '2026-11-01' };
const PLAYER: Member = { userId: 'u2', name: 'Laia', avatarUrl: null, role: 'player', joinedAt: '2026-11-02' };

describe('MemberList', () => {
  async function render(inputs: { expellable?: boolean; busy?: boolean } = {}) {
    const fixture = TestBed.createComponent(MemberList);
    fixture.componentRef.setInput('members', [MASTER, PLAYER]);
    if (inputs.expellable !== undefined) fixture.componentRef.setInput('expellable', inputs.expellable);
    if (inputs.busy !== undefined) fixture.componentRef.setInput('busy', inputs.busy);
    await fixture.whenStable();
    return { fixture, list: fixture.nativeElement as HTMLElement };
  }

  it('shows each member with their role and initial', async () => {
    const { list } = await render();

    const rows = [...list.querySelectorAll('li')].map((li) =>
      ['.inicial', '.nom', '.rol'].map((selector) => li.querySelector(selector)?.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['M', 'Miquel', 'Màster'],
      ['L', 'Laia', 'Jugador'],
    ]);
    expect(list.querySelector('button')).toBeNull();
  });

  it('offers to expel players, never the master', async () => {
    const { fixture, list } = await render({ expellable: true });
    const expelled: Member[] = [];
    fixture.componentInstance.expel.subscribe((member) => expelled.push(member));

    const buttons = list.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute('aria-label')).toBe('Expulsa Laia');

    buttons[0].click();
    expect(expelled).toEqual([PLAYER]);
  });

  it('disables the buttons while an expulsion is in progress', async () => {
    const { list } = await render({ expellable: true, busy: true });

    expect(list.querySelector('button')!.disabled).toBe(true);
  });
});