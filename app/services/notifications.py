import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import List, Optional
import os

from app.core.config import settings

class NotificationService:
    @staticmethod
    def is_configured() -> bool:
        return bool(
            settings.SMTP_HOST
            and settings.SMTP_PORT
            and settings.SMTP_USER
            and settings.SMTP_PASSWORD
            and settings.EMAILS_FROM_EMAIL
        )

    @staticmethod
    def send_email(
        recipient_email: str,
        subject: str,
        body_html: str,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """
        Sends an email using SMTP settings from core config.
        :param recipient_email: Destination email
        :param subject: Email subject
        :param body_html: HTML content of the email
        :param attachments: List of absolute file paths to attach
        """
        if not NotificationService.is_configured():
            print("SMTP not configured, skipping email.")
            return False

        message = MIMEMultipart()
        message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        message["To"] = recipient_email
        message["Subject"] = subject

        message.attach(MIMEText(body_html, "html"))

        if attachments:
            for file_path in attachments:
                if os.path.exists(file_path):
                    with open(file_path, "rb") as f:
                        part = MIMEApplication(f.read(), Name=os.path.basename(file_path))
                        part['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'
                        message.attach(part)

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(message)
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    @staticmethod
    def notify_mission_completed(mission_id: str, recipient_email: str, report_pdf_path: str):
        """
        Sends a notification email when a mission is completed, attaching the PDF report.
        """
        subject = f"Rapport d'Expertise Ascenseur disponible - Mission {mission_id}"
        body = f"""
        <html>
            <body>
                <h2>Vôtre rapport est prêt</h2>
                <p>Bonjour,</p>
                <p>Le contrôle technique de votre équipement a été finalisé. Vous trouverez le rapport PDF ci-joint.</p>
                <p>Merci de votre confiance.</p>
                <hr/>
                <p><small>Ceci est un message automatique de la plateforme Expertise Ascenseur.</small></p>
            </body>
        </html>
        """
        return NotificationService.send_email(
            recipient_email=recipient_email,
            subject=subject,
            body_html=body,
            attachments=[report_pdf_path]
        )

notification_service = NotificationService()
