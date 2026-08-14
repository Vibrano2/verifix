import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { useApp } from '../context/AppContext';
import { ApiService } from '../services/api';
import { OfflineBanner } from '../components/OfflineBanner';
import { Send, Image, Lock, ShieldCheck, CheckCheck, Check, Star, Wrench, PhoneCall } from 'lucide-react';

export function ChatScreen({ job, artisan, matchId }) {
  const { navigateTo, currentUser, activeJob, activeArtisan, activeMatchId, showToast } = useApp();
  
  const targetJob = job || activeJob;
  const targetArtisan = artisan || activeArtisan;
  const currentMatchId = matchId || activeMatchId || `match_${targetJob?.job_id}_${targetArtisan?.uid}`;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const senderUid = currentUser?.uid || 'user_demo_client';

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500); // Polling simulation
    return () => clearInterval(interval);
  }, [currentMatchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!currentMatchId) return;
    try {
      const msgs = await ApiService.getMessages(currentMatchId);
      setMessages(msgs);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');

    try {
      await ApiService.sendMessage(currentMatchId, senderUid, textToSend);
      fetchMessages();
    } catch (err) {
      showToast('Failed to send message: ' + err.message, 'error');
    }
  };

  const handleSendPhotoMock = async () => {
    const photoUrl = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80';
    try {
      await ApiService.sendMessage(currentMatchId, senderUid, 'Attached photo of work area:', photoUrl);
      fetchMessages();
      showToast('Photo attached', 'success');
    } catch (err) {
      showToast('Failed to attach photo', 'error');
    }
  };

  const handleCompleteJobFlow = () => {
    navigateTo('complete_rating', { job: targetJob, artisan: targetArtisan });
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] flex flex-col justify-between">
      <Header backTo="client_dash" showLogo={false} title={`${targetArtisan?.first_name || 'Artisan'} • ${targetJob?.trade || 'Job'}`} />
      <OfflineBanner onRetry={fetchMessages} />

      {/* Escrow Status Bar */}
      <div className="bg-[#16858F] text-white px-4 py-2.5 shadow-sm flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-[#16D4C6]" />
          <span>Match Fee Held in Escrow</span>
        </div>

        <button
          onClick={handleCompleteJobFlow}
          className="px-3 py-1 bg-[#FAB804] text-[#0E3B40] font-extrabold rounded-lg text-[11px] hover:bg-[#FDC80B] transition-all btn-press shadow-sm"
        >
          Confirm Complete & Release
        </button>
      </div>

      {/* Chat Messages Body */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 overflow-y-auto space-y-3">
        {/* Security Notice */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-500 max-w-xs mx-auto shadow-sm">
          <Lock className="w-3.5 h-3.5 text-[#16858F] inline mr-1" />
          <span>In-app chat active. Payments are protected until job completion is confirmed.</span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender_uid === senderUid;
          return (
            <div
              key={msg.message_id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 animate-fade-in`}
            >
              <div
                className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  isMe
                    ? 'bg-[#16858F] text-white rounded-br-none'
                    : 'bg-white text-[#0E3B40] border border-slate-200/80 rounded-bl-none'
                }`}
              >
                {!isMe && (
                  <span className="block text-[10px] font-bold text-[#16858F] mb-0.5">
                    {msg.sender_name || targetArtisan?.first_name || 'Artisan'}
                  </span>
                )}
                {msg.photo_url && (
                  <img
                    src={msg.photo_url}
                    alt="Attached work photo"
                    className="w-full h-32 object-cover rounded-xl mb-2 border border-black/10"
                  />
                )}
                <p>{msg.text}</p>
              </div>

              <span className="text-[10px] text-slate-400 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </main>

      {/* Message Input Controls */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200/80 p-3">
        <form onSubmit={handleSendMessage} className="max-w-md mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendPhotoMock}
            className="p-2.5 text-slate-400 hover:text-[#16858F] rounded-xl hover:bg-slate-100 transition-colors btn-press"
            title="Attach Photo"
          >
            <Image className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type message to artisan..."
            className="flex-1 py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-[#0E3B40] focus:border-[#16858F] focus:ring-2 focus:ring-[#16858F]/20 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-[#16858F] text-white rounded-2xl hover:bg-[#0E5C63] transition-all btn-press disabled:opacity-40 flex-shrink-0"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
}
