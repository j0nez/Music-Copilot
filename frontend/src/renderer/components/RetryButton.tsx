interface Props {
  onClick: () => void;
  label?: string;
  className?: string;
}

export default function RetryButton({ onClick, label = "Retry", className = "" }: Props) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-1 rounded bg-surface-700/60 text-gray-400 hover:text-gray-200 hover:bg-surface-700 transition-colors ${className}`}
    >
      ↻ {label}
    </button>
  );
}
