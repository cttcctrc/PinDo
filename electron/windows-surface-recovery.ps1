$source = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class PinDoSurfaceRecovery {
    private const uint RDW_INVALIDATE = 0x0001;
    private const uint RDW_INTERNALPAINT = 0x0002;
    private const uint RDW_NOERASE = 0x0020;
    private const uint RDW_ALLCHILDREN = 0x0080;
    private const uint RDW_UPDATENOW = 0x0100;

    [DllImport("user32.dll")]
    private static extern bool IsWindow(IntPtr handle);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RedrawWindow(IntPtr handle, IntPtr updateRect, IntPtr updateRegion, uint flags);

    public static void Redraw(long value) {
        IntPtr handle = new IntPtr(value);
        if (value == 0 || !IsWindow(handle))
            throw new InvalidOperationException("The PinDo note window no longer exists.");
        uint flags = RDW_INVALIDATE | RDW_INTERNALPAINT | RDW_NOERASE | RDW_ALLCHILDREN | RDW_UPDATENOW;
        if (!RedrawWindow(handle, IntPtr.Zero, IntPtr.Zero, flags))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not redraw the PinDo note surface.");
    }
}
'@

try {
    Add-Type -TypeDefinition $source -ErrorAction Stop
    [Console]::Out.WriteLine("ready")
    [Console]::Out.Flush()
    while (($line = [Console]::In.ReadLine()) -ne $null) {
        $parts = $line.Split("`t", 2)
        if ($parts.Length -ne 2) { continue }
        $requestId = $parts[0]
        try {
            $handle = [long]::Parse($parts[1], [Globalization.CultureInfo]::InvariantCulture)
            [PinDoSurfaceRecovery]::Redraw($handle)
            [Console]::Out.WriteLine("ok`t$requestId")
        } catch {
            $message = $_.Exception.Message.Replace("`r", " ").Replace("`n", " ")
            [Console]::Out.WriteLine("error`t$requestId`t$message")
        }
        [Console]::Out.Flush()
    }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
