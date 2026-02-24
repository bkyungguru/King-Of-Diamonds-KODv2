import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Lock, Unlock, DollarSign, Image, Video, Loader2, Send, Users, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export const PPVPage = () => {
    const { api, isCreator } = useAuth();
    const [inbox, setInbox] = useState([]);
    const [fanLists, setFanLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [unlocking, setUnlocking] = useState(null);
    
    const [newPPV, setNewPPV] = useState({
        content: '',
        price: 10,
        recipient_list: 'all',
        media_urls: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [inboxRes, listsRes] = await Promise.all([
                api().get('/ppv/inbox'),
                isCreator ? api().get('/ppv/lists').catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
            ]);
            setInbox(inboxRes.data);
            setFanLists(listsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = async (ppvId, price) => {
        setUnlocking(ppvId);
        try {
            const response = await api().post(`/ppv/${ppvId}/unlock`);
            toast.success('Content unlocked!');
            
            // Update inbox
            setInbox(prev => prev.map(msg => 
                msg.id === ppvId 
                    ? { ...msg, is_purchased: true, content: response.data.content, media_urls: response.data.media_urls }
                    : msg
            ));
        } catch (error) {
            toast.error('Failed to unlock content');
        } finally {
            setUnlocking(null);
        }
    };

    const handleSendMassMessage = async () => {
        if (!newPPV.content) {
            toast.error('Please add content');
            return;
        }

        try {
            const response = await api().post('/ppv/mass-message', {
                content: newPPV.content,
                media_urls: newPPV.media_urls,
                is_ppv: true,
                ppv_price: newPPV.price,
                recipient_list: newPPV.recipient_list
            });
            toast.success(`PPV sent to ${response.data.recipient_count} subscribers!`);
            setSendDialogOpen(false);
            setNewPPV({ content: '', price: 10, recipient_list: 'all', media_urls: [] });
        } catch (error) {
            toast.error('Failed to send PPV');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black" data-testid="ppv-page">
            <Navbar />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="font-heading text-3xl">
                            <span className="gold-text">Pay-Per-View</span>
                            <span className="text-white ml-3">Messages</span>
                        </h1>
                        <p className="text-white/50">Exclusive locked content</p>
                    </div>
                    {isCreator && (
                        <button
                            onClick={() => setSendDialogOpen(true)}
                            className="gold-btn px-6 py-3 flex items-center gap-2"
                            data-testid="send-ppv-btn"
                        >
                            <Send className="w-5 h-5" />
                            Send PPV
                        </button>
                    )}
                </div>

                {inbox.length === 0 ? (
                    <div className="card-luxury p-12 text-center">
                        <Lock className="w-12 h-12 text-gold/30 mx-auto mb-4" />
                        <h3 className="font-heading text-lg text-white mb-2">No PPV Messages</h3>
                        <p className="text-white/50">You haven't received any pay-per-view content yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {inbox.map((msg) => (
                            <div key={msg.id} className="card-luxury p-6" data-testid={`ppv-msg-${msg.id}`}>
                                <div className="flex items-start gap-4">
                                    <Avatar className="w-12 h-12 border border-gold/30">
                                        <AvatarImage src={msg.sender_avatar} />
                                        <AvatarFallback className="bg-obsidian text-gold">
                                            {msg.sender_name?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-white font-medium">{msg.sender_name}</h3>
                                            <span className="text-white/40 text-sm">
                                                {new Date(msg.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        
                                        {msg.is_purchased ? (
                                            <>
                                                <p className="text-white/80 mb-4">{msg.content}</p>
                                                {msg.media_urls?.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {msg.media_urls.map((url, idx) => (
                                                            <img key={idx} src={url} alt="" className="rounded" />
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 mt-3 text-green-400">
                                                    <Unlock className="w-4 h-4" />
                                                    <span className="text-sm">Unlocked</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-obsidian rounded p-6 mb-4 text-center">
                                                    <Lock className="w-10 h-10 text-gold/50 mx-auto mb-3" />
                                                    <p className="text-white/50 mb-2">{msg.preview_text}</p>
                                                    {msg.media_count > 0 && (
                                                        <p className="text-white/30 text-sm">
                                                            +{msg.media_count} media file{msg.media_count > 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleUnlock(msg.id, msg.price)}
                                                    disabled={unlocking === msg.id}
                                                    className="gold-btn px-6 py-3 flex items-center gap-2"
                                                    data-testid={`unlock-${msg.id}`}
                                                >
                                                    {unlocking === msg.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <DollarSign className="w-5 h-5" />
                                                            Unlock for ${msg.price}
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Send PPV Dialog */}
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-heading gold-text">Send PPV Message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Recipients
                            </label>
                            <select
                                value={newPPV.recipient_list}
                                onChange={(e) => setNewPPV(prev => ({ ...prev, recipient_list: e.target.value }))}
                                className="input-luxury w-full py-3"
                                data-testid="recipient-select"
                            >
                                <option value="all">All Subscribers</option>
                                <option value="top_fans">Top Fans (Top Tippers)</option>
                                {fanLists.map(list => (
                                    <option key={list.id} value={list.id}>{list.name} ({list.member_count})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Content
                            </label>
                            <textarea
                                value={newPPV.content}
                                onChange={(e) => setNewPPV(prev => ({ ...prev, content: e.target.value }))}
                                className="input-luxury w-full h-32 resize-none"
                                placeholder="Your exclusive message..."
                                data-testid="ppv-content"
                            />
                        </div>

                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Price (USD)
                            </label>
                            <div className="flex gap-2">
                                {[5, 10, 20, 50].map(price => (
                                    <button
                                        key={price}
                                        onClick={() => setNewPPV(prev => ({ ...prev, price }))}
                                        className={`px-4 py-2 ${newPPV.price === price ? 'gold-btn' : 'btn-secondary'}`}
                                    >
                                        ${price}
                                    </button>
                                ))}
                                <input
                                    type="number"
                                    value={newPPV.price}
                                    onChange={(e) => setNewPPV(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                    className="input-luxury w-20 text-center"
                                    min="1"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSendMassMessage}
                            className="gold-btn w-full py-3 flex items-center justify-center gap-2"
                            data-testid="send-ppv-confirm"
                        >
                            <Send className="w-5 h-5" />
                            Send PPV (${newPPV.price})
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PPVPage;
