import React, { useState, useEffect } from 'react';
import { Entity } from '../types';
import api from '../services/api';
import { Users, Calendar, Heart, Activity, Search, Upload } from 'lucide-react';
import { EntityStoryStream } from './EntityStoryStream';

export const EntityDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'PERSON' | 'EVENT' | 'FEELING'>('PERSON');
    const [entities, setEntities] = useState<Entity[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEntities();
    }, [activeTab]);

    const fetchEntities = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/entities/?type=${activeTab}`);
            setEntities(response.data);
        } catch (error) {
            console.error("Failed to fetch entities", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEntityClick = (entity: Entity) => {
        setSelectedEntity(entity);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-6 h-6 text-indigo-600" />
                    AI Friends & Memories
                </h1>
                <p className="text-slate-500 text-sm mt-1">Your living social graph, evolved from your diary.</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-4">
                <TabButton
                    active={activeTab === 'PERSON'}
                    onClick={() => setActiveTab('PERSON')}
                    icon={<Users className="w-4 h-4" />}
                    label="People"
                />
                <TabButton
                    active={activeTab === 'EVENT'}
                    onClick={() => setActiveTab('EVENT')}
                    icon={<Calendar className="w-4 h-4" />}
                    label="Events"
                />
                <TabButton
                    active={activeTab === 'FEELING'}
                    onClick={() => setActiveTab('FEELING')}
                    icon={<Heart className="w-4 h-4" />}
                    label="Feelings"
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {entities.map(entity => (
                            <EntityCard key={entity.id} entity={entity} onClick={() => handleEntityClick(entity)} />
                        ))}
                        {entities.length === 0 && (
                            <div className="col-span-full text-center py-20 text-slate-400">
                                <p>No {activeTab.toLowerCase()}s found yet.</p>
                                <p className="text-sm">Write a diary entry to start building your graph!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Story Stream Modal */}
            {selectedEntity && (
                <EntityStoryStream
                    entity={selectedEntity}
                    onClose={() => setSelectedEntity(null)}
                />
            )}
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${active
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
    >
        {icon}
        {label}
    </button>
);

const EntityCard = ({ entity, onClick }: { entity: Entity; onClick: () => void }) => (
    <div
        onClick={onClick}
        className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
    >
        <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 overflow-hidden">
                    {entity.media_url ? (
                        <img src={entity.media_url} alt={entity.name} className="w-full h-full object-cover" />
                    ) : (
                        entity.name[0].toUpperCase()
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {entity.name}
                    </h3>
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                        {entity.type}
                    </span>
                </div>
            </div>

            <div className="text-sm text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                "{entity.accumulated_context || "No context yet..."}"
            </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Updated {new Date(entity.updated_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-1 text-indigo-600 font-medium">
                View Story <Activity className="w-3 h-3" />
            </span>
        </div>
    </div>
);
