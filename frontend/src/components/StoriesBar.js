import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, ChevronLeft, ChevronRight, Eye, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
    Dialog,
    DialogContent,
} from '../components/ui/dialog';
import { mediaUrl } from '../lib/media';

export const StoriesBar = () => {
    const { api, isCreator } = useAuth();
    const [storiesFeed, setStoriesFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentCreator, setCurrentCreator] = useState(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            const response = await api().get('/stories/feed');
            setStoriesFeed(response.data);
        } catch (error) {
            console.error('Failed to fetch stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const openStoryViewer = (creator) => {
        setCurrentCreator(creator);
        setCurrentStoryIndex(0);
        setViewerOpen(true);
        // Mark first story as viewed
        if (creator.stories?.[0]) {
            markAsViewed(creator.stories[0].id);
        }
    };

    const markAsViewed = async (storyId) => {
        try {
            await api().post(`/stories/${storyId}/view`);
        } catch (error) {
            // Silently fail
        }
    };

    const nextStory = () => {
        if (!currentCreator) return;
        const stories = currentCreator.stories || [];
        
        if (currentStoryIndex < stories.length - 1) {
            const nextIndex = currentStoryIndex + 1;
            setCurrentStoryIndex(nextIndex);
            markAsViewed(stories[nextIndex].id);
        } else {
            // Move to next creator
            const currentIdx = storiesFeed.findIndex(c => c.creator_id === currentCreator.creator_id);
            if (currentIdx < storiesFeed.length - 1) {
                const nextCreator = storiesFeed[currentIdx + 1];
                setCurrentCreator(nextCreator);
                setCurrentStoryIndex(0);
                if (nextCreator.stories?.[0]) {
                    markAsViewed(nextCreator.stories[0].id);
                }
            } else {
                setViewerOpen(false);
            }
        }
    };

    const prevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(currentStoryIndex - 1);
        }
    };

    if (loading) return null;
    if (storiesFeed.length === 0) return null;

    const currentStory = currentCreator?.stories?.[currentStoryIndex];

    return (
        <>
            {/* Stories Bar */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide" data-testid="stories-bar">
                {storiesFeed.map((creator) => (
                    <button
                        key={creator.creator_id}
                        onClick={() => openStoryViewer(creator)}
                        className="flex flex-col items-center gap-2 flex-shrink-0"
                        data-testid={`story-avatar-${creator.creator_id}`}
                    >
                        <div className={`p-0.5 rounded-full ${creator.has_unseen ? 'bg-gradient-to-r from-gold to-gold-light' : 'bg-white/20'}`}>
                            <Avatar className="w-16 h-16 border-2 border-black">
                                <AvatarImage src={mediaUrl(creator.creator_profile_image)} />
                                <AvatarFallback className="bg-obsidian text-gold">
                                    {creator.creator_display_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <span className="text-white/70 text-xs truncate w-16 text-center">
                            {creator.creator_display_name}
                        </span>
                    </button>
                ))}
            </div>

            {/* Story Viewer Modal */}
            <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent className="bg-black border-none max-w-lg p-0 overflow-hidden">
                    {currentCreator && currentStory && (
                        <div className="relative aspect-[9/16] max-h-[80vh]">
                            {/* Progress bars */}
                            <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
                                {currentCreator.stories?.map((_, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`h-0.5 flex-1 rounded-full ${idx <= currentStoryIndex ? 'bg-white' : 'bg-white/30'}`}
                                    />
                                ))}
                            </div>

                            {/* Header */}
                            <div className="absolute top-6 left-4 right-4 flex items-center justify-between z-20">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8 border border-white/30">
                                        <AvatarImage src={mediaUrl(currentCreator.creator_profile_image)} />
                                        <AvatarFallback className="bg-obsidian text-gold text-xs">
                                            {currentCreator.creator_display_name?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-white text-sm font-medium">
                                        {currentCreator.creator_display_name}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setViewerOpen(false)}
                                    className="text-white/70 hover:text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Story Content */}
                            {currentStory.media_type === 'image' ? (
                                <img 
                                    src={mediaUrl(currentStory.media_url)} 
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <video 
                                    src={mediaUrl(currentStory.media_url)}
                                    autoPlay
                                    className="w-full h-full object-cover"
                                />
                            )}

                            {/* Caption */}
                            {currentStory.caption && (
                                <div className="absolute bottom-16 left-4 right-4 z-20">
                                    <p className="text-white text-center bg-black/50 px-4 py-2 rounded">
                                        {currentStory.caption}
                                    </p>
                                </div>
                            )}

                            {/* Views */}
                            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white/70 z-20">
                                <Eye className="w-4 h-4" />
                                <span className="text-sm">{currentStory.views}</span>
                            </div>

                            {/* Navigation areas */}
                            <button 
                                onClick={prevStory}
                                className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                            />
                            <button 
                                onClick={nextStory}
                                className="absolute right-0 top-0 bottom-0 w-2/3 z-10"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default StoriesBar;
