let currentContext = { availability:'available', activity:'idle', location:'home', updatedAt:new Date().toISOString() };
export function getContext(_,res){ res.json({success:true,data:currentContext}); }
export function updateContext(req,res){ currentContext={...currentContext,...req.body,updatedAt:new Date().toISOString()}; res.json({success:true,data:currentContext}); }
