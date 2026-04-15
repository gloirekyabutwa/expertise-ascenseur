import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

class EmailService:
    """
    Dummy Email Service for CTQ SaaS Platform
    In production, hook this to Resend, Sendgrid, or AWS SES.
    """
    
    @staticmethod
    def send_mission_report(
        to_email: str, 
        client_name: str, 
        mission_reference: str, 
        download_url: str,
        cc_emails: Optional[List[str]] = None
    ) -> bool:
        """
        Simulate sending an email with a link to the PDF report.
        """
        logger.info(f"--- START EMAIL SEND ---")
        logger.info(f"To: {to_email}")
        if cc_emails:
            logger.info(f"CC: {', '.join(cc_emails)}")
        
        logger.info(f"Subject: Votre rapport de contrôle {mission_reference} est disponible")
        logger.info(f"Body: ")
        logger.info(f"Bonjour {client_name},")
        logger.info(f"")
        logger.info(f"Le rapport d'intervention pour la mission {mission_reference} a été généré.")
        logger.info(f"Vous pouvez le télécharger ou le consulter en toute sécurité via le lien suivant :")
        logger.info(f"")
        logger.info(f"{download_url}")
        logger.info(f"")
        logger.info(f"Cordialement,")
        logger.info(f"L'équipe SaaS Ascenseurs")
        logger.info(f"--- END EMAIL SEND ---")
        
        # Simulate network latency
        import time
        time.sleep(1)
        
        return True

email_service = EmailService()
