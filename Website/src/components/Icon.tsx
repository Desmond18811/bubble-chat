import React from "react";

interface IconProps {

    name: string;
    fill?: boolean;
    size?: number;
    style?: React.CSSProperties;
    className?: string;
}

export function Icon({ name, fill = false, size = 24, style = {}, className = "" }: IconProps) {
    return (
        <span
            className={`material-symbols-outlined ${className}`}
            style={{
                fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
                fontSize: size,
                color: 'inherit',
                ...style,
            }}
        >
            {name}
        </span>
    );
}
