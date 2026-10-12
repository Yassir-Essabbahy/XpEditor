import React from 'react';
import { CanvasElement } from '../../types/editor';

interface XpTransformBoxProps {
  element: CanvasElement;
  onResizeStart: (handle: string, e: React.MouseEvent) => void;
}

export const XpTransformBox: React.FC<XpTransformBoxProps> = ({
  element,
  onResizeStart,
}) => {
  const handles = [
    { name: 'nw', className: 'handle-nw' },
    { name: 'n',  className: 'handle-n' },
    { name: 'ne', className: 'handle-ne' },
    { name: 'e',  className: 'handle-e' },
    { name: 'se', className: 'handle-se' },
    { name: 's',  className: 'handle-s' },
    { name: 'sw', className: 'handle-sw' },
    { name: 'w',  className: 'handle-w' },
  ];

  return (
    <div 
      className="transform-bounding-box"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="transform-badge">
        {Math.round(element.width)}% × {Math.round(element.height)}%
      </div>

      {handles.map((h) => (
        <div
          key={h.name}
          className={`transform-handle ${h.className}`}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(h.name, e);
          }}
        />
      ))}
    </div>
  );
};
