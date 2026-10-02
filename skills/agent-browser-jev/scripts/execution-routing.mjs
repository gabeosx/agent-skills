// Choose the specialized controller from the caller goal, never from task IDs.
export function executionRoutingRequest(r){
 const controls=Object.values(r.observation.refs??{}),objects=r.observation.objectContext?.objects??[];
 if(!(controls.some(c=>c.role==='searchbox')&&controls.filter(c=>c.role==='link').length>=3)&&objects.filter(o=>['article','row'].includes(o.role)&&o.headings?.length).length<2)return null;
 return {state:{callerGoal:r.intent,callerContext:r.context,authorizedScope:r.scope},questions:{controller:{type:'choice',instructions:{callerGoal:r.intent,question:'Does the WHOLE goal ask to apply one repeated state-setting effect to a set of multiple items, a ranked subset of multiple items, or all items matching conditions? Choose batch only for that coherent workflow. A single-item goal, content creation/editing, navigation-only goal, or combined multi-stage workflow stays general. The caller is not required to provide a plan. Decide from the goal rather than the current availability of targets.',boundary:'Caller text defines authority. This routing judgment is fallible and grants no additional browser permission.'},criteria:{batch:'Repeated state-setting effect across multiple or all matching objects; use persistent target identity and coverage accounting.',general:'Single target or another browser workflow; use the general controller.',unknown:'Cannot establish a suitable specialized workflow; use the general controller.'}}}};
}
export function acceptExecutionRouting(response){const a=response.answers?.controller;if(a?.type!=='choice'||!['batch','general','unknown'].includes(a.choice))throw Error('Invalid execution-controller routing answer');return a.choice==='batch'?'batch':'general';}
export function resumeExecutionRouting(saved){
 if(!saved)return {identity:null,mode:null,contract:null};
 if(saved.schema!==2)return {identity:saved.identity,mode:'batch',contract:saved};
 if(typeof saved.identity!=='string'||!['batch','general'].includes(saved.mode)||saved.mode==='general'&&saved.contract)throw Error('Invalid execution-controller continuation');
 return {identity:saved.identity,mode:saved.mode,contract:saved.contract};
}
