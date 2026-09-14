import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
const API = 'http://localhost:5000/api';
async function request(path, method = 'GET', body) {
  const response = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Request failed.');
  return result.data;
}
const title = record => record.event.type === 'package_delivered' ? 'Package delivered' : 'Security alert';
const time = value => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
function App() {
  const [context, setContext] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  async function load() {
    const [nextContext, nextEvents] = await Promise.all([request('/context'), request('/events')]);
    setContext(nextContext); setEvents(nextEvents); setError('');
  }
  useEffect(() => {
    let stopped = false;
    let timer;
    async function poll() {
      try { if (!stopped) await load(); } catch (err) { if (!stopped) setError(err.message); }
      if (!stopped) timer = setTimeout(poll, 1500);
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);
  async function act(path, method, body) {
    setLoading(true);
    try { await request(path, method, body); await load(); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  const simulate = type => act('/events', 'POST', { event: { source: 'ring', type, priority: type === 'security_alert' ? 'critical' : 'medium', metadata: { location: 'front_door' } } });
  const pending = events.filter(item => item.status === 'deferred');
  const notifications = events.filter(item => item.status === 'notified');
  const detail = events.find(item => item.id === selected);
  return <main>
    <header><div><span className="dot" /> AMBIENT</div><span className="muted">Simulated device experience</span></header>
    <section className="hero"><p className="eyebrow">THE ASSISTANT THAT KNOWS WHEN TO ACT</p><h1>Understand the moment.</h1><p className="lead">Important events can wait. Urgent ones reach you now.</p></section>
    {error && <p role="alert" className="error">{error} Check the server connection; Ambient will retry automatically.</p>}
    <div className="grid">
      <section className="card"><h2>Current context</h2><div className="context"><b>{!context ? 'Connecting…' : context.availability === 'busy' ? '🔴 Busy' : '🟢 Available'}</b><span>{context?.activity}</span><span>{context?.location}</span></div><div className="actions"><button disabled={loading || !context || context.availability === 'busy'} onClick={() => act('/context', 'PATCH', { availability: 'busy' })}>Start meeting</button><button disabled={loading || !context || context.availability === 'available'} onClick={() => act('/context', 'PATCH', { availability: 'available' })}>End meeting</button></div></section>
      <section className="card"><h2>Simulate device event</h2><button className="primary" disabled={loading || !context} onClick={() => simulate('package_delivered')}>📦 Package delivered</button><button disabled={loading || !context} onClick={() => simulate('security_alert')}>🚨 Security alert</button></section>
    </div>
    <section className="card section"><h2>Waiting for the right moment <span className="muted">({pending.length})</span></h2>{pending.length ? pending.map(item => <p key={item.id}>📦 {title(item)} · {time(item.event.occurredAt)} — Waiting until your meeting ends.</p>) : <p className="muted">No deferred events.</p>}</section>
    <section className="section" aria-live="polite"><h2>Notifications</h2>{!notifications.length && <p className="muted">You're all caught up.</p>}{notifications.map(item => <article className="card notification" key={item.id}><p className="eyebrow">{item.event.type === 'security_alert' ? 'URGENT' : 'READY FOR YOU'}</p><h3>{title(item)}</h3><p>{item.timeline.some(step => step.action === 'WAIT') ? 'Your package arrived during your meeting. I waited until you were available.' : item.decision.reason}</p><div className="actions"><button onClick={() => setSelected(item.id)}>{item.event.type === 'package_delivered' ? 'Show package' : 'Show event'}</button><button disabled={loading} onClick={() => { setSelected(null); act('/events/' + item.id + '/dismiss', 'POST'); }}>Dismiss</button></div></article>)}</section>
    {detail && <section className="card section"><h2>{title(detail)}</h2><p>Front door · {time(detail.event.occurredAt)}</p><p className="muted">Simulated Ring event. No camera image is attached.</p><button onClick={() => setSelected(null)}>Close details</button></section>}
    <section className="card section"><h2>Decision timeline</h2>{!events.length && <p className="muted">Start a meeting, then simulate a delivery to see Ambient decide.</p>}{events.map(item => <article className="history" key={item.id}><h3>{title(item)} <span className="badge">{item.status}</span></h3><ol>{item.timeline.map((step, index) => <li key={index}><time>{time(step.at)}</time><strong>{step.action}</strong><span>{step.reason}</span></li>)}</ol></article>)}</section>
    <p className="muted section">Demo session: decisions and notification status reset when the server restarts.</p>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
