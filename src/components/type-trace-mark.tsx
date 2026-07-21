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
      <path d="M7 16a9 9 0 0 1 18 0" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M10.5 18v-2a5.5 5.5 0 0 1 11 0v2.2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M14 17v5.4c0 2-1 3.4-2.2 4.6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M18 16v5.2c0 3 1.3 4.7 3 5.8" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M7.8 20.2c.1 2.4-.6 4.2-1.8 5.8" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M23.6 21.8H28v-4.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      <circle cx="28" cy="15" fill="currentColor" r="1.5" />
    </svg>
  );
}

