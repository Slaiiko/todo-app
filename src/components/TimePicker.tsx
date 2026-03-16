import { useEffect, useMemo, useState } from 'react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
    []
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')),
    []
  );

  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');

  useEffect(() => {
    if (!value) {
      setHours('00');
      setMinutes('00');
      return;
    }
    const [h = '00', m = '00'] = value.split(':');
    const safeH = hourOptions.includes(h) ? h : '00';
    const minuteNumber = Number(m);
    const roundedMinute = Number.isFinite(minuteNumber)
      ? Math.round(minuteNumber / 5) * 5
      : 0;
    const safeM = String(Math.min(55, Math.max(0, roundedMinute))).padStart(2, '0');
    setHours(safeH);
    setMinutes(safeM);
  }, [value, hourOptions]);

  const emitTime = (nextHours: string, nextMinutes: string) => {
    onChange(`${nextHours}:${nextMinutes}`);
  };

  return (
    <div className="flex flex-col gap-2 bg-zinc-50 px-4 py-3 rounded-xl border border-zinc-200 min-w-[220px]">
      <span className="text-xs text-zinc-500 font-medium">{label}:</span>

      <div className="flex items-center gap-2">
        <select
          value={hours}
          onChange={(e) => {
            const next = e.target.value;
            setHours(next);
            emitTime(next, minutes);
          }}
          className="flex-1 px-2 py-1.5 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-zinc-700 font-semibold text-sm"
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h} h
            </option>
          ))}
        </select>

        <span className="text-zinc-500 font-semibold">:</span>

        <select
          value={minutes}
          onChange={(e) => {
            const next = e.target.value;
            setMinutes(next);
            emitTime(hours, next);
          }}
          className="flex-1 px-2 py-1.5 bg-white border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 text-zinc-700 font-semibold text-sm"
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </select>
      </div>

    </div>
  );
}



