export const SKILLS=['Design','Frontend','Backend','Research','Business','Presentation'];
export function normalizeSkills(value){return Array.isArray(value)?SKILLS.filter(skill=>value.includes(skill)):[];}
export function roleCoverage(skills,wanted){
  const tokens=String(wanted||'').toLowerCase().split(/[,/;\n]+/).map(s=>s.trim());
  return normalizeSkills(skills).filter(skill=>tokens.includes(skill.toLowerCase()));
}
// Exact recruitment-role overlap, not a ranking or official eligibility check.
export function teamsForSkills(teams,skills){
  return teams.flatMap(team=>{
    if(team.isMember||team.members.length>=team.capacity)return [];
    const matches=roleCoverage(skills,team.roles);
    return matches.length?[{team,matches,openSlots:team.capacity-team.members.length}]:[];
  });
}
