import React, { useState, useRef, useEffect } from 'react';
import { Heart } from 'lucide-react';

const REACTIONS = [
    { emoji: '❤️', name: 'love', color: 'text-red-500' },
    { emoji: '🔥', name: 'fire', color: 'text-orange-500' },
    { emoji: '👏', name: 'clap', color: 'text-yellow-500' },
    { emoji: '😍', name: 'heart_eyes', color: 'text-pink-500' },
    { emoji: '💎', name: 'diamond', color: 'text-cyan-400' },
];

export const ReactionButton = ({ 
    contentId, 
    currentReaction = null, 
    reactionCounts = {}, 
    totalCount = 0,
    onReact,
    disabled = false
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const [animatingReaction, setAnimatingReaction] = useState(null);
    const [floatingEmojis, setFloatingEmojis] = useState([]);
    const pickerRef = useRef(null);
    const buttonRef = useRef(null);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleReaction = (reaction) => {
        if (disabled) return;
        
        // Trigger animation
        setAnimatingReaction(reaction.name);
        setTimeout(() => setAnimatingReaction(null), 600);
        
        // Add floating emoji animation
        const id = Date.now();
        setFloatingEmojis(prev => [...prev, { id, emoji: reaction.emoji }]);
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(e => e.id !== id));
        }, 1000);
        
        // Call the reaction handler
        onReact(contentId, reaction.name);
        setShowPicker(false);
    };

    const handleQuickReact = () => {
        if (disabled) return;
        
        if (currentReaction) {
            // Remove reaction
            onReact(contentId, null);
        } else {
            // Quick react with heart
            handleReaction(REACTIONS[0]);
        }
    };

    const getCurrentReactionEmoji = () => {
        if (!currentReaction) return null;
        const reaction = REACTIONS.find(r => r.name === currentReaction);
        return reaction?.emoji || '❤️';
    };

    return (
        <div className="relative">
            {/* Floating emojis animation */}
            {floatingEmojis.map(({ id, emoji }) => (
                <span 
                    key={id}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl animate-float-up pointer-events-none"
                    style={{
                        animation: 'floatUp 1s ease-out forwards'
                    }}
                >
                    {emoji}
                </span>
            ))}

            <div className="flex items-center gap-2">
                {/* Main reaction button */}
                <button
                    ref={buttonRef}
                    onClick={handleQuickReact}
                    onMouseEnter={() => !disabled && setShowPicker(true)}
                    className={`flex items-center gap-2 transition-all duration-200 ${
                        currentReaction 
                            ? 'text-red-500 scale-110' 
                            : 'text-white/50 hover:text-red-500'
                    } ${animatingReaction ? 'animate-bounce-reaction' : ''}`}
                    data-testid={`reaction-btn-${contentId}`}
                    disabled={disabled}
                >
                    {currentReaction ? (
                        <span className="text-xl transition-transform hover:scale-125">
                            {getCurrentReactionEmoji()}
                        </span>
                    ) : (
                        <Heart className={`w-5 h-5 transition-transform hover:scale-125 ${currentReaction ? 'fill-current' : ''}`} />
                    )}
                    <span className="text-sm">{totalCount}</span>
                </button>

                {/* Reaction picker */}
                {showPicker && (
                    <div 
                        ref={pickerRef}
                        className="absolute bottom-full left-0 mb-2 bg-obsidian border border-white/20 rounded-full px-2 py-1 flex gap-1 shadow-xl z-50 animate-scale-in"
                        onMouseLeave={() => setShowPicker(false)}
                    >
                        {REACTIONS.map((reaction) => (
                            <button
                                key={reaction.name}
                                onClick={() => handleReaction(reaction)}
                                className={`text-xl p-1.5 rounded-full transition-all duration-200 hover:scale-150 hover:bg-white/10 ${
                                    currentReaction === reaction.name ? 'bg-white/20 scale-125' : ''
                                }`}
                                title={reaction.name}
                                data-testid={`reaction-${reaction.name}-${contentId}`}
                            >
                                {reaction.emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Reaction counts breakdown (optional - show on hover) */}
            {Object.keys(reactionCounts).length > 0 && totalCount > 0 && (
                <div className="flex items-center gap-0.5 ml-1">
                    {REACTIONS.filter(r => reactionCounts[r.name] > 0)
                        .slice(0, 3)
                        .map(r => (
                            <span key={r.name} className="text-xs">
                                {r.emoji}
                            </span>
                        ))}
                </div>
            )}

            <style jsx>{`
                @keyframes floatUp {
                    0% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-40px) scale(1.5);
                    }
                }
                @keyframes scaleIn {
                    0% {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes bounceReaction {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.3);
                    }
                }
                .animate-scale-in {
                    animation: scaleIn 0.2s ease-out;
                }
                .animate-bounce-reaction {
                    animation: bounceReaction 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ReactionButton;
