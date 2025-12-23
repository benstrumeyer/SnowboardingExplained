import React from 'react';

export interface MediaTab {
  id: string;
  name: string;
  type: 'video' | 'mesh' | 'combined';
}

interface MediaTabsProps {
  tabs: MediaTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd?: () => void;
}

/**
 * MediaTabs Component
 * Manages multiple loaded media items with independent controls
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function MediaTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
}: MediaTabsProps) {
  return (
    <div style={{ display: 'flex', gap: '5px', padding: '10px', background: '#1a1a1a', borderBottom: '1px solid #333' }}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '8px 12px',
            background: activeTabId === tab.id ? '#333' : '#222',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer',
            border: activeTabId === tab.id ? '1px solid #666' : '1px solid #333',
          }}
          onClick={() => onTabSelect(tab.id)}
        >
          <span>{tab.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0',
              marginLeft: '5px',
            }}
            title="Close tab"
          >
            ✕
          </button>
        </div>
      ))}
      {onTabAdd && (
        <button
          onClick={onTabAdd}
          style={{
            padding: '8px 12px',
            background: '#222',
            color: '#999',
            border: '1px solid #333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          title="Add new tab"
        >
          +
        </button>
      )}
    </div>
  );
}
