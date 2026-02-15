import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

function MeetingRoom() {
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAgenda, setNewAgenda] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [devStatus, setDevStatus] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    checkStatus();
    loadMeetings();
    loadAgents();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/meeting/status`);
      setDevStatus(res.data);
    } catch {
      setDevStatus({ bridge: 'online', devika_status: { error: 'unreachable' } });
    }
  };

  const loadMeetings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/meeting/list`);
      setMeetings(res.data.meetings || []);
    } catch (e) {
      console.error('Failed to load meetings', e);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/meeting/agents`);
      setAgents(res.data.agents || []);
    } catch (e) {
      console.error('Failed to load agents', e);
    }
  };

  const selectMeeting = async (meeting) => {
    setActiveMeeting(meeting);
    try {
      const res = await axios.get(`${API_BASE}/meeting/${meeting.id}/messages`);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  const createMeeting = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/meeting/create`, {
        title: newTitle,
        agenda: newAgenda,
        invite_agents: [],
      });
      setNewTitle('');
      setNewAgenda('');
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
      await axios.post(`${API_BASE}/meeting/${activeMeeting.id}/start`);
      await selectMeeting({ ...activeMeeting, status: 'in_progress' });
      loadMeetings();
    } catch (e) {
      console.error('Start failed', e);
    }
  };

  const endMeeting = async () => {
    if (!activeMeeting) return;
    try {
      await axios.post(`${API_BASE}/meeting/${activeMeeting.id}/end`);
      setActiveMeeting(null);
      loadMeetings();
    } catch (e) {
      console.error('End failed', e);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeMeeting) return;
    try {
      await axios.post(`${API_BASE}/meeting/${activeMeeting.id}/messages`, {
        agent_id: 'pauli',
        content: chatInput,
        message_type: 'chat',
      });
      setChatInput('');
      // reload messages
      const res = await axios.get(`${API_BASE}/meeting/${activeMeeting.id}/messages`);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error('Send failed', e);
    }
  };

  const createFromCamel = async (sessId, role1, role2, task) => {
    try {
      const res = await axios.post(`${API_BASE}/meeting/from-camel`, {
        sessId, role1, role2, task,
      });
      loadMeetings();
      if (res.data.meeting) selectMeeting(res.data.meeting);
    } catch (e) {
      console.error('CAMEL bridge failed', e);
    }
  };

  const agentColor = (name) => {
    const colors = {
      pauli: '#6366f1', synthia: '#ec4899', bambu: '#f59e0b',
      alex: '#10b981', 'la mariposa': '#8b5cf6', devika: '#06b6d4',
    };
    return colors[(name || '').toLowerCase()] || '#64748b';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Sidebar */}
      <div style={{ width: 280, borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', background: '#1e293b' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f59e0b' }}>Meeting Room</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
            {devStatus?.devika_status?.status || 'checking...'}
          </p>
        </div>

        {/* Create form */}
        <div style={{ padding: 12, borderBottom: '1px solid #334155' }}>
          <input
            value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Meeting title..."
            style={{ width: '100%', padding: 8, marginBottom: 6, background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13 }}
          />
          <input
            value={newAgenda} onChange={(e) => setNewAgenda(e.target.value)}
            placeholder="Agenda (optional)"
            style={{ width: '100%', padding: 8, marginBottom: 6, background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13 }}
          />
          <button onClick={createMeeting} disabled={loading || !newTitle.trim()}
            style={{ width: '100%', padding: 8, background: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            + New Meeting
          </button>
        </div>

        {/* Meeting list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {meetings.map((m) => (
            <div key={m.id} onClick={() => selectMeeting(m)}
              style={{
                padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #334155',
                background: activeMeeting?.id === m.id ? '#334155' : 'transparent',
              }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{m.title}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{m.status}</div>
            </div>
          ))}
          {meetings.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No meetings yet
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeMeeting ? (
          <>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, flex: 1, fontSize: 16 }}>{activeMeeting.title}</h3>
              <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 12, background: '#334155', color: '#94a3b8' }}>
                {activeMeeting.status}
              </span>
              {activeMeeting.status === 'draft' && (
                <button onClick={startMeeting} style={{ padding: '6px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Start
                </button>
              )}
              <button onClick={endMeeting} style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                End
              </button>
            </div>

            {/* Agent bar */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {agents.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 8px', borderRadius: 12, background: '#334155' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: agentColor(a.name) }} />
                  {a.name}
                </div>
              ))}
            </div>

            {/* Chat */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: agentColor(msg.agent_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(msg.agent_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: agentColor(msg.agent_name), marginBottom: 2 }}>
                      {msg.agent_name || 'System'}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, background: '#1e293b', padding: '8px 12px', borderRadius: '0 12px 12px 12px' }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: 12, borderTop: '1px solid #1e293b', display: 'flex', gap: 8 }}>
              <input
                value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message as Pauli..."
                style={{ flex: 1, padding: 10, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14 }}
              />
              <button onClick={sendMessage}
                style={{ padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>Pauli's Place</h1>
            <p style={{ color: '#94a3b8', fontSize: 16 }}>Select or create a meeting to get started</p>
            <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
              {['Pauli', 'Synthia', 'Bambu', 'Alex', 'Devika'].map((name) => (
                <div key={name} style={{
                  width: 48, height: 48, borderRadius: '50%', background: agentColor(name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff',
                }}>
                  {name[0]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MeetingRoom;
