import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, Link } from 'react-router-dom';
import { formatWhen } from '../utils/when';
import api from '../services/api';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_URL } from '../services/websocket';
import toast from 'react-hot-toast';
import Icon, { initial } from '../components/common/Icon';


export default function ChatPage() {
  const { user } = useSelector(s => s.auth);
  const [input, setInput]         = useState('');
  const [contacts, setContacts]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [msgs, setMsgs]           = useState([]);
  const [connected, setConnected] = useState(false);
  const bottomRef   = useRef(null);
  const clientRef   = useRef(null);
  const selectedRef = useRef(null);

  // People you can chat with: one per confirmed ride (chat closes when the trip ends)
  const [contactsLoading, setContactsLoading] = useState(true);
  const [params] = useSearchParams();
  const loadContacts = useCallback(async () => {
    try {
      const res = await api.get('/chat/active');
      const list = (res.data.data || []).map(c => ({
        id: c.otherId, name: c.otherName, gender: c.otherGender, rideId: c.rideId, bookingId: c.bookingId,
        role: c.role, route: `${c.fromLocation} → ${c.toLocation}`, departureTime: c.departureTime,
      }));
      setContacts(list);
      // Opened from a trip screen: go straight to that chat
      const want = params.get('booking');
      if (want) {
        const hit = list.find(c => String(c.bookingId) === want);
        if (hit) { setSelected(hit); selectedRef.current = hit; }
      }
      // The trip ended while this chat was open
      if (selectedRef.current && !list.some(c => c.bookingId === selectedRef.current.bookingId)) {
        setSelected(null); selectedRef.current = null; setMsgs([]);
      }
    } catch {}
    setContactsLoading(false);
  }, [params]);
  useEffect(() => { if (user?.id) loadContacts(); }, [user?.id, loadContacts]);

  // WebSocket
  useEffect(() => {
    if (!user?.id) return;
    const token = localStorage.getItem('aviro_token');
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/user/queue/messages', (frame) => {
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
    // New messages arrive over WebSocket; poll only as a fallback when it is disconnected
    const interval = setInterval(() => {
      if (selectedRef.current && !clientRef.current?.connected) fetchMessages(selectedRef.current);
    }, 10000);
    return () => clearInterval(interval);
  }, [selected, fetchMessages]);

  const loadMessages = (contact) => {
    setSelected(contact);
    selectedRef.current = contact;
    setMsgs([]);
    fetchMessages(contact);
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
    try { await api.post('/chat/send', msgPayload); }
    catch (err) {
      toast.error(err.response?.data?.message || 'Message not sent');
      loadContacts();
    }
  };

  const visibleContacts = contacts;

  return (
    <div className="h-[calc(100dvh-10.5rem)] md:h-[calc(100vh-8rem)] flex md:gap-4 animate-fade-up">

      {/* ── Contacts sidebar ── */}
      <div className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-72 card overflow-hidden flex-shrink-0 flex-col`}>
        <div className="p-4 border-b border-aviro-border flex items-center justify-between">
          <h2 className="font-bold text-sm">Messages</h2>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs font-medium
              ${connected ? 'text-aviro-green' : 'text-aviro-muted'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-aviro-green animate-pulse' : 'bg-aviro-muted'}`} />
              {connected ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>

        {contactsLoading && visibleContacts.length === 0 ? (
          <div className="p-6 text-center text-aviro-muted text-sm flex-1 flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-aviro-border border-t-aviro-orange rounded-full animate-spin mb-2" />
            <p>Loading chats…</p>
          </div>
        ) : visibleContacts.length === 0 ? (
          <div className="p-6 text-center text-aviro-muted text-sm flex-1 flex flex-col items-center justify-center">
            <div className="text-3xl mb-2"><Icon e="💬" /></div>
            <p className="font-semibold text-aviro-fg">No open chats</p>
            <p className="text-xs mt-1 max-w-[16rem]">Chat opens when a driver confirms your ride, and closes when the trip ends.</p>
            <Link to="/bookings" className="text-xs text-aviro-orange font-semibold mt-3">Go to my trips</Link>
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
                  {initial(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                  <p className="text-xs text-aviro-muted truncate">{c.role} · {c.route}</p>
                  {c.departureTime && <p className="text-[11px] text-aviro-muted">{formatWhen(c.departureTime)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat Area ── */}
      <div className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 card flex-col overflow-hidden`}>
        {selected ? (
          <>
            {/* Header */}
            <div className="px-3 py-3 md:p-4 border-b border-aviro-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <button onClick={() => setSelected(null)} aria-label="Back to chats"
                  className="md:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-lg text-aviro-muted hover:text-aviro-fg flex-shrink-0">
                  ←
                </button>
                <div className="w-10 h-10 rounded-full bg-aviro-card2 flex items-center justify-center text-lg flex-shrink-0">
                  {initial(selected.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{selected.name}</p>
                  <p className="text-xs text-aviro-muted truncate">{selected.role} · {selected.route}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                <div className={`flex items-center gap-1.5 text-xs font-medium
                  ${connected ? 'text-aviro-green' : 'text-yellow-600'}`} title={connected ? 'Real-time' : 'Reconnecting'}>
                  <div className={`w-2 h-2 rounded-full
                    ${connected ? 'bg-aviro-green animate-pulse' : 'bg-yellow-400'}`} />
                  <span className="hidden sm:inline">{connected ? 'Live' : 'Reconnecting'}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 md:p-4 space-y-2 md:space-y-3">
              {msgs.length === 0 && (
                <div className="text-center text-aviro-muted text-sm py-12">
                  <div className="text-3xl mb-2">👋</div>
                  No messages yet. Say hi!
                  <p className="text-xs mt-1">This chat closes when the trip ends.</p>
                </div>
              )}
              {msgs.map((m, i) => {
                const isMine = String(m.senderId) === String(user?.id);
                return (
                  <div key={`msg-${i}`}
                    className={`group flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {!isMine && (
                      <div className="hidden sm:flex w-8 h-8 rounded-full bg-aviro-card2 border border-aviro-border
                        items-center justify-center text-sm flex-shrink-0">
                        {initial(selected.name)}
                      </div>
                    )}
                    <div className="flex items-end gap-1 max-w-[85%] sm:max-w-none">
                      <div className={`max-w-full sm:max-w-xs lg:max-w-sm rounded-2xl px-3.5 py-2 md:px-4 md:py-2.5 text-sm break-words
                        ${isMine
                          ? 'bg-aviro-orange text-white rounded-br-sm'
                          : 'bg-aviro-card2 text-aviro-fg rounded-bl-sm border border-aviro-border'}`}>
                        <p>{m.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-aviro-fg/60' : 'text-aviro-muted'}`}>
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            : 'now'}
                        </p>
                      </div>
                    </div>
                    {isMine && (
                      <div className="hidden sm:flex w-8 h-8 rounded-full bg-aviro-orange/20 border border-aviro-orange/30
                        items-center justify-center text-sm flex-shrink-0">
                        {initial(user?.fullName)}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend}
              className="p-2.5 md:p-4 border-t border-aviro-border flex gap-2 items-center">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="input-field flex-1"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                enterKeyHint="send"
                autoFocus={window.innerWidth >= 768} />
              <button type="submit" disabled={!input.trim()} aria-label="Send"
                className="btn-primary px-4 md:px-6 py-2.5 flex-shrink-0">
                <span className="md:hidden">➤</span><span className="hidden md:inline">Send →</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-6xl mb-4"><Icon e="💬" /></div>
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