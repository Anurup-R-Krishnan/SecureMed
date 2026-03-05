def generate_clarity_summary(medical_record):
    """
    Generates a patient-friendly summary from a MedicalRecord object.
    
    Returns a dictionary structured for the clarity_summary JSONField.
    """
    # 1. Condition Explanation (Using Real Data from the record)
    # We use treatment and notes as the basis for the explanation if specific fields aren't present
    condition_data = {
        'explanation': medical_record.notes or f'You have been diagnosed with {medical_record.diagnosis or "a medical condition"}.',
        'lifestyle': medical_record.treatment or "Follow the doctor's general advice.",
        'watch_out': 'If symptoms worsen or you feel unusually unwell, contact the hospital.'
    }
        
    # 2. Medicines
    medicines = []
    prescriptions = medical_record.prescriptions.all()
    for rx in prescriptions:
        medicines.append({
            'name': rx.medication_name,
            'purpose': rx.instructions or "Prescribed for your condition.",
            'timing': rx.frequency or rx.dosage,
            'side_effects': 'Nausea, dizziness, or drowsiness (common). Contact us if severe.'
        })
        
    summary = {
        'condition': {
            'title': medical_record.diagnosis or "Your Condition",
            'what_it_is': condition_data['explanation'],
            'why_it_happens': 'This occurs when your body systems are not working as they usually do.'
        },
        'medicines': medicines,
        'watch_for': {
            'warning_signs': condition_data['watch_out'],
            'action': 'Call the emergency line or visit the ER if you experience severe warning signs.'
        },
        'lifestyle': {
            'advice': condition_data['lifestyle'],
            'activity': 'Continue light activity unless told otherwise.'
        },
        'next_visit': {
            'date': medical_record.appointment.date.strftime('%Y-%m-%d') if medical_record.appointment else "To be scheduled",
            'reason': 'Follow-up to monitor your progress.'
        }
    }
    
    return summary
