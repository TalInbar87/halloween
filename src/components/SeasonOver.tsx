/** Covers everything once the season is over. There is nothing to close on purpose. */
export function SeasonOver() {
  return (
    <div className="season-over">
      <div className="season-sky" aria-hidden="true">
        <span className="bat bat-1">🦇</span>
        <span className="bat bat-2">🦇</span>
        <span className="bat bat-3">🦇</span>
        <span className="welcome-moon" />
      </div>
      <div className="season-pumpkin" aria-hidden="true">
        🎃
      </div>
      <h1>נתראה בשנה הבאה!</h1>
      <p>תודה לכל השכונה על ערב מתוק 🍬</p>
    </div>
  );
}
