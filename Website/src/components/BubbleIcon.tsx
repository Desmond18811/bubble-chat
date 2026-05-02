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
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main chat bubble shaped by Favicon style */}
      <g transform="scale(0.38) translate(0, 5)" filter={`url(#${glowId})`}>
        <rect width="100" height="100" rx="24" fill="transparent" />
        <circle cx="30" cy="55" r="18" fill={`url(#${gradId})`} />
        <circle cx="56" cy="40" r="24" fill={`url(#${gradId})`} fillOpacity="0.8" />
        <circle cx="78" cy="58" r="14" fill={`url(#${gradId})`} fillOpacity="0.6" />
      </g>

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
