import { Task } from '../types';
import { getAPIUrl } from '../utils/api';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, eachMonthOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, addYears, subYears, addWeeks, subWeeks, startOfYear, endOfYear, parseISO, isWithinInterval, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2, ChevronDown } from 'lucide-react';
import TaskImageThumb from './TaskImageThumb';

type ViewMode = 'year' | 'month' | 'week';

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDateClick: (date: Date) => void;
  onDelete?: (taskId: number) => void;
  onDuplicate?: (taskId: number) => void;
}

export default function CalendarView({ tasks, onEdit, onDateClick, onDelete, onDuplicate }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [expandedSubtaskTaskIds, setExpandedSubtaskTaskIds] = useState<Set<number>>(new Set());
  const [calendarZoom, setCalendarZoom] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('calendarViewZoom') : null;
    const parsed = stored ? parseInt(stored, 10) : 100;
    return Number.isNaN(parsed) ? 100 : Math.max(45, Math.min(115, parsed));
  });
  
  // Use refs to avoid unnecessary re-renders from useEffect dependencies
  const dragStartInfoRef = useRef<{ taskId: number; startY: number; startDate: Date } | null>(null);
  const tasksRef = useRef(tasks);
  const currentMonthRef = useRef(currentMonth);
  const hourLineHeightRef = useRef(80);
  const viewModeRef = useRef(viewMode);
  
  // Load hour height from localStorage, default to 80px
  const [hourLineHeight, setHourLineHeight] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('weekViewHourHeight') : null;
    return stored ? parseInt(stored, 10) : 80;
  });
  const calendarScale = calendarZoom / 100;
  const effectiveHourHeight = Math.max(24, Math.round(hourLineHeight * calendarScale));

  const handleCalendarZoomChange = (delta: number) => {
    const newZoom = Math.max(45, Math.min(115, calendarZoom + delta));
    setCalendarZoom(newZoom);
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarViewZoom', String(newZoom));
    }
  };

  const resetCalendarZoom = () => {
    setCalendarZoom(100);
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarViewZoom', '100');
    }
  };

  // Handle hour height changes and persist to localStorage
  const handleZoomChange = (delta: number) => {
    const newHeight = Math.max(30, Math.min(120, hourLineHeight + delta));
    setHourLineHeight(newHeight);
    hourLineHeightRef.current = newHeight;
    if (typeof window !== 'undefined') {
      localStorage.setItem('weekViewHourHeight', String(newHeight));
    }
  };

  // Synchronize refs with state to avoid useEffect dependency issues
  useEffect(() => {
    tasksRef.current = tasks;
    currentMonthRef.current = currentMonth;
    viewModeRef.current = viewMode;
  }, [tasks, currentMonth, viewMode]);

  // Helper functions for time conversion
  const timeToMinutes = (timeStr: string | null): number | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const pixelsToMinutes = (pixels: number): number => {
    return Math.round((pixels / effectiveHourHeight) * 60);
  };

  // Parse recurrence string (format: "daily|2026-03-20" or "weekly|" or null)
  const parseRecurrence = (recurrenceStr: string | null) => {
    if (!recurrenceStr) return { type: null, endDate: null };
    const [type, endDate] = recurrenceStr.split('|');
    return { type, endDate: endDate && endDate.trim() ? endDate : null };
  };

  // Check if a recurring task appears on a given day
  const isRecurringTaskOnDay = (task: Task, day: Date): boolean => {
    // Support both old "recurrence" format and new "recurrence_type" format
    if (!task.recurrence_type && !task.recurrence) return false;
    if (!task.start_date) return false;

    let type: string | null = null;
    let endDate: string | null = null;

    // New format: recurrence_type and recurrence_end_date
    if (task.recurrence_type) {
      type = task.recurrence_type;
      endDate = task.recurrence_end_date?.split('T')[0] || null;
    } else if (task.recurrence) {
      // Old format: "daily|2026-03-20"
      const { type: t, endDate: e } = parseRecurrence(task.recurrence);
      type = t;
      endDate = e;
    }

    if (!type) return false;

    const startDate = parseISO(task.start_date);

    // Check if day is before start date
    if (day < startDate) return false;

    // Check if day is after end date (if end date exists)
    if (endDate) {
      const recurrenceEndDate = parseISO(endDate);
      recurrenceEndDate.setHours(23, 59, 59, 999);
      if (day > recurrenceEndDate) return false;
    }

    // Check recurrence pattern
    const dayOfWeek = day.getDay();
    const startDayOfWeek = startDate.getDay();

    // Skip weekends for daily/weekly patterns
    if ((type === 'daily' || type === 'weekly') && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }

    switch (type) {
      case 'daily':
        return true;
      case 'weekly':
        return dayOfWeek === startDayOfWeek;
      case 'monthly':
        return day.getDate() === startDate.getDate();
      case 'yearly':
        return day.getMonth() === startDate.getMonth() && day.getDate() === startDate.getDate();
      default:
        return false;
    }
  };

  // Get tasks that appear on a specific day
  const getTasksForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    
    return tasks.filter(t => {
      // Check recurring tasks first
      if (t.recurrence) {
        return isRecurringTaskOnDay(t, day);
      }

      // Single date: only due_date
      if (!t.start_date && t.due_date) {
        const dueDateStr = t.due_date.split('T')[0];
        return dueDateStr === dayStr;
      }
      // Date range: both start_date and due_date
      if (t.start_date && t.due_date) {
        const startStr = t.start_date.split('T')[0];
        const endStr = t.due_date.split('T')[0];
        return dayStr >= startStr && dayStr <= endStr;
      }
      // Only start_date (start but no end)
      if (t.start_date && !t.due_date) {
        const startStr = t.start_date.split('T')[0];
        return startStr === dayStr;
      }
      return false;
    });
  };

  // Get duration info for a task
  const getTaskDuration = (task: Task) => {
    if (!task.start_date || !task.due_date) {
      return null;
    }
    const start = parseISO(task.start_date);
    const end = parseISO(task.due_date);
    const days = differenceInDays(end, start) + 1;
    return days;
  };

  // Get position info for spanning tasks
  const getTaskSpanInfo = (task: Task, currentDay: Date) => {
    if (!task.start_date || !task.due_date) {
      return null;
    }
    const start = parseISO(task.start_date);
    const end = parseISO(task.due_date);
    const totalDays = differenceInDays(end, start) + 1;
    
    const dayIndex = differenceInDays(currentDay, start);
    const isFirst = isSameDay(currentDay, start);
    const isLast = isSameDay(currentDay, end);
    
    return { totalDays, dayIndex, isFirst, isLast };
  };

  const getPriorityColor = (priority: string): string => {
    const colors: { [key: string]: string } = {
      'High': 'bg-red-500',
      'Medium': 'bg-amber-500',
      'Low': 'bg-emerald-500'
    };
    return colors[priority] || 'bg-zinc-400';
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekRowCount = Math.ceil(days.length / 7);
    const monthCellMinHeight = Math.max(58, Math.round(120 * calendarScale));
    const monthTaskListMaxHeight = Math.max(36, Math.round(80 * calendarScale));
    const monthDayBadgeSize = Math.max(24, Math.round(28 * calendarScale));
    const monthDayBadgeFontSize = Math.max(11, Math.round(14 * calendarScale));
    const monthTaskFontSize = Math.max(10, Math.round(12 * calendarScale));

    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div
              key={day}
              className="text-center font-semibold text-zinc-500 uppercase tracking-wider"
              style={{
                paddingTop: `${Math.max(8, Math.round(12 * calendarScale))}px`,
                paddingBottom: `${Math.max(8, Math.round(12 * calendarScale))}px`,
                fontSize: `${Math.max(10, Math.round(12 * calendarScale))}px`
              }}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div
            className="grid grid-cols-7"
            style={{ gridTemplateRows: `repeat(${weekRowCount}, minmax(${monthCellMinHeight}px, 1fr))` }}
          >
          {days.map((day) => {
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()} 
                data-day-cell={format(day, 'yyyy-MM-dd')}
                className={`min-h-[120px] border-b border-r border-zinc-100 p-2 transition-colors relative group ${!isCurrentMonth ? 'bg-zinc-50/50 text-zinc-400' : 'bg-white hover:bg-zinc-50'}`}
                style={{
                  minHeight: `${monthCellMinHeight}px`,
                  padding: `${Math.max(6, Math.round(8 * calendarScale))}px`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`flex items-center justify-center rounded-full font-medium ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-700'}`}
                    style={{
                      width: `${monthDayBadgeSize}px`,
                      height: `${monthDayBadgeSize}px`,
                      fontSize: `${monthDayBadgeFontSize}px`
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                  <button 
                    onClick={() => onDateClick(day)}
                    className="p-1 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div
                  className="space-y-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200"
                  style={{ maxHeight: `${monthTaskListMaxHeight}px` }}
                >
                  {dayTasks.map(task => {
                    const spanInfo = getTaskSpanInfo(task, day);
                    const duration = getTaskDuration(task);
                    
                    const handleMouseDown = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      setDraggedTaskId(task.id);
                      dragStartInfoRef.current = {
                        taskId: task.id,
                        startY: e.clientY,
                        startDate: day
                      };
                    };

                    return (
                      <div 
                        key={task.id}
                        className={`text-xs px-2 py-1 rounded cursor-move transition-colors border relative group/task ${
                          task.is_complete 
                            ? 'bg-zinc-100 text-zinc-500 border-zinc-200 line-through' 
                            : 'bg-white border-zinc-200 hover:border-indigo-300 shadow-sm'
                        } ${spanInfo && spanInfo.isFirst ? 'rounded-l-lg' : spanInfo && spanInfo.isLast ? 'rounded-r-lg' : spanInfo ? 'rounded-none' : ''}`}
                        style={spanInfo && duration ? {
                          gridColumn: spanInfo.isFirst ? 'span 1' : 'auto',
                          position: 'relative',
                          opacity: draggedTaskId === task.id ? 0.5 : 1,
                          fontSize: `${monthTaskFontSize}px`,
                          padding: `${Math.max(3, Math.round(4 * calendarScale))}px ${Math.max(6, Math.round(8 * calendarScale))}px`
                        } : {
                          opacity: draggedTaskId === task.id ? 0.5 : 1,
                          fontSize: `${monthTaskFontSize}px`,
                          padding: `${Math.max(3, Math.round(4 * calendarScale))}px ${Math.max(6, Math.round(8 * calendarScale))}px`
                        }}
                        onMouseEnter={() => setHoveredTaskId(task.id)}
                        onMouseLeave={() => setHoveredTaskId(null)}
                        onMouseDown={handleMouseDown}
                        data-day={format(day, 'yyyy-MM-dd')}
                      >
                        <div className="flex items-center gap-1">
                          <div 
                            className="flex-1 min-w-0 flex items-center gap-1.5"
                            onClick={() => onEdit(task)}
                          >
                            <TaskImageThumb
                              taskId={task.id}
                              imageData={task.image_data}
                              alt={task.title || 'Photo de la tâche'}
                              className="w-4 h-4 rounded object-cover border border-zinc-200 shrink-0"
                            />
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityColor(task.priority)}`} />
                            <span className="truncate">{task.title}</span>
                            {duration && duration > 1 && (
                              <span className="text-xs text-zinc-400 ml-auto shrink-0">
                                {duration}j
                              </span>
                            )}
                          </div>
                          
                          {hoveredTaskId === task.id && !task.is_complete && (
                            <div className="flex gap-1 shrink-0">
                              {onDuplicate && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicate(task.id);
                                  }}
                                  className="p-0.5 text-zinc-600 hover:text-blue-600 transition-colors"
                                  title="Dupliquer"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Supprimer cette tâche ?')) {
                                      onDelete(task.id);
                                    }
                                  }}
                                  className="p-0.5 text-zinc-600 hover:text-red-600 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {spanInfo && spanInfo.isFirst && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-400 opacity-60" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

  // Handle drag-and-drop repositioning with minimal dependencies
  useEffect(() => {
    if (!draggedTaskId) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggedTaskId && dragStartInfoRef.current) {
        const draggedTask = tasksRef.current.find(t => t.id === draggedTaskId);
        if (draggedTask) {
          let targetDay: Date | null = null;
          let relativeY: number | null = null;

          // For week view: find day columns with time positioning
          if (viewModeRef.current === 'week') {
            const weekStart = startOfWeek(currentMonthRef.current, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

            for (let i = 0; i < days.length; i++) {
              const dayElement = document.querySelector(`[data-day="${format(days[i], 'yyyy-MM-dd')}"]`);
              if (dayElement) {
                const rect = dayElement.getBoundingClientRect();
                // Check if mouse is over this day column
                if (e.clientX >= rect.left && e.clientX < rect.right) {
                  targetDay = days[i];
                  // Calculate position relative to top of day container
                  relativeY = e.clientY - rect.top;
                  break;
                }
              }
            }
          } else if (viewModeRef.current === 'month') {
            // For month view: find day cell by scanning all day elements
            const monthStart = startOfMonth(currentMonthRef.current);
            const monthEnd = endOfMonth(monthStart);
            const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
            const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
            const days = eachDayOfInterval({ start: startDate, end: endDate });

            for (let i = 0; i < days.length; i++) {
              const dayElement = document.querySelector(`[data-day-cell="${format(days[i], 'yyyy-MM-dd')}"]`);
              if (dayElement) {
                const rect = dayElement.getBoundingClientRect();
                // Check if mouse is over this day cell
                if (e.clientX >= rect.left && e.clientX < rect.right && e.clientY >= rect.top && e.clientY < rect.bottom) {
                  targetDay = days[i];
                  break;
                }
              }
            }
          }

          if (targetDay) {
            // Check if task was actually moved
            const startDateStr = format(dragStartInfoRef.current.startDate, 'yyyy-MM-dd');
            const targetDateStr = format(targetDay, 'yyyy-MM-dd');
            const verticalDistance = Math.abs(e.clientY - dragStartInfoRef.current.startY);
            
            // Determine what changed
            const dayChanged = startDateStr !== targetDateStr;
            const draggedVertically = verticalDistance > 5;
            const isWeekView = viewModeRef.current === 'week';
            const isMonthView = viewModeRef.current === 'month';

            // For week view: can drag vertically within same day or to different day
            // For month view: only drag to different day (no vertical time positioning)
            if (isWeekView && (dayChanged || draggedVertically) && relativeY !== null && relativeY >= 0) {
              // IMPORTANT: Duration must NEVER change when dragging!
              // Only dates and times can shift if user drags vertically WITHIN same day
              
              // If moving to a different day, keep original times completely unchanged
              if (dayChanged) {
                // Calculate day duration (for multi-day tasks)
                let newDueDate: string;
                if (draggedTask.start_date && draggedTask.due_date) {
                  const oldStartDate = parseISO(draggedTask.start_date);
                  const oldDueDate = parseISO(draggedTask.due_date);
                  const daysDuration = differenceInDays(oldDueDate, oldStartDate);
                  
                  // Add the same number of days to the new start date to maintain multi-day duration
                  const newDueDateObj = new Date(targetDay);
                  newDueDateObj.setDate(newDueDateObj.getDate() + daysDuration);
                  newDueDate = format(newDueDateObj, 'yyyy-MM-dd');
                } else {
                  // Single-day task
                  newDueDate = format(targetDay, 'yyyy-MM-dd');
                }

                const updatedTask = {
                  ...draggedTask,
                  start_date: format(targetDay, 'yyyy-MM-dd'),
                  due_date: newDueDate
                  // Do NOT change start_time and end_time - keep them exactly the same!
                };

                // Save to backend
                fetch(getAPIUrl(`/tasks/${draggedTask.id}`), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedTask)
                }).then(() => {
                  // Notify parent to refetch data
                  window.dispatchEvent(new Event('taskMoved'));
                }).catch(err => {
                  console.error('Failed to update task:', err);
                });
              } else if (draggedVertically) {
                // Only reposition time if dragged within the same day
                const oldStartMinutes = timeToMinutes(draggedTask.start_time) || 0;
                const oldEndMinutes = timeToMinutes(draggedTask.end_time) || oldStartMinutes + 60;
                const duration = oldEndMinutes - oldStartMinutes;

                // Calculate new start position
                let newMinutes = pixelsToMinutes(relativeY);
                
                // Clamp to ensure task doesn't exceed column boundaries
                const maxStartMinutes = Math.max(0, 1440 - duration);
                newMinutes = Math.min(Math.max(newMinutes, 0), maxStartMinutes);
                
                const newStartTime = minutesToTime(newMinutes);
                const newEndMinutes = newMinutes + duration;
                const newEndTime = minutesToTime(newEndMinutes);

                const updatedTask = {
                  ...draggedTask,
                  start_time: newStartTime,
                  end_time: newEndTime
                  // Don't change dates when only repositioning time within same day
                };

                // Save to backend
                fetch(getAPIUrl(`/tasks/${draggedTask.id}`), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedTask)
                }).then(() => {
                  // Notify parent to refetch data
                  window.dispatchEvent(new Event('taskMoved'));
                }).catch(err => {
                  console.error('Failed to update task:', err);
                });
              }
            } else if (isMonthView && dayChanged) {
              // For month view: only handle day changes, no time repositioning
              // Calculate day duration (for multi-day tasks)
              let newDueDate: string;
              if (draggedTask.start_date && draggedTask.due_date) {
                const oldStartDate = parseISO(draggedTask.start_date);
                const oldDueDate = parseISO(draggedTask.due_date);
                const daysDuration = differenceInDays(oldDueDate, oldStartDate);
                
                // Add the same number of days to the new start date to maintain multi-day duration
                const newDueDateObj = new Date(targetDay);
                newDueDateObj.setDate(newDueDateObj.getDate() + daysDuration);
                newDueDate = format(newDueDateObj, 'yyyy-MM-dd');
              } else {
                // Single-day task
                newDueDate = format(targetDay, 'yyyy-MM-dd');
              }

              const updatedTask = {
                ...draggedTask,
                start_date: format(targetDay, 'yyyy-MM-dd'),
                due_date: newDueDate
                // Do NOT change start_time and end_time - keep them exactly the same!
              };

              // Save to backend
              fetch(getAPIUrl(`/tasks/${draggedTask.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTask)
              }).then(() => {
                // Notify parent to refetch data
                window.dispatchEvent(new Event('taskMoved'));
              }).catch(err => {
                console.error('Failed to update task:', err);
              });
            }
          }
        }
      }

      setDraggedTaskId(null);
      setDragPosition(null);
      dragStartInfoRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedTaskId]);

  const renderYearView = () => {
    const yearStart = startOfYear(currentMonth);
    const months = eachMonthOfInterval({ 
      start: yearStart, 
      end: endOfYear(currentMonth) 
    });
    const yearColumns = calendarZoom <= 80 ? 4 : 3;
    const yearCardPadding = Math.max(10, Math.round(16 * calendarScale));
    const yearDayCellHeight = Math.max(20, Math.round(24 * calendarScale));

    return (
      <div className="grid gap-4 p-4 overflow-y-auto" style={{ gridTemplateColumns: `repeat(${yearColumns}, minmax(0, 1fr))` }}>
        {months.map((month) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(monthStart);
          const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
          const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
          const days = eachDayOfInterval({ start: startDate, end: endDate });
          const monthTaskCount = tasks.filter(t => {
            const dayTasks = days.filter(d => {
              if (t.recurrence) return isRecurringTaskOnDay(t, d);
              if (!t.start_date && t.due_date) return isSameDay(parseISO(t.due_date), d);
              if (t.start_date && t.due_date) {
                const start = parseISO(t.start_date);
                const end = parseISO(t.due_date);
                return isWithinInterval(d, { start, end });
              }
              if (t.start_date && !t.due_date) return isSameDay(parseISO(t.start_date), d);
              return false;
            });
            return dayTasks.length > 0;
          }).length;

          return (
            <div 
              key={month.toString()}
              onClick={() => {
                setCurrentMonth(month);
                setViewMode('month');
              }}
              className="bg-white rounded-lg border border-zinc-200 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
              style={{ padding: `${yearCardPadding}px` }}
            >
              <h3 className="font-semibold text-zinc-800 mb-3" style={{ fontSize: `${Math.max(12, Math.round(14 * calendarScale))}px` }}>
                {format(month, 'MMMM', { locale: fr })}
              </h3>
              <div className="grid grid-cols-7 gap-1 mb-3">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(day => (
                  <div key={day} className="text-center font-medium text-zinc-500 flex items-center justify-center" style={{ height: `${yearDayCellHeight}px`, fontSize: `${Math.max(10, Math.round(12 * calendarScale))}px` }}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const isToday = isSameDay(day, new Date());
                  const dayTasks = getTasksForDay(day);

                  return (
                    <div 
                      key={day.toString()}
                      className={`flex items-center justify-center rounded font-medium ${
                        !isCurrentMonth ? 'text-zinc-300' :
                        isToday ? 'bg-indigo-600 text-white' :
                        dayTasks.length > 0 ? 'bg-indigo-100 text-indigo-700' :
                        'text-zinc-700 hover:bg-zinc-100'
                      }`}
                      style={{ height: `${yearDayCellHeight}px`, fontSize: `${Math.max(10, Math.round(12 * calendarScale))}px` }}
                    >
                      {format(day, 'd')}
                    </div>
                  );
                })}
              </div>
              {monthTaskCount > 0 && (
                <div className="mt-3 text-xs text-zinc-500 text-center">
                  {monthTaskCount} tâche{monthTaskCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const HOUR_HEIGHT = effectiveHourHeight;

    const timeToMinutes = (timeStr: string | null): number | null => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const getTaskPosition = (task: Task, day: Date) => {
      if (!task.start_time) return null;
      
      const startMinutes = timeToMinutes(task.start_time);
      const endMinutes = task.end_time ? timeToMinutes(task.end_time) : startMinutes! + 60;
      
      if (startMinutes === null || endMinutes === null) return null;

      // Multi-day tasks use the same daily slot on each included day
      // (ex: 09:00-18:00 every day), instead of a continuous overnight block.
      const topPx = (startMinutes / 60) * HOUR_HEIGHT;
      const rawDuration = endMinutes - startMinutes;
      const durationMinutes = rawDuration > 0 ? rawDuration : 60;
      const heightPx = (durationMinutes / 60) * HOUR_HEIGHT;
      
      return { topPx, heightPx, durationMinutes, startMinutes, endMinutes };
    };

    // Calculate overlapping task columns for proper layout in week view
    const getTaskColumnInfo = (task: Task, day: Date) => {
      const timedTasks = getTimedTasks(day);
      if (!task.start_time || timedTasks.length <= 1) return { colIndex: 0, colTotal: 1 };
      
      const position = getTaskPosition(task, day);
      if (!position) return { colIndex: 0, colTotal: 1 };
      
      // Find all tasks that overlap with this task
      const overlappingTasks: Task[] = [];
      for (const other of timedTasks) {
        const otherPos = getTaskPosition(other, day);
        if (!otherPos) continue;
        
        // Check if time ranges overlap
        const thisStart = position.startMinutes;
        const thisEnd = position.endMinutes;
        const otherStart = otherPos.startMinutes;
        const otherEnd = otherPos.endMinutes;
        
        if (thisStart < otherEnd && thisEnd > otherStart) {
          overlappingTasks.push(other);
        }
      }
      
      // Sort overlapping tasks by start time then by ID for consistency
      overlappingTasks.sort((a, b) => {
        const aPos = getTaskPosition(a, day)!;
        const bPos = getTaskPosition(b, day)!;
        return aPos.startMinutes - bPos.startMinutes || a.id - b.id;
      });
      
      const colIndex = overlappingTasks.findIndex(t => t.id === task.id);
      return { colIndex: Math.max(0, colIndex), colTotal: overlappingTasks.length };
    };

    // Get tasks without start_time (all-day tasks)
    const getAllDayTasks = (day: Date) => {
      return getTasksForDay(day).filter(t => !t.start_time);
    };

    // Get tasks with start_time (timed tasks)
    const getTimedTasks = (day: Date) => {
      return getTasksForDay(day).filter(t => t.start_time);
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col overflow-hidden h-full">
        {/* Header with day names and dates */}
        <div 
          className="grid border-b border-zinc-200 bg-zinc-50 flex-shrink-0"
          style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}
        >
          <div className="border-r border-zinc-200 flex items-center justify-center font-semibold text-zinc-500" style={{ padding: `${Math.max(6, Math.round(8 * calendarScale))}px`, fontSize: `${Math.max(10, Math.round(12 * calendarScale))}px` }}>
            Heure
          </div>
          {days.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div 
                key={day.toString()} 
                className={`flex-1 text-center border-r border-zinc-200 last:border-r-0 ${isToday ? 'bg-indigo-50' : ''}`}
                style={{ padding: `${Math.max(8, Math.round(12 * calendarScale))}px ${Math.max(6, Math.round(8 * calendarScale))}px` }}
              >
                <div className="font-semibold text-zinc-500 uppercase" style={{ fontSize: `${Math.max(10, Math.round(12 * calendarScale))}px` }}>
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div
                  className={`font-bold mt-1 ${isToday ? 'text-indigo-600 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto' : 'text-zinc-800'}`}
                  style={isToday
                    ? {
                        width: `${Math.max(28, Math.round(32 * calendarScale))}px`,
                        height: `${Math.max(28, Math.round(32 * calendarScale))}px`,
                        fontSize: `${Math.max(14, Math.round(18 * calendarScale))}px`
                      }
                    : {
                        fontSize: `${Math.max(14, Math.round(18 * calendarScale))}px`
                      }}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day tasks section */}
        <div 
          className="grid border-b border-zinc-200 bg-zinc-50/50 flex-shrink-0"
          style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr' }}
        >
          <div className="border-r border-zinc-200 p-1 flex items-center justify-center text-xs font-semibold text-zinc-400">
            Jour
          </div>
          {days.map((day) => (
            <div 
              key={`allday-${day.toString()}`}
              className="border-r border-zinc-200 last:border-r-0 p-1 min-h-12 relative group"
            >
              {getAllDayTasks(day).map((task) => (
                <div
                  key={task.id}
                  className={`text-xs p-1 mb-1 rounded cursor-pointer border flex items-center gap-1 group/alltask ${
                    task.is_complete 
                      ? 'bg-zinc-100 text-zinc-500 border-zinc-300 line-through' 
                      : 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300 hover:border-amber-500 hover:shadow-md'
                  }`}
                  title={task.title}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                >
                  <TaskImageThumb
                    taskId={task.id}
                    imageData={task.image_data}
                    alt={task.title || 'Photo de la tâche'}
                    className="w-4 h-4 rounded object-cover border border-zinc-200 shrink-0"
                  />
                  <span 
                    className="flex-1 min-w-0 truncate"
                    onClick={() => onEdit(task)}
                  >
                    {task.title}
                  </span>
                  {hoveredTaskId === task.id && !task.is_complete && (
                    <div className="flex gap-1 shrink-0">
                      {onDuplicate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(task.id);
                          }}
                          className="p-0.5 text-zinc-600 hover:text-blue-600 transition-colors"
                          title="Dupliquer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Supprimer cette tâche ?')) {
                              onDelete(task.id);
                            }
                          }}
                          className="p-0.5 text-zinc-600 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Timeline with hours */}
        <div className="flex-1 overflow-y-auto">
          <div 
            className="grid"
            style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr', minHeight: `${24 * HOUR_HEIGHT}px` }}
          >
            {/* Hours column */}
            <div className="border-r border-zinc-200 bg-zinc-50 sticky left-0 z-10">
              {hours.map((hour) => (
                <div 
                  key={hour}
                  className="border-b border-zinc-200 flex items-start justify-end pr-2 pt-1 text-xs font-medium text-zinc-500"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Days with tasks */}
            {days.map((day) => {
              return (
              <div 
                key={day.toString()} 
                data-day={format(day, 'yyyy-MM-dd')}
                className="border-r border-zinc-200 last:border-r-0 relative group hover:bg-indigo-50/10"
                style={{ position: 'relative' }}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div 
                    key={hour}
                    className="border-b border-zinc-100 hover:bg-indigo-50/20 transition-colors relative"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Tasks (absolutely positioned over grid) */}
                {getTimedTasks(day).map((task) => {
                  const position = getTaskPosition(task, day);
                  if (!position) return null;

                  const colInfo = getTaskColumnInfo(task, day);
                  const colWidth = 100 / colInfo.colTotal;
                  const leftPercent = colInfo.colIndex * colWidth;

                  const handleMouseDown = (e: React.MouseEvent) => {
                    setDraggedTaskId(task.id);
                    dragStartInfoRef.current = {
                      taskId: task.id,
                      startY: e.clientY,
                      startDate: day
                    };
                  };

                  return (
                    <div
                      key={task.id}
                      onMouseEnter={() => setHoveredTaskId(task.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      onMouseDown={handleMouseDown}
                      className={`absolute rounded cursor-move transition-colors border overflow-hidden ${
                        task.is_complete 
                          ? 'bg-zinc-100 text-zinc-500 border-zinc-300 line-through opacity-60' 
                          : 'bg-gradient-to-r from-indigo-100 to-purple-100 border-indigo-300 hover:border-indigo-500 hover:shadow-md'
                      }`}
                      style={{
                        top: `${position.topPx}px`,
                        height: `${Math.max(position.heightPx, 20)}px`,
                        left: `${leftPercent}%`,
                        width: `${colWidth}%`,
                        opacity: draggedTaskId === task.id ? 0.5 : 1,
                        zIndex: draggedTaskId === task.id ? 50 : 10
                      }}
                    >
                      <div className="p-1 text-xs font-medium flex flex-col h-full overflow-hidden">
                        {/* Title section with subtasks toggle */}
                        <div className="flex-1 min-w-0">
                          <div 
                            className="flex items-center gap-1 cursor-pointer group/title"
                            onClick={() => onEdit(task)}
                          >
                            <TaskImageThumb
                              taskId={task.id}
                              imageData={task.image_data}
                              alt={task.title || 'Photo de la tâche'}
                              className="w-4 h-4 rounded object-cover border border-zinc-200 shrink-0"
                            />
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityColor(task.priority)}`} />
                            {task.subtasks && task.subtasks.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newExpanded = new Set(expandedSubtaskTaskIds);
                                  if (newExpanded.has(task.id)) {
                                    newExpanded.delete(task.id);
                                  } else {
                                    newExpanded.add(task.id);
                                  }
                                  setExpandedSubtaskTaskIds(newExpanded);
                                }}
                                className="p-0 text-zinc-600 hover:text-zinc-800 transition-colors shrink-0"
                                title={expandedSubtaskTaskIds.has(task.id) ? "Masquer sous-tâches" : "Voir sous-tâches"}
                              >
                                <ChevronDown 
                                  className={`w-3 h-3 transition-transform ${expandedSubtaskTaskIds.has(task.id) ? 'rotate-180' : ''}`}
                                />
                              </button>
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                          {task.start_time && task.end_time && position.heightPx > 40 && (
                            <div className="text-xs text-zinc-700 mt-0.5 truncate">
                              {`${task.start_time} - ${task.end_time}`}
                            </div>
                          )}
                          
                          {/* Subtasks list */}
                          {expandedSubtaskTaskIds.has(task.id) && task.subtasks && task.subtasks.length > 0 && position.heightPx > 60 && (
                            <div className="mt-1 pt-1 border-t border-zinc-300 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                              {task.subtasks.map((subtask) => (
                                <div 
                                  key={subtask.id}
                                  className={`px-1 py-0.5 rounded bg-white/40 truncate ${subtask.is_complete ? 'line-through opacity-60 text-zinc-500' : 'text-zinc-700'}`}
                                  title={subtask.title}
                                >
                                  <span className="inline-block mr-1">
                                    {subtask.is_complete ? '✓' : '○'}
                                  </span>
                                  {subtask.title}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Action buttons at bottom */}
                        {hoveredTaskId === task.id && !task.is_complete && (
                          <div className="flex gap-1 shrink-0 mt-auto">
                            {onDuplicate && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicate(task.id);
                                }}
                                className="p-1 text-zinc-600 bg-white/80 hover:bg-blue-100 hover:text-blue-600 rounded transition-all"
                                title="Dupliquer"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Supprimer cette tâche ?')) {
                                    onDelete(task.id);
                                  }
                                }}
                                className="p-1 text-zinc-600 bg-white/80 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add button */}
                <button 
                  onClick={() => onDateClick(day)}
                  className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/50">
        <h2 className="text-xl font-semibold text-zinc-800 capitalize">
          {viewMode === 'year' 
            ? format(currentMonth, 'yyyy', { locale: fr })
            : viewMode === 'month'
            ? format(currentMonth, 'MMMM yyyy', { locale: fr })
            : format(startOfWeek(currentMonth, { weekStartsOn: 1 }), 'd MMMM', { locale: fr }) + ' - ' + format(endOfWeek(currentMonth, { weekStartsOn: 1 }), 'd MMMM yyyy', { locale: fr })
          }
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-zinc-200 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'year' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-700 hover:bg-white'}`}
            >
              Année
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'month' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-700 hover:bg-white'}`}
            >
              Mois
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${viewMode === 'week' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-700 hover:bg-white'}`}
            >
              Semaine
            </button>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-1.5 bg-zinc-100 rounded-lg border border-zinc-200">
            <span className="text-xs font-medium text-zinc-600">Zoom:</span>
            <button
              onClick={() => handleCalendarZoomChange(-10)}
              className="px-1 py-0.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 rounded transition-colors"
              title="Dézoomer le calendrier"
            >
              −
            </button>
            <span className="text-xs font-mono text-zinc-500 w-10 text-center">{calendarZoom}%</span>
            <button
              onClick={() => handleCalendarZoomChange(10)}
              className="px-1 py-0.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 rounded transition-colors"
              title="Zoomer le calendrier"
            >
              +
            </button>
            <button
              onClick={resetCalendarZoom}
              className="px-1 py-0.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              title="Réinitialiser le zoom du calendrier"
            >
              Réinit
            </button>
          </div>
          {viewMode === 'week' && (
            <div className="flex items-center gap-1 px-1.5 py-1.5 bg-zinc-100 rounded-lg border border-zinc-200">
              <span className="text-xs font-medium text-zinc-600">Zoom h:</span>
              <button
                onClick={() => handleZoomChange(-10)}
                className="px-1 py-0.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 rounded transition-colors"
                title="Réduire (−)"
              >
                −
              </button>
              <span className="text-xs font-mono text-zinc-500 w-12 text-center">{effectiveHourHeight}px</span>
              <button
                onClick={() => handleZoomChange(10)}
                className="px-1 py-0.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 rounded transition-colors"
                title="Agrandir (+)"
              >
                +
              </button>
              <button
                onClick={() => handleZoomChange(-hourLineHeight + 80)}
                className="px-1 py-0.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                title="Réinitialiser (défaut)"
              >
                Réinit
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (viewMode === 'year') setCurrentMonth(subYears(currentMonth, 1));
                else if (viewMode === 'week') setCurrentMonth(subWeeks(currentMonth, 1));
                else setCurrentMonth(subMonths(currentMonth, 1));
              }}
              className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())} 
              className="px-4 py-1.5 text-sm font-medium hover:bg-zinc-200 rounded-lg transition-colors text-zinc-700"
            >
              {viewMode === 'year' ? 'Cette année' : viewMode === 'week' ? 'Cette semaine' : "Aujourd'hui"}
            </button>
            <button 
              onClick={() => {
                if (viewMode === 'year') setCurrentMonth(addYears(currentMonth, 1));
                else if (viewMode === 'week') setCurrentMonth(addWeeks(currentMonth, 1));
                else setCurrentMonth(addMonths(currentMonth, 1));
              }}
              className="p-2 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'year' && renderYearView()}
          {viewMode === 'week' && renderWeekView()}
        </div>
      </div>

      {/* Ghost sprite for drag-to-duplicate */}
      {draggedTaskId && dragPosition && (
        <div
          className="fixed pointer-events-none opacity-40 bg-indigo-400 rounded border-2 border-indigo-500 p-2 text-xs font-medium text-white shadow-lg z-[9999]"
          style={{
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
            transform: 'translate(-50%, -50%)',
            maxWidth: '200px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {tasks.find(t => t.id === draggedTaskId)?.title || 'Tâche'}
        </div>
      )}
    </div>
  );
}


