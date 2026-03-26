import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Mic, 
  Paperclip, 
  X, 
  Bot, 
  User as UserIcon,
  ChevronRight,
  CreditCard,
  TrainFront,
  Stethoscope,
  Store,
  Wrench,
  HelpCircle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, mockUser } from '../mockData';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: { label: string; icon: any; onClick: () => void }[];
}

interface ChatbotScreenProps {
  user: User;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const SUGGESTED_PROMPTS = [
  { label: 'When is my rent due?', icon: CreditCard, prompt: 'When is my rent due?' },
  { label: 'Metro service status', icon: TrainFront, prompt: 'Is the Metro running ok today?' },
  { label: 'Book GP appt', icon: Stethoscope, prompt: 'I need to book a GP appointment.' },
  { label: 'Shops near me', icon: Store, prompt: 'What shops are in my Hub?' },
  { label: 'Report issue', icon: Wrench, prompt: 'I have a maintenance issue to report.' },
  { label: 'General help', icon: HelpCircle, prompt: 'How do I use this app?' },
];

export const ChatbotScreen: React.FC<ChatbotScreenProps> = ({ user, onClose, onNavigate }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi ${user.first_name}! I'm your Lennox Assistant. I can help with housing, transport, health, payments, and more. What can I help you with today?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Mock logic for specific queries to feel integrated
    const lowerText = text.toLowerCase();
    let responseContent = "";
    let actions: Message['actions'] = [];

    if (lowerText.includes('rent') || lowerText.includes('pay')) {
      responseContent = `Your next rent payment is due on **${user.housing.rent_due_date}** (in 9 days). 
      
Amount: **L$${user.housing.rent_monthly}**
Payment method: **${user.housing.payment_method}** (auto-pay enabled).

The payment will be automatically deducted from your Lennox Postal Bank account.`;
      actions = [
        { label: 'View History', icon: CreditCard, onClick: () => onNavigate('housing') },
        { label: 'Receipt', icon: Paperclip, onClick: () => {} }
      ];
    } else if (lowerText.includes('metro') || lowerText.includes('train')) {
      responseContent = `Good morning! Here's the current Metro status:
      
🟢 **Red Line:** Good service
🟢 **Blue Line:** Good service
🟢 **Teal Line:** Good service
🟠 **Yellow Line:** Minor delays (5-10 min)

Next train from **${user.address.hub}**:
• Red Line (to Balloch): 2 mins
• Blue Line (to Clydebank): 5 mins`;
      actions = [
        { label: 'Plan Journey', icon: TrainFront, onClick: () => onNavigate('transport') }
      ];
    } else if (lowerText.includes('shop') || lowerText.includes('near me')) {
      responseContent = `There are several shops in the **${user.address.hub}**:
      
• **Tesco Metro** (Level 1) - Open 24/7
• **7-Eleven** (Level 1) - Open 24/7
• **Indigo** (Level 3) - Fine Dining
• **LHS GP Clinic** (Level 1) - Open now (12 min wait)`;
      actions = [
        { label: 'Explore Hub', icon: Store, onClick: () => onNavigate('hub') }
      ];
    } else if (lowerText.includes('maintenance') || lowerText.includes('leak') || lowerText.includes('repair')) {
      responseContent = `I can help you report a maintenance issue. Is this an **emergency** (flooding/unusable) or a **routine** repair?`;
      actions = [
        { label: 'Emergency', icon: X, onClick: () => {} },
        { label: 'Routine', icon: Wrench, onClick: () => onNavigate('housing') }
      ];
    } else {
      // Use Gemini for general queries
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: text,
          config: {
            systemInstruction: `You are the Lennox Assistant for the MyLennox app. 
            The user is ${user.first_name} ${user.last_name}, living at ${user.address.full}.
            Lennox is a futuristic, high-tech city-state in Scotland.
            Be helpful, professional, and concise. 
            If asked about housing, transport, or health, mention that you can help them navigate to those tabs in the app.`,
          }
        });
        responseContent = response.text || "I'm sorry, I couldn't process that request. How else can I help you?";
      } catch (error) {
        console.error("Gemini Error:", error);
        responseContent = "I'm having trouble connecting to my brain right now. Please try again in a moment!";
      }
    }

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        actions
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-white flex flex-col pt-12"
    >
      {/* Header */}
      <div className="px-4 py-3 border-bottom border-slate-100 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-900/20">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lennox Assistant</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-white text-teal-600 border border-slate-100'}`}>
                {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              <div className="space-y-2">
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user' ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={action.onClick}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-teal-500 hover:text-teal-600 transition-all shadow-sm"
                      >
                        <action.icon size={14} />
                        {action.label}
                        <ChevronRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
                
                <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-teal-600 shadow-sm">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length < 3 && (
        <div className="px-4 py-3 bg-white border-t border-slate-100">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {SUGGESTED_PROMPTS.map((item, i) => (
              <button
                key={i}
                onClick={() => handleSend(item.prompt)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-xs font-bold text-slate-600 whitespace-nowrap hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600 transition-all"
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 pb-8">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-teal-600 transition-colors">
            <Paperclip size={20} />
          </button>
          <input 
            type="text"
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-800 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
          />
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-teal-600 transition-colors">
            <Mic size={20} />
          </button>
          <button 
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${input.trim() ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' : 'bg-slate-200 text-slate-400'}`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
