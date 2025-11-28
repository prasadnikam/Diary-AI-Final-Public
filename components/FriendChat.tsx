
import React, { useState, useRef, useEffect } from 'react';
import { FriendProfile, JournalEntry, ChatMessage } from '../types';
import { Plus, MessageCircle, X, ArrowLeft, Send, Loader2, User } from 'lucide-react';
import { createFriendChat } from '../services/geminiService';
import { Chat } from "@google/genai";

interface FriendChatProps {
  friendProfile: FriendProfile | null;
  setFriendProfile: (profile: FriendProfile) => void;
  onAddEntry: (entry: JournalEntry) => void;
  friends: FriendProfile[];
  onAddFriend: (friend: FriendProfile) => void;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as const;

export const FriendChat: React.FC<FriendChatProps> = ({ friendProfile, setFriendProfile, onAddEntry, friends, onAddFriend }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFriend, setNewFriend] = useState<Partial<FriendProfile>>({
    name: '',
    personality: '',
    context: '',
    voiceName: 'Puck'
  });
  
  // Chat State
  const [activeChat, setActiveChat] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Mobile UI State
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  useEffect(() => {
    // Reset chat when profile changes
    if (friendProfile) {
      setActiveChat(false);
      setMessages([]);
      setChatSession(null);
    }
  }, [friendProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  const handleStartChat = async () => {
    if (!friendProfile) return;
    setActiveChat(true);
    setMessages([]);
    setIsSending(true);
    try {
      const chat = await createFriendChat(friendProfile);
      setChatSession(chat);
      // Initial Greeting
      const result = await chat.sendMessage({ message: "Hello! It's good to see you." });
      setMessages([{
        id: 'init',
        role: 'model',
        text: result.text || `Hello! I am ${friendProfile.name}.`
      }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !chatSession) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputMessage
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg.text });
      const responseText = result.text;
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      }]);
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAddFriendClick = () => {
    if (newFriend.name && newFriend.personality && newFriend.context && newFriend.voiceName) {
      const friend: FriendProfile = {
        name: newFriend.name,
        personality: newFriend.personality,
        context: newFriend.context,
        voiceName: newFriend.voiceName as any,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newFriend.name}`
      };
      onAddFriend(friend);
      setShowAddModal(false);
      setNewFriend({ name: '', personality: '', context: '', voiceName: 'Puck' });
    }
  };

  const handleSelectFriend = (friend: FriendProfile) => {
    setFriendProfile(friend);
    setMobileView('chat');
  };

  const handleBackToList = () => {
    setMobileView('list');
    if (!activeChat) {
        setFriendProfile(null as any); // Clear selection if we were just viewing profile
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] md:h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex relative">
      {/* Friends List Sidebar */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden md:flex'} w-full md:w-80 border-r border-slate-100 bg-slate-50 flex-col h-full`}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 font-serif mb-1">Friends</h2>
          <p className="text-xs text-slate-400">Your AI companions</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {friends.map((friend, idx) => (
            <div 
              key={idx} 
              onClick={() => handleSelectFriend(friend)}
              className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                friendProfile?.name === friend.name 
                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden shrink-0">
                  {friend.avatarUrl ? <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" /> : friend.name[0]}
                </div>
                <div className="min-w-0">
                   <h3 className="font-bold text-slate-700 text-sm truncate">{friend.name}</h3>
                   <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">{friend.voiceName}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 italic">"{friend.personality}"</p>
            </div>
          ))}

          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Friend
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-slate-50/50 relative`}>
         {friendProfile ? (
            activeChat ? (
              /* CHAT INTERFACE */
              <div className="flex-1 flex flex-col h-full animate-fade-in">
                 <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                       <button onClick={() => setActiveChat(false)} className="hidden md:block p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <ArrowLeft className="w-5 h-5 text-slate-500" />
                       </button>
                       <button onClick={handleBackToList} className="md:hidden p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <ArrowLeft className="w-5 h-5 text-slate-500" />
                       </button>
                       <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden">
                          {friendProfile.avatarUrl ? <img src={friendProfile.avatarUrl} alt={friendProfile.name} className="w-full h-full object-cover" /> : null}
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800">{friendProfile.name}</h3>
                          <div className="flex items-center gap-1.5">
                             <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                             <span className="text-xs text-slate-400">Online</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         {msg.role === 'model' && (
                           <div className="w-8 h-8 rounded-full bg-indigo-100 overflow-hidden mr-2 shrink-0 mt-2">
                              {friendProfile.avatarUrl && <img src={friendProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />}
                           </div>
                         )}
                         <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                           msg.role === 'user' 
                             ? 'bg-indigo-600 text-white rounded-br-none' 
                             : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                         }`}>
                            {msg.text}
                         </div>
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex justify-start">
                        <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 ml-10">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                 </div>

                 <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100">
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={inputMessage}
                         onChange={(e) => setInputMessage(e.target.value)}
                         placeholder={`Message ${friendProfile.name}...`}
                         className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-300 border rounded-xl px-4 py-3 transition-all outline-none"
                         autoFocus
                       />
                       <button 
                         type="submit"
                         disabled={!inputMessage.trim() || isSending}
                         className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                       >
                         <Send className="w-5 h-5" />
                       </button>
                    </div>
                 </form>
              </div>
            ) : (
              /* PROFILE VIEW */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in relative">
                  <button 
                    onClick={handleBackToList}
                    className="absolute top-4 left-4 md:hidden p-2 bg-slate-100 rounded-full text-slate-600"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>

                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white mx-auto mb-6 overflow-hidden">
                     {friendProfile.avatarUrl ? (
                       <img src={friendProfile.avatarUrl} alt={friendProfile.name} className="w-full h-full object-cover" />
                     ) : (
                       <span className="text-4xl text-indigo-300">{friendProfile.name[0]}</span>
                     )}
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">{friendProfile.name}</h2>
                  <div className="inline-block bg-white px-3 py-1 rounded-full text-xs font-bold text-indigo-500 uppercase tracking-wider border border-indigo-100 mb-4">
                    {friendProfile.voiceName} Voice
                  </div>
                  <p className="text-slate-500 max-w-md mx-auto italic mb-8">
                    "{friendProfile.personality}"
                  </p>
                  
                  <button 
                    onClick={handleStartChat}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-shadow shadow-lg shadow-slate-900/20 flex items-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Start Conversation
                  </button>
              </div>
            )
         ) : (
            /* EMPTY STATE - Desktop only mostly */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6 mx-auto">
                  <User className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-slate-700 mb-2">Select a friend to chat</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Choose one of your AI friends from the list to start a conversation. You can customize their personality and voice.
              </p>
            </div>
         )}
      </div>

      {/* Add Friend Modal */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">Create New Friend</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Name</label>
                <input 
                  type="text" 
                  value={newFriend.name}
                  onChange={(e) => setNewFriend({...newFriend, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="e.g. Socrates"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Personality</label>
                <textarea 
                  value={newFriend.personality}
                  onChange={(e) => setNewFriend({...newFriend, personality: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none h-24 transition-all"
                  placeholder="e.g. Question everything, deeply philosophical but kind. Uses metaphors often."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Context / Memory</label>
                <textarea 
                  value={newFriend.context}
                  onChange={(e) => setNewFriend({...newFriend, context: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none h-24 transition-all"
                  placeholder="e.g. We met at the library. Knows I struggle with Math. Always brings up cats."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Voice</label>
                <div className="grid grid-cols-3 gap-2">
                  {VOICES.map(voice => (
                    <button
                      key={voice}
                      onClick={() => setNewFriend({...newFriend, voiceName: voice})}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                        newFriend.voiceName === voice 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {voice}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddFriendClick}
                disabled={!newFriend.name || !newFriend.personality || !newFriend.context}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Create Friend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
