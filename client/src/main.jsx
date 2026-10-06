import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ctx, hist, records] = await Promise.all([
        request(`/context?userId=${USER}`),
        request(`/events/history?userId=${USER}`), request(`/events?userId=${USER}`)
      ]);
      setConnected(true);
      setContext(ctx.data?.context || ctx.data);
      setHistory(hist.data?.decisions || []);
      setWaiting(hist.data?.waiting || []);
      setNotification((records.data || []).find(item => item.status === 'notified' && (item.action?.status === 'ready' || (!item.action && item.decision?.decision === 'NOTIFY'))) || null);
    } catch (e) { setConnected(false); setNotice(`Connection lost. Your saved data is unchanged. Retrying automatically.`); }
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
    try { await request(`/events/${id}/dismiss?userId=${USER}`, { method: 'POST' }); setNotification(null); setNotice('Event dismissed.'); await load(); return true; }
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


  return <><a className="skip" href="#overview">Skip to dashboard</a><aside className="sidebar"><div className="sideBrand"><span className="brandMark">a</span>ambient</div><p className="sideLabel">WORKSPACE</p><nav aria-label="Main navigation"><a href="#overview"><span>◫</span>Overview</a><a href="#activity"><span>≡</span>Activity</a></nav><div className="sideFoot"><strong>A little less interruption.</strong>A little more focus.<br/>Hackathon demo · simulated devices</div></aside><main>
    <header><div className="brand"><span className="dot"/>AMBIENT <em>v0.9.0</em></div><div className="headerStatus"><span>{connected ? 'Connected to workspace' : 'Connecting…'}</span><b className={busy ? 'busy' : ''}>{!connected ? 'OFFLINE' : busy ? 'FOCUS MODE' : 'AVAILABLE'}</b></div></header>

    <section className="hero" id="overview"><p className="eyebrow">YOUR DAY, WITH FEWER INTERRUPTIONS</p><h1>Make room for <span>the moment.</span></h1><p>Stay present. Ambient holds routine updates while you focus, and brings them back when you're ready.</p><div className="loop"><span>01 · Notice</span><i>→</i><span>02 · Understand</span><i>→</i><span>03 · Act at the right time</span></div></section>
    <div className={`notice ${!connected ? 'error' : ''}`} role="status" aria-live="polite"><span aria-hidden="true">{connected ? '●' : '○'}</span>{!connected ? 'Connecting to your workspace. Retrying automatically…' : notice.startsWith('Connection lost') ? 'Connection restored. Your workspace is up to date.' : notice}</div>
    <section className="two"><Panel title="YOUR CONTEXT" heading="Protect your focus"><div className="moment"><div className={`momentIcon ${busy ? 'busy' : ''}`}>{busy ? '◉' : '○'}</div><div><strong>{!context ? 'Loading your context…' : busy ? 'In a meeting' : 'Open to updates'}</strong><small>{context?.location || 'home'} · {context?.activity || 'idle'}</small></div></div><div className="buttons"><button disabled={loading || !connected || busy} onClick={() => applyContext('busy')}>Start meeting</button><button disabled={loading || !connected || !busy} onClick={() => applyContext('available')}>End meeting</button></div></Panel>
      <Panel title="EVENT SIMULATOR" heading="Try a real-life moment"><div className="events"><button onClick={() => simulate('package_delivered')} disabled={loading || !connected}><span aria-hidden="true">◇</span><div><b>Package delivered</b><small>Routine · front door · Ring simulator</small></div></button><button onClick={() => simulate('security_alert')} disabled={loading || !connected}><span aria-hidden="true">!</span><div><b>Security alert</b><small>Critical · front door · Ring simulator</small></div></button></div><small className="muted">The Ring device is simulated for the hackathon demo.</small></Panel></section>

    {notification && <section className="notification"><div className="notifTop"><div className="orb">A</div><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>A timely update</h2></div><b>SIMULATED ALEXA+</b></div><div className="message">{notification.action?.message || `Your ${pretty(notification.event?.type)} needs your attention.`}</div><div className="chips"><span>Decision · {notification.decision?.decision}</span><span>Confidence · {pct(notification.decision?.confidence)}</span><span>Source · {notification.decision?.source}</span></div><div className="buttons"><button onClick={() => setSelected(notification)}>Show details →</button><button disabled={loading || !connected} onClick={() => dismiss(notification)}>Dismiss</button></div></section>}

    {waiting[0] && <section className="waiting"><div><p className="eyebrow">SAVED FOR LATER</p><h2>Your focus comes first.</h2><p>{pretty(waiting[0].type)} is waiting. Ambient will reconsider it when your context changes.</p></div><strong>WAIT<small>re-evaluate on context change</small></strong></section>}

    {result && <>
      <section className="decisionGrid"><Panel title="LATEST DECISION" heading="A considered response"><div className="decision"><strong>{result.decision?.decision}</strong><span>{pretty(result.event?.type)}</span></div><p className="reason">{result.decision?.reason}</p><div className="chips"><span>Urgency · {result.decision?.priority}</span><span>Confidence · {pct(result.decision?.confidence)}</span><span>Gate · {result.decision?.gate?.mode || 'AUTO'}</span><span>Source · {result.decision?.source}</span></div><div className="suggested">Suggested action<b>{result.decision?.suggestedAction}</b></div></Panel>
        <Panel title="DECISION TRACE" heading="How we got here"><div className="trace">{[['Event', pretty(result.event?.type)],['Context', `${pretty(result.context?.availability)} · ${pretty(result.context?.activity)}`],['Model', `${result.decision?.decision} · ${pct(result.decision?.confidence)}`],['Policy', result.decision?.policyReason || 'validated pass-through'],['Action', pretty(result.action?.status || 'none')]].map(([a,b],i)=><React.Fragment key={a}><div><b>{a}</b><span>{b}</span></div>{i<4&&<i>↓</i>}</React.Fragment>)}</div></Panel></section>

      <section className="panel"><div className="panelTop"><div><p className="eyebrow">AWS BUILDER · AMAZON BEDROCK</p><h2>Explain the moment</h2></div><span className="badge">OPTIONAL</span></div><p className="muted">Bedrock is an explanation layer only. It cannot change Jev's decision or deterministic policy.</p>{!insight ? <button className="wide" onClick={generateInsight} disabled={loading || !connected}>Generate AWS insight</button> : <div className="insight"><b>{insight.enabled ? `${insight.region} · ${insight.model}` : 'Bedrock disabled'}</b><p>{insight.text}</p></div>}</section>

      {result.decision?.jev && <section className="panel"><div className="panelTop"><div><p className="eyebrow">DECISION SIGNALS</p><h2>Typed model outputs</h2></div><span className="muted">No prose parsing</span></div><div className="signals"><Distribution title="Action" data={decisionDist} selected={result.decision.decision}/><Distribution title="Urgency" data={priorityDist} selected={result.decision.priority} priority/><div className="signal"><label>Should interrupt?</label><strong>{pct(result.decision.jev.interruptProbability)}</strong><small>Noul probability</small><div className="meter"><i style={{width:pct(result.decision.jev.interruptProbability)}}/></div></div></div></section>}
    </>}

    <section className="panel" id="activity"><div className="panelTop"><div><p className="eyebrow">YOUR ACTIVITY</p><h2>Decision history</h2></div><span className="muted">Latest 20</span></div>{history.length ? history.map((d,i)=><div className="history" key={d._id || `${d.createdAt}-${i}`}><span>{String(i+1).padStart(2,'0')}</span><b>{d.decision}</b><span>{d.priority}</span><small>{d.source} · {pct(d.confidence)}</small><button onClick={() => setSelected({decision:d})}>Inspect</button></div>) : <div className="emptyState"><strong>A quieter day starts here.</strong><p>Start a meeting, then simulate a package delivery.<br/>Each decision will appear here, with its reason.</p></div>}</section>

    {selected && <Details item={selected} onClose={() => setSelected(null)} onDismiss={dismiss} loading={loading}/>}
    <footer>Ambient · Thoughtful by design<span>Device experiences are simulated. Decisions are real application outputs.</span></footer>
  </main></>;
}

function Panel({title,heading,children}) { return <section className="panel"><p className="eyebrow">{title}</p><h2>{heading}</h2>{children}</section>; }
function Distribution({title,data,selected,priority=false}) { const entries=Object.entries(data||{}); const labels=['low','medium','high','critical']; return <div className="signal"><label>{title}</label>{entries.length ? entries.map(([k,v])=><div className="bar" key={k}><span>{priority ? pretty(labels[Number(k)] ?? k) : pretty(k)}</span><div className="meter"><i className={(priority ? labels[Number(k)] === selected : k === selected) ? 'selected' : ''} style={{width:pct(v)}}/></div><small>{pct(v)}</small></div>) : <strong>{pretty(selected)}</strong>}</div>; }

function Details({item, onClose, onDismiss, loading}) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog className="overlay" ref={ref} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} aria-labelledby="detail-title"><div className="modal"><div className="modalTop"><h3 id="detail-title">Decision details</h3><button onClick={onClose} aria-label="Close details">×</button></div><p className="muted">{item.event ? 'A simulated device event, evaluated against your context.' : 'A saved decision from your activity history.'}</p><dl>{item.event && <><dt>Event</dt><dd>{pretty(item.event.type)}</dd><dt>Source</dt><dd>{pretty(item.event.source)}</dd></>}<dt>Decision</dt><dd>{item.decision?.decision}</dd><dt>Priority</dt><dd>{pretty(item.decision?.priority)}</dd><dt>Confidence</dt><dd>{pct(item.decision?.confidence)}</dd><dt>Reason</dt><dd>{item.decision?.reason}</dd><dt>Policy</dt><dd>{pretty(item.decision?.policyReason || 'No override')}</dd></dl><div className="buttons end"><button onClick={onClose}>Close</button>{item.event?._id && <button disabled={loading} onClick={async () => { if (await onDismiss(item)) onClose(); }}>Dismiss update</button>}</div></div></dialog>;
}
createRoot(document.getElementById('root')).render(<App/>);
