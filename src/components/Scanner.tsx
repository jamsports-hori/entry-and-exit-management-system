"use client";

import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { useState } from "react";

interface ScannerProps {
    onScan: (text: string) => void;
}

export function QRScanner({ onScan }: ScannerProps) {
    const [enabled, setEnabled] = useState(true);

    const handleScan = (detectedCodes: IDetectedBarcode[]) => {
        if (detectedCodes.length > 0) {
            const value = detectedCodes[0].rawValue;
            // Prevent rapid double scans - naive debounce
            if (enabled) {
                onScan(value);
                // Optional: pause scanning briefly?
            }
        }
    };

    return (
        <div className="w-full max-w-md mx-auto aspect-square overflow-hidden rounded-2xl shadow-2xl border-4 border-white/10 relative bg-black/50">
            <Scanner
                onScan={handleScan}
                allowMultiple={true} // We handle debounce manually or let it flow
                scanDelay={2000} // Delay between scans in ms
            />

            {/* Overlay UI elements can go here */}
            <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30 rounded-2xl"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-lg animate-pulse"></div>
        </div>
    );
}
