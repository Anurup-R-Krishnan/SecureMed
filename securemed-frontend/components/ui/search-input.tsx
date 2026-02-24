'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchInputProps extends React.ComponentProps<typeof Input> {
    onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
    ({ className, value, onChange, onClear, ...props }, ref) => {
        const hasValue = value && String(value).length > 0;

        return (
            <div className="relative group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    type="text"
                    className={cn(
                        "pl-9 pr-9",
                        className
                    )}
                    ref={ref}
                    value={value}
                    onChange={onChange}
                    {...props}
                />
                {hasValue && onClear && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7 rounded-full hover:bg-muted/50 p-1"
                        onClick={onClear}
                        disabled={props.disabled || props.readOnly}
                    >
                        <X className="h-3 w-3 text-muted-foreground" />
                        <span className="sr-only">Clear search</span>
                    </Button>
                )}
            </div>
        );
    }
);
SearchInput.displayName = 'SearchInput';

export { SearchInput };
