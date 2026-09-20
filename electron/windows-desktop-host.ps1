param([Parameter(Mandatory = $true)][long]$NoteHandle, [ValidateSet('desktop','top')][string]$Layer='desktop')

$source = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class PinDoDesktopHost {
    private const int GWL_STYLE = -16;
    private const long WS_CHILD = 0x40000000L;
    private const long WS_POPUP = 0x80000000L;
    private const uint SMTO_ABORTIFHUNG = 0x0002;
    private const uint SWP_NOACTIVATE = 0x0010;
    private const uint SWP_FRAMECHANGED = 0x0020;
    private const uint SWP_SHOWWINDOW = 0x0040;

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect { public int Left, Top, Right, Bottom; }
    private delegate bool EnumWindowCallback(IntPtr handle, IntPtr context);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindow(string className, string windowName);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string className, string windowName);
    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowCallback callback, IntPtr context);
    [DllImport("user32.dll")]
    private static extern IntPtr GetParent(IntPtr handle);
    [DllImport("user32.dll")]
    private static extern bool IsWindow(IntPtr handle);
    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr handle, out Rect bounds);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW", SetLastError = true)]
    private static extern IntPtr GetWindowLongPtr(IntPtr handle, int index);
    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)]
    private static extern IntPtr SetWindowLongPtr(IntPtr handle, int index, IntPtr style);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetParent(IntPtr child, IntPtr parent);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(IntPtr handle, IntPtr insertAfter, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SendMessageTimeout(IntPtr handle, uint message, IntPtr wparam, IntPtr lparam, uint flags, uint timeout, out IntPtr result);

    [DllImport("user32.dll")]
    private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    public static void Promote(long value) {
        SetThreadDpiAwarenessContext(new IntPtr(-4));
        IntPtr note = new IntPtr(value);
        Rect rect;
        if (!IsWindow(note) || !GetWindowRect(note,out rect)) throw new InvalidOperationException("Missing note");
        SetParent(note,IntPtr.Zero);
        long style=GetWindowLongPtr(note,GWL_STYLE).ToInt64();
        SetWindowLongPtr(note,GWL_STYLE,new IntPtr((style & ~WS_CHILD) | WS_POPUP));
        if (!SetWindowPos(note,new IntPtr(-1),rect.Left,rect.Top,rect.Right-rect.Left,rect.Bottom-rect.Top,SWP_NOACTIVATE | SWP_FRAMECHANGED))
            throw new Win32Exception(Marshal.GetLastWin32Error());
        Console.WriteLine("desktop-attached");
    }
    public static void Attach(long value) {
        SetThreadDpiAwarenessContext(new IntPtr(-4));
        IntPtr note = new IntPtr(value);
        if (value == 0 || !IsWindow(note)) throw new InvalidOperationException("The PinDo note window no longer exists.");

        IntPtr progman = FindWindow("Progman", null);
        if (progman == IntPtr.Zero) throw new InvalidOperationException("Windows Explorer desktop is unavailable.");
        IntPtr ignored;
        // Requests that Explorer expose its desktop worker, when supported.
        SendMessageTimeout(progman, 0x052C, new IntPtr(0xD), IntPtr.Zero, SMTO_ABORTIFHUNG, 1000, out ignored);
        IntPtr host = IntPtr.Zero;
        EnumWindows(delegate(IntPtr top, IntPtr context) {
            if (FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null) == IntPtr.Zero) return true;
            // The shell view's own parent hosts the desktop icons. A child at HWND_TOP
            // stays above icons in that host, yet behind unrelated application windows.
            host = top;
            return false;
        }, IntPtr.Zero);
        if (host == IntPtr.Zero || !IsWindow(host)) throw new InvalidOperationException("Explorer desktop icon host was not found.");
        Rect noteRect, hostRect;
        if (!GetWindowRect(note, out noteRect) || !GetWindowRect(host, out hostRect))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not read desktop window geometry.");

        IntPtr originalStyle = GetWindowLongPtr(note, GWL_STYLE);
        long style = originalStyle.ToInt64();
        SetWindowLongPtr(note, GWL_STYLE, new IntPtr((style & ~WS_POPUP) | WS_CHILD));
        if (SetParent(note, host) == IntPtr.Zero && GetParent(note) != host) {
            int error = Marshal.GetLastWin32Error();
            SetWindowLongPtr(note, GWL_STYLE, originalStyle);
            throw new Win32Exception(error, "Explorer refused to host the PinDo window (possibly a DPI mode mismatch).");
        }
        if (!SetWindowPos(note, IntPtr.Zero,
                noteRect.Left - hostRect.Left, noteRect.Top - hostRect.Top,
                noteRect.Right - noteRect.Left, noteRect.Bottom - noteRect.Top,
                SWP_NOACTIVATE | SWP_FRAMECHANGED))
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Could not place PinDo on the desktop.");
        Console.WriteLine("desktop-attached");
    }
}
'@

try {
    Add-Type -TypeDefinition $source -ErrorAction Stop
    if($Layer -eq 'top'){[PinDoDesktopHost]::Promote($NoteHandle)}else{[PinDoDesktopHost]::Attach($NoteHandle)}
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
