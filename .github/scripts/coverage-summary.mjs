// Escriu el resum de cobertura com una taula Markdown.
// A GitHub Actions, la sortida s'afegeix a $GITHUB_STEP_SUMMARY i surt a la pàgina de l'execució.
//
// Ús: node coverage-summary.mjs "<títol>" <coverage-summary.json>
// El fitxer el generen Jest i Vitest amb el reporter «json-summary» (el mateix format).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const [title, file] = process.argv.slice(2);

let markdown;
if (!file || !existsSync(file)) {
  markdown = `### ${title}\n\nNo s'ha generat l'informe de cobertura (els tests no han arribat a acabar).\n`;
} else {
  const { total } = JSON.parse(readFileSync(file, 'utf8'));
  const row = (label, key) => `| ${label} | ${total[key].pct} % | ${total[key].covered} / ${total[key].total} |`;
  markdown = [
    `### ${title}`,
    '',
    '| Mètrica | Cobertura | Cobert / total |',
    '|---|---|---|',
    row('Sentències', 'statements'),
    row('Branques', 'branches'),
    row('Funcions', 'functions'),
    row('Línies', 'lines'),
    '',
  ].join('\n');
}

console.log(markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n');