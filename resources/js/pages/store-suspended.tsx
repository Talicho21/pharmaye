import { Head, router, usePage } from "@inertiajs/react";
import { AlertTriangle, LogOut, Mail, Phone } from "lucide-react";
import { useEffect } from "react";

import type { SharedData } from "@/types";

/**
 * Standalone suspension page - rendered outside the app shell.
 * No sidebar, no nav, no links into protected routes.
 *
 * Guard: if the store is NOT suspended and a user somehow lands here,
 * redirect them back to the dashboard.
 */
export default function StoreSuspended() {
    const { auth, store, store_suspended } = usePage<SharedData>().props;

    // If store is no longer suspended (e.g. after admin un-suspends and user
    // refreshes), redirect them back to the dashboard automatically.
    useEffect(() => {
        if (!store_suspended && auth.user) {
            router.replace(route("dashboard"));
        }
    }, [store_suspended, auth.user]);

    const handleLogout = () => router.post(route("logout"));

    const storeName = store?.name ?? "Your Store";

    return (
        <>
            <Head title="Store Suspended" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-off-white px-4 py-16">
                {/* Card */}
                <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-xl">
                    {/* Icon */}
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
                    </div>

                    {/* Heading */}
                    <h1 className="text-center text-2xl font-black tracking-tight text-dark-charcoal">
                        Store Suspended
                    </h1>

                    <p className="mt-3 text-center text-sm leading-relaxed text-gray-500">
                        Access to{" "}
                        <span className="font-semibold text-dark-charcoal">{storeName}</span> has
                        been temporarily suspended. Please contact support to resolve this.
                    </p>

                    {/* Divider */}
                    <div className="my-6 border-t border-gray-100" />

                    {/* Support contact */}
                    <div className="rounded-xl bg-gray-50 px-5 py-4">
                        <p className="mb-3 text-xs font-black tracking-widest text-gray-400 uppercase">
                            Need help?
                        </p>
                        <div className="space-y-2">
                            <a
                                href="mailto:yonatanshitaye@gmail.com"
                                className="flex items-center gap-3 text-sm font-semibold text-primary-blue hover:underline"
                            >
                                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                                yonatanshitaye@gmail.com
                            </a>
                            {store?.phone && (
                                <a
                                    href={`tel:${store.phone}`}
                                    className="flex items-center gap-3 text-sm font-semibold text-primary-blue hover:underline"
                                >
                                    <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    {store.phone}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="my-6 border-t border-gray-100" />

                    {/* Logout */}
                    <button
                        type="button"
                        id="store-suspended-logout"
                        onClick={handleLogout}
                        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary-blue px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-primary-blue/90 hover:shadow-md active:scale-95"
                    >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign out
                    </button>

                    <p className="mt-4 text-center text-xs text-gray-400">
                        Once your account is reinstated, refresh this page to regain access.
                    </p>
                </div>

                {/* Footer branding */}
                <p className="mt-8 text-xs text-gray-400">
                    Pharmaye &mdash; Pharmacy Management System
                </p>
            </div>
        </>
    );
}
