import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
const USER = 'demo-user';
const pretty = (v = '') => String(v).replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const pct = v => `${Math.round((Number(v) || 0) * 100)}%`;

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}

function App() {
  const [context, setContext] = useState(null);
  const [history, setHistory] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [result, setResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('Ready for a context-aware event.');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const [ctx, hist] = await Promise.all([
        request(`/context?userId=${USER}`),
        request(`/events/history?userId=${USER}`)
      ]);
      setContext(ctx.data?.context || ctx.data);
      setHistory(hist.data?.decisions || []);
      setWaiting(hist.data?.waiting || []);
    } catch (e) { setNotice(`Backend unavailable: ${e.message}`); }
  }, []);

  useEffect(() => { load(); const timer = setInterval(load, 3000); return () => clearInterval(timer); }, [load]);

  const applyContext = async availability => {
    setLoading(true); setNotification(null); setInsight(null);
    try {
      const json = await request('/context', { method: 'PATCH', body: JSON.stringify({ userId: USER, availability, activity: availability === 'busy' ? 'meeting' : 'idle', location: 'home' }) });
      const results = json.data?.results || [];
      if (results.length) {
        const latest = results.at(-1); setResult(latest);
        const ready = [...results].reverse().find(r => r.action?.status === 'ready');
        if (ready) setNotification(ready);
        setNotice(`Context changed. ${json.data.reEvaluated} waiting event${json.data.reEvaluated === 1 ? '' : 's'} re-evaluated.`);
      } else setNotice(availability === 'busy' ? 'Meeting mode enabled. Routine events will wait.' : 'You are available. Waiting events will be reconsidered.');
      await load();
    } catch (e) { setNotice(e.message); } finally { setLoading(false); }
  };

  const simulate = async type => {
    setLoading(true); setNotification(null); setInsight(null);
    try {
      const event = { source: 'ring', type, priority: type === 'security_alert' ? 'critical' : 'medium', metadata: { location: 'front_door', device: 'ring_simulator' } };
      const json = await request('/agent/evaluate', { method: 'POST', body: JSON.stringify({ event, userId: USER }) });
      setResult(json.data);
      if (json.data.action?.status === 'ready') setNotification(json.data);
      setNotice(json.data.decision?.decision === 'WAIT' ? 'Ambient remembered the event instead of interrupting you.' : `Ambient chose ${json.data.decision?.decision}.`);
      await load();
    } catch (e) { setNotice(e.message); } finally { setLoading(false); }
  };

  const dismiss = async item => {
    const id = item?.event?._id || item?.event?.id;
    if (!id) return;
    setLoading(true);
    try { await request(`/events/${id}/dismiss?userId=${USER}`, { method: 'POST' }); setNotification(null); setNotice('Event dismissed.'); await load(); }
    catch (e) { setNotice(e.message); } finally { setLoading(false); }
  };

  const generateInsight = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const json = await request('/agent/insight', { method: 'POST', body: JSON.stringify({ event: result.event, context: result.context, decision: result.decision }) });
      setInsight(json.data); setNotice(json.data.enabled ? 'Bedrock explained the decision without changing it.' : 'Bedrock is disabled; no AWS inference was made.');
    } catch (e) { setNotice(`Bedrock: ${e.message}`); } finally { setLoading(false); }
  };

  const busy = context?.availability === 'busy';
  const decisionDist = result?.decision?.jev?.probabilities?.decision || {};
  const priorityDist = result?.decision?.jev?.probabilities?.priority || {};
  const priorityLabels = ['low', 'medium', 'high', 'critical'];

  return <main>
    <header><div className="brand"><span className="dot"/>AMBIENT <em>v0.9.0</em></div><div className="headerStatus"><span>Alexa+ · MCP-ready</span><b className={busy ? 'busy' : ''}>{busy ? 'BUSY' : 'AVAILABLE'}</b></div></header>

    <section className="hero"><p className="eyebrow">THE ASSISTANT THAT KNOWS WHEN TO ACT</p><h1>Understand the <span>moment.</span><br/>Then decide when to act.</h1><p>Ambient combines context, bounded AI judgment, deterministic policy, confidence gating, memory, and simulated device actions into one transparent orchestration loop.</p><div className="loop">EVENT <i>→</i> CONTEXT <i>→</i> JEV <i>→</i> POLICY <i>→</i> GATE <i>→</i> ACTION</div></section>

    <div className="notice">● {notice}</div>

    <section className="two"><Panel title="01 · MOMENT" heading="What are you doing?"><div className="moment"><div className={`momentIcon ${busy ? 'busy' : ''}`}>{busy ? '◉' : '○'}</div><div><strong>{busy ? 'In a meeting' : 'Available'}</strong><small>{context?.location || 'home'} · {context?.activity || 'idle'}</small></div></div><div className="buttons"><button disabled={loading || busy} onClick={() => applyContext('busy')}>Start meeting</button><button disabled={loading || !busy} onClick={() => applyContext('available')}>End meeting</button></div></Panel>
      <Panel title="02 · EVENT" heading="What just happened?"><div className="events"><button onClick={() => simulate('package_delivered')} disabled={loading}><span>📦</span><div><b>Package delivered</b><small>Routine · front door · Ring simulator</small></div></button><button onClick={() => simulate('security_alert')} disabled={loading}><span>🚨</span><div><b>Security alert</b><small>Critical · front door · Ring simulator</small></div></button></div><small className="muted">The Ring device is simulated for the hackathon demo.</small></Panel></section>

    {notification && <section className="notification"><div className="notifTop"><div className="orb">A</div><div><p className="eyebrow">ALEXA+ · USER MOMENT</p><h2>Ambient has something for you</h2></div><b>READY</b></div><div className="message">{notification.action?.message || `Your ${pretty(notification.event?.type)} needs your attention.`}</div><div className="chips"><span>Decision · {notification.decision?.decision}</span><span>Confidence · {pct(notification.decision?.confidence)}</span><span>Source · {notification.decision?.source}</span></div><div className="buttons"><button onClick={() => setSelected(notification)}>Show details →</button><button onClick={() => dismiss(notification)}>Dismiss</button></div></section>}

    {waiting[0] && <section className="waiting"><div><p className="eyebrow">MEMORY · DEFERRED</p><h2>Ambient is waiting for the right moment.</h2><p>{pretty(waiting[0].type)} was stored because interrupting a meeting is unnecessary.</p></div><strong>WAIT<small>re-evaluate on context change</small></strong></section>}

    {result && <>
      <section className="decisionGrid"><Panel title="03 · DECISION BRAIN" heading="Decision Engine"><div className="decision"><strong>{result.decision?.decision}</strong><span>{pretty(result.event?.type)}</span></div><p className="reason">{result.decision?.reason}</p><div className="chips"><span>Urgency · {result.decision?.priority}</span><span>Confidence · {pct(result.decision?.confidence)}</span><span>Gate · {result.decision?.gate?.mode || 'AUTO'}</span><span>Source · {result.decision?.source}</span></div><div className="suggested">Suggested action<b>{result.decision?.suggestedAction}</b></div></Panel>
        <Panel title="DECISION TRACE" heading="Why this happened?"><div className="trace">{[['Event', pretty(result.event?.type)],['Context', `${pretty(result.context?.availability)} · ${pretty(result.context?.activity)}`],['Model', `${result.decision?.decision} · ${pct(result.decision?.confidence)}`],['Policy', result.decision?.policyReason || 'validated pass-through'],['Action', pretty(result.action?.status || 'none')]].map(([a,b],i)=><React.Fragment key={a}><div><b>{a}</b><span>{b}</span></div>{i<4&&<i>↓</i>}</React.Fragment>)}</div></Panel></section>

      <section className="panel"><div className="panelTop"><div><p className="eyebrow">AWS BUILDER · AMAZON BEDROCK</p><h2>Explain the moment</h2></div><span className="badge">NOVA LITE</span></div><p className="muted">Bedrock is an explanation layer only. It cannot change Jev's decision or deterministic policy.</p>{!insight ? <button className="wide" onClick={generateInsight} disabled={loading}>Generate AWS insight</button> : <div className="insight"><b>{insight.enabled ? `${insight.region} · ${insight.model}` : 'Bedrock disabled'}</b><p>{insight.text}</p></div>}</section>

      {result.decision?.jev && <section className="panel"><div className="panelTop"><div><p className="eyebrow">DECISION SIGNALS</p><h2>Typed model outputs</h2></div><span className="muted">No prose parsing</span></div><div className="signals"><Distribution title="Action" data={decisionDist} selected={result.decision.decision}/><Distribution title="Urgency" data={priorityDist} selected={result.decision.priority} priority/><div className="signal"><label>Should interrupt?</label><strong>{pct(result.decision.jev.interruptProbability)}</strong><small>Noul probability</small><div className="meter"><i style={{width:pct(result.decision.jev.interruptProbability)}}/></div></div></div></section>}
    </>}

    <section className="panel"><div className="panelTop"><div><p className="eyebrow">MEMORY</p><h2>Decision history</h2></div><span className="muted">Latest 20</span></div>{history.length ? history.map((d,i)=><div className="history" key={d._id || `${d.createdAt}-${i}`}><span>{String(i+1).padStart(2,'0')}</span><b>{d.decision}</b><span>{d.priority}</span><small>{d.source} · {pct(d.confidence)}</small><button onClick={() => setSelected({event:{type:'historical decision',...d},decision:d})}>Inspect</button></div>) : <p className="muted">No decisions yet. Start a meeting and simulate a package delivery.</p>}</section>

    {selected && <div className="overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modalTop"><h3>Decision details</h3><button onClick={()=>setSelected(null)}>×</button></div><p className="muted">This is a simulated device event captured by Ambient's orchestration pipeline.</p><dl><dt>Event</dt><dd>{pretty(selected.event?.type)}</dd><dt>Source</dt><dd>{selected.event?.source || 'ring'}</dd><dt>Decision</dt><dd>{selected.decision?.decision}</dd><dt>Priority</dt><dd>{selected.decision?.priority}</dd><dt>Confidence</dt><dd>{pct(selected.decision?.confidence)}</dd><dt>Policy</dt><dd>{selected.decision?.policyReason || 'none'}</dd></dl><div className="buttons end"><button onClick={()=>setSelected(null)}>Close</button>{selected.event?._id && <button onClick={()=>{dismiss(selected);setSelected(null)}}>Dismiss</button>}</div></div></div>}

    <footer>AMBIENT · Context → Decision → Policy → Action <span>Bounded AI judgment with deterministic control</span></footer>
  </main>;
}

function Panel({title,heading,children}) { return <section className="panel"><p className="eyebrow">{title}</p><h2>{heading}</h2>{children}</section>; }
function Distribution({title,data,selected,priority=false}) { const entries=Object.entries(data||{}); const labels=['low','medium','high','critical']; return <div className="signal"><label>{title}</label>{entries.length ? entries.map(([k,v])=><div className="bar" key={k}><span>{priority ? pretty(labels[Number(k)] ?? k) : pretty(k)}</span><div className="meter"><i className={(priority ? labels[Number(k)] === selected : k === selected) ? 'selected' : ''} style={{width:pct(v)}}/></div><small>{pct(v)}</small></div>) : <strong>{pretty(selected)}</strong>}</div>; }

createRoot(document.getElementById('root')).render(<App/>);
