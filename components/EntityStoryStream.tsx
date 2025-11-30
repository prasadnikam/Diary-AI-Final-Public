import React, { useState, useEffect } from 'react';
import { Entity, EntityInteraction } from '../types';
import api from '../services/api';
import { X, MessageSquare, Calendar, ArrowRight } from 'lucide-react';

interface Props {
    entity: Entity;
    onClose: () => void;
}

export const EntityStoryStream: React.FC<Props> = ({ entity, onClose }) => {
    const [interactions, setInteractions] = useState<EntityInteraction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTimeline = async () => {
            try {
                const response = await api.get(`/entities/${entity.id}/timeline/`);
                setInteractions(response.data);
            } catch (error) {
                console.error("Failed to fetch timeline", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTimeline();
    }, [entity.id]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600 overflow-hidden">
                            {entity.media_url ? (
                                <img src={entity.media_url} alt={entity.name} className="w-full h-full object-cover" />
                            ) : (
                                entity.name[0].toUpperCase()
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{entity.name}</h2>
                            <p className="text-xs text-slate-500">Living Memory Stream</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Context Summary */}
                <div className="p-6 bg-indigo-50 border-b border-indigo-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Current Persona</h3>
                    <p className="text-sm text-indigo-900 leading-relaxed">
                        {entity.accumulated_context}
                    </p>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6 relative">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
                            {interactions.map((interaction) => (
                                <div key={interaction.id} className="relative pl-10 group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-0 top-1.5 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${interaction.sentiment > 0.6 ? 'bg-emerald-500' :
                                            interaction.sentiment < 0.4 ? 'bg-rose-500' : 'bg-slate-400'
                                        }`}>
                                        <MessageSquare className="w-4 h-4 text-white" />
                                    </div>

                                    {/* Card */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(interaction.date).toLocaleDateString(undefined, {
                                                    year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </span>
                                            {interaction.sentiment > 0.6 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">POSITIVE</span>
                                            )}
                                        </div>

                                        <p className="text-slate-700 text-sm leading-relaxed">
                                            "{interaction.snippet}"
                                        </p>

                                        <button className="mt-3 text-xs font-medium text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
                                            Read Entry <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {interactions.length === 0 && (
                                <div className="text-center text-slate-400 py-10">
                                    No interactions recorded yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
