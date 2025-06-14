
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
    const isMedium = i % 2 === 0; // Medium tick every 20 pixels
    
    ticks.push(
      <div
        key={i}
        className={`absolute ${
          isMajor 
            ? 'bg-blue-600' 
            : isMedium 
              ? 'bg-blue-400' 
              : 'bg-blue-300'
        } ${
          isHorizontal 
            ? `h-${isMajor ? '3' : isMedium ? '2' : '1'} w-px` 
            : `w-${isMajor ? '3' : isMedium ? '2' : '1'} h-px`
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
          className="absolute text-xs text-blue-700 select-none font-mono font-medium"
          style={{
            [isHorizontal ? 'left' : 'top']: `${position - (isHorizontal ? 8 : 6)}px`,
            [isHorizontal ? 'top' : 'left']: isHorizontal ? '2px' : '2px',
            fontSize: '9px',
            transform: isHorizontal ? 'none' : 'rotate(-90deg)',
            transformOrigin: 'center'
          }}
        >
          {position}
        </div>
      );
    }
  }
  
  return (
    <div
      className={`relative bg-gradient-to-b from-blue-50 to-blue-100 border border-blue-200 ${className}`}
      style={{
        width: isHorizontal ? `${length}px` : '24px',
        height: isHorizontal ? '24px' : `${length}px`,
      }}
    >
      {ticks}
      {/* Zero marker */}
      <div
        className="absolute w-2 h-2 bg-red-500 rounded-full"
        style={{
          [isHorizontal ? 'left' : 'top']: '-4px',
          [isHorizontal ? 'bottom' : 'right']: '-4px'
        }}
      />
    </div>
  );
};

export default Ruler;
