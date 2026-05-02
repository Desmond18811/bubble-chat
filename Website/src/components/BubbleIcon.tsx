import React, { useId } from 'react';

interface BubbleIconProps extends React.SVGProps<SVGSVGElement> {
  primaryColor?: string;
  secondaryColor?: string;
}

const BubbleIcon: React.FC<BubbleIconProps> = ({
  primaryColor = 'var(--th-accent)',
  secondaryColor = 'var(--th-secondary)',
  ...props
}) => {
  // Unique IDs per instance prevent multiple BubbleIcons from sharing gradient definitions
  const uid = useId().replace(/:/g, '');
  const gradId = `bubbleGrad-${uid}`;
  const glowId = `bubbleGlow-${uid}`;

  return (
    <svg
      width="150"
      height="44"
      viewBox="0 0 150 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
          <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.9" />
        </linearGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main chat bubble body */}
      <rect
        x="2" y="3"
        width="30" height="27"
        rx="10"
        fill={`url(#${gradId})`}
        filter={`url(#${glowId})`}
      />

      {/* Bubble tail */}
      <path
        d="M8 30 L4 38 L18 30"
        fill={`url(#${gradId})`}
      />

      {/* Inner dots */}
      <circle cx="11" cy="16" r="2.5" fill="white" fillOpacity="0.9" />
      <circle cx="17" cy="16" r="2.5" fill="white" fillOpacity="0.9" />
      <circle cx="23" cy="16" r="2.5" fill="white" fillOpacity="0.9" />

      {/* Brand text */}
      <text
        x="40"
        y="26"
        fill={secondaryColor}
        fontFamily="'Space Grotesk', sans-serif"
        fontWeight="800"
        fontSize="17"
        letterSpacing="2"
      >
        BUBBLE
      </text>
    </svg>
  );
};

export default BubbleIcon;
