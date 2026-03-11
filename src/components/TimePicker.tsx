import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      setHours(h);
      setMinutes(m);
    }
  }, [value]);

  const updateTime = (h: number, m: number) => {
    const newHours = Math.max(0, Math.min(23, h));
    const newMinutes = Math.max(0, Math.min(59, m));
    setHours(newHours);
    setMinutes(newMinutes);
    onChange(`${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
  };

  const incrementHours = () => updateTime(hours + 1, minutes);
  const decrementHours = () => updateTime(hours - 1, minutes);
  const incrementMinutes = () => updateTime(hours, minutes + 15);
  const decrementMinutes = () => updateTime(hours, minutes - 15);

  return (
    <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200">
      <span className="text-xs text-zinc-500 font-medium">{label}:</span>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 font-semibold text-indigo-600 transition-colors cursor-pointer text-sm"
      >
        🕐 {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
      </button>

      {isOpen && (
        <div className="fixed z-50 bg-white border-2 border-indigo-400 rounded-2xl p-6 shadow-2xl w-72" style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          <h3 className="text-lg font-bold text-zinc-800 mb-6 text-center">{label}</h3>

          {/* Time Unit Selector */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <button
                onClick={incrementHours}
                className="mb-3 p-2 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <ChevronUp className="w-6 h-6 text-indigo-600" />
              </button>
              <input
                type="text"
                value={String(hours).padStart(2, '0')}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateTime(val, minutes);
                }}
                onBlur={(e) => {
                  const val = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                  setHours(val);
                  updateTime(val, minutes);
                }}
                className="text-4xl font-bold text-indigo-600 w-20 text-center py-3 bg-indigo-50 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={2}
              />
              <button
                onClick={decrementHours}
                className="mt-3 p-2 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <ChevronDown className="w-6 h-6 text-indigo-600" />
              </button>
              <div className="text-xs text-gray-600 mt-2 font-medium">heures</div>
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <button
                onClick={incrementMinutes}
                className="mb-3 p-2 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <ChevronUp className="w-6 h-6 text-purple-600" />
              </button>
              <input
                type="text"
                value={String(minutes).padStart(2, '0')}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  updateTime(hours, val);
                }}
                onBlur={(e) => {
                  const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                  setMinutes(val);
                  updateTime(hours, val);
                }}
                className="text-4xl font-bold text-purple-600 w-20 text-center py-3 bg-purple-50 rounded-lg border-2 border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={2}
              />
              <button
                onClick={decrementMinutes}
                className="mt-3 p-2 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <ChevronDown className="w-6 h-6 text-purple-600" />
              </button>
              <div className="text-xs text-gray-600 mt-2 font-medium">minutes</div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            ✓ Confirmer
          </button>
        </div>
      )}
    </div>
  );
}

