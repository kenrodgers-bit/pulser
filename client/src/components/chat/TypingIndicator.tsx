export const TypingIndicator = () => (
  <div className="ig-message-row">
    <div className="ig-typing-bubble">
      {Array.from({ length: 3 }).map((_, index) => (
        <span key={index} className="ig-typing-dot" />
      ))}
    </div>
  </div>
);
