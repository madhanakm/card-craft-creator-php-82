
import React from 'react';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  length: number;
  className?: string;
}

const Ruler: React.FC<RulerProps> = ({ orientation, length, className = '' }) => {
  const isHorizontal = orientation === 'horizontal';
  const tickCount = Math.floor(length / 10); // Major tick every 10 pixels
  
  const ticks = [];
  for (let i = 0; i <= tickCount; i++) {
    const position = i * 10;
    const isMajor = i % 5 === 0; // Major tick every 50 pixels
    
    ticks.push(
      <div
        key={i}
        className={`absolute bg-gray-400 ${
          isHorizontal 
            ? `h-${isMajor ? '4' : '2'} w-px` 
            : `w-${isMajor ? '4' : '2'} h-px`
        }`}
        style={{
          [isHorizontal ? 'left' : 'top']: `${position}px`,
          [isHorizontal ? 'bottom' : 'right']: '0px'
        }}
      />
    );
    
    // Add number labels for major ticks
    if (isMajor && i > 0) {
      ticks.push(
        <div
          key={`label-${i}`}
          className="absolute text-xs text-gray-500 select-none"
          style={{
            [isHorizontal ? 'left' : 'top']: `${position - 8}px`,
            [isHorizontal ? 'bottom' : 'right']: isHorizontal ? '6px' : '6px',
            fontSize: '10px'
          }}
        >
          {position}
        </div>
      );
    }
  }
  
  return (
    <div
      className={`relative bg-gray-100 border-gray-300 ${className}`}
      style={{
        width: isHorizontal ? `${length}px` : '20px',
        height: isHorizontal ? '20px' : `${length}px`,
      }}
    >
      {ticks}
    </div>
  );
};

export default Ruler;
