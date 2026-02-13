
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MainLayout: React.FC = () => {
    return (
        <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Outlet />
            </div>
        </div>
    );
};

export default MainLayout;
