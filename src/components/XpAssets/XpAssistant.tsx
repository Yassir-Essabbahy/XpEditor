import React, { useRef, useEffect, useState } from 'react';
import { AssistantElement } from '../../types/editor';
import { XP_ASSISTANT_POSE_MAP, XP_ASSISTANT_SHEET } from '../../utils/xpAssets';
import { evaluateAssistantDialogue } from '../../utils/keyframeAnimation';

interface XpAssistantProps {
  element: AssistantElement;
  isSelected?: boolean;
  currentTime: number;
}

// Global image cache for sprite sheets to ensure instant rendering without re-fetching
const assistantImageCache = new Map<string, HTMLImageElement>();

function getCachedImage(src: string): HTMLImageElement {
  if (assistantImageCache.has(src)) {
    return assistantImageCache.get(src)!;
  }
  const img = new Image();
  // Only set crossOrigin for remote http(s) URLs, not local relative paths
  if (src.startsWith('http://') || src.startsWith('https://')) {
    img.crossOrigin = 'anonymous';
  }
  img.src = src;
  assistantImageCache.set(src, img);
  return img;
}

export const XpAssistant: React.FC<XpAssistantProps> = ({ element, isSelected, currentTime }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteReady, setSpriteReady] = useState<boolean>(false);

  const evalDialogue = evaluateAssistantDialogue(element, currentTime);
  const pose = evalDialogue.pose;
  const isAnimated = element.isAnimated ?? false;
  const animationSpeed = element.animationSpeed || 12;
  const showDialogue = evalDialogue.showDialogue && Boolean(evalDialogue.dialogueText);
  const bubblePos = evalDialogue.bubblePosition;

  // Calculate fade-in and fade-out opacity
  let fadeAlpha = 1;
  const relTime = currentTime - element.startTime;
  if (element.fadeInDuration && element.fadeInDuration > 0 && relTime < element.fadeInDuration) {
    fadeAlpha = Math.max(0, Math.min(1, relTime / element.fadeInDuration));
  } else if (
    element.fadeOutDuration &&
    element.fadeOutDuration > 0 &&
    element.duration - relTime < element.fadeOutDuration
  ) {
    fadeAlpha = Math.max(0, Math.min(1, (element.duration - relTime) / element.fadeOutDuration));
  }

  // When selected in the editor, ensure the element is never invisible so the user can always see and edit it
  if (isSelected) {
    fadeAlpha = Math.max(fadeAlpha, 0.7);
  }

  // Draw sprite frame on canvas if animated
  useEffect(() => {
    if (!isAnimated || !canvasRef.current) {
      setSpriteReady(false);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sheetImg = getCachedImage(XP_ASSISTANT_SHEET);
    const totalFrames = 33;
    const frameIndex = Math.max(0, Math.floor((Math.max(0, relTime) * animationSpeed) % totalFrames));

    const drawFrame = () => {
      if (sheetImg.complete && sheetImg.naturalWidth > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(sheetImg, frameIndex * 240, 0, 240, 240, 0, 0, canvas.width, canvas.height);
        setSpriteReady(true);
      }
    };

    if (sheetImg.complete && sheetImg.naturalWidth > 0) {
      drawFrame();
    } else {
      sheetImg.onload = drawFrame;
      sheetImg.onerror = () => setSpriteReady(false);
    }
  }, [isAnimated, relTime, animationSpeed]);

  const poseImgSrc = XP_ASSISTANT_POSE_MAP[pose] || XP_ASSISTANT_POSE_MAP['idle'] || '/assets/xp/assistants/clippy/clippy.png';

  // Typewriter text animation calculation
  const isTypewriter = element.typewriterEffect ?? false;
  const typewriterSpeed = element.typewriterSpeed || 25;
  const fullDialogueText = evalDialogue.dialogueText || '';
  const dialogueChunkTime = Math.max(0, relTime - evalDialogue.activeKeyframeTime);

  let displayedDialogue = fullDialogueText;
  let isTyping = false;

  if (isTypewriter && fullDialogueText) {
    const charsToShow = Math.max(0, Math.floor(dialogueChunkTime * typewriterSpeed + 0.0001));
    if (charsToShow < fullDialogueText.length) {
      displayedDialogue = fullDialogueText.slice(0, charsToShow);
      isTyping = true;
    } else {
      displayedDialogue = fullDialogueText;
      isTyping = false;
    }
  }

  // Styling parameters for Dialogue Bubble
  const bubbleBg = element.bubbleBgColor || '#FFFFE1';
  const bubbleText = element.bubbleTextColor || '#000000';
  const bubbleBorder = element.bubbleBorderColor || '#000000';
  const bubbleFont = element.bubbleFontFamily || 'Tahoma, sans-serif';
  const bubbleFontSize = element.bubbleFontSize || 12;
  const bubbleRadius = element.bubbleCornerRadius ?? 8;
  const bubblePadding = element.bubblePadding ?? 10;
  const bubbleWidthPx = element.bubbleWidth ? `${element.bubbleWidth * 4.5}px` : '220px';

  return (
    <div
      className={`xp-assistant-container ${isSelected ? 'selected' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        opacity: fadeAlpha,
        pointerEvents: 'auto',
      }}
    >
      {/* 1. Assistant Character (Transparent Overlay) */}
      <div
        className="xp-assistant-character"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(2px 4px 5px rgba(0, 0, 0, 0.45))',
          position: 'relative',
        }}
      >
        {/* Static pose image rendered by default - guaranteed to be visible immediately */}
        <img
          src={poseImgSrc}
          alt="Assistant Character"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: (isAnimated && spriteReady) ? 'none' : 'block',
          }}
          onError={(e) => {
            // Robust fallback to base clippy image
            (e.target as HTMLImageElement).src = '/assets/xp/assistants/clippy/clippy.png';
          }}
        />

        {/* Animated canvas overlay active when isAnimated is enabled and sprite sheet is ready */}
        {isAnimated && (
          <canvas
            ref={canvasRef}
            width={240}
            height={240}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: spriteReady ? 'block' : 'none',
              imageRendering: 'pixelated',
            }}
          />
        )}
      </div>

      {/* 2. Authentic Windows XP Dialogue Speech Bubble */}
      {showDialogue && (
        <div
          className="xp-assistant-bubble"
          style={{
            position: 'absolute',
            ...(bubblePos === 'left'
              ? { right: 'calc(100% + 14px)', top: '15%' }
              : bubblePos === 'right'
              ? { left: 'calc(100% + 14px)', top: '15%' }
              : bubblePos === 'top'
              ? { bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)' }
              : bubblePos === 'top-left'
              ? { bottom: 'calc(100% + 16px)', right: '15%' }
              : { bottom: 'calc(100% + 16px)', left: '15%' }),
            width: bubbleWidthPx,
            maxWidth: '320px',
            background: bubbleBg,
            border: `1px solid ${bubbleBorder}`,
            borderRadius: `${bubbleRadius}px`,
            padding: `${bubblePadding}px 14px`,
            boxShadow: '2px 4px 10px rgba(0, 0, 0, 0.3)',
            zIndex: 10,
            cursor: 'default',
          }}
        >
          {/* Dialogue Text Content with Windows XP Tahoma typography */}
          <div
            style={{
              fontFamily: bubbleFont,
              fontSize: `${bubbleFontSize}px`,
              lineHeight: 1.45,
              color: bubbleText,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              userSelect: 'none',
            }}
          >
            {displayedDialogue}
            {isTyping && (
              <span
                style={{
                  display: 'inline-block',
                  width: '5px',
                  height: `${bubbleFontSize}px`,
                  backgroundColor: bubbleText,
                  marginLeft: '2px',
                  verticalAlign: 'middle',
                  animation: 'typewriterBlink 0.6s infinite',
                }}
              />
            )}
          </div>

          {/* SVG Vector Tail / Pointer directed toward the character */}
          {bubblePos === 'left' && (
            <svg
              style={{
                position: 'absolute',
                right: '-12px',
                top: '24px',
                width: '13px',
                height: '16px',
                overflow: 'visible',
              }}
              viewBox="0 0 13 16"
            >
              <polygon points="0,0 13,8 0,16" fill={bubbleBg} />
              <polyline points="0,0 13,8 0,16" fill="none" stroke={bubbleBorder} strokeWidth="1" />
            </svg>
          )}

          {bubblePos === 'right' && (
            <svg
              style={{
                position: 'absolute',
                left: '-12px',
                top: '24px',
                width: '13px',
                height: '16px',
                overflow: 'visible',
              }}
              viewBox="0 0 13 16"
            >
              <polygon points="13,0 0,8 13,16" fill={bubbleBg} />
              <polyline points="13,0 0,8 13,16" fill="none" stroke={bubbleBorder} strokeWidth="1" />
            </svg>
          )}

          {(bubblePos === 'top' || bubblePos === 'top-left' || bubblePos === 'top-right') && (
            <svg
              style={{
                position: 'absolute',
                bottom: '-12px',
                left: bubblePos === 'top' ? 'calc(50% - 8px)' : bubblePos === 'top-left' ? '70%' : '25%',
                width: '16px',
                height: '13px',
                overflow: 'visible',
              }}
              viewBox="0 0 16 13"
            >
              <polygon points="0,0 8,13 16,0" fill={bubbleBg} />
              <polyline points="0,0 8,13 16,0" fill="none" stroke={bubbleBorder} strokeWidth="1" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
};
