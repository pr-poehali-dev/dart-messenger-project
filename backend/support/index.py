import os
import json
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SUPPORT_RECIPIENT = "myamyamyamyau@gmail.com"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def handler(event: dict, context) -> dict:
    """Отправляет письмо поддержки на почту владельца при обращении из чата помощи."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        name = body.get("name", "").strip()
        email = body.get("email", "").strip()
        message = body.get("message", "").strip()

        if not name or not message:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": "Заполните все поля"})}

        sender = os.environ.get("SUPPORT_EMAIL_USER")
        password = os.environ.get("SUPPORT_EMAIL_PASS")

        if not sender or not password:
            return {"statusCode": 500, "headers": CORS, "body": json.dumps({"ok": False, "error": "Email не настроен"})}

        timestamp = datetime.now().strftime("%d.%m.%Y %H:%M")

        msg = MIMEMultipart("alternative")
        msg["From"] = sender
        msg["To"] = SUPPORT_RECIPIENT
        msg["Subject"] = f"[Dart Support] Обращение от {name}"

        text = f"""Новое обращение в поддержку Dart

Имя: {name}
Email: {email or "не указан"}
Время: {timestamp}

Сообщение:
{message}
"""

        html = f"""
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:24px 32px">
    <h2 style="margin:0;font-size:22px;letter-spacing:2px">DART SUPPORT</h2>
    <p style="margin:4px 0 0;opacity:.7;font-size:13px">Новое обращение</p>
  </div>
  <div style="padding:24px 32px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);font-size:12px;text-transform:uppercase;letter-spacing:1px">Имя</td><td style="padding:8px 0;font-weight:600">{name}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);font-size:12px;text-transform:uppercase;letter-spacing:1px">Email</td><td style="padding:8px 0">{email or "не указан"}</td></tr>
      <tr><td style="padding:8px 0;color:rgba(255,255,255,.5);font-size:12px;text-transform:uppercase;letter-spacing:1px">Время</td><td style="padding:8px 0">{timestamp}</td></tr>
    </table>
    <div style="margin-top:20px;padding:16px;background:rgba(255,255,255,.05);border-radius:12px;border-left:3px solid #7c3aed">
      <p style="margin:0 0 8px;color:rgba(255,255,255,.5);font-size:12px;text-transform:uppercase;letter-spacing:1px">Сообщение</p>
      <p style="margin:0;line-height:1.6">{message}</p>
    </div>
  </div>
</div>
"""

        msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP("smtp.gmail.com", 587) as srv:
            srv.ehlo()
            srv.starttls()
            srv.login(sender, password)
            srv.sendmail(sender, SUPPORT_RECIPIENT, msg.as_string())

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    except Exception as e:
        return {"statusCode": 500, "headers": CORS, "body": json.dumps({"ok": False, "error": str(e)})}
