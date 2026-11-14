export const SKILLS=['Design','Frontend','Backend','Research','Business','Presentation'];
export function normalizeSkills(value){return Array.isArray(value)?SKILLS.filter(skill=>value.includes(skill)):[];}
export function roleCoverage(skills,wanted){
  const tokens=String(wanted||'').toLowerCase().split(/[,/;\n]+/).map(s=>s.trim());
  return normalizeSkills(skills).filter(skill=>tokens.includes(skill.toLowerCase()));
}
