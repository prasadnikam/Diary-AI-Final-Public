import React, { useState } from 'react';
import { Sparkles, Loader2, Brain, Zap, Clock, Tag, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Task, SubTask } from '../types';
import api from '../services/api';

interface TaskEngineProps {
    onTaskCreated: (task: Omit<Task, 'id'>) => void;
}

interface ProcessedTaskPreview {
    title: string;
    subtasks: SubTask[];
    tags: string[];
    context: 'PERSONAL' | 'PROFESSIONAL' | 'MIXED';
    energyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    contextScore: number;
    externalLink?: string;
    category: string;
    estimatedDurationMinutes?: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const TaskEngine: React.FC<TaskEngineProps> = ({ onTaskCreated }) => {
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [processedTasks, setProcessedTasks] = useState<ProcessedTaskPreview[]>([]);
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const handleProcess = async () => {
        if (!input.trim()) return;

        setProcessing(true);
        setError(null);

        try {
            const response = await api.post('/process-task/', {
                userInput: input,
                currentContext: {
                    time_of_day: getTimeOfDay(),
                    day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
                }
            });

            if (response.data.success) {
                setProcessedTasks(response.data.tasks);
            } else {
                setError('Failed to process task');
            }
        } catch (err: any) {
            console.error('Task processing error:', err);
            setError(err.response?.data?.error || 'Failed to process task. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleSaveTask = async (taskPreview: ProcessedTaskPreview, index: number) => {
        try {
            const taskData: Omit<Task, 'id'> = {
                title: taskPreview.title,
                completed: false,
                priority: taskPreview.priority,
                subtasks: taskPreview.subtasks,
                tags: taskPreview.tags,
                context: taskPreview.context,
                energyLevel: taskPreview.energyLevel,
                contextScore: taskPreview.contextScore,
                externalLink: taskPreview.externalLink,
                category: taskPreview.category,
                estimatedDurationMinutes: taskPreview.estimatedDurationMinutes
            };

            await onTaskCreated(taskData);

            // Remove saved task from preview
            setProcessedTasks(prev => prev.filter((_, i) => i !== index));

            if (processedTasks.length === 1) {
                setInput('');
            }
        } catch (err) {
            console.error('Error saving task:', err);
            setError('Failed to save task');
        }
    };

    const toggleTaskExpansion = (index: number) => {
        setExpandedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const getTimeOfDay = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    };

    const getContextColor = (context: string) => {
        switch (context) {
            case 'PROFESSIONAL': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'PERSONAL': return 'bg-green-100 text-green-700 border-green-200';
            case 'MIXED': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getEnergyColor = (energy: string) => {
        switch (energy) {
            case 'HIGH': return 'text-red-600';
            case 'MEDIUM': return 'text-yellow-600';
            case 'LOW': return 'text-green-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg">
                        <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">AI Task Engine</h3>
                        <p className="text-sm text-gray-600">Describe what you want to do in natural language</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g., 'Plan a trip to Japan for 10 days in May' or 'Build a login feature for the app'"
                        className="w-full px-4 py-3 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
                        rows={3}
                        disabled={processing}
                    />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Sparkles className="h-4 w-4" />
                            <span>AI will decompose, categorize, and estimate time</span>
                        </div>

                        <button
                            onClick={handleProcess}
                            disabled={processing || !input.trim()}
                            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-200"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <Brain className="h-4 w-4" />
                                    <span>Process with AI</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Processed Tasks Preview */}
            {processedTasks.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                        <span>AI Processed Tasks</span>
                    </h4>

                    {processedTasks.map((task, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
                        >
                            {/* Task Header */}
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h5 className="font-semibold text-gray-900 mb-2">{task.title}</h5>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getContextColor(task.context)}`}>
                                                {task.context}
                                            </span>
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                {task.category}
                                            </span>
                                            <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 ${getEnergyColor(task.energyLevel)}`}>
                                                <Zap className="h-3 w-3" />
                                                <span>{task.energyLevel} Energy</span>
                                            </span>
                                            {task.estimatedDurationMinutes && (
                                                <span className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{task.estimatedDurationMinutes} min</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                {task.tags.length > 0 && (
                                    <div className="flex items-center space-x-2 flex-wrap gap-1 mt-3">
                                        <Tag className="h-3 w-3 text-gray-400" />
                                        {task.tags.map((tag, tagIndex) => (
                                            <span key={tagIndex} className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Subtasks */}
                            {task.subtasks.length > 0 && (
                                <div className="p-5 bg-gray-50">
                                    <button
                                        onClick={() => toggleTaskExpansion(index)}
                                        className="flex items-center justify-between w-full text-left mb-3"
                                    >
                                        <span className="text-sm font-medium text-gray-700">
                                            {task.subtasks.length} Subtasks
                                        </span>
                                        {expandedTasks.has(index) ? (
                                            <ChevronUp className="h-4 w-4 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        )}
                                    </button>

                                    {expandedTasks.has(index) && (
                                        <div className="space-y-2">
                                            {task.subtasks.map((subtask, subIndex) => (
                                                <div key={subIndex} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        <div className="h-4 w-4 rounded border-2 border-gray-300" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-gray-900">{subtask.title}</p>
                                                        {subtask.estimatedMinutes && (
                                                            <p className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                                                                <Clock className="h-3 w-3" />
                                                                <span>{subtask.estimatedMinutes} min</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setProcessedTasks(prev => prev.filter((_, i) => i !== index));
                                    }}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={() => handleSaveTask(task, index)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Save Task
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
