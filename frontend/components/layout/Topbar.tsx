"use client";

import { useState, useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sun, Moon, User, LogOut, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/context/LanguageContext";
import { Lang } from "@/lib/i18n";

export function Topbar() {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { lang, setLang } = useLanguage();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const initials = (user?.full_name || user?.email || "U")
        .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-card px-6 sticky top-0 z-30">
            <div className="flex-1" />

            <div className="flex items-center gap-2">
                {/* Language Toggle */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" title="Langue / Language">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Langue / Language</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => setLang("fr")}
                            className={lang === "fr" ? "font-semibold text-primary" : ""}
                        >
                            🇫🇷 Français
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setLang("en")}
                            className={lang === "en" ? "font-semibold text-primary" : ""}
                        >
                            🇬🇧 English
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Dark/Light Mode Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md"
                    onClick={toggleTheme}
                    title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
                >
                    {mounted ? (
                        theme === "dark"
                            ? <Sun className="h-4 w-4 text-amber-400" />
                            : <Moon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <div className="h-4 w-4" />
                    )}
                </Button>

                {/* User Menu */}
                <div className="flex items-center gap-2 ml-1">
                    <span className="text-sm font-medium text-foreground hidden sm:block">
                        {user?.full_name || user?.email || "Utilisateur"}
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                                <Avatar className="h-8 w-8 bg-primary/10 border-2 border-primary/20">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium">{user?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                                    {user?.role && (
                                        <p className="text-xs text-primary font-medium capitalize">{user.role}</p>
                                    )}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive gap-2">
                                <LogOut className="h-4 w-4" />
                                {lang === "fr" ? "Se déconnecter" : "Log out"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
