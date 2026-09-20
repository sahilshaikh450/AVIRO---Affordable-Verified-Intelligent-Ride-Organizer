import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { GenderBadge } from '../components/common/UIComponents';
import api from '../services/api';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast from 'react-hot-toast';

const BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8080';

export default function ChatPage() {
  const { user } = useSelector(s => s.auth);
  const [input, setInput]         = useState('');
  const [contacts, setContacts]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [msgs, setMsgs]           = useState([]);
  const [connected, setConnected] = useState(false);
  const [deletedChats, setDeletedChats] = useState(() => {
    // Load deleted chats from localStorage
    try { return JSON.parse(localStorage.getItem('aviro_deleted_chats') || '[]'); }
    catch { return []; }
  });
  const bottomRef   = useRef(null);
  const clientRef   = useRef(null);
  const selectedRef = useRef(null);

  // Load contacts
  useEffect(() => {
    if (!user?.id) return;
    const loadAllContacts = async () => {
      let allContacts = [];
      try {
        const myBookings = await api.get('/bookings/my');
        const bookings = myBookings.data.data || [];
        bookings.forEach(b => {
          if (b.driver?.id && b.driver.id !== user.id) {
            allContacts.push({
              id: b.driver.id, name: b.driver.fullName,
              gender: b.driver.gender, rideId: b.rideId,
              route: `${b.fromLocation} → ${b.toLocation}`, role: 'Driver'
            });
          }
        });
      } catch {}
      try {
        const myRides = await api.get('/rides/my');
        const rides = myRides.data.data || [];
        for (const ride of rides) {
          try {
            const rideBookings = await api.get(`/bookings/ride/${ride.id}`);
            const rbs = rideBookings.data.data || [];
            rbs.forEach(b => {
              if (b.rider?.id && b.rider.id !== user.id) {
                allContacts.push({
                  id: b.rider.id, name: b.rider.fullName || 'Rider',
                  gender: b.rider.gender, rideId: ride.id,
                  route: `${ride.fromLocation} → ${ride.toLocation}`, role: 'Rider'
                });
              }
            });
          } catch {}
        }
      } catch {}
      const unique = allContacts.filter((c, i, self) =>
        c.id && i === self.findIndex(x => x.id === c.id && x.rideId === c.rideId)
      );
      setContacts(unique);
    };
    loadAllContacts();
  }, [user?.id]);

  // WebSocket
  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('aviro_token');
    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/api/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/user/${user.id}/queue/messages`, (frame) => {
          try {
            const received = JSON.parse(frame.body);
            if (selectedRef.current) {
              setMsgs(prev => {
                const exists = prev.some(m =>
                  m.content === received.content &&
                  String(m.senderId) === String(received.senderId) &&
                  Math.abs(new Date(m.createdAt) - new Date(received.createdAt)) < 3000
                );
                return exists ? prev : [...prev, received];
              });
            }
          } catch {}
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const fetchMessages = useCallback(async (contact) => {
    if (!contact || !user?.id) return;
    try {
      const res = await api.get(`/chat/${contact.rideId}/${contact.id}?myId=${user.id}`);
      setMsgs(res.data.data || []);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    if (!selected) return;
    selectedRef.current = selected;
    fetchMessages(selected);
    const interval = setInterval(() => {
      if (selectedRef.current) fetchMessages(selectedRef.current);
    }, 3000);
    return () => clearInterval(interval);
  }, [selected, fetchMessages]);

  const loadMessages = (contact) => {
    setSelected(contact);
    selectedRef.current = contact;
    setMsgs([]);
    fetchMessages(contact);
  };

  // ── Delete chat (local only) ──
  const deleteChat = (contact, e) => {
    e.stopPropagation();
    const key = `${contact.id}-${contact.rideId}`;
    const updated = [...deletedChats, key];
    setDeletedChats(updated);
    localStorage.setItem('aviro_deleted_chats', JSON.stringify(updated));
    if (selected?.id === contact.id && selected?.rideId === contact.rideId) {
      setSelected(null);
      setMsgs([]);
    }
    toast.success('Chat deleted');
  };

  // ── Clear all chats ──
  const clearAllChats = () => {
    const allKeys = contacts.map(c => `${c.id}-${c.rideId}`);
    setDeletedChats(allKeys);
    localStorage.setItem('aviro_deleted_chats', JSON.stringify(allKeys));
    setSelected(null);
    setMsgs([]);
    toast.success('All chats cleared');
  };

  // ── Delete single message (local only) ──
  const deleteMessage = (index) => {
    setMsgs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selected || !user?.id) return;
    const content = input.trim();
    setInput('');
    const msgPayload = {
      senderId: user.id, receiverId: selected.id,
      rideId: selected.rideId, content, type: 'TEXT', messageType: 'TEXT',
    };
    setMsgs(prev => [...prev, { ...msgPayload, createdAt: new Date().toISOString() }]);
    if (clientRef.current?.connected) {
      try {
        clientRef.current.publish({ destination: '/app/chat.send', body: JSON.stringify(msgPayload) });
        return;
      } catch {}
    }
    try { await api.post('/chat/send', msgPayload); } catch {}
  };

  // Filter out deleted chats
  const visibleContacts = contacts.filter(c => !deletedChats.includes(`${c.id}-${c.rideId}`));

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-fade-up">

      {/* ── Contacts sidebar ── */}
      <div className="w-64 card overflow-y-auto flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-aviro-border flex items-center justify-between">
          <h2 className="font-bold text-sm">💬 Messages</h2>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs font-medium
              ${connected ? 'text-aviro-green' : 'text-aviro-muted'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-aviro-green animate-pulse' : 'bg-aviro-muted'}`} />
              {connected ? 'Live' : 'Offline'}
            </div>
            {visibleContacts.length > 0 && (
              <button onClick={clearAllChats}
                className="text-xs text-red-400 hover:underline ml-1" title="Clear all chats">
                🗑️ All
              </button>
            )}
          </div>
        </div>

        {visibleContacts.length === 0 ? (
          <div className="p-6 text-center text-aviro-muted text-sm flex-1 flex flex-col items-center justify-center">
            <div className="text-3xl mb-2">💬</div>
            <p>No contacts yet</p>
            <p className="text-xs mt-1">Book a ride or get a booking to chat!</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {visibleContacts.map((c, i) => (
              <div key={`${c.id}-${c.rideId}-${i}`}
                className={`group relative flex items-center gap-3 p-4 border-b border-aviro-border
                  hover:bg-aviro-card2 transition-colors cursor-pointer
                  ${selected?.id === c.id && selected?.rideId === c.rideId
                    ? 'bg-aviro-orange/5 border-l-2 border-l-aviro-orange' : ''}`}
                onClick={() => loadMessages(c)}
              >
                <div className="w-10 h-10 rounded-full bg-aviro-card2 border border-aviro-border
                  flex items-center justify-center text-lg flex-shrink-0">
                  {c.gender === 'FEMALE' ? '👩' : '👨'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                  <p className="text-xs text-aviro-muted truncate">{c.role} · {c.route}</p>
                </div>
                {/* Delete button — shows on hover */}
                <button
                  onClick={(e) => deleteChat(c, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/10 flex-shrink-0"
                  title="Delete chat">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-aviro-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-aviro-card2 flex items-center justify-center text-lg">
                  {selected.gender === 'FEMALE' ? '👩' : '👨'}
                </div>
                <div>
                  <p className="font-semibold text-sm">{selected.name}</p>
                  <div className="flex items-center gap-2">
                    <GenderBadge gender={selected.gender} />
                    <span className="text-xs text-aviro-muted">{selected.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 text-xs font-medium
                  ${connected ? 'text-aviro-green' : 'text-yellow-400'}`}>
                  <div className={`w-2 h-2 rounded-full
                    ${connected ? 'bg-aviro-green animate-pulse' : 'bg-yellow-400'}`} />
                  {connected ? 'Real-time ✅' : 'Polling'}
                </div>
                {/* Clear this chat */}
                <button
                  onClick={() => { setMsgs([]); toast.success('Messages cleared'); }}
                  className="text-xs text-aviro-muted hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                  title="Clear messages">
                  🗑️ Clear
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 && (
                <div className="text-center text-aviro-muted text-sm py-12">
                  <div className="text-3xl mb-2">👋</div>
                  No messages yet. Say hi!
                </div>
              )}
              {msgs.map((m, i) => {
                const isMine = String(m.senderId) === String(user?.id);
                return (
                  <div key={`msg-${i}`}
                    className={`group flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {!isMine && (
                      <div className="w-8 h-8 rounded-full bg-aviro-card2 border border-aviro-border
                        flex items-center justify-center text-sm flex-shrink-0">
                        {selected.gender === 'FEMALE' ? '👩' : '👨'}
                      </div>
                    )}
                    <div className="flex items-end gap-1">
                      {/* Delete message button */}
                      {isMine && (
                        <button onClick={() => deleteMessage(i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-400 hover:text-red-300 mb-1">
                          ✕
                        </button>
                      )}
                      <div className={`max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 text-sm
                        ${isMine
                          ? 'bg-aviro-orange text-white rounded-br-sm'
                          : 'bg-aviro-card2 text-white rounded-bl-sm border border-aviro-border'}`}>
                        <p>{m.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-aviro-muted'}`}>
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            : 'now'}
                        </p>
                      </div>
                    </div>
                    {isMine && (
                      <div className="w-8 h-8 rounded-full bg-aviro-orange/20 border border-aviro-orange/30
                        flex items-center justify-center text-sm flex-shrink-0">
                        {user?.gender === 'FEMALE' ? '👩' : '👨'}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend}
              className="p-4 border-t border-aviro-border flex gap-2 items-center">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="input-field flex-1"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                autoFocus />
              <button type="submit" disabled={!input.trim()} className="btn-primary px-6 py-2.5 flex-shrink-0">
                Send →
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="font-bold text-xl mb-2">Your Messages</h3>
            <p className="text-aviro-muted text-sm max-w-xs leading-relaxed">
              Select a contact from the left to start chatting in real-time!
            </p>
            <div className={`mt-6 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full
              ${connected ? 'bg-aviro-green/10 text-aviro-green' : 'bg-aviro-card2 text-aviro-muted'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-aviro-green animate-pulse' : 'bg-aviro-muted'}`} />
              {connected ? 'WebSocket Live! ✅' : 'Connecting...'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}