type Status = "verified" | "stale" | "uncurated";

const STATUS_LABELS: Record<Status, string> = {
  verified: "verified",
  stale: "stale",
  uncurated: "uncurated",
};

export function StatusMark({
  status,
  label,
  timestamp,
}: {
  status: Status;
  label?: string;
  timestamp?: string;
}) {
  const text = label ?? STATUS_LABELS[status];
  const title = timestamp
    ? `${text} · ${timestamp.slice(0, 10)}`
    : text;
  return (
    <span className="status-mark" data-status={status} title={title}>
      <span className="pulse" />
      {text}
    </span>
  );
}
