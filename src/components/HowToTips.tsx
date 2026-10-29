/** How the map works — shown on the neighbourhood password screen. */
export function HowToTips() {
  return (
    <ul className="welcome-steps">
      <li>
        <span aria-hidden="true">🎃</span> כל דלעת במפה היא בית שמחלק ממתקים
      </li>
      <li>
        <span aria-hidden="true">👆</span> לוחצים על הדלעת ← "היינו כאן!" כדי לסמן
      </li>
      <li>
        <span aria-hidden="true">📍</span> "הראו איפה אני" מראה איפה אתם במפה
      </li>
      <li>
        <span aria-hidden="true">🧡</span> יוצאים תמיד עם מבוגר, ונזהרים בכביש
      </li>
    </ul>
  );
}
