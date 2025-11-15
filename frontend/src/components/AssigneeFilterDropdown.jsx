import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const AssigneeFilterDropdown = ({
    members = [],
    selected = [],
    onChange,
    includeUnassigned = true,
    placeholder = '全部负责人',
    className = '',
    dropdownWidth = 'w-64',
    multiple = false,
}) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    const normalizedSelected = useMemo(
        () => (selected || []).map(value => value?.toString()).filter(Boolean),
        [selected]
    );

    const normalizedMembers = useMemo(() => {
        return members
            .map(member => ({
                id: member.id?.toString(),
                name: member.username || member.nickname || member.real_name || `用户 ${member.id}`,
            }))
            .filter(member => !!member.id)
            .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
    }, [members]);

    const filteredMembers = useMemo(() => {
        if (!searchTerm.trim()) {
            return normalizedMembers;
        }
        const keyword = searchTerm.trim().toLowerCase();
        return normalizedMembers.filter(member => {
            const name = member.name?.toLowerCase() || '';
            return name.includes(keyword);
        });
    }, [normalizedMembers, searchTerm]);

    const displayLabel = useMemo(() => {
        if (normalizedSelected.length === 0) {
            return placeholder;
        }

        if (normalizedSelected.length === 1) {
            const onlyValue = normalizedSelected[0];
            if (onlyValue === 'unassigned') {
                return '未分配';
            }
            const member = normalizedMembers.find(item => item.id === onlyValue);
            return member ? member.name : placeholder;
        }

        const parts = [];
        if (normalizedSelected.includes('unassigned')) {
            parts.push('未分配');
        }
        const otherCount = normalizedSelected.filter(value => value !== 'unassigned').length;
        if (otherCount > 0) {
            parts.push(`${otherCount} 位负责人`);
        }

        return parts.join(' + ');
    }, [normalizedSelected, normalizedMembers, placeholder]);

    const changeSelection = nextValues => {
        if (typeof onChange === 'function') {
            onChange(nextValues);
        }
    };

    const handleToggle = value => {
        const valueStr = value.toString();
        if (!multiple) {
            changeSelection(valueStr ? [valueStr] : []);
            setOpen(false);
            return;
        }
        const alreadySelected = normalizedSelected.includes(valueStr);
        const nextValues = alreadySelected
            ? normalizedSelected.filter(item => item !== valueStr)
            : [...normalizedSelected, valueStr];
        changeSelection(nextValues);
    };

    const handleUnassignedToggle = () => {
        if (!multiple) {
            changeSelection(['unassigned']);
            setOpen(false);
            return;
        }
        const hasUnassigned = normalizedSelected.includes('unassigned');
        const nextValues = hasUnassigned
            ? normalizedSelected.filter(item => item !== 'unassigned')
            : [...normalizedSelected, 'unassigned'];
        changeSelection(nextValues);
    };

    const handleClear = () => {
        changeSelection([]);
        setSearchTerm('');
        if (!multiple) {
            setOpen(false);
        }
    };

    useEffect(() => {
        if (!open) {
            setSearchTerm('');
            return () => {};
        }

        const handleClickOutside = event => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleEscape = event => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                className={`w-full appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-150 text-left flex items-center justify-between ${open ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
                onClick={() => setOpen(prev => !prev)}
            >
                <span className="truncate text-gray-900">
                    {displayLabel}
                </span>
                <ChevronDown
                    className={`ml-2 h-4 w-4 text-gray-400 transition-transform duration-150 ${open ? 'transform rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    className={`absolute mt-2 right-0 ${dropdownWidth} bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3`}
                >
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                            placeholder="搜索负责人..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-blue-600 hover:text-blue-500 transition-colors duration-150"
                        >
                            清除选择
                        </button>
                        {multiple && (
                            <span>
                                已选 {normalizedSelected.includes('unassigned') ? normalizedSelected.length - 1 : normalizedSelected.length} 人
                            </span>
                        )}
                    </div>

                    <div className="max-h-60 overflow-y-auto pr-1 space-y-1 assignee-scrollbar">
                        {includeUnassigned && (
                            <label
                                className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                            >
                                <input
                                    type={multiple ? 'checkbox' : 'radio'}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    checked={normalizedSelected.includes('unassigned')}
                                    onChange={handleUnassignedToggle}
                                />
                                <span>未分配</span>
                            </label>
                        )}

                        {filteredMembers.length === 0 ? (
                            <div className="text-sm text-gray-400 px-2 py-4 text-center">
                                暂无匹配的负责人
                            </div>
                        ) : (
                            filteredMembers.map(member => (
                                <label
                                    key={member.id}
                                    className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    <input
                                        type={multiple ? 'checkbox' : 'radio'}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        checked={normalizedSelected.includes(member.id)}
                                        onChange={() => handleToggle(member.id)}
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm text-gray-800">{member.name}</div>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssigneeFilterDropdown;

