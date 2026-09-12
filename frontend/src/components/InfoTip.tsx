import React, { useState } from 'react';

interface InfoTipProps {
  content: string;
}

export const InfoTip: React.FC<InfoTipProps> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span 
      className="infotip"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <button 
        type="button" 
        className="infotip__trigger"
        aria-label="Explanation"
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        <svg 
          width="11" 
          height="11" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </button>
      {isVisible && (
        <span className="infotip__content" role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
};
