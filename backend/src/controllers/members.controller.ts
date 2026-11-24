import type { Request, Response } from 'express';
import { currentMember } from '../middlewares/load-membership';
import * as membersService from '../services/members.service';
import { toMemberView } from '../views/member.view';

/** GET /api/campaigns/:cid/members → membres actius (qualsevol membre). */
export async function list(req: Request, res: Response) {
  const members = await membersService.listMembers(currentMember(req).campaignId);
  res.json(members.map(toMemberView));
}

/** DELETE /api/campaigns/:cid/members/:userId → sortir (HU-15) o expulsar (HU-14). */
export async function remove(req: Request<{ userId: string }>, res: Response) {
  await membersService.removeMember(currentMember(req), req.params.userId);
  res.status(204).end();
}