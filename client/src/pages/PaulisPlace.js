import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';
const POLL_INTERVAL = 2000; // 2s polling for real-time feel

// Agent fleet colors from the registry
const AGENT_COLORS = {
  pauli: '#6366f1',
  agent_zero: '#f43f5e',
  devika: '#06b6d4',
  alex: '#10b981',
  darya: '#a855f7',
  synthia: '#ec4899',
  clawdbot: '#f59e0b',
  cynthia: '#14b8a6',
  visionclaw: '#64748b',
  maya: '#fb923c',
  luna: '#c084fc',
  aurora: '#38bdf8',
  system: '#475569',
  user: '#ffffff',
};

const MEETING_TYPES = [
  { value: 'standup', label: '🔄 Standup', color: '#22c55e' },
  { value: 'architecture', label: '🏗️ Architecture', color: '#6366f1' },
  { value: 'sprint-planning', label: '📋 Sprint Planning', color: '#f59e0b' },
  { value: 'retrospective', label: '🔍 Retrospective', color: '#ec4899' },
  { value: 'emergency', label: '🚨 Emergency', color: '#ef4444' },
];

function PaulisPlace() {
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAgenda, setNewAgenda] = useState('');
  const [newType, setNewType] = useState('standup');
  const [chatInput, setChatInput] = useState('');
  const [sendAs, setSendAs] = useState('user');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [showAgentPanel, setShowAgentPanel] = useState(true);
  const [discussTopic, setDiscussTopic] = useState('');
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    checkStatus();
    loadMeetings();
    loadAgents();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling for messages when meeting is active
  const startPolling = useCallback((meetingId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/meetings/${meetingId}/messages`);
        setMessages(res.data.messages || []);
      } catch (e) { /* silent */ }
    }, POLL_INTERVAL);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/status`);
      setServerStatus(res.data);
    } catch {
      setServerStatus({ status: 'offline' });
    }
  };

  const loadMeetings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/meetings`);
      setMeetings(res.data.meetings || []);
    } catch (e) {
      console.error('Failed to load meetings', e);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/agents`);
      setAgents(res.data.agents || []);
    } catch (e) {
      console.error('Failed to load agents', e);
    }
  };

  const selectMeeting = async (meeting) => {
    setActiveMeeting(meeting);
    try {
      const res = await axios.get(`${API_BASE}/api/meetings/${meeting.id}/messages`);
      setMessages(res.data.messages || []);
      startPolling(meeting.id);
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  const createMeeting = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/meetings`, {
        title: newTitle,
        agenda: newAgenda,
        meeting_type: newType,
        invite_agents: [],
      });
      setNewTitle('');
      setNewAgenda('');
      setNewType('standup');
      loadMeetings();
      if (res.data.meeting) selectMeeting(res.data.meeting);
    } catch (e) {
      console.error('Failed to create meeting', e);
    }
    setLoading(false);
  };

  const startMeeting = async () => {
    if (!activeMeeting) return;
    try {
      const res = await axios.post(`${API_BASE}/api/meetings/${activeMeeting.id}/start`);
      const updated = res.data.meeting || { ...activeMeeting, status: 'in_progress' };
      setActiveMeeting(updated);
      loadMeetings();
      // Reload messages to get Devika's opening
      const msgRes = await axios.get(`${API_BASE}/api/meetings/${activeMeeting.id}/messages`);
      setMessages(msgRes.data.messages || []);
    } catch (e) {
      console.error('Start failed', e);
    }
  };

  const endMeeting = async () => {
    if (!activeMeeting) return;
    try {
      await axios.post(`${API_BASE}/api/meetings/${activeMeeting.id}/end`);
      if (pollRef.current) clearInterval(pollRef.current);
      setActiveMeeting(null);
      loadMeetings();
    } catch (e) {
      console.error('End failed', e);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeMeeting) return;
    try {
      await axios.post(`${API_BASE}/api/meetings/${activeMeeting.id}/messages`, {
        agent_id: sendAs,
        content: chatInput,
        message_type: 'chat',
      });
      setChatInput('');
      const res = await axios.get(`${API_BASE}/api/meetings/${activeMeeting.id}/messages`);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error('Send failed', e);
    }
  };

  const triggerDiscussion = async () => {
    if (!activeMeeting) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/api/meetings/${activeMeeting.id}/agent-discuss`, {
        topic: discussTopic || activeMeeting.agenda || activeMeeting.title,
      });
      setDiscussTopic('');
      const res = await axios.get(`${API_BASE}/api/meetings/${activeMeeting.id}/messages`);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error('Discussion failed', e);
    }
    setLoading(false);
  };

  const getColor = (agentId) => AGENT_COLORS[agentId] || '#64748b';
  const getStatusDot = (status) => {
    const colors = { online: '#22c55e', hidden: '#6366f1', standby: '#f59e0b', offline: '#ef4444' };
    return colors[status] || '#64748b';
  };

  const meetingTypeColor = (type) => {
    const mt = MEETING_TYPES.find(t => t.value === type);
    return mt ? mt.color : '#64748b';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: '#0a0e1a', color: '#e2e8f0' }}>

      {/* ── Left Sidebar: Meetings ── */}
      <div style={{ width: 300, borderRight: '1px solid #1a1f35', display: 'flex', flexDirection: 'column', background: '#0f1424' }}>
        {/* Header */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1a1f35' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff',
            }}>P</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc',
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Pauli's Place
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                {serverStatus?.status === 'online' ? '● Connected' : '○ Offline'} · {agents.length} agents
              </p>
            </div>
          </div>
        </div>

        {/* Create Meeting */}
        <div style={{ padding: 12, borderBottom: '1px solid #1a1f35' }}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Meeting title..."
            style={inputStyle} />
          <input value={newAgenda} onChange={(e) => setNewAgenda(e.target.value)}
            placeholder="Agenda (optional)"
            style={{ ...inputStyle, marginTop: 6 }} />
          <select value={newType} onChange={(e) => setNewType(e.target.value)}
            style={{ ...inputStyle, marginTop: 6, cursor: 'pointer' }}>
            {MEETING_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button onClick={createMeeting} disabled={loading || !newTitle.trim()}
            style={{
              ...btnStyle, marginTop: 8, width: '100%',
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              color: '#0a0e1a', fontWeight: 700,
            }}>
            + New Meeting
          </button>
        </div>

        {/* Meeting List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {meetings.map((m) => (
            <div key={m.id} onClick={() => selectMeeting(m)}
              style={{
                padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #1a1f35',
                background: activeMeeting?.id === m.id
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))'
                  : 'transparent',
                borderLeft: activeMeeting?.id === m.id ? '3px solid #6366f1' : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: meetingTypeColor(m.meeting_type),
                }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{m.title}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, paddingLeft: 12 }}>
                {m.status} · {m.meeting_type}
              </div>
            </div>
          ))}
          {meetings.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 }}>
              No meetings yet.<br />Create one above.
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeMeeting ? (
          <>
            {/* Meeting Header */}
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid #1a1f35',
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#0f1424',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: meetingTypeColor(activeMeeting.meeting_type),
              }} />
              <h3 style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 600 }}>
                {activeMeeting.title}
              </h3>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 12,
                background: activeMeeting.status === 'in_progress' ? 'rgba(34,197,94,0.15)' : '#1a1f35',
                color: activeMeeting.status === 'in_progress' ? '#22c55e' : '#94a3b8',
                fontWeight: 600,
              }}>
                {activeMeeting.status === 'in_progress' ? '● LIVE' : activeMeeting.status}
              </span>
              {activeMeeting.status === 'draft' && (
                <button onClick={startMeeting} style={{ ...btnStyle, background: '#22c55e', color: '#fff' }}>
                  ▶ Start
                </button>
              )}
              <button onClick={endMeeting} style={{ ...btnStyle, background: '#ef4444', color: '#fff' }}>
                ■ End
              </button>
              <button onClick={() => setShowAgentPanel(!showAgentPanel)}
                style={{ ...btnStyle, background: '#1a1f35', color: '#94a3b8' }}>
                {showAgentPanel ? '◀' : '▶'} Agents
              </button>
            </div>

            {/* Agent Discussion Trigger */}
            {activeMeeting.status === 'in_progress' && (
              <div style={{
                padding: '8px 20px', borderBottom: '1px solid #1a1f35',
                display: 'flex', gap: 8, background: 'rgba(99,102,241,0.05)',
              }}>
                <input value={discussTopic} onChange={(e) => setDiscussTopic(e.target.value)}
                  placeholder="Discussion topic (or uses agenda)..."
                  style={{ ...inputStyle, flex: 1, background: '#0f1424' }}
                  onKeyDown={(e) => e.key === 'Enter' && triggerDiscussion()} />
                <button onClick={triggerDiscussion} disabled={loading}
                  style={{
                    ...btnStyle,
                    background: loading ? '#475569' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff', minWidth: 130,
                  }}>
                  {loading ? '⏳ Agents thinking...' : '🤖 Agents Discuss'}
                </button>
              </div>
            )}

            {/* Chat Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {messages.map((msg, i) => {
                const isSystem = msg.message_type === 'system';
                const isUser = msg.agent_id === 'user';
                return (
                  <div key={msg.id || i} style={{
                    marginBottom: 16, display: 'flex', gap: 10,
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}>
                    {!isUser && (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: isSystem
                          ? '#1a1f35'
                          : `linear-gradient(135deg, ${getColor(msg.agent_id)}, ${getColor(msg.agent_id)}dd)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#fff',
                        border: isSystem ? '1px solid #334155' : 'none',
                        boxShadow: isSystem ? 'none' : `0 0 12px ${getColor(msg.agent_id)}33`,
                      }}>
                        {isSystem ? '⚙' : (msg.agent_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ maxWidth: '70%' }}>
                      {!isUser && (
                        <div style={{
                          fontSize: 11, fontWeight: 600, marginBottom: 3,
                          color: isSystem ? '#64748b' : getColor(msg.agent_id),
                        }}>
                          {msg.agent_name || 'Unknown'}
                          <span style={{ color: '#475569', fontWeight: 400, marginLeft: 6, fontSize: 10 }}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      )}
                      <div style={{
                        fontSize: 14, lineHeight: 1.6,
                        padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                        background: isSystem ? 'rgba(71,85,105,0.2)' : isUser ? '#6366f1' : '#141930',
                        border: isSystem ? '1px solid #334155' : '1px solid #1e2744',
                        color: isSystem ? '#94a3b8' : '#e2e8f0',
                      }}>
                        {msg.content}
                      </div>
                    </div>
                    {isUser && (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: '#fff',
                      }}>U</div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid #1a1f35',
              display: 'flex', gap: 8, background: '#0f1424',
            }}>
              <select value={sendAs} onChange={(e) => setSendAs(e.target.value)}
                style={{ ...inputStyle, width: 120, cursor: 'pointer', fontSize: 12 }}>
                <option value="user">👤 As User</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.avatar_letter || a.name[0]} {a.name}
                  </option>
                ))}
              </select>
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={`Message as ${sendAs === 'user' ? 'yourself' : agents.find(a => a.id === sendAs)?.name || sendAs}...`}
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={sendMessage}
                style={{
                  ...btnStyle, minWidth: 80,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  color: '#fff',
                }}>
                Send
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', textAlign: 'center',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 16,
              boxShadow: '0 0 40px rgba(99,102,241,0.3)',
            }}>P</div>
            <h1 style={{
              fontSize: 42, fontWeight: 800, marginBottom: 8,
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Pauli's Place</h1>
            <p style={{ color: '#64748b', fontSize: 16, maxWidth: 400, lineHeight: 1.6 }}>
              The meeting room where agents discuss, plan, and coordinate.
              Select or create a meeting to begin.
            </p>
            <div style={{ marginTop: 32, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {agents.slice(0, 8).map((a) => (
                <div key={a.id} title={`${a.name} — ${a.role}`} style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${a.color || '#64748b'}, ${a.color || '#64748b'}cc)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#fff',
                  boxShadow: `0 0 16px ${a.color || '#64748b'}44`,
                  transition: 'transform 0.2s ease',
                  cursor: 'default',
                }}>
                  {a.avatar_letter || a.name[0]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Sidebar: Agent Roster ── */}
      {showAgentPanel && activeMeeting && (
        <div style={{
          width: 240, borderLeft: '1px solid #1a1f35',
          display: 'flex', flexDirection: 'column', background: '#0f1424',
        }}>
          <div style={{ padding: '14px 14px', borderBottom: '1px solid #1a1f35' }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
              Agent Fleet
            </h4>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {agents.map((a) => (
              <div key={a.id} style={{
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: '1px solid rgba(26,31,53,0.5)',
                opacity: a.status === 'standby' ? 0.5 : 1,
              }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                  }}>
                    {a.avatar_letter || a.name[0]}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 10, height: 10, borderRadius: '50%',
                    background: getStatusDot(a.status),
                    border: '2px solid #0f1424',
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.codename} · {a.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Shared styles
const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: '#0a0e1a', border: '1px solid #1a1f35', borderRadius: 8,
  color: '#e2e8f0', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle = {
  padding: '8px 16px', border: 'none', borderRadius: 8,
  cursor: 'pointer', fontWeight: 600, fontSize: 13,
  transition: 'all 0.15s ease',
};

export default PaulisPlace;
