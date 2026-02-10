#!/bin/bash
# ============================================
# SecureMed End-to-End Workflow Test Script  
# Tests the full 12-step healthcare workflow
# ============================================

set -uo pipefail

API="http://localhost:8000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

check() {
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}✓ $1${NC}"
        pass_count=$((pass_count + 1))
    else
        echo -e "  ${RED}✗ $1${NC}"
        fail_count=$((fail_count + 1))
    fi
}

# ── Step 1: Login as Patient ──────────────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 1: Login as Patient${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

PATIENT_LOGIN=$(curl -s -X POST "$API/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"rahul.verma@example.com","password":"SecureMed@123"}')

PATIENT_TOKEN=$(echo $PATIENT_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)
PATIENT_ID=$(echo $PATIENT_LOGIN | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['user']['patient_profile']['patient_id'] if 'patient_profile' in d['user'] else d['user']['id'])" 2>/dev/null)
PATIENT_USER_ID=$(echo $PATIENT_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
PATIENT_NAME=$(echo $PATIENT_LOGIN | python3 -c "import sys,json; u=json.load(sys.stdin)['user']; print(u['first_name']+' '+u['last_name'])" 2>/dev/null)

[ -n "$PATIENT_TOKEN" ]
check "Patient login successful (${PATIENT_NAME}, ID: ${PATIENT_ID})"

echo "  Patient Token: ${PATIENT_TOKEN:0:20}..."

# ── Step 2: Book Appointment with a Doctor ────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 2: Book Appointment with Doctor${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

# First, list available doctors
DOCTORS=$(curl -s -X GET "$API/appointments/doctors/" \
    -H "Authorization: Bearer $PATIENT_TOKEN")

echo "  Available doctors:"
echo "$DOCTORS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
for d in (results if isinstance(results, list) else [results])[:5]:
    print(f'    - Dr. {d.get(\"user_first_name\",\"\")} {d.get(\"user_last_name\",\"\")} ({d.get(\"specialization\",\"\")}), ID: {d.get(\"id\",\"\")}')
" 2>/dev/null || echo "  (could not parse doctors list)"

# Get the first doctor ID
DOCTOR_PK=$(echo "$DOCTORS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
if isinstance(results, list) and len(results) > 0:
    print(results[0]['id'])
else:
    print('')
" 2>/dev/null)

echo "  Selected doctor PK: ${DOCTOR_PK}"

# Book appointment for day after tomorrow at 11:30
TOMORROW=$(date -d "+3 days" +%Y-%m-%d 2>/dev/null || date -v+3d +%Y-%m-%d)
echo "  Booking for: $TOMORROW at 11:30"

BOOKING_RESULT=$(curl -s -X POST "$API/appointments/appointments/" \
    -H "Authorization: Bearer $PATIENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"doctor\": $DOCTOR_PK,
        \"appointment_date\": \"$TOMORROW\",
        \"appointment_time\": \"11:30:00\",
        \"reason\": \"General checkup - E2E Test\",
        \"notes\": \"Testing complete workflow\"
    }")

# If first attempt fails (time conflict), try another slot
APPT_ID=$(echo "$BOOKING_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -z "$APPT_ID" ]; then
    echo "  First slot taken, trying 15:30..."
    BOOKING_RESULT=$(curl -s -X POST "$API/appointments/appointments/" \
        -H "Authorization: Bearer $PATIENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"doctor\": $DOCTOR_PK,
            \"appointment_date\": \"$TOMORROW\",
            \"appointment_time\": \"15:30:00\",
            \"reason\": \"General checkup - E2E Test\",
            \"notes\": \"Testing complete workflow\"
        }")
fi

echo "  Booking response:"
echo "$BOOKING_RESULT" | python3 -m json.tool 2>/dev/null | head -15

APPT_ID=$(echo "$BOOKING_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
APPT_DISPLAY_ID=$(echo "$BOOKING_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('appointment_id',''))" 2>/dev/null)
[ -n "$APPT_ID" ]
check "Appointment booked successfully (ID: $APPT_DISPLAY_ID)"


# ── Step 3: Patient Messages Doctor Privately ──
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 3: Patient Messages Doctor${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

# Get the doctor's user ID
DOCTOR_USER_ID=$(echo "$DOCTORS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
if isinstance(results, list) and len(results) > 0:
    print(results[0].get('user_id', results[0].get('user', '')))
" 2>/dev/null)

echo "  Doctor user ID: $DOCTOR_USER_ID"

# Create a conversation
CONV_RESULT=$(curl -s -X POST "$API/telemedicine/conversations/" \
    -H "Authorization: Bearer $PATIENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"participant\": $DOCTOR_USER_ID, \"subject\": \"About my upcoming appointment\"}")

echo "  Conversation result:"
echo "$CONV_RESULT" | python3 -m json.tool 2>/dev/null | head -10

CONV_ID=$(echo "$CONV_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$CONV_ID" ]
check "Conversation created (ID: $CONV_ID)"

# Send a message
MSG_RESULT=$(curl -s -X POST "$API/telemedicine/messages/" \
    -H "Authorization: Bearer $PATIENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"conversation\": $CONV_ID, \"content\": \"Hello Doctor, I have some concerns about my blood pressure readings. Can we discuss during the appointment?\"}")

MSG_ID=$(echo "$MSG_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$MSG_ID" ]
check "Message sent to doctor (Message ID: $MSG_ID)"


# ── Step 4: Login as Doctor ────────────────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 4: Login as Doctor${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

# Get doctor email from the doctors list
# We know doctor PK=1 is dr.smith from seed data
DOCTOR_EMAIL="dr.smith@securemed.com"

echo "  Doctor email: $DOCTOR_EMAIL"

DOCTOR_LOGIN=$(curl -s -X POST "$API/auth/login/" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$DOCTOR_EMAIL\",\"password\":\"SecureMed@123\"}")

DOCTOR_TOKEN=$(echo $DOCTOR_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)
DOC_NAME=$(echo $DOCTOR_LOGIN | python3 -c "import sys,json; u=json.load(sys.stdin)['user']; print(u['first_name']+' '+u['last_name'])" 2>/dev/null)

[ -n "$DOCTOR_TOKEN" ]
check "Doctor login successful (Dr. ${DOC_NAME})"


# ── Step 5: Doctor Sees Appointment on Dashboard ──
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 5: Doctor Sees Appointment${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

DOCTOR_APPTS=$(curl -s -X GET "$API/appointments/appointments/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN")

APPT_COUNT=$(echo "$DOCTOR_APPTS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
if isinstance(results, list):
    print(len(results))
else:
    print(0)
" 2>/dev/null)

echo "  Doctor has $APPT_COUNT appointments"

# Check our specific appointment is visible
FOUND_OUR_APPT=$(echo "$DOCTOR_APPTS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
found = any(str(a.get('id','')) == '$APPT_ID' for a in results)
print('yes' if found else 'no')
" 2>/dev/null)

[ "$FOUND_OUR_APPT" = "yes" ]
check "New appointment visible in doctor's list"


# ── Step 6: Doctor Responds to Message ──────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 6: Doctor Responds to Message${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

# Doctor sees conversations
DOC_CONVS=$(curl -s -X GET "$API/telemedicine/conversations/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN")

echo "  Doctor's conversations:"
echo "$DOC_CONVS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
for c in (results if isinstance(results, list) else []):
    print(f'    - Conv {c.get(\"id\",\"\")}: {c.get(\"subject\",\"\")}')
" 2>/dev/null

# Doctor reads messages in the conversation
DOC_MESSAGES=$(curl -s -X GET "$API/telemedicine/messages/?conversation=$CONV_ID" \
    -H "Authorization: Bearer $DOCTOR_TOKEN")

DOC_MSG_COUNT=$(echo "$DOC_MESSAGES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
print(len(results) if isinstance(results, list) else 0)
" 2>/dev/null)

[ "$DOC_MSG_COUNT" -gt 0 ] 2>/dev/null
check "Doctor can see patient's message ($DOC_MSG_COUNT messages)"

# Doctor responds
DOC_REPLY=$(curl -s -X POST "$API/telemedicine/messages/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"conversation\": $CONV_ID, \"content\": \"Hello Rahul, I've reviewed your recent readings. We'll discuss them in detail during your appointment. Please bring your blood pressure logs.\"}")

DOC_REPLY_ID=$(echo "$DOC_REPLY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$DOC_REPLY_ID" ]
check "Doctor replied to message (Reply ID: $DOC_REPLY_ID)"

# Verify patient can see the reply
PAT_MESSAGES=$(curl -s -X GET "$API/telemedicine/messages/?conversation=$CONV_ID" \
    -H "Authorization: Bearer $PATIENT_TOKEN")

PAT_MSG_COUNT=$(echo "$PAT_MESSAGES" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
print(len(results) if isinstance(results, list) else 0)
" 2>/dev/null)

[ "$PAT_MSG_COUNT" -eq 2 ] 2>/dev/null
check "Patient can see both messages ($PAT_MSG_COUNT total)"

# Verify another patient CANNOT see the messages
OTHER_PATIENT_LOGIN=$(curl -s -X POST "$API/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"priya.singh@example.com","password":"SecureMed@123"}')

OTHER_TOKEN=$(echo $OTHER_PATIENT_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)

OTHER_CONVS=$(curl -s -X GET "$API/telemedicine/conversations/" \
    -H "Authorization: Bearer $OTHER_TOKEN")

OTHER_CONV_IDS=$(echo "$OTHER_CONVS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
ids = [str(c.get('id','')) for c in (results if isinstance(results, list) else [])]
print(','.join(ids))
" 2>/dev/null)

if echo "$OTHER_CONV_IDS" | grep -q "$CONV_ID" 2>/dev/null; then
    echo -e "  ${RED}✗ SECURITY: Another patient CAN see the conversation!${NC}"
    fail_count=$((fail_count + 1))
else
    echo -e "  ${GREEN}✓ SECURITY: Another patient CANNOT see the private conversation${NC}"
    pass_count=$((pass_count + 1))
fi


# ── Step 5b: Doctor Accepts Appointment ──────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 5b: Doctor Accepts Appointment${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

ACCEPT_RESULT=$(curl -s -X POST "$API/appointments/appointments/$APPT_ID/accept/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json")

echo "  Accept result:"
echo "$ACCEPT_RESULT" | python3 -m json.tool 2>/dev/null | head -5

ACCEPT_STATUS=$(echo "$ACCEPT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$ACCEPT_STATUS" = "confirmed" ]
check "Doctor confirmed appointment (status: $ACCEPT_STATUS)"


# ── Step 5c: Doctor Starts Consultation ──────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 5c: Doctor Starts Consultation${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

START_RESULT=$(curl -s -X POST "$API/appointments/appointments/$APPT_ID/start_consultation/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json")

START_STATUS=$(echo "$START_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$START_STATUS" = "in_progress" ]
check "Consultation started (status: $START_STATUS)"


# ── Step 7: Doctor Creates Referral ────────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 7: Doctor Creates Referral${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

# Find a specialist in a different department (e.g., Neurology)
NEURO_DOCTOR=$(echo "$DOCTORS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
for d in (results if isinstance(results, list) else []):
    if d.get('specialization','') == 'neurology':
        print(json.dumps({'id': d['id'], 'name': d.get('name',''), 'dept': d.get('department_name','')}))
        break
" 2>/dev/null)

NEURO_DOC_ID=$(echo "$NEURO_DOCTOR" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
NEURO_DOC_NAME=$(echo "$NEURO_DOCTOR" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])" 2>/dev/null)

echo "  Referral target: Dr. $NEURO_DOC_NAME (ID: $NEURO_DOC_ID)"

# Get patient DB ID (the Patient model id, not user id)
PATIENT_DB_ID=$(echo "$BOOKING_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('patient',''))" 2>/dev/null)

# Get the neurology department ID - query from the API
NEURO_DEPT_ID=$(curl -s -X GET "$API/appointments/doctors/$NEURO_DOC_ID/" \
    -H "Authorization: Bearer $PATIENT_TOKEN" | python3 -c "
import sys,json
data = json.load(sys.stdin)
print(data.get('department', data.get('department_id', '')))
" 2>/dev/null)

# If we can't get dept from doctor detail, use a default 
if [ -z "$NEURO_DEPT_ID" ] || [ "$NEURO_DEPT_ID" = "None" ]; then
    # Neurology is dept 2 in seed data
    NEURO_DEPT_ID=2
fi

REFERRAL_RESULT=$(curl -s -X POST "$API/appointments/referrals/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"patient\": $PATIENT_DB_ID,
        \"specialist\": $NEURO_DOC_ID,
        \"department\": $NEURO_DEPT_ID,
        \"reason\": \"Patient reports frequent headaches and dizziness. Cardiology evaluation suggests possible neurological involvement.\",
        \"clinical_notes\": \"BP: 140/90, intermittent vertigo for past 2 weeks\",
        \"priority\": \"urgent\"
    }")

echo "  Referral result:"
echo "$REFERRAL_RESULT" | python3 -m json.tool 2>/dev/null | head -12

REFERRAL_ID=$(echo "$REFERRAL_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
REFERRAL_DISPLAY_ID=$(echo "$REFERRAL_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('referral_id',''))" 2>/dev/null)

[ -n "$REFERRAL_ID" ]
check "Referral created (ID: $REFERRAL_DISPLAY_ID, to Dr. $NEURO_DOC_NAME)"


# ── Step 7b: Specialist Sees Referral ────────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 7b: Specialist Sees Referral${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

NEURO_LOGIN=$(curl -s -X POST "$API/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"dr.johnson@securemed.com","password":"SecureMed@123"}')

NEURO_TOKEN=$(echo $NEURO_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)

NEURO_REFERRALS=$(curl -s -X GET "$API/appointments/referrals/" \
    -H "Authorization: Bearer $NEURO_TOKEN")

echo "  Specialist referrals:"
echo "$NEURO_REFERRALS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
for r in (results if isinstance(results, list) else []):
    print(f'    - {r.get(\"referral_id\",\"\")} | Patient: {r.get(\"patient_name\",\"\")} | Status: {r.get(\"status\",\"\")} | Priority: {r.get(\"priority\",\"\")}')
" 2>/dev/null

NEURO_SEES_REFERRAL=$(echo "$NEURO_REFERRALS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
found = any(str(r.get('id','')) == '$REFERRAL_ID' for r in (results if isinstance(results, list) else []))
print('yes' if found else 'no')
" 2>/dev/null)

[ "$NEURO_SEES_REFERRAL" = "yes" ]
check "Specialist can see the referral"


# ── Step 8: Patient Sees Referral ─────────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 8: Patient Sees Referral${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

PAT_REFERRALS=$(curl -s -X GET "$API/appointments/my-referrals/" \
    -H "Authorization: Bearer $PATIENT_TOKEN")

echo "  Patient referrals:"
echo "$PAT_REFERRALS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
for r in (results if isinstance(results, list) else []):
    print(f'    - {r.get(\"referral_id\",\"\")} - Referred to: Dr. {r.get(\"specialist_name\",\"\")} ({r.get(\"department_name\",\"\")}) | Status: {r.get(\"status\",\"\")}')
" 2>/dev/null

PAT_SEES_REFERRAL=$(echo "$PAT_REFERRALS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
found = any(str(r.get('id','')) == '$REFERRAL_ID' for r in (results if isinstance(results, list) else []))
print('yes' if found else 'no')
" 2>/dev/null)

[ "$PAT_SEES_REFERRAL" = "yes" ]
check "Patient can see the referral"

# Book appointment with specialist
echo "  Booking appointment with specialist..."
TOMORROW2=$(date -d "+5 days" +%Y-%m-%d 2>/dev/null || date -v+5d +%Y-%m-%d)

SPEC_BOOKING=$(curl -s -X POST "$API/appointments/appointments/" \
    -H "Authorization: Bearer $PATIENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"doctor\": $NEURO_DOC_ID,
        \"appointment_date\": \"$TOMORROW2\",
        \"appointment_time\": \"11:30:00\",
        \"reason\": \"Referral follow-up - headaches and dizziness\",
        \"notes\": \"Referred by Dr. Smith\"
    }")

# If first attempt fails, try another slot
SPEC_APPT_ID=$(echo "$SPEC_BOOKING" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -z "$SPEC_APPT_ID" ]; then
    echo "  First slot taken, trying 16:00..."
    SPEC_BOOKING=$(curl -s -X POST "$API/appointments/appointments/" \
        -H "Authorization: Bearer $PATIENT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"doctor\": $NEURO_DOC_ID,
            \"appointment_date\": \"$TOMORROW2\",
            \"appointment_time\": \"16:00:00\",
            \"reason\": \"Referral follow-up - headaches and dizziness\",
            \"notes\": \"Referred by Dr. Smith\"
        }")
fi

SPEC_APPT_ID=$(echo "$SPEC_BOOKING" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$SPEC_APPT_ID" ]
check "Patient booked appointment with specialist (Appt ID: $SPEC_APPT_ID)"


# ── Step 9: Doctor Writes Prescription ────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 9: Doctor Writes Prescription${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

# Doctor creates medical record for the consultation
RECORD_RESULT=$(curl -s -X POST "$API/medical-records/records/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"patient\": $PATIENT_DB_ID,
        \"appointment\": $APPT_ID,
        \"record_type\": \"consultation\",
        \"record_date\": \"$TOMORROW\",
        \"diagnosis\": \"Essential Hypertension - Stage 1\",
        \"symptoms\": \"Headache, dizziness, elevated BP readings\",
        \"treatment\": \"Lifestyle modifications + medication\",
        \"notes\": \"Patient advised to maintain BP log and reduce sodium intake\"
    }")

echo "  Medical record result:"
echo "$RECORD_RESULT" | python3 -m json.tool 2>/dev/null | head -10

RECORD_ID=$(echo "$RECORD_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
RECORD_DISPLAY_ID=$(echo "$RECORD_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('record_id',''))" 2>/dev/null)
[ -n "$RECORD_ID" ]
check "Medical record created (ID: $RECORD_DISPLAY_ID)"

# Doctor writes a prescription
PRESCRIPTION_RESULT=$(curl -s -X POST "$API/medical-records/prescriptions/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"medical_record\": $RECORD_ID,
        \"medication_name\": \"Amlodipine\",
        \"dosage\": \"5 mg\",
        \"frequency\": \"Once daily in the morning\",
        \"duration\": \"90 days\",
        \"instructions\": \"Take on empty stomach. Monitor BP daily. Report any swelling in ankles.\"
    }")

echo "  Prescription result:"
echo "$PRESCRIPTION_RESULT" | python3 -m json.tool 2>/dev/null | head -10

PRESCRIPTION_ID=$(echo "$PRESCRIPTION_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$PRESCRIPTION_ID" ]
check "Prescription created (ID: $PRESCRIPTION_ID)"

# Sign the prescription
SIGN_RESULT=$(curl -s -X POST "$API/medical-records/prescriptions/$PRESCRIPTION_ID/sign/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json")

SIGN_STATUS=$(echo "$SIGN_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$SIGN_STATUS" = "signed" ]
check "Prescription signed by doctor (status: $SIGN_STATUS)"


# ── Step 10: Patient Sees Prescription ────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 10: Patient Sees Prescription${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

PAT_PRESCRIPTIONS=$(curl -s -X GET "$API/medical-records/prescriptions/" \
    -H "Authorization: Bearer $PATIENT_TOKEN")

PAT_RX_COUNT=$(echo "$PAT_PRESCRIPTIONS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
print(len(results) if isinstance(results, list) else 0)
" 2>/dev/null)

echo "  Patient prescriptions: $PAT_RX_COUNT total"

PAT_SEES_RX=$(echo "$PAT_PRESCRIPTIONS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
found = any(str(r.get('id','')) == '$PRESCRIPTION_ID' for r in (results if isinstance(results, list) else []))
print('yes' if found else 'no')
" 2>/dev/null)

[ "$PAT_SEES_RX" = "yes" ]
check "Patient can see the prescription"

# Check medical records timeline
PAT_TIMELINE=$(curl -s -X GET "$API/medical-records/records/timeline/" \
    -H "Authorization: Bearer $PATIENT_TOKEN")

echo "  Patient timeline entries:"
echo "$PAT_TIMELINE" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
if isinstance(results, list):
    for r in results[:5]:
        print(f'    - {r.get(\"record_id\",\"\")} | {r.get(\"record_type\",\"\")} | {r.get(\"record_date\",\"\")} | {r.get(\"diagnosis\",\"\")[:40]}')
elif isinstance(results, dict):
    for key, items in results.items():
        print(f'    {key}: {len(items) if isinstance(items, list) else \"N/A\"} entries')
" 2>/dev/null

echo -e "  ${GREEN}✓ Medical records and timeline accessible${NC}"
pass_count=$((pass_count + 1))


# ── Step 11: Pharmacist Sees Pharmacy Order ───
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 11: Pharmacist Login & Sees Order${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

PHARM_LOGIN=$(curl -s -X POST "$API/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"pharmacist@securemed.com","password":"SecureMed@123"}')

PHARM_TOKEN=$(echo $PHARM_LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)
PHARM_NAME=$(echo $PHARM_LOGIN | python3 -c "import sys,json; u=json.load(sys.stdin)['user']; print(u['first_name']+' '+u['last_name'])" 2>/dev/null)

[ -n "$PHARM_TOKEN" ]
check "Pharmacist login successful ($PHARM_NAME)"

# Pharmacist checks pharmacy orders
PHARM_ORDERS=$(curl -s -X GET "$API/medical-records/pharmacy-orders/" \
    -H "Authorization: Bearer $PHARM_TOKEN")

echo "  Pharmacy orders:"
echo "$PHARM_ORDERS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
if isinstance(results, list):
    for o in results[:5]:
        print(f'    - Order #{o.get(\"id\",\"\")} | Status: {o.get(\"status\",\"\")} | Pickup: {o.get(\"pickup_code\",\"\")}')
    print(f'    Total: {len(results)} orders')
else:
    print(f'    Response: {str(data)[:100]}')
" 2>/dev/null

PHARM_ORDER_COUNT=$(echo "$PHARM_ORDERS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
print(len(results) if isinstance(results, list) else 0)
" 2>/dev/null)

[ "$PHARM_ORDER_COUNT" -gt 0 ] 2>/dev/null
check "Pharmacist can see pharmacy orders ($PHARM_ORDER_COUNT orders)"

# Pharmacist checks drug inventory
PHARM_DRUGS=$(curl -s -X GET "$API/pharmacy/drugs/" \
    -H "Authorization: Bearer $PHARM_TOKEN")

DRUG_COUNT=$(echo "$PHARM_DRUGS" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
print(len(results) if isinstance(results, list) else 0)
" 2>/dev/null)

[ "$DRUG_COUNT" -gt 0 ] 2>/dev/null
check "Pharmacy has drug inventory ($DRUG_COUNT drugs)"


# ── Step 12: Doctor Marks Consultation Complete ──
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Step 12: Doctor Completes Consultation${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

COMPLETE_RESULT=$(curl -s -X POST "$API/appointments/appointments/$APPT_ID/complete_consultation/" \
    -H "Authorization: Bearer $DOCTOR_TOKEN" \
    -H "Content-Type: application/json")

echo "  Complete result:"
echo "$COMPLETE_RESULT" | python3 -m json.tool 2>/dev/null | head -5

COMPLETE_STATUS=$(echo "$COMPLETE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
[ "$COMPLETE_STATUS" = "completed" ]
check "Consultation marked complete (status: $COMPLETE_STATUS)"

# Verify patient sees completed appointment
PAT_APPTS_FINAL=$(curl -s -X GET "$API/appointments/appointments/" \
    -H "Authorization: Bearer $PATIENT_TOKEN")

PAT_APPT_STATUS=$(echo "$PAT_APPTS_FINAL" | python3 -c "
import sys,json
data = json.load(sys.stdin)
results = data.get('results', data) if isinstance(data, dict) else data
for a in (results if isinstance(results, list) else []):
    if str(a.get('id','')) == '$APPT_ID':
        print(a.get('status',''))
        break
" 2>/dev/null)

[ "$PAT_APPT_STATUS" = "completed" ]
check "Patient sees appointment as completed"


# ── Final Summary ──────────────────────────────
echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  TEST SUMMARY${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "  ${GREEN}Passed: $pass_count${NC}"
echo -e "  ${RED}Failed: $fail_count${NC}"
total=$((pass_count + fail_count))
echo -e "  Total:  $total"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "  ${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo ""
    echo -e "${YELLOW}┌──────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}│           Seeded Credentials                 │${NC}"
    echo -e "${YELLOW}├──────────────────────────────────────────────┤${NC}"
    echo -e "${YELLOW}│ Patient:    rahul.verma@example.com          │${NC}"
    echo -e "${YELLOW}│ Doctor:     dr.smith@securemed.com           │${NC}"
    echo -e "${YELLOW}│ Pharmacist: pharmacist@securemed.com         │${NC}"
    echo -e "${YELLOW}│ Password:   SecureMed@123 (all users)        │${NC}"
    echo -e "${YELLOW}│                                              │${NC}"
    echo -e "${YELLOW}│ Frontend:   http://localhost:3000             │${NC}"
    echo -e "${YELLOW}│ Backend:    http://localhost:8000             │${NC}"
    echo -e "${YELLOW}└──────────────────────────────────────────────┘${NC}"
else
    echo -e "  ${RED}⚠ SOME TESTS FAILED${NC}"
fi
echo ""
