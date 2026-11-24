import type { Request, RequestHandler } from 'express';
import type { MembershipRole } from '../generated/prisma/enums';
import * as membershipsRepository from '../repositories/memberships.repository';
import type { CampaignMember } from '../services/campaign-member';
import { currentUser } from './require-auth';


declare global {
  namespace Express {
    interface Request {
      member?: CampaignMember;
    }
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_MEMBER = { error: 'No formes part d\'aquesta campanya' };

/**
 * Exigeix ser membre actiu de la campanya :cid (CRUD §3.2). Si no → 403.
 * El mateix 403 per a una campanya que no existeix: no revela quines campanyes hi ha.
 * Va sempre després de requireAuth.
 */
export const loadMembership: RequestHandler = async (req, res, next) => {
  const campaignId = req.params.cid;
  // Un id que no és un UUID faria fallar la consulta (la columna és UUID).
  if (typeof campaignId !== 'string' || !UUID.test(campaignId)) {
    res.status(403).json(NOT_MEMBER);
    return;
  }

  const userId = currentUser(req).uid;
  const membership = await membershipsRepository.findWithCampaignState(userId, campaignId);

  if (!membership || membership.leftAt) {
    res.status(403).json(NOT_MEMBER);
    return;
  }

  req.member = {
    userId,
    campaignId,
    role: membership.role,
    campaignArchived: membership.campaign.archivedAt !== null,
  };
  next();
};

/** El membre de la campanya actual. Només a rutes que passen per loadMembership. */
export function currentMember(req: Request): CampaignMember {
  if (!req.member) throw new Error('Falta loadMembership en aquesta ruta');
  return req.member;
}

/** Només el rol indicat pot continuar. Si no → 403. */
export function requireRole(role: MembershipRole): RequestHandler {
  return (req, res, next) => {
    if (currentMember(req).role !== role) {
      res.status(403).json({ error: 'No tens permís per fer això' });
      return;
    }
    next();
  };
}

/** Una campanya arxivada és només de lectura (MVP §5.1). Qualsevol escriptura → 409. */
export const requireActiveCampaign: RequestHandler = (req, res, next) => {
  if (currentMember(req).campaignArchived) {
    res.status(409).json({ error: 'La campanya està arxivada i és només de lectura' });
    return;
  }
  next();
};