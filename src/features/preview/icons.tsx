// Schlichte Linien-Icons (24er Raster, 1.75 Strich), damit keine Icon-Bibliothek nötig ist.
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 24, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconToday = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M12 7.5V12l3 2" />
  </Base>
)

export const IconStats = (p: P) => (
  <Base {...p}>
    <path d="M5 19.25V12M10 19.25V5M15 19.25v-9M20 19.25v-4.5" />
  </Base>
)

export const IconBook = (p: P) => (
  <Base {...p}>
    <path d="M4.75 5.5c2.5-1 5-1 7.25.5v13c-2.25-1.5-4.75-1.5-7.25-.5zM19.25 5.5c-2.5-1-5-1-7.25.5v13c2.25-1.5 4.75-1.5 7.25-.5z" />
  </Base>
)

export const IconSettings = (p: P) => (
  <Base {...p}>
    <path d="M4.75 7.5h9.5M18.25 7.5h1M4.75 16.5h1M9.75 16.5h9.5" />
    <circle cx="16.25" cy="7.5" r="2" />
    <circle cx="7.75" cy="16.5" r="2" />
  </Base>
)

export const IconPause = (p: P) => (
  <Base {...p}>
    <path d="M9 6.5v11M15 6.5v11" strokeWidth={2.5} />
  </Base>
)

export const IconPlay = (p: P) => (
  <Base {...p}>
    <path d="M8.5 6.2v11.6a.6.6 0 0 0 .9.5l9.2-5.8a.6.6 0 0 0 0-1L9.4 5.7a.6.6 0 0 0-.9.5z" fill="currentColor" />
  </Base>
)

export const IconPlus = (p: P) => (
  <Base {...p}>
    <path d="M12 6v12M6 12h12" />
  </Base>
)

export const IconChevronDown = (p: P) => (
  <Base {...p}>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Base>
)

export const IconCheck = (p: P) => (
  <Base {...p}>
    <path d="m5.5 12.5 4.25 4.25L18.5 7.5" />
  </Base>
)

export const IconBell = (p: P) => (
  <Base {...p}>
    <path d="M6.5 16.5h11l-1.25-2V10.5a4.25 4.25 0 0 0-8.5 0v4zM10.25 19.25a1.9 1.9 0 0 0 3.5 0" />
  </Base>
)

export const IconFlame = (p: P) => (
  <Base {...p}>
    <path d="M12 20c3.3 0 5.5-2.2 5.5-5.3 0-3.4-2.6-5.4-3.7-8.7-.4 1.9-1.4 3-2.6 3.6.1-2-.6-3.9-2.2-5.6-.3 3.4-4.5 5.5-4.5 10.4C4.5 17.6 7.6 20 12 20z" />
  </Base>
)
