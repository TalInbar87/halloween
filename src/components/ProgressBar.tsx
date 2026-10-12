interface Props {
  visited: number;
  total: number;
}

export function ProgressBar({ visited, total }: Props) {
  if (total === 0) return <div className="progress-empty">עדיין אין בתים במפה</div>;
  const pct = Math.round((visited / total) * 100);
  const done = visited >= total;
  return (
    <div className="progress">
      <div className="progress-label">
        <span>{`${visited} / ${total} בתים`}</span>
        {done && <strong> · סיימתם את כל השכונה!</strong>}
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={visited}
        aria-label="התקדמות"
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
