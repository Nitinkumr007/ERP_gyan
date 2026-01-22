
import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
    selectedDate: Date;
    onChange: (date: Date) => void;
    onClose: () => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onChange, onClose }) => {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onChange(newDate);
        onClose();
    };

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected =
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

            const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

            days.push(
                <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-8 w-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${isSelected
                            ? 'bg-gold-400 text-forest-950 shadow-lg'
                            : isToday
                                ? 'border border-gold-400 text-gold-400'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    {day}
                </button>
            );
        }
        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div ref={containerRef} className="absolute top-12 right-0 bg-forest-900 border border-white/10 rounded-xl shadow-2xl p-4 w-72 z-50 backdrop-blur-xl animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrevMonth} className="p-1 hover:text-gold-400 text-gray-400 transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <div className="text-sm font-bold text-white tracking-wide">
                    {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                </div>
                <button onClick={handleNextMonth} className="p-1 hover:text-gold-400 text-gray-400 transition-colors">
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="h-8 w-8 flex items-center justify-center text-[10px] font-bold text-gray-500">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
                {renderCalendar()}
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex justify-center">
                <button
                    onClick={() => { onChange(new Date()); onClose(); }}
                    className="text-[10px] font-bold text-gold-400 uppercase tracking-widest hover:text-gold-300"
                >
                    Jump to Today
                </button>
            </div>
        </div>
    );
};

export default DatePicker;
