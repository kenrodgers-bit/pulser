export const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="bubble-other glass-elevated inline-flex items-center gap-2 border border-border px-4 py-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <span
          key={index}
          className="typing-dot h-2.5 w-2.5 rounded-full bg-muted"
        />
      ))}
    </div>
  </div>
);
