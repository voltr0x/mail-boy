import React from 'react';
import { X } from 'lucide-react';

export function SettingsModal({ isOpen, onClose, settings, setSettings }: any) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                <button onClick={onClose} className="absolute right-4 top-4 text-white/50 hover:text-white transition">
                    <X size={20} />
                </button>
                
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                    Configuration
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-1">Gemini API Key</label>
                        <input 
                            type="password" 
                            className="glass-input w-full" 
                            value={settings.geminiKey}
                            placeholder="AIzaSy..."
                            onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                        />
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                        <h3 className="text-sm font-medium text-white/80 mb-3">IMAP Credentials</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-white/60 mb-1">Host</label>
                                <input 
                                    className="glass-input w-full text-sm" 
                                    value={settings.imapHost}
                                    placeholder="imap.gmail.com"
                                    onChange={e => setSettings({...settings, imapHost: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white/60 mb-1">Port</label>
                                <input 
                                    type="number"
                                    className="glass-input w-full text-sm" 
                                    value={settings.imapPort}
                                    placeholder="993"
                                    onChange={e => setSettings({...settings, imapPort: parseInt(e.target.value) || 993})}
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-white/60 mb-1">Email (Username)</label>
                                <input 
                                    type="email"
                                    className="glass-input w-full text-sm" 
                                    value={settings.imapUser}
                                    placeholder="you@gmail.com"
                                    onChange={e => setSettings({...settings, imapUser: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-white/60 mb-1">App Password</label>
                                <input 
                                    type="password"
                                    className="glass-input w-full text-sm" 
                                    value={settings.imapPass}
                                    onChange={e => setSettings({...settings, imapPass: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
