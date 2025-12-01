import React, { useState, useEffect } from 'react';
import { Entity, EntityInteraction } from '../types';
import api from '../services/api';
import { Users, Calendar, Heart, Search, X, MessageSquare, ArrowRight } from 'lucide-react';

export const EntityDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'PERSON' | 'EVENT' | 'FEELING'>('PERSON');
    const [entities, setEntities] = useState<Entity[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
    const [interactions, setInteractions] = useState<EntityInteraction[]>([]);
    const [loading, setLoading] = useState(true);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchEntities();
    }, [activeTab]);

    useEffect(() => {
        if (selectedEntity) {
            fetchTimeline(selectedEntity.id);
        }
    }, [selectedEntity]);

    const fetchEntities = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/entities/?type=${activeTab}`);
            setEntities(response.data);
            // Auto-select first entity if available
            if (response.data.length > 0 && !selectedEntity) {
                setSelectedEntity(response.data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch entities", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeline = async (entityId: string) => {
        setTimelineLoading(true);
        try {
            const response = await api.get(`/entities/${entityId}/timeline/`);
            setInteractions(response.data);
        } catch (error) {
            console.error("Failed to fetch timeline", error);
        } finally {
            setTimelineLoading(false);
        }
    };

    const handleEntityClick = (entity: Entity) => {
        setSelectedEntity(entity);
    };

    const filteredEntities = entities.filter(entity =>
        entity.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex bg-gray-50">
            {/* Left Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        Memories
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-4">
                    <TabButton
                        active={activeTab === 'PERSON'}
                        onClick={() => setActiveTab('PERSON')}
                        label="People"
                    />
                    <TabButton
                        active={activeTab === 'EVENT'}
                        onClick={() => setActiveTab('EVENT')}
                        label="Events"
                    />
                    <TabButton
                        active={activeTab === 'FEELING'}
                        onClick={() => setActiveTab('FEELING')}
                        label="Feelings"
                    />
                </div>

                {/* Search */}
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search People..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Entity List */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredEntities.map(entity => (
                                <EntityListItem
                                    key={entity.id}
                                    entity={entity}
                                    isSelected={selectedEntity?.id === entity.id}
                                    onClick={() => handleEntityClick(entity)}
                                />
                            ))}
                            {filteredEntities.length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    <p>No {activeTab.toLowerCase()}s found.</p>
                                    <p className="text-xs mt-1">Write a diary entry to start!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Entity Details */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedEntity ? (
                    <>
                        {/* Entity Header */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600 overflow-hidden flex-shrink-0">
                                    {selectedEntity.media_url ? (
                                        <img src={selectedEntity.media_url} alt={selectedEntity.name} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedEntity.name[0].toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedEntity.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-gray-500">
                                            {selectedEntity.relationship || 'Relationship: colleague'}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-sm text-indigo-600">Living Memory Stream</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Current Context */}
                        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
                                Current Context
                            </h3>
                            <p className="text-sm text-gray-700 italic">
                                "{selectedEntity.accumulated_context || 'No context yet...'}"
                            </p>
                        </div>

                        {/* Timeline */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {timelineLoading ? (
                                <div className="flex justify-center items-center h-32">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : (
                                <div className="space-y-4 relative">
                                    {/* Timeline line */}
                                    {interactions.length > 0 && (
                                        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-green-400"></div>
                                    )}

                                    {interactions.map((interaction) => (
                                        <MemoryCard key={interaction.id} interaction={interaction} />
                                    ))}

                                    {interactions.length === 0 && (
                                        <div className="text-center text-gray-400 py-20">
                                            <p>No interactions recorded yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p>Select a person to view their memory stream</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Tab Button Component
const TabButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
    >
        {label}
    </button>
);

// Entity List Item Component
const EntityListItem = ({ entity, isSelected, onClick }: { entity: Entity; isSelected: boolean; onClick: () => void }) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    };

    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                    ? 'bg-indigo-50 border-2 border-indigo-600'
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {entity.media_url ? (
                        <img src={entity.media_url} alt={entity.name} className="w-full h-full object-cover" />
                    ) : (
                        entity.name[0].toUpperCase()
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {entity.name}
                    </h3>
                    <p className={`text-xs line-clamp-2 mt-0.5 ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                        {entity.accumulated_context || 'No context yet...'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(entity.updated_at)}</p>
                </div>
            </div>
        </div>
    );
};

// Memory Card Component
const MemoryCard = ({ interaction }: { interaction: EntityInteraction }) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getSentimentLabel = (sentiment: number) => {
        if (sentiment > 0.6) return 'POSITIVE MEMORY';
        if (sentiment < 0.4) return 'NEGATIVE MEMORY';
        return 'NEUTRAL MEMORY';
    };

    const getSentimentColor = (sentiment: number) => {
        if (sentiment > 0.6) return 'text-green-600 bg-green-50';
        if (sentiment < 0.4) return 'text-red-600 bg-red-50';
        return 'text-gray-600 bg-gray-50';
    };

    return (
        <div className="relative pl-10">
            {/* Timeline dot */}
            <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-green-400 border-4 border-white shadow-sm z-10"></div>

            {/* Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span className="font-medium">{formatDate(interaction.date)}</span>
                    </div>
                    {interaction.sentiment > 0.6 && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getSentimentColor(interaction.sentiment)}`}>
                            {getSentimentLabel(interaction.sentiment)}
                        </span>
                    )}
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    {interaction.snippet}
                </p>

                <div className="text-xs text-gray-400">
                    00:05
                </div>
            </div>
        </div>
    );
};
