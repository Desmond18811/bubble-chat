import React from 'react';

interface BubbleIconProps extends React.SVGProps<SVGSVGElement> {
  primaryColor?: string;
  secondaryColor?: string;
}

const BubbleIcon: React.FC<BubbleIconProps> = ({
  primaryColor = 'var(--th-accent)',
  secondaryColor = 'var(--th-secondary)',
  ...props
}) => {
  return (
    <svg
      width="150"
      height="39"
      viewBox="0 0 150 39"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="2" y="4" width="24" height="24" rx="8" fill={primaryColor} />
      <path d="M26 28 L32 32 L26 20" fill={primaryColor} />
      <text x="38" y="24" fill={secondaryColor} fontFamily="'Space Grotesk', sans-serif" fontWeight="bold" fontSize="18" letterSpacing="1">BUBBLE</text>
    </svg>
  );
};

export default BubbleIcon;
