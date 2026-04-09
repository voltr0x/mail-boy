import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Mail, Paperclip, Loader2 } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { chatWithGemini } from './lib/geminiService';
import { mcpService } from './lib/mcpClient';

function App() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'model', content: "Hello! I'm Mail Boy. How can I help you find attachments today?" }
  ]);
  const [input, setInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('mailBoySettings');
    return saved ? JSON.parse(saved) : { geminiKey: '', imapHost: 'imap.gmail.com', imapPort: 993, imapUser: '', imapPass: '' };
  });
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('mailBoySettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    mcpService.connect().catch(e => console.error("Could not connect to MCP on startup", e));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || !settings.geminiKey) {
        if (!settings.geminiKey) alert('Please add your Gemini API Key in Settings first.');
        return;
    }

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
        const response = await chatWithGemini(
            userText,
            messages.slice(1), // ignore initial greeting
            settings.geminiKey,
            {
                host: settings.imapHost,
                port: settings.imapPort,
                user: settings.imapUser,
                password: settings.imapPass
            },
            (toolName, args) => {
                console.log('Gemini called tool:', toolName, args);
            }
        );

        const newMsg: any = { role: 'model', content: response.text };
        
        // If there is attachment data, parse it and render
        if (response.toolData) {
             try {
                const parsed = JSON.parse(response.toolData[0].text);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    newMsg.attachments = parsed;
                }
             } catch (e) {
                console.error("Could not parse tool data", e);
             }
        }

        setMessages(prev => [...prev, newMsg]);

    } catch (err: any) {
        setMessages(prev => [...prev, { role: 'model', content: `Sorry, an error occurred: ${err.message}` }]);
    } finally {
        setLoading(false);
    }
  };

  const downloadBase64File = (base64Data: string, contentType: string, filename: string) => {
    const linkSource = `data:${contentType};base64,${base64Data}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black relative selection:bg-indigo-500/30">
        
        {/* Header */}
        <header className="p-6 flex justify-between items-center z-10 glass-panel border-x-0 border-t-0 rounded-none bg-black/20 backdrop-blur-3xl sticky top-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/20">
                    <Mail size={24} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    Mail Boy
                </h1>
                <span className={`ml-4 text-xs px-2 py-1 rounded-full ${mcpService.isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    MCP {mcpService.isConnected ? 'Connected' : 'Disconnected'}
                </span>
            </div>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white/70 hover:text-white group"
            >
                <Settings size={20} className="group-hover:rotate-45 transition-transform duration-300" />
            </button>
        </header>

        {/* Chat Area */}
        <main ref={scrollRef} className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6 pb-32 scroll-smooth">
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[80%] rounded-2xl p-5 shadow-2xl ${
                        msg.role === 'user' 
                        ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-tr-none' 
                        : 'glass-panel rounded-tl-none border border-white/10'
                    }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        
                        {/* Render Attachments */}
                        {msg.attachments && (
                            <div className="mt-4 space-y-3">
                                <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Attachments Found</h4>
                                {msg.attachments.map((att: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 group hover:border-indigo-500/50 transition-all">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <Paperclip size={18} className="text-indigo-400 flex-shrink-0" />
                                            <div className="truncate">
                                                <p className="text-sm font-medium text-white truncate">{att.filename}</p>
                                                <p className="text-xs text-white/40">{Math.round(att.size / 1024)} KB • From: {att.sender}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => downloadBase64File(att.contentBase64, att.contentType, att.filename)}
                                            className="px-4 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white transition-all text-xs font-semibold"
                                        >
                                            Download
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex justify-start">
                    <div className="glass-panel rounded-2xl p-5 rounded-tl-none flex items-center gap-3">
                        <Loader2 size={18} className="animate-spin text-indigo-400" />
                        <span className="text-white/60 text-sm animate-pulse">Searching emails via MCP...</span>
                    </div>
                </div>
            )}
        </main>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-slate-950 to-transparent pt-12">
            <div className="max-w-4xl mx-auto relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                <div className="relative glass-panel rounded-2xl flex items-center p-2">
                    <input 
                        type="text" 
                        className="flex-1 bg-transparent border-none focus:outline-none px-4 py-3 text-white placeholder:text-white/30"
                        placeholder="e.g. Find the invoice pdf sent by John last week..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white hover:from-indigo-400 hover:to-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>

        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            settings={settings} 
            setSettings={setSettings} 
        />
    </div>
  );
}

export default App;
