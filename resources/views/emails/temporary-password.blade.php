<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Temporary Password</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 0;
            color: #1a1a2e;
        }
        .wrapper {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .header {
            background-color: #1a56db;
            padding: 28px 32px;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .body {
            padding: 32px;
        }
        .body p {
            margin: 0 0 16px;
            line-height: 1.6;
            font-size: 15px;
            color: #374151;
        }
        .password-box {
            background-color: #f0f4ff;
            border: 1px solid #c7d7fd;
            border-radius: 6px;
            padding: 16px 20px;
            margin: 24px 0;
            text-align: center;
        }
        .password-box .label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 8px;
        }
        .password-box .password {
            font-family: 'Courier New', Courier, monospace;
            font-size: 22px;
            font-weight: 700;
            color: #1a56db;
            letter-spacing: 2px;
        }
        .warning {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 14px;
            color: #92400e;
            margin-top: 8px;
        }
        .footer {
            padding: 20px 32px;
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>PharmaYe — Temporary Password</h1>
        </div>

        <div class="body">
            <p>Hello, <strong>{{ $user->name }}</strong>,</p>

            <p>
                An administrator has reset your password for the account associated with
                <strong>{{ $user->email }}</strong>.
            </p>

            <p>Use the temporary password below to log in:</p>

            <div class="password-box">
                <div class="label">Temporary Password</div>
                <div class="password">{{ $temporaryPassword }}</div>
            </div>

            <div class="warning">
                ⚠️ You will be required to set a new password immediately after logging in.
                This temporary password cannot be used again once you have changed it.
            </div>

            <p style="margin-top: 24px;">
                If you did not expect this email, please contact your system administrator
                immediately.
            </p>
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} PharmaYe. This is an automated message, please do not reply.
        </div>
    </div>
</body>
</html>
