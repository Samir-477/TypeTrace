type TypeTraceMarkProps = {
  className?: string;
  size?: number;
};

export function TypeTraceMark({ className, size = 20 }: TypeTraceMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 32 32"
      width={size}
    >
      <path d="M6.5 8.5h19" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      <path d="M16 8.5v9" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      <path d="M5.5 23h5l2.5-4.5 3.2 7 3-10 2.4 7.5h4.9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
      <circle cx="5.5" cy="23" fill="currentColor" r="1.4" />
      <circle cx="26.5" cy="23" fill="currentColor" r="1.4" />
    </svg>
  );
}

