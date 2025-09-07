"use client";
import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Bell, Send } from 'lucide-react';

// --- TYPE DEFINITION ---
interface SellerSettings {
    default_auto_send_invoice: boolean;
    default_payment_reminder: boolean;
    reminder_interval_days: number | '';
}

// --- MAIN SETTINGS COMPONENT ---
export default function SettingsPage() {
    const { userId } = useUserId();
    const { toast } = useToast();

    const [settings, setSettings] = useState<SellerSettings>({
        default_auto_send_invoice: false,
        default_payment_reminder: false,
        reminder_interval_days: 7,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- Data Fetching ---
    const fetchSettings = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("sellers_record")
                .select("default_auto_send_invoice, default_payment_reminder, reminder_interval_days")
                .eq("user_id", userId)
                .single();

            if (error) {
                throw error;
            }

            if (data) {
                setSettings({
                    default_auto_send_invoice: data.default_auto_send_invoice || false,
                    default_payment_reminder: data.default_payment_reminder || false,
                    reminder_interval_days: data.reminder_interval_days || 7,
                });
            }
        } catch (error: any) {
            console.error("Error fetching settings:", error);
            toast({
                title: "Error",
                description: "Could not fetch your current settings.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [userId, toast]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // --- Data Saving ---
    const handleSaveSettings = async () => {
        if (!userId) {
            toast({ title: "Error", description: "User not found.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("sellers_record")
                .update({
                    default_auto_send_invoice: settings.default_auto_send_invoice,
                    default_payment_reminder: settings.default_payment_reminder,
                    reminder_interval_days: settings.reminder_interval_days || 7, // Fallback to 7 if empty
                })
                .eq("user_id", userId);

            if (error) {
                throw error;
            }

            toast({
                title: "Success",
                description: "Your settings have been saved successfully.",
            });
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({
                title: "Error",
                description: "Could not save your settings. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // --- State Handlers ---
    const handleSwitchChange = (field: keyof SellerSettings, checked: boolean) => {
        setSettings(prev => ({ ...prev, [field]: checked }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, reminder_interval_days: e.target.value === '' ? '' : Number(e.target.value) }));
    };

    // --- UI Rendering ---
    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-4 md:p-6 space-y-4">
                     <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
                     <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/3" />
                            <Skeleton className="h-4 w-2/3" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-10 w-1/4" />
                        </CardContent>
                        <CardFooter>
                             <Skeleton className="h-10 w-24" />
                        </CardFooter>
                     </Card>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings size={20}/> Automation Defaults</CardTitle>
                        <CardDescription>
                            Set your default preferences for new invoices. You can always override these settings on a per-invoice basis.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="auto-send" className="text-base font-medium flex items-center gap-2"><Send size={16}/> Auto-Send Invoices</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically email invoices to clients upon creation.
                                </p>
                            </div>
                            <Switch
                                id="auto-send"
                                checked={settings.default_auto_send_invoice}
                                onCheckedChange={(checked) => handleSwitchChange('default_auto_send_invoice', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                             <div className="space-y-0.5">
                                <Label htmlFor="auto-reminder" className="text-base font-medium flex items-center gap-2"><Bell size={16}/> Auto-Set Payment Reminders</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically enable payment reminders for new invoices.
                                </p>
                            </div>
                            <Switch
                                id="auto-reminder"
                                checked={settings.default_payment_reminder}
                                onCheckedChange={(checked) => handleSwitchChange('default_payment_reminder', checked)}
                            />
                        </div>

                        <div className="space-y-2">
                             <Label htmlFor="reminder-interval">Default Reminder Interval (in days)</Label>
                             <Input
                                id="reminder-interval"
                                type="number"
                                value={settings.reminder_interval_days}
                                onChange={handleInputChange}
                                placeholder="e.g., 7"
                                className="max-w-xs"
                             />
                              <p className="text-sm text-muted-foreground">
                                The default number of days between each automated reminder.
                              </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveSettings} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <><Save className="mr-2 h-4 w-4"/> Save Settings</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
