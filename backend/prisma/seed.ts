import { prisma } from '../src/db/prisma';

const campaigns = [
  {
    inviteCode: 'DRAC2024',
    name: 'El final infinit',
    description: 'La campanya del grup. Dades de prova fins al script de sessions reals.',
  },
  {
    inviteCode: 'PROVA001',
    name: 'Campanya de prova',
    description: 'Per comprovar llistes i estats buits.',
  },
];

async function main() {
  for (const c of campaigns) {
    await prisma.campaign.upsert({
      where: { inviteCode: c.inviteCode },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }
  console.log(`Seed: ${campaigns.length} campanyes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
