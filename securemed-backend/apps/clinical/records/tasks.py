from celery import shared_task

from .interaction_service import run_report_job
from .models import MedicationInteractionReportJob


@shared_task(bind=True, max_retries=1, default_retry_delay=30)
def generate_interaction_report_job(self, job_id: int):
    if not MedicationInteractionReportJob.objects.filter(pk=job_id).exists():
        return {"job_id": job_id, "status": "missing"}
    job = run_report_job(job_id)
    return {"job_id": job.id, "status": job.status, "report_id": job.report_id}
