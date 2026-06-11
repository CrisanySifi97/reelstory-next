'use client'
import { useState } from 'react'

interface StarRatingProps {
  value: number
  max?: number
  size?: number
  readOnly?: boolean
  showValue?: boolean
  onChange?: (n: number) => void
}

export default function StarRating({
  value, max = 5, size = 20, readOnly = false, showValue = true, onChange,
}: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'.25rem' }}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1
        const filled = n <= active
        return (
          <svg
            key={n}
            width={size} height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#FFD93D' : 'none'}
            stroke={filled ? '#FFD93D' : 'rgba(255,255,255,.25)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              cursor: readOnly ? 'default' : 'pointer',
              transition: 'fill .12s, stroke .12s',
              flexShrink: 0,
            }}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onChange?.(n)}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        )
      })}
      {showValue && value > 0 && (
        <span style={{ fontSize:'.85rem', color:'var(--rs-accent)', fontWeight:700, marginLeft:'.3rem', fontFamily:'var(--rs-font-display)' }}>
          {value % 1 === 0 ? value.toFixed(1) : value.toFixed(1)}
        </span>
      )}
    </div>
  )
}
