import type { MembershipRole } from '../generated/prisma/enums';

interface MemberRow {
  role: MembershipRole;
  joinedAt: Date;
  user: { id: string; name: string; avatarUrl: string | null };
}

/** Un membre de la llista «El grup»: les dades de l'usuari al primer nivell. */
export function toMemberView({ user, role, joinedAt }: MemberRow) {
  return { userId: user.id, name: user.name, avatarUrl: user.avatarUrl, role, joinedAt };
}