"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, onCheckedChange, onChange, ...props }, ref) => (
        <label className={cn(
            "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 has-[:checked]:bg-primary bg-input",
            className
        )}>
            <input
                type="checkbox"
                className="sr-only peer"
                ref={ref}
                onChange={(e) => {
                    onChange?.(e);
                    onCheckedChange?.(e.target.checked);
                }}
                {...props}
            />
            <span
                className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform peer-checked:translate-x-5 translate-x-0"
                )}
            />
        </label>
    ))
Switch.displayName = "Switch"

export { Switch }
