from django.core.management.base import BaseCommand

from apps.clinical.telemedicine.models import (
    AnatomyRegionExplainer,
    ConditionCatalog,
    ConditionPin,
)


REGION_EXPLAINERS = [
    {
        'region_id': 'head',
        'title': 'Head and Neurologic Symptoms',
        'summary': 'Head symptoms can range from benign tension headaches to urgent neurologic conditions.',
        'details': [
            'Track timing, triggers, and progression of headache, dizziness, or vision changes.',
            'New severe headache, focal weakness, or confusion needs urgent evaluation.',
        ],
        'common_symptoms': ['headache', 'dizziness', 'blurred vision', 'light sensitivity'],
        'warning_signals': ['sudden worst headache', 'new weakness', 'slurred speech', 'fainting'],
        'related_condition_ids': ['migraine', 'sinusitis', 'stroke_warning'],
    },
    {
        'region_id': 'throat',
        'title': 'Throat and Airway Symptoms',
        'summary': 'Throat discomfort is often infectious or reflux-related, but airway symptoms are high priority.',
        'details': [
            'Pain with swallowing and fever commonly suggests pharyngitis or tonsillitis.',
            'Noisy breathing, drooling, or inability to swallow saliva is an emergency sign.',
        ],
        'common_symptoms': ['sore throat', 'hoarseness', 'painful swallowing', 'cough'],
        'warning_signals': ['trouble breathing', 'drooling', 'voice muffling', 'neck swelling'],
        'related_condition_ids': ['pharyngitis', 'laryngitis', 'tonsillitis'],
    },
    {
        'region_id': 'chest',
        'title': 'Chest and Cardiopulmonary Symptoms',
        'summary': 'Chest symptoms should be risk-stratified quickly to avoid missing cardiac or pulmonary emergencies.',
        'details': [
            'Pressure-like pain with exertion may be ischemic and needs immediate workup.',
            'Pleuritic pain with shortness of breath can suggest pulmonary pathology.',
        ],
        'common_symptoms': ['chest pain', 'shortness of breath', 'palpitations', 'cough'],
        'warning_signals': ['crushing chest pain', 'severe breathlessness', 'fainting', 'blue lips'],
        'related_condition_ids': ['angina', 'pneumonia', 'asthma_exacerbation'],
    },
    {
        'region_id': 'abdomen',
        'title': 'Abdominal and Digestive Symptoms',
        'summary': 'Abdominal pain patterns and associated symptoms help separate mild disease from urgent pathology.',
        'details': [
            'Location, migration, fever, vomiting, and stool changes are key triage details.',
            'Persistent vomiting, GI bleeding, or peritoneal signs needs urgent care.',
        ],
        'common_symptoms': ['abdominal pain', 'nausea', 'vomiting', 'bloating'],
        'warning_signals': ['blood in vomit', 'black stool', 'severe localized pain', 'persistent fever'],
        'related_condition_ids': ['gastroenteritis', 'gastritis', 'appendicitis_warning'],
    },
    {
        'region_id': 'left_arm',
        'title': 'Left Arm Musculoskeletal and Neurovascular Symptoms',
        'summary': 'Arm pain can be local musculoskeletal disease, referred pain, or neurologic pathology.',
        'details': [
            'Acute trauma with deformity suggests fracture/dislocation and requires imaging.',
            'Arm pain with chest pressure can represent referred cardiac pain.',
        ],
        'common_symptoms': ['arm pain', 'numbness', 'weakness', 'joint stiffness'],
        'warning_signals': ['cold pale limb', 'progressive weakness', 'pain with chest pressure'],
        'related_condition_ids': ['cervical_radiculopathy', 'rotator_cuff_tendinopathy', 'angina'],
    },
    {
        'region_id': 'right_arm',
        'title': 'Right Arm Musculoskeletal and Neurovascular Symptoms',
        'summary': 'Most right arm symptoms are orthopedic or nerve-related but still require neurologic screening.',
        'details': [
            'Overuse and tendon injuries often worsen with repetitive motion.',
            'New numbness with neck pain can indicate cervical nerve root irritation.',
        ],
        'common_symptoms': ['arm pain', 'numbness', 'weak grip', 'tingling'],
        'warning_signals': ['sudden weakness', 'major swelling', 'loss of hand function'],
        'related_condition_ids': ['cervical_radiculopathy', 'carpal_tunnel', 'rotator_cuff_tendinopathy'],
    },
    {
        'region_id': 'pelvis',
        'title': 'Pelvic and Urogenital Symptoms',
        'summary': 'Pelvic symptoms can involve urinary, reproductive, gastrointestinal, and musculoskeletal systems.',
        'details': [
            'Dysuria, frequency, and suprapubic discomfort commonly suggest urinary tract infection.',
            'Severe pelvic pain with fever or pregnancy concern needs urgent assessment.',
        ],
        'common_symptoms': ['pelvic pain', 'urinary burning', 'urgency', 'lower pressure'],
        'warning_signals': ['pregnancy with pain', 'fever with pelvic pain', 'urinary retention'],
        'related_condition_ids': ['uti', 'kidney_stone', 'pelvic_inflammatory_disease_warning'],
    },
    {
        'region_id': 'left_leg',
        'title': 'Left Leg Vascular, Neurologic, and Musculoskeletal Symptoms',
        'summary': 'Leg pain etiology includes strain, nerve root disease, vascular occlusion, and thromboembolism.',
        'details': [
            'Swelling with unilateral calf tenderness raises concern for deep vein thrombosis.',
            'Back pain radiating below knee with numbness suggests radicular pattern.',
        ],
        'common_symptoms': ['leg pain', 'swelling', 'numbness', 'cramps'],
        'warning_signals': ['one-sided swelling', 'cold foot', 'inability to bear weight'],
        'related_condition_ids': ['sciatica', 'dvt_warning', 'osteoarthritis'],
    },
    {
        'region_id': 'right_leg',
        'title': 'Right Leg Vascular, Neurologic, and Musculoskeletal Symptoms',
        'summary': 'Leg symptoms need distinction between overuse injury, neurologic causes, and vascular disease.',
        'details': [
            'Rapid swelling, redness, and calf pain can indicate venous thrombosis.',
            'Progressive weakness or foot drop requires urgent neurologic review.',
        ],
        'common_symptoms': ['leg pain', 'swelling', 'weakness', 'tingling'],
        'warning_signals': ['sudden major swelling', 'foot drop', 'severe persistent pain'],
        'related_condition_ids': ['sciatica', 'dvt_warning', 'peripheral_arterial_disease'],
    },
]


CONDITIONS = [
    {'condition_id': 'migraine', 'name': 'Migraine', 'regions': ['head'], 'typical_symptoms': ['throbbing headache', 'light sensitivity', 'nausea']},
    {'condition_id': 'sinusitis', 'name': 'Acute Sinusitis', 'regions': ['head', 'throat'], 'typical_symptoms': ['facial pressure', 'nasal congestion', 'post-nasal drip']},
    {'condition_id': 'stroke_warning', 'name': 'Stroke Warning Pattern', 'regions': ['head', 'left_arm', 'right_arm'], 'typical_symptoms': ['facial asymmetry', 'arm weakness', 'speech changes']},
    {'condition_id': 'pharyngitis', 'name': 'Pharyngitis', 'regions': ['throat'], 'typical_symptoms': ['sore throat', 'painful swallowing', 'fever']},
    {'condition_id': 'laryngitis', 'name': 'Laryngitis', 'regions': ['throat'], 'typical_symptoms': ['hoarseness', 'voice strain', 'dry cough']},
    {'condition_id': 'tonsillitis', 'name': 'Tonsillitis', 'regions': ['throat'], 'typical_symptoms': ['throat pain', 'fever', 'swollen tonsils']},
    {'condition_id': 'angina', 'name': 'Stable Angina Pattern', 'regions': ['chest', 'left_arm'], 'typical_symptoms': ['exertional chest pressure', 'arm discomfort', 'shortness of breath']},
    {'condition_id': 'pneumonia', 'name': 'Community-Acquired Pneumonia', 'regions': ['chest'], 'typical_symptoms': ['fever', 'productive cough', 'pleuritic chest pain']},
    {'condition_id': 'asthma_exacerbation', 'name': 'Asthma Exacerbation', 'regions': ['chest'], 'typical_symptoms': ['wheezing', 'chest tightness', 'shortness of breath']},
    {'condition_id': 'gastroenteritis', 'name': 'Acute Gastroenteritis', 'regions': ['abdomen'], 'typical_symptoms': ['cramping', 'diarrhea', 'vomiting']},
    {'condition_id': 'gastritis', 'name': 'Gastritis', 'regions': ['abdomen'], 'typical_symptoms': ['burning epigastric pain', 'nausea', 'bloating']},
    {'condition_id': 'appendicitis_warning', 'name': 'Appendicitis Warning Pattern', 'regions': ['abdomen'], 'typical_symptoms': ['right lower abdominal pain', 'fever', 'anorexia']},
    {'condition_id': 'uti', 'name': 'Urinary Tract Infection', 'regions': ['pelvis'], 'typical_symptoms': ['urinary burning', 'frequency', 'urgency']},
    {'condition_id': 'kidney_stone', 'name': 'Kidney Stone Pattern', 'regions': ['pelvis', 'abdomen'], 'typical_symptoms': ['flank pain', 'hematuria', 'nausea']},
    {'condition_id': 'pelvic_inflammatory_disease_warning', 'name': 'Pelvic Inflammatory Disease Warning Pattern', 'regions': ['pelvis', 'abdomen'], 'typical_symptoms': ['pelvic pain', 'fever', 'abnormal discharge']},
    {'condition_id': 'cervical_radiculopathy', 'name': 'Cervical Radiculopathy Pattern', 'regions': ['left_arm', 'right_arm'], 'typical_symptoms': ['neck pain', 'arm tingling', 'grip weakness']},
    {'condition_id': 'rotator_cuff_tendinopathy', 'name': 'Rotator Cuff Tendinopathy', 'regions': ['left_arm', 'right_arm'], 'typical_symptoms': ['shoulder pain', 'painful overhead movement', 'night pain']},
    {'condition_id': 'carpal_tunnel', 'name': 'Carpal Tunnel Syndrome', 'regions': ['left_arm', 'right_arm'], 'typical_symptoms': ['hand numbness', 'night paresthesia', 'grip weakness']},
    {'condition_id': 'sciatica', 'name': 'Sciatica Pattern', 'regions': ['left_leg', 'right_leg'], 'typical_symptoms': ['radiating leg pain', 'numbness', 'back pain']},
    {'condition_id': 'dvt_warning', 'name': 'DVT Warning Pattern', 'regions': ['left_leg', 'right_leg'], 'typical_symptoms': ['calf swelling', 'warmth', 'tenderness']},
]


SEVERITY_BY_CONDITION = {
    'stroke_warning': 'high',
    'angina': 'high',
    'appendicitis_warning': 'high',
    'pelvic_inflammatory_disease_warning': 'high',
    'dvt_warning': 'high',
}

BASE_PAIN_BY_REGION = {
    'head': 6,
    'throat': 5,
    'chest': 7,
    'abdomen': 7,
    'left_arm': 5,
    'right_arm': 5,
    'pelvis': 6,
    'left_leg': 6,
    'right_leg': 6,
}

PAIN_BOOST_BY_CONDITION = {
    'stroke_warning': 2,
    'angina': 2,
    'appendicitis_warning': 2,
    'dvt_warning': 2,
    'kidney_stone': 2,
}

REGION_RISK_HINT = {
    'chest': 'severe chest pain can indicate acute cardiopulmonary risk',
    'head': 'very severe head pain with neurologic symptoms can indicate stroke or hemorrhage risk',
    'abdomen': 'severe focal abdominal pain can indicate urgent surgical pathology',
    'left_leg': 'severe unilateral leg pain/swelling can indicate thrombotic risk',
    'right_leg': 'severe unilateral leg pain/swelling can indicate thrombotic risk',
}


def _build_region_pain_levels(item):
    boost = PAIN_BOOST_BY_CONDITION.get(item['condition_id'], 0)
    return {
        region_id: max(1, min(10, BASE_PAIN_BY_REGION.get(region_id, 5) + boost))
        for region_id in item['regions']
    }


def _build_pain_interpretations(item, region_pain_levels):
    interpretations = {}
    for region_id, expected_level in region_pain_levels.items():
        high_hint = REGION_RISK_HINT.get(region_id, 'severe pain in this region warrants urgent clinical review')
        moderate_floor = max(4, expected_level - 2)
        high_floor = max(7, expected_level)
        interpretations[region_id] = [
            {
                'min': 1,
                'max': 3,
                'message': f"Mild {region_id.replace('_', ' ')} pain can match early or low-intensity {item['name']} patterns.",
                'urgency': 'routine',
            },
            {
                'min': moderate_floor,
                'max': 6,
                'message': f"Moderate {region_id.replace('_', ' ')} pain is compatible with {item['name']} and needs timely clinical assessment.",
                'urgency': 'soon',
            },
            {
                'min': high_floor,
                'max': 10,
                'message': f"High-intensity {region_id.replace('_', ' ')} pain: {high_hint}.",
                'urgency': 'emergency',
            },
        ]
    return interpretations


class Command(BaseCommand):
    help = 'Seed anatomy explainers and condition visualization content.'

    def handle(self, *args, **options):
        explainer_count = 0
        condition_count = 0
        pin_count = 0

        for item in REGION_EXPLAINERS:
            _, created = AnatomyRegionExplainer.objects.update_or_create(
                region_id=item['region_id'],
                defaults={
                    'title': item['title'],
                    'summary': item['summary'],
                    'details': item['details'],
                    'common_symptoms': item['common_symptoms'],
                    'related_condition_ids': item['related_condition_ids'],
                    'warning_signals': item['warning_signals'],
                    'is_active': True,
                },
            )
            explainer_count += 1
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created explainer: {item['region_id']}"))

        for item in CONDITIONS:
            region_pain_levels = _build_region_pain_levels(item)
            pain_interpretations = _build_pain_interpretations(item, region_pain_levels)
            condition, created = ConditionCatalog.objects.update_or_create(
                condition_id=item['condition_id'],
                defaults={
                    'name': item['name'],
                    'overview': f"Clinician-facing visualization profile for {item['name']}.",
                    'regions': item['regions'],
                    'region_pain_levels': region_pain_levels,
                    'pain_interpretations': pain_interpretations,
                    'typical_symptoms': item['typical_symptoms'],
                    'seek_care_rules': [
                        'If symptoms are severe, rapidly worsening, or associated with red-flag signs, escalate urgent care.',
                        'Use full clinical context and examination before final diagnosis or treatment planning.',
                    ],
                    'scope': 'top20',
                    'is_active': True,
                },
            )
            condition_count += 1
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created condition: {item['condition_id']}"))

            ConditionPin.objects.filter(condition=condition).delete()
            for idx, region_id in enumerate(item['regions'], start=1):
                ConditionPin.objects.create(
                    condition=condition,
                    pin_id=f"{item['condition_id']}-{region_id}-{idx}",
                    region_id=region_id,
                    label=item['name'],
                    text=f"{item['name']} can present with symptom burden in the {region_id.replace('_', ' ')} region.",
                    severity=SEVERITY_BY_CONDITION.get(item['condition_id'], 'medium'),
                    sort_order=idx,
                )
                pin_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete. explainers={explainer_count}, conditions={condition_count}, pins={pin_count}"
            )
        )
