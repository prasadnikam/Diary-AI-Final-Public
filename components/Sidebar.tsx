
import React from 'react';
import { LayoutDashboard, BookOpen, Settings, LogOut, BrainCircuit, Home, Wand2, Plane, MessageCircle } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { view: View.HOME, label: "Home", icon: Home },
    { view: View.FRIEND_CHAT, label: "Friends", icon: MessageCircle },
    { view: View.TRAVEL, label: "Travel", icon: Plane },
    { view: View.CONTENT_CONFIG, label: "Create", icon: Wand2 },
    { view: View.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
    { view: View.STUDY, label: "Study", icon: BrainCircuit },
    { view: View.DIARY, label: "Journal", icon: BookOpen },
    { view: View.SETTINGS, label: "Settings", icon: Settings },
  ];

  return (
    <aside className="fixed z-50 transition-all duration-300
      bottom-0 left-0 w-full h-16 bg-white border-t border-slate-200 flex flex-row justify-between items-center
      md:h-screen md:top-0 md:w-20 lg:w-64 md:flex-col md:border-t-0 md:border-r md:justify-start md:items-stretch
    ">
      {/* Logo - Hidden on mobile, visible on desktop */}
      <div className="hidden md:flex h-16 items-center justify-center lg:justify-start lg:px-6 border-b border-slate-100">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30">
          M
        </div>
        <span className="hidden lg:block ml-3 font-bold text-slate-800 text-lg">Mindful</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 md:py-6 flex flex-row md:flex-col gap-1 md:gap-2 px-2 md:px-3 w-full justify-around md:justify-start overflow-x-auto md:overflow-visible no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col md:flex-row items-center justify-center md:justify-start p-2 md:p-3 rounded-xl transition-all duration-200 group flex-shrink-0 ${
              currentView === item.view
                ? 'bg-transparent md:bg-primary-50 text-primary-600 md:shadow-sm'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon className={`w-6 h-6 ${currentView === item.view ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span className="text-[10px] md:text-base md:font-medium mt-1 md:mt-0 md:ml-3">
              <span className="block md:hidden">{item.label}</span>
              <span className="hidden lg:block">{item.label}</span>
            </span>
            {currentView === item.view && (
              <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-primary-600"></div>
            )}
          </button>
        ))}
      </nav>

      {/* Logout - Desktop Only */}
      <div className="hidden md:block p-3 border-t border-slate-100">
        <button className="flex items-center p-3 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-red-500 w-full transition-colors">
          <LogOut className="w-6 h-6" />
          <span className="hidden lg:block ml-3 font-medium">Log Out</span>
        </button>
      </div>
    </aside>
  );
};
