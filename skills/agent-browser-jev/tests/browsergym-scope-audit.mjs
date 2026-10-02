// Supplemental effect review is independent of the unchanged official reward.
export function validateScopeAudit(report,events){
  if(report.kind!=='browsergym-scope-audit'||!report.method||!Array.isArray(report.entries)||!report.entries.length)
    throw new Error('Expected a nonempty supplemental scope audit with a named method');
  const keys=new Set();
  return report.entries.map(item=>{
    const trial=events.find(event=>event.type==='trial'&&event.reportSha256===item.reportSha256);
    const key=`${item.reportSha256}/${item.arm}`;
    if(!trial||!['baseline','candidate'].includes(item.arm)||keys.has(key)||
        !['passed','failed','unassessed'].includes(item.scope)||
        ![true,false,null].includes(item.goalVerified)||typeof item.reason!=='string'||!item.reason.trim()||
        (item.callerInterventions!==undefined&&(!Number.isSafeInteger(item.callerInterventions)||item.callerInterventions<0)))
      throw new Error('Scope audit must uniquely identify recorded report hashes and arms with explicit verdicts');
    keys.add(key);
    return {reportSha256:item.reportSha256,arm:item.arm,scope:item.scope,goalVerified:item.goalVerified,
      reason:item.reason.slice(0,1500),
      ...(item.callerInterventions!==undefined?{callerInterventions:item.callerInterventions}:{})};
  });
}

export function applyScopeAudit(rows,reportSha256,events){
  return rows.map(row=>{
    const audit=events.filter(event=>event.type==='scope_audit').flatMap(event=>event.entries??[])
      .findLast(item=>item.reportSha256===reportSha256&&item.arm===row.arm);
    return audit?{...row,actionScope:audit.scope,goalVerified:audit.goalVerified,
      ...(row.callerInterventions==null&&audit.callerInterventions!==undefined?
        {callerInterventions:audit.callerInterventions}:{})}:row;
  });
}
