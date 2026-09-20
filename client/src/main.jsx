import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = 'http://localhost:5000/api';
const USER = 'demo-user';

const pretty = (value = '') => String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const pct = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

function App() {
  const [context, setContext] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [alexa, setAlexa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('Ready for a context-aware event.');
  const [selectedDetail, setSelectedDetail] = useState(null);

  const load = async () => {
    try {
      const [contextRes, historyRes] = await Promise.all([
        fetch(`${API}/context?userId=${USER}`),
        fetch(`${API}/events/history?userId=${USER}`)
      ]);
      const contextJson = await contextRes.json();
      const historyJson = await historyRes.json();
      setContext(contextJson.data?.context || contextJson.data);
      setHistory(historyJson.data?.decisions || []);
      setWaiting(historyJson.data?.waiting || []);
    } catch {
      setNotice('Backend is not reachable. Start the server on port 5000.');
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const applyContext = async (availability) => {
    setLoading(true);
    setAlexa(null);
    try {
      const res = await fetch(`${API}/context`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability,
          activity: availability === 'busy' ? 'meeting' : 'idle',
          location: 'home',
          userId: USER
        })
      });
      const json = await res.json();
      const results = json.data?.results || [];
      if (results.length) {
        const latest = results[results.length - 1];
        setResult(latest);
        const notification = [...results].reverse().find((item) => item.action?.status === 'ready');
        if (notification) setAlexa(notification);
        setNotice(`Context changed. ${results.length} waiting event${results.length > 1 ? 's' : ''} re-evaluated.`);
      } else {
        setNotice(availability === 'busy' ? 'Meeting mode enabled. Non-critical events will wait.' : 'You are available. Ambient will reconsider anything waiting.');
      }
      await load();
    } finally {
      setLoading(false);
    }
  };

  const simulate = async (type) => {
    setLoading(true);
    setAlexa(null);
    try {
      const event = {
        source: 'ring',
        type,
        priority: type === 'security_alert' ? 'critical' : 'medium',
        metadata: { location: 'front_door', device: 'ring_simulator' }
      };
      const res = await fetch(`${API}/agent/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, userId: USER })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Evaluation failed');
      setResult(json.data);
      if (json.data.action?.status === 'ready') setAlexa(json.data);
      setNotice(json.data.decision?.decision === 'WAIT'
        ? 'Ambient remembered the event instead of interrupting you.'
        : `Ambient chose ${json.data.decision?.decision} and routed the result.`);
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = async (eventId) => {
    if (!eventId) return;
    setLoading(true);
    try {
      await fetch(`${API}/events/${eventId}/dismiss`, { method: 'POST' });
      if (alexa?.event?._id === eventId || alexa?.event?.id === eventId) {
        setAlexa(null);
      }
      setNotice('Event dismissed.');
      await load();
    } catch (err) {
      setNotice(`Could not dismiss: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const status = context?.availability === 'busy' ? 'BUSY' : 'AVAILABLE';
  const lastWaiting = waiting[0];
  const decisionDistribution = result?.decision?.jev?.probabilities?.decision || {};
  const priorityDistribution = result?.decision?.jev?.probabilities?.priority || {};

  return (
    <main>
      <header>
        <div className="brand"><span className="brandDot" /> AMBIENT <span className="version">v0.7</span></div>
        <div className="headerRight">
          <span className="muted">Alexa+ simulated experience</span>
          <span className={`status ${status === 'BUSY' ? 'busy' : ''}`}>{status}</span>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">THE ASSISTANT THAT KNOWS WHEN TO ACT</p>
          <h1>Don't just understand the event.<br /><span>Understand the moment.</span></h1>
          <p className="lead">Ambient watches what happens around you, reads your current moment, asks the decision model for a bounded choice, validates it with deterministic policy, and acts only when timing makes sense.</p>
        </div>
        <div className="heroLoop">
          <span>EVENT</span><i>→</i><span>CONTEXT</span><i>→</i><span>AI</span><i>→</i><span>POLICY</span><i>→</i><span>ACTION</span>
        </div>
      </section>

      <section className="statusBar">
        <span className="statusPulse" /> {notice}
      </section>

      <div className="grid two">
        <section className="card">
          <div className="sectionTop"><div><p className="eyebrow">01 · MOMENT</p><h2>What are you doing?</h2></div><span className="live">● LIVE</span></div>
          <div className="moment">
            <div className={`momentIcon ${status === 'BUSY' ? 'busyIcon' : ''}`}>{status === 'BUSY' ? '◉' : '○'}</div>
            <div><strong>{status === 'BUSY' ? 'In a meeting' : 'Available'}</strong><span>{context?.location || 'home'} · {context?.activity || 'idle'}</span></div>
          </div>
          <div className="actions">
            <button onClick={() => applyContext('busy')} disabled={loading || status === 'BUSY'}>Start meeting</button>
            <button onClick={() => applyContext('available')} disabled={loading || status === 'AVAILABLE'}>End meeting</button>
          </div>
        </section>

        <section className="card">
          <div className="sectionTop"><div><p className="eyebrow">02 · EVENT</p><h2>What just happened?</h2></div><span className="muted">Ring simulator</span></div>
          <div className="eventButtons">
            <button className="eventButton primary" onClick={() => simulate('package_delivered')} disabled={loading}>
              <span>📦</span>
              <div><b>Package delivered</b><small>Non-critical · front door</small></div>
            </button>
            <button className="eventButton danger" onClick={() => simulate('security_alert')} disabled={loading}>
              <span>🚨</span>
              <div><b>Security alert</b><small>Critical · front door</small></div>
            </button>
          </div>
          <p className="muted small">Evaluates action, urgency, and interruption probability against current context.</p>
        </section>
      </div>

      {alexa && (
        <section className="alexaCard reveal">
          <div className="alexaTop">
            <span className="alexaOrb">A</span>
            <div><p className="eyebrow">ALEXA+ · USER MOMENT</p><h2>Ambient has something for you</h2></div>
            <span className="readyBadge">READY</span>
          </div>
          <div className="alexaMessage">{alexa.action?.message || `Notification: ${pretty(alexa.event?.type)}`}</div>
          <div className="alexaMeta">
            <span>Target · Alexa+</span>
            <span>Decision · {alexa.decision?.decision}</span>
            <span>Confidence · {pct(alexa.decision?.confidence)}</span>
            <span>Source · {alexa.decision?.source}</span>
          </div>
          <div className="alexaActions">
            <button className="showButton" onClick={() => setSelectedDetail(alexa)}>Show details <span>→</span></button>
            <button className="dismissButton" onClick={() => dismiss(alexa.event?._id || alexa.event?.id)}>Dismiss</button>
          </div>
        </section>
      )}

      {lastWaiting && (
        <section className="waitingCard reveal">
          <div>
            <p className="eyebrow">MEMORY · DEFERRED</p>
            <h2>Ambient is waiting for the right moment.</h2>
            <p>{pretty(lastWaiting.type)} is remembered because interrupting you during a meeting is unnecessary.</p>
          </div>
          <div className="waitingBadge"><span>WAIT</span><small>re-evaluate on context change</small></div>
        </section>
      )}

      {result && (
        <section className="decisionGrid">
          <div className="card decisionCard">
            <div className="sectionTop">
              <div><p className="eyebrow">03 · DECISION BRAIN</p><h2>Decision Engine</h2></div>
              <span className="confidence">{pct(result.decision?.confidence)} confidence</span>
            </div>
            <div className="decisionTitle">
              <strong>{result.decision?.decision}</strong>
              <span>{pretty(result.event?.type)}</span>
            </div>
            <p className="reason">{result.decision?.reason}</p>
            <div className="chips">
              <span>urgency · {result.decision?.priority}</span>
              {result.decision?.jev?.interruptProbability !== undefined && <span>interrupt · {pct(result.decision.jev.interruptProbability)}</span>}
              <span>source · {result.decision?.source}</span>
              <span>gate · {result.decision?.gate?.mode || 'AUTO'}</span>
            </div>
            <div className="suggested">Suggested action <b>{result.decision?.suggestedAction}</b></div>
            {result.decision?.gate && <div className="gateNote">Confidence gate · {result.decision.gate.mode} · {result.decision.gate.reason}</div>}
          </div>

          <div className="card traceCard">
            <p className="eyebrow">DECISION TRACE</p><h2>Why this happened</h2>
            <div className="trace">
              <div><b>Event</b><span>{pretty(result.event?.type)}</span></div>
              <i>↓</i>
              <div><b>Context</b><span>{pretty(result.context?.availability)} · {pretty(result.context?.activity)}</span></div>
              <i>↓</i>
              <div><b>Model</b><span>{result.decision?.decision} ({pct(result.decision?.confidence)})</span></div>
              <i>↓</i>
              <div><b>Policy</b><span>{result.decision?.source?.includes('policy') ? 'Override rules enforced' : 'Validated pass-through'}</span></div>
              <i>↓</i>
              <div><b>Action</b><span>{pretty(result.action?.status || 'none')}</span></div>
            </div>
          </div>
        </section>
      )}

      {result && result.decision?.jev && (
        <section className="card signals">
          <div className="sectionTop"><div><p className="eyebrow">DECISION SIGNALS</p><h2>Model output distributions</h2></div><span className="muted">Typed outputs · no prose parsing</span></div>
          <div className="signalGrid">
            <Signal title="Action" data={decisionDistribution} selected={result.decision.decision} />
            <Signal title="Urgency" data={priorityDistribution} selected={result.decision.priority} priority />
            <div className="signalBox">
              <span className="signalLabel">Should interrupt?</span>
              <strong>{pct(result.decision.jev.interruptProbability)}</strong>
              <small>noul probability</small>
              <div className="meter"><span style={{ width: pct(result.decision.jev.interruptProbability) }} /></div>
            </div>
          </div>
        </section>
      )}

      <section className="card history">
        <div className="sectionTop"><div><p className="eyebrow">MEMORY</p><h2>Decision history</h2></div><span className="muted">Latest decisions</span></div>
        {history.length === 0 ? <div className="empty">No decisions yet. Start a meeting and simulate a package delivery to begin.</div> : history.map((item, index) => (
          <div className="historyRow" key={`${item._id || item.eventId || index}-${index}`}>
            <span className="historyIndex">{String(index + 1).padStart(2, '0')}</span>
            <b>{pretty(item.decision)}</b>
            <strong>{pretty(item.priority)}</strong>
            <small>{item.source} · {pct(item.confidence)}</small>
            <button className="historyDismiss" onClick={() => setSelectedDetail({ event: { type: item.decision, ...item }, decision: item })}>Inspect</button>
          </div>
        ))}
      </section>

      {selectedDetail && (
        <div className="modalOverlay" onClick={() => setSelectedDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Event Details: {pretty(selectedDetail.event?.type || 'Event')}</h3>
              <button className="modalClose" onClick={() => setSelectedDetail(null)}>✕</button>
            </div>
            <div className="modalContent">
              <p>Simulated device event captured by Ambient orchestration pipeline.</p>
              <div className="modalMeta">
                <div className="modalMetaRow"><span>Source:</span><strong>{selectedDetail.event?.source || 'ring'}</strong></div>
                <div className="modalMetaRow"><span>Location:</span><strong>{selectedDetail.event?.metadata?.location || 'front_door'}</strong></div>
                <div className="modalMetaRow"><span>Device:</span><strong>{selectedDetail.event?.metadata?.device || 'ring_simulator'}</strong></div>
                <div className="modalMetaRow"><span>Decision:</span><strong>{selectedDetail.decision?.decision || 'NOTIFY'}</strong></div>
                <div className="modalMetaRow"><span>Urgency:</span><strong>{selectedDetail.decision?.priority || 'medium'}</strong></div>
              </div>
              <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => { dismiss(selectedDetail.event?._id || selectedDetail.event?.id); setSelectedDetail(null); }}>Dismiss Event</button>
                <button className="primary" onClick={() => setSelectedDetail(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer>
        <span>AMBIENT · Context → Decision → Policy → Action</span>
        <span>Bounded AI judgment with deterministic policy control</span>
      </footer>
    </main>
  );
}

function Signal({ title, data, selected, priority = false }) {
  const entries = Object.entries(data || {});
  if (!entries.length) return <div className="signalBox"><span className="signalLabel">{title}</span><strong>{pretty(selected)}</strong><small>Model result</small></div>;
  return (
    <div className="signalBox">
      <span className="signalLabel">{title}</span>
      {entries.map(([key, value]) => (
        <div className="barRow" key={key}>
          <span>{priority ? ['low', 'medium', 'high', 'critical'][Number(key)] || key : pretty(key)}</span>
          <div className="meter"><span className={key === selected || (priority && key === ['low', 'medium', 'high', 'critical'].indexOf(selected).toString()) ? 'selected' : ''} style={{ width: pct(value) }} /></div>
          <small>{pct(value)}</small>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
