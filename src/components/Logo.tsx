import React, { useState } from 'react'
import logoSrc from '../assets/logo.png'

interface LogoProps {
  size?: number
  className?: string
  style?: React.CSSProperties
  glow?: boolean
  rounded?: boolean
}

export default function Logo({
  size = 36,
  className = '',
  style = {},
  glow = true,
  rounded = true
}: LogoProps) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: rounded ? Math.max(8, Math.round(size * 0.22)) : 0,
          background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: Math.round(size * 0.45),
          color: '#05030f',
          boxShadow: glow ? '0 0 16px rgba(251, 191, 36, 0.4)' : undefined,
          flexShrink: 0,
          ...style
        }}
      >
        💎
      </div>
    )
  }

  return (
    <img
      src={logoSrc}
      alt="R.K. Jewellers"
      width={size}
      height={size}
      onError={() => setImgError(true)}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: glow ? 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.45))' : undefined,
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
    />
  )
}
